import React, { useState, useEffect } from "react";

export default function Qualifications({ userId }) {
  const [qualifications, setQualifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "certificate",
    name: "",
    issuedBy: "",
    issuedDate: "",
    expiryDate: "",
    certificateNumber: "",
    description: ""
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchQualifications();
  }, [userId]);

  const fetchQualifications = async () => {
    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      if (!token) return;

      const res = await fetch(`${apiBase}/api/qualifications/my`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok) {
        setQualifications(data.qualifications || []);
      }
    } catch (error) {
      console.error("Error fetching qualifications:", error);
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
        ? `${apiBase}/api/qualifications/${editingId}`
        : `${apiBase}/api/qualifications`;

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
        await fetchQualifications();
        setShowForm(false);
        setEditingId(null);
        setFormData({
          type: "certificate",
          name: "",
          issuedBy: "",
          issuedDate: "",
          expiryDate: "",
          certificateNumber: "",
          description: ""
        });
      }
    } catch (error) {
      console.error("Error saving qualification:", error);
    }
  };

  const handleEdit = (qual) => {
    setEditingId(qual.id);
    setFormData({
      type: qual.type,
      name: qual.name,
      issuedBy: qual.issuedBy || "",
      issuedDate: qual.issuedDate ? qual.issuedDate.split("T")[0] : "",
      expiryDate: qual.expiryDate ? qual.expiryDate.split("T")[0] : "",
      certificateNumber: qual.certificateNumber || "",
      description: qual.description || ""
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Xóa chứng chỉ này?")) return;

    try {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      const res = await fetch(`${apiBase}/api/qualifications/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        await fetchQualifications();
      }
    } catch (error) {
      console.error("Error deleting qualification:", error);
    }
  };

  return (
    <div style={{ padding: "20px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
      <h3>📜 Chứng chỉ và Bằng cấp</h3>

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
          + Thêm chứng chỉ
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ backgroundColor: "white", padding: "15px", borderRadius: "8px", marginBottom: "15px" }}>
          <div style={{ marginBottom: "10px" }}>
            <label>Loại: </label>
            <select name="type" value={formData.type} onChange={handleInputChange} required>
              <option value="certificate">Chứng chỉ</option>
              <option value="degree">Bằng cấp</option>
              <option value="license">Giấy phép</option>
              <option value="training">Đào tạo</option>
            </select>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label>Tên: </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label>Cơ quan cấp: </label>
            <input
              type="text"
              name="issuedBy"
              value={formData.issuedBy}
              onChange={handleInputChange}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div>
              <label>Ngày cấp: </label>
              <input
                type="date"
                name="issuedDate"
                value={formData.issuedDate}
                onChange={handleInputChange}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <div>
              <label>Ngày hết hạn: </label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label>Số chứng chỉ: </label>
            <input
              type="text"
              name="certificateNumber"
              value={formData.certificateNumber}
              onChange={handleInputChange}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Ghi chú: </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              style={{ width: "100%", padding: "8px", minHeight: "80px" }}
            />
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
                setFormData({ type: "certificate", name: "", issuedBy: "", issuedDate: "", expiryDate: "", certificateNumber: "", description: "" });
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
          {qualifications.length === 0 ? (
            <p style={{ color: "#666" }}>Chưa có chứng chỉ</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#e0e0e0" }}>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Loại</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Tên</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Cơ quan cấp</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Ngày cấp</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {qualifications.map(qual => (
                  <tr key={qual.id} style={{ backgroundColor: qual.isActive ? "white" : "#f5f5f5" }}>
                    <td style={{ padding: "10px", border: "1px solid #ddd" }}>{qual.type}</td>
                    <td style={{ padding: "10px", border: "1px solid #ddd" }}>{qual.name}</td>
                    <td style={{ padding: "10px", border: "1px solid #ddd" }}>{qual.issuedBy || "-"}</td>
                    <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                      {qual.issuedDate ? new Date(qual.issuedDate).toLocaleDateString("vi-VN") : "-"}
                    </td>
                    <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                      <button
                        onClick={() => handleEdit(qual)}
                        style={{ padding: "4px 8px", backgroundColor: "#FFC107", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", marginRight: "5px" }}
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(qual.id)}
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
