/**
 * Payroll Controller
 * Business logic for payroll management
 * 
 * Author: Senior Development Team
 * Version: 2.0
 * Date: 25-01-2026
 */

const {
  Payroll, PayrollDetail, PayrollComponent, SalaryPolicy,
  User, Department, JobTitle, Attendance, sequelize
} = require('../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * PAYROLL CRUD OPERATIONS
 */

/**
 * Get all payrolls with filtering and pagination
 * Query params: month, year, status, policyId, userId, page, limit
 */
exports.getAllPayrolls = async (req, res) => {
  try {
    const { month, year, status, policyId, userId, page = 1, limit = 20 } = req.query;
    
    const where = {};
    if (month) where.month = month;
    if (year) where.year = year;
    if (status) where.status = status;
    if (policyId) where.salaryPolicyId = policyId;
    if (userId) where.userId = userId;
    
    const payrolls = await Payroll.findAndCountAll({
      where,
      include: [
        { model: User, attributes: ['id', 'fullName', 'employeeCode'] },
        { model: SalaryPolicy, attributes: ['id', 'name', 'code'] },
      ],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      order: [['year', 'DESC'], ['month', 'DESC'], ['createdAt', 'DESC']],
    });
    
    res.json({
      success: true,
      data: payrolls.rows,
      pagination: {
        total: payrolls.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(payrolls.count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách bảng lương',
      error: error.message,
    });
  }
};

/**
 * Get payroll by ID with all details and components
 */
exports.getPayrollById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payroll = await Payroll.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['id', 'fullName', 'employeeCode', 'email', 'departmentId'],
          include: [{ model: Department, attributes: ['id', 'name'] }],
        },
        {
          model: SalaryPolicy,
          attributes: ['id', 'name', 'code', 'baseSalaryPerDay', 'overtimeRate'],
        },
        {
          model: PayrollDetail,
          include: [
            {
              model: PayrollComponent,
              attributes: ['id', 'code', 'name', 'type', 'category'],
            },
          ],
        },
      ],
    });
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng lương',
      });
    }
    
    res.json({
      success: true,
      data: payroll,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết bảng lương',
      error: error.message,
    });
  }
};

/**
 * Create new payroll (Draft status)
 * Body: userId, year, month, salaryPolicyId, workingDaysBase, etc.
 */
