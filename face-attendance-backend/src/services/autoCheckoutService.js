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

export const performAutoCheckout = async () => {
  try {
    console.log('[Auto Checkout] Starting auto checkout check...');

    // Get active shift setting
    const shift = await ShiftSetting.findOne({ where: { active: true } });
    if (!shift) {
      console.log('[Auto Checkout] No active shift setting found. Skipping.');
      return;
    }

    const shiftPlan = parseShiftPlan(shift);
    const now = new Date();
    const graceMinutes = Number(shiftPlan.autoCheckoutGraceMinutes ?? shift.autoCheckoutGraceMinutes ?? shift.gracePeriodMinutes ?? 15);
    const gracePeriodMs = graceMinutes * 60 * 1000;

    // Find all logs for today once so we can reuse them for main and OT session checks
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
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

    // For each main shift, check for auto checkout
    for (let sessionIndex = 0; sessionIndex < shiftPlan.mainShifts.length; sessionIndex++) {
      const session = shiftPlan.mainShifts[sessionIndex];
      const endTime = parseTimeToday(session.endTime, now);
      if (!endTime) continue;

      const autoCheckoutTime = new Date(endTime.getTime() + gracePeriodMs);
      if (now < autoCheckoutTime) continue; // Not yet time to auto checkout

      for (const [userId, logs] of Object.entries(userLogs)) {
        const sessionStartIndex = sessionIndex * 2;
        const sessionLogs = logs.slice(sessionStartIndex, sessionStartIndex + 2);

        if (sessionLogs.length === 1 && sessionLogs[0].type === 'IN') {
          const lastIn = sessionLogs[0];
          if (lastIn.timestamp < autoCheckoutTime) {
            const todayDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const hasApprovedOT = await OvertimeRequest.findOne({
              where: {
                userId: parseInt(userId),
                date: todayDateString,
                approvalStatus: 'approved'
              }
            });

            if (!hasApprovedOT) {
              await AttendanceLog.create({
                userId: parseInt(userId),
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
            } else {
              console.log(`[Auto Checkout] Skipped auto check-out for user ${userId} - has approved OT`);
            }
          }
        }
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

          const overtimeLogs = logs.filter((log) => Boolean(log.isOvertime) && ['IN', 'OT_IN'].includes(log.type));
          if (overtimeLogs.length === 1 && overtimeLogs[0].timestamp < otAutoCheckoutTime) {
            await AttendanceLog.create({
              userId: parseInt(userId),
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
    }

    console.log('[Auto Checkout] Auto checkout check completed.');
  } catch (error) {
    console.error('[Auto Checkout] Error:', error);
  }
};