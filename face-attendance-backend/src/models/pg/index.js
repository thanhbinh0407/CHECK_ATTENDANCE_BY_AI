import User from "./User.js";
import FaceProfile from "./FaceProfile.js";
import AttendanceLog from "./AttendanceLog.js";
import ShiftSetting from "./ShiftSetting.js";
import Salary from "./Salary.js";
import SalaryRule from "./SalaryRule.js";
import LeaveRequest from "./LeaveRequest.js";
import Notification from "./Notification.js";

// Associations
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

// Export models
export { User, FaceProfile, AttendanceLog, ShiftSetting, Salary, SalaryRule, LeaveRequest, Notification };



