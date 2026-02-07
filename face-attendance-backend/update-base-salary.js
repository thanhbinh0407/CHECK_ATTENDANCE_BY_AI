import sequelize from './src/db/sequelize.js';
import User from './src/models/pg/User.js';

(async () => {
  try {
    await sequelize.authenticate();
    console.log('🔄 Updating baseSalary for admin and accountant...');
    
    // Update admin user
    const admin = await User.findOne({ where: { role: 'admin' } });
    if (admin) {
      await admin.update({ baseSalary: 15000000 });
      console.log(`✅ Admin '${admin.name}' baseSalary updated to 15,000,000`);
    }
    
    // Update accountant user
    const accountant = await User.findOne({ where: { role: 'accountant' } });
    if (accountant) {
      await accountant.update({ baseSalary: 12000000 });
      console.log(`✅ Accountant '${accountant.name}' baseSalary updated to 12,000,000`);
    }
    
    console.log('\n📊 Verification:');
    const users = await User.findAll({ attributes: ['name', 'baseSalary', 'role'] });
    users.forEach(u => console.log(`  ${u.role.toUpperCase()}: ${u.name} - ${u.baseSalary}`));
    
    await sequelize.close();
    console.log('\n✨ Done!');
    process.exit(0);
  } catch(e) { 
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