exports.createPayroll = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      userId,
      year,
      month,
      salaryPolicyId,
      workingDaysBase,
      workingDaysHoliday,
      workingDaysSunday,
      overtimeDaysBase,
      overtimeDaysHoliday,
      overtimeDaysSunday,
      annualLeaveDays,
    } = req.body;
    
    // Check unique constraint: one payroll per employee per month
    const existingPayroll = await Payroll.findOne({
      where: { userId, year, month },
      transaction,
    });
    
    if (existingPayroll) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Nhân viên ${userId} đã có bảng lương cho tháng ${month}/${year}`,
      });
    }
    
    // Get salary policy to use base salary
    const salaryPolicy = await SalaryPolicy.findByPk(salaryPolicyId, { transaction });
    if (!salaryPolicy) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chính sách lương',
      });
    }
    
    // Create payroll in Draft status
    const payroll = await Payroll.create(
      {
        userId,
        year,
        month,
        salaryPolicyId,
        workingDaysBase: workingDaysBase || 0,
        workingDaysHoliday: workingDaysHoliday || 0,
        workingDaysSunday: workingDaysSunday || 0,
        overtimeDaysBase: overtimeDaysBase || 0,
        overtimeDaysHoliday: overtimeDaysHoliday || 0,
        overtimeDaysSunday: overtimeDaysSunday || 0,
        annualLeaveDays: annualLeaveDays || 0,
        status: 'draft',
        totalIncome: 0,
        totalDeduction: 0,
        netSalary: 0,
      },
      { transaction }
    );
    
    // Auto-calculate components based on salary policy
    await exports.autoCalculatePayrollComponents(
      payroll.id,
      salaryPolicy,
      workingDaysBase,
      workingDaysHoliday,
      workingDaysSunday,
      overtimeDaysBase,
      overtimeDaysHoliday,
      overtimeDaysSunday,
      annualLeaveDays,
      transaction
    );
    
    // Recalculate totals
    await exports.recalculatePayrollTotals(payroll.id, transaction);
    
    await transaction.commit();
    
    // Fetch and return complete payroll
    const newPayroll = await Payroll.findByPk(payroll.id, {
      include: [
        { model: User, attributes: ['id', 'fullName', 'employeeCode'] },
        { model: SalaryPolicy, attributes: ['id', 'name', 'code'] },
        {
          model: PayrollDetail,
          include: [
            {
              model: PayrollComponent,
              attributes: ['id', 'code', 'name', 'type', 'category'],
            },
          ],
        },
      ],
    });
    
    res.status(201).json({
      success: true,
      message: 'Tạo bảng lương thành công',
      data: newPayroll,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo bảng lương',
      error: error.message,
    });
  }
};

/**
 * Update payroll (only Draft status)
 */
exports.updatePayroll = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const {
      workingDaysBase,
      workingDaysHoliday,
      workingDaysSunday,
      overtimeDaysBase,
      overtimeDaysHoliday,
      overtimeDaysSunday,
      annualLeaveDays,
    } = req.body;
    
    const payroll = await Payroll.findByPk(id, { transaction });
    
    if (!payroll) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng lương',
      });
    }
    
    // Can only edit Draft status
    if (payroll.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Không thể sửa bảng lương ở trạng thái ${payroll.status}`,
      });
    }
    
    // Update working days
    await payroll.update(
      {
        workingDaysBase: workingDaysBase ?? payroll.workingDaysBase,
        workingDaysHoliday: workingDaysHoliday ?? payroll.workingDaysHoliday,
        workingDaysSunday: workingDaysSunday ?? payroll.workingDaysSunday,
        overtimeDaysBase: overtimeDaysBase ?? payroll.overtimeDaysBase,
        overtimeDaysHoliday: overtimeDaysHoliday ?? payroll.overtimeDaysHoliday,
        overtimeDaysSunday: overtimeDaysSunday ?? payroll.overtimeDaysSunday,
        annualLeaveDays: annualLeaveDays ?? payroll.annualLeaveDays,
      },
      { transaction }
    );
    
    // Recalculate totals
    await exports.recalculatePayrollTotals(id, transaction);
    
    await transaction.commit();
    
    const updatedPayroll = await Payroll.findByPk(id, {
      include: [
        { model: User, attributes: ['id', 'fullName', 'employeeCode'] },
        { model: SalaryPolicy, attributes: ['id', 'name', 'code'] },
      ],
    });
    
    res.json({
      success: true,
      message: 'Cập nhật bảng lương thành công',
      data: updatedPayroll,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật bảng lương',
      error: error.message,
    });
  }
};

/**
 * Submit payroll for approval (Draft → Pending)
 */
exports.submitPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payroll = await Payroll.findByPk(id);
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng lương',
      });
    }
    
    if (payroll.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể gửi duyệt bảng lương ở trạng thái Draft',
      });
    }
    
    await payroll.update({ status: 'pending_approval' });
    
    res.json({
      success: true,
      message: 'Gửi duyệt bảng lương thành công',
      data: payroll,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi duyệt bảng lương',
      error: error.message,
    });
  }
};

/**
 * Approve payroll (Pending → Approved)
 */
exports.approvePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { approverId } = req.body; // Manager/Admin ID
    
    const payroll = await Payroll.findByPk(id);
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng lương',
      });
    }
    
    if (payroll.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể phê duyệt bảng lương ở trạng thái Pending',
      });
    }
    
    await payroll.update({
      status: 'approved',
      approvedBy: approverId,
      approvedAt: new Date(),
    });
    
    res.json({
      success: true,
      message: 'Phê duyệt bảng lương thành công',
      data: payroll,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi phê duyệt bảng lương',
      error: error.message,
    });
  }
};

/**
 * Reject payroll with reason (Pending → Draft)
 */
exports.rejectPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    const payroll = await Payroll.findByPk(id);
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng lương',
      });
    }
    
    if (payroll.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể từ chối bảng lương ở trạng thái Pending',
      });
    }
    
    await payroll.update({
      status: 'draft',
      rejectionReason: rejectionReason || '',
    });
    
    res.json({
      success: true,
      message: 'Từ chối bảng lương thành công',
      data: payroll,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi từ chối bảng lương',
      error: error.message,
    });
  }
};

/**
 * Mark payroll as paid (Approved → Paid)
 */
