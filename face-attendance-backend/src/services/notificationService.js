import Notification from "../models/pg/Notification.js";
import User from "../models/pg/User.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import sequelize from "../db/sequelize.js";
import { Op } from "sequelize";

// Check and notify contract expiration
export const checkContractExpiration = async () => {
  try {
    const today = new Date();
    const days15 = new Date(today);
    days15.setDate(days15.getDate() + 15);
    const days30 = new Date(today);
    days30.setDate(days30.getDate() + 30);

    // Find contracts expiring in 15-30 days
    const expiringContracts = await User.findAll({
      where: {
        contractType: { [Op.ne]: null },
        employmentStatus: 'active',
        [Op.or]: [
          // For contracts with end dates, we'd need to calculate based on startDate + contract duration
          // For now, we'll check based on contractType and startDate
        ]
      },
      include: [{ model: User, as: 'Manager' }]
    });

    // TODO: Implement logic to calculate contract end date based on contractType
    // For now, this is a placeholder

    console.log(`[Notification Service] Checked ${expiringContracts.length} contracts for expiration`);
  } catch (error) {
    console.error("[Notification Service] Error checking contract expiration:", error);
  }
};

// Notify birthdays
export const notifyBirthdays = async () => {
  try {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    const birthdays = await User.findAll({
      where: {
        role: 'employee',
        isActive: true,
        [Op.and]: [
          sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM "dateOfBirth"')), todayMonth),
          sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('DAY FROM "dateOfBirth"')), todayDay)
        ]
      }
    });

    for (const employee of birthdays) {
      // Notify HR/Admin
      const admins = await User.findAll({ where: { role: 'admin' } });
      for (const admin of admins) {
        await Notification.create({
          userId: admin.id,
          type: 'birthday',
          title: 'Employee Birthday',
          message: `Today is ${employee.name}'s birthday! 🎉`,
          isRead: false
        });
      }
    }

    console.log(`[Notification Service] Notified ${birthdays.length} birthdays`);
  } catch (error) {
    console.error("[Notification Service] Error notifying birthdays:", error);
  }
};

// Notify work anniversaries
export const notifyWorkAnniversaries = async () => {
  try {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    const anniversaries = await User.findAll({
      where: {
        role: 'employee',
        isActive: true,
        startDate: {
          [Op.not]: null
        }
      }
    });

    for (const employee of anniversaries) {
      if (!employee.startDate) continue;
      
      const startDate = new Date(employee.startDate);
      if (startDate.getMonth() + 1 === todayMonth && startDate.getDate() === todayDay) {
        const years = today.getFullYear() - startDate.getFullYear();
        
        // Notify employee
        await Notification.create({
          userId: employee.id,
          type: 'anniversary',
          title: 'Work Anniversary',
          message: `Congratulations on your ${years} year${years > 1 ? 's' : ''} work anniversary! 🎉`,
          isRead: false
        });

        // Notify HR/Admin
        const admins = await User.findAll({ where: { role: 'admin' } });
        for (const admin of admins) {
          await Notification.create({
            userId: admin.id,
            type: 'anniversary',
            title: 'Work Anniversary',
            message: `${employee.name} celebrates ${years} year${years > 1 ? 's' : ''} with the company today!`,
            isRead: false
          });
        }
      }
    }

    console.log(`[Notification Service] Checked work anniversaries`);
  } catch (error) {
    console.error("[Notification Service] Error notifying work anniversaries:", error);
  }
};

// Check and warn about late arrivals
export const checkLateArrivals = async () => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get employees with more than 3 late arrivals this month
    const lateEmployees = await User.findAll({
      where: {
        role: 'employee',
        isActive: true
      },
      include: [{
        model: AttendanceLog,
        as: 'AttendanceLogs',
        where: {
          isLate: true,
          timestamp: {
            [Op.gte]: startOfMonth
          }
        },
        required: false
      }]
    });

    for (const employee of lateEmployees) {
      const lateCount = employee.AttendanceLogs?.length || 0;
      if (lateCount >= 3) {
        // Notify employee
        await Notification.create({
          userId: employee.id,
          type: 'attendance_warning',
          title: 'Late Arrival Warning',
          message: `You have been late ${lateCount} times this month. Please be more punctual.`,
          isRead: false
        });

        // Notify manager
        if (employee.managerId) {
          await Notification.create({
            userId: employee.managerId,
            type: 'attendance_warning',
            title: 'Employee Late Arrival Warning',
            message: `${employee.name} has been late ${lateCount} times this month.`,
            isRead: false
          });
        }
      }
    }

    console.log(`[Notification Service] Checked late arrivals`);
  } catch (error) {
    console.error("[Notification Service] Error checking late arrivals:", error);
  }
};

