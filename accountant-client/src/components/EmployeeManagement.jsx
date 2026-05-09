import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { theme } from "../theme.js";
import EmployeeDetailView from "./EmployeeDetailView.jsx";
import "./EmployeeManagement.css";

function rowEmployeeId(employee) {
  if (!employee || typeof employee !== "object") return null;
  return (
    employee.id ??
    employee.userId ??
    employee.userID ??
    null
  );
}

/** Salary grade column: prefer code + short name from API `SalaryGrade` include */
function formatSalaryGradeDisplay(employee) {
  const sg = employee?.SalaryGrade;
  if (!sg) return "—";
  const code = sg.code?.trim();
  const name = sg.name?.trim();
  if (code && name) return `${code} · ${name}`;
  if (code) return code;
  if (name) return name;
  return "—";
}

function ViewProfileIcon() {
  return (
    <svg
      className="emp-view-profile-btn__svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 5c-4.42 0-8.06 2.55-10 6.5 1.94 3.95 5.58 6.5 10 6.5s8.06-2.55 10-6.5C20.06 7.55 16.42 5 12 5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11.5" r="3.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

/** Outline-style profile trigger — professional, distinct from primary Edit */
function ProfileViewButton({ employee, onOpen }) {
  const eid = rowEmployeeId(employee);
  const label = employee?.name || employee?.employeeCode || "Employee";
  const blocked = eid == null;

  return (
    <button
      type="button"
      className="emp-view-profile-btn"
      disabled={blocked}
      title={blocked ? "Cannot open profile (missing id)" : `Open profile — ${label}`}
      aria-label={blocked ? "View profile unavailable" : `View profile, ${label}`}
      onClick={() => {
        if (!blocked) onOpen(employee);
      }}
    >
      <ViewProfileIcon />
      <span className="emp-view-profile-btn__label">View</span>
    </button>
  );
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [detailEmployeeId, setDetailEmployeeId] = useState(null);
  const tableSectionRef = useRef(null);

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchEmployees();
  }, []);

  const closeDetailPanel = useCallback(() => {
    setDetailEmployeeId(null);
  }, []);

  useEffect(() => {
    if (detailEmployeeId == null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") closeDetailPanel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [detailEmployeeId, closeDetailPanel]);

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

  const resolveEmployeeId = (employee) => rowEmployeeId(employee);

  const viewDetails = (employee) => {
    const eid = resolveEmployeeId(employee);
    if (eid == null) {
      setMessage("✗ Cannot open profile: missing employee id");
      return;
    }
    setDetailEmployeeId(eid);
    setMessage("");
  };

  const handleEdit = (employee) => {
    setEditingEmployee({ ...employee });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      setMessage("");
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const phoneRaw = editingEmployee.phoneNumber ?? editingEmployee.phone;
      const payload = {
        name: editingEmployee.name,
        email: editingEmployee.email,
        phoneNumber: phoneRaw != null && String(phoneRaw).trim() !== "" ? String(phoneRaw).trim() : null,
        baseSalary: editingEmployee.baseSalary,
        startDate: editingEmployee.startDate || null,
        effectiveDate: editingEmployee.effectiveDate || null,
        historyNote: editingEmployee.historyNote || null,
        salaryChangeReason: editingEmployee.salaryChangeReason || null
      };

      const res = await fetch(`${apiBase}/api/admin/employees/${editingEmployee.id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setMessage(data.message ? `✓ ${data.message}` : "✓ Employee information updated successfully");
        setShowEditModal(false);
        fetchEmployees();
      } else {
        const detail =
          (typeof data.message === "string" && data.message) ||
          (Array.isArray(data.errors) && data.errors[0]?.msg) ||
          `HTTP ${res.status}`;
        setMessage(`✗ ${detail}`);
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

  return (
    <>
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
        <div className="emp-table-wrapper" ref={tableSectionRef}>
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
                <tr
                  key={resolveEmployeeId(employee) ?? employee.employeeCode}
                  className={
                    detailEmployeeId != null && detailEmployeeId === resolveEmployeeId(employee)
                      ? "emp-table-row emp-table-row--active"
                      : "emp-table-row"
                  }
                >
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
                  <td className="emp-grade">
                    {(() => {
                      const g = formatSalaryGradeDisplay(employee);
                      const isEmpty = g === "—";
                      return (
                        <span
                          className={isEmpty ? "emp-grade-empty" : "emp-grade-pill"}
                          title={employee.SalaryGrade?.name || (isEmpty ? "No salary grade assigned" : "")}
                        >
                          {g}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="emp-salary">
                    {employee.baseSalary != null && employee.baseSalary !== ""
                      ? new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                          maximumFractionDigits: 0
                        }).format(Number(employee.baseSalary))
                      : "—"}
                  </td>
                  <td className="emp-actions">
                    <div className="emp-action-group" role="group" aria-label="Row actions">
                      <ProfileViewButton employee={employee} onOpen={viewDetails} />
                      <button
                        type="button"
                        className="emp-btn emp-btn-edit"
                        title="Edit employee"
                        aria-label={`Edit ${employee.name || employee.employeeCode || "employee"}`}
                        onClick={() => handleEdit(employee)}
                      >
                        Edit
                      </button>
                    </div>
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

      {showEditModal && (
      <div
        className="emp-modal-overlay"
        onClick={() => setShowEditModal(false)}
        role="presentation"
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
                value={editingEmployee?.phoneNumber ?? editingEmployee?.phone ?? ""}
                onChange={(e) =>
                  setEditingEmployee({ ...editingEmployee, phoneNumber: e.target.value })
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
      )}
    </div>

    {detailEmployeeId != null &&
      createPortal(
        <div
          className="emp-profile-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="emp-profile-dialog-title"
        >
          <div
            className="emp-profile-overlay__backdrop"
            onClick={closeDetailPanel}
            aria-hidden="true"
          />
          <div className="emp-profile-overlay__panel">
            <div className="emp-profile-overlay__header">
              <h2 id="emp-profile-dialog-title" className="emp-profile-overlay__title">
                Employee details
              </h2>
              <div className="emp-profile-overlay__header-actions">
                <button
                  type="button"
                  className="emp-profile-overlay__close"
                  onClick={closeDetailPanel}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="emp-profile-overlay__subbar">
              <button type="button" className="emp-btn emp-btn-view" onClick={closeDetailPanel}>
                ← Back to list
              </button>
            </div>
            <div className="emp-profile-overlay__body">
              <EmployeeDetailView
                embedded
                initialEmployeeId={detailEmployeeId}
                onClose={closeDetailPanel}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
