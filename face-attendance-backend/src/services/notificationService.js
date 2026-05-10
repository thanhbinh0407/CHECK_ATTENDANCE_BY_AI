import Notification from "../models/pg/Notification.js";
import User from "../models/pg/User.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import sequelize from "../db/sequelize.js";
import { Op } from "sequelize";

// Check and notify contract expiration
export const checkContractExpiration = async () => {
  const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const calculateContractEndDate = (contractType, startDate) => {
    const hireDate = parseDate(startDate);
    if (!hireDate || !contractType) return null;
    const endDate = new Date(hireDate);
    switch (contractType) {
      case 'probation_1_month':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'probation_2_month':
        endDate.setMonth(endDate.getMonth() + 2);
        break;
      case 'probation_3_month':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'formal_1_year':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case 'formal_2_year':
        endDate.setFullYear(endDate.getFullYear() + 2);
        break;
      case 'formal_3_year':
        endDate.setFullYear(endDate.getFullYear() + 3);
        break;
      default:
        return null;
    }
    return endDate;
  };

  try {
    const today = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;

    const activeContracts = await User.findAll({
      where: {
        contractType: { [Op.ne]: null },
        employmentStatus: 'active',
        isActive: true,
        startDate: { [Op.ne]: null }
      },
      include: [{ model: User, as: 'Manager' }]
    });

    let notified = 0;
    let deactivated = 0;

    for (const employee of activeContracts) {
      const contractEndDate = calculateContractEndDate(employee.contractType, employee.startDate);
      if (!contractEndDate) continue;

      const daysUntilExpiration = Math.ceil((contractEndDate - today) / msPerDay);
      const managerIds = [];
      if (employee.Manager) managerIds.push(employee.Manager.id);

      if (daysUntilExpiration < 0) {
        await employee.update({ isActive: false, employmentStatus: 'terminated' });
        await Notification.create({
          userId: employee.id,
          type: 'contract_expired',
          title: 'Contract expired',
          message: `Your ${employee.contractType} contract expired on ${contractEndDate.toLocaleDateString('en-US')}. The account is now deactivated.`,
          read: false
        });

        for (const managerId of managerIds) {
          await Notification.create({
            userId: managerId,
            type: 'contract_expired',
            title: 'Employee contract expired',
            message: `${employee.name}'s contract expired on ${contractEndDate.toLocaleDateString('en-US')}. The account has been deactivated.`,
            read: false
          });
        }
        deactivated += 1;
        continue;
      }

      if (daysUntilExpiration <= 30) {
        await Notification.create({
          userId: employee.id,
          type: 'contract_warning',
          title: 'Contract expiring soon',
          message: `Your contract is due to expire in ${daysUntilExpiration} day(s) on ${contractEndDate.toLocaleDateString('en-US')}. Please arrange renewal or update status.`,
          read: false
        });

        for (const managerId of managerIds) {
          await Notification.create({
            userId: managerId,
            type: 'contract_warning',
            title: 'Employee contract expiring soon',
            message: `${employee.name}'s contract will expire in ${daysUntilExpiration} day(s) on ${contractEndDate.toLocaleDateString('en-US')}.`, 
            read: false
          });
        }
        notified += 1;
      }
    }

    console.log(`[Notification Service] Contract check complete. ${notified} expiring, ${deactivated} deactivated.`);
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
      // Notify HR + Manager
      const hrAndManagers = await User.findAll({ where: { role: { [Op.in]: ['hr', 'manager'] } } });
      for (const admin of hrAndManagers) {
        await Notification.create({
          userId: admin.id,
          type: 'birthday',
          title: 'Employee Birthday',
          message: `Today is ${employee.name}'s birthday! 🎉`,
          read: false
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
          read: false
        });

        // Notify HR + Manager
        const hrAndManagers = await User.findAll({ where: { role: { [Op.in]: ['hr', 'manager'] } } });
        for (const admin of hrAndManagers) {
          await Notification.create({
            userId: admin.id,
            type: 'anniversary',
            title: 'Work Anniversary',
            message: `${employee.name} celebrates ${years} year${years > 1 ? 's' : ''} with the company today!`,
            read: false
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
          read: false
        });

        // Notify manager
        if (employee.managerId) {
          await Notification.create({
            userId: employee.managerId,
            type: 'attendance_warning',
            title: 'Employee Late Arrival Warning',
            message: `${employee.name} has been late ${lateCount} times this month.`,
            read: false
          });
        }
      }
    }

    console.log(`[Notification Service] Checked late arrivals`);
  } catch (error) {
    console.error("[Notification Service] Error checking late arrivals:", error);
  }
};

