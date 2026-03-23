import express from 'express';
import { createShift, updateShift, getShifts, getShiftById } from '../controllers/shiftController.js';
import { authMiddleware, hrOrManager } from '../middleware/authMiddleware.js';

const router = express.Router();

// Tất cả cần xác thực
router.use(authMiddleware);

// Đọc: tất cả (nhân viên cần xem ca làm việc)
router.get('/', getShifts);
router.get('/:id', getShiftById);

// Ghi: HR hoặc Manager mới được tạo/sửa ca
router.post('/', hrOrManager, createShift);
router.put('/:id', hrOrManager, updateShift);

export default router;
