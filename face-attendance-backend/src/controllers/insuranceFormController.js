import InsuranceForm from '../models/pg/InsuranceForm.js';
import User from '../models/pg/User.js';

/**
 * Lưu hoặc cập nhật dữ liệu form BHXH/BHYT
 */
export const saveInsuranceForm = async (req, res) => {
  try {
    const { userId, formType, formData } = req.body;

    if (!userId || !formType || !formData) {
      return res.status(400).json({
        status: 'error',
        message: 'Thiếu thông tin bắt buộc: userId, formType, formData'
      });
    }

    if (!['TK1_TS', 'D02_LT'].includes(formType)) {
      return res.status(400).json({
        status: 'error',
        message: 'formType phải là TK1_TS hoặc D02_LT'
      });
    }

    // Kiểm tra user tồn tại
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy nhân viên'
      });
    }

    // Tìm form hiện có hoặc tạo mới
    const [form, created] = await InsuranceForm.findOrCreate({
      where: { userId, formType },
      defaults: {
        userId,
        formType,
        formData,
        version: 1
      }
    });

    if (!created) {
      // Cập nhật form hiện có
      form.formData = formData;
      form.version += 1;
      await form.save();
    }

    return res.json({
      status: 'success',
      message: created ? 'Đã lưu form thành công' : 'Đã cập nhật form thành công',
      data: {
        id: form.id,
        userId: form.userId,
        formType: form.formType,
        version: form.version,
        updatedAt: form.updatedAt
      }
    });
  } catch (error) {
    console.error('[BACKEND] Error saving insurance form:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi khi lưu form: ' + error.message
    });
  }
};

/**
 * Lấy dữ liệu form theo userId và formType
 */
export const getInsuranceForm = async (req, res) => {
  try {
    const { userId, formType } = req.params;

    if (!userId || !formType) {
      return res.status(400).json({
        status: 'error',
        message: 'Thiếu thông tin: userId và formType'
      });
    }

    if (!['TK1_TS', 'D02_LT'].includes(formType)) {
      return res.status(400).json({
        status: 'error',
        message: 'formType phải là TK1_TS hoặc D02_LT'
      });
    }

    const form = await InsuranceForm.findOne({
      where: { userId, formType },
      include: [{
        model: User,
        attributes: ['id', 'name', 'employeeCode', 'email']
      }]
    });

    if (!form) {
      return res.json({
        status: 'success',
        message: 'Chưa có dữ liệu form',
        data: null
      });
    }

    return res.json({
      status: 'success',
      data: {
        id: form.id,
        userId: form.userId,
        formType: form.formType,
        formData: form.formData,
        version: form.version,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
        user: form.User
      }
    });
  } catch (error) {
    console.error('[BACKEND] Error getting insurance form:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi khi lấy form: ' + error.message
    });
  }
};

/**
 * Lấy tất cả form của một user
 */
export const getUserInsuranceForms = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'Thiếu userId'
      });
    }

    const forms = await InsuranceForm.findAll({
      where: { userId },
      order: [['updatedAt', 'DESC']]
    });

    return res.json({
      status: 'success',
      data: forms
    });
  } catch (error) {
    console.error('[BACKEND] Error getting user insurance forms:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi khi lấy danh sách form: ' + error.message
    });
  }
};

