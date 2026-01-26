import mongoose from "mongoose";

export default async function connectMongo(uri) {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connect error:", err.message);
    console.log("Continuing without MongoDB...");
  }
}
