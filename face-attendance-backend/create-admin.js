import User from './src/models/pg/User.js';
import sequelize from './src/db/sequelize.js';
import bcrypt from 'bcryptjs';

try {
  await sequelize.authenticate();
  console.log("Database connected");

  // Hash password
  const hashedPassword = await bcrypt.hash("admin123", 10);

  // Create admin user
  const admin = await User.create({
    name: "Administrator",
    email: "admin@test.com",
    password: hashedPassword,
    employeeCode: "ADMIN001",
    role: "admin",
    isActive: true
  });

  console.log("Admin user created:");
  console.log(`  Email: ${admin.email}`);
  console.log(`  Password: admin123`);
  console.log(`  Role: ${admin.role}`);
  
} catch (err) {
  console.error("Error:", err.message);
} finally {
  await sequelize.close();
}