exports.markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { bankTransactionId, paidDate } = req.body;
    
    const payroll = await Payroll.findByPk(id);
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng lương',
      });
    }
    
    if (payroll.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể thanh toán bảng lương ở trạng thái Approved',
      });
    }
    
    await payroll.update({
      status: 'paid',
      paidAt: paidDate || new Date(),
      bankTransactionId: bankTransactionId || null,
    });
    
    res.json({
      success: true,
      message: 'Đánh dấu thanh toán thành công',
      data: payroll,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đánh dấu thanh toán',
      error: error.message,
    });
  }
};

/**
 * Delete payroll (only Draft status)
 */
exports.deletePayroll = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    const payroll = await Payroll.findByPk(id, { transaction });
    
    if (!payroll) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng lương',
      });
    }
    
    if (payroll.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể xóa bảng lương ở trạng thái Draft',
      });
    }
    
    // Delete all payroll details
    await PayrollDetail.destroy({
      where: { payrollId: id },
      transaction,
    });
    
    // Delete payroll
    await payroll.destroy({ transaction });
    
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Xóa bảng lương thành công',
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa bảng lương',
      error: error.message,
    });
  }
};

/**
 * Bulk approve payrolls
 */
exports.bulkApprovePayrolls = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { payrollIds, approverId } = req.body;
    
    const approvedCount = await Payroll.update(
      {
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
      },
      {
        where: {
          id: payrollIds,
          status: 'pending_approval',
        },
        transaction,
      }
    );
    
    await transaction.commit();
    
    res.json({
      success: true,
      message: `Phê duyệt ${approvedCount[0]} bảng lương thành công`,
      data: { approvedCount: approvedCount[0] },
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: 'Lỗi khi phê duyệt hàng loạt',
      error: error.message,
    });
  }
};

/**
 * Get payroll details (components with amounts)
 */
exports.getPayrollDetails = async (req, res) => {
  try {
    const { payrollId } = req.params;
    
    const details = await PayrollDetail.findAll({
      where: { payrollId },
      include: [
        {
          model: PayrollComponent,
          attributes: ['id', 'code', 'name', 'type', 'category', 'calculationMethod'],
        },
      ],
      order: [['payrollComponentId', 'ASC']],
    });
    
    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết bảng lương',
      error: error.message,
    });
  }
};

/**
 * Update single payroll detail/component
 */
exports.updatePayrollDetail = async (req, res) => {
  try {
    const { payrollId, detailId } = req.params;
    const { quantity, unitAmount, amount, editReason } = req.body;
    
    const detail = await PayrollDetail.findOne({
      where: { id: detailId, payrollId },
    });
    
    if (!detail) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chi tiết lương',
      });
    }
    
    // Check payroll status - only allow editing if Draft
    const payroll = await Payroll.findByPk(payrollId);
    if (payroll.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể sửa chi tiết lương ở trạng thái Draft',
      });
    }
    
    await detail.update({
      quantity: quantity ?? detail.quantity,
      unitAmount: unitAmount ?? detail.unitAmount,
      amount: amount ?? detail.amount,
      isEdited: true,
      editedReason: editReason || '',
    });
    
    // Recalculate payroll totals
    await exports.recalculatePayrollTotals(payrollId);
    
    res.json({
      success: true,
      message: 'Cập nhật chi tiết lương thành công',
      data: detail,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật chi tiết lương',
      error: error.message,
    });
  }
};

/**
 * SALARY POLICY OPERATIONS
 */

/**
 * Get all salary policies
 */
exports.getAllSalaryPolicies = async (req, res) => {
  try {
    const policies = await SalaryPolicy.findAll({
      where: { isActive: true },
      order: [['createdAt', 'ASC']],
    });
    
    res.json({
      success: true,
      data: policies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách chính sách lương',
      error: error.message,
    });
  }
};

/**
 * Get salary policy by ID
 */
exports.getSalaryPolicyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const policy = await SalaryPolicy.findByPk(id);
    
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chính sách lương',
      });
    }
    
    res.json({
      success: true,
      data: policy,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết chính sách lương',
      error: error.message,
    });
  }
};

/**
 * Create new salary policy
 */
