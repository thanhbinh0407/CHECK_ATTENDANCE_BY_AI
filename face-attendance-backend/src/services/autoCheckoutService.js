import { AttendanceLog, ShiftSetting, OvertimeRequest } from "../models/pg/index.js";
import { Op } from "sequelize";
import { parseShiftPlan } from "../controllers/attendanceController.js"; // Import the function
import { emitEmployeePortalRefresh } from "../socket.js";

// Helper: parse 'HH:MM' into Date on today's date
const parseTimeToday = (hhmm, baseDate = new Date()) => {
  if (!hhmm) return null;
  const [hh, mm] = hhmm.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(hh, mm, 0, 0);
  return d;
};

const createDayRange = (baseDate = new Date()) => {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const isMainShiftCheckIn = (type) => type === 'IN' || type === 'LATE_IN';

const isMainShiftCheckOut = (type) => type === 'OUT' || type === 'EARLY_OUT';

const isOvertimeCheckIn = (log) => Boolean(log?.isOvertime) && (log.type === 'IN' || log.type === 'OT_IN');

const isOvertimeCheckOut = (log) => Boolean(log?.isOvertime) && (log.type === 'OUT' || log.type === 'OT_OUT');

export const performAutoCheckout = async () => {
  try {
    // Get active shift setting
    const shift = await ShiftSetting.findOne({ where: { active: true } });
    if (!shift) {
      return;
    }

    const shiftPlan = parseShiftPlan(shift);
    const now = new Date();
    const graceMinutes = Number(shiftPlan.autoCheckoutGraceMinutes ?? shift.autoCheckoutGraceMinutes ?? shift.gracePeriodMinutes ?? 15);
    const gracePeriodMs = graceMinutes * 60 * 1000;
    if (!Number.isFinite(graceMinutes) || graceMinutes <= 0) {
      return;
    }

    // Find all logs for today once so we can reuse them for main and OT session checks
    const { start: todayStart, end: tomorrow } = createDayRange(now);
    const todayLogs = await AttendanceLog.findAll({
      where: {
        timestamp: { [Op.gte]: todayStart, [Op.lt]: tomorrow }
      },
      order: [['userId', 'ASC'], ['timestamp', 'ASC']]
    });

    // Group by user
    const userLogs = {};
    todayLogs.forEach(log => {
      if (!userLogs[log.userId]) userLogs[log.userId] = [];
      userLogs[log.userId].push(log);
    });

    const shiftBoundaries = shiftPlan.mainShifts.map((session) => ({
      start: parseTimeToday(session.startTime, now),
      end: parseTimeToday(session.endTime, now)
    }));

    const shiftBoundaryMarkers = shiftBoundaries.reduce((markers, session, index) => {
      if (index === 0) return markers;
      const prev = shiftBoundaries[index - 1];
      if (prev.end && session.start) {
        markers.push(new Date(Math.round((prev.end.getTime() + session.start.getTime()) / 2)));
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

    const hasAutoCheckoutForShift = async (userId, sessionIndex, autoType) => {
      const session = shiftPlan.mainShifts[sessionIndex];
      if (!session) return true;

      const existing = await AttendanceLog.findOne({
        where: {
          userId,
          shiftId: shift.id,
          type: autoType,
          isAuto: true,
          timestamp: {
            [Op.gte]: todayStart,
            [Op.lt]: tomorrow
          }
        }
      });

      return Boolean(existing);
    };

    // For each main shift, check for auto checkout
    for (let sessionIndex = 0; sessionIndex < shiftPlan.mainShifts.length; sessionIndex++) {
      const session = shiftPlan.mainShifts[sessionIndex];
      const endTime = parseTimeToday(session.endTime, now);
      if (!endTime) continue;

      const autoCheckoutTime = new Date(endTime.getTime() + gracePeriodMs);
      if (now < autoCheckoutTime) continue; // Not yet time to auto checkout

      for (const [userId, logs] of Object.entries(userLogs)) {
        const sessionLogs = logs.filter((log) => !log.isOvertime && assignMainShiftIndex(new Date(log.timestamp)) === sessionIndex);
        const hasCheckIn = sessionLogs.some((log) => isMainShiftCheckIn(log.type));
        const hasCheckOut = sessionLogs.some((log) => isMainShiftCheckOut(log.type));

        if (!hasCheckIn || hasCheckOut) continue;

        const existingAutoCheckout = await hasAutoCheckoutForShift(parseInt(userId, 10), sessionIndex, 'OUT');
        if (existingAutoCheckout) continue;

        const todayDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const hasApprovedOT = await OvertimeRequest.findOne({
          where: {
            userId: parseInt(userId, 10),
            date: todayDateString,
            approvalStatus: 'approved'
          }
        });

        if (hasApprovedOT) {
          continue;
        }

        await AttendanceLog.create({
          userId: parseInt(userId, 10),
          detectedName: 'Auto checkout',
          confidence: 1.0,
          matchDistance: 0,
          type: 'OUT',
          timestamp: autoCheckoutTime,
          note: `Auto check-out after ${session.endTime} + ${graceMinutes}min grace period`,
          shiftId: shift.id,
          isLate: false,
          isEarlyLeave: false,
          isOvertime: false,
          isAuto: true
        });

        emitEmployeePortalRefresh(userId, 'attendance');
        console.log(`[Auto Checkout] Created auto check-out for user ${userId} at session ${sessionIndex + 1}`);
      }
    }

    // Also handle approved overtime auto checkout if an OT shift has started and its end time has passed
    const overtimeStart = shiftPlan.overtimeStart ? parseTimeToday(shiftPlan.overtimeStart, now) : null;
    const overtimeEnd = shiftPlan.overtimeEnd ? parseTimeToday(shiftPlan.overtimeEnd, now) : null;
    if (overtimeStart && overtimeEnd) {
      const otAutoCheckoutTime = new Date(overtimeEnd.getTime() + gracePeriodMs);
      if (now >= otAutoCheckoutTime) {
        const todayDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const approvedOvertimeRequests = await OvertimeRequest.findAll({
          where: {
            date: todayDateString,
            approvalStatus: 'approved'
          }
        });

        const approvedUserIds = new Set(approvedOvertimeRequests.map((req) => req.userId));
        for (const [userId, logs] of Object.entries(userLogs)) {
          if (!approvedUserIds.has(parseInt(userId))) continue;

          const overtimeLogs = logs.filter((log) => isOvertimeCheckIn(log));
          const hasOvertimeCheckout = logs.some((log) => isOvertimeCheckOut(log));
          if (overtimeLogs.length !== 1 || hasOvertimeCheckout) continue;

          const existingAutoCheckout = await AttendanceLog.findOne({
            where: {
              userId: parseInt(userId, 10),
              shiftId: shift.id,
              type: 'OT_OUT',
              isOvertime: true,
              isAuto: true,
              timestamp: {
                [Op.gte]: todayStart,
                [Op.lt]: tomorrow
              }
            }
          });

          if (existingAutoCheckout) continue;

          await AttendanceLog.create({
            userId: parseInt(userId, 10),
            detectedName: 'Auto checkout',
            confidence: 1.0,
            matchDistance: 0,
            type: 'OT_OUT',
            timestamp: otAutoCheckoutTime,
            note: `Auto check-out after overtime end ${shiftPlan.overtimeEnd} + ${graceMinutes}min grace period`,
            shiftId: shift.id,
            isLate: false,
            isEarlyLeave: false,
            isOvertime: true,
            isAuto: true
          });

          emitEmployeePortalRefresh(userId, 'attendance');
          console.log(`[Auto Checkout] Created auto check-out for overtime user ${userId}`);
        }
      }
    }

  } catch (error) {
    console.error('[Auto Checkout] Error:', error);
  }
};