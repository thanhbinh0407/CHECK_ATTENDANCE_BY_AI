import express from 'express';
import { createShift, updateShift, getShifts, getShiftById } from '../controllers/shiftController.js';

const router = express.Router();

router.post('/', createShift);
router.get('/', getShifts);
router.get('/:id', getShiftById);
router.put('/:id', updateShift);

export default router;
