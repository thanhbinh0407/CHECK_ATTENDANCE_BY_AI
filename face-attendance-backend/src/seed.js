import mongoose from "mongoose";
import connectMongo from "./db/mongo.js";
import User from "./models/mongo/User.js";
import FaceProfile from "./models/mongo/FaceProfile.js";
import AttendanceLog from "./models/mongo/AttendanceLog.js";

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/facedb";

try {
  await connectMongo(uri);
  
  console.log("🌱 Seeding database...");

  // Clear existing data
  await User.deleteMany({});
  await FaceProfile.deleteMany({});
  await AttendanceLog.deleteMany({});
  console.log("Cleared existing data");

  // Create sample users
  const user1 = await User.create({ 
    name: "Nguyễn Văn A", 
    email: "a@example.com", 
    employeeCode: "E001", 
    role: "employee",
    consent: true
  });
  
  const user2 = await User.create({ 
    name: "Lê Thị B", 
    email: "b@example.com", 
    employeeCode: "E002", 
    role: "employee",
    consent: true
  });
  
  const user3 = await User.create({ 
    name: "Trần Minh C", 
    email: "c@example.com", 
    employeeCode: "E003", 
    role: "admin",
    consent: true
  });
  
  console.log("Created 3 sample users");

  // Create sample face profiles with random descriptors (128-dimensional vectors)
  const createMockDescriptor = () => {
    return Array.from({ length: 128 }, () => Math.random() * 2 - 1);
  };

  const profile1 = await FaceProfile.create({
    user: user1._id,
    embeddings: createMockDescriptor(),
    modelVersion: "v1.0",
    enrollImageUrl: null,
    meta: { enrolledAt: new Date() }
  });

  const profile2 = await FaceProfile.create({
    user: user2._id,
    embeddings: createMockDescriptor(),
    modelVersion: "v1.0",
    enrollImageUrl: null,
    meta: { enrolledAt: new Date() }
  });

  const profile3 = await FaceProfile.create({
    user: user3._id,
    embeddings: createMockDescriptor(),
    modelVersion: "v1.0",
    enrollImageUrl: null,
    meta: { enrolledAt: new Date() }
  });

  console.log("Created 3 sample face profiles");

  // Create sample attendance logs
  await AttendanceLog.create({
    user: user1._id,
    detectedName: "Nguyễn Văn A",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    confidence: 0.95,
    imageUrl: null,
    deviceId: "web-kiosk-1",
    matchDistance: 0.35,
    rawDescriptor: createMockDescriptor()
  });

  await AttendanceLog.create({
    user: user2._id,
    detectedName: "Lê Thị B",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    confidence: 0.92,
    imageUrl: null,
    deviceId: "web-kiosk-1",
    matchDistance: 0.42,
    rawDescriptor: createMockDescriptor()
  });

  console.log("Created sample attendance logs");

  console.log("\n📊 Database seeded successfully!");
  console.log("Users:");
  console.log("  - Nguyễn Văn A (E001)");
  console.log("  - Lê Thị B (E002)");
  console.log("  - Trần Minh C (E003)");
  console.log("\n🎯 You can now test the face recognition system!");

  process.exit(0);
} catch (err) {
  console.error("Seed error:", err);
  process.exit(1);
}