exports.createSalaryPolicy = async (req, res) => {
  try {
    const {
      code,
      name,
      shiftType,
      contractType,
      baseSalaryPerDay,
      overtimeRate,
      holidayRate,
      holidayOvertimeRate,
      sundayRate,
      sundayOvertimeRate,
      nightShiftBonus,
    } = req.body;
    
    const policy = await SalaryPolicy.create({
      code,
      name,
      shiftType,
      contractType,
      baseSalaryPerDay,
      overtimeRate,
      holidayRate,
      holidayOvertimeRate,
      sundayRate,
      sundayOvertimeRate,
      nightShiftBonus,
      isActive: true,
    });
    
    res.status(201).json({
      success: true,
      message: 'Tạo chính sách lương thành công',
      data: policy,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo chính sách lương',
      error: error.message,
    });
  }
};

/**
 * Update salary policy
 */
exports.updateSalaryPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const policy = await SalaryPolicy.findByPk(id);
    
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chính sách lương',
      });
    }
    
    await policy.update(updateData);
    
    res.json({
      success: true,
      message: 'Cập nhật chính sách lương thành công',
      data: policy,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật chính sách lương',
      error: error.message,
    });
  }
};

/**
 * Deactivate salary policy
 */
exports.deactivateSalaryPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    
    const policy = await SalaryPolicy.findByPk(id);
    
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chính sách lương',
      });
    }
    
    await policy.update({ isActive: false });
    
    res.json({
      success: true,
      message: 'Tắt chính sách lương thành công',
      data: policy,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tắt chính sách lương',
      error: error.message,
    });
  }
};

/**
 * PAYROLL COMPONENT OPERATIONS
 */

/**
 * Get all payroll components
 */
exports.getAllPayrollComponents = async (req, res) => {
  try {
    const components = await PayrollComponent.findAll({
      where: { isActive: true },
      order: [['displayOrder', 'ASC']],
    });
    
    res.json({
      success: true,
      data: components,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách thành phần lương',
      error: error.message,
    });
  }
};

/**
 * Get components filtered by type (income/deduction)
 */
exports.getComponentsByType = async (req, res) => {
  try {
    const { type } = req.params;
    
    const components = await PayrollComponent.findAll({
      where: { type, isActive: true },
      order: [['displayOrder', 'ASC']],
    });
    
    res.json({
      success: true,
      data: components,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thành phần lương',
      error: error.message,
    });
  }
};

/**
 * Get payroll component by ID
 */
exports.getPayrollComponentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const component = await PayrollComponent.findByPk(id);
    
    if (!component) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thành phần lương',
      });
    }
    
    res.json({
      success: true,
      data: component,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết thành phần lương',
      error: error.message,
    });
  }
};

/**
 * Create new payroll component
 */
exports.createPayrollComponent = async (req, res) => {
  try {
    const {
      code,
      name,
      type,
      category,
      calculationMethod,
      defaultValue,
      isRequired,
      isEditable,
      displayOrder,
    } = req.body;
    
    const component = await PayrollComponent.create({
      code,
      name,
      type,
      category,
      calculationMethod,
      defaultValue,
      isRequired,
      isEditable,
      displayOrder,
      isActive: true,
    });
    
    res.status(201).json({
      success: true,
      message: 'Tạo thành phần lương thành công',
      data: component,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo thành phần lương',
      error: error.message,
    });
  }
};

/**
 * Update payroll component
 */
exports.updatePayrollComponent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const component = await PayrollComponent.findByPk(id);
    
    if (!component) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thành phần lương',
      });
    }
    
    await component.update(updateData);
    
    res.json({
      success: true,
      message: 'Cập nhật thành phần lương thành công',
      data: component,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật thành phần lương',
      error: error.message,
    });
  }
};

/**
 * Deactivate payroll component
 */
exports.deactivatePayrollComponent = async (req, res) => {
  try {
    const { id } = req.params;
    
    const component = await PayrollComponent.findByPk(id);
    
    if (!component) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thành phần lương',
      });
    }
    
    await component.update({ isActive: false });
    
    res.json({
      success: true,
      message: 'Tắt thành phần lương thành công',
      data: component,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tắt thành phần lương',
      error: error.message,
    });
  }
};

/**
 * REPORTS & ANALYTICS
 */

/**
 * Get monthly payroll summary
 */
