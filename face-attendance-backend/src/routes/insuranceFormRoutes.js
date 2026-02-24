import express from 'express';
import {
  saveInsuranceForm,
  getInsuranceForm,
  getUserInsuranceForms
} from '../controllers/insuranceFormController.js';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Tất cả routes đều yêu cầu authentication và admin role
router.use(authMiddleware);
router.use(adminOnly);

// Lưu hoặc cập nhật form
router.post('/save', saveInsuranceForm);

// Lấy form theo userId và formType
router.get('/:userId/:formType', getInsuranceForm);

// Lấy tất cả form của một user
router.get('/user/:userId', getUserInsuranceForms);

export default router;

