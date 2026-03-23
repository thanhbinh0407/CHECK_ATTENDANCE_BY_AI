import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";
import "./EmployeeManagement.css";

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [tempPassword, setTempPassword] = useState("");
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchEmployees();
  }, []);

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
        setMessage("");
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setMessage("Error loading employee list");
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = async (employee) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      
      // First, set the employee data we already have
      setSelectedEmployee(employee);
      
      // Then try to fetch full details
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${apiBase}/api/admin/employees/${employee.id}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        // Merge fetched details with existing employee data
        setSelectedEmployee(data.employee || employee);
        setTempPassword("");
        setShowTempPassword(false);
      } else {
        // If API fails, keep the employee data we already have
        setSelectedEmployee(employee);
      }
    } catch (error) {
      console.error("Error fetching details:", error);
      // On error, still show the employee data
      setSelectedEmployee(employee);
      setMessage("⚠ Loaded basic employee information");
    } finally {
      setLoading(false);
    }
  };

  const resetAndRevealPassword = async () => {
    if (!selectedEmployee?.id) return;
    try {
      setPasswordLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/admin/employees/${selectedEmployee.id}/reset-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage("✗ Error resetting password: " + (data.message || "Unknown error"));
        return;
      }
      setTempPassword(data.newPassword || "");
      setShowTempPassword(true);
      setMessage("✓ Password has been reset. Share the temporary password with the employee.");
    } catch (err) {
      setMessage("✗ Error: " + err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee({ ...employee });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/admin/employees/${editingEmployee.id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: editingEmployee.name,
          email: editingEmployee.email,
          phone: editingEmployee.phone,
          baseSalary: editingEmployee.baseSalary,
          startDate: editingEmployee.startDate,
          effectiveDate: editingEmployee.effectiveDate,
          historyNote: editingEmployee.historyNote,
          salaryChangeReason: editingEmployee.salaryChangeReason
        })
      });

      if (res.ok) {
        setMessage("✓ Employee information updated successfully");
        setShowEditModal(false);
        fetchEmployees();
      } else {
        setMessage("✗ Error updating employee information");
      }
    } catch (error) {
      setMessage("✗ Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const containerStyle = {
    padding: "20px",
    backgroundColor: theme.colors.light,
    minHeight: "100vh"
  };

  const headerStyle = {
    color: theme.colors.primary,
    marginBottom: "20px",
    fontSize: "24px",
    fontWeight: "700"
  };

  const searchBoxStyle = {
    marginBottom: "20px",
    display: "flex",
    gap: "10px"
  };

  const searchInputStyle = {
    flex: 1,
    padding: "10px 15px",
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "5px",
    fontSize: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  };

  const tableContainerStyle = {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    overflow: "hidden"
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse"
  };

  const headerCellStyle = {
    padding: "15px",
    backgroundColor: theme.colors.primary,
    color: "white",
    fontWeight: "600",
    textAlign: "left",
    borderBottom: `2px solid ${theme.colors.border}`
  };

  const cellStyle = {
    padding: "12px 15px",
    borderBottom: `1px solid ${theme.colors.border}`,
    fontSize: "14px"
  };

  const rowStyle = {
    transition: "background-color 0.2s",
    cursor: "pointer"
  };

  const actionButtonStyle = {
    padding: "6px 12px",
    marginRight: "5px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    transition: "all 0.2s"
  };

  const editButtonStyle = {
    ...actionButtonStyle,
    backgroundColor: theme.colors.primary,
    color: "white"
  };

  const detailsButtonStyle = {
    ...actionButtonStyle,
    backgroundColor: "#17a2b8",
    color: "white"
  };

  const modalOverlayStyle = {
    display: showEditModal ? "flex" : "none",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  };

  const modalStyle = {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "30px",
    maxWidth: "500px",
    width: "90%",
    maxHeight: "80vh",
    overflowY: "auto",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
  };

  const formGroupStyle = {
    marginBottom: "15px"
  };

  const labelStyle = {
    display: "block",
    fontWeight: "600",
    marginBottom: "5px",
    color: theme.colors.primary
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "4px",
    fontSize: "14px",
    boxSizing: "border-box"
  };

  const buttonGroupStyle = {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
    justifyContent: "flex-end"
  };

  const cancelButtonStyle = {
    padding: "10px 20px",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "600"
  };

  const saveButtonStyle = {
    padding: "10px 20px",
    backgroundColor: theme.colors.primary,
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "600"
  };

  const detailsModalStyle = {
    ...modalStyle,
    maxWidth: "700px"
  };

  const detailSectionStyle = {
    marginBottom: "20px",
    paddingBottom: "15px",
    borderBottom: `1px solid ${theme.colors.border}`
  };

  const detailTitleStyle = {
    color: theme.colors.primary,
    fontWeight: "700",
    marginBottom: "10px",
    fontSize: "16px"
  };

  const detailItemStyle = {
    display: "grid",
    gridTemplateColumns: "150px 1fr",
    gap: "10px",
    marginBottom: "8px",
    fontSize: "14px"
  };

  return (
    <div className="emp-container">
      {/* Header Section */}
      <div className="emp-header">
        <div className="emp-header-content">
          <h1 className="emp-title">Employee Management</h1>
          <p className="emp-subtitle">Manage and view employee information</p>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`emp-alert ${message.includes("✗") ? "emp-alert-error" : "emp-alert-success"}`}>
          {message}
        </div>
      )}

      {/* Search Bar */}
      <div className="emp-search-container">
        <div className="emp-search-box">
          <input
            type="text"
            placeholder="Search by employee name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="emp-search-input"
          />
          <button
            onClick={fetchEmployees}
            className="emp-btn emp-btn-refresh"
            disabled={loading}
          >
            <span className="emp-btn-icon">🔄</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="emp-loading">
          <div className="emp-spinner"></div>
          <p>Loading employee data...</p>
        </div>
      )}

      {/* Table Section */}
      {!loading && filteredEmployees.length > 0 && (
        <div className="emp-table-wrapper">
          <table className="emp-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Full Name</th>
                <th>Department</th>
                <th>Job Title</th>
                <th>Start Date</th>
                <th>Salary Grade</th>
                <th>Base Salary</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="emp-table-row">
                  <td className="emp-id">{employee.employeeCode}</td>
                  <td className="emp-name">{employee.name}</td>
                  <td>{employee.Department?.name || "—"}</td>
                  <td>{employee.JobTitle?.name || "—"}</td>
                  <td>
                    {employee.startDate
                      ? new Date(employee.startDate).toLocaleDateString("en-US", { 
                          year: "numeric", 
                          month: "short", 
                          day: "numeric" 
                        })
                      : "—"}
                  </td>
                  <td className="emp-grade">{employee.SalaryGrade?.code || "—"}</td>
                  <td className="emp-salary">
                    {employee.baseSalary
                      ? new Intl.NumberFormat("en-US", { 
                          style: "currency", 
                          currency: "USD",
                          minimumFractionDigits: 0
                        }).format(employee.baseSalary)
                      : "—"}
                  </td>
                  <td className="emp-actions">
                    <button
                      onClick={() => viewDetails(employee)}
                      className="emp-btn emp-btn-view"
                      title="View Details"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(employee)}
                      className="emp-btn emp-btn-edit"
                      title="Edit Employee"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredEmployees.length === 0 && (
        <div className="emp-empty">
          <div className="emp-empty-icon">🔍</div>
          <h3>No employees found</h3>
          <p>Try adjusting your search criteria</p>
        </div>
      )}

      {/* Edit Modal */}
      <div 
        className={`emp-modal-overlay ${showEditModal ? "emp-modal-active" : ""}`}
        onClick={() => setShowEditModal(false)}
      >
        <div
          className="emp-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="emp-modal-header">
            <h2>Update Employee Information</h2>
            <button 
              className="emp-modal-close"
              onClick={() => setShowEditModal(false)}
            >
              ×
            </button>
          </div>

          <div className="emp-modal-body">
            <div className="emp-form-group">
              <label className="emp-label">Full Name</label>
              <input
                type="text"
                className="emp-input"
                value={editingEmployee?.name || ""}
                onChange={(e) =>
                  setEditingEmployee({ ...editingEmployee, name: e.target.value })
                }
                placeholder="Enter full name"
              />
            </div>

            <div className="emp-form-group">
              <label className="emp-label">Email Address</label>
              <input
                type="email"
                className="emp-input"
                value={editingEmployee?.email || ""}
                onChange={(e) =>
                  setEditingEmployee({ ...editingEmployee, email: e.target.value })
                }
                placeholder="Enter email address"
              />
            </div>

            <div className="emp-form-group">
              <label className="emp-label">Phone Number</label>
              <input
                type="text"
                className="emp-input"
                value={editingEmployee?.phone || ""}
                onChange={(e) =>
                  setEditingEmployee({ ...editingEmployee, phone: e.target.value })
                }
                placeholder="Enter phone number"
              />
            </div>

            <div className="emp-form-group">
              <label className="emp-label">Base Salary</label>
              <input
                type="number"
                className="emp-input"
                value={editingEmployee?.baseSalary || 0}
                onChange={(e) =>
                  setEditingEmployee({
                    ...editingEmployee,
                    baseSalary: parseFloat(e.target.value)
                  })
                }
                placeholder="Enter base salary"
              />
            </div>

            <div className="emp-form-group">
              <label className="emp-label">Start Date</label>
              <input
                type="date"
                className="emp-input"
                value={editingEmployee?.startDate
                  ? editingEmployee.startDate.split("T")[0]
                  : ""}
                onChange={(e) =>
                  setEditingEmployee({
                    ...editingEmployee,
                    startDate: e.target.value
                  })
                }
              />
            </div>

            <div className="emp-form-group">
              <label className="emp-label">Effective Date</label>
              <input
                type="date"
                className="emp-input"
                value={editingEmployee?.effectiveDate || ""}
                onChange={(e) =>
                  setEditingEmployee({
                    ...editingEmployee,
                    effectiveDate: e.target.value
                  })
                }
              />
            </div>

            <div className="emp-form-group">
              <label className="emp-label">Salary Change Reason</label>
              <input
                type="text"
                className="emp-input"
                value={editingEmployee?.salaryChangeReason || ""}
                onChange={(e) =>
                  setEditingEmployee({
                    ...editingEmployee,
                    salaryChangeReason: e.target.value
                  })
                }
                placeholder="Reason for salary adjustment"
              />
            </div>

            <div className="emp-form-group">
              <label className="emp-label">History Note</label>
              <textarea
                className="emp-input"
                rows={3}
                value={editingEmployee?.historyNote || ""}
                onChange={(e) =>
                  setEditingEmployee({
                    ...editingEmployee,
                    historyNote: e.target.value
                  })
                }
                placeholder="Describe department/title/salary changes"
              />
            </div>
          </div>

          <div className="emp-modal-footer">
            <button
              onClick={() => setShowEditModal(false)}
              className="emp-btn emp-btn-cancel"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="emp-btn emp-btn-save"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <div
        className={`emp-modal-overlay ${selectedEmployee ? "emp-modal-active" : ""}`}
        onClick={() => setSelectedEmployee(null)}
      >
        <div
          className="emp-modal emp-modal-details"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="emp-modal-header">
            <h2>Employee Details: {selectedEmployee?.name}</h2>
            <button 
              className="emp-modal-close"
              onClick={() => setSelectedEmployee(null)}
            >
              ×
            </button>
          </div>

          <div className="emp-modal-body">
            {/* Personal Information Section */}
            <div className="emp-detail-section">
              <h3 className="emp-detail-title">Personal Information</h3>
              <div className="emp-detail-grid">
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Employee ID:</span>
                  <span>{selectedEmployee?.employeeCode}</span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Email:</span>
                  <span>{selectedEmployee?.email}</span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Phone:</span>
                  <span>{selectedEmployee?.phone || "—"}</span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Date of Birth:</span>
                  <span>
                    {selectedEmployee?.dateOfBirth
                      ? new Date(selectedEmployee.dateOfBirth).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })
                      : "—"}
                  </span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Gender:</span>
                  <span>{selectedEmployee?.gender || "—"}</span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Password:</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontFamily: "monospace", letterSpacing: "0.5px" }}>
                      {showTempPassword && tempPassword ? tempPassword : "••••••••••"}
                    </span>
                    <button
                      type="button"
                      onClick={resetAndRevealPassword}
                      className="emp-btn emp-btn-view"
                      disabled={passwordLoading}
                      title="Reset & reveal temporary password"
                      style={{ padding: "4px 10px" }}
                    >
                      {passwordLoading ? "..." : "👁"}
                    </button>
                    {showTempPassword && tempPassword && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(tempPassword);
                            setMessage("✓ Copied temporary password to clipboard");
                          } catch {
                            setMessage("✗ Cannot copy to clipboard");
                          }
                        }}
                        className="emp-btn emp-btn-edit"
                        title="Copy"
                        style={{ padding: "4px 10px" }}
                      >
                        Copy
                      </button>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Job Information Section */}
            <div className="emp-detail-section">
              <h3 className="emp-detail-title">Job Information</h3>
              <div className="emp-detail-grid">
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Department:</span>
                  <span>{selectedEmployee?.Department?.name || "—"}</span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Job Title:</span>
                  <span>{selectedEmployee?.JobTitle?.name || "—"}</span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Start Date:</span>
                  <span>
                    {selectedEmployee?.startDate
                      ? new Date(selectedEmployee.startDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })
                      : "—"}
                  </span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Salary Grade:</span>
                  <span>{selectedEmployee?.SalaryGrade?.code || "—"}</span>
                </div>
                <div className="emp-detail-item">
                  <span className="emp-detail-label">Base Salary:</span>
                  <span>
                    {selectedEmployee?.baseSalary
                      ? new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 0
                        }).format(selectedEmployee.baseSalary)
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Dependents Section */}
            {selectedEmployee?.dependents && selectedEmployee.dependents.length > 0 && (
              <div className="emp-detail-section">
                <h3 className="emp-detail-title">
                  Dependents ({selectedEmployee.dependents.length})
                </h3>
                <div className="emp-detail-list">
                  {selectedEmployee.dependents.map((dep, idx) => (
                    <div key={idx} className="emp-detail-card">
                      <div className="emp-detail-card-name">{dep.fullName}</div>
                      <div className="emp-detail-card-info">
                        Relationship: {dep.relationship}
                      </div>
                      <div className="emp-detail-card-info">
                        Date of Birth: {new Date(dep.dateOfBirth).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Qualifications Section */}
            {selectedEmployee?.qualifications && selectedEmployee.qualifications.length > 0 && (
              <div className="emp-detail-section">
                <h3 className="emp-detail-title">
                  Qualifications and Certificates ({selectedEmployee.qualifications.length})
                </h3>
                <div className="emp-detail-list">
                  {selectedEmployee.qualifications.map((qual, idx) => (
                    <div key={idx} className="emp-detail-card">
                      <div className="emp-detail-card-name">{qual.name}</div>
                      <div className="emp-detail-card-info">Type: {qual.type}</div>
                      <div className="emp-detail-card-info">Issued By: {qual.issuedBy}</div>
                      <div className="emp-detail-card-info">
                        Issue Date: {new Date(qual.issuedDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Job History Section */}
            {selectedEmployee?.jobHistory && selectedEmployee.jobHistory.length > 0 && (
              <div className="emp-detail-section">
                <h3 className="emp-detail-title">Job History ({selectedEmployee.jobHistory.length})</h3>
                <div className="emp-detail-list">
                  {selectedEmployee.jobHistory.map((history) => (
                    <div key={history.id} className="emp-detail-card">
                      <div className="emp-detail-card-name">{history.changeType} - {history.effectiveDate}</div>
                      <div className="emp-detail-card-info">Department: {history.fromDepartmentName || "-"} → {history.toDepartmentName || "-"}</div>
                      <div className="emp-detail-card-info">Job Title: {history.fromJobTitleName || "-"} → {history.toJobTitleName || "-"}</div>
                      <div className="emp-detail-card-info">Note: {history.notes || "-"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Salary Change History Section */}
            {selectedEmployee?.salaryChangeHistory && selectedEmployee.salaryChangeHistory.length > 0 && (
              <div className="emp-detail-section">
                <h3 className="emp-detail-title">Salary Change History ({selectedEmployee.salaryChangeHistory.length})</h3>
                <div className="emp-detail-list">
                  {selectedEmployee.salaryChangeHistory.map((history) => (
                    <div key={history.id} className="emp-detail-card">
                      <div className="emp-detail-card-name">{history.changeType} - {history.effectiveDate}</div>
                      <div className="emp-detail-card-info">Base Salary: {history.previousBaseSalary || 0} → {history.newBaseSalary || 0}</div>
                      <div className="emp-detail-card-info">Allowance: {history.previousTotalAllowance || 0} → {history.newTotalAllowance || 0}</div>
                      <div className="emp-detail-card-info">Reason: {history.reason || "-"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="emp-modal-footer">
            <button
              onClick={() => setSelectedEmployee(null)}
              className="emp-btn emp-btn-close"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
