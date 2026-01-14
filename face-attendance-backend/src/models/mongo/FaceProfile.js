import mongoose from "mongoose";

const FaceProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  embeddings: { type: [Number], required: true }, // single descriptor or average
  modelVersion: String,
  enrollImageUrl: String,
  meta: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("FaceProfile", FaceProfileSchema);
