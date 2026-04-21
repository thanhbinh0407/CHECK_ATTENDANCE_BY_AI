import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";
import { toastConfirm } from "../lib/notify.jsx";

export default function DependentManagement() {
  const [dependents, setDependents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterUserId, setFilterUserId] = useState("");
  const [formData, setFormData] = useState({
    userId: "",
    fullName: "",
    relationship: "",
    dateOfBirth: "",
    gender: "",
    idNumber: "",
    address: "",
    phoneNumber: "",
    email: "",
    occupation: "",
    notes: "",
    isDependent: true
  });

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchDependents();
    fetchEmployees();
  }, [filterUserId]);

  const fetchDependents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const url = filterUserId 
        ? `${apiBase}/api/dependents?userId=${filterUserId}`
        : `${apiBase}/api/dependents`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setDependents(data.dependents || []);
      } else {
        setMessage("Error: " + (data.message || "Unable to load dependents"));
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
        ? `${apiBase}/api/dependents/${editingId}`
        : `${apiBase}/api/dependents`;
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
          dateOfBirth: formData.dateOfBirth || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(editingId ? "Dependent updated successfully!" : "Dependent created successfully!");
        setShowForm(false);
        setEditingId(null);
        setFormData({ userId: "", fullName: "", relationship: "", dateOfBirth: "", gender: "", idNumber: "", address: "", phoneNumber: "", email: "", occupation: "", notes: "", isDependent: true });
        fetchDependents();
      } else {
        setMessage("Error: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dep) => {
    setEditingId(dep.id);
    setFormData({
      userId: dep.userId || "",
      fullName: dep.fullName || "",
      relationship: dep.relationship || "",
      dateOfBirth: dep.dateOfBirth ? dep.dateOfBirth.split('T')[0] : "",
      gender: dep.gender || "",
      idNumber: dep.idNumber || "",
      address: dep.address || "",
      phoneNumber: dep.phoneNumber || "",
      email: dep.email || "",
      occupation: dep.occupation || "",
      notes: dep.notes || "",
      isDependent: dep.isDependent !== undefined ? dep.isDependent : true
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const ok = await toastConfirm({ message: "Are you sure you want to delete this dependent?" });
    if (!ok) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/dependents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Dependent deleted successfully!");
        fetchDependents();
      } else {
        setMessage("Error: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRelationshipLabel = (rel) => {
    const labels = {
      parent: "Parent",
      spouse: "Spouse",
      child: "Con",
      grandparent: "Grandparent",
      sibling: "Sibling",
      other: "Other"
    };
    return labels[rel] || rel;
  };

  return (
    <div style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
        <h2 style={{ color: theme.primary.main, margin: 0, fontSize: "18px", fontWeight: 700 }}>👨‍👩‍👧‍👦 Dependents</h2>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            style={{
              padding: "6px 10px",
              fontSize: "13px",
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
              setFormData({ userId: filterUserId || "", fullName: "", relationship: "", dateOfBirth: "", gender: "", idNumber: "", address: "", phoneNumber: "", email: "", occupation: "", notes: "", isDependent: true });
            }}
            style={{
              padding: "7px 14px",
              fontSize: "13px",
              backgroundColor: theme.primary.main,
              color: "white",
              border: "none",
              borderRadius: theme.radius.sm,
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          padding: "8px 12px",
          fontSize: "13px",
          marginBottom: "12px",
          backgroundColor: message.toLowerCase().includes("success") ? theme.success.bg : theme.error.bg,
          color: message.toLowerCase().includes("success") ? theme.success.text : theme.error.text,
          borderRadius: theme.radius.sm
        }}>
          {message}
        </div>
      )}

      {showForm && (
        <div style={{
          backgroundColor: "white",
          padding: "16px",
          borderRadius: theme.radius.md,
          marginBottom: "14px",
          boxShadow: theme.shadows.sm
        }}>
          <h3 style={{ marginTop: 0, marginBottom: "12px", color: theme.primary.main, fontSize: "16px" }}>
            {editingId ? "Edit Dependent" : "Add New Dependent"}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: editingId ? "1fr 1fr" : "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              {!editingId && (
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "12px" }}>Employee *</label>
                  <select
                    required={!editingId}
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      fontSize: "13px",
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
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "12px" }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "12px" }}>Relationship *</label>
                <select
                  required
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                >
                  <option value="">Select relationship</option>
                  <option value="parent">Parent</option>
                  <option value="spouse">Spouse</option>
                  <option value="child">Con</option>
                  <option value="grandparent">Grandparent</option>
                  <option value="sibling">Sibling</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "12px" }}>Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "12px" }}>Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                >
                  <option value="">Select gender</option>
                  <option value="male">Nam</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "12px" }}>CMND/CCCD</label>
                <input
                  type="text"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "12px" }}>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "12px" }}>Phone Number</label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "12px" }}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "12px" }}>Occupation</label>
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "12px" }}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "13px",
                  border: `1px solid ${theme.neutral.gray300}`,
                  borderRadius: theme.radius.sm
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  fontSize: "13px",
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
                  setFormData({ userId: filterUserId || "", fullName: "", relationship: "", dateOfBirth: "", gender: "", idNumber: "", address: "", phoneNumber: "", email: "", occupation: "", notes: "", isDependent: true });
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: "13px",
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
        <div style={{ textAlign: "center", padding: "24px", fontSize: "13px" }}>Loading...</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white", borderRadius: theme.radius.md, overflow: "hidden" }}>
          <thead>
            <tr style={{ backgroundColor: theme.primary.main, color: "white" }}>
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "12px" }}>Employee</th>
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "12px" }}>Full Name</th>
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "12px" }}>Relationship</th>
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "12px" }}>Date of Birth</th>
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "12px" }}>Gender</th>
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "12px" }}>CMND/CCCD</th>
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "12px" }}>Phone</th>
              <th style={{ padding: "8px 10px", textAlign: "center", fontSize: "12px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dependents.map(dep => (
              <tr key={dep.id} style={{ borderBottom: `1px solid ${theme.neutral.gray200}` }}>
                <td style={{ padding: "8px 10px", fontSize: "13px" }}>
                  {dep.User ? `${dep.User.name} (${dep.User.employeeCode})` : "-"}
                </td>
                <td style={{ padding: "8px 10px", fontSize: "13px", fontWeight: "600" }}>{dep.fullName}</td>
                <td style={{ padding: "8px 10px", fontSize: "13px" }}>{getRelationshipLabel(dep.relationship)}</td>
                <td style={{ padding: "8px 10px", fontSize: "13px" }}>
                  {dep.dateOfBirth ? new Date(dep.dateOfBirth).toLocaleDateString("vi-VN") : "-"}
                </td>
                <td style={{ padding: "8px 10px", fontSize: "13px" }}>
                  {dep.gender === "male" ? "Male" : dep.gender === "female" ? "Female" : dep.gender || "-"}
                </td>
                <td style={{ padding: "8px 10px", fontSize: "13px" }}>{dep.idNumber || "-"}</td>
                <td style={{ padding: "8px 10px", fontSize: "13px" }}>{dep.phoneNumber || "-"}</td>
                <td style={{ padding: "8px 10px", textAlign: "center" }}>
                  <button
                    onClick={() => handleEdit(dep)}
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
                    onClick={() => handleDelete(dep.id)}
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

