import express from 'express';
import {
  saveInsuranceForm,
  getInsuranceForm,
  getUserInsuranceForms
} from '../controllers/insuranceFormController.js';
import { authMiddleware, accountantOrManager } from '../middleware/authMiddleware.js';

const router = express.Router();

// Kế toán hoặc Manager quản lý biểu mẫu bảo hiểm
router.use(authMiddleware);
router.use(accountantOrManager);

router.post('/save', saveInsuranceForm);
router.get('/:userId/:formType', getInsuranceForm);
router.get('/user/:userId', getUserInsuranceForms);

export default router;

