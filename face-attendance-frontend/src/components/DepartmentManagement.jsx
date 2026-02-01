import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";

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

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
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
        setMessage(data.message || "Lỗi khi tải danh sách phòng ban");
      }
    } catch (error) {
      setMessage("Lỗi kết nối đến server");
    } finally {
      setLoading(false);
    }
  };

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
        setMessage(editingDept ? "Cập nhật phòng ban thành công" : "Tạo phòng ban thành công");
        setShowForm(false);
        setEditingDept(null);
        setFormData({ code: "", name: "", description: "", managerId: null, isActive: true });
        fetchDepartments();
      } else {
        setMessage(data.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      setMessage("Lỗi kết nối đến server");
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
    if (!confirm("Bạn có chắc chắn muốn xóa phòng ban này?")) return;
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/departments/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Xóa phòng ban thành công");
        fetchDepartments();
      } else {
        setMessage(data.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      setMessage("Lỗi kết nối đến server");
    }
  };

  return (
    <div style={{ padding: theme.spacing.xl }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.lg }}>
        <h2 style={{ ...theme.typography.h2, margin: 0 }}>Quản lý Phòng ban</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingDept(null);
            setFormData({ code: "", name: "", description: "", managerId: null, isActive: true });
          }}
          style={{
            padding: `${theme.spacing.md} ${theme.spacing.lg}`,
            backgroundColor: theme.primary.main,
            color: theme.neutral.white,
            border: "none",
            borderRadius: theme.radius.md,
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          + Thêm phòng ban
        </button>
      </div>

      {message && (
        <div style={{
          padding: theme.spacing.md,
          marginBottom: theme.spacing.md,
          backgroundColor: message.includes("thành công") ? "#d4edda" : "#f8d7da",
          color: message.includes("thành công") ? "#155724" : "#721c24",
          borderRadius: theme.radius.md
        }}>
          {message}
        </div>
      )}

      {showForm && (
        <div style={{
          backgroundColor: theme.neutral.white,
          padding: theme.spacing.xl,
          borderRadius: theme.radius.lg,
          marginBottom: theme.spacing.lg,
          boxShadow: theme.shadows.md
        }}>
          <h3 style={{ marginTop: 0 }}>{editingDept ? "Chỉnh sửa phòng ban" : "Thêm phòng ban mới"}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600 }}>
                Mã phòng ban *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: theme.spacing.md,
                  border: `1px solid ${theme.neutral.gray300}`,
                  borderRadius: theme.radius.md,
                  fontSize: "14px"
                }}
              />
            </div>
            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600 }}>
                Tên phòng ban *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: theme.spacing.md,
                  border: `1px solid ${theme.neutral.gray300}`,
                  borderRadius: theme.radius.md,
                  fontSize: "14px"
                }}
              />
            </div>
            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600 }}>
                Mô tả
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                style={{
                  width: "100%",
                  padding: theme.spacing.md,
                  border: `1px solid ${theme.neutral.gray300}`,
                  borderRadius: theme.radius.md,
                  fontSize: "14px"
                }}
              />
            </div>
            <div style={{ display: "flex", gap: theme.spacing.md }}>
              <button
                type="submit"
                style={{
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                  backgroundColor: theme.primary.main,
                  color: theme.neutral.white,
                  border: "none",
                  borderRadius: theme.radius.md,
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                {editingDept ? "Cập nhật" : "Tạo mới"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingDept(null);
                }}
                style={{
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                  backgroundColor: theme.neutral.gray300,
                  color: theme.neutral.gray700,
                  border: "none",
                  borderRadius: theme.radius.md,
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div>Đang tải...</div>
      ) : (
        <div style={{
          backgroundColor: theme.neutral.white,
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          boxShadow: theme.shadows.md
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: theme.neutral.gray100 }}>
                <th style={{ padding: theme.spacing.md, textAlign: "left", fontWeight: 600 }}>Mã</th>
                <th style={{ padding: theme.spacing.md, textAlign: "left", fontWeight: 600 }}>Tên</th>
                <th style={{ padding: theme.spacing.md, textAlign: "left", fontWeight: 600 }}>Mô tả</th>
                <th style={{ padding: theme.spacing.md, textAlign: "left", fontWeight: 600 }}>Trạng thái</th>
                <th style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 600 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} style={{ borderTop: `1px solid ${theme.neutral.gray200}` }}>
                  <td style={{ padding: theme.spacing.md }}>{dept.code}</td>
                  <td style={{ padding: theme.spacing.md }}>{dept.name}</td>
                  <td style={{ padding: theme.spacing.md }}>{dept.description || "-"}</td>
                  <td style={{ padding: theme.spacing.md }}>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: theme.radius.sm,
                      backgroundColor: dept.isActive ? "#d4edda" : "#f8d7da",
                      color: dept.isActive ? "#155724" : "#721c24",
                      fontSize: "12px",
                      fontWeight: 600
                    }}>
                      {dept.isActive ? "Hoạt động" : "Không hoạt động"}
                    </span>
                  </td>
                  <td style={{ padding: theme.spacing.md, textAlign: "center" }}>
                    <button
                      onClick={() => handleEdit(dept)}
                      style={{
                        padding: "6px 12px",
                        marginRight: theme.spacing.xs,
                        backgroundColor: theme.primary.main,
                        color: theme.neutral.white,
                        border: "none",
                        borderRadius: theme.radius.sm,
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(dept.id)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: theme.error.main,
                        color: theme.neutral.white,
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
        </div>
      )}
    </div>
  );
}
