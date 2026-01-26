import React, { useState, useEffect } from "react";

export default function Dependents({ userId }) {
  const [dependents, setDependents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    relationship: "spouse",
    dateOfBirth: "",
    gender: "male",
    idNumber: "",
    address: "",
    phoneNumber: "",
    email: ""
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchDependents();
  }, [userId]);

  const fetchDependents = async () => {
    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      if (!token) return;

      const res = await fetch(`${apiBase}/api/dependents/my`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok) {
        setDependents(data.dependents || []);
      }
    } catch (error) {
      console.error("Error fetching dependents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      const payload = {
        userId,
        ...formData
      };

      const url = editingId 
        ? `${apiBase}/api/dependents/${editingId}`
        : `${apiBase}/api/dependents`;

      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchDependents();
        setShowForm(false);
        setEditingId(null);
        setFormData({
          fullName: "",
          relationship: "spouse",
          dateOfBirth: "",
          gender: "male",
          idNumber: "",
          address: "",
          phoneNumber: "",
          email: ""
        });
      }
    } catch (error) {
      console.error("Error saving dependent:", error);
    }
  };

  const handleEdit = (dep) => {
    setEditingId(dep.id);
    setFormData({
      fullName: dep.fullName,
      relationship: dep.relationship,
      dateOfBirth: dep.dateOfBirth ? dep.dateOfBirth.split("T")[0] : "",
      gender: dep.gender || "male",
      idNumber: dep.idNumber || "",
      address: dep.address || "",
      phoneNumber: dep.phoneNumber || "",
      email: dep.email || ""
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Xóa người phụ thuộc này?")) return;

    try {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      const res = await fetch(`${apiBase}/api/dependents/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        await fetchDependents();
      }
    } catch (error) {
      console.error("Error deleting dependent:", error);
    }
  };

  const getRelationshipDisplay = (rel) => {
    const translations = {
      "spouse": "Vợ/Chồng",
      "child": "Con",
      "parent": "Bố mẹ",
      "grandparent": "Ông bà",
      "sibling": "Anh chị em",
      "other": "Khác"
    };
    return translations[rel] || rel;
  };

  return (
    <div style={{ padding: "20px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
      <h3>👨‍👩‍👧‍👦 Người phụ thuộc</h3>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: "8px 16px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginBottom: "15px"
          }}
        >
          + Thêm người phụ thuộc
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ backgroundColor: "white", padding: "15px", borderRadius: "8px", marginBottom: "15px" }}>
          <div style={{ marginBottom: "10px" }}>
            <label>Họ tên: </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div>
              <label>Quan hệ: </label>
              <select name="relationship" value={formData.relationship} onChange={handleInputChange} required>
                <option value="spouse">Vợ/Chồng</option>
                <option value="child">Con</option>
                <option value="parent">Bố mẹ</option>
                <option value="grandparent">Ông bà</option>
                <option value="sibling">Anh chị em</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div>
              <label>Giới tính: </label>
              <select name="gender" value={formData.gender} onChange={handleInputChange}>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div>
              <label>Ngày sinh: </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <div>
              <label>Số CMND/CCCD: </label>
              <input
                type="text"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleInputChange}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label>Địa chỉ: </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
            <div>
              <label>Số điện thoại: </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <div>
              <label>Email: </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
          </div>

          <div>
            <button type="submit" style={{ padding: "8px 16px", backgroundColor: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              {editingId ? "Cập nhật" : "Thêm"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({ fullName: "", relationship: "spouse", dateOfBirth: "", gender: "male", idNumber: "", address: "", phoneNumber: "", email: "" });
              }}
              style={{ padding: "8px 16px", backgroundColor: "#666", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginLeft: "10px" }}
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div>
          {dependents.length === 0 ? (
            <p style={{ color: "#666" }}>Chưa có người phụ thuộc</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#e0e0e0" }}>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Họ tên</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Quan hệ</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Ngày sinh</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Số điện thoại</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {dependents.map(dep => (
                  <tr key={dep.id} style={{ backgroundColor: dep.isDependent ? "white" : "#f5f5f5" }}>
                    <td style={{ padding: "10px", border: "1px solid #ddd" }}>{dep.fullName}</td>
                    <td style={{ padding: "10px", border: "1px solid #ddd" }}>{getRelationshipDisplay(dep.relationship)}</td>
                    <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                      {dep.dateOfBirth ? new Date(dep.dateOfBirth).toLocaleDateString("vi-VN") : "-"}
                    </td>
                    <td style={{ padding: "10px", border: "1px solid #ddd" }}>{dep.phoneNumber || "-"}</td>
                    <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                      <button
                        onClick={() => handleEdit(dep)}
                        style={{ padding: "4px 8px", backgroundColor: "#FFC107", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", marginRight: "5px" }}
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(dep.id)}
                        style={{ padding: "4px 8px", backgroundColor: "#f44336", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
