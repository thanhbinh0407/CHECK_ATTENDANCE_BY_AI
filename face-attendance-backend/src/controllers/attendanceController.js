import { AttendanceLog, User } from "../models/pg/index.js";
import { matchDescriptor } from "../services/matchService.js";
import { Op } from "sequelize";
import { ShiftSetting } from "../models/pg/index.js";
import Notification from "../models/pg/Notification.js";

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

      if (todayLogs.length >= 2) {
        // User already checked in and out for the day
        console.log(`User ${match.userId} already has ${todayLogs.length} logs today`);
        return res.json({
          status: 'success',
          message: 'Bạn đã kết thúc 1 ngày công',
          matched: true,
          userId: match.userId,
          detectedName: match.detectedName || 'Unknown',
          distance: match.distance,
          threshold: THRESHOLD,
          logsToday: todayLogs.map(l => ({ id: l.id, timestamp: l.timestamp, type: l.type }))
        });
      }

      const type = todayLogs.length === 0 ? 'IN' : 'OUT';

      // Compute flags based on company-wide shift settings
      let isLate = false, isEarlyLeave = false, isOvertime = false;
      let linkedShiftId = null;
      let note = null;

      try {
        if (applicableShift) {
          linkedShiftId = applicableShift.id;
          const start = parseTimeToday(applicableShift.startTime);
          const end = parseTimeToday(applicableShift.endTime);
          const graceMinutes = applicableShift.gracePeriodMinutes || 5;
          const overtimeThresholdMins = applicableShift.overtimeThresholdMinutes || 15;

          if (type === 'IN') {
            if (start && now > new Date(start.getTime() + graceMinutes*60000)) {
              isLate = true; 
              note = `Late by ${Math.round((now - start)/60000)} min`;
            }
          } else {
            // OUT
            if (end && now < end) {
              isEarlyLeave = true; 
              note = `Left early by ${Math.round((end - now)/60000)} min`;
            }
            if (end && now > new Date(end.getTime() + overtimeThresholdMins*60000)) {
              isOvertime = true; 
              note = `Overtime ${Math.round((now - end)/60000)} min`;
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

      const finished = type === 'OUT';

      return res.json({
        status: "success",
        message: finished ? 'Điểm danh ra: Bạn đã kết thúc 1 ngày công' : 'Điểm danh vào thành công',
        matched: true,
        userId: match.userId,
        detectedName: match.detectedName || 'Unknown',
        confidence: confidence,
        distance: match.distance,
        threshold: THRESHOLD,
        logId: log.id,
        type: type,
        finished,
        flags: { isLate, isEarlyLeave, isOvertime },
        shiftId: linkedShiftId
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const logs = await AttendanceLog.findAll({
      where: {
        timestamp: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      },
      include: [{ model: User, attributes: ['name', 'email', 'employeeCode'] }],
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
        confidence: log.confidence,
        matchDistance: log.matchDistance
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

    // If matched, fetch today's logs to determine IN/OUT status and finished flag
    let logsToday = [];
    let finished = false;
    if (match.matched && match.userId) {
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

      // If already 2+ logs, mark as finished
      finished = logsToday.length >= 2;
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
      finished: finished
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
