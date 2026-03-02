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
  const [validationErrors, setValidationErrors] = useState({});
  const [attendanceFilter, setAttendanceFilter] = useState(null); // { month, year } | null = auto
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [expandedLeaveId, setExpandedLeaveId] = useState(null); // leave request id whose reason is expanded
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    if (employee) {
      setAttendanceFilter(null); // reset filter on employee switch
      fetchEmployeeDetails();
      fetchDepartments();
      fetchJobTitles();
      fetchManagers();
      setNewPassword(null);
    }
  }, [employee]);

  const fetchAttendanceByFilter = async (month, year) => {
    try {
      setAttendanceLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(
        `${apiBase}/api/admin/employees/${employee.id}/details?month=${month}&year=${year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) {
        setEmployeeDetails(prev => ({
          ...prev,
          attendanceStats: data.employee.attendanceStats,
          recentAttendance: data.employee.recentAttendance
        }));
      }
    } catch (e) {
      console.error("Failed to fetch attendance:", e);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleAttendanceFilterChange = (month, year) => {
    setAttendanceFilter({ month, year });
    fetchAttendanceByFilter(month, year);
  };

  const resetAttendanceFilter = () => {
    setAttendanceFilter(null);
    fetchEmployeeDetails();
  };

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
    } catch (err) {
      setMessage("Error loading employee information");
      console.error("Error loading employee details:", err);
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

  // Validation functions
  const validateField = (fieldName, value) => {
    let error = "";
    
    switch (fieldName) {
      case "name":
        if (!value || value.trim().length < 2) {
          error = "Full Name must be at least 2 characters";
        } else if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(value)) {
          error = "Full Name can only contain letters and spaces";
        }
        break;
      case "idNumber":
        if (!value || value.trim().length === 0) {
          error = "ID Number is required";
        } else if (!/^\d{12}$/.test(value)) {
          error = "ID Number must be exactly 12 digits";
        }
        break;
      case "idIssuePlace":
        // Only validate if ID Number is provided and valid (12 digits)
        if (editForm.idNumber && editForm.idNumber.trim().length === 12) {
          if (!value || value.trim().length < 3) {
            error = "ID Issue Place must be at least 3 characters";
          }
        }
        break;
      case "permanentAddress":
        if (!value || value.trim().length < 10) {
          error = "Permanent Address must be at least 10 characters";
        }
        break;
      case "temporaryAddress":
        if (!value || value.trim().length < 10) {
          error = "Temporary Address must be at least 10 characters";
        }
        break;
      case "personalEmail":
        if (!value || value.trim().length === 0) {
          error = "Personal Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = "Personal Email must be a valid email address";
        }
        break;
      case "emergencyContactName":
        if (!value || value.trim().length < 2) {
          error = "Emergency Contact Name must be at least 2 characters";
        } else if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(value)) {
          error = "Emergency Contact Name can only contain letters and spaces";
        }
        break;
      case "emergencyContactPhone":
        if (!value || value.trim().length === 0) {
          error = "Emergency Contact Phone is required";
        } else if (!/^0\d{9,10}$/.test(value)) {
          error = "Emergency Contact Phone must be a valid Vietnamese phone number (10-11 digits, starts with 0)";
        }
        break;
      default:
        break;
    }
    
    return error;
  };

  const validateForm = () => {
    const errors = {};
    
    // Validate all required fields
    const nameError = validateField("name", editForm.name);
    if (nameError) errors.name = nameError;
    
    const idNumberError = validateField("idNumber", editForm.idNumber);
    if (idNumberError) errors.idNumber = idNumberError;
    
    // Only validate idIssuePlace if idNumber exists and is valid
    if (editForm.idNumber && editForm.idNumber.trim().length === 12) {
      const idIssuePlaceError = validateField("idIssuePlace", editForm.idIssuePlace);
      if (idIssuePlaceError) errors.idIssuePlace = idIssuePlaceError;
    }
    
    const permanentAddressError = validateField("permanentAddress", editForm.permanentAddress);
    if (permanentAddressError) errors.permanentAddress = permanentAddressError;
    
    const temporaryAddressError = validateField("temporaryAddress", editForm.temporaryAddress);
    if (temporaryAddressError) errors.temporaryAddress = temporaryAddressError;
    
    const personalEmailError = validateField("personalEmail", editForm.personalEmail);
    if (personalEmailError) errors.personalEmail = personalEmailError;
    
    const emergencyContactNameError = validateField("emergencyContactName", editForm.emergencyContactName);
    if (emergencyContactNameError) errors.emergencyContactName = emergencyContactNameError;
    
    const emergencyContactPhoneError = validateField("emergencyContactPhone", editForm.emergencyContactPhone);
    if (emergencyContactPhoneError) errors.emergencyContactPhone = emergencyContactPhoneError;
    
    setValidationErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    
    // Debug: log validation errors if any
    if (!isValid) {
      console.log("Validation errors:", errors);
    }
    
    // Return both isValid and errors for scroll functionality
    return { isValid, errors };
  };

  const handleSave = async () => {
    // Validate form before saving
    const { isValid, errors } = validateForm();
    if (!isValid) {
      const errorCount = Object.keys(errors).length;
      setMessage(`Please correct the ${errorCount} error${errorCount > 1 ? 's' : ''} before saving`);
      console.log("Validation errors preventing save:", errors);
      
      // Scroll to first error field
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        // Wait a bit for validation errors to render and state to update
        setTimeout(() => {
          const errorElement = document.querySelector(`[data-field="${firstErrorField}"]`);
          if (errorElement) {
            // Scroll to the element
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add a highlight effect
            const originalBoxShadow = errorElement.style.boxShadow;
            errorElement.style.transition = 'box-shadow 0.3s';
            errorElement.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.3)';
            setTimeout(() => {
              errorElement.style.boxShadow = originalBoxShadow;
            }, 2000);
            
            // Focus on the input field if it exists
            const inputElement = errorElement.querySelector('input, textarea, select');
            if (inputElement) {
              inputElement.focus();
              // Select text if it's an input (not textarea)
              if (inputElement.tagName === 'INPUT' && inputElement.type !== 'date') {
                inputElement.select();
              }
            }
          }
        }, 200);
      }
      
      setTimeout(() => setMessage(""), 5000);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      
      // Sync email and companyEmail - they are the same (company email)
      const companyEmail = editForm.email || editForm.companyEmail || employeeDetails?.email || employeeDetails?.companyEmail;
      const formData = {
        ...editForm,
        email: companyEmail,
        companyEmail: companyEmail
      };
      
      console.log("Saving form data:", formData);
      
      const res = await fetch(`${apiBase}/api/admin/employees/${employee.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      console.log("Save response:", data);
      if (res.ok) {
        setMessage("Updated successfully");
        setValidationErrors({});
        setIsEditing(false);
        fetchEmployeeDetails();
        if (onUpdate) onUpdate();
        setTimeout(() => setMessage(""), 3000);
      } else {
        console.error("Save error:", data);
        setMessage("Error: " + (data.message || "Unable to update"));
        setTimeout(() => setMessage(""), 5000);
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

                  {/* Face Profiles Section */}
                  {employeeDetails?.FaceProfiles && employeeDetails.FaceProfiles.length > 0 && (
                    <div style={{
                      backgroundColor: "#f8f9fa",
                      borderRadius: "12px",
                      padding: "20px",
                      marginBottom: theme.spacing.xl,
                      border: "1px solid #e0e0e0"
                    }}>
                      <div style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "#333",
                        marginBottom: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}>
                        📸 <span>Registered Face Profiles ({employeeDetails.FaceProfiles.length})</span>
                      </div>
                      <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", 
                        gap: "16px" 
                      }}>
                        {employeeDetails.FaceProfiles.map((profile, idx) => (
                          profile.imageUrl ? (
                            <div 
                              key={profile.id}
                              style={{
                                position: "relative",
                                aspectRatio: "1/1",
                                borderRadius: "12px",
                                overflow: "hidden",
                                border: "2px solid #e0e0e0",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                transition: "all 0.3s ease"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.05)";
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                                e.currentTarget.style.borderColor = "#667eea";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                                e.currentTarget.style.borderColor = "#e0e0e0";
                              }}
                            >
                              <img 
                                src={`${import.meta.env.VITE_API_BASE || "http://localhost:5000"}${profile.imageUrl}`}
                                alt={`Face Profile ${idx + 1}`}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover"
                                }}
onError={(e) => {
                                  e.target.parentElement.style.display = 'none';
                                }}
                              />
                              <div style={{
                                position: "absolute",
                                bottom: "4px",
                                right: "4px",
                                backgroundColor: "rgba(0,0,0,0.7)",
                                color: "white",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "10px",
                                fontWeight: "600"
                              }}>
                                #{idx + 1}
                              </div>
                            </div>
                          ) : null
                        ))}
                      </div>
                      <div style={{
                        marginTop: "12px",
                        fontSize: "11px",
                        color: "#999",
                        fontStyle: "italic"
                      }}>
                        Registered on: {new Date(employeeDetails.FaceProfiles[0].createdAt).toLocaleDateString("en-US", { 
                          month: "short", 
                          day: "numeric", 
                          year: "numeric" 
                        })}
                      </div>
                    </div>
                  )}
                  <div style={infoGridStyle} onClick={(e) => e.stopPropagation()}>
                    {/* Employee ID - Read-only */}
                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Employee ID</label>
                      <div style={valueStyle}>{employeeDetails?.employeeCode || employee?.employeeCode || "-"}</div>
                    </div>

                    {/* Full Name */}
                    <div style={infoCardStyle} data-field="name">
                      <label style={labelStyle}>Full Name *</label>
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => {
                              let value = e.target.value;
                              // Auto-capitalize first letter of each word and filter non-alphabetic
                              value = value.replace(/[^a-zA-ZÀ-ỹ\s]/g, '');
                              value = value.split(' ').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                              ).join(' ');
                              setEditForm({ ...editForm, name: value });
                              const error = validateField("name", value);
                              setValidationErrors({ ...validationErrors, name: error });
                            }}
                            onBlur={(e) => {
                              const error = validateField("name", e.target.value);
                              setValidationErrors({ ...validationErrors, name: error });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              ...inputStyle,
                              borderColor: validationErrors.name ? theme.error.main : inputStyle.border
                            }}
                            placeholder="Enter full name"
                          />
                          {validationErrors.name && (
                            <div style={{ color: theme.error.main, fontSize: "12px", marginTop: "4px" }}>
                              {validationErrors.name}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.name || "-"}</div>
                      )}
                    </div>

                    {/* Company Email (Login) - Read-only */}
                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Company Email (Login) *</label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editForm.email || editForm.companyEmail || employeeDetails?.email || employeeDetails?.companyEmail || ""}
                          readOnly
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            ...inputStyle,
                            backgroundColor: theme.neutral.gray100,
                            cursor: "not-allowed"
                          }}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.email || employeeDetails?.companyEmail || "-"}</div>
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

                    {/* ID Number CCCD */}
                    <div style={infoCardStyle} data-field="idNumber">
                      <label style={labelStyle}>ID Number CCCD *</label>
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editForm.idNumber}
                            onChange={(e) => {
                              let value = e.target.value.replace(/\D/g, '').slice(0, 12);
                              setEditForm({ ...editForm, idNumber: value });
                              const error = validateField("idNumber", value);
                              setValidationErrors({ ...validationErrors, idNumber: error });
                            }}
                            onBlur={(e) => {
                              const error = validateField("idNumber", e.target.value);
                              setValidationErrors({ ...validationErrors, idNumber: error });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              ...inputStyle,
                              borderColor: validationErrors.idNumber ? theme.error.main : inputStyle.border
                            }}
                            placeholder="Enter 12-digit CCCD number"
                          />
                          {validationErrors.idNumber && (
                            <div style={{ color: theme.error.main, fontSize: "12px", marginTop: "4px" }}>
                              {validationErrors.idNumber}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.idNumber || "-"}</div>
                      )}
                    </div>

                    {/* ID Issue Date */}
                    <div style={infoCardStyle}>
                      <label style={labelStyle}>ID Issue Date</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.idIssueDate}
                          onChange={(e) => setEditForm({ ...editForm, idIssueDate: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.idIssueDate ? new Date(employeeDetails.idIssueDate).toLocaleDateString('en-US') : "-"}
                        </div>
                      )}
                    </div>

                    {/* ID Issue Place */}
                    <div style={infoCardStyle} data-field="idIssuePlace">
                      <label style={labelStyle}>ID Issue Place *</label>
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editForm.idIssuePlace}
                            onChange={(e) => {
                              setEditForm({ ...editForm, idIssuePlace: e.target.value });
                              const error = validateField("idIssuePlace", e.target.value);
                              setValidationErrors({ ...validationErrors, idIssuePlace: error });
                            }}
                            onBlur={(e) => {
                              const error = validateField("idIssuePlace", e.target.value);
                              setValidationErrors({ ...validationErrors, idIssuePlace: error });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              ...inputStyle,
                              borderColor: validationErrors.idIssuePlace ? theme.error.main : inputStyle.border
                            }}
                            placeholder="Enter ID issue place"
                          />
                          {validationErrors.idIssuePlace && (
                            <div style={{ color: theme.error.main, fontSize: "12px", marginTop: "4px" }}>
                              {validationErrors.idIssuePlace}
                            </div>
                          )}
                        </>
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
                          onClick={(e) => e.stopPropagation()}
                          style={inputStyle}
                        >
                          <option value="">Select education level</option>
                          <option value="high_school">High School</option>
                          <option value="vocational">Vocational</option>
                          <option value="college">College</option>
                          <option value="university">University</option>
                          <option value="master">Master's Degree</option>
                          <option value="phd">PhD</option>
                          <option value="other">Other</option>
                        </select>
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.educationLevel === "high_school" ? "High School" :
                           employeeDetails?.educationLevel === "vocational" ? "Vocational" :
                           employeeDetails?.educationLevel === "college" ? "College" :
                           employeeDetails?.educationLevel === "university" ? "University" :
                           employeeDetails?.educationLevel === "master" ? "Master's Degree" :
                           employeeDetails?.educationLevel === "phd" ? "PhD" :
                           employeeDetails?.educationLevel === "other" ? "Other" : "-"}
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

                    {/* Permanent Address */}
                    <div style={{ ...infoCardStyle, gridColumn: "1 / -1" }} data-field="permanentAddress">
                      <label style={labelStyle}>Permanent Address *</label>
                      {isEditing ? (
                        <>
                          <textarea
                            value={editForm.permanentAddress}
                            onChange={(e) => {
                              setEditForm({ ...editForm, permanentAddress: e.target.value });
                              const error = validateField("permanentAddress", e.target.value);
                              setValidationErrors({ ...validationErrors, permanentAddress: error });
                            }}
                            onBlur={(e) => {
                              const error = validateField("permanentAddress", e.target.value);
                              setValidationErrors({ ...validationErrors, permanentAddress: error });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            rows={3}
                            style={{
                              ...inputStyle,
                              borderColor: validationErrors.permanentAddress ? theme.error.main : inputStyle.border
                            }}
                            placeholder="Enter permanent address (according to household registration)"
                          />
                          {validationErrors.permanentAddress && (
                            <div style={{ color: theme.error.main, fontSize: "12px", marginTop: "4px" }}>
                              {validationErrors.permanentAddress}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.permanentAddress || "-"}</div>
                      )}
                    </div>

                    {/* Temporary Address */}
                    <div style={{ ...infoCardStyle, gridColumn: "1 / -1" }} data-field="temporaryAddress">
                      <label style={labelStyle}>Temporary Address *</label>
                      {isEditing ? (
                        <>
                          <textarea
                            value={editForm.temporaryAddress}
                            onChange={(e) => {
                              setEditForm({ ...editForm, temporaryAddress: e.target.value });
                              const error = validateField("temporaryAddress", e.target.value);
                              setValidationErrors({ ...validationErrors, temporaryAddress: error });
                            }}
                            onBlur={(e) => {
                              const error = validateField("temporaryAddress", e.target.value);
                              setValidationErrors({ ...validationErrors, temporaryAddress: error });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            rows={3}
                            style={{
                              ...inputStyle,
                              borderColor: validationErrors.temporaryAddress ? theme.error.main : inputStyle.border
                            }}
                            placeholder="Enter temporary address (current address)"
                          />
                          {validationErrors.temporaryAddress && (
                            <div style={{ color: theme.error.main, fontSize: "12px", marginTop: "4px" }}>
                              {validationErrors.temporaryAddress}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.temporaryAddress || "-"}</div>
                      )}
                    </div>

                    {/* Personal Email */}
                    <div style={infoCardStyle} data-field="personalEmail">
                      <label style={labelStyle}>Personal Email *</label>
                      {isEditing ? (
                        <>
                          <input
                            type="email"
                            value={editForm.personalEmail}
                            onChange={(e) => {
                              setEditForm({ ...editForm, personalEmail: e.target.value });
                              const error = validateField("personalEmail", e.target.value);
                              setValidationErrors({ ...validationErrors, personalEmail: error });
                            }}
                            onBlur={(e) => {
                              const error = validateField("personalEmail", e.target.value);
                              setValidationErrors({ ...validationErrors, personalEmail: error });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              ...inputStyle,
                              borderColor: validationErrors.personalEmail ? theme.error.main : inputStyle.border
                            }}
                            placeholder="Enter personal email"
                          />
                          {validationErrors.personalEmail && (
                            <div style={{ color: theme.error.main, fontSize: "12px", marginTop: "4px" }}>
                              {validationErrors.personalEmail}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.personalEmail || "-"}</div>
                      )}
                    </div>

                  </div>

                  {/* Emergency Contact Section */}
                  <h3 style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
                    🚨 Emergency Contact
                  </h3>
                  <div style={infoGridStyle} onClick={(e) => e.stopPropagation()}>
                    <div style={infoCardStyle} data-field="emergencyContactName">
                      <label style={labelStyle}>Emergency Contact Name *</label>
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editForm.emergencyContactName}
                            onChange={(e) => {
                              let value = e.target.value;
                              // Auto-capitalize first letter of each word and filter non-alphabetic (including Vietnamese)
                              value = value.replace(/[^a-zA-ZÀ-ỹ\s]/g, '');
                              value = value.split(' ').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                              ).join(' ');
                              setEditForm({ ...editForm, emergencyContactName: value });
                              const error = validateField("emergencyContactName", value);
                              setValidationErrors({ ...validationErrors, emergencyContactName: error });
                            }}
                            onBlur={(e) => {
                              const error = validateField("emergencyContactName", e.target.value);
                              setValidationErrors({ ...validationErrors, emergencyContactName: error });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              ...inputStyle,
                              borderColor: validationErrors.emergencyContactName ? theme.error.main : inputStyle.border
                            }}
                            placeholder="Enter emergency contact name"
                          />
                          {validationErrors.emergencyContactName && (
                            <div style={{ color: theme.error.main, fontSize: "12px", marginTop: "4px" }}>
                              {validationErrors.emergencyContactName}
                            </div>
                          )}
                        </>
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
                          onClick={(e) => e.stopPropagation()}
                          style={inputStyle}
                        >
                          <option value="">Select relationship</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Parent">Parent</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Friend">Friend</option>
                          <option value="Colleague">Colleague</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.emergencyContactRelationship === "Spouse" ? "Spouse" :
                           employeeDetails?.emergencyContactRelationship === "Parent" ? "Parent" :
                           employeeDetails?.emergencyContactRelationship === "Sibling" ? "Sibling" :
                           employeeDetails?.emergencyContactRelationship === "Friend" ? "Friend" :
                           employeeDetails?.emergencyContactRelationship === "Colleague" ? "Colleague" :
                           employeeDetails?.emergencyContactRelationship === "Other" ? "Other" :
                           employeeDetails?.emergencyContactRelationship || "-"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle} data-field="emergencyContactPhone">
                      <label style={labelStyle}>Emergency Contact Phone *</label>
                      {isEditing ? (
                        <>
                          <input
                            type="tel"
                            value={editForm.emergencyContactPhone}
                            onChange={(e) => {
                              let value = e.target.value.replace(/\D/g, '').slice(0, 11);
                              setEditForm({ ...editForm, emergencyContactPhone: value });
                              const error = validateField("emergencyContactPhone", value);
                              setValidationErrors({ ...validationErrors, emergencyContactPhone: error });
                            }}
                            onBlur={(e) => {
                              const error = validateField("emergencyContactPhone", e.target.value);
                              setValidationErrors({ ...validationErrors, emergencyContactPhone: error });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              ...inputStyle,
                              borderColor: validationErrors.emergencyContactPhone ? theme.error.main : inputStyle.border
                            }}
                            placeholder="Enter emergency contact phone (10-11 digits, starts with 0)"
                          />
                          {validationErrors.emergencyContactPhone && (
                            <div style={{ color: theme.error.main, fontSize: "12px", marginTop: "4px" }}>
                              {validationErrors.emergencyContactPhone}
                            </div>
                          )}
                        </>
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
                          <option value="probation">Probation</option>
                          <option value="1_year">1-year contract</option>
                          <option value="3_year">3-year contract</option>
                          <option value="indefinite">Indefinite-term contract</option>
                          <option value="other">Other</option>
                        </select>
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.contractType === "probation" ? "Probation" :
                           employeeDetails?.contractType === "1_year" ? "1-year contract" :
                           employeeDetails?.contractType === "3_year" ? "3-year contract" :
                           employeeDetails?.contractType === "indefinite" ? "Indefinite-term contract" :
                           employeeDetails?.contractType === "other" ? "Other" : "-"}
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
                          <option value="active">Active</option>
                          <option value="maternity_leave">Maternity Leave</option>
                          <option value="unpaid_leave">Unpaid Leave</option>
                          <option value="suspended">Suspended</option>
                          <option value="terminated">Terminated</option>
                          <option value="resigned">Resigned</option>
                        </select>
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.employmentStatus === "active" ? "Active" :
                           employeeDetails?.employmentStatus === "maternity_leave" ? "Maternity Leave" :
                           employeeDetails?.employmentStatus === "unpaid_leave" ? "Unpaid Leave" :
                           employeeDetails?.employmentStatus === "suspended" ? "Suspended" :
                           employeeDetails?.employmentStatus === "terminated" ? "Terminated" :
                           employeeDetails?.employmentStatus === "resigned" ? "Resigned" : "-"}
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
                          {(() => {
                            const dependents = employeeDetails?.Dependents || employeeDetails?.dependents || [];
                            const count = dependents.length;
                            return (
                              <>
                                {count} {count === 1 ? "person" : "people"}
                              </>
                            );
                          })()}
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
                  {(() => {
                    const dependents = employeeDetails?.Dependents || employeeDetails?.dependents || [];
                    if (!dependents || dependents.length === 0) {
                      return (
                        <p style={{ color: theme.neutral.gray500, fontStyle: "italic" }}>No dependents</p>
                      );
                    }
                    return (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: theme.spacing.md }}>
                      {dependents.map((dep) => (
                        <div
                          key={dep.id}
                          style={{
                            padding: theme.spacing.md,
                            backgroundColor: theme.neutral.gray50,
                            borderRadius: theme.radius.md,
                            border: `1px solid ${theme.neutral.gray200}`
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              marginBottom: theme.spacing.xs,
                              fontSize: "16px"
                            }}
                          >
                            {dep.fullName || "-"}
                          </div>
                          <div
                            style={{
                              fontSize: "14px",
                              color: theme.neutral.gray600,
                              display: "flex",
                              flexDirection: "column",
                              gap: 2
                            }}
                          >
                            <div>
                              <strong>Relationship:</strong> {dep.relationship || "-"}
                            </div>
                            {dep.gender && (
                              <div>
                                <strong>Gender:</strong> {dep.gender}
                              </div>
                            )}
                            {dep.dateOfBirth && (
                              <div>
                                <strong>Date of Birth:</strong>{" "}
                                {new Date(dep.dateOfBirth).toLocaleDateString("en-GB")}
                              </div>
                            )}
                            {dep.idNumber && (
                              <div>
                                <strong>ID Number:</strong> {dep.idNumber}
                              </div>
                            )}
                            {dep.address && (
                              <div>
                                <strong>Address:</strong> {dep.address}
                              </div>
                            )}
                            {dep.phoneNumber && (
                              <div>
                                <strong>Phone Number:</strong> {dep.phoneNumber}
                              </div>
                            )}
                            {dep.email && (
                              <div>
                                <strong>Email:</strong> {dep.email}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab: Bằng cấp */}
              {activeTab === "qualifications" && (
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
                    Qualifications and Certificates
                  </h3>
                  {(() => {
                    const qualifications = employeeDetails?.Qualifications || employeeDetails?.qualifications || [];
                    if (!qualifications || qualifications.length === 0) {
                      return (
                        <p style={{ color: theme.neutral.gray500, fontStyle: "italic" }}>No qualifications or certificates</p>
                      );
                    }
                    return (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: theme.spacing.md }}>
                      {qualifications.map((qual) => (
                        <div key={qual.id} style={{
                          padding: theme.spacing.md,
                          backgroundColor: theme.neutral.gray50,
                          borderRadius: theme.radius.md,
                          border: `1px solid ${theme.neutral.gray200}`
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs, fontSize: "16px" }}>
                            {qual.name}
                          </div>
                          <div style={{ fontSize: "14px", color: theme.neutral.gray600, display: "flex", flexDirection: "column", gap: 2 }}>
                            <div>Type: {qual.type}</div>
                            {qual.issuedBy && <div><strong>Issued by:</strong> {qual.issuedBy}</div>}
                            {qual.issuedDate && (
                              <div>
                                <strong>Issued date:</strong>{" "}
                                {new Date(qual.issuedDate).toLocaleDateString('en-US')}
                              </div>
                            )}
                            {qual.expiryDate && (
                              <div>
                                <strong>Expiry date:</strong>{" "}
                                {new Date(qual.expiryDate).toLocaleDateString('en-US')}
                              </div>
                            )}
                            {qual.certificateNumber && (
                              <div>
                                <strong>Certificate No.:</strong> {qual.certificateNumber}
                              </div>
                            )}
                            {qual.description && (
                              <div>
                                <strong>Description:</strong> {qual.description}
                              </div>
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
                    );
                  })()}
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
                  {/* Header row: title + month/year filter */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
                    <h3 style={{ margin: 0, color: theme.primary.main }}>Attendance Statistics</h3>

                    {/* Month / Year picker */}
                    {(() => {
                      const now = new Date();
                      const dispMonth = attendanceFilter?.month ?? employeeDetails?.attendanceStats?.month ?? (now.getMonth() + 1);
                      const dispYear  = attendanceFilter?.year  ?? employeeDetails?.attendanceStats?.year  ?? now.getFullYear();
                      const isCurrentMonth = dispMonth === now.getMonth() + 1 && dispYear === now.getFullYear();

                      const goPrev = () => {
                        const m = dispMonth === 1 ? 12 : dispMonth - 1;
                        const y = dispMonth === 1 ? dispYear - 1 : dispYear;
                        if (y < 2020) return;
                        handleAttendanceFilterChange(m, y);
                      };
                      const goNext = () => {
                        if (isCurrentMonth) return;
                        const m = dispMonth === 12 ? 1 : dispMonth + 1;
                        const y = dispMonth === 12 ? dispYear + 1 : dispYear;
                        handleAttendanceFilterChange(m, y);
                      };
                      const monthLabel = new Date(dispYear, dispMonth - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

                      const btnStyle = (disabled) => ({
                        width: 32, height: 32, borderRadius: 8, border: `1px solid ${theme.neutral.gray200}`,
                        background: disabled ? theme.neutral.gray100 : "#fff",
                        color: disabled ? theme.neutral.gray400 : theme.neutral.gray700,
                        cursor: disabled ? "not-allowed" : "pointer",
                        fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center"
                      });

                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button onClick={goPrev} style={btnStyle(dispYear <= 2020 && dispMonth === 1)} title="Previous month">‹</button>
                          <span style={{
                            minWidth: 150, textAlign: "center", fontWeight: 600, fontSize: 14,
                            color: theme.neutral.gray800, padding: "4px 12px",
                            border: `1px solid ${theme.neutral.gray200}`, borderRadius: 8, background: "#fff"
                          }}>
                            {attendanceLoading ? "Loading…" : monthLabel}
                          </span>
                          <button onClick={goNext} style={btnStyle(isCurrentMonth)} title="Next month">›</button>
                          {!isCurrentMonth && (
                            <button
                              onClick={resetAttendanceFilter}
                              style={{
                                height: 32, padding: "0 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                                border: `1px solid ${theme.primary.main}`, background: theme.primary.main,
                                color: "#fff", cursor: "pointer"
                              }}
                            >
                              Current
                            </button>
                          )}
                          {employeeDetails?.attendanceStats?.isFallback && !attendanceFilter && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                              color: theme.warning?.main || "#d97706",
                              backgroundColor: `${theme.warning?.main || "#d97706"}15`,
                              border: `1px solid ${theme.warning?.main || "#d97706"}40`
                            }}>Auto: Prev Month</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {employeeDetails?.attendanceStats ? (
                    <>
                    <div style={infoGridStyle}>
                      <div style={infoCardStyle}>
                        <label style={labelStyle}>Total Days Worked</label>
                        <div style={{ ...valueStyle, fontSize: "24px", fontWeight: 700, color: theme.primary.main }}>
                          {employeeDetails.attendanceStats.totalDaysWorked || 0}
                          {employeeDetails.attendanceStats.totalDays ? (
                            <span style={{ fontSize: 12, color: theme.neutral.gray500, marginLeft: 8 }}>
                              / {employeeDetails.attendanceStats.totalDays} working days
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div style={infoCardStyle}>
                        <label style={labelStyle}>Late Days</label>
                        <div style={{ ...valueStyle, fontSize: "24px", fontWeight: 700, color: theme.warning.main }}>
                          {employeeDetails.attendanceStats.totalLate || 0}
                        </div>
                      </div>
                      <div style={infoCardStyle}>
                        <label style={labelStyle}>Early Leave Days</label>
                        <div style={{ ...valueStyle, fontSize: "24px", fontWeight: 700, color: theme.warning.main }}>
                          {employeeDetails.attendanceStats.totalEarlyLeave || 0}
                        </div>
                      </div>
                      <div style={infoCardStyle}>
                        <label style={labelStyle}>Absent Days</label>
                        <div style={{ ...valueStyle, fontSize: "24px", fontWeight: 700, color: theme.error.main }}>
                          {employeeDetails.attendanceStats.totalAbsent || 0}
                        </div>
                        <span style={{ fontSize: 11, color: theme.neutral.gray400 }}>to date, excl. weekends</span>
                      </div>
                    </div>

                      {/* Attendance log table */}
                      <div style={{ marginTop: theme.spacing.xl }}>
                        <h4 style={{ margin: 0, marginBottom: theme.spacing.md, color: theme.neutral.gray800 }}>
                          Attendance Log ({new Date(employeeDetails.attendanceStats.year, employeeDetails.attendanceStats.month - 1)
                            .toLocaleDateString("en-US", { month: "long", year: "numeric" })})
                        </h4>
                        {attendanceLoading ? (
                          <p style={{ color: theme.neutral.gray400, fontStyle: "italic" }}>Loading attendance data…</p>
                        ) : employeeDetails?.recentAttendance && employeeDetails.recentAttendance.length > 0 ? (
                          <div style={{ overflowX: "auto", border: `1px solid ${theme.neutral.gray200}`, borderRadius: theme.radius.lg }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                              <thead>
                                <tr style={{ backgroundColor: theme.neutral.gray50, borderBottom: `1px solid ${theme.neutral.gray200}` }}>
                                  <th style={{ textAlign: "left", padding: theme.spacing.md, fontSize: 12, textTransform: "uppercase", color: theme.neutral.gray700 }}>Date</th>
                                  <th style={{ textAlign: "left", padding: theme.spacing.md, fontSize: 12, textTransform: "uppercase", color: theme.neutral.gray700 }}>Check-in</th>
                                  <th style={{ textAlign: "left", padding: theme.spacing.md, fontSize: 12, textTransform: "uppercase", color: theme.neutral.gray700 }}>Check-out</th>
                                  <th style={{ textAlign: "left", padding: theme.spacing.md, fontSize: 12, textTransform: "uppercase", color: theme.neutral.gray700 }}>Total Hours</th>
                                  <th style={{ textAlign: "left", padding: theme.spacing.md, fontSize: 12, textTransform: "uppercase", color: theme.neutral.gray700 }}>Status</th>
                                  <th style={{ textAlign: "left", padding: theme.spacing.md, fontSize: 12, textTransform: "uppercase", color: theme.neutral.gray700 }}>Late Duration</th>
                                </tr>
                              </thead>
                              <tbody>
                                {employeeDetails.recentAttendance.map((row, idx) => {
                                  const checkIn = row.checkIn ? new Date(row.checkIn) : null;
                                  const checkOut = row.checkOut ? new Date(row.checkOut) : null;
                                  const flags = row.flags || {};
                                  const isAbsent = row.isAbsent === true;
                                  const isOnLeave = isAbsent && !!row.leaveInfo;
                                  const leaveTypeLabel = {
                                    paid: "Paid", unpaid: "Unpaid", sick: "Sick",
                                    maternity: "Maternity", personal: "Personal", other: "Other"
                                  }[row.leaveInfo?.type] || row.leaveInfo?.type || "";

                                  // Total working hours
                                  const totalHours = (() => {
                                    if (!checkIn || !checkOut) return null;
                                    const diff = checkOut - checkIn;
                                    const h = Math.floor(diff / 3600000);
                                    const m = Math.floor((diff % 3600000) / 60000);
                                    return `${h}h ${m}m`;
                                  })();

                                  // Late duration (how many minutes past 08:00 VN)
                                  const lateDuration = (() => {
                                    if (!checkIn || !flags.isLate) return null;
                                    const standard = new Date(checkIn);
                                    standard.setHours(8, 0, 0, 0);
                                    const mins = Math.floor((checkIn - standard) / 60000);
                                    return mins > 0 ? `${mins} min` : null;
                                  })();

                                  const rowBg = isOnLeave ? "#e0f2fe20"
                                    : isAbsent ? `${theme.error.main}08`
                                    : flags.isLate ? "#fffbeb50"
                                    : "transparent";

                                  // Status chips — mirrors employee Attendance History
                                  const chips = [];
                                  if (isOnLeave) {
                                    chips.push({ label: "On Leave", sub: leaveTypeLabel || null, color: "#0284c7" });
                                  } else if (isAbsent) {
                                    chips.push({ label: "Absent", sub: null, color: theme.error.main });
                                  } else {
                                    // Check-in status
                                    if (flags.isLate) {
                                      chips.push({ label: "Late", color: "#dc3545" });
                                    } else {
                                      chips.push({ label: "On Time", color: "#28a745" });
                                    }
                                    // Check-out status
                                    if (flags.isEarlyLeave) {
                                      chips.push({ label: "Early Leave", color: "#d97706" });
                                    } else if (flags.isOvertime) {
                                      chips.push({ label: "Overtime", color: "#007bff" });
                                    }
                                  }

                                  return (
                                    <tr
                                      key={idx}
                                      style={{
                                        borderBottom: `1px solid ${theme.neutral.gray100}`,
                                        backgroundColor: rowBg
                                      }}
                                    >
                                      <td style={{ padding: theme.spacing.md, fontWeight: 700, color: isOnLeave ? "#0284c7" : isAbsent ? theme.error.main : theme.neutral.gray800 }}>
                                        {row.date ? new Date(row.date + "T00:00:00").toLocaleDateString("vi-VN") : "-"}
                                      </td>
                                      <td style={{ padding: theme.spacing.md }}>
                                        {checkIn ? (
                                          <span style={{ fontSize: 14, fontWeight: 600, color: flags.isLate ? "#dc3545" : "#28a745" }}>
                                            {checkIn.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                          </span>
                                        ) : <span style={{ color: theme.neutral.gray400 }}>—</span>}
                                      </td>
                                      <td style={{ padding: theme.spacing.md }}>
                                        {checkOut ? (
                                          <span style={{ fontSize: 14, fontWeight: 600, color: flags.isEarlyLeave ? "#d97706" : theme.neutral.gray700 }}>
                                            {checkOut.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                          </span>
                                        ) : <span style={{ color: theme.neutral.gray400 }}>—</span>}
                                      </td>
                                      <td style={{ padding: theme.spacing.md }}>
                                        {totalHours ? (
                                          <span style={{ fontSize: 14, fontWeight: 600, color: "#007bff" }}>{totalHours}</span>
                                        ) : <span style={{ color: theme.neutral.gray400 }}>—</span>}
                                      </td>
                                      <td style={{ padding: theme.spacing.md }}>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                          {chips.map((chip, ci) => (
                                            <span key={ci} style={{
                                              display: "inline-flex", alignItems: "center", gap: 4,
                                              padding: "4px 12px", borderRadius: 4,
                                              fontWeight: 600, fontSize: 11,
                                              textTransform: "uppercase", letterSpacing: "0.5px",
                                              color: "#fff",
                                              backgroundColor: chip.color
                                            }}>
                                              {chip.label}
                                              {chip.sub && <span style={{ fontWeight: 500, fontSize: 10, opacity: 0.9 }}>({chip.sub})</span>}
                                            </span>
                                          ))}
                                        </div>
                                      </td>
                                      <td style={{ padding: theme.spacing.md }}>
                                        {lateDuration ? (
                                          <span style={{
                                            backgroundColor: "#fff3cd", color: "#856404",
                                            padding: "3px 10px", borderRadius: 12,
                                            fontSize: 13, fontWeight: 600
                                          }}>{lateDuration}</span>
                                        ) : <span style={{ color: theme.neutral.gray400 }}>—</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p style={{ color: theme.neutral.gray500, margin: 0, fontStyle: "italic" }}>No attendance records this month</p>
                        )}

                        {/* Leave Requests This Month */}
                        {employeeDetails?.monthLeaveRequests && employeeDetails.monthLeaveRequests.length > 0 && (
                          <div style={{ marginTop: 24 }}>
                            <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700, color: theme.neutral.gray800 }}>
                              Leave Requests This Month
                            </h4>
                            <div style={{ border: `1px solid #bae6fd`, borderRadius: theme.radius.lg, overflow: "hidden" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ backgroundColor: "#f0f9ff", borderBottom: `1px solid #bae6fd` }}>
                                    <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, textTransform: "uppercase", color: "#0369a1" }}>Type</th>
                                    <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, textTransform: "uppercase", color: "#0369a1" }}>Period</th>
                                    <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, textTransform: "uppercase", color: "#0369a1" }}>Days</th>
                                    <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, textTransform: "uppercase", color: "#0369a1" }}>Status</th>
                                    <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, textTransform: "uppercase", color: "#0369a1" }}>Reason</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {employeeDetails.monthLeaveRequests.map((lr, lrIdx) => {
                                    const leaveTypeLabel = {
                                      paid: "Paid", unpaid: "Unpaid", sick: "Sick",
                                      maternity: "Maternity", personal: "Personal", other: "Other"
                                    }[lr.type] || lr.type;
                                    const statusColors = {
                                      approved: { color: "#16a34a", bg: "#dcfce7" },
                                      pending:  { color: "#b45309", bg: "#fef9c3" },
                                      rejected: { color: "#dc2626", bg: "#fee2e2" }
                                    };
                                    const sc = statusColors[lr.status] || { color: "#6b7280", bg: "#f3f4f6" };
                                    const isExpanded = expandedLeaveId === lr.id;
                                    return (
                                      <React.Fragment key={lr.id}>
                                        <tr style={{ borderBottom: isExpanded ? "none" : `1px solid #e0f2fe`, backgroundColor: lrIdx % 2 === 0 ? "#fff" : "#f8fcff" }}>
                                          <td style={{ padding: "10px 14px", fontWeight: 600, fontSize: 13, color: "#0284c7" }}>{leaveTypeLabel}</td>
                                          <td style={{ padding: "10px 14px", fontSize: 13, color: theme.neutral.gray700 }}>
                                            {new Date(lr.startDate + "T00:00:00").toLocaleDateString("vi-VN")} – {new Date(lr.endDate + "T00:00:00").toLocaleDateString("vi-VN")}
                                          </td>
                                          <td style={{ padding: "10px 14px", fontSize: 13, color: theme.neutral.gray700 }}>{lr.days} day{lr.days !== 1 ? "s" : ""}</td>
                                          <td style={{ padding: "10px 14px" }}>
                                            <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, color: sc.color, backgroundColor: sc.bg }}>
                                              {lr.status.charAt(0).toUpperCase() + lr.status.slice(1)}
                                            </span>
                                          </td>
                                          <td style={{ padding: "10px 14px" }}>
                                            <button
                                              onClick={() => setExpandedLeaveId(isExpanded ? null : lr.id)}
                                              style={{
                                                cursor: "pointer", background: "none", border: `1px solid #7dd3fc`,
                                                borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#0284c7",
                                                fontWeight: 600
                                              }}
                                            >
                                              {isExpanded ? "Hide" : "View Reason"}
                                            </button>
                                          </td>
                                        </tr>
                                        {isExpanded && (
                                          <tr style={{ borderBottom: `1px solid #e0f2fe`, backgroundColor: lrIdx % 2 === 0 ? "#fff" : "#f8fcff" }}>
                                            <td colSpan={5} style={{ padding: "8px 14px 14px 14px" }}>
                                              <div style={{ backgroundColor: "#f0f9ff", border: `1px solid #bae6fd`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: theme.neutral.gray700, lineHeight: 1.6 }}>
                                                <strong style={{ color: "#0369a1" }}>Reason: </strong>
                                                {lr.reason || <em style={{ color: theme.neutral.gray500 }}>No reason provided</em>}
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
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