exports.getMonthlyPayrollSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    const summary = await Payroll.findAll({
      where: {
        month: parseInt(month),
        year: parseInt(year),
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalIncome')), 'totalIncome'],
        [sequelize.fn('SUM', sequelize.col('totalDeduction')), 'totalDeduction'],
        [sequelize.fn('SUM', sequelize.col('netSalary')), 'netSalary'],
      ],
      group: ['status'],
      raw: true,
    });
    
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy tóm tắt bảng lương tháng',
      error: error.message,
    });
  }
};

/**
 * Get employee payroll history
 */
exports.getEmployeePayrollHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 12 } = req.query;
    
    const history = await Payroll.findAll({
      where: { userId },
      include: [
        { model: SalaryPolicy, attributes: ['name', 'code'] },
      ],
      order: [['year', 'DESC'], ['month', 'DESC']],
      limit: parseInt(limit),
    });
    
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử bảng lương',
      error: error.message,
    });
  }
};

/**
 * Get payroll statistics
 */
exports.getPayrollStatistics = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    const stats = await sequelize.query(`
      SELECT
        COUNT(DISTINCT p.id) as total_payrolls,
        COUNT(CASE WHEN p.status = 'draft' THEN 1 END) as draft_count,
        COUNT(CASE WHEN p.status = 'pending_approval' THEN 1 END) as pending_count,
        COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN p.status = 'paid' THEN 1 END) as paid_count,
        SUM(p.total_income) as total_income,
        SUM(p.total_deduction) as total_deduction,
        SUM(p.net_salary) as total_net_salary,
        AVG(p.net_salary) as avg_salary
      FROM payrolls p
      WHERE EXTRACT(MONTH FROM p.created_at) = :month
        AND EXTRACT(YEAR FROM p.created_at) = :year
    `, {
      replacements: { month: parseInt(month), year: parseInt(year) },
      type: sequelize.QueryTypes.SELECT,
    });
    
    res.json({
      success: true,
      data: stats[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê bảng lương',
      error: error.message,
    });
  }
};

/**
 * Export payroll data to Excel
 */
exports.exportToExcel = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    const payrolls = await Payroll.findAll({
      where: {
        month: parseInt(month),
        year: parseInt(year),
      },
      include: [
        { model: User, attributes: ['fullName', 'employeeCode'] },
        { model: SalaryPolicy, attributes: ['name'] },
      ],
      order: [['createdAt', 'ASC']],
    });
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payroll');
    
    // Add headers
    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 5 },
      { header: 'Mã NV', key: 'employeeCode', width: 12 },
      { header: 'Họ Tên', key: 'fullName', width: 25 },
      { header: 'Chính Sách', key: 'policyName', width: 20 },
      { header: 'Tổng Thu Nhập', key: 'totalIncome', width: 15 },
      { header: 'Tổng Khấu Trừ', key: 'totalDeduction', width: 15 },
      { header: 'Lương Thực', key: 'netSalary', width: 15 },
      { header: 'Trạng Thái', key: 'status', width: 15 },
    ];
    
    // Add data rows
    payrolls.forEach((payroll, index) => {
      worksheet.addRow({
        stt: index + 1,
        employeeCode: payroll.User?.employeeCode,
        fullName: payroll.User?.fullName,
        policyName: payroll.SalaryPolicy?.name,
        totalIncome: payroll.totalIncome,
        totalDeduction: payroll.totalDeduction,
        netSalary: payroll.netSalary,
        status: payroll.status,
      });
    });
    
    // Format currency columns
    worksheet.getColumn('totalIncome').numFmt = '#,##0';
    worksheet.getColumn('totalDeduction').numFmt = '#,##0';
    worksheet.getColumn('netSalary').numFmt = '#,##0';
    
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payroll_${month}_${year}.xlsx"`
    );
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xuất Excel',
      error: error.message,
    });
  }
};

/**
 * Export payslip to PDF
 */
