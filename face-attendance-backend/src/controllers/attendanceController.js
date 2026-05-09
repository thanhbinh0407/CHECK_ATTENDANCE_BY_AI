import { AttendanceLog, User } from "../models/pg/index.js";
import { matchDescriptor } from "../services/matchService.js";
import { Op } from "sequelize";
import { ShiftSetting } from "../models/pg/index.js";
import Notification from "../models/pg/Notification.js";
import { emitToRoom } from "../socket.js";

async function userAvatarUrl(userId) {
  if (!userId) return null;
  const u = await User.findByPk(userId, { attributes: ["avatarUrl"] });
  return u?.avatarUrl || null;
}

function parseShiftPlan(shift) {
  const fallbackMainShifts = [{ startTime: shift?.startTime || "08:00", endTime: shift?.endTime || "17:00" }];
  const fallback = {
    mainShifts: fallbackMainShifts,
    overtimeStart: null,
    overtimeThresholdMinutes: Number(shift?.overtimeThresholdMinutes || 15),
    expectedLogsPerDay: fallbackMainShifts.length * 2,
  };

  if (!shift?.note) return fallback;
  try {
    const parsed = JSON.parse(shift.note);
    const mainShifts = Array.isArray(parsed?.mainShifts) && parsed.mainShifts.length > 0
      ? parsed.mainShifts
          .map((s) => ({ startTime: s?.startTime, endTime: s?.endTime }))
          .filter((s) => typeof s.startTime === "string" && typeof s.endTime === "string")
      : fallbackMainShifts;

    const overtimeStart = typeof parsed?.overtime?.startTime === "string" ? parsed.overtime.startTime : null;
    const overtimeThresholdMinutes = Number(parsed?.overtime?.thresholdMinutes ?? shift?.overtimeThresholdMinutes ?? 15);

    return {
      mainShifts,
      overtimeStart,
      overtimeThresholdMinutes: Number.isFinite(overtimeThresholdMinutes) ? overtimeThresholdMinutes : 15,
      expectedLogsPerDay: mainShifts.length * 2,
    };
  } catch {
    return fallback;
  }
}

function nextTypeFromCount(count) {
  return count % 2 === 0 ? "IN" : "OUT";
}

