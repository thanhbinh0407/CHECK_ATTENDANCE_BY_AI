import { AttendanceLog, User, OvertimeRequest } from "../models/pg/index.js";
import { matchDescriptor } from "../services/matchService.js";
import { Op } from "sequelize";
import { ShiftSetting } from "../models/pg/index.js";
import Notification from "../models/pg/Notification.js";
import { emitToRoom, emitEmployeePortalRefresh } from "../socket.js";

async function userAvatarUrl(userId) {
  if (!userId) return null;
  const u = await User.findByPk(userId, { attributes: ["avatarUrl"] });
  return u?.avatarUrl || null;
}

const formatLocalDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const parseTimeToday = (timeStr, baseDate = new Date()) => {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
  const [hh, mm] = timeStr.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(hh, mm, 0, 0);
  return d;
};

export const parseShiftPlan = (shift) => {
  const fallbackMainShifts = [{ startTime: shift?.startTime || '08:00', endTime: shift?.endTime || '17:00' }];
  const fallback = {
    mainShifts: fallbackMainShifts,
    overtimeStart: null,
    overtimeEnd: null,
    overtimeThresholdMinutes: Number(shift?.overtimeThresholdMinutes ?? 15),
    absentThresholdMinutes: Number(shift?.absentThresholdMinutes ?? shift?.absenceThresholdMinutes ?? 15),
    autoCheckoutGraceMinutes: Number(shift?.autoCheckoutGraceMinutes ?? 15),
  };

  if (!shift?.note) return fallback;

  try {
    const parsed = JSON.parse(shift.note);
    const mainShifts = Array.isArray(parsed?.mainShifts) && parsed.mainShifts.length > 0
      ? parsed.mainShifts
          .map((s) => ({ startTime: s?.startTime, endTime: s?.endTime }))
          .filter((s) => typeof s.startTime === 'string' && typeof s.endTime === 'string')
      : fallbackMainShifts;
    const overtimeStart = typeof parsed?.overtime?.startTime === 'string' ? parsed.overtime.startTime : null;
    const overtimeEnd = typeof parsed?.overtime?.endTime === 'string' ? parsed.overtime.endTime : null;
    const overtimeThresholdMinutes = Number(parsed?.overtime?.thresholdMinutes ?? shift?.overtimeThresholdMinutes ?? 15);
    const absentThresholdMinutes = Number(parsed?.absentThresholdMinutes ?? parsed?.absenceThresholdMinutes ?? 15);
    const autoCheckoutGraceMinutes = Number(parsed?.autoCheckoutGraceMinutes ?? shift?.autoCheckoutGraceMinutes ?? 15);

    return {
      mainShifts,
      overtimeStart,
      overtimeEnd,
      overtimeThresholdMinutes: Number.isFinite(overtimeThresholdMinutes) ? overtimeThresholdMinutes : 15,
      absentThresholdMinutes: Number.isFinite(absentThresholdMinutes) ? absentThresholdMinutes : 15,
      autoCheckoutGraceMinutes: Number.isFinite(autoCheckoutGraceMinutes) ? autoCheckoutGraceMinutes : 15,
    };
  } catch {
    return fallback;
  }
};

const minutesBetween = (later, earlier) => {
  if (!later || !earlier) return null;
  const diff = new Date(later).getTime() - new Date(earlier).getTime();
  if (!Number.isFinite(diff)) return null;
  return Math.max(0, Math.round(diff / 60000));
};

export const nextTypeFromCount = (count, lastType = null) => {
  // Extract base type (IN or OUT) from complex types.
  // ABSENT means the whole shift was skipped, so the next action should
  // be the start of the next shift (IN) rather than an OUT for the same shift.
  let baseLastType = lastType;
  if (lastType) {
    if (lastType === 'ABSENT') {
      return 'IN';
    } else if (lastType.startsWith('OT_')) {
      baseLastType = lastType.substring(3); // 'OT_IN' -> 'IN', 'OT_OUT' -> 'OUT'
    } else if (lastType === 'LATE_IN') {
      baseLastType = 'IN';
    } else if (lastType === 'EARLY_OUT') {
      baseLastType = 'OUT';
    }
  }
  
  if (baseLastType === 'IN') return 'OUT';
  if (baseLastType === 'OUT') return 'IN';
  return count % 2 === 0 ? 'IN' : 'OUT';
};