exports.exportPayslipToPDF = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payroll = await Payroll.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['fullName', 'employeeCode', 'email'],
          include: [{ model: Department, attributes: ['name'] }],
        },
        {
          model: SalaryPolicy,
          attributes: ['name', 'code'],
        },
        {
          model: PayrollDetail,
          include: [
            {
              model: PayrollComponent,
              attributes: ['name', 'type'],
            },
          ],
        },
      ],
    });
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bảng lương',
      });
    }
    
    // Create PDF document
    const doc = new PDFDocument();
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payslip_${payroll.User.employeeCode}_${payroll.month}_${payroll.year}.pdf"`
    );
    
    doc.pipe(res);
    
    // Title
    doc.fontSize(16).font('Courier').text('PHIẾU TÍNH LƯƠNG', 'center');
    doc.fontSize(10).text(`Tháng ${payroll.month}/${payroll.year}`, 'center');
    
    doc.moveDown();
    
    // Employee info
    doc.fontSize(10);
    doc.text(`Nhân viên: ${payroll.User.fullName}`);
    doc.text(`Mã NV: ${payroll.User.employeeCode}`);
    doc.text(`Phòng ban: ${payroll.User.Department?.name || 'N/A'}`);
    doc.text(`Chính sách: ${payroll.SalaryPolicy.name}`);
    
    doc.moveDown();
    
    // Income details
    doc.fontSize(11).font('Courier-Bold').text('THU NHẬP:', 'left');
    doc.fontSize(10).font('Courier');
    
    let incomeTotal = 0;
    payroll.PayrollDetails.forEach((detail) => {
      if (detail.PayrollComponent.type === 'income') {
        doc.text(`${detail.PayrollComponent.name}: ${detail.amount}`);
        incomeTotal += detail.amount;
      }
    });
    
    doc.text(`TỔNG THU NHẬP: ${incomeTotal}`, { underline: true });
    
    doc.moveDown();
    
    // Deduction details
    doc.fontSize(11).font('Courier-Bold').text('KHẤU TRỪ:', 'left');
    doc.fontSize(10).font('Courier');
    
    let deductionTotal = 0;
    payroll.PayrollDetails.forEach((detail) => {
      if (detail.PayrollComponent.type === 'deduction') {
        doc.text(`${detail.PayrollComponent.name}: ${detail.amount}`);
        deductionTotal += detail.amount;
      }
    });
    
    doc.text(`TỔNG KHẤU TRỪ: ${deductionTotal}`, { underline: true });
    
    doc.moveDown();
    
    // Summary
    doc.fontSize(12).font('Courier-Bold');
    doc.text(`LƯƠNG THỰC LĨNH: ${payroll.netSalary} VNĐ`, {
      underline: true,
      align: 'center',
    });
    
    doc.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xuất PDF',
      error: error.message,
    });
  }
};

/**
 * Get audit trail for a payroll
 */
exports.getAuditTrail = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Note: This assumes you have an AuditLog model
    // Implementation depends on your audit logging strategy
    
    res.json({
      success: true,
      data: [],
      message: 'Audit trail functionality to be implemented',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy audit trail',
      error: error.message,
    });
  }
};

/**
 * CALCULATION HELPERS
 */

/**
 * Auto-calculate payroll components based on salary policy
 */
exports.autoCalculatePayrollComponents = async (
  payrollId,
  salaryPolicy,
  workingDaysBase,
  workingDaysHoliday,
  workingDaysSunday,
  overtimeDaysBase,
  overtimeDaysHoliday,
  overtimeDaysSunday,
  annualLeaveDays,
  transaction
) => {
  try {
    const components = await PayrollComponent.findAll({
      where: { isActive: true },
      transaction,
    });
    
    const details = [];
    
    for (const component of components) {
      let amount = 0;
      
      // Calculate based on component type and calculation method
      switch (component.calculationMethod) {
        case 'fixed_amount':
          amount = component.defaultValue || 0;
          break;
          
        case 'percentage_base_salary':
          amount =
            (salaryPolicy.baseSalaryPerDay * workingDaysBase * component.defaultValue) /
            100;
          break;
          
        case 'multiplier_daily_rate':
          amount = salaryPolicy.baseSalaryPerDay * component.defaultValue;
          break;
          
        case 'overtime':
          amount = salaryPolicy.baseSalaryPerDay * salaryPolicy.overtimeRate * overtimeDaysBase;
          break;
          
        default:
          amount = 0;
      }
      
      if (amount > 0) {
        details.push({
          payrollId,
          payrollComponentId: component.id,
          quantity: 1,
          unitAmount: amount,
          amount: amount,
          calculationFormula: component.calculationMethod,
          isEdited: false,
        });
      }
    }
    
    if (details.length > 0) {
      await PayrollDetail.bulkCreate(details, { transaction });
    }
  } catch (error) {
    console.error('Error in autoCalculatePayrollComponents:', error);
    throw error;
  }
};

