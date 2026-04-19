import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";

export default function SalaryGradeManagement() {
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const token = localStorage.getItem("authToken");

  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    level: 1,
    minYearsOfService: 0,
    baseSalary: "",
    description: "",
    isActive: true
  });
  const [showSeniorityModal, setShowSeniorityModal] = useState(false);
  const [seniorityLoading, setSeniorityLoading] = useState(false);
  const [seniorityResults, setSeniorityResults] = useState(null);

  // Custom confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    detail: "",
    type: "warning", // warning | danger | info
    confirmText: "Confirm",
    cancelText: "Cancel",
    onConfirm: null
  });

  const showConfirm = ({ title, message, detail, type = "warning", confirmText = "Confirm", cancelText = "Cancel" }) => {
    return new Promise((resolve) => {
      setConfirmModal({
        show: true,
        title,
        message,
        detail,
        type,
        confirmText,
        cancelText,
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, show: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmModal(prev => ({ ...prev, show: false }));
          resolve(false);
        }
      });
    });
  };

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      setMessage("");
      const res = await fetch(`${apiBase}/api/salary-grades`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load salary grades");
      setGrades(data.grades || []);
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Check if base salary changed during edit — warn user
      if (editingGrade) {
        const oldBase = parseFloat(editingGrade.baseSalary) || 0;
        const newBase = parseFloat(formData.baseSalary) || 0;
        if (oldBase !== newBase) {
          const confirmed = await showConfirm({
            title: "Base Salary Change",
            message: `Base salary will change from ${formatCurrency(oldBase)} to ${formatCurrency(newBase)}.`,
            detail: `This will update the base salary for ALL employees currently assigned to grade "${editingGrade.code} - ${editingGrade.name}".`,
            type: "warning",
            confirmText: "Update All",
            cancelText: "Cancel"
          });
          if (!confirmed) return;
        }
      }

      setLoading(true);
      setMessage("");
      const url = editingGrade
        ? `${apiBase}/api/salary-grades/${editingGrade.id}`
        : `${apiBase}/api/salary-grades`;
      const method = editingGrade ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          baseSalary: parseFloat(formData.baseSalary) || 0,
          level: parseInt(formData.level) || 1
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Operation failed");
      
      let successMsg = `✅ Salary grade ${editingGrade ? "updated" : "created"} successfully!`;
      if (data.updatedEmployeeCount > 0) {
        successMsg += ` (${data.updatedEmployeeCount} employee(s) base salary updated`;
        if (data.recalculatedSalaryCount > 0) {
          successMsg += `, ${data.recalculatedSalaryCount} salary record(s) recalculated`;
        }
        successMsg += `)`;
      }
      setMessage(successMsg);
      setShowForm(false);
      setEditingGrade(null);
      setFormData({
        code: "",
        name: "",
        level: 1,
        minYearsOfService: 0,
        baseSalary: "",
        description: "",
        isActive: true
      });
      fetchGrades();
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      console.error(err);
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (grade) => {
    setEditingGrade(grade);
    setFormData({
      code: grade.code,
      name: grade.name,
      level: grade.level,
      minYearsOfService: grade.minYearsOfService !== undefined ? grade.minYearsOfService : 0,
      baseSalary: grade.baseSalary?.toString() || "",
      description: grade.description || "",
      isActive: grade.isActive !== undefined ? grade.isActive : true
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => { // eslint-disable-line
    const confirmed = await showConfirm({
      title: "Delete Salary Grade",
      message: "Are you sure you want to delete this salary grade?",
      detail: "This action cannot be undone. Employees assigned to this grade may be affected.",
      type: "danger",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!confirmed) return;
    
    try {
      setLoading(true);
      setMessage("");
      const res = await fetch(`${apiBase}/api/salary-grades/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      
      setMessage("✅ Salary grade deleted successfully!");
      fetchGrades();
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      console.error(err);
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(amount || 0);
  };

  const cardStyle = {
    backgroundColor: theme.neutral.white,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.neutral.gray200}`,
    boxShadow: theme.shadows.sm,
    padding: theme.spacing.xl,
  };

  return (
    <div style={{ display: "grid", gap: theme.spacing.xl }}>
      <div style={{ ...cardStyle, background: theme.gradients.primary, color: theme.neutral.white, border: "none" }}>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>💰 Salary Grade Management</div>
        <div style={{ opacity: 0.95 }}>Manage salary grades and configure automatic salary increases based on seniority.</div>
      </div>

      {message && (
        <div style={{
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: message.includes("✅") ? theme.success.light : theme.error.light,
          border: `1px solid ${message.includes("✅") ? theme.success.main : theme.error.main}`,
          fontWeight: 700,
          color: message.includes("✅") ? theme.success.dark : theme.error.dark
        }}>
          {message}
        </div>
      )}

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.lg }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: theme.primary.main, margin: 0 }}>
            Salary Grades
          </h3>
          <div style={{ display: "flex", gap: theme.spacing.md }}>
            <button
              onClick={() => setShowSeniorityModal(true)}
              style={{
                padding: "10px 20px",
                backgroundColor: theme.success.main,
                color: theme.neutral.white,
                border: "none",
                borderRadius: theme.radius.md,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "14px"
              }}
            >
              🔄 Apply Seniority Increases
            </button>
            <button
              onClick={() => {
                setEditingGrade(null);
                setFormData({
                  code: "",
                  name: "",
                  level: 1,
                  minYearsOfService: 0,
                  baseSalary: "",
                  description: "",
                  isActive: true
                });
                setShowForm(true);
              }}
              style={{
                padding: "10px 20px",
                backgroundColor: theme.primary.main,
                color: theme.neutral.white,
                border: "none",
                borderRadius: theme.radius.md,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "14px"
              }}
            >
              + Add Grade
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: theme.spacing.xl }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Loading...</div>
          </div>
        ) : grades.length === 0 ? (
          <div style={{ textAlign: "center", padding: theme.spacing.xl, color: theme.neutral.gray500 }}>
            <p>No salary grades found. Create your first grade.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${theme.neutral.gray300}`, backgroundColor: theme.neutral.gray50 }}>
                  <th style={{ padding: theme.spacing.md, textAlign: "left", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Code</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "left", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Name</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Level</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Min. Years</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "right", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Base Salary</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Status</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((grade) => (
                  <tr key={grade.id} style={{ borderBottom: `1px solid ${theme.neutral.gray200}`, transition: "background 0.2s" }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.neutral.gray50}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                    <td style={{ padding: theme.spacing.md, fontWeight: 600 }}>{grade.code}</td>
                    <td style={{ padding: theme.spacing.md }}>{grade.name}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 600, color: theme.primary.main }}>{grade.level}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 600, color: theme.primary.dark }}>{grade.minYearsOfService ?? 0} yr{grade.minYearsOfService !== 1 ? 's' : ''}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "right", fontWeight: 600, color: theme.success.main }}>{formatCurrency(grade.baseSalary)}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "center" }}>
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: theme.radius.sm,
                        fontSize: "11px",
                        fontWeight: 600,
                        backgroundColor: grade.isActive ? theme.success.light : theme.error.light,
                        color: grade.isActive ? theme.success.dark : theme.error.dark
                      }}>
                        {grade.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: theme.spacing.md, textAlign: "center" }}>
                      <div style={{ display: "flex", gap: theme.spacing.xs, justifyContent: "center" }}>
                        <button
                          onClick={() => handleEdit(grade)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: theme.primary.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.sm,
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: 600
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(grade.id)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: theme.error.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.sm,
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: 600
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
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
            zIndex: 1000,
            padding: "20px"
          }}
          onClick={() => setShowForm(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: theme.radius.lg,
              padding: theme.spacing.xl,
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: theme.shadows.lg
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
              {editingGrade ? "Edit Salary Grade" : "Create Salary Grade"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: theme.spacing.md }}>
                <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                  Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  placeholder="e.g., SG01, SG02"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: `2px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.md,
                    fontSize: "14px"
                  }}
                />
              </div>

              <div style={{ marginBottom: theme.spacing.md }}>
                <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Level 1, Level 2, Senior"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: `2px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.md,
                    fontSize: "14px"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
                <div>
                  <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                    Level *
                  </label>
                  <input
                    type="number"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
                    required
                    min="1"
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: `2px solid ${theme.neutral.gray300}`,
                      borderRadius: theme.radius.md,
                      fontSize: "14px"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                    Min. Years of Service *
                  </label>
                  <input
                    type="number"
                    value={formData.minYearsOfService}
                    onChange={(e) => setFormData({ ...formData, minYearsOfService: parseInt(e.target.value) || 0 })}
                    required
                    min="0"
                    placeholder="0"
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: `2px solid ${theme.neutral.gray300}`,
                      borderRadius: theme.radius.md,
                      fontSize: "14px"
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: theme.spacing.md }}>
                <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                  Base Salary (VND) *
                </label>
                <input
                  type="number"
                  value={formData.baseSalary}
                  onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                  required
                  min="0"
                  step="1000"
                  placeholder="0"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: `2px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.md,
                    fontSize: "14px"
                  }}
                />
              </div>

              <div style={{ marginBottom: theme.spacing.md }}>
                <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description of this salary grade..."
                  rows="3"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: `2px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.md,
                    fontSize: "14px",
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <span style={{ fontWeight: 600, fontSize: "14px" }}>Active</span>
                </label>
              </div>

              <div style={{ display: "flex", gap: theme.spacing.md }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingGrade(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "14px",
                    backgroundColor: theme.neutral.gray400,
                    color: theme.neutral.white,
                    border: "none",
                    borderRadius: theme.radius.md,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "14px"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "14px",
                    backgroundColor: theme.primary.main,
                    color: theme.neutral.white,
                    border: "none",
                    borderRadius: theme.radius.md,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "14px",
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? "Saving..." : editingGrade ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Seniority Salary Increase Modal */}
      {showSeniorityModal && (
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
            zIndex: 1000,
            padding: "20px"
          }}
          onClick={() => {
            setShowSeniorityModal(false);
            setSeniorityResults(null);
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: theme.radius.lg,
              padding: theme.spacing.xl,
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: theme.shadows.lg
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
              Apply Seniority-Based Salary Increases
            </h3>
            
            <div style={{ marginBottom: theme.spacing.lg }}>
              <p style={{ color: theme.neutral.gray600, marginBottom: theme.spacing.md }}>
                This will automatically increase salaries for employees based on their years of service (seniority).
                Employees are upgraded to the next salary grade level every 2 years of service.
              </p>
              
              {!seniorityResults && (
                <div style={{ display: "flex", gap: theme.spacing.md }}>
                  <button
                    onClick={async () => {
                      try {
                        setSeniorityLoading(true);
                        setMessage("");
                        const res = await fetch(`${apiBase}/api/seniority-salary/apply-all`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ dryRun: true, notifyUsers: false })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data?.message || "Failed to check");
                        setSeniorityResults(data);
                      } catch (err) {
                        console.error(err);
                        setMessage(`❌ Error: ${err.message}`);
                      } finally {
                        setSeniorityLoading(false);
                      }
                    }}
                    disabled={seniorityLoading}
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: theme.neutral.gray400,
                      color: theme.neutral.white,
                      border: "none",
                      borderRadius: theme.radius.md,
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "14px",
                      opacity: seniorityLoading ? 0.6 : 1
                    }}
                  >
                    {seniorityLoading ? "Checking..." : "Preview (Dry Run)"}
                  </button>
                  <button
                    onClick={async () => {
                      const confirmed = await showConfirm({
                        title: "Apply Salary Increases",
                        message: "Apply salary increases for all eligible employees?",
                        detail: "This will upgrade salaries based on seniority for all active employees. This action cannot be undone.",
                        type: "warning",
                        confirmText: "Apply Now",
                        cancelText: "Cancel"
                      });
                      if (!confirmed) return;
                      try {
                        setSeniorityLoading(true);
                        setMessage("");
                        const res = await fetch(`${apiBase}/api/seniority-salary/apply-all`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ dryRun: false, notifyUsers: true })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data?.message || "Failed to apply");
                        setSeniorityResults(data);
                        setMessage(`✅ ${data.message}`);
                        setTimeout(() => setMessage(""), 5000);
                      } catch (err) {
                        console.error(err);
                        setMessage(`❌ Error: ${err.message}`);
                      } finally {
                        setSeniorityLoading(false);
                      }
                    }}
                    disabled={seniorityLoading}
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: theme.success.main,
                      color: theme.neutral.white,
                      border: "none",
                      borderRadius: theme.radius.md,
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "14px",
                      opacity: seniorityLoading ? 0.6 : 1
                    }}
                  >
                    {seniorityLoading ? "Applying..." : "Apply Increases"}
                  </button>
                </div>
              )}
            </div>

            {seniorityResults && (
              <div>
                <div style={{
                  padding: theme.spacing.md,
                  backgroundColor: theme.neutral.gray50,
                  borderRadius: theme.radius.md,
                  marginBottom: theme.spacing.md
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: theme.spacing.md }}>
                    <div>
                      <div style={{ fontSize: "12px", color: theme.neutral.gray600, marginBottom: "4px" }}>Total</div>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: theme.primary.main }}>{seniorityResults.summary?.total || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: theme.neutral.gray600, marginBottom: "4px" }}>Upgraded</div>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: theme.success.main }}>{seniorityResults.summary?.upgraded || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: theme.neutral.gray600, marginBottom: "4px" }}>Skipped</div>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: theme.neutral.gray500 }}>{seniorityResults.summary?.skipped || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: theme.neutral.gray600, marginBottom: "4px" }}>Errors</div>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: theme.error.main }}>{seniorityResults.summary?.errors || 0}</div>
                    </div>
                  </div>
                </div>

                {seniorityResults.details && seniorityResults.details.length > 0 && (
                  <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${theme.neutral.gray300}`, backgroundColor: theme.neutral.gray50 }}>
                          <th style={{ padding: theme.spacing.xs, textAlign: "left" }}>Employee</th>
                          <th style={{ padding: theme.spacing.xs, textAlign: "center" }}>Seniority</th>
                          <th style={{ padding: theme.spacing.xs, textAlign: "center" }}>Status</th>
                          <th style={{ padding: theme.spacing.xs, textAlign: "left" }}>Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seniorityResults.details.slice(0, 50).map((detail, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${theme.neutral.gray200}` }}>
                            <td style={{ padding: theme.spacing.xs }}>{detail.name || `User ${detail.userId}`}</td>
                            <td style={{ padding: theme.spacing.xs, textAlign: "center" }}>{detail.seniority || 0} years</td>
                            <td style={{ padding: theme.spacing.xs, textAlign: "center" }}>
                              <span style={{
                                padding: "2px 8px",
                                borderRadius: theme.radius.sm,
                                fontSize: "10px",
                                fontWeight: 600,
                                backgroundColor: detail.success ? theme.success.light : (detail.status === "skipped" ? theme.neutral.gray200 : theme.error.light),
                                color: detail.success ? theme.success.dark : (detail.status === "skipped" ? theme.neutral.gray600 : theme.error.dark)
                              }}>
                                {detail.success ? "Upgraded" : (detail.status || "Error")}
                              </span>
                            </td>
                            <td style={{ padding: theme.spacing.xs, fontSize: "11px", color: theme.neutral.gray600 }}>
                              {detail.message || detail.reason || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {seniorityResults.details.length > 50 && (
                      <p style={{ marginTop: theme.spacing.md, fontSize: "12px", color: theme.neutral.gray500, textAlign: "center" }}>
                        Showing first 50 results. Total: {seniorityResults.details.length}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: theme.spacing.lg, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowSeniorityModal(false);
                  setSeniorityResults(null);
                }}
                style={{
                  padding: "10px 20px",
                  backgroundColor: theme.neutral.gray400,
                  color: theme.neutral.white,
                  border: "none",
                  borderRadius: theme.radius.md,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "14px"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Confirm Modal */}
      {confirmModal.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "20px",
            animation: "fadeIn 0.2s ease-out"
          }}
          onClick={() => confirmModal.onCancel?.()}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "440px",
              boxShadow: "0 24px 48px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.1)",
              overflow: "hidden",
              animation: "slideUp 0.25s ease-out"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top color bar */}
            <div style={{
              height: "4px",
              background: confirmModal.type === "danger"
                ? "linear-gradient(90deg, #dc3545, #ff6b6b)"
                : confirmModal.type === "info"
                  ? "linear-gradient(90deg, #1976d2, #42a5f5)"
                  : "linear-gradient(90deg, #f59e0b, #fbbf24)"
            }} />

            {/* Content */}
            <div style={{ padding: "28px 32px 24px" }}>
              {/* Icon + Title */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "24px",
                  backgroundColor: confirmModal.type === "danger"
                    ? "#fef2f2"
                    : confirmModal.type === "info"
                      ? "#eff6ff"
                      : "#fffbeb"
                }}>
                  {confirmModal.type === "danger" ? "🗑️" : confirmModal.type === "info" ? "ℹ️" : "⚠️"}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: "0 0 8px 0",
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#111827",
                    lineHeight: "1.3"
                  }}>
                    {confirmModal.title}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#374151",
                    lineHeight: "1.6"
                  }}>
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              {/* Detail box */}
              {confirmModal.detail && (
                <div style={{
                  margin: "0 0 0 64px",
                  padding: "12px 16px",
                  backgroundColor: confirmModal.type === "danger" ? "#fef2f2" : "#fffbeb",
                  borderRadius: "8px",
                  borderLeft: `3px solid ${confirmModal.type === "danger" ? "#dc3545" : "#f59e0b"}`,
                  fontSize: "13px",
                  color: "#4b5563",
                  lineHeight: "1.6"
                }}>
                  {confirmModal.detail}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              padding: "16px 32px 24px",
              backgroundColor: "#f9fafb"
            }}>
              <button
                onClick={() => confirmModal.onCancel?.()}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "#fff",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                  e.currentTarget.style.borderColor = "#9ca3af";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#fff";
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
              >
                {confirmModal.cancelText}
              </button>
              <button
                onClick={() => confirmModal.onConfirm?.()}
                style={{
                  padding: "10px 24px",
                  backgroundColor: confirmModal.type === "danger" ? "#dc3545" : confirmModal.type === "info" ? "#1976d2" : "#f59e0b",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "14px",
                  boxShadow: `0 2px 8px ${confirmModal.type === "danger" ? "rgba(220,53,69,0.3)" : confirmModal.type === "info" ? "rgba(25,118,210,0.3)" : "rgba(245,158,11,0.3)"}`,
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = `0 4px 12px ${confirmModal.type === "danger" ? "rgba(220,53,69,0.4)" : confirmModal.type === "info" ? "rgba(25,118,210,0.4)" : "rgba(245,158,11,0.4)"}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = `0 2px 8px ${confirmModal.type === "danger" ? "rgba(220,53,69,0.3)" : confirmModal.type === "info" ? "rgba(25,118,210,0.3)" : "rgba(245,158,11,0.3)"}`;
                }}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(16px) scale(0.97); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

