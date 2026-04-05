/**
 * Models Index (CommonJS wrapper)
 * Export all models for use with require() in payrollController.js
 */

import {
  User,
  FaceProfile,
  AttendanceLog,
  ShiftSetting,
  Salary,
  SalaryRule,
  LeaveRequest,
  Notification,
  Department,
  JobTitle,
  SalaryGrade,
  Qualification,
  Dependent,
  WorkExperience,
  Document,
  OvertimeRequest,
  BusinessTripRequest,
  SalaryAdvance,
  ApprovalWorkflow,
  InsuranceConfig,
  SalaryPolicy,
  PayrollComponent,
  Payroll,
  PayrollDetail,
  InsuranceForm
} from './pg/index.js';
import sequelize from '../db/sequelize.js';

export {
  User,
  FaceProfile,
  AttendanceLog,
  ShiftSetting,
  Salary,
  SalaryRule,
  LeaveRequest,
  Notification,
  Department,
  JobTitle,
  SalaryGrade,
  Qualification,
  Dependent,
  WorkExperience,
  Document,
  OvertimeRequest,
  BusinessTripRequest,
  SalaryAdvance,
  ApprovalWorkflow,
  InsuranceConfig,
  SalaryPolicy,
  PayrollComponent,
  Payroll,
  PayrollDetail,
  InsuranceForm,
  sequelize
};

// Also export as CommonJS for backward compatibility
export default {
  User,
  FaceProfile,
  AttendanceLog,
  ShiftSetting,
  Salary,
  SalaryRule,
  LeaveRequest,
  Notification,
  Department,
  JobTitle,
  SalaryGrade,
  Qualification,
  Dependent,
  WorkExperience,
  Document,
  OvertimeRequest,
  BusinessTripRequest,
  SalaryAdvance,
  ApprovalWorkflow,
  InsuranceConfig,
  SalaryPolicy,
  PayrollComponent,
  Payroll,
  PayrollDetail,
  InsuranceForm,
  sequelize
};

