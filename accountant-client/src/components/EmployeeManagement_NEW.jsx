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
      if (!token) return;

      const res = await fetch(`${apiBase}/api/admin/employees/${employee.id}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedEmployee(data.employee || {});
      }
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setLoading(false);
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
          startDate: editingEmployee.startDate
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
