#!/usr/bin/env node
import sequelize from '../src/db/sequelize.js';
import { User, AttendanceLog } from '../src/models/pg/index.js';
import { Op } from 'sequelize';

const employeeCode = 'TP961';
const dates = [
  '2026-05-01','2026-05-04','2026-05-05','2026-05-06','2026-05-07','2026-05-08',
  '2026-05-11','2026-05-12','2026-05-13','2026-05-14','2026-05-15','2026-05-18',
  '2026-05-19','2026-05-20','2026-05-21','2026-05-22','2026-05-25','2026-05-26'
];

async function run() {
  try {
    await sequelize.authenticate();
    const user = await User.findOne({ where: { employeeCode } });
    if (!user) {
      console.error('User not found', employeeCode);
      process.exit(1);
    }
    console.log(`Found user ${user.name} id=${user.id} code=${user.employeeCode}`);

    let inserted = 0;
    for (const d of dates) {
      const start = new Date(`${d}T00:00:00+07:00`);
      const end = new Date(`${d}T23:59:59+07:00`);
      const exists = await AttendanceLog.findOne({
        where: {
          userId: user.id,
          timestamp: { [Op.between]: [start, end] },
          [Op.or]: [{ type: 'ABSENT' }, { isAbsent: true }]
        }
      });
      if (exists) {
        console.log(`${d} already has ABSENT record (id=${exists.id}) - skipping`);
        continue;
      }

      const ts = new Date(`${d}T12:00:00+07:00`);
      const rec = await AttendanceLog.create({
        userId: user.id,
        detectedName: user.name,
        confidence: null,
        matchDistance: null,
        type: 'ABSENT',
        note: 'Marked absent by admin (bulk)',
        isAbsent: true,
        isAuto: true,
        deviceId: 'admin-marked-absent',
        timestamp: ts
      });
      console.log(`Inserted ABSENT for ${d} id=${rec.id}`);
      inserted++;
    }

    console.log(`Done. Inserted ${inserted} new ABSENT rows.`);
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
