import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    managerId: "",
    isActive: true
  });

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setDepartments(data.departments || []);
      } else {
        setMessage("Lỗi: " + (data.message || "Không thể tải danh sách phòng ban"));
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
        ? `${apiBase}/api/departments/${editingId}`
        : `${apiBase}/api/departments`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formData,
          managerId: formData.managerId || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(editingId ? "Cập nhật phòng ban thành công!" : "Tạo phòng ban thành công!");
        setShowForm(false);
        setEditingId(null);
        setFormData({ code: "", name: "", description: "", managerId: "", isActive: true });
        fetchDepartments();
      } else {
        setMessage("Lỗi: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dept) => {
    setEditingId(dept.id);
    setFormData({
      code: dept.code || "",
      name: dept.name || "",
      description: dept.description || "",
      managerId: dept.managerId || "",
      isActive: dept.isActive !== undefined ? dept.isActive : true
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa phòng ban này?")) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/departments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Xóa phòng ban thành công!");
        fetchDepartments();
      } else {
        setMessage("Lỗi: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ color: theme.primary.main }}>🏢 Quản Lý Phòng Ban</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({ code: "", name: "", description: "", managerId: "", isActive: true });
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
          + Thêm Phòng Ban
        </button>
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
            {editingId ? "Chỉnh Sửa Phòng Ban" : "Thêm Phòng Ban Mới"}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Mã phòng ban *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Tên phòng ban *</label>
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
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Trưởng phòng</label>
                <select
                  value={formData.managerId}
                  onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.sm
                  }}
                >
                  <option value="">Chọn trưởng phòng</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "28px" }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span>Hoạt động</span>
                </label>
              </div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Mô tả</label>
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
                {loading ? "Đang lưu..." : (editingId ? "Cập nhật" : "Tạo mới")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ code: "", name: "", description: "", managerId: "", isActive: true });
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
              <th style={{ padding: "12px", textAlign: "left" }}>Mã</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Tên</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Trưởng phòng</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Mô tả</th>
              <th style={{ padding: "12px", textAlign: "center" }}>Trạng thái</th>
              <th style={{ padding: "12px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {departments.map(dept => {
              const manager = employees.find(e => e.id === dept.managerId);
              return (
                <tr key={dept.id} style={{ borderBottom: `1px solid ${theme.neutral.gray200}` }}>
                  <td style={{ padding: "12px" }}>{dept.code}</td>
                  <td style={{ padding: "12px", fontWeight: "600" }}>{dept.name}</td>
                  <td style={{ padding: "12px" }}>{manager ? `${manager.name} (${manager.employeeCode})` : "Chưa có"}</td>
                  <td style={{ padding: "12px" }}>{dept.description || "-"}</td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: theme.radius.full,
                      fontSize: "12px",
                      fontWeight: "600",
                      backgroundColor: dept.isActive ? theme.success.bg : theme.error.bg,
                      color: dept.isActive ? theme.success.text : theme.error.text
                    }}>
                      {dept.isActive ? "Hoạt động" : "Không hoạt động"}
                    </span>
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <button
                      onClick={() => handleEdit(dept)}
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
                      onClick={() => handleDelete(dept.id)}
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
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

