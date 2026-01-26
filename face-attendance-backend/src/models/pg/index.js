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
import SalaryPolicy from "./SalaryPolicy.js";
import PayrollComponent from "./PayrollComponent.js";
import Payroll from "./Payroll.js";
import PayrollDetail from "./PayrollDetail.js";

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

// EXISTING ASSOCIATIONS
User.hasMany(FaceProfile, { foreignKey: "userId" });
FaceProfile.belongsTo(User, { foreignKey: "userId" });

User.hasMany(AttendanceLog, { foreignKey: "userId" });
AttendanceLog.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Salary, { foreignKey: "userId" });
Salary.belongsTo(User, { foreignKey: "userId" });

User.hasMany(LeaveRequest, { foreignKey: "userId" });
LeaveRequest.belongsTo(User, { foreignKey: "userId", as: "User" });
LeaveRequest.belongsTo(User, { foreignKey: "approvedBy", as: "Approver" });

User.hasMany(Notification, { foreignKey: "userId" });
Notification.belongsTo(User, { foreignKey: "userId" });

// Ensure LeaveRequest associations are properly set up
if (!LeaveRequest.associations.User) {
  LeaveRequest.belongsTo(User, { foreignKey: "userId", as: "User" });
}
if (!LeaveRequest.associations.Approver) {
  LeaveRequest.belongsTo(User, { foreignKey: "approvedBy", as: "Approver" });
}

// Department Manager Association
Department.belongsTo(User, { foreignKey: "managerId", as: "Manager" });
User.hasMany(Department, { foreignKey: "managerId", as: "ManagedDepartments" });

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
  SalaryPolicy,
  PayrollComponent,
  Payroll,
  PayrollDetail
};