/**
 * Recalculate payroll totals
 */
exports.recalculatePayrollTotals = async (payrollId, transaction) => {
  try {
    const details = await PayrollDetail.findAll({
      where: { payrollId },
      include: [
        {
          model: PayrollComponent,
          attributes: ['type'],
        },
      ],
      transaction,
    });
    
    let totalIncome = 0;
    let totalDeduction = 0;
    
    details.forEach((detail) => {
      if (detail.PayrollComponent.type === 'income') {
        totalIncome += detail.amount || 0;
      } else {
        totalDeduction += detail.amount || 0;
      }
    });
    
    const netSalary = totalIncome - totalDeduction;
    
    await Payroll.update(
      {
        totalIncome,
        totalDeduction,
        netSalary,
      },
      {
        where: { id: payrollId },
        transaction,
      }
    );
  } catch (error) {
    console.error('Error in recalculatePayrollTotals:', error);
    throw error;
  }
};

/**
 * Calculate payroll (POST endpoint)
 */
exports.calculatePayroll = async (req, res) => {
  try {
    const {
      baseSalaryPerDay,
      workingDaysBase,
      workingDaysHoliday,
      workingDaysSunday,
      overtimeDaysBase,
      overtimeDaysHoliday,
      overtimeDaysSunday,
      annualLeaveDays,
      overtimeRate,
      holidayRate,
      sundayRate,
    } = req.body;
    
    // Calculate income
    const baseSalary = baseSalaryPerDay * workingDaysBase;
    const holidaySalary = baseSalaryPerDay * workingDaysHoliday * holidayRate;
    const sundaySalary = baseSalaryPerDay * workingDaysSunday * sundayRate;
    const overtimeIncome = baseSalaryPerDay * overtimeDaysBase * overtimeRate;
    const annualLeaveIncome = baseSalaryPerDay * annualLeaveDays;
    
    const totalIncome =
      baseSalary + holidaySalary + sundaySalary + overtimeIncome + annualLeaveIncome;
    
    // Calculate deductions (simplified)
    const socialInsurance = totalIncome * 0.08;
    const healthInsurance = totalIncome * 0.015;
    const workInjuryInsurance = totalIncome * 0.01;
    const unionFee = totalIncome * 0.01;
    
    const totalDeduction =
      socialInsurance + healthInsurance + workInjuryInsurance + unionFee;
    
    const netSalary = totalIncome - totalDeduction;
    
    res.json({
      success: true,
      data: {
        totalIncome,
        totalDeduction,
        netSalary,
        breakdown: {
          baseSalary,
          holidaySalary,
          sundaySalary,
          overtimeIncome,
          annualLeaveIncome,
          socialInsurance,
          healthInsurance,
          workInjuryInsurance,
          unionFee,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tính lương',
      error: error.message,
    });
  }
};

/**
 * Calculate tax (TNCN)
 */
exports.calculateTax = async (req, res) => {
  try {
    const { grossIncome } = req.body;
    
    // Vietnamese personal income tax (simplified, lũy tiến)
    let tax = 0;
    if (grossIncome > 20000000) {
      tax = (grossIncome - 20000000) * 0.35 + 3300000;
    } else if (grossIncome > 14000000) {
      tax = (grossIncome - 14000000) * 0.3 + 1800000;
    } else if (grossIncome > 9000000) {
      tax = (grossIncome - 9000000) * 0.25 + 550000;
    } else if (grossIncome > 5000000) {
      tax = (grossIncome - 5000000) * 0.2;
    }
    
    res.json({
      success: true,
      data: { tax },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tính thuế',
      error: error.message,
    });
  }
};

/**
 * Calculate insurance
 */
exports.calculateInsurance = async (req, res) => {
  try {
    const { grossIncome } = req.body;
    
    const socialInsurance = grossIncome * 0.08;
    const healthInsurance = grossIncome * 0.015;
    const workInjuryInsurance = grossIncome * 0.01;
    
    const totalInsurance = socialInsurance + healthInsurance + workInjuryInsurance;
    
    res.json({
      success: true,
      data: {
        socialInsurance,
        healthInsurance,
        workInjuryInsurance,
        totalInsurance,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tính bảo hiểm',
      error: error.message,
    });
  }
};

module.exports = exports;
