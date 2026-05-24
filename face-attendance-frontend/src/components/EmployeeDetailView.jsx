import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";

export default function EmployeeDetailView() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("info");
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployeeForModal, setSelectedEmployeeForModal] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isContractEditable, setIsContractEditable] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [managers, setManagers] = useState([]);
  const [user, setUser] = useState(null);

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Error parsing user from localStorage:", error);
      }
    }
    fetchEmployees();
    fetchDepartments();
    fetchJobTitles();
    fetchManagers();
  }, []);

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
        const managerList = (data.employees || []).filter(emp =>
          (emp.role === "admin" || emp.role === "accountant" || emp.isActive)
        );
        setManagers(managerList);
      }
    } catch (error) {
      console.error("Error fetching managers:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setMessage("Failed to load employee list");
    } finally {
      setLoading(false);
    }
  };

  const openEmployeeModal = async (employeeId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/admin/employees/${employeeId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedEmployeeForModal(data.employee || {});
        setShowModal(true);
        setSelectedEmployee(employeeId);
      } else {
        setMessage("Unable to load employee details");
      }
    } catch (error) {
      console.error("Error fetching employee details:", error);
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditForm({
      name: selectedEmployeeForModal.name || "",
      email: selectedEmployeeForModal.email || "",
      phoneNumber: selectedEmployeeForModal.phoneNumber || "",
      address: selectedEmployeeForModal.address || "",
      dateOfBirth: selectedEmployeeForModal.dateOfBirth ? new Date(selectedEmployeeForModal.dateOfBirth).toISOString().split('T')[0] : "",
      gender: selectedEmployeeForModal.gender || "",
      departmentId: selectedEmployeeForModal.departmentId || null,
      jobTitleId: selectedEmployeeForModal.jobTitleId || null,
      baseSalary: selectedEmployeeForModal.baseSalary || 0,
      isActive: selectedEmployeeForModal.isActive !== undefined ? selectedEmployeeForModal.isActive : true,
      startDate: selectedEmployeeForModal.startDate ? new Date(selectedEmployeeForModal.startDate).toISOString().split('T')[0] : "",
      contractType: selectedEmployeeForModal.contractType || "",
      employmentStatus: selectedEmployeeForModal.employmentStatus || "active",
      managerId: selectedEmployeeForModal.managerId || null,
      branchName: selectedEmployeeForModal.branchName || ""
    });
    setIsContractEditable(String(selectedEmployeeForModal.employmentStatus || '').toLowerCase() !== 'suspended');
  };

  // Helper function to calculate max date (18 years ago)
  const getMaxDateOfBirth = () => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return maxDate.toISOString().split('T')[0];
  };

  // Helper function to validate if person is at least 18 years old
  const isAtLeast18 = (dateString) => {
    if (!dateString) return false;
    const birthDate = new Date(dateString);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  };

  // Validate required fields
  const validateRequiredFields = () => {
    const baseRequired = ['name', 'email', 'phoneNumber', 'address', 'gender', 'departmentId', 'jobTitleId', 'contractType', 'startDate'];
    const requiredFields = [...baseRequired];

    // Base salary is editable only for non-managers
    if (user?.role !== 'manager') requiredFields.push('baseSalary');

    // Date of birth should be required for manager role
    if (user?.role === 'manager') requiredFields.push('dateOfBirth');

    const emptyFields = requiredFields.filter(field => !editForm[field] || (typeof editForm[field] === 'string' && editForm[field].trim() === ''));
    
    if (emptyFields.length > 0) {
      const fieldNames = {
        name: 'Full Name',
        email: 'Email',
        phoneNumber: 'Phone Number',
        address: 'Address',
        gender: 'Gender',
        departmentId: 'Department',
        jobTitleId: 'Job Title',
        baseSalary: 'Base Salary',
        contractType: 'Contract Type',
        startDate: 'Start Date',
        dateOfBirth: 'Date of Birth'
      };
      const missingFields = emptyFields.map(f => fieldNames[f] || f).join(', ');
      setMessage(`Error: The following fields are required: ${missingFields}`);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    // Validate required fields
    if (!validateRequiredFields()) {
      return;
    }

    // Validate age if date of birth is provided
    if (editForm.dateOfBirth && !isAtLeast18(editForm.dateOfBirth)) {
      setMessage("Error: Employee must be at least 18 years old");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const payload = {
        ...editForm,
        contractType: editForm.contractType || null,
        startDate: editForm.startDate || null,
        managerId: editForm.managerId ? parseInt(editForm.managerId) : null
      };
      // If contract editing is locked (suspended), preserve original contract values
      if (!isContractEditable) {
        payload.contractType = selectedEmployeeForModal.contractType || null;
        payload.startDate = selectedEmployeeForModal.startDate || null;
      }
      const res = await fetch(`${apiBase}/api/admin/employees/${selectedEmployeeForModal.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        let msg = "✅ Employee information updated successfully!";
        if (data.recalculatedSalaryCount > 0) {
          msg += ` (${data.recalculatedSalaryCount} payroll records recalculated)`;
        }
        setMessage(msg);
        setIsEditing(false);
        openEmployeeModal(selectedEmployeeForModal.id); // Refresh data
        fetchEmployees(); // Refresh list
        setTimeout(() => setMessage(""), 5000);
      } else {
        setMessage("Error: " + (data.message || "Unable to update"));
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: theme.spacing.xl, backgroundColor: theme.neutral.gray50, minHeight: "100vh" }}>
      <h1 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>👤 Employee Detail Information</h1>

      {message && (
        <div
          style={{
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            backgroundColor: message.includes("Error") ? "#f8d7da" : "#d4edda",
            color: message.includes("Error") ? "#721c24" : "#155724",
            borderRadius: theme.radius.md
          }}
        >
          {message}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: theme.spacing.xl }}>
        {/* Employee List */}
        <div
          style={{
            backgroundColor: theme.neutral.white,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.lg,
            boxShadow: theme.shadows.md,
            height: "fit-content"
          }}
        >
          <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>📋 Employee List</h3>

          <input
            type="text"
            placeholder="Search by name or employee code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: theme.spacing.md,
              marginBottom: theme.spacing.lg,
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.neutral.gray300}`
            }}
          />

          <div style={{ maxHeight: "600px", overflowY: "auto" }}>
            {filteredEmployees.length === 0 ? (
              <p style={{ color: theme.neutral.gray500, textAlign: "center", padding: theme.spacing.xl }}>
                No employees found
              </p>
            ) : (
              filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => openEmployeeModal(emp.id)}
                  style={{
                    padding: theme.spacing.md,
                    marginBottom: theme.spacing.sm,
                    backgroundColor: selectedEmployee === emp.id ? theme.primary.main : theme.neutral.gray100,
                    color: selectedEmployee === emp.id ? theme.neutral.white : theme.neutral.gray900,
                    borderRadius: theme.radius.md,
                    cursor: "pointer",
                    transition: theme.transitions.normal,
                    borderLeft: selectedEmployee === emp.id ? `4px solid ${theme.neutral.white}` : "none"
                  }}
                >
                  <div style={{ fontWeight: "600", fontSize: theme.typography.body.fontSize }}>{emp.name}</div>
                  <div style={{ fontSize: theme.typography.small.fontSize, opacity: 0.8 }}>
                    {emp.employeeCode} | {emp.Department?.name || "N/A"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Employee Details - Now shown in modal */}
        <div>
          {!showModal && (
            <div
              style={{
                backgroundColor: theme.neutral.white,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.xxl,
                textAlign: "center",
                color: theme.neutral.gray500
              }}
            >
              <div style={{ fontSize: "3em", marginBottom: theme.spacing.md }}>👈</div>
              <p>Select an employee from the list to view details</p>
            </div>
          )}
        </div>

        {/* Employee Details Modal */}
        {showModal && selectedEmployeeForModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: theme.zIndex.modal,
              padding: theme.spacing.xl
            }}
            onClick={() => {
              setShowModal(false);
              setSelectedEmployeeForModal(null);
            }}
          >
            <div
              style={{
                backgroundColor: theme.neutral.white,
                borderRadius: theme.radius.lg,
                overflow: "hidden",
                boxShadow: theme.shadows.xl,
                maxWidth: "900px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  backgroundColor: theme.primary.main,
                  color: theme.neutral.white,
                  padding: theme.spacing.xl,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <h2 style={{ margin: `0 0 ${theme.spacing.md} 0` }}>{selectedEmployeeForModal.name}</h2>
                  <div style={{ display: "flex", gap: theme.spacing.xl, fontSize: theme.typography.small.fontSize }}>
                    <span><strong>Employee Code:</strong> {selectedEmployeeForModal.employeeCode}</span>
                    <span><strong>Position:</strong> {selectedEmployeeForModal.JobTitle?.name || "N/A"}</span>
                    <span><strong>Department:</strong> {selectedEmployeeForModal.Department?.name || "N/A"}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: theme.spacing.sm }}>
                  {!isEditing && (
                    <button
                      onClick={handleEdit}
                      style={{
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        backgroundColor: "rgba(255,255,255,0.2)",
                        color: theme.neutral.white,
                        border: "none",
                        borderRadius: theme.radius.md,
                        cursor: "pointer",
                        fontWeight: 600
                      }}
                    >
                      ✏️ Edit
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedEmployeeForModal(null);
                      setIsEditing(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: theme.neutral.white,
                      fontSize: "24px",
                      cursor: "pointer",
                      padding: `${theme.spacing.xs} ${theme.spacing.md}`
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: `1px solid ${theme.neutral.gray200}` }}>
                {["info", "attendance", "leave", ...(user?.role !== "manager" ? ["salary"] : [])].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1,
                      padding: theme.spacing.md,
                      border: "none",
                      backgroundColor: activeTab === tab ? theme.primary.main : theme.neutral.white,
                      color: activeTab === tab ? theme.neutral.white : theme.neutral.gray900,
                      cursor: "pointer",
                      fontWeight: activeTab === tab ? "600" : "400",
                      borderBottom: activeTab === tab ? `3px solid ${theme.info.main}` : "none"
                    }}
                  >
                    {tab === "info" && "ℹ️ Information"}
                    {tab === "attendance" && "📍 Attendance"}
                    {tab === "leave" && "📅 Leave"}
                    {tab === "salary" && "💰 Salary"}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div style={{ padding: theme.spacing.xl }}>
                {/* Info Tab */}
                {activeTab === "info" && selectedEmployeeForModal && (
                  <div>
                    <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>Personal Information</h3>

                    {isEditing ? (
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.xl, marginBottom: theme.spacing.xl }}>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Name *</label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Email *</label>
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Phone Number *</label>
                            <input
                              type="text"
                              required
                              value={editForm.phoneNumber}
                              onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>{user?.role === 'manager' ? 'Date of Birth (Must be 18+) *' : 'Date of Birth (Must be 18+)'}</label>
                            <input
                              type="date"
                              required={user?.role === 'manager'}
                              max={getMaxDateOfBirth()}
                              value={editForm.dateOfBirth}
                              onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Gender *</label>
                            <select
                              required
                              value={editForm.gender}
                              onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            >
                              <option value="">Select gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Department *</label>
                            <select
                              required
                              value={editForm.departmentId || ""}
                              onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value ? parseInt(e.target.value) : null })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            >
                              <option value="">Select department</option>
                              {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Position *</label>
                            <select
                              required
                              value={editForm.jobTitleId || ""}
                              onChange={(e) => setEditForm({ ...editForm, jobTitleId: e.target.value ? parseInt(e.target.value) : null })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            >
                              <option value="">Select position</option>
                              {jobTitles.map(job => (
                                <option key={job.id} value={job.id}>{job.name}</option>
                              ))}
                            </select>
                          </div>
                          {user?.role !== "manager" && (
                            <div>
                              <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Base Salary (VND)</label>
                              <input
                                type="number"
                                value={editForm.baseSalary}
                                onChange={(e) => setEditForm({ ...editForm, baseSalary: parseFloat(e.target.value) || 0 })}
                                style={{
                                  width: "100%",
                                  padding: theme.spacing.md,
                                  border: `1px solid ${theme.neutral.gray300}`,
                                  borderRadius: theme.radius.md
                                }}
                              />
                            </div>
                          )}
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Start Date</label>
                            <input
                              type="date"
                              value={editForm.startDate}
                              onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                              disabled={!isContractEditable}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            />
                            <p style={{ margin: theme.spacing.xs, fontSize: theme.typography.small.fontSize, color: theme.neutral.gray500 }}>
                              Used for seniority and annual leave calculations
                            </p>
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Contract Type</label>
                            <select
                              value={editForm.contractType || ""}
                              onChange={(e) => setEditForm({ ...editForm, contractType: e.target.value || null })}
                              disabled={!isContractEditable}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            >
                              <option value="">Select contract type</option>
                              <optgroup label="Probation Contracts">
                                <option value="probation_3_month">Probation (3 months)</option>
                                <option value="probation_6_month">Probation (6 months)</option>
                              </optgroup>
                              <optgroup label="Formal Contracts">
                                <option value="formal_1_year">Formal (1 year)</option>
                                <option value="formal_2_year">Formal (2 years)</option>
                                <option value="formal_3_year">Formal (3 years)</option>
                              </optgroup>
                            </select>
                            {!isContractEditable && (
                              <p style={{ marginTop: 8, color: '#a0aec0', fontSize: theme.typography.small.fontSize }}>
                                Contract fields are locked while the employee is suspended.
                              </p>
                            )}
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Employment Status</label>
                            <select
                              value={editForm.employmentStatus || "active"}
                              onChange={(e) => setEditForm({ ...editForm, employmentStatus: e.target.value })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            >
                              <option value="active">Active</option>
                              <option value="maternity_leave">Maternity Leave</option>
                              <option value="unpaid_leave">Unpaid Leave</option>
                              <option value="suspended">Suspended</option>
                              <option value="terminated">Terminated</option>
                              <option value="resigned">Resigned</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Branch</label>
                            <input
                              type="text"
                              value={editForm.branchName}
                              onChange={(e) => setEditForm({ ...editForm, branchName: e.target.value })}
                              placeholder="Branch/office name"
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Direct Manager</label>
                            <select
                              value={editForm.managerId || ""}
                              onChange={(e) => setEditForm({ ...editForm, managerId: e.target.value ? parseInt(e.target.value) : null })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            >
                              <option value="">Select manager (attendance/leave approver)</option>
                              {managers.filter(m => m.id !== selectedEmployeeForModal?.id).map(mgr => (
                                <option key={mgr.id} value={mgr.id}>
                                  {mgr.name} ({mgr.employeeCode || mgr.email})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Address *</label>
                            <textarea
                              required
                              value={editForm.address}
                              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                              rows={3}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
                              <input
                                type="checkbox"
                                checked={editForm.isActive}
                                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                              />
                              <span style={{ fontWeight: "600" }}>Active</span>
                            </label>
                          </div>
                        </div>
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
                              fontWeight: 600
                            }}
                          >
                            {loading ? "Saving..." : "💾 Save Changes"}
                          </button>
                          <button
                            onClick={() => {
                              setIsEditing(false);
                              setEditForm({});
                            }}
                            style={{
                              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                              backgroundColor: theme.neutral.gray300,
                              color: theme.neutral.gray700,
                              border: "none",
                              borderRadius: theme.radius.md,
                              cursor: "pointer",
                              fontWeight: 600
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.xl, marginBottom: theme.spacing.xl }}>
                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Email:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.email}</p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Phone Number:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.phoneNumber || "Not updated"}</p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Date of Birth:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>
                            {selectedEmployeeForModal.dateOfBirth ? new Date(selectedEmployeeForModal.dateOfBirth).toLocaleDateString('en-US') : "Not updated"}
                          </p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Gender:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.gender || "Not updated"}</p>
                        </div>
                      </div>
                    )}

                    <div style={{ borderTop: `1px solid ${theme.neutral.gray200}`, paddingTop: theme.spacing.xl, marginTop: theme.spacing.xl }}>
                      <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>👨‍👩‍👧‍👦 Dependents</h3>

                      {(() => {
                        const dependents = selectedEmployeeForModal.Dependents || selectedEmployeeForModal.dependents || [];
                        if (!dependents || dependents.length === 0) {
                          return (
                            <p style={{ color: theme.neutral.gray500, fontStyle: "italic" }}>No dependents yet</p>
                          );
                        }
                        return (
                          <div>
                            <div style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.md, backgroundColor: theme.info.bg, borderRadius: theme.radius.md }}>
                              <strong>Total: {dependents.length} people</strong>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.lg }}>
                              {dependents.map((dep, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    padding: theme.spacing.md,
                                    backgroundColor: theme.neutral.gray50,
                                    borderLeft: `3px solid ${theme.info.main}`,
                                    borderRadius: theme.radius.md
                                  }}
                                >
                                  <div style={{ fontWeight: "600", marginBottom: theme.spacing.xs }}>{dep.fullName}</div>
                                  <div style={{ fontSize: theme.typography.small.fontSize, color: theme.neutral.gray600 }}>
                                    <div>Relationship: {dep.relationship}</div>
                                    <div>Date of birth: {dep.dateOfBirth ? new Date(dep.dateOfBirth).toLocaleDateString('en-US') : 'Not updated'}</div>
                                    {dep.gender && <div>Gender: {dep.gender}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div style={{ borderTop: `1px solid ${theme.neutral.gray200}`, paddingTop: theme.spacing.xl, marginTop: theme.spacing.xl }}>
                      <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>📜 Degrees & Certificates</h3>

                      {(() => {
                        const qualifications = selectedEmployeeForModal.Qualifications || selectedEmployeeForModal.qualifications || [];
                        if (!qualifications || qualifications.length === 0) {
                          return (
                            <p style={{ color: theme.neutral.gray500, fontStyle: "italic" }}>No degrees or certificates yet</p>
                          );
                        }

                        return (
                          <div>
                            <div style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.md, backgroundColor: theme.info.bg, borderRadius: theme.radius.md }}>
                              <strong>Total: {qualifications.length} qualifications</strong>
                            </div>

                            {(() => {
                              const grouped = {};
                              qualifications.forEach(q => {
                                if (!grouped[q.type]) grouped[q.type] = [];
                                grouped[q.type].push(q);
                              });
                              return Object.entries(grouped).map(([type, quals]) => (
                                <div key={type} style={{ marginBottom: theme.spacing.lg }}>
                                  <div style={{
                                    fontWeight: "600",
                                    color: theme.primary.main,
                                    padding: theme.spacing.md,
                                    backgroundColor: theme.info.bg,
                                    borderRadius: theme.radius.md,
                                    marginBottom: theme.spacing.md
                                  }}>
                                    {type === 'degree' && '🎓 Degree'}
                                    {type === 'certificate' && '🏅 Certificate'}
                                    {type === 'license' && '📋 License'}
                                    {type === 'training' && '📚 Training'}
                                    <span style={{ marginLeft: theme.spacing.sm, color: theme.neutral.gray600, fontWeight: "400" }}>({quals.length})</span>
                                  </div>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md }}>
                                    {quals.map((qual, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          padding: theme.spacing.md,
                                          backgroundColor: theme.neutral.gray50,
                                          borderLeft: `3px solid ${theme.info.main}`,
                                          borderRadius: theme.radius.md,
                                          fontSize: theme.typography.small.fontSize
                                        }}
                                      >
                                        <div style={{ fontWeight: "600", marginBottom: theme.spacing.xs }}>{qual.name}</div>
                                        {qual.issuedBy && (
                                          <div style={{ color: theme.neutral.gray600, fontSize: theme.typography.tiny.fontSize }}>Issued by: {qual.issuedBy}</div>
                                        )}
                                        {qual.issuedDate && (
                                          <div style={{ color: theme.neutral.gray600, fontSize: theme.typography.tiny.fontSize }}>
                                            Issued date: {new Date(qual.issuedDate).toLocaleDateString('en-US')}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        );
                      })()}
                    </div>

                    <div style={{ borderTop: `1px solid ${theme.neutral.gray200}`, paddingTop: theme.spacing.xl, marginTop: theme.spacing.xl }}>
                      <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>💼 Job Information</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.xl }}>
                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Department/Unit:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.Department?.name || selectedEmployeeForModal.department || "Not updated"}</p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Branch:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.branchName || "Not updated"}</p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Job Title/Position:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.JobTitle?.name || selectedEmployeeForModal.jobTitle || "Not updated"}</p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Contract Type:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>
                            {selectedEmployeeForModal.contractType === "probation" ? "Probation" :
                             selectedEmployeeForModal.contractType === "1_year" ? "1-year contract" :
                             selectedEmployeeForModal.contractType === "3_year" ? "3-year contract" :
                             selectedEmployeeForModal.contractType === "indefinite" ? "Indefinite-term contract" :
                             selectedEmployeeForModal.contractType === "other" ? "Other" : "Not updated"}
                          </p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Employment Status:</label>
                          <p
                            style={{
                              margin: 0,
                              display: "inline-block",
                              padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                              borderRadius: theme.radius.full,
                              backgroundColor: (selectedEmployeeForModal.employmentStatus || selectedEmployeeForModal.isActive) === "active" ? theme.success.bg :
                                selectedEmployeeForModal.employmentStatus === "maternity_leave" ? theme.info.bg :
                                selectedEmployeeForModal.employmentStatus === "unpaid_leave" ? "#fff3cd" :
                                theme.error.bg,
                              color: (selectedEmployeeForModal.employmentStatus || selectedEmployeeForModal.isActive) === "active" ? theme.success.text :
                                selectedEmployeeForModal.employmentStatus === "maternity_leave" ? theme.info.text :
                                selectedEmployeeForModal.employmentStatus === "unpaid_leave" ? "#856404" :
                                theme.error.text
                            }}
                          >
                            {selectedEmployeeForModal.employmentStatus === "active" ? "Active" :
                             selectedEmployeeForModal.employmentStatus === "maternity_leave" ? "Maternity Leave" :
                             selectedEmployeeForModal.employmentStatus === "unpaid_leave" ? "Unpaid Leave" :
                             selectedEmployeeForModal.employmentStatus === "suspended" ? "Suspended" :
                             selectedEmployeeForModal.employmentStatus === "terminated" ? "Terminated" :
                             selectedEmployeeForModal.employmentStatus === "resigned" ? "Resigned" :
                             selectedEmployeeForModal.isActive ? "Active" : "Inactive"}
                          </p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Start Date:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>
                            {selectedEmployeeForModal.startDate ? new Date(selectedEmployeeForModal.startDate).toLocaleDateString('en-US') : "Not updated"}
                          </p>
                          <p style={{ margin: theme.spacing.xs, fontSize: theme.typography.small.fontSize, color: theme.neutral.gray500 }}>
                            (Used for seniority and annual leave calculation)
                          </p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Direct Manager:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>
                            {selectedEmployeeForModal.Manager?.name
                              ? `${selectedEmployeeForModal.Manager.name}${selectedEmployeeForModal.Manager.employeeCode ? ` (${selectedEmployeeForModal.Manager.employeeCode})` : ""}`
                              : "Not updated"}
                          </p>
                          <p style={{ margin: theme.spacing.xs, fontSize: theme.typography.small.fontSize, color: theme.neutral.gray500 }}>
                            Approver for attendance and leave requests
                          </p>
                        </div>

                        {user?.role !== "manager" && (
                          <>
                            <div>
                              <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Salary Grade:</label>
                              <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.SalaryGrade?.name || selectedEmployeeForModal.salaryGrade || "Not updated"}</p>
                            </div>

                            <div>
                              <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Base Salary:</label>
                              <p style={{ margin: 0, color: theme.neutral.gray600, fontWeight: "600" }}>
                                ₫{selectedEmployeeForModal.baseSalary?.toLocaleString("en-US") || "0"}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Attendance Tab */}
                {activeTab === "attendance" && selectedEmployeeForModal && (
                  <div>
                    <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>Attendance Statistics</h3>
                    <p style={{ color: theme.neutral.gray500 }}>Feature under development...</p>
                  </div>
                )}

                {/* Leave Tab */}
                {activeTab === "leave" && selectedEmployeeForModal && (
                  <div>
                    <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>Leave History</h3>
                    <p style={{ color: theme.neutral.gray500 }}>Feature under development...</p>
                  </div>
                )}

                {/* Salary Tab */}
                {activeTab === "salary" && selectedEmployeeForModal && user?.role !== "manager" && (
                  <div>
                    <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>Salary History</h3>
                    <p style={{ color: theme.neutral.gray500 }}>Feature under development...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

