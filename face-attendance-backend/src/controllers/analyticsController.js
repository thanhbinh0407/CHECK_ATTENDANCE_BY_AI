import AttendanceLog from "../models/pg/AttendanceLog.js";
import User from "../models/pg/User.js";
import Salary from "../models/pg/Salary.js";
import LeaveRequest from "../models/pg/LeaveRequest.js";
import { Op } from "sequelize";

// Get overview statistics
export const getOverview = async (req, res) => {
  try {
    const totalEmployees = await User.count({ where: { role: "employee" } });
    const employeesWithFace = await User.count({
      where: { role: "employee" },
      include: [{
        model: FaceProfile,
        required: true
      }]
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await AttendanceLog.count({
      where: {
        timestamp: { [Op.gte]: today, [Op.lt]: tomorrow }
      }
    });

    const pendingLeaves = await LeaveRequest.count({
      where: { status: "pending" }
    });

    return res.json({
      status: "success",
      overview: {
        totalEmployees,
        employeesWithFace,
        employeesWithoutFace: totalEmployees - employeesWithFace,
        todayAttendance,
        pendingLeaves
      }
    });
  } catch (err) {
    console.error("Error fetching overview:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get attendance trend
export const getAttendanceTrend = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const logs = await AttendanceLog.findAll({
      where: {
        timestamp: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['timestamp', 'type', 'isLate', 'isEarlyLeave', 'userId'],
      order: [['timestamp', 'ASC']]
    });

    // Group by date
    const dailyData = {};
    logs.forEach(log => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { date, total: 0, onTime: 0, late: 0, earlyLeave: 0 };
      }
      dailyData[date].total++;
      if (log.isLate) dailyData[date].late++;
      if (log.isEarlyLeave) dailyData[date].earlyLeave++;
      if (!log.isLate && !log.isEarlyLeave) dailyData[date].onTime++;
    });

    const trend = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      status: "success",
      trend
    });
  } catch (err) {
    console.error("Error fetching attendance trend:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get employee statistics
export const getEmployeeStats = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const logs = await AttendanceLog.findAll({
      where: {
        timestamp: { [Op.between]: [startDate, endDate] },
        userId: { [Op.ne]: null }
      },
      include: [{
        model: User,
        attributes: ['id', 'name', 'employeeCode']
      }]
    });

    // Calculate stats per employee
    const employeeStats = {};
    logs.forEach(log => {
      if (!log.userId) return;
      if (!employeeStats[log.userId]) {
        employeeStats[log.userId] = {
          userId: log.userId,
          name: log.User?.name || "Unknown",
          employeeCode: log.User?.employeeCode || "",
          totalLogs: 0,
          lateCount: 0,
          earlyLeaveCount: 0,
          onTimeCount: 0
        };
      }
      employeeStats[log.userId].totalLogs++;
      if (log.isLate) employeeStats[log.userId].lateCount++;
      else if (log.isEarlyLeave) employeeStats[log.userId].earlyLeaveCount++;
      else employeeStats[log.userId].onTimeCount++;
    });

    const stats = Object.values(employeeStats)
      .sort((a, b) => b.onTimeCount - a.onTimeCount)
      .slice(0, 10); // Top 10

    return res.json({
      status: "success",
      stats
    });
  } catch (err) {
    console.error("Error fetching employee stats:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get salary statistics
export const getSalaryStats = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const salaries = await Salary.findAll({
      where: { month: currentMonth, year: currentYear },
      include: [{
        model: User,
        attributes: ['id', 'name', 'employeeCode']
      }]
    });

    const totalBaseSalary = salaries.reduce((sum, s) => sum + parseFloat(s.baseSalary || 0), 0);
    const totalBonus = salaries.reduce((sum, s) => sum + parseFloat(s.bonus || 0), 0);
    const totalDeduction = salaries.reduce((sum, s) => sum + parseFloat(s.deduction || 0), 0);
    const totalFinalSalary = salaries.reduce((sum, s) => sum + parseFloat(s.finalSalary || 0), 0);

    const statusCounts = {
      pending: salaries.filter(s => s.status === 'pending').length,
      approved: salaries.filter(s => s.status === 'approved').length,
      paid: salaries.filter(s => s.status === 'paid').length
    };

    return res.json({
      status: "success",
      stats: {
        totalEmployees: salaries.length,
        totalBaseSalary,
        totalBonus,
        totalDeduction,
        totalFinalSalary,
        averageSalary: salaries.length > 0 ? totalFinalSalary / salaries.length : 0,
        statusCounts
      }
    });
  } catch (err) {
    console.error("Error fetching salary stats:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get attendance distribution
export const getAttendanceDistribution = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const logs = await AttendanceLog.findAll({
      where: {
        timestamp: { [Op.between]: [startDate, endDate] }
      }
    });

    const distribution = {
      onTime: logs.filter(l => !l.isLate && !l.isEarlyLeave && l.userId).length,
      late: logs.filter(l => l.isLate).length,
      earlyLeave: logs.filter(l => l.isEarlyLeave).length,
      unmatched: logs.filter(l => !l.userId).length
    };

    return res.json({
      status: "success",
      distribution
    });
  } catch (err) {
    console.error("Error fetching attendance distribution:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

