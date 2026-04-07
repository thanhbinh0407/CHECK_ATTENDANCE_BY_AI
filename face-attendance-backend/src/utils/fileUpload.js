import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const qualificationsDir = path.join(uploadsDir, 'qualifications');
if (!fs.existsSync(qualificationsDir)) {
  fs.mkdirSync(qualificationsDir, { recursive: true });
}

const dependentsDir = path.join(uploadsDir, 'dependents');
if (!fs.existsSync(dependentsDir)) {
  fs.mkdirSync(dependentsDir, { recursive: true });
}

const avatarsDir = path.join(uploadsDir, 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, qualificationsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `qualification-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images and PDFs
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png) and PDF files are allowed'));
  }
};

export const uploadQualification = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

// Upload dependents documents (PDF only)
const dependentsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, dependentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `dependent-${uniqueSuffix}${ext}`);
  }
});

const dependentsFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isPdf = ext === ".pdf" && file.mimetype === "application/pdf";
  if (isPdf) cb(null, true);
  else cb(new Error("Only PDF files are allowed"));
};

export const uploadDependentDocuments = multer({
  storage: dependentsStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: dependentsFileFilter
});

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const uid = req.user?.userId ?? req.user?.id ?? "unknown";
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `user-${uid}-${Date.now()}${ext}`);
  }
});

const avatarFileFilter = (req, file, cb) => {
  const allowed = /\.(jpe?g|png|webp)$/i;
  const okMime = /^image\/(jpeg|png|webp)$/i.test(file.mimetype || "");
  if (allowed.test(file.originalname || "") && okMime) cb(null, true);
  else cb(new Error("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP"));
};

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: avatarFileFilter
});

// Helper to get file URL
export const getFileUrl = (filename) => {
  if (!filename) return null;
  return `/uploads/qualifications/${filename}`;
};

export const getDependentFileUrl = (filename) => {
  if (!filename) return null;
  return `/uploads/dependents/${filename}`;
};

// Helper to delete file
export const deleteFile = (filename) => {
  if (!filename) return;
  const filePath = path.join(qualificationsDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export const deleteDependentFile = (filename) => {
  if (!filename) return;
  const filePath = path.join(dependentsDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

/** Xóa file avatar cũ trên đĩa nếu là đường dẫn local /uploads/avatars/... */
export const removeAvatarFileIfLocal = (avatarUrl) => {
  if (!avatarUrl || typeof avatarUrl !== "string") return;
  if (!avatarUrl.startsWith("/uploads/avatars/")) return;
  const name = path.basename(avatarUrl);
  const filePath = path.join(avatarsDir, name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