export const logAttendance = async (req, res) => {
  try {
    const { descriptor, deviceId, timestamp, confidence, imageBase64 } = req.body;

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

      // Check OT status FIRST before processing attendance logs
      const todayDateString = formatLocalDate(now);
      const hasOvertimeRequestToday = await OvertimeRequest.findOne({
        where: {
          userId: match.userId,
          date: todayDateString,
          approvalStatus: { [Op.in]: ['pending', 'approved'] }
        }
      });
      const isOTApproved = hasOvertimeRequestToday && hasOvertimeRequestToday.approvalStatus === 'approved';

      // Fetch today's logs
      const todayLogs = await AttendanceLog.findAll({
        where: {
          userId: match.userId,
          timestamp: { [Op.gte]: todayStart, [Op.lt]: tomorrow }
        },
        order: [['timestamp','ASC']]
      });

      const mainShiftLogsCount = todayLogs.filter(l => !l.isOvertime).length;
      const shiftPlan = parseShiftPlan(applicableShift);
      const absentThresholdMs = (shiftPlan.absentThresholdMinutes || 15) * 60000;
      const autoCheckoutGraceMinutes = Number(shiftPlan.autoCheckoutGraceMinutes ?? applicableShift?.autoCheckoutGraceMinutes ?? 15) || 15;
      const expectedLogsPerDay = (shiftPlan.mainShifts.length * 2) + (isOTApproved ? 2 : 0);

      const shiftBoundaries = shiftPlan.mainShifts.map((shift) => ({
        start: parseTimeToday(shift.startTime),
        end: parseTimeToday(shift.endTime)
      }));
      const shiftBoundaryMarkers = shiftBoundaries.reduce((markers, shift, index) => {
        if (index === 0) return markers;
        const prev = shiftBoundaries[index - 1];
        if (prev.end && shift.start) {
          markers.push(new Date(Math.round((prev.end.getTime() + shift.start.getTime()) / 2)));
        }
        return markers;
      }, []);
      const assignMainShiftIndex = (timestamp) => {
        if (!timestamp || shiftPlan.mainShifts.length === 0) return 0;
        const ts = timestamp.getTime();
        if (shiftBoundaryMarkers.length === 0) return 0;
        if (ts <= shiftBoundaryMarkers[0].getTime()) return 0;
        for (let i = 1; i < shiftBoundaryMarkers.length; i += 1) {
          if (ts <= shiftBoundaryMarkers[i].getTime()) return i;
        }
        return shiftPlan.mainShifts.length - 1;
      };

      const getSessionLogs = (sessionIndex) => todayLogs.filter((log) => {
        if (log.isOvertime) return false;
        const assigned = assignMainShiftIndex(new Date(log.timestamp));
        return assigned === sessionIndex;
      });

      const isMainShiftFinalized = (sessionIndex) => {
        const session = shiftPlan.mainShifts[sessionIndex];
        if (!session) return true;
        const sessionStart = parseTimeToday(session.startTime);
        const logs = getSessionLogs(sessionIndex);
        if (logs.length >= 2) return true;
        if (!sessionStart) return false;
        return now.getTime() > sessionStart.getTime() + absentThresholdMs;
      };

      let sessionIndex = 0;
      while (sessionIndex < shiftPlan.mainShifts.length && isMainShiftFinalized(sessionIndex)) {
        sessionIndex += 1;
      }

      const lastMainShift = shiftPlan.mainShifts[shiftPlan.mainShifts.length - 1];
      const lastMainShiftEnd = lastMainShift ? parseTimeToday(lastMainShift.endTime) : null;
      const overtimeStart = shiftPlan.overtimeStart
        ? parseTimeToday(shiftPlan.overtimeStart)
        : (lastMainShiftEnd ? new Date(lastMainShiftEnd.getTime() + (shiftPlan.overtimeThresholdMinutes || 15) * 60000) : null);
      const overtimeEnd = shiftPlan.overtimeEnd ? parseTimeToday(shiftPlan.overtimeEnd) : null;
      const overtimeOpen = isOTApproved && overtimeStart && now >= overtimeStart;
      const allMainSessionsFinalized = sessionIndex >= shiftPlan.mainShifts.length;

      if (allMainSessionsFinalized && !isOTApproved) {
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

      const lastLogType = todayLogs.length > 0 ? todayLogs[todayLogs.length - 1]?.type : null;
      const baseType = nextTypeFromCount(todayLogs.length, lastLogType);

      // Compute flags based on configured shift session
      let isLate = false, isEarlyLeave = false, isOvertime = false, isAbsent = false;
      let latenessMinutes = null;
      let earlyLeaveMinutes = null;
      let linkedShiftId = null;
      let note = null;

      try {
        if (applicableShift) {
          linkedShiftId = applicableShift.id;
          const graceMinutes = applicableShift.gracePeriodMinutes || 5;

          const isOvertimeSession = allMainSessionsFinalized && isOTApproved;
          const currentSession = isOvertimeSession
            ? { startTime: shiftPlan.overtimeStart, endTime: shiftPlan.overtimeEnd }
            : shiftPlan.mainShifts[sessionIndex] || shiftPlan.mainShifts[shiftPlan.mainShifts.length - 1];
          const start = parseTimeToday(currentSession?.startTime || applicableShift.startTime);
          const end = parseTimeToday(currentSession?.endTime || applicableShift.endTime);

          if (baseType === 'IN') {
            if (isOvertimeSession) {
              // For OT session, also check if check-in is too late (ABSENT logic applies to OT too)
              if (start) {
                if (now > new Date(start.getTime() + absentThresholdMs)) {
                  isAbsent = true;
                  latenessMinutes = minutesBetween(now, start);
                  note = `OT Absent - Late by ${Math.round((now - start) / 60000)} min beyond threshold (${shiftPlan.absentThresholdMinutes} min)`;
                } else if (now > new Date(start.getTime() + graceMinutes * 60000)) {
                  isLate = true;
                  isOvertime = true;
                  latenessMinutes = minutesBetween(now, start);
                  note = `OT Late by ${Math.round((now - start) / 60000)} min`;
                } else {
                  isOvertime = true;
                  note = `Overtime check-in`;
                }
              } else {
                isOvertime = true;
                note = `Overtime check-in`;
              }
            } else if (start) {
              // Check if absent (late beyond threshold)
              if (now > new Date(start.getTime() + absentThresholdMs)) {
                isAbsent = true;
                latenessMinutes = minutesBetween(now, start);
                note = `Absent - Late by ${Math.round((now - start) / 60000)} min beyond threshold (${shiftPlan.absentThresholdMinutes} min)`;
              } else if (now > new Date(start.getTime() + graceMinutes * 60000)) {
                isLate = true;
                latenessMinutes = minutesBetween(now, start);
                note = `Late by ${Math.round((now - start) / 60000)} min`;
              }
            }
          } else {
            if (isOvertimeSession) {
              isOvertime = true;
              note = `Overtime check-out`;
            } else {
              if (end && now < end) {
                isEarlyLeave = true;
                earlyLeaveMinutes = minutesBetween(end, now);
                note = `Left early by ${Math.round((end - now) / 60000)} min`;
              }

              const overtimeStartForOut = overtimeStart || (end ? new Date(end.getTime() + (shiftPlan.overtimeThresholdMinutes || 15) * 60000) : null);
              if (isOTApproved && overtimeStartForOut && now > overtimeStartForOut) {
                isOvertime = true;
                note = `Overtime ${Math.round((now - overtimeStartForOut) / 60000)} min`;
              }
            }
          }
        }
      } catch (e) { console.warn('Flag computation failed', e.message); }

      // Determine final type based on flags
      let type = baseType;
      if (isAbsent) {
        type = 'ABSENT';
      } else if (isOvertime) {
        type = baseType === 'IN' ? 'OT_IN' : 'OT_OUT';
      } else if (isLate && baseType === 'IN') {
        type = 'LATE_IN';
      } else if (isEarlyLeave && baseType === 'OUT') {
        type = 'EARLY_OUT';
      }

      console.log(`Attendance decision: user=${match.userId} logs=${todayLogs.length} mainShiftLogs=${mainShiftLogsCount} lastType=${lastLogType} type=${type} expected=${expectedLogsPerDay} isOTApproved=${isOTApproved} sessionIndex=${sessionIndex}`);
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
        isAbsent,
        isOvertime,
        latenessMinutes,
        earlyLeaveMinutes,
        imageBase64: imageBase64 || null
      });

      console.log(`Attendance logged: ${match.detectedName} (Distance: ${match.distance.toFixed(3)}) type=${type} flags:${isAbsent? 'ABSENT':''}${isLate? ' LATE':''}${isEarlyLeave? ' EARLY':''}${isOvertime? ' OT':''}`);

      // Emit real-time update
      emitToRoom('admin', 'attendance-update', {
        userId: match.userId,
        detectedName: match.detectedName,
        type,
        timestamp: now,
        isLate,
        isEarlyLeave,
        isAbsent,
        isOvertime,
        latenessMinutes,
        earlyLeaveMinutes
      });

      // Refresh the employee's own attendance history immediately
      emitEmployeePortalRefresh(match.userId, 'attendance');

      const expectedLogsPerDayAfterLog = expectedLogsPerDay;
      const nextCount = todayLogs.length + 1;
      const finished = nextCount >= expectedLogsPerDayAfterLog;
      const nextType = finished ? null : nextTypeFromCount(nextCount, type);
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
        flags: { isAbsent, isLate, isEarlyLeave, isOvertime },
        latenessMinutes,
        earlyLeaveMinutes,
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
      emitToRoom('admin', 'attendance-update', {
        userId: null,
        detectedName: match.detectedName || 'Unknown',
        type: 'IN',
        timestamp: now,
        isLate: false,
        isEarlyLeave: false,
        isAbsent: false,
        isOvertime: false,
        latenessMinutes: null,
        earlyLeaveMinutes: null,
        anonymous: true
      });
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

    const parseTimeToday = (timeStr) => {
      if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
      const [hh, mm] = timeStr.split(':').map(Number);
      const d = new Date(today);
      d.setHours(hh, mm, 0, 0);
      return d;
    };

    const activeShift = await ShiftSetting.findOne({ where: { active: true } });
    const shiftPlan = parseShiftPlan(activeShift);
    const allowedLateMinutes = Number(activeShift?.gracePeriodMinutes ?? 5);
    const absentThresholdMs = (shiftPlan.absentThresholdMinutes || 15) * 60000;
    const autoCheckoutGraceMinutes = Number(shiftPlan.autoCheckoutGraceMinutes || activeShift?.autoCheckoutGraceMinutes || 15);
    const overtimeStart = shiftPlan.overtimeStart ? parseTimeToday(shiftPlan.overtimeStart) : null;
    const overtimeEnd = shiftPlan.overtimeEnd ? parseTimeToday(shiftPlan.overtimeEnd) : null;

    const shiftBoundaries = shiftPlan.mainShifts.map((shift) => ({
      start: parseTimeToday(shift.startTime),
      end: parseTimeToday(shift.endTime),
    }));

    const shiftBoundaryMarkers = shiftBoundaries.reduce((markers, shift, index) => {
      if (index === 0) return markers;
      const prev = shiftBoundaries[index - 1];
      if (prev.end && shift.start) {
        markers.push(new Date(Math.round((prev.end.getTime() + shift.start.getTime()) / 2)));
      }
      return markers;
    }, []);

    const assignMainShiftIndex = (timestamp) => {
      if (!timestamp || shiftPlan.mainShifts.length === 0) return 0;
      const ts = timestamp.getTime();
      if (shiftBoundaryMarkers.length === 0) return 0;
      if (ts <= shiftBoundaryMarkers[0].getTime()) return 0;
      for (let i = 1; i < shiftBoundaryMarkers.length; i += 1) {
        if (ts <= shiftBoundaryMarkers[i].getTime()) return i;
      }
      return shiftPlan.mainShifts.length - 1;
    };

    const logs = await AttendanceLog.findAll({
      where,
      include: [{ model: User, as: "User", attributes: ['name', 'email', 'employeeCode', 'avatarUrl'] }],
      order: [['timestamp', 'DESC']]
    });

    let overtimeRequest = null;
    let hasOvertimeRequestToday = false;
    let hasApprovedOvertimeRequestToday = false;
    if (userId) {
      overtimeRequest = await OvertimeRequest.findOne({
        where: {
          userId: Number(userId),
          date: formatLocalDate(today),
          approvalStatus: { [Op.in]: ['pending', 'approved'] }
        },
        order: [['id', 'DESC']]
      });
      hasOvertimeRequestToday = Boolean(overtimeRequest);
      hasApprovedOvertimeRequestToday = overtimeRequest?.approvalStatus === 'approved';
    }

    const totalLogCapacity = shiftPlan.mainShifts.length * 2 + (hasApprovedOvertimeRequestToday ? 2 : 0);

    const logsAsc = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const shiftGroups = shiftPlan.mainShifts.map((shift, idx) => ({
      shiftIndex: idx,
      shiftLabel: `Shift ${idx + 1}`,
      logs: []
    }));

    const items = [];
    let overtimeLogCount = 0;
    const lastMainShiftEndTime = shiftBoundaries.length > 0 && shiftBoundaries[shiftBoundaries.length - 1].end
      ? shiftBoundaries[shiftBoundaries.length - 1].end.getTime()
      : null;

    logsAsc.forEach((log) => {
      const ts = new Date(log.timestamp);
      const isOvertime = Boolean(log.isOvertime) && hasApprovedOvertimeRequestToday;
      let shiftLabel = null;

      if (isOvertime) {
        shiftLabel = 'Overtime shift';
        overtimeLogCount += 1;
      } else {
        const assignedIndex = assignMainShiftIndex(ts);
        const boundary = shiftBoundaries[assignedIndex];
        const cutoff = boundary && boundary.end ? boundary.end.getTime() + absentThresholdMs : Infinity;
        if (ts.getTime() <= cutoff) {
          shiftLabel = `Shift ${assignedIndex + 1}`;
          shiftGroups[assignedIndex].logs.push(log);
        } else if (hasApprovedOvertimeRequestToday && lastMainShiftEndTime && ts.getTime() >= lastMainShiftEndTime) {
          // Allow an early OT check-in before overtimeStart once the last main shift is over.
          shiftLabel = 'Overtime shift';
          overtimeLogCount += 1;
        } else {
          const otStart = shiftPlan.overtimeStart ? parseTimeToday(shiftPlan.overtimeStart) : null;
          if (hasOvertimeRequestToday && otStart && ts.getTime() >= otStart.getTime()) {
            shiftLabel = 'Overtime shift';
            overtimeLogCount += 1;
          } else {
            return;
          }
        }
      }

      const flags = {
        isLate: Boolean(log.isLate),
        isEarlyLeave: Boolean(log.isEarlyLeave),
        isOvertime
      };
      items.push({
        id: log.id,
        userId: log.userId,
        detectedName: log.detectedName,
        timestamp: log.timestamp,
        type: log.type || 'IN',
        confidence: log.confidence,
        matchDistance: log.matchDistance,
        note: log.note || null,
        shiftId: log.shiftId || null,
        flags,
        latenessMinutes: log.latenessMinutes ?? null,
        earlyLeaveMinutes: log.earlyLeaveMinutes ?? null,
        shiftLabel,
        allowedLateMinutes,
        overtimeRequestStatus: overtimeRequest?.approvalStatus || null,
        avatarUrl: log.User?.avatarUrl || null
      });
    });

    if (userId) {
      const overtimeStart = shiftPlan.overtimeStart ? parseTimeToday(shiftPlan.overtimeStart) : null;
      const now = new Date();
      const allMainShiftFinalized = shiftPlan.mainShifts.every((shift, idx) => {
        const start = parseTimeToday(shift.startTime);
        const hasShiftLogs = shiftGroups[idx]?.logs.length > 0;
        if (hasShiftLogs) return true;
        return start ? now.getTime() > start.getTime() + absentThresholdMs : false;
      });

      shiftPlan.mainShifts.forEach((shift, idx) => {
        const start = parseTimeToday(shift.startTime);
        if (!start) return;
        const hasShiftLogs = shiftGroups[idx]?.logs.length > 0;
        const absentDeadline = new Date(start.getTime() + absentThresholdMs);
        if (!hasShiftLogs && now > absentDeadline) {
          items.push({
            id: `absent-${idx + 1}`,
            userId: Number(userId),
            detectedName: 'Absent',
            timestamp: start,
            type: 'ABSENT',
            confidence: null,
            matchDistance: null,
            note: 'No check-in recorded for this shift',
            shiftId: activeShift?.id || null,
            flags: { isLate: false, isEarlyLeave: false, isOvertime: false },
            latenessMinutes: null,
            earlyLeaveMinutes: null,
            shiftLabel: `Shift ${idx + 1}`,
            allowedLateMinutes,
            isAbsent: true,
            avatarUrl: null,
          });
        }
      });

      const overtimeStartTime = overtimeStart;
      if (hasApprovedOvertimeRequestToday && allMainShiftFinalized) {
        if (overtimeLogCount === 0) {
          const overtimeAbsentDeadline = overtimeStartTime ? new Date(overtimeStartTime.getTime() + absentThresholdMs) : null;
          const showOvertimePlaceholder = !overtimeAbsentDeadline || now <= overtimeAbsentDeadline;
          if (overtimeAbsentDeadline && now > overtimeAbsentDeadline) {
            items.push({
              id: `absent-overtime`,
              userId: Number(userId),
              detectedName: 'Absent',
              timestamp: overtimeStartTime || now,
              type: 'ABSENT',
              confidence: null,
              matchDistance: null,
              note: 'No overtime check-in recorded for approved OT',
              shiftId: activeShift?.id || null,
              flags: { isLate: false, isEarlyLeave: false, isOvertime: true },
              latenessMinutes: null,
              earlyLeaveMinutes: null,
              shiftLabel: 'Overtime shift',
              allowedLateMinutes,
              isAbsent: true,
              avatarUrl: null,
            });
          } else if (showOvertimePlaceholder) {
            items.push({
              id: 'overtime-request',
              userId: Number(userId),
              detectedName: 'Overtime',
              timestamp: overtimeStartTime || now,
              type: null,
              confidence: null,
              matchDistance: null,
              note: 'Approved overtime request',
              shiftId: activeShift?.id || null,
              flags: { isLate: false, isEarlyLeave: false, isOvertime: true },
              latenessMinutes: null,
              earlyLeaveMinutes: null,
              shiftLabel: 'Overtime shift',
              allowedLateMinutes,
              overtimeRequestStatus: overtimeRequest?.approvalStatus || null,
              avatarUrl: null
            });
          }
        }
      }
    }

    const sortedItems = items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.json({
      status: "success",
      date: formatLocalDate(today),
      count: logs.length,
      allowedLateMinutes,
      overtimeRequest: overtimeRequest ? overtimeRequest.toJSON() : null,
      shiftPlan: {
        mainShifts: shiftPlan.mainShifts,
        overtimeStart: shiftPlan.overtimeStart,
        overtimeEnd: shiftPlan.overtimeEnd,
        overtimeThresholdMinutes: shiftPlan.overtimeThresholdMinutes,
        absentThresholdMinutes: shiftPlan.absentThresholdMinutes,
        autoCheckoutGraceMinutes: shiftPlan.autoCheckoutGraceMinutes,
        expectedLogsPerDay: totalLogCapacity
      },
      logs: sortedItems
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

      const overtimeRequest = await OvertimeRequest.findOne({
        where: {
          userId: match.userId,
          date: formatLocalDate(now),
          approvalStatus: { [Op.in]: ['pending', 'approved'] }
        },
        order: [['id', 'DESC']]
      });
      const isOTApproved = overtimeRequest?.approvalStatus === 'approved';
      const absentThresholdMs = (shiftPlan.absentThresholdMinutes || 15) * 60000;

      const shiftBoundaries = shiftPlan.mainShifts.map((shift) => ({
        start: parseTimeToday(shift.startTime, now),
        end: parseTimeToday(shift.endTime, now),
      }));

      const shiftBoundaryMarkers = shiftBoundaries.reduce((markers, shift, index) => {
        if (index === 0) return markers;
        const prev = shiftBoundaries[index - 1];
        if (prev.end && shift.start) {
          markers.push(new Date(Math.round((prev.end.getTime() + shift.start.getTime()) / 2)));
        }
        return markers;
      }, []);

      const assignMainShiftIndex = (timestamp) => {
        if (!timestamp || shiftPlan.mainShifts.length === 0) return 0;
        const ts = timestamp.getTime();
        if (shiftBoundaryMarkers.length === 0) return 0;
        if (ts <= shiftBoundaryMarkers[0].getTime()) return 0;
        for (let i = 1; i < shiftBoundaryMarkers.length; i += 1) {
          if (ts <= shiftBoundaryMarkers[i].getTime()) return i;
        }
        return shiftPlan.mainShifts.length - 1;
      };

      const allMainShiftFinalized = shiftPlan.mainShifts.every((shift, idx) => {
        const start = parseTimeToday(shift.startTime, now);
        const shiftLogs = logsToday.filter((log) => {
          if (!log.type) return false;
          if (log.type.startsWith('OT_')) return false;
          return assignMainShiftIndex(new Date(log.timestamp)) === idx;
        });
        return (
          shiftLogs.length > 0 ||
          (start && now.getTime() > start.getTime() + absentThresholdMs)
        );
      });

      expectedLogsPerDay = (shiftPlan.mainShifts.length * 2) + (isOTApproved ? 2 : 0);
      if (allMainShiftFinalized && !isOTApproved) {
        finished = true;
        nextType = null;
      } else if (allMainShiftFinalized && isOTApproved) {
        const otLogs = logsToday.filter((log) => /^OT_/.test(log.type || ''));
        if (otLogs.length === 0) {
          finished = false;
          nextType = 'OT_IN';
        } else {
          const lastOtLog = otLogs[otLogs.length - 1];
          if (lastOtLog.type === 'OT_IN') {
            finished = false;
            nextType = 'OT_OUT';
          } else if (lastOtLog.type === 'OT_OUT') {
            finished = true;
            nextType = null;
          } else {
            finished = false;
            nextType = 'OT_IN';
          }
        }
      } else {
        finished = logsToday.length >= expectedLogsPerDay;
        const lastType = logsToday.length ? logsToday[logsToday.length - 1].type : null;
        nextType = finished ? null : nextTypeFromCount(logsToday.length, lastType);
      }
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

    return res.json({ status: 'success', count: logs.length, logs: logs.map(l => ({ id: l.id, type: l.type, timestamp: l.timestamp, note: l.note, flags: { isLate: l.isLate, isEarlyLeave: l.isEarlyLeave, isOvertime: l.isOvertime }, shiftId: l.shiftId, latenessMinutes: l.latenessMinutes ?? null, earlyLeaveMinutes: l.earlyLeaveMinutes ?? null })) });
  } catch (err) {
    console.error('Status error', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
