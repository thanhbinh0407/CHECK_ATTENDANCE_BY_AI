#!/usr/bin/env node
import sequelize from './src/db/sequelize.js';
import { User, AttendanceLog } from './src/models/pg/index.js';
import { Op } from 'sequelize';

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    const name = 'Thanh Binh';
    const users = await User.findAll({ where: { name: { [Op.iLike]: name } }, attributes: ['id','name','employeeCode'] });
    if (!users || users.length === 0) {
      console.log('No user found with name:', name);
      await sequelize.close();
      process.exit(0);
    }

    for (const u of users) {
      console.log(`\nUser: ${u.name} (id=${u.id}, code=${u.employeeCode})`);
      const from = new Date('2026-04-30'); from.setHours(0,0,0,0);
      const to = new Date('2026-05-28'); to.setHours(23,59,59,999);

      const rows = await AttendanceLog.findAll({
        where: {
          userId: u.id,
          timestamp: { [Op.between]: [from, to] },
          [Op.or]: [ { type: 'ABSENT' }, { isAbsent: true } ]
        },
        order: [['timestamp','ASC']]
      });

      console.log(`Found ${rows.length} ABSENT-type records for date range 2026-04-30 -> 2026-05-28`);
      for (const r of rows) {
        console.log(` - id=${r.id} date=${r.timestamp?.toISOString?.() || r.timestamp} type=${r.type} isAbsent=${r.isAbsent}`);
      }
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