export const logAttendance = async (req, res) => {
  try {
    const { descriptor, confidence, imageBase64, timestamp, deviceId } = req.body;
    
    // Validate input
    if (!descriptor || !Array.isArray(descriptor)) {
      return res.status(400).json({ 
        status: "error", 
        message: "Invalid descriptor provided. Must be an array of 128 numbers" 
      });
    }

    if (descriptor.length !== 128) {
      return res.status(400).json({
        status: "error",
        message: `Invalid descriptor length: ${descriptor.length}. Expected 128`
      });
    }

    const THRESHOLD = parseFloat(process.env.MATCH_THRESHOLD || "0.6");
    console.log(`\n📍 Attendance request - Threshold: ${THRESHOLD}`);
    
    const match = await matchDescriptor(descriptor, THRESHOLD);

    // Determine today's logs for this user (if matched)
    const now = timestamp ? new Date(timestamp) : new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0,0,0,0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let log;
    if (match.matched && match.userId) {
      // Short-circuit: deactivated accounts cannot check in
      const matchedUser = await User.findByPk(match.userId, {
        attributes: ["id", "name", "isActive", "avatarUrl"],
      });
      if (matchedUser && matchedUser.isActive === false) {
        console.log(
          `[attendance] Deactivated user attempted to log: ${matchedUser.name} (ID: ${matchedUser.id})`
        );
        return res.json({
          status: "success",
          matched: true,
          deactivated: true,
          userId: matchedUser.id,
          detectedName: matchedUser.name,
          distance: match.distance,
          threshold: THRESHOLD,
          avatarUrl: matchedUser.avatarUrl || null,
          message: "Your account has been deactivated. Please contact HR.",
        });
      }

      // Get the active company-wide shift settings
      let applicableShift = null;
      try {
        applicableShift = await ShiftSetting.findOne({ where: { active: true } });
      } catch (e) { console.warn('Shift lookup failed', e.message); }

      // Helper: parse 'HH:MM' into Date on today's date
      const parseTimeToday = (hhmm) => {
        if (!hhmm) return null;
        const [hh, mm] = hhmm.split(':').map(Number);
        const d = new Date(now);
        d.setHours(hh, mm, 0, 0);
        return d;
      };

      // Fetch today's logs
      const todayLogs = await AttendanceLog.findAll({
        where: {
          userId: match.userId,
          timestamp: { [Op.gte]: todayStart, [Op.lt]: tomorrow }
        },
        order: [['timestamp','ASC']]
      });

      const shiftPlan = parseShiftPlan(applicableShift);
      const expectedLogsPerDay = shiftPlan.expectedLogsPerDay || 2;

      if (todayLogs.length >= expectedLogsPerDay) {
        // User completed all check in/out actions for the day according to configured shifts
        console.log(`User ${match.userId} already has ${todayLogs.length}/${expectedLogsPerDay} logs today`);
        const avatarUrl = await userAvatarUrl(match.userId);
        return res.json({
          status: 'success',
          message: 'Bạn đã kết thúc 1 ngày công',
          matched: true,
          userId: match.userId,
          detectedName: match.detectedName || 'Unknown',
          distance: match.distance,
          threshold: THRESHOLD,
          avatarUrl,
          finished: true,
          nextType: null,
          expectedLogsPerDay,
          logsToday: todayLogs.map(l => ({ id: l.id, timestamp: l.timestamp, type: l.type }))
        });
      }

      const type = nextTypeFromCount(todayLogs.length);

      // Compute flags based on configured shift session
      let isLate = false, isEarlyLeave = false, isOvertime = false;
      let linkedShiftId = null;
      let note = null;

      try {
        if (applicableShift) {
          linkedShiftId = applicableShift.id;
          const graceMinutes = applicableShift.gracePeriodMinutes || 5;

          const sessionIndex = Math.floor(todayLogs.length / 2);
          const session = shiftPlan.mainShifts[sessionIndex] || shiftPlan.mainShifts[shiftPlan.mainShifts.length - 1];
          const start = parseTimeToday(session?.startTime || applicableShift.startTime);
          const end = parseTimeToday(session?.endTime || applicableShift.endTime);

          if (type === 'IN') {
            if (start && now > new Date(start.getTime() + graceMinutes * 60000)) {
              isLate = true;
              note = `Late by ${Math.round((now - start) / 60000)} min`;
            }
          } else {
            // OUT
            if (end && now < end) {
              isEarlyLeave = true;
              note = `Left early by ${Math.round((end - now) / 60000)} min`;
            }

            const overtimeStart = shiftPlan.overtimeStart
              ? parseTimeToday(shiftPlan.overtimeStart)
              : (end ? new Date(end.getTime() + (shiftPlan.overtimeThresholdMinutes || 15) * 60000) : null);
            if (overtimeStart && now > overtimeStart) {
              isOvertime = true;
              note = `Overtime ${Math.round((now - overtimeStart) / 60000)} min`;
            }
          }
        }
      } catch (e) { console.warn('Flag computation failed', e.message); }

      log = await AttendanceLog.create({
        userId: match.userId,
        detectedName: match.detectedName || "Unknown",
        timestamp: now,
        confidence,
        deviceId,
        matchDistance: match.distance,
        type,
        shiftId: linkedShiftId,
        note,
        isLate,
        isEarlyLeave,
        isOvertime,
        imageBase64: imageBase64 || null
      });

      console.log(`Attendance logged: ${match.detectedName} (Distance: ${match.distance.toFixed(3)}) type=${type} flags:${isLate? 'LATE':''}${isEarlyLeave? ' EARLY':''}${isOvertime? ' OT':''}`);

      // Emit real-time update
      emitToRoom('admin', 'attendance-update', {
        userId: match.userId,
        detectedName: match.detectedName,
        type,
        timestamp: now,
        isLate,
        isEarlyLeave,
        isOvertime
      });

      const expectedLogsPerDayAfterLog = shiftPlan.expectedLogsPerDay || 2;
      const nextCount = todayLogs.length + 1;
      const finished = nextCount >= expectedLogsPerDayAfterLog;
      const nextType = finished ? null : nextTypeFromCount(nextCount);
      const avatarUrl = await userAvatarUrl(match.userId);

      return res.json({
        status: "success",
        message: finished ? 'Điểm danh ra: Bạn đã kết thúc 1 ngày công' : 'Điểm danh thành công',
        matched: true,
        userId: match.userId,
        detectedName: match.detectedName || 'Unknown',
        confidence: confidence,
        distance: match.distance,
        threshold: THRESHOLD,
        logId: log.id,
        type: type,
        finished,
        nextType,
        expectedLogsPerDay: expectedLogsPerDayAfterLog,
        flags: { isLate, isEarlyLeave, isOvertime },
        shiftId: linkedShiftId,
        avatarUrl
      });
    } else {
      // Unmatched: create an anonymous log (type IN) so admins can review
      log = await AttendanceLog.create({
        userId: null,
        detectedName: match.detectedName || 'Unknown',
        timestamp: now,
        confidence,
        deviceId,
        matchDistance: match.distance,
        type: 'IN',
        imageBase64: imageBase64 || null
      });
      console.log(`Attendance logged (unknown): distance=${match.distance}`);
      return res.json({
        status: 'success',
        message: 'Face logged but no match found',
        matched: false,
        userId: null,
        detectedName: 'Unknown',
        confidence,
        distance: match.distance,
        threshold: THRESHOLD,
        logId: log.id
      });
    }
  } catch (err) {
    console.error("Attendance error:", err);
    return res.status(500).json({ 
      status: "error", 
      message: err.message 
    });
  }
};

