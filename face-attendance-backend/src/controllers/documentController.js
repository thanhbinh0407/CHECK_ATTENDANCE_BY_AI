import Document from "../models/pg/Document.js";
import User from "../models/pg/User.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/documents';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `doc-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG, PNG) and PDF files are allowed'));
  }
}).single('document');

// Get all documents for an employee
export const getDocuments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { documentType } = req.query;

    const where = { userId };
    if (documentType) {
      where.documentType = documentType;
    }

    const documents = await Document.findAll({
      where,
      include: [
        { model: User, as: 'Uploader', attributes: ['id', 'name', 'email'] }
      ],
      order: [['uploadDate', 'DESC']]
    });

    return res.json({
      status: "success",
      documents
    });
  } catch (err) {
    console.error("Error fetching documents:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Upload document
export const uploadDocument = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        status: "error",
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No file uploaded"
      });
    }

    try {
      const { userId } = req.params;
      const { documentType, title, expiryDate, description, notes } = req.body;

      if (!documentType || !title) {
        return res.status(400).json({
          status: "error",
          message: "Document type and title are required"
        });
      }

      // Check if user exists
      const user = await User.findOne({ where: { id: userId, role: "employee" } });
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "Employee not found"
        });
      }

      const document = await Document.create({
        userId,
        documentType,
        title,
        documentPath: `/uploads/documents/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        expiryDate: expiryDate || null,
        description: description || null,
        notes: notes || null,
        uploadedBy: req.user.id
      });

      return res.json({
        status: "success",
        message: "Document uploaded successfully",
        document
      });
    } catch (error) {
      // Delete uploaded file if database insert fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error("Error uploading document:", error);
      return res.status(500).json({
        status: "error",
        message: error.message
      });
    }
  });
};

// Delete document
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({
        status: "error",
        message: "Document not found"
      });
    }

    // Delete file from filesystem
    if (document.documentPath && fs.existsSync(`.${document.documentPath}`)) {
      fs.unlinkSync(`.${document.documentPath}`);
    }

    await document.destroy();

    return res.json({
      status: "success",
      message: "Document deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting document:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Update document
export const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, expiryDate, description, notes, isActive } = req.body;

    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({
        status: "error",
        message: "Document not found"
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate || null;
    if (description !== undefined) updateData.description = description;
    if (notes !== undefined) updateData.notes = notes;
    if (isActive !== undefined) updateData.isActive = isActive;

    await document.update(updateData);

    return res.json({
      status: "success",
      message: "Document updated successfully",
      document
    });
  } catch (err) {
    console.error("Error updating document:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};



