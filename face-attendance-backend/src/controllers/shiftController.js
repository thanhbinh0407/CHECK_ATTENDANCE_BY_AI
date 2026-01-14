import { ShiftSetting } from "../models/pg/index.js";

export const createShift = async (req, res) => {
  try {
    const { startTime, endTime, gracePeriodMinutes, overtimeThresholdMinutes, note } = req.body;
    
    // Validate time format HH:MM
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({ status: 'error', message: 'Invalid time format. Use HH:MM' });
    }

    const s = await ShiftSetting.create({
      name: 'Company Working Hours',
      startTime,
      endTime,
      gracePeriodMinutes: gracePeriodMinutes || 5,
      overtimeThresholdMinutes: overtimeThresholdMinutes || 15,
      active: true,
      note: note || 'Company-wide working hours configuration'
    });
    return res.json({ status: 'success', shift: s });
  } catch (err) {
    console.error('Create shift failed', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, gracePeriodMinutes, overtimeThresholdMinutes, note } = req.body;
    
    const s = await ShiftSetting.findByPk(id);
    if (!s) return res.status(404).json({ status: 'error', message: 'Not found' });

    // Validate time format if provided
    if (startTime || endTime) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (startTime && !timeRegex.test(startTime)) {
        return res.status(400).json({ status: 'error', message: 'Invalid startTime format. Use HH:MM' });
      }
      if (endTime && !timeRegex.test(endTime)) {
        return res.status(400).json({ status: 'error', message: 'Invalid endTime format. Use HH:MM' });
      }
    }

    await s.update({
      startTime: startTime || s.startTime,
      endTime: endTime || s.endTime,
      gracePeriodMinutes: gracePeriodMinutes !== undefined ? gracePeriodMinutes : s.gracePeriodMinutes,
      overtimeThresholdMinutes: overtimeThresholdMinutes !== undefined ? overtimeThresholdMinutes : s.overtimeThresholdMinutes,
      note: note || s.note
    });
    return res.json({ status: 'success', shift: s });
  } catch (err) {
    console.error('Update shift failed', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getShifts = async (req, res) => {
  try {
    // Always return the active company-wide shift
    const list = await ShiftSetting.findAll({ 
      where: { active: true },
      order: [['id','DESC']],
      limit: 1
    });
    return res.json({ status: 'success', shifts: list });
  } catch (err) {
    console.error('Get shifts failed', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getShiftById = async (req, res) => {
  try {
    const { id } = req.params;
    const s = await ShiftSetting.findByPk(id);
    if (!s) return res.status(404).json({ status: 'error', message: 'Not found' });
    return res.json({ status: 'success', shift: s });
  } catch (err) {
    console.error('Get shift failed', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
