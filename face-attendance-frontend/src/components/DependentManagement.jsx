import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";

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
        setMessage("Lỗi: " + (data.message || "Không thể tải danh sách người phụ thuộc"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
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
        setMessage(editingId ? "Cập nhật người phụ thuộc thành công!" : "Tạo người phụ thuộc thành công!");
        setShowForm(false);
        setEditingId(null);
        setFormData({ userId: "", fullName: "", relationship: "", dateOfBirth: "", gender: "", idNumber: "", address: "", phoneNumber: "", email: "", occupation: "", notes: "", isDependent: true });
        fetchDependents();
      } else {
        setMessage("Lỗi: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
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
    if (!window.confirm("Bạn chắc chắn muốn xóa người phụ thuộc này?")) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/dependents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Xóa người phụ thuộc thành công!");
        fetchDependents();
      } else {
        setMessage("Lỗi: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRelationshipLabel = (rel) => {
    const labels = {
      parent: "Cha/Mẹ",
      spouse: "Vợ/Chồng",
      child: "Con",
      grandparent: "Ông/Bà",
      sibling: "Anh/Chị/Em",
      other: "Khác"
    };
    return labels[rel] || rel;
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ color: theme.primary.main }}>👨‍👩‍👧‍👦 Quản Lý Người Phụ Thuộc</h2>
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
            <option value="">Tất cả nhân viên</option>
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
              padding: "10px 20px",
              backgroundColor: theme.primary.main,
              color: "white",
              border: "none",
              borderRadius: theme.radius.md,
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            + Thêm Người Phụ Thuộc
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          padding: "12px",
          marginBottom: "20px",
          backgroundColor: message.includes("thành công") ? theme.success.bg : theme.error.bg,
          color: message.includes("thành công") ? theme.success.text : theme.error.text,
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
            {editingId ? "Chỉnh Sửa Người Phụ Thuộc" : "Thêm Người Phụ Thuộc Mới"}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: editingId ? "1fr 1fr" : "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              {!editingId && (
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Nhân viên *</label>
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
                    <option value="">Chọn nhân viên</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Quan hệ *</label>
                <select
                  required
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                >
                  <option value="">Chọn quan hệ</option>
                  <option value="parent">Cha/Mẹ</option>
                  <option value="spouse">Vợ/Chồng</option>
                  <option value="child">Con</option>
                  <option value="grandparent">Ông/Bà</option>
                  <option value="sibling">Anh/Chị/Em</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Ngày sinh</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Giới tính</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                >
                  <option value="">Chọn giới tính</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>CMND/CCCD</label>
                <input
                  type="text"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Địa chỉ</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Số điện thoại</label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Nghề nghiệp</label>
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Ghi chú</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                {loading ? "Đang lưu..." : (editingId ? "Cập nhật" : "Tạo mới")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ userId: filterUserId || "", fullName: "", relationship: "", dateOfBirth: "", gender: "", idNumber: "", address: "", phoneNumber: "", email: "", occupation: "", notes: "", isDependent: true });
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
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && !showForm ? (
        <div style={{ textAlign: "center", padding: "40px" }}>Đang tải...</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white", borderRadius: theme.radius.md, overflow: "hidden" }}>
          <thead>
            <tr style={{ backgroundColor: theme.primary.main, color: "white" }}>
              <th style={{ padding: "12px", textAlign: "left" }}>Nhân viên</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Họ tên</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Quan hệ</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Ngày sinh</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Giới tính</th>
              <th style={{ padding: "12px", textAlign: "left" }}>CMND/CCCD</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Số điện thoại</th>
              <th style={{ padding: "12px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {dependents.map(dep => (
              <tr key={dep.id} style={{ borderBottom: `1px solid ${theme.neutral.gray200}` }}>
                <td style={{ padding: "12px" }}>
                  {dep.User ? `${dep.User.name} (${dep.User.employeeCode})` : "-"}
                </td>
                <td style={{ padding: "12px", fontWeight: "600" }}>{dep.fullName}</td>
                <td style={{ padding: "12px" }}>{getRelationshipLabel(dep.relationship)}</td>
                <td style={{ padding: "12px" }}>
                  {dep.dateOfBirth ? new Date(dep.dateOfBirth).toLocaleDateString("vi-VN") : "-"}
                </td>
                <td style={{ padding: "12px" }}>
                  {dep.gender === "male" ? "Nam" : dep.gender === "female" ? "Nữ" : dep.gender || "-"}
                </td>
                <td style={{ padding: "12px" }}>{dep.idNumber || "-"}</td>
                <td style={{ padding: "12px" }}>{dep.phoneNumber || "-"}</td>
                <td style={{ padding: "12px", textAlign: "center" }}>
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
                    Sửa
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
                    Xóa
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

