import { ShiftSetting } from '../src/models/pg/index.js';

const run = async () => {
  try {
    const s = await ShiftSetting.create({
      name: 'Default Dec 2025',
      month: '2025-12',
      rules: { weekdays: { Mon: { start: '08:00', end: '17:00' }, Tue: { start: '08:00', end: '17:00' } }, notes: 'Default working hours' },
      active: true,
      note: 'Auto-generated sample'
    });
    console.log('Created sample shift', s.id);
    process.exit(0);
  } catch (e) {
    console.error('Failed to create sample shift', e.message);
    process.exit(2);
  }
};

run();
