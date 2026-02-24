import User from "./User.js";
import FaceProfile from "./FaceProfile.js";
import AttendanceLog from "./AttendanceLog.js";
import ShiftSetting from "./ShiftSetting.js";
import Salary from "./Salary.js";
import SalaryRule from "./SalaryRule.js";
import LeaveRequest from "./LeaveRequest.js";
import Notification from "./Notification.js";
import Department from "./Department.js";
import JobTitle from "./JobTitle.js";
import SalaryGrade from "./SalaryGrade.js";
import Qualification from "./Qualification.js";
import Dependent from "./Dependent.js";
import WorkExperience from "./WorkExperience.js";
import Document from "./Document.js";
import OvertimeRequest from "./OvertimeRequest.js";
import BusinessTripRequest from "./BusinessTripRequest.js";
import SalaryAdvance from "./SalaryAdvance.js";
import ApprovalWorkflow from "./ApprovalWorkflow.js";
import InsuranceConfig from "./InsuranceConfig.js";
import SalaryPolicy from "./SalaryPolicy.js";
import PayrollComponent from "./PayrollComponent.js";
import Payroll from "./Payroll.js";
import PayrollDetail from "./PayrollDetail.js";
import InsuranceForm from "./InsuranceForm.js";

// USER ASSOCIATIONS - Organizational Structure
User.belongsTo(Department, { foreignKey: "departmentId" });
Department.hasMany(User, { foreignKey: "departmentId" });

User.belongsTo(JobTitle, { foreignKey: "jobTitleId" });
JobTitle.hasMany(User, { foreignKey: "jobTitleId" });

User.belongsTo(SalaryGrade, { foreignKey: "salaryGradeId" });
SalaryGrade.hasMany(User, { foreignKey: "salaryGradeId" });

// QUALIFICATION ASSOCIATIONS
User.hasMany(Qualification, { foreignKey: "userId", as: "Qualifications" });
Qualification.belongsTo(User, { foreignKey: "userId" });

// DEPENDENT ASSOCIATIONS
User.hasMany(Dependent, { foreignKey: "userId", as: "Dependents" });
Dependent.belongsTo(User, { foreignKey: "userId" });

// WORK EXPERIENCE ASSOCIATIONS
User.hasMany(WorkExperience, { foreignKey: "userId", as: "WorkExperiences" });
WorkExperience.belongsTo(User, { foreignKey: "userId" });

// DOCUMENT ASSOCIATIONS
User.hasMany(Document, { foreignKey: "userId", as: "Documents" });
Document.belongsTo(User, { foreignKey: "userId" });
Document.belongsTo(User, { foreignKey: "uploadedBy", as: "Uploader" });

// OVERTIME REQUEST ASSOCIATIONS
User.hasMany(OvertimeRequest, { foreignKey: "userId", as: "OvertimeRequests" });
OvertimeRequest.belongsTo(User, { foreignKey: "userId", as: "User" });
OvertimeRequest.belongsTo(User, { foreignKey: "approvedBy", as: "Approver" });
OvertimeRequest.belongsTo(User, { foreignKey: "currentApproverId", as: "CurrentApprover" });

// BUSINESS TRIP REQUEST ASSOCIATIONS
User.hasMany(BusinessTripRequest, { foreignKey: "userId", as: "BusinessTripRequests" });
BusinessTripRequest.belongsTo(User, { foreignKey: "userId", as: "User" });
BusinessTripRequest.belongsTo(User, { foreignKey: "approvedBy", as: "Approver" });
BusinessTripRequest.belongsTo(User, { foreignKey: "currentApproverId", as: "CurrentApprover" });

// SALARY ADVANCE ASSOCIATIONS
User.hasMany(SalaryAdvance, { foreignKey: "userId", as: "SalaryAdvances" });
SalaryAdvance.belongsTo(User, { foreignKey: "userId" });
SalaryAdvance.belongsTo(User, { foreignKey: "approvedBy", as: "Approver" });

// APPROVAL WORKFLOW ASSOCIATIONS
ApprovalWorkflow.belongsTo(User, { foreignKey: "approverId", as: "Approver" });

// EXISTING ASSOCIATIONS
User.hasMany(FaceProfile, { foreignKey: "userId" });
FaceProfile.belongsTo(User, { foreignKey: "userId" });

User.hasMany(AttendanceLog, { foreignKey: "userId", as: "AttendanceLogs" });
AttendanceLog.belongsTo(User, { foreignKey: "userId", as: "User" });

User.hasMany(Salary, { foreignKey: "userId" });
Salary.belongsTo(User, { foreignKey: "userId" });

User.hasMany(LeaveRequest, { foreignKey: "userId", as: "LeaveRequests" });
LeaveRequest.belongsTo(User, { foreignKey: "userId", as: "User" });
LeaveRequest.belongsTo(User, { foreignKey: "approvedBy", as: "Approver" });

User.hasMany(Notification, { foreignKey: "userId" });
Notification.belongsTo(User, { foreignKey: "userId" });

// Department Manager Association
Department.belongsTo(User, { foreignKey: "managerId", as: "Manager" });
User.hasMany(Department, { foreignKey: "managerId", as: "ManagedDepartments" });

// Employee Direct Manager Association (Self-referential)
User.belongsTo(User, { foreignKey: "managerId", as: "Manager" });
User.hasMany(User, { foreignKey: "managerId", as: "DirectReports" });

// PAYROLL ASSOCIATIONS - Pre-built Payroll System
User.hasMany(Payroll, { foreignKey: "userId" });
Payroll.belongsTo(User, { foreignKey: "userId" });

Payroll.belongsTo(SalaryPolicy, { foreignKey: "salaryPolicyId" });
SalaryPolicy.hasMany(Payroll, { foreignKey: "salaryPolicyId" });

Payroll.hasMany(PayrollDetail, { foreignKey: "payrollId" });
PayrollDetail.belongsTo(Payroll, { foreignKey: "payrollId" });

PayrollDetail.belongsTo(PayrollComponent, { foreignKey: "payrollComponentId" });
PayrollComponent.hasMany(PayrollDetail, { foreignKey: "payrollComponentId" });

// Approval Chain for Payroll
Payroll.belongsTo(User, { foreignKey: "approvedBy", as: "Approver" });
User.hasMany(Payroll, { foreignKey: "approvedBy", as: "ApprovedPayrolls" });

// INSURANCE FORM ASSOCIATIONS
User.hasMany(InsuranceForm, { foreignKey: "userId", as: "InsuranceForms" });
InsuranceForm.belongsTo(User, { foreignKey: "userId" });

// Export models
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
  InsuranceForm
};



