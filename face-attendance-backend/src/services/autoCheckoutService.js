import { AttendanceLog, ShiftSetting } from "../models/pg/index.js";
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

    // For each main shift, check for auto checkout
    for (let sessionIndex = 0; sessionIndex < shiftPlan.mainShifts.length; sessionIndex++) {
      const session = shiftPlan.mainShifts[sessionIndex];
      const endTime = parseTimeToday(session.endTime, now);
      if (!endTime) continue;

      const graceMinutes = Number(shift.autoCheckoutGraceMinutes ?? shift.gracePeriodMinutes ?? 15);
      const gracePeriodMs = graceMinutes * 60 * 1000;
      const autoCheckoutTime = new Date(endTime.getTime() + gracePeriodMs);

      if (now < autoCheckoutTime) continue; // Not yet time to auto checkout

      // Find users who have IN but no corresponding OUT for this session today
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const tomorrow = new Date(todayStart);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all logs for today
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

      for (const [userId, logs] of Object.entries(userLogs)) {
        // Check if this session is incomplete (odd number of logs for this session)
        const sessionStartIndex = sessionIndex * 2;
        const sessionLogs = logs.slice(sessionStartIndex, sessionStartIndex + 2);

        if (sessionLogs.length === 1 && sessionLogs[0].type === 'IN') {
          // Has IN but no OUT, and time has passed auto checkout time
          const lastIn = sessionLogs[0];
          if (lastIn.timestamp < autoCheckoutTime) {
            // Check if this user has approved OT today - if yes, don't auto checkout main shift
            const todayDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const hasApprovedOT = await OvertimeRequest.findOne({
              where: {
                userId: parseInt(userId),
                date: todayDateString,
                approvalStatus: 'approved'
              }
            });

            if (!hasApprovedOT) {
              // Create auto checkout only if no approved OT
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

    console.log('[Auto Checkout] Auto checkout check completed.');
  } catch (error) {
    console.error('[Auto Checkout] Error:', error);
  }
};