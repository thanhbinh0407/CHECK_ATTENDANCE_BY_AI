#!/usr/bin/env node
import sequelize from './src/db/sequelize.js';
import { User, AttendanceLog, LeaveRequest } from './src/models/pg/index.js';
import { Op } from 'sequelize';

async function compute(userId, year, month) {
  const currentDate = new Date('2026-05-28T00:00:00');
  const timeZone = 'Asia/Ho_Chi_Minh';
  const dayKeyOf = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone });

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const logs = await AttendanceLog.findAll({
    where: { userId, timestamp: { [Op.between]: [startDate, endDate] } },
    order: [['timestamp','ASC']]
  });

  const dayMap = new Map();
  for (const log of logs) {
    const key = dayKeyOf(log.timestamp);
    if (!dayMap.has(key)) dayMap.set(key, { dateKey: key, checkIn: null, checkOut: null, logs: [], isAbsent: false });
    const day = dayMap.get(key);
    day.logs.push(log);
    if (log.type === 'IN' || log.type === 'LATE_IN' || log.type === 'OT_IN') {
      if (!day.checkIn || new Date(log.timestamp) < new Date(day.checkIn.timestamp)) day.checkIn = log;
    }
    if (log.type === 'OUT' || log.type === 'EARLY_OUT' || log.type === 'OT_OUT') {
      if (!day.checkOut || new Date(log.timestamp) > new Date(day.checkOut.timestamp)) day.checkOut = log;
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const todayKeyLocal = dayKeyOf(currentDate);
  const allWorkingDayKeys = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    if (key > todayKeyLocal) break;
    const dow = new Date(year, month -1, d).getDay();
    if (dow === 0 || dow === 6) continue;
    allWorkingDayKeys.push(key);
    if (!dayMap.has(key)) {
      dayMap.set(key, { dateKey: key, checkIn: null, checkOut: null, logs: [], isAbsent: true });
    }
  }

  const daily = Array.from(dayMap.values()).filter(d => { const dow = new Date(d.dateKey).getDay(); return dow !== 0 && dow !== 6; }).sort((a,b)=>a.dateKey.localeCompare(b.dateKey));

  // get leave requests overlapping
  const monthLeaveRequests = await LeaveRequest.findAll({ where: { userId, startDate: { [Op.lte]: endDate }, endDate: { [Op.gte]: startDate }, status: 'approved' } });

  return { daily, allWorkingDayKeys };
}

async function run() {
  try {
    await sequelize.authenticate();
    const name = 'Thanh Binh';
    const user = await User.findOne({ where: { name: { [Op.iLike]: name } }, attributes: ['id','name','employeeCode'] });
    if (!user) { console.log('User not found'); process.exit(0); }
    console.log(`User: ${user.name} id=${user.id} code=${user.employeeCode}`);
    const { daily, allWorkingDayKeys } = await compute(user.id, 2026, 5);
    console.log(`Working days considered: ${allWorkingDayKeys.length}`);
    const absentDays = daily.filter(d => d.isAbsent).map(d => d.dateKey);
    console.log('Absent days in May 2026 (derived):', absentDays);
    // show sample days with checkin/out
    daily.forEach(d=>{
      console.log(`${d.dateKey} - isAbsent=${d.isAbsent} checkIn=${d.checkIn?d.checkIn.timestamp:'-'} checkOut=${d.checkOut?d.checkOut.timestamp:'-'}`);
    });
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
