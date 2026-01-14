import sequelize from './src/db/sequelize.js';
import { User, FaceProfile, AttendanceLog } from './src/models/pg/index.js';

async function seedPG() {
  try {
    console.log('🌱 Seeding PostgreSQL 17...');
    
    // Sync database
    await sequelize.sync({ force: true });
    console.log('Database synced');

    // Create sample users
    const user1 = await User.create({
      name: 'Nguyễn Văn A',
      email: 'a@example.com',
      employeeCode: 'E001',
      role: 'employee'
    });

    const user2 = await User.create({
      name: 'Lê Thị B',
      email: 'b@example.com',
      employeeCode: 'E002',
      role: 'employee'
    });

    const user3 = await User.create({
      name: 'Trần Minh C',
      email: 'c@example.com',
      employeeCode: 'E003',
      role: 'manager'
    });

    console.log('Created 3 users');

    // Create mock face profiles
    const mockDescriptor = Array(128).fill(0).map(() => Math.random() - 0.5);

    await FaceProfile.bulkCreate([
      { userId: user1.id, embeddings: mockDescriptor, imageUrl: '/images/user1.jpg' },
      { userId: user2.id, embeddings: mockDescriptor, imageUrl: '/images/user2.jpg' },
      { userId: user3.id, embeddings: mockDescriptor, imageUrl: '/images/user3.jpg' }
    ]);

    console.log('Created 3 face profiles');

    // Create attendance logs
    await AttendanceLog.create({
      userId: user1.id,
      detectedName: user1.name,
      confidence: 0.95,
      matchDistance: 0.3,
      deviceId: 'kiosk-1',
      timestamp: new Date()
    });

    await AttendanceLog.create({
      userId: user2.id,
      detectedName: user2.name,
      confidence: 0.92,
      matchDistance: 0.35,
      deviceId: 'kiosk-1',
      timestamp: new Date()
    });

    console.log('Created attendance logs');
    console.log('PostgreSQL 17 seeding completed!');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err.message);
    process.exit(1);
  }
}

seedPG();
