import mongoose from "mongoose";

const AttendanceLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  detectedName: String,
  timestamp: { type: Date, default: Date.now },
  confidence: Number,
  imageUrl: String,
  deviceId: String,
  matchDistance: Number,
  rawDescriptor: [Number]
});

export default mongoose.model("AttendanceLog", AttendanceLogSchema);
