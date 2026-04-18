import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";
import { toastConfirm } from "../lib/notify.jsx";

export default function QualificationManagement() {
  const [qualifications, setQualifications] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterUserId, setFilterUserId] = useState("");
  const [formData, setFormData] = useState({
    userId: "",
    type: "degree",
    name: "",
    issuedBy: "",
    issuedDate: "",
    expiryDate: "",
    certificateNumber: "",
    description: "",
    isActive: true
  });

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchQualifications();
    fetchEmployees();
  }, [filterUserId]);

  const fetchQualifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const url = filterUserId 
        ? `${apiBase}/api/qualifications?userId=${filterUserId}`
        : `${apiBase}/api/qualifications`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setQualifications(data.qualifications || []);
      } else {
        setMessage("Error: " + (data.message || "Unable to load qualifications"));
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const url = editingId 
        ? `${apiBase}/api/qualifications/${editingId}`
        : `${apiBase}/api/qualifications`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formData,
          userId: editingId ? undefined : formData.userId, // Don't send userId on update
          issuedDate: formData.issuedDate || null,
          expiryDate: formData.expiryDate || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(editingId ? "Qualification updated successfully!" : "Qualification created successfully!");
        setShowForm(false);
        setEditingId(null);
        setFormData({ userId: "", type: "degree", name: "", issuedBy: "", issuedDate: "", expiryDate: "", certificateNumber: "", description: "", isActive: true });
        fetchQualifications();
      } else {
        setMessage("Error: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (qual) => {
    setEditingId(qual.id);
    setFormData({
      userId: qual.userId || "",
      type: qual.type || "degree",
      name: qual.name || "",
      issuedBy: qual.issuedBy || "",
      issuedDate: qual.issuedDate ? qual.issuedDate.split('T')[0] : "",
      expiryDate: qual.expiryDate ? qual.expiryDate.split('T')[0] : "",
      certificateNumber: qual.certificateNumber || "",
      description: qual.description || "",
      isActive: qual.isActive !== undefined ? qual.isActive : true
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const ok = await toastConfirm({ message: "Are you sure you want to delete this qualification?" });
    if (!ok) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/qualifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Qualification deleted successfully!");
        fetchQualifications();
      } else {
        setMessage("Error: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      degree: "Degree",
      certificate: "Certificate",
      license: "License",
      training: "Training Course"
    };
    return labels[type] || type;
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ color: theme.primary.main }}>📜 Qualification & Certificate Management</h2>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            style={{
              padding: "8px 12px",
              border: `1px solid ${theme.neutral.gray300}`,
              borderRadius: theme.radius.sm
            }}
          >
            <option value="">All employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode})</option>
            ))}
          </select>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({ userId: filterUserId || "", type: "degree", name: "", issuedBy: "", issuedDate: "", expiryDate: "", certificateNumber: "", description: "", isActive: true });
            }}
            style={{
              padding: "10px 20px",
              backgroundColor: theme.primary.main,
              color: "white",
              border: "none",
              borderRadius: theme.radius.md,
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            + Add Qualification
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          padding: "12px",
          marginBottom: "20px",
          backgroundColor: message.toLowerCase().includes("success") ? theme.success.bg : theme.error.bg,
          color: message.toLowerCase().includes("success") ? theme.success.text : theme.error.text,
          borderRadius: theme.radius.md
        }}>
          {message}
        </div>
      )}

      {showForm && (
        <div style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: theme.radius.md,
          marginBottom: "20px",
          boxShadow: theme.shadows.md
        }}>
          <h3 style={{ marginTop: 0, color: theme.primary.main }}>
            {editingId ? "Edit Qualification" : "Add New Qualification"}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: editingId ? "1fr 1fr" : "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              {!editingId && (
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Employee *</label>
                  <select
                    required={!editingId}
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: `1px solid ${theme.neutral.gray300}`,
                      borderRadius: theme.radius.sm
                    }}
                  >
                    <option value="">Select employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Type *</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                >
                  <option value="degree">Degree</option>
                  <option value="certificate">Certificate</option>
                  <option value="license">License</option>
                  <option value="training">Training Course</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Qualification Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Issued By</label>
                <input
                  type="text"
                  value={formData.issuedBy}
                  onChange={(e) => setFormData({ ...formData, issuedBy: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Issue Date</label>
                <input
                  type="date"
                  value={formData.issuedDate}
                  onChange={(e) => setFormData({ ...formData, issuedDate: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Certificate Number</label>
                <input
                  type="text"
                  value={formData.certificateNumber}
                  onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "28px" }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
              </div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: `1px solid ${theme.neutral.gray300}`,
                  borderRadius: theme.radius.sm
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "10px 20px",
                  backgroundColor: theme.primary.main,
                  color: "white",
                  border: "none",
                  borderRadius: theme.radius.md,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? "Saving..." : (editingId ? "Update" : "Create")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ userId: filterUserId || "", type: "degree", name: "", issuedBy: "", issuedDate: "", expiryDate: "", certificateNumber: "", description: "", isActive: true });
                }}
                style={{
                  padding: "10px 20px",
                  backgroundColor: theme.neutral.gray400,
                  color: "white",
                  border: "none",
                  borderRadius: theme.radius.md,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && !showForm ? (
        <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white", borderRadius: theme.radius.md, overflow: "hidden" }}>
          <thead>
            <tr style={{ backgroundColor: theme.primary.main, color: "white" }}>
              <th style={{ padding: "12px", textAlign: "left" }}>Employee</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Type</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Name</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Issued By</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Issue Date</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Expiry Date</th>
              <th style={{ padding: "12px", textAlign: "center" }}>Status</th>
              <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {qualifications.map(qual => (
              <tr key={qual.id} style={{ borderBottom: `1px solid ${theme.neutral.gray200}` }}>
                <td style={{ padding: "12px" }}>
                  {qual.User ? `${qual.User.name} (${qual.User.employeeCode})` : "-"}
                </td>
                <td style={{ padding: "12px" }}>{getTypeLabel(qual.type)}</td>
                <td style={{ padding: "12px", fontWeight: "600" }}>{qual.name}</td>
                <td style={{ padding: "12px" }}>{qual.issuedBy || "-"}</td>
                <td style={{ padding: "12px" }}>
                  {qual.issuedDate ? new Date(qual.issuedDate).toLocaleDateString("vi-VN") : "-"}
                </td>
                <td style={{ padding: "12px" }}>
                  {qual.expiryDate ? new Date(qual.expiryDate).toLocaleDateString("vi-VN") : "-"}
                </td>
                <td style={{ padding: "12px", textAlign: "center" }}>
                  <span style={{
                    padding: "4px 12px",
                    borderRadius: theme.radius.full,
                    fontSize: "12px",
                    fontWeight: "600",
                    backgroundColor: qual.isActive ? theme.success.bg : theme.error.bg,
                    color: qual.isActive ? theme.success.text : theme.error.text
                  }}>
                    {qual.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ padding: "12px", textAlign: "center" }}>
                  <button
                    onClick={() => handleEdit(qual)}
                    style={{
                      padding: "6px 12px",
                      marginRight: "8px",
                      backgroundColor: theme.info.main,
                      color: "white",
                      border: "none",
                      borderRadius: theme.radius.sm,
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(qual.id)}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: theme.error.main,
                      color: "white",
                      border: "none",
                      borderRadius: theme.radius.sm,
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

