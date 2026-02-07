import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";

export default function EmployeeProfileModal({ employee, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [editForm, setEditForm] = useState({});
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [managers, setManagers] = useState([]);
  const [activeTab, setActiveTab] = useState("info");
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState(null);
  const [editingWorkExp, setEditingWorkExp] = useState(null); // null = new, number = editing id
  const [workExpForm, setWorkExpForm] = useState({
    companyName: "",
    position: "",
    startDate: "",
    endDate: "",
    description: "",
    responsibilities: "",
    achievements: "",
    isCurrent: false
  });
  const [savingWorkExp, setSavingWorkExp] = useState(false);
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    if (employee) {
      fetchEmployeeDetails();
      fetchDepartments();
      fetchJobTitles();
      fetchManagers();
      setNewPassword(null); // Reset new password when employee changes
    }
  }, [employee]);

  const fetchEmployeeDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/admin/employees/${employee.id}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setEmployeeDetails(data.employee);
        const emp = data.employee;
        setEditForm({
          name: emp.name || "",
          email: emp.email || "",
          personalEmail: emp.personalEmail || "",
          companyEmail: emp.companyEmail || "",
          phoneNumber: emp.phoneNumber || "",
          address: emp.address || "",
          permanentAddress: emp.permanentAddress || "",
          temporaryAddress: emp.temporaryAddress || "",
          dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split('T')[0] : "",
          gender: emp.gender || "",
          departmentId: emp.departmentId || null,
          jobTitleId: emp.jobTitleId || null,
          baseSalary: emp.baseSalary || 0,
          isActive: emp.isActive !== undefined ? emp.isActive : true,
          startDate: emp.startDate ? new Date(emp.startDate).toISOString().split('T')[0] : "",
          bankAccount: emp.bankAccount || "",
          bankName: emp.bankName || "",
          taxCode: emp.taxCode || "",
          idNumber: emp.idNumber || "",
          idIssueDate: emp.idIssueDate ? new Date(emp.idIssueDate).toISOString().split('T')[0] : "",
          idIssuePlace: emp.idIssuePlace || "",
          contractType: emp.contractType || "",
          employmentStatus: emp.employmentStatus || "active",
          managerId: emp.managerId || null,
          branchName: emp.branchName || "",
          bankBranch: emp.bankBranch || "",
          lunchAllowance: emp.lunchAllowance || 0,
          transportAllowance: emp.transportAllowance || 0,
          phoneAllowance: emp.phoneAllowance || 0,
          responsibilityAllowance: emp.responsibilityAllowance || 0,
          socialInsuranceNumber: emp.socialInsuranceNumber || "",
          healthInsuranceProvider: emp.healthInsuranceProvider || "",
          dependentCount: emp.dependentCount || 0,
          educationLevel: emp.educationLevel || "",
          major: emp.major || "",
          emergencyContactName: emp.emergencyContactName || "",
          emergencyContactRelationship: emp.emergencyContactRelationship || "",
          emergencyContactPhone: emp.emergencyContactPhone || ""
        });
      }
    } catch (error) {
      setMessage("Error loading employee information");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchJobTitles = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/job-titles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setJobTitles(data.jobTitles || []);
      }
    } catch (error) {
      console.error("Error fetching job titles:", error);
    }
  };

  const fetchManagers = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        // Filter out current employee and only show active employees/admins/managers
        const managerList = (data.employees || []).filter(emp => 
          emp.id !== employee?.id && 
          (emp.role === 'admin' || emp.role === 'accountant' || emp.isActive)
        );
        setManagers(managerList);
      }
    } catch (error) {
      console.error("Error fetching managers:", error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/admin/employees/${employee.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(editForm)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Information updated successfully!");
        setIsEditing(false);
        fetchEmployeeDetails();
        if (onUpdate) onUpdate();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Unable to update"));
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!window.confirm("Are you sure you want to reset the password for this employee? The new password will be: Password123!")) {
      return;
    }

    try {
      setResettingPassword(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/admin/employees/${employee.id}/reset-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok) {
        setNewPassword(data.newPassword);
        setMessage("Password reset successfully!");
        fetchEmployeeDetails();
        setTimeout(() => setMessage(""), 5000);
      } else {
        setMessage("Error: " + (data.message || "Unable to reset password"));
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSaveWorkExp = async () => {
    if (!workExpForm.companyName || !workExpForm.position) {
      setMessage("Company name and position are required");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    try {
      setSavingWorkExp(true);
      const token = localStorage.getItem("authToken");
      const url = editingWorkExp === "new" 
        ? `${apiBase}/api/work-experiences/${employee.id}`
        : `${apiBase}/api/work-experiences/${editingWorkExp}`;
      const method = editingWorkExp === "new" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(workExpForm)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(editingWorkExp === "new" ? "Work experience added successfully!" : "Work experience updated successfully!");
        setEditingWorkExp(null);
        setWorkExpForm({
          companyName: "",
          position: "",
          startDate: "",
          endDate: "",
          description: "",
          responsibilities: "",
          achievements: "",
          isCurrent: false
        });
        fetchEmployeeDetails();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Unable to save work experience"));
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      setMessage("Error: " + error.message);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setSavingWorkExp(false);
    }
  };

  const handleCancelWorkExp = () => {
    setEditingWorkExp(null);
    setWorkExpForm({
      companyName: "",
      position: "",
      startDate: "",
      endDate: "",
      description: "",
      responsibilities: "",
      achievements: "",
      isCurrent: false
    });
  };

  const handleDeleteWorkExp = async (id) => {
    if (!window.confirm("Are you sure you want to delete this work experience?")) {
      return;
    }

    try {
      setSavingWorkExp(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/work-experiences/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Work experience deleted successfully!");
        fetchEmployeeDetails();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Unable to delete work experience"));
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      setMessage("Error: " + error.message);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setSavingWorkExp(false);
    }
  };

  if (!employee) return null;

  const modalOverlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: theme.spacing.xl,
    overflowY: "auto"
  };

  const modalContentStyle = {
    backgroundColor: theme.neutral.white,
    borderRadius: theme.radius.xl,
    width: "100%",
    maxWidth: "1200px",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: theme.shadows.xl
  };

  const headerStyle = {
    background: theme.gradients.primary,
    color: theme.neutral.white,
    padding: theme.spacing.xl,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  };

  const tabsStyle = {
    display: "flex",
    borderBottom: `2px solid ${theme.neutral.gray200}`,
    backgroundColor: theme.neutral.gray50
  };

  const tabButtonStyle = (isActive) => ({
    flex: 1,
    padding: theme.spacing.md,
    border: "none",
    backgroundColor: isActive ? theme.neutral.white : "transparent",
    color: isActive ? theme.primary.main : theme.neutral.gray600,
    cursor: "pointer",
    fontWeight: isActive ? 600 : 400,
    borderBottom: isActive ? `3px solid ${theme.primary.main}` : "none",
    transition: "all 0.2s"
  });

  const contentStyle = {
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing.xl
  };

  const infoGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xl
  };

  const infoCardStyle = {
    padding: theme.spacing.md,
    backgroundColor: theme.neutral.gray50,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.neutral.gray200}`
  };

  const labelStyle = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: theme.neutral.gray600,
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  };

  const valueStyle = {
    fontSize: "16px",
    fontWeight: 500,
    color: theme.neutral.gray900
  };

  const inputStyle = {
    width: "100%",
    padding: theme.spacing.md,
    border: `1px solid ${theme.neutral.gray300}`,
    borderRadius: theme.radius.md,
    fontSize: "14px",
    fontFamily: "inherit"
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>
              {employeeDetails?.name || employee.name}
            </h2>
            <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: "14px", opacity: 0.9 }}>
              {employeeDetails?.employeeCode || employee.employeeCode} | {employeeDetails?.email || employee.email}
            </p>
          </div>
          <div style={{ display: "flex", gap: theme.spacing.sm, alignItems: "center" }}>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  color: theme.neutral.white,
                  border: "none",
                  borderRadius: theme.radius.md,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "14px"
                }}
              >
                ✏️ Edit
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: "rgba(255,255,255,0.2)",
                color: theme.neutral.white,
                border: "none",
                borderRadius: theme.radius.md,
                cursor: "pointer",
                fontSize: "20px",
                fontWeight: 700
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {message && (
          <div style={{
            padding: theme.spacing.md,
            margin: theme.spacing.md,
            backgroundColor: (message.includes("successfully") || message.includes("thành công")) ? "#d4edda" : "#f8d7da",
            color: (message.includes("successfully") || message.includes("thành công")) ? "#155724" : "#721c24",
            borderRadius: theme.radius.md,
            fontSize: "14px"
          }}>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div style={tabsStyle}>
          <button style={tabButtonStyle(activeTab === "info")} onClick={() => setActiveTab("info")}>
            📋 Personal Info
          </button>
          <button style={tabButtonStyle(activeTab === "work")} onClick={() => setActiveTab("work")}>
            💼 Work Info
          </button>
          <button style={tabButtonStyle(activeTab === "family")} onClick={() => setActiveTab("family")}>
            👨‍👩‍👧‍👦 Family
          </button>
          <button style={tabButtonStyle(activeTab === "qualifications")} onClick={() => setActiveTab("qualifications")}>
            🎓 Qualifications
          </button>
          <button style={tabButtonStyle(activeTab === "experience")} onClick={() => setActiveTab("experience")}>
            💼 Work Experience
          </button>
          <button style={tabButtonStyle(activeTab === "attendance")} onClick={() => setActiveTab("attendance")}>
            📍 Attendance
          </button>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {loading && !employeeDetails ? (
            <div style={{ textAlign: "center", padding: theme.spacing.xxl }}>
              Loading...
            </div>
          ) : (
            <>
              {/* Tab: Thông tin cá nhân */}
              {activeTab === "info" && (
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
                    Personal Information
                  </h3>
                  <div style={infoGridStyle}>
                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Full Name *</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          style={inputStyle}
                          required
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.name || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Email *</label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          style={inputStyle}
                          required
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.email || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Personal Email</label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editForm.personalEmail}
                          onChange={(e) => setEditForm({ ...editForm, personalEmail: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.personalEmail || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Company Email</label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editForm.companyEmail}
                          onChange={(e) => setEditForm({ ...editForm, companyEmail: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.companyEmail || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Phone Number</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.phoneNumber}
                          onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.phoneNumber || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Date of Birth</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.dateOfBirth}
                          onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.dateOfBirth ? new Date(employeeDetails.dateOfBirth).toLocaleDateString('en-US') : "-"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Gender</label>
                      {isEditing ? (
                        <select
                          value={editForm.gender}
                          onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.gender === "male" ? "Male" : 
                           employeeDetails?.gender === "female" ? "Female" : 
                           employeeDetails?.gender === "other" ? "Other" : "-"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>ID Number</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.idNumber}
                          onChange={(e) => setEditForm({ ...editForm, idNumber: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.idNumber || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>ID Issue Date</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.idIssueDate}
                          onChange={(e) => setEditForm({ ...editForm, idIssueDate: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.idIssueDate ? new Date(employeeDetails.idIssueDate).toLocaleDateString('en-US') : "-"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>ID Issue Place</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.idIssuePlace}
                          onChange={(e) => setEditForm({ ...editForm, idIssuePlace: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.idIssuePlace || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Education Level</label>
                      {isEditing ? (
                        <select
                          value={editForm.educationLevel || ""}
                          onChange={(e) => setEditForm({ ...editForm, educationLevel: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="">Select education level</option>
                          <option value="high_school">Trung học phổ thông</option>
                          <option value="vocational">Trung cấp</option>
                          <option value="college">Cao đẳng</option>
                          <option value="university">Đại học</option>
                          <option value="master">Thạc sĩ</option>
                          <option value="phd">Tiến sĩ</option>
                          <option value="other">Khác</option>
                        </select>
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.educationLevel === "high_school" ? "Trung học phổ thông" :
                           employeeDetails?.educationLevel === "vocational" ? "Trung cấp" :
                           employeeDetails?.educationLevel === "college" ? "Cao đẳng" :
                           employeeDetails?.educationLevel === "university" ? "Đại học" :
                           employeeDetails?.educationLevel === "master" ? "Thạc sĩ" :
                           employeeDetails?.educationLevel === "phd" ? "Tiến sĩ" :
                           employeeDetails?.educationLevel === "other" ? "Khác" : "-"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Major / Specialization</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.major}
                          onChange={(e) => setEditForm({ ...editForm, major: e.target.value })}
                          style={inputStyle}
                          placeholder="Chuyên ngành đào tạo"
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.major || "-"}</div>
                      )}
                    </div>

                    <div style={{ ...infoCardStyle, gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Permanent Address</label>
                      {isEditing ? (
                        <textarea
                          value={editForm.permanentAddress}
                          onChange={(e) => setEditForm({ ...editForm, permanentAddress: e.target.value })}
                          rows={3}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.permanentAddress || "-"}</div>
                      )}
                    </div>

                    <div style={{ ...infoCardStyle, gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Temporary Address</label>
                      {isEditing ? (
                        <textarea
                          value={editForm.temporaryAddress}
                          onChange={(e) => setEditForm({ ...editForm, temporaryAddress: e.target.value })}
                          rows={3}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.temporaryAddress || "-"}</div>
                      )}
                    </div>

                  </div>

                  {/* Emergency Contact Section */}
                  <h3 style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
                    🚨 Emergency Contact
                  </h3>
                  <div style={infoGridStyle}>
                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Emergency Contact Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.emergencyContactName}
                          onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                          style={inputStyle}
                          placeholder="Tên người liên hệ khẩn cấp"
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.emergencyContactName || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Relationship</label>
                      {isEditing ? (
                        <select
                          value={editForm.emergencyContactRelationship || ""}
                          onChange={(e) => setEditForm({ ...editForm, emergencyContactRelationship: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="">Select relationship</option>
                          <option value="Spouse">Vợ/Chồng</option>
                          <option value="Parent">Bố/Mẹ</option>
                          <option value="Sibling">Anh/Chị/Em</option>
                          <option value="Friend">Bạn bè</option>
                          <option value="Colleague">Đồng nghiệp</option>
                          <option value="Other">Khác</option>
                        </select>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.emergencyContactRelationship || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Emergency Contact Phone *</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editForm.emergencyContactPhone}
                          onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                          style={inputStyle}
                          placeholder="Số điện thoại liên hệ khẩn cấp"
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.emergencyContactPhone ? (
                            <a href={`tel:${employeeDetails.emergencyContactPhone}`} style={{ color: theme.primary.main, textDecoration: "none" }}>
                              📞 {employeeDetails.emergencyContactPhone}
                            </a>
                          ) : (
                            <span style={{ color: theme.error.main, fontStyle: "italic" }}>⚠️ Not set</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {!isEditing && (
                    <div style={{ ...infoCardStyle, gridColumn: "1 / -1", backgroundColor: newPassword ? "#d4edda" : "#fff3cd", border: `2px solid ${newPassword ? "#28a745" : "#ffc107"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.xs }}>
                        <label style={labelStyle}>Password</label>
                        <button
                          onClick={handleResetPassword}
                          disabled={resettingPassword}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: theme.warning.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: resettingPassword ? "not-allowed" : "pointer",
                            fontSize: "13px",
                            fontWeight: 600
                          }}
                        >
                          {resettingPassword ? "⏳ Resetting..." : "🔄 Reset Password"}
                        </button>
                      </div>
                      {newPassword ? (
                        <div style={{ 
                          ...valueStyle, 
                          fontFamily: "monospace", 
                          fontSize: "18px", 
                          fontWeight: 700,
                          color: theme.success.main,
                          backgroundColor: "#fff", 
                          padding: theme.spacing.md, 
                          borderRadius: theme.radius.sm, 
                          border: "2px solid #28a745",
                          textAlign: "center",
                          letterSpacing: "2px"
                        }}>
                          {newPassword}
                        </div>
                      ) : (
                        <div style={{ ...valueStyle, fontFamily: "monospace", fontSize: "12px", wordBreak: "break-all", backgroundColor: "#fff", padding: theme.spacing.sm, borderRadius: theme.radius.sm, border: "1px solid #ddd" }}>
                          {showPassword && employeeDetails?.password ? (
                            <span style={{ color: theme.neutral.gray700 }}>
                              Hash: {employeeDetails.password.substring(0, 50)}...
                            </span>
                          ) : (
                            <span style={{ color: theme.neutral.gray500 }}>
                              {employeeDetails?.password ? "••••••••••••••••••••••••••••••••" : "No password set"}
                            </span>
                          )}
                        </div>
                      )}
                      <div style={{ fontSize: "11px", color: theme.neutral.gray600, marginTop: theme.spacing.xs, fontStyle: "italic" }}>
                        {newPassword ? (
                          <span style={{ color: theme.success.main, fontWeight: 600 }}>
                            ✅ New password has been generated! Please save this information.
                          </span>
                        ) : (
                          "Password is hashed with bcrypt, cannot be displayed as plain text. Use Reset to create a new password (default: Password123!)"
                        )}
                      </div>
                      {!newPassword && employeeDetails?.password && (
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            marginTop: theme.spacing.xs,
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            backgroundColor: theme.neutral.gray200,
                            border: "none",
                            borderRadius: theme.radius.sm,
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: 600
                          }}
                        >
                          {showPassword ? "👁️ Hide hash" : "👁️ Show hash"}
                        </button>
                      )}
                    </div>
                  )}

                  {isEditing && (
                    <div style={{ display: "flex", gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          backgroundColor: theme.primary.main,
                          color: theme.neutral.white,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: loading ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          fontSize: "16px"
                        }}
                      >
                        {loading ? "Saving..." : "💾 Save Changes"}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          fetchEmployeeDetails();
                        }}
                        style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          backgroundColor: theme.neutral.gray300,
                          color: theme.neutral.gray700,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "16px"
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Work Info */}
              {activeTab === "work" && (
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
                    Work Information
                  </h3>
                  <div style={infoGridStyle}>
                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Employee Code</label>
                      <div style={valueStyle}>{employeeDetails?.employeeCode || "-"}</div>
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Department</label>
                      {isEditing ? (
                        <select
                          value={editForm.departmentId || ""}
                          onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value ? parseInt(e.target.value) : null })}
                          style={inputStyle}
                        >
                          <option value="">Select department</option>
                          {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.department || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Job Title</label>
                      {isEditing ? (
                        <select
                          value={editForm.jobTitleId || ""}
                          onChange={(e) => setEditForm({ ...editForm, jobTitleId: e.target.value ? parseInt(e.target.value) : null })}
                          style={inputStyle}
                        >
                          <option value="">Select job title</option>
                          {jobTitles.map(job => (
                            <option key={job.id} value={job.id}>{job.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.jobTitle || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Base Salary (VND)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.baseSalary}
                          onChange={(e) => setEditForm({ ...editForm, baseSalary: parseFloat(e.target.value) || 0 })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.baseSalary ? new Intl.NumberFormat('en-US').format(employeeDetails.baseSalary) + " VND" : "-"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Start Date</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.startDate}
                          onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.startDate ? new Date(employeeDetails.startDate).toLocaleDateString('en-US') : "-"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Status</label>
                      {isEditing ? (
                        <label style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
                          <input
                            type="checkbox"
                            checked={editForm.isActive}
                            onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                          />
                          <span>Active</span>
                        </label>
                      ) : (
                        <div style={valueStyle}>
                          <span style={{
                            padding: "4px 12px",
                            borderRadius: theme.radius.full,
                            backgroundColor: employeeDetails?.isActive ? "#d4edda" : "#f8d7da",
                            color: employeeDetails?.isActive ? "#155724" : "#721c24",
                            fontSize: "12px",
                            fontWeight: 600
                          }}>
                            {employeeDetails?.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Contract Type</label>
                      {isEditing ? (
                        <select
                          value={editForm.contractType || ""}
                          onChange={(e) => setEditForm({ ...editForm, contractType: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="">Select contract type</option>
                          <option value="probation">Thử việc (Probation)</option>
                          <option value="1_year">Hợp đồng 1 năm (1 Year)</option>
                          <option value="3_year">Hợp đồng 3 năm (3 Years)</option>
                          <option value="indefinite">Không xác định thời hạn (Indefinite)</option>
                          <option value="other">Khác (Other)</option>
                        </select>
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.contractType === "probation" ? "Thử việc" :
                           employeeDetails?.contractType === "1_year" ? "Hợp đồng 1 năm" :
                           employeeDetails?.contractType === "3_year" ? "Hợp đồng 3 năm" :
                           employeeDetails?.contractType === "indefinite" ? "Không xác định thời hạn" :
                           employeeDetails?.contractType === "other" ? "Khác" : "-"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Employment Status</label>
                      {isEditing ? (
                        <select
                          value={editForm.employmentStatus || "active"}
                          onChange={(e) => setEditForm({ ...editForm, employmentStatus: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="active">Đang làm việc (Active)</option>
                          <option value="maternity_leave">Đang nghỉ thai sản (Maternity Leave)</option>
                          <option value="unpaid_leave">Nghỉ không lương (Unpaid Leave)</option>
                          <option value="suspended">Tạm nghỉ việc (Suspended)</option>
                          <option value="terminated">Đã nghỉ việc (Terminated)</option>
                          <option value="resigned">Đã từ chức (Resigned)</option>
                        </select>
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.employmentStatus === "active" ? "Đang làm việc" :
                           employeeDetails?.employmentStatus === "maternity_leave" ? "Đang nghỉ thai sản" :
                           employeeDetails?.employmentStatus === "unpaid_leave" ? "Nghỉ không lương" :
                           employeeDetails?.employmentStatus === "suspended" ? "Tạm nghỉ việc" :
                           employeeDetails?.employmentStatus === "terminated" ? "Đã nghỉ việc" :
                           employeeDetails?.employmentStatus === "resigned" ? "Đã từ chức" : "-"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Direct Manager</label>
                      {isEditing ? (
                        <select
                          value={editForm.managerId || ""}
                          onChange={(e) => setEditForm({ ...editForm, managerId: e.target.value ? parseInt(e.target.value) : null })}
                          style={inputStyle}
                        >
                          <option value="">Select manager</option>
                          {managers.map(manager => (
                            <option key={manager.id} value={manager.id}>
                              {manager.name} ({manager.employeeCode || manager.email})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.Manager ? `${employeeDetails.Manager.name} (${employeeDetails.Manager.employeeCode || employeeDetails.Manager.email})` : "-"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Branch/Office</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.branchName}
                          onChange={(e) => setEditForm({ ...editForm, branchName: e.target.value })}
                          style={inputStyle}
                          placeholder="Enter branch/office name"
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.branchName || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Bank Account</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.bankAccount}
                          onChange={(e) => setEditForm({ ...editForm, bankAccount: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.bankAccount || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Bank Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.bankName}
                          onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.bankName || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Tax Code</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.taxCode}
                          onChange={(e) => setEditForm({ ...editForm, taxCode: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.taxCode || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Bank Branch</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.bankBranch}
                          onChange={(e) => setEditForm({ ...editForm, bankBranch: e.target.value })}
                          style={inputStyle}
                          placeholder="Enter bank branch"
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.bankBranch || "-"}</div>
                      )}
                    </div>
                  </div>

                  {/* Payroll & Compliance Section */}
                  <h3 style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
                    💰 Payroll & Compliance
                  </h3>
                  <div style={infoGridStyle}>
                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Lunch Allowance (VND)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.lunchAllowance}
                          onChange={(e) => setEditForm({ ...editForm, lunchAllowance: parseFloat(e.target.value) || 0 })}
                          style={inputStyle}
                          min="0"
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.lunchAllowance ? new Intl.NumberFormat('en-US').format(employeeDetails.lunchAllowance) + " VND" : "0 VND"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Transport Allowance (VND)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.transportAllowance}
                          onChange={(e) => setEditForm({ ...editForm, transportAllowance: parseFloat(e.target.value) || 0 })}
                          style={inputStyle}
                          min="0"
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.transportAllowance ? new Intl.NumberFormat('en-US').format(employeeDetails.transportAllowance) + " VND" : "0 VND"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Phone Allowance (VND)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.phoneAllowance}
                          onChange={(e) => setEditForm({ ...editForm, phoneAllowance: parseFloat(e.target.value) || 0 })}
                          style={inputStyle}
                          min="0"
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.phoneAllowance ? new Intl.NumberFormat('en-US').format(employeeDetails.phoneAllowance) + " VND" : "0 VND"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Responsibility Allowance (VND)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.responsibilityAllowance}
                          onChange={(e) => setEditForm({ ...editForm, responsibilityAllowance: parseFloat(e.target.value) || 0 })}
                          style={inputStyle}
                          min="0"
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.responsibilityAllowance ? new Intl.NumberFormat('en-US').format(employeeDetails.responsibilityAllowance) + " VND" : "0 VND"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Social Insurance Number (BHXH)</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.socialInsuranceNumber}
                          onChange={(e) => setEditForm({ ...editForm, socialInsuranceNumber: e.target.value })}
                          style={inputStyle}
                          placeholder="Enter social insurance number"
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.socialInsuranceNumber || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Health Insurance Provider (BHYT)</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.healthInsuranceProvider}
                          onChange={(e) => setEditForm({ ...editForm, healthInsuranceProvider: e.target.value })}
                          style={inputStyle}
                          placeholder="Nơi đăng ký KCB ban đầu"
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.healthInsuranceProvider || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Dependent Count</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.dependentCount}
                          onChange={(e) => setEditForm({ ...editForm, dependentCount: parseInt(e.target.value) || 0 })}
                          style={inputStyle}
                          min="0"
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.dependentCount || 0} {employeeDetails?.dependentCount === 1 ? 'person' : 'people'}
                          {employeeDetails?.Dependents && employeeDetails.Dependents.length > 0 && (
                            <span style={{ fontSize: "12px", color: theme.neutral.gray600, marginLeft: "8px" }}>
                              ({employeeDetails.Dependents.length} in system)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div style={{ display: "flex", gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          backgroundColor: theme.primary.main,
                          color: theme.neutral.white,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: loading ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          fontSize: "16px"
                        }}
                      >
                        {loading ? "Saving..." : "💾 Save Changes"}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          fetchEmployeeDetails();
                        }}
                        style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          backgroundColor: theme.neutral.gray300,
                          color: theme.neutral.gray700,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "16px"
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Family */}
              {activeTab === "family" && (
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
                    Dependents
                  </h3>
                  {employeeDetails?.Dependents && employeeDetails.Dependents.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: theme.spacing.md }}>
                      {employeeDetails.Dependents.map((dep) => (
                        <div key={dep.id} style={{
                          padding: theme.spacing.md,
                          backgroundColor: theme.neutral.gray50,
                          borderRadius: theme.radius.md,
                          border: `1px solid ${theme.neutral.gray200}`
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs, fontSize: "16px" }}>
                            {dep.fullName}
                          </div>
                          <div style={{ fontSize: "14px", color: theme.neutral.gray600 }}>
                            <div>Relationship: {dep.relationship}</div>
                            {dep.dateOfBirth && (
                              <div>Date of Birth: {new Date(dep.dateOfBirth).toLocaleDateString('en-US')}</div>
                            )}
                            {dep.gender && <div>Gender: {dep.gender}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: theme.neutral.gray500, fontStyle: "italic" }}>No dependents</p>
                  )}
                </div>
              )}

              {/* Tab: Bằng cấp */}
              {activeTab === "qualifications" && (
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
                    Qualifications and Certificates
                  </h3>
                  {employeeDetails?.Qualifications && employeeDetails.Qualifications.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: theme.spacing.md }}>
                      {employeeDetails.Qualifications.map((qual) => (
                        <div key={qual.id} style={{
                          padding: theme.spacing.md,
                          backgroundColor: theme.neutral.gray50,
                          borderRadius: theme.radius.md,
                          border: `1px solid ${theme.neutral.gray200}`
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs, fontSize: "16px" }}>
                            {qual.name}
                          </div>
                          <div style={{ fontSize: "14px", color: theme.neutral.gray600 }}>
                            <div>Type: {qual.type}</div>
                            {qual.issuedBy && <div>Issued by: {qual.issuedBy}</div>}
                            {qual.issuedDate && (
                              <div>Issued date: {new Date(qual.issuedDate).toLocaleDateString('en-US')}</div>
                            )}
                            {qual.documentPath && (
                              <a
                                href={`${apiBase}${qual.documentPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: theme.primary.main, textDecoration: "underline", fontSize: "12px" }}
                              >
                                View document
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: theme.neutral.gray500, fontStyle: "italic" }}>No qualifications or certificates</p>
                  )}
                </div>
              )}

              {/* Tab: Work Experience */}
              {activeTab === "experience" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.lg }}>
                    <h3 style={{ marginTop: 0, marginBottom: 0, color: theme.primary.main }}>
                      Work Experience
                    </h3>
                    {!editingWorkExp && (
                      <button
                        onClick={() => {
                          setEditingWorkExp("new");
                          setWorkExpForm({
                            companyName: "",
                            position: "",
                            startDate: "",
                            endDate: "",
                            description: "",
                            responsibilities: "",
                            achievements: "",
                            isCurrent: false
                          });
                        }}
                        style={{
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          backgroundColor: theme.primary.main,
                          color: theme.neutral.white,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                      >
                        ➕ Add Experience
                      </button>
                    )}
                  </div>

                  {/* Add/Edit Form */}
                  {editingWorkExp && (
                    <div style={{
                      padding: theme.spacing.lg,
                      backgroundColor: theme.neutral.gray50,
                      borderRadius: theme.radius.md,
                      border: `2px solid ${theme.primary.main}`,
                      marginBottom: theme.spacing.lg
                    }}>
                      <h4 style={{ marginTop: 0, marginBottom: theme.spacing.md, color: theme.primary.main }}>
                        {editingWorkExp === "new" ? "Add New Work Experience" : "Edit Work Experience"}
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: theme.spacing.md }}>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                            Company Name *
                          </label>
                          <input
                            type="text"
                            value={workExpForm.companyName}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, companyName: e.target.value })}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: `1px solid ${theme.neutral.gray300}`,
                              borderRadius: theme.radius.sm,
                              fontSize: "14px"
                            }}
                            placeholder="Enter company name"
                          />
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                            Position *
                          </label>
                          <input
                            type="text"
                            value={workExpForm.position}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, position: e.target.value })}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: `1px solid ${theme.neutral.gray300}`,
                              borderRadius: theme.radius.sm,
                              fontSize: "14px"
                            }}
                            placeholder="Enter position"
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={workExpForm.startDate}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, startDate: e.target.value })}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: `1px solid ${theme.neutral.gray300}`,
                              borderRadius: theme.radius.sm,
                              fontSize: "14px"
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                            End Date
                          </label>
                          <input
                            type="date"
                            value={workExpForm.endDate}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, endDate: e.target.value })}
                            disabled={workExpForm.isCurrent}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: `1px solid ${theme.neutral.gray300}`,
                              borderRadius: theme.radius.sm,
                              fontSize: "14px",
                              opacity: workExpForm.isCurrent ? 0.5 : 1,
                              cursor: workExpForm.isCurrent ? "not-allowed" : "text"
                            }}
                          />
                        </div>

                        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
                          <input
                            type="checkbox"
                            checked={workExpForm.isCurrent}
                            onChange={(e) => {
                              setWorkExpForm({ ...workExpForm, isCurrent: e.target.checked, endDate: e.target.checked ? "" : workExpForm.endDate });
                            }}
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                          />
                          <label style={{ fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
                            Currently working here
                          </label>
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                            Description
                          </label>
                          <textarea
                            value={workExpForm.description}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, description: e.target.value })}
                            rows={3}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: `1px solid ${theme.neutral.gray300}`,
                              borderRadius: theme.radius.sm,
                              fontSize: "14px",
                              resize: "vertical"
                            }}
                            placeholder="Describe your role and responsibilities"
                          />
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                            Key Responsibilities
                          </label>
                          <textarea
                            value={workExpForm.responsibilities}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, responsibilities: e.target.value })}
                            rows={3}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: `1px solid ${theme.neutral.gray300}`,
                              borderRadius: theme.radius.sm,
                              fontSize: "14px",
                              resize: "vertical"
                            }}
                            placeholder="List key responsibilities"
                          />
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                            Achievements
                          </label>
                          <textarea
                            value={workExpForm.achievements}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, achievements: e.target.value })}
                            rows={3}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: `1px solid ${theme.neutral.gray300}`,
                              borderRadius: theme.radius.sm,
                              fontSize: "14px",
                              resize: "vertical"
                            }}
                            placeholder="List notable achievements"
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
                        <button
                          onClick={handleSaveWorkExp}
                          disabled={savingWorkExp || !workExpForm.companyName || !workExpForm.position}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                            backgroundColor: savingWorkExp || !workExpForm.companyName || !workExpForm.position ? theme.neutral.gray400 : theme.primary.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: savingWorkExp || !workExpForm.companyName || !workExpForm.position ? "not-allowed" : "pointer",
                            fontWeight: 600,
                            fontSize: "14px"
                          }}
                        >
                          {savingWorkExp ? "Saving..." : "💾 Save"}
                        </button>
                        <button
                          onClick={handleCancelWorkExp}
                          disabled={savingWorkExp}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                            backgroundColor: theme.neutral.gray300,
                            color: theme.neutral.gray700,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: savingWorkExp ? "not-allowed" : "pointer",
                            fontWeight: 600,
                            fontSize: "14px"
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Work Experience List */}
                  {employeeDetails?.WorkExperiences && employeeDetails.WorkExperiences.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: theme.spacing.md }}>
                      {employeeDetails.WorkExperiences.map((exp) => (
                        <div key={exp.id} style={{
                          padding: theme.spacing.md,
                          backgroundColor: theme.neutral.gray50,
                          borderRadius: theme.radius.md,
                          border: `1px solid ${theme.neutral.gray200}`,
                          position: "relative"
                        }}>
                          {editingWorkExp !== exp.id && (
                            <div style={{ position: "absolute", top: theme.spacing.sm, right: theme.spacing.sm, display: "flex", gap: theme.spacing.xs }}>
                              <button
                                onClick={() => {
                                  setEditingWorkExp(exp.id);
                                  setWorkExpForm({
                                    companyName: exp.companyName || "",
                                    position: exp.position || "",
                                    startDate: exp.startDate ? new Date(exp.startDate).toISOString().split('T')[0] : "",
                                    endDate: exp.endDate ? new Date(exp.endDate).toISOString().split('T')[0] : "",
                                    description: exp.description || "",
                                    responsibilities: exp.responsibilities || "",
                                    achievements: exp.achievements || "",
                                    isCurrent: exp.isCurrent || false
                                  });
                                }}
                                style={{
                                  padding: "4px 8px",
                                  backgroundColor: theme.primary.main,
                                  color: theme.neutral.white,
                                  border: "none",
                                  borderRadius: theme.radius.sm,
                                  cursor: "pointer",
                                  fontSize: "12px"
                                }}
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteWorkExp(exp.id)}
                                style={{
                                  padding: "4px 8px",
                                  backgroundColor: theme.error.main,
                                  color: theme.neutral.white,
                                  border: "none",
                                  borderRadius: theme.radius.sm,
                                  cursor: "pointer",
                                  fontSize: "12px"
                                }}
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                          <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs, fontSize: "18px", color: theme.primary.main }}>
                            {exp.companyName}
                          </div>
                          <div style={{ fontSize: "14px", color: theme.neutral.gray700, fontWeight: 600, marginBottom: theme.spacing.xs }}>
                            {exp.position}
                          </div>
                          <div style={{ fontSize: "13px", color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                            {exp.startDate ? new Date(exp.startDate).toLocaleDateString('en-US') : "N/A"} - {exp.isCurrent ? "Present" : (exp.endDate ? new Date(exp.endDate).toLocaleDateString('en-US') : "N/A")}
                            {exp.isCurrent && (
                              <span style={{ marginLeft: "8px", padding: "2px 8px", backgroundColor: "#d4edda", color: "#155724", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                                Current
                              </span>
                            )}
                          </div>
                          {exp.description && (
                            <div style={{ fontSize: "13px", color: theme.neutral.gray700, marginTop: theme.spacing.sm }}>
                              <strong>Description:</strong> {exp.description}
                            </div>
                          )}
                          {exp.responsibilities && (
                            <div style={{ fontSize: "13px", color: theme.neutral.gray700, marginTop: theme.spacing.xs }}>
                              <strong>Responsibilities:</strong> {exp.responsibilities}
                            </div>
                          )}
                          {exp.achievements && (
                            <div style={{ fontSize: "13px", color: theme.neutral.gray700, marginTop: theme.spacing.xs }}>
                              <strong>Achievements:</strong> {exp.achievements}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : !editingWorkExp && (
                    <p style={{ color: theme.neutral.gray500, fontStyle: "italic" }}>No work experience recorded</p>
                  )}
                </div>
              )}

              {/* Tab: Attendance */}
              {activeTab === "attendance" && (
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
                    Attendance Statistics
                  </h3>
                  {employeeDetails?.attendanceStats ? (
                    <div style={infoGridStyle}>
                      <div style={infoCardStyle}>
                        <label style={labelStyle}>Total Days Worked</label>
                        <div style={{ ...valueStyle, fontSize: "24px", fontWeight: 700, color: theme.primary.main }}>
                          {employeeDetails.attendanceStats.totalDaysWorked || 0}
                        </div>
                      </div>
                      <div style={infoCardStyle}>
                        <label style={labelStyle}>Late Count</label>
                        <div style={{ ...valueStyle, fontSize: "24px", fontWeight: 700, color: theme.warning.main }}>
                          {employeeDetails.attendanceStats.totalLate || 0}
                        </div>
                      </div>
                      <div style={infoCardStyle}>
                        <label style={labelStyle}>Early Leave Count</label>
                        <div style={{ ...valueStyle, fontSize: "24px", fontWeight: 700, color: theme.warning.main }}>
                          {employeeDetails.attendanceStats.totalEarlyLeave || 0}
                        </div>
                      </div>
                      <div style={infoCardStyle}>
                        <label style={labelStyle}>Absent Days</label>
                        <div style={{ ...valueStyle, fontSize: "24px", fontWeight: 700, color: theme.error.main }}>
                          {employeeDetails.attendanceStats.totalAbsent || 0}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: theme.neutral.gray500 }}>No attendance data</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

