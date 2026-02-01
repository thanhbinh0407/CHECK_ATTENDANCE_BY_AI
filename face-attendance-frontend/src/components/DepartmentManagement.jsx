import React, { useState, useEffect, useCallback } from "react";
import { theme } from "../styles/theme.js";

// Icon Components
const PlusIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const EditIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const DeleteIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const CloseIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const SaveIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline>
    <polyline points="7 3 7 8 15 8"></polyline>
  </svg>
);

const CancelIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    managerId: null,
    isActive: true
  });
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/departments`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setDepartments(data.departments || []);
      } else {
        setMessage(data.message || "Error loading departments list");
      }
    } catch {
      setMessage("Error connecting to server");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      const url = editingDept 
        ? `${apiBase}/api/departments/${editingDept.id}`
        : `${apiBase}/api/departments`;
      const method = editingDept ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(editingDept ? "Department updated successfully" : "Department created successfully");
        setShowForm(false);
        setEditingDept(null);
        setFormData({ code: "", name: "", description: "", managerId: null, isActive: true });
        fetchDepartments();
      } else {
        setMessage(data.message || "An error occurred");
      }
    } catch {
      setMessage("Error connecting to server");
    }
  };

  const handleEdit = (dept) => {
    setEditingDept(dept);
    setFormData({
      code: dept.code,
      name: dept.name,
      description: dept.description || "",
      managerId: dept.managerId,
      isActive: dept.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/departments/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Department deleted successfully");
        fetchDepartments();
      } else {
        setMessage(data.message || "An error occurred");
      }
    } catch {
      setMessage("Error connecting to server");
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes tableRowFadeIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
      <div style={{ padding: theme.spacing.xl }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: theme.spacing.xl,
          borderRadius: theme.radius.lg,
          marginBottom: theme.spacing.lg,
          boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)"
        }}>
          <div>
            <h2 style={{ 
              ...theme.typography.h2, 
              margin: 0, 
              color: theme.neutral.white,
              fontSize: "28px",
              fontWeight: "700"
            }}>
              Department Management
            </h2>
            <p style={{ 
              margin: "8px 0 0 0", 
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: "14px"
            }}>
                Manage and organize company departments
            </p>
          </div>
        </div>

        {/* Add Department Button */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: theme.spacing.lg
        }}>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingDept(null);
              setFormData({ code: "", name: "", description: "", managerId: null, isActive: true });
            }}
            style={{
              padding: "12px 24px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: theme.neutral.white,
              border: "none",
              borderRadius: theme.radius.md,
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "15px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              transition: "all 0.3s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.4)";
              e.currentTarget.style.background = "linear-gradient(135deg, #059669 0%, #047857 100%)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
              e.currentTarget.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
            }}
          >
            <PlusIcon size={20} />
            Add Department
          </button>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: `${theme.spacing.md} ${theme.spacing.lg}`,
            marginBottom: theme.spacing.md,
            backgroundColor: message.includes("successfully") ? "#d4edda" : "#f8d7da",
            color: message.includes("successfully") ? "#155724" : "#721c24",
            borderRadius: theme.radius.md,
            display: "inline-block",
            width: "fit-content",
            border: `1px solid ${message.includes("successfully") ? "#c3e6cb" : "#f5c6cb"}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            fontSize: "14px",
            fontWeight: "500",
            animation: "fadeIn 0.3s ease-out"
          }}>
            {message.includes("successfully") ? "✅" : "❌"} {message}
          </div>
        )}

      {/* Modal Popup */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            animation: "fadeIn 0.3s ease-out"
          }}
          onClick={() => {
            setShowForm(false);
            setEditingDept(null);
          }}
        >
          <div
            style={{
              backgroundColor: theme.neutral.white,
              padding: theme.spacing.xl,
              borderRadius: theme.radius.lg,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              width: "90%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              animation: "slideUp 0.3s ease-out",
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              background: editingDept 
                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              padding: theme.spacing.xl,
              borderRadius: theme.radius.lg,
              marginBottom: theme.spacing.xl,
              margin: `-${theme.spacing.xl} -${theme.spacing.xl} ${theme.spacing.xl} -${theme.spacing.xl}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}>
              <div>
                <h3 style={{ 
                  margin: 0,
                  fontSize: "24px",
                  fontWeight: "700",
                  color: theme.neutral.white
                }}>
                  {editingDept ? "✏️ Edit Department" : "➕ Add New Department"}
                </h3>
                <p style={{
                  margin: "8px 0 0 0",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "14px"
                }}>
                  {editingDept ? "Update department information" : "Create a new department"}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingDept(null);
                }}
                style={{
                  padding: "10px",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  cursor: "pointer",
                  color: theme.neutral.white,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: theme.radius.md,
                  transition: "all 0.2s",
                  width: "40px",
                  height: "40px"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
                  e.currentTarget.style.transform = "rotate(90deg) scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.transform = "rotate(0deg) scale(1)";
                }}
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 1fr", 
                gap: theme.spacing.lg,
                marginBottom: theme.spacing.lg 
              }}>
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: theme.spacing.sm, 
                    fontWeight: "700",
                    fontSize: "13px",
                    color: theme.neutral.gray700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Department Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                    placeholder="e.g., IT, HR, FIN"
                    style={{
                      width: "100%",
                      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                      border: `2px solid ${theme.neutral.gray300}`,
                      borderRadius: theme.radius.md,
                      fontSize: "15px",
                      transition: "all 0.2s",
                      outline: "none",
                      backgroundColor: theme.neutral.gray50
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = theme.primary.main;
                      e.currentTarget.style.boxShadow = `0 0 0 3px rgba(102, 126, 234, 0.1)`;
                      e.currentTarget.style.backgroundColor = theme.neutral.white;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = theme.neutral.gray300;
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.backgroundColor = theme.neutral.gray50;
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: theme.spacing.sm, 
                    fontWeight: "700",
                    fontSize: "13px",
                    color: theme.neutral.gray700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Department Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Information Technology"
                    style={{
                      width: "100%",
                      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                      border: `2px solid ${theme.neutral.gray300}`,
                      borderRadius: theme.radius.md,
                      fontSize: "15px",
                      transition: "all 0.2s",
                      outline: "none",
                      backgroundColor: theme.neutral.gray50
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = theme.primary.main;
                      e.currentTarget.style.boxShadow = `0 0 0 3px rgba(102, 126, 234, 0.1)`;
                      e.currentTarget.style.backgroundColor = theme.neutral.white;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = theme.neutral.gray300;
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.backgroundColor = theme.neutral.gray50;
                    }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: theme.spacing.xl }}>
                <label style={{ 
                  display: "block", 
                  marginBottom: theme.spacing.sm, 
                  fontWeight: "700",
                  fontSize: "13px",
                  color: theme.neutral.gray700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Enter department description..."
                  style={{
                    width: "100%",
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    border: `2px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.md,
                    fontSize: "15px",
                    fontFamily: "inherit",
                    resize: "vertical",
                    transition: "all 0.2s",
                    outline: "none",
                    backgroundColor: theme.neutral.gray50
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = theme.primary.main;
                    e.currentTarget.style.boxShadow = `0 0 0 3px rgba(102, 126, 234, 0.1)`;
                    e.currentTarget.style.backgroundColor = theme.neutral.white;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = theme.neutral.gray300;
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.backgroundColor = theme.neutral.gray50;
                  }}
                />
              </div>
              <div style={{ 
                display: "flex", 
                gap: theme.spacing.md,
                justifyContent: "flex-end",
                paddingTop: theme.spacing.lg,
                borderTop: `2px solid ${theme.neutral.gray200}`
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingDept(null);
                  }}
                  title="Cancel"
                  style={{
                    padding: "12px",
                    backgroundColor: theme.neutral.gray200,
                    color: theme.neutral.gray700,
                    border: "none",
                    borderRadius: theme.radius.md,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "48px",
                    height: "48px",
                    transition: "all 0.3s",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.neutral.gray300;
                    e.currentTarget.style.transform = "scale(1.1) rotate(-5deg)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.neutral.gray200;
                    e.currentTarget.style.transform = "scale(1) rotate(0deg)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                  }}
                >
                  <CancelIcon size={20} />
                </button>
                <button
                  type="submit"
                  title={editingDept ? "Update Department" : "Create Department"}
                  style={{
                    padding: "12px",
                    backgroundColor: editingDept ? theme.primary.main : "#10b981",
                    color: theme.neutral.white,
                    border: "none",
                    borderRadius: theme.radius.md,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "48px",
                    height: "48px",
                    boxShadow: editingDept 
                      ? "0 4px 12px rgba(102, 126, 234, 0.3)"
                      : "0 4px 12px rgba(16, 185, 129, 0.3)",
                    transition: "all 0.3s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.1) rotate(5deg)";
                    e.currentTarget.style.boxShadow = editingDept
                      ? "0 6px 20px rgba(102, 126, 234, 0.4)"
                      : "0 6px 20px rgba(16, 185, 129, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1) rotate(0deg)";
                    e.currentTarget.style.boxShadow = editingDept
                      ? "0 4px 12px rgba(102, 126, 234, 0.3)"
                      : "0 4px 12px rgba(16, 185, 129, 0.3)";
                  }}
                >
                  <SaveIcon size={20} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{
          padding: theme.spacing.xl,
          textAlign: "center",
          color: theme.neutral.gray600,
          fontSize: "16px"
        }}>
          Loading...
        </div>
      ) : departments.length === 0 ? (
        <div style={{
          padding: theme.spacing.xl,
          textAlign: "center",
          color: theme.neutral.gray600,
          fontSize: "16px",
          backgroundColor: theme.neutral.white,
          borderRadius: theme.radius.lg,
          boxShadow: theme.shadows.md
        }}>
          No departments found
        </div>
      ) : (
        <div style={{
          backgroundColor: theme.neutral.white,
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          boxShadow: theme.shadows.md,
          animation: "fadeInUp 0.5s ease-out"
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ 
                  backgroundColor: "#f8f9fa",
                  borderBottom: `2px solid ${theme.neutral.gray200}`
                }}>
                  <th style={{ 
                    padding: theme.spacing.lg, 
                    textAlign: "left", 
                    fontWeight: "700",
                    fontSize: "13px",
                    color: theme.neutral.gray700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Code
                  </th>
                  <th style={{ 
                    padding: theme.spacing.lg, 
                    textAlign: "left", 
                    fontWeight: "700",
                    fontSize: "13px",
                    color: theme.neutral.gray700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Name
                  </th>
                  <th style={{ 
                    padding: theme.spacing.lg, 
                    textAlign: "left", 
                    fontWeight: "700",
                    fontSize: "13px",
                    color: theme.neutral.gray700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Description
                  </th>
                  <th style={{ 
                    padding: theme.spacing.lg, 
                    textAlign: "left", 
                    fontWeight: "700",
                    fontSize: "13px",
                    color: theme.neutral.gray700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Status
                  </th>
                  <th style={{ 
                    padding: theme.spacing.lg, 
                    textAlign: "center", 
                    fontWeight: "700",
                    fontSize: "13px",
                    color: theme.neutral.gray700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept, index) => (
                  <tr 
                    key={dept.id} 
                    style={{ 
                      borderTop: `1px solid ${theme.neutral.gray200}`,
                      backgroundColor: theme.neutral.white,
                      transition: "all 0.2s",
                      animation: `tableRowFadeIn 0.4s ease-out ${index * 0.05}s both`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f8f9fa";
                      e.currentTarget.style.transform = "translateX(4px)";
                      e.currentTarget.style.boxShadow = "2px 0 8px rgba(0,0,0,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme.neutral.white;
                      e.currentTarget.style.transform = "translateX(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <td style={{ 
                      padding: theme.spacing.lg,
                      fontWeight: "600",
                      color: theme.primary.main
                    }}>
                      {dept.code}
                    </td>
                    <td style={{ 
                      padding: theme.spacing.lg,
                      fontWeight: "600",
                      color: theme.neutral.gray900
                    }}>
                      {dept.name}
                    </td>
                    <td style={{ 
                      padding: theme.spacing.lg,
                      color: theme.neutral.gray600,
                      maxWidth: "300px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {dept.description || "-"}
                    </td>
                    <td style={{ padding: theme.spacing.lg }}>
                      <span style={{
                        padding: "6px 12px",
                        borderRadius: theme.radius.md,
                        backgroundColor: dept.isActive ? "#d4edda" : "#f8d7da",
                        color: dept.isActive ? "#155724" : "#721c24",
                        fontSize: "12px",
                        fontWeight: "700",
                        border: `1px solid ${dept.isActive ? "#c3e6cb" : "#f5c6cb"}`
                      }}>
                        {dept.isActive ? "✓ Active" : "✗ Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: theme.spacing.lg, textAlign: "center" }}>
                      <div style={{ display: "flex", gap: theme.spacing.sm, justifyContent: "center" }}>
                        <button
                          onClick={() => handleEdit(dept)}
                          title="Edit"
                          style={{
                            padding: "10px",
                            backgroundColor: theme.primary.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "40px",
                            height: "40px",
                            transition: "all 0.3s",
                            boxShadow: "0 2px 8px rgba(102, 126, 234, 0.2)"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.1) rotate(5deg)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1) rotate(0deg)";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.2)";
                          }}
                        >
                          <EditIcon size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id)}
                          title="Delete"
                          style={{
                            padding: "10px",
                            backgroundColor: theme.error.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "40px",
                            height: "40px",
                            transition: "all 0.3s",
                            boxShadow: "0 2px 8px rgba(239, 68, 68, 0.2)"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.1) rotate(-5deg)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1) rotate(0deg)";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(239, 68, 68, 0.2)";
                          }}
                        >
                          <DeleteIcon size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