export const getTodayAttendance = async (req, res) => {
  try {
    const { deviceId, userId } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where = {
      timestamp: {
        [Op.gte]: today,
        [Op.lt]: tomorrow,
      },
    };
    if (deviceId) where.deviceId = String(deviceId);
    if (userId) where.userId = Number(userId);

    const logs = await AttendanceLog.findAll({
      where,
      include: [{ model: User, as: "User", attributes: ['name', 'email', 'employeeCode', 'avatarUrl'] }],
      order: [['timestamp', 'DESC']]
    });

    return res.json({
      status: "success",
      date: today.toISOString().split('T')[0],
      count: logs.length,
      logs: logs.map(log => ({
        id: log.id,
        userId: log.userId,
        detectedName: log.detectedName,
        timestamp: log.timestamp,
        type: log.type || 'IN',
        confidence: log.confidence,
        matchDistance: log.matchDistance,
        avatarUrl: log.User?.avatarUrl || null
      }))
    });
  } catch (err) {
    console.error("Error fetching today's attendance:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

export const matchFace = async (req, res) => {
  try {
    const { descriptor, descriptors } = req.body;

    // Accept either a single descriptor (array[128]) or descriptors (array of arrays)
    if (descriptors && Array.isArray(descriptors)) {
      // validate inner arrays
      if (!descriptors.every(d => Array.isArray(d) && d.length === 128)) {
        return res.status(400).json({ status: 'error', message: 'Invalid descriptors: each must be array of 128 numbers' });
      }
    } else if (descriptor && Array.isArray(descriptor)) {
      if (descriptor.length !== 128) {
        return res.status(400).json({ status: 'error', message: `Invalid descriptor length: ${descriptor.length}. Expected 128` });
      }
    } else {
      return res.status(400).json({ status: 'error', message: 'Invalid payload: provide "descriptor" or "descriptors"' });
    }

    const THRESHOLD = parseFloat(process.env.MATCH_THRESHOLD || "0.6");
    console.log(`\nFace match query - Threshold: ${THRESHOLD}`);

    const input = descriptors && Array.isArray(descriptors) ? descriptors : descriptor;
    const match = await matchDescriptor(input, THRESHOLD);

    // If matched, fetch today's logs to determine next IN/OUT action based on configured shifts
    let logsToday = [];
    let finished = false;
    let nextType = "IN";
    let expectedLogsPerDay = 2;
    let avatarUrl = null;
    if (match.matched && match.userId) {
      // Short-circuit: deactivated accounts cannot check in
      const matchedUser = await User.findByPk(match.userId, {
        attributes: ["id", "name", "isActive", "avatarUrl"],
      });
      if (matchedUser && matchedUser.isActive === false) {
        return res.json({
          status: "success",
          matched: true,
          deactivated: true,
          userId: matchedUser.id,
          detectedName: matchedUser.name,
          distance: match.distance,
          threshold: THRESHOLD,
          allProfiles: match.allProfiles || 0,
          topMatch: match.topMatch || null,
          meanVariance: match.meanVariance || null,
          logsToday: [],
          finished: false,
          avatarUrl: matchedUser.avatarUrl || null,
          message: "Your account has been deactivated. Please contact HR.",
        });
      }

      avatarUrl = await userAvatarUrl(match.userId);
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0,0,0,0);
      const tomorrow = new Date(todayStart);
      tomorrow.setDate(tomorrow.getDate() + 1);

      logsToday = await AttendanceLog.findAll({
        where: {
          userId: match.userId,
          timestamp: { [Op.gte]: todayStart, [Op.lt]: tomorrow }
        },
        order: [['timestamp','ASC']],
        attributes: ['id', 'type', 'timestamp']
      });

      const activeShift = await ShiftSetting.findOne({ where: { active: true } });
      const shiftPlan = parseShiftPlan(activeShift);
      expectedLogsPerDay = shiftPlan.expectedLogsPerDay || 2;
      finished = logsToday.length >= expectedLogsPerDay;
      nextType = finished ? null : nextTypeFromCount(logsToday.length);
    }

    return res.json({
      status: "success",
      matched: match.matched,
      userId: match.userId || null,
      detectedName: match.detectedName || "Unknown",
      distance: match.distance,
      threshold: THRESHOLD,
      allProfiles: match.allProfiles || 0,
      topMatch: match.topMatch || null,
      meanVariance: match.meanVariance || null,
      logsToday: logsToday.map(l => ({ id: l.id, type: l.type, timestamp: l.timestamp })),
      finished: finished,
      nextType,
      expectedLogsPerDay,
      avatarUrl
    });
  } catch (err) {
    console.error("Match error:", err);
    return res.status(500).json({ 
      status: "error", 
      message: err.message 
    });
  }
};

export const getTodayStatus = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ status: 'error', message: 'userId is required' });

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate()+1);

    const logs = await AttendanceLog.findAll({
      where: { userId, timestamp: { [Op.gte]: todayStart, [Op.lt]: tomorrow } },
      order: [['timestamp','ASC']]
    });

    return res.json({ status: 'success', count: logs.length, logs: logs.map(l => ({ id: l.id, type: l.type, timestamp: l.timestamp, note: l.note, flags: { isLate: l.isLate, isEarlyLeave: l.isEarlyLeave, isOvertime: l.isOvertime }, shiftId: l.shiftId })) });
  } catch (err) {
    console.error('Status error', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
