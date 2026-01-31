import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";

export default function EmployeeProfileModal({ employee, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [editForm, setEditForm] = useState({});
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [activeTab, setActiveTab] = useState("info");
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState(null);
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    if (employee) {
      fetchEmployeeDetails();
      fetchDepartments();
      fetchJobTitles();
      setNewPassword(null); // Reset new password when employee changes
    }
  }, [employee]);

  const fetchEmployeeDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/admin/employees/${employee.id}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setEmployeeDetails(data.employee);
        const emp = data.employee;
        setEditForm({
          name: emp.name || "",
          email: emp.email || "",
          phoneNumber: emp.phoneNumber || "",
          address: emp.address || "",
          dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split('T')[0] : "",
          gender: emp.gender || "",
          departmentId: emp.departmentId || null,
          jobTitleId: emp.jobTitleId || null,
          baseSalary: emp.baseSalary || 0,
          isActive: emp.isActive !== undefined ? emp.isActive : true,
          startDate: emp.startDate ? new Date(emp.startDate).toISOString().split('T')[0] : "",
          bankAccount: emp.bankAccount || "",
          bankName: emp.bankName || "",
          taxCode: emp.taxCode || "",
          idNumber: emp.idNumber || ""
        });
      }
    } catch (error) {
      setMessage("Lỗi khi tải thông tin nhân viên");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchJobTitles = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/job-titles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setJobTitles(data.jobTitles || []);
      }
    } catch (error) {
      console.error("Error fetching job titles:", error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/admin/employees/${employee.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(editForm)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Cập nhật thông tin thành công!");
        setIsEditing(false);
        fetchEmployeeDetails();
        if (onUpdate) onUpdate();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Lỗi: " + (data.message || "Không thể cập nhật"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn reset mật khẩu cho nhân viên này? Mật khẩu mới sẽ là: Password123!")) {
      return;
    }

    try {
      setResettingPassword(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/admin/employees/${employee.id}/reset-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok) {
        setNewPassword(data.newPassword);
        setMessage(`Reset mật khẩu thành công!`);
        fetchEmployeeDetails();
        setTimeout(() => setMessage(""), 5000);
      } else {
        setMessage("Lỗi: " + (data.message || "Không thể reset mật khẩu"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setResettingPassword(false);
    }
  };

  if (!employee) return null;

  const modalOverlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: theme.spacing.xl,
    overflowY: "auto"
  };

  const modalContentStyle = {
    backgroundColor: theme.neutral.white,
    borderRadius: theme.radius.xl,
    width: "100%",
    maxWidth: "1200px",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: theme.shadows.xl
  };

  const headerStyle = {
    background: theme.gradients.primary,
    color: theme.neutral.white,
    padding: theme.spacing.xl,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  };

  const tabsStyle = {
    display: "flex",
    borderBottom: `2px solid ${theme.neutral.gray200}`,
    backgroundColor: theme.neutral.gray50
  };

  const tabButtonStyle = (isActive) => ({
    flex: 1,
    padding: theme.spacing.md,
    border: "none",
    backgroundColor: isActive ? theme.neutral.white : "transparent",
    color: isActive ? theme.primary.main : theme.neutral.gray600,
    cursor: "pointer",
    fontWeight: isActive ? 600 : 400,
    borderBottom: isActive ? `3px solid ${theme.primary.main}` : "none",
    transition: "all 0.2s"
  });

  const contentStyle = {
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing.xl
  };

  const infoGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xl
  };

  const infoCardStyle = {
    padding: theme.spacing.md,
    backgroundColor: theme.neutral.gray50,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.neutral.gray200}`
  };

  const labelStyle = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: theme.neutral.gray600,
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  };

  const valueStyle = {
    fontSize: "16px",
    fontWeight: 500,
    color: theme.neutral.gray900
  };

  const inputStyle = {
    width: "100%",
    padding: theme.spacing.md,
    border: `1px solid ${theme.neutral.gray300}`,
    borderRadius: theme.radius.md,
    fontSize: "14px",
    fontFamily: "inherit"
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>
              {employeeDetails?.name || employee.name}
            </h2>
            <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: "14px", opacity: 0.9 }}>
              {employeeDetails?.employeeCode || employee.employeeCode} | {employeeDetails?.email || employee.email}
            </p>
          </div>
          <div style={{ display: "flex", gap: theme.spacing.sm, alignItems: "center" }}>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  color: theme.neutral.white,
                  border: "none",
                  borderRadius: theme.radius.md,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "14px"
                }}
              >
                ✏️ Chỉnh sửa
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: "rgba(255,255,255,0.2)",
                color: theme.neutral.white,
                border: "none",
                borderRadius: theme.radius.md,
                cursor: "pointer",
                fontSize: "20px",
                fontWeight: 700
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {message && (
          <div style={{
            padding: theme.spacing.md,
            margin: theme.spacing.md,
            backgroundColor: message.includes("thành công") ? "#d4edda" : "#f8d7da",
            color: message.includes("thành công") ? "#155724" : "#721c24",
            borderRadius: theme.radius.md,
            fontSize: "14px"
          }}>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div style={tabsStyle}>
          <button style={tabButtonStyle(activeTab === "info")} onClick={() => setActiveTab("info")}>
            📋 Thông tin cá nhân
          </button>
          <button style={tabButtonStyle(activeTab === "work")} onClick={() => setActiveTab("work")}>
            💼 Thông tin công việc
          </button>
          <button style={tabButtonStyle(activeTab === "family")} onClick={() => setActiveTab("family")}>
            👨‍👩‍👧‍👦 Gia đình
          </button>
          <button style={tabButtonStyle(activeTab === "qualifications")} onClick={() => setActiveTab("qualifications")}>
            🎓 Bằng cấp
          </button>
          <button style={tabButtonStyle(activeTab === "attendance")} onClick={() => setActiveTab("attendance")}>
            📍 Chuyên cần
          </button>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {loading && !employeeDetails ? (
            <div style={{ textAlign: "center", padding: theme.spacing.xxl }}>
              Đang tải thông tin...
            </div>
          ) : (
            <>
              {/* Tab: Thông tin cá nhân */}
              {activeTab === "info" && (
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
                    Thông tin cá nhân
                  </h3>
                  <div style={infoGridStyle}>
                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Họ và tên *</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          style={inputStyle}
                          required
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.name || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Email *</label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          style={inputStyle}
                          required
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.email || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Số điện thoại</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.phoneNumber}
                          onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.phoneNumber || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Ngày sinh</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.dateOfBirth}
                          onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.dateOfBirth ? new Date(employeeDetails.dateOfBirth).toLocaleDateString('vi-VN') : "-"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Giới tính</label>
                      {isEditing ? (
                        <select
                          value={editForm.gender}
                          onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="">Chọn giới tính</option>
                          <option value="male">Nam</option>
                          <option value="female">Nữ</option>
                          <option value="other">Khác</option>
                        </select>
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.gender === "male" ? "Nam" : 
                           employeeDetails?.gender === "female" ? "Nữ" : 
                           employeeDetails?.gender === "other" ? "Khác" : "-"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>CMND/CCCD</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.idNumber}
                          onChange={(e) => setEditForm({ ...editForm, idNumber: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.idNumber || "-"}</div>
                      )}
                    </div>

                    <div style={{ ...infoCardStyle, gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Địa chỉ</label>
                      {isEditing ? (
                        <textarea
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          rows={3}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.address || "-"}</div>
                      )}
                    </div>

                    <div style={{ ...infoCardStyle, gridColumn: "1 / -1", backgroundColor: newPassword ? "#d4edda" : "#fff3cd", border: `2px solid ${newPassword ? "#28a745" : "#ffc107"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.xs }}>
                        <label style={labelStyle}>Mật khẩu</label>
                        <button
                          onClick={handleResetPassword}
                          disabled={resettingPassword}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: theme.warning.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: resettingPassword ? "not-allowed" : "pointer",
                            fontSize: "13px",
                            fontWeight: 600
                          }}
                        >
                          {resettingPassword ? "⏳ Đang reset..." : "🔄 Reset mật khẩu"}
                        </button>
                      </div>
                      {newPassword ? (
                        <div style={{ 
                          ...valueStyle, 
                          fontFamily: "monospace", 
                          fontSize: "18px", 
                          fontWeight: 700,
                          color: theme.success.main,
                          backgroundColor: "#fff", 
                          padding: theme.spacing.md, 
                          borderRadius: theme.radius.sm, 
                          border: "2px solid #28a745",
                          textAlign: "center",
                          letterSpacing: "2px"
                        }}>
                          {newPassword}
                        </div>
                      ) : (
                        <div style={{ ...valueStyle, fontFamily: "monospace", fontSize: "12px", wordBreak: "break-all", backgroundColor: "#fff", padding: theme.spacing.sm, borderRadius: theme.radius.sm, border: "1px solid #ddd" }}>
                          {showPassword && employeeDetails?.password ? (
                            <span style={{ color: theme.neutral.gray700 }}>
                              Hash: {employeeDetails.password.substring(0, 50)}...
                            </span>
                          ) : (
                            <span style={{ color: theme.neutral.gray500 }}>
                              {employeeDetails?.password ? "••••••••••••••••••••••••••••••••" : "Chưa có mật khẩu"}
                            </span>
                          )}
                        </div>
                      )}
                      <div style={{ fontSize: "11px", color: theme.neutral.gray600, marginTop: theme.spacing.xs, fontStyle: "italic" }}>
                        {newPassword ? (
                          <span style={{ color: theme.success.main, fontWeight: 600 }}>
                            ✅ Mật khẩu mới đã được tạo! Vui lòng lưu lại thông tin này.
                          </span>
                        ) : (
                          "Mật khẩu được hash bằng bcrypt, không thể hiển thị dạng plain text. Sử dụng nút Reset để tạo mật khẩu mới (mặc định: Password123!)"
                        )}
                      </div>
                      {!newPassword && employeeDetails?.password && (
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            marginTop: theme.spacing.xs,
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            backgroundColor: theme.neutral.gray200,
                            border: "none",
                            borderRadius: theme.radius.sm,
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: 600
                          }}
                        >
                          {showPassword ? "👁️ Ẩn hash" : "👁️ Hiện hash"}
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div style={{ display: "flex", gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          backgroundColor: theme.primary.main,
                          color: theme.neutral.white,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: loading ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          fontSize: "16px"
                        }}
                      >
                        {loading ? "Đang lưu..." : "💾 Lưu thay đổi"}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          fetchEmployeeDetails();
                        }}
                        style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          backgroundColor: theme.neutral.gray300,
                          color: theme.neutral.gray700,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "16px"
                        }}
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Thông tin công việc */}
              {activeTab === "work" && (
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
                    Thông tin công việc
                  </h3>
                  <div style={infoGridStyle}>
                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Mã nhân viên</label>
                      <div style={valueStyle}>{employeeDetails?.employeeCode || "-"}</div>
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Phòng ban</label>
                      {isEditing ? (
                        <select
                          value={editForm.departmentId || ""}
                          onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value ? parseInt(e.target.value) : null })}
                          style={inputStyle}
                        >
                          <option value="">Chọn phòng ban</option>
                          {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.department || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Chức vụ</label>
                      {isEditing ? (
                        <select
                          value={editForm.jobTitleId || ""}
                          onChange={(e) => setEditForm({ ...editForm, jobTitleId: e.target.value ? parseInt(e.target.value) : null })}
                          style={inputStyle}
                        >
                          <option value="">Chọn chức vụ</option>
                          {jobTitles.map(job => (
                            <option key={job.id} value={job.id}>{job.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.jobTitle || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Lương cơ bản (VNĐ)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.baseSalary}
                          onChange={(e) => setEditForm({ ...editForm, baseSalary: parseFloat(e.target.value) || 0 })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.baseSalary ? new Intl.NumberFormat('vi-VN').format(employeeDetails.baseSalary) + " VNĐ" : "-"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Ngày vào làm</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.startDate}
                          onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.startDate ? new Date(employeeDetails.startDate).toLocaleDateString('vi-VN') : "-"}
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Trạng thái</label>
                      {isEditing ? (
                        <label style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
                          <input
                            type="checkbox"
                            checked={editForm.isActive}
                            onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                          />
                          <span>Đang làm việc</span>
                        </label>
                      ) : (
                        <div style={valueStyle}>
                          <span style={{
                            padding: "4px 12px",
                            borderRadius: theme.radius.full,
                            backgroundColor: employeeDetails?.isActive ? "#d4edda" : "#f8d7da",
                            color: employeeDetails?.isActive ? "#155724" : "#721c24",
                            fontSize: "12px",
                            fontWeight: 600
                          }}>
                            {employeeDetails?.isActive ? "Đang làm việc" : "Đã nghỉ"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Số tài khoản ngân hàng</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.bankAccount}
                          onChange={(e) => setEditForm({ ...editForm, bankAccount: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.bankAccount || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Tên ngân hàng</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.bankName}
                          onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.bankName || "-"}</div>
                      )}
                    </div>

                    <div style={infoCardStyle}>
                      <label style={labelStyle}>Mã số thuế</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.taxCode}
                          onChange={(e) => setEditForm({ ...editForm, taxCode: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.taxCode || "-"}</div>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div style={{ display: "flex", gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          backgroundColor: theme.primary.main,
                          color: theme.neutral.white,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: loading ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          fontSize: "16px"
                        }}
                      >
                        {loading ? "Đang lưu..." : "💾 Lưu thay đổi"}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          fetchEmployeeDetails();
                        }}
                        style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          backgroundColor: theme.neutral.gray300,
                          color: theme.neutral.gray700,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "16px"
                        }}
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Gia đình */}
              {activeTab === "family" && (
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
                    Người phụ thuộc
                  </h3>
                  {employeeDetails?.Dependents && employeeDetails.Dependents.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: theme.spacing.md }}>
                      {employeeDetails.Dependents.map((dep) => (
                        <div key={dep.id} style={{
                          padding: theme.spacing.md,
                          backgroundColor: theme.neutral.gray50,
                          borderRadius: theme.radius.md,
                          border: `1px solid ${theme.neutral.gray200}`
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs, fontSize: "16px" }}>
                            {dep.fullName}
                          </div>
                          <div style={{ fontSize: "14px", color: theme.neutral.gray600 }}>
                            <div>Quan hệ: {dep.relationship}</div>
                            {dep.dateOfBirth && (
                              <div>Ngày sinh: {new Date(dep.dateOfBirth).toLocaleDateString('vi-VN')}</div>
                            )}
                            {dep.gender && <div>Giới tính: {dep.gender}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: theme.neutral.gray500, fontStyle: "italic" }}>Chưa có người phụ thuộc</p>
                  )}
                </div>
              )}

              {/* Tab: Bằng cấp */}
              {activeTab === "qualifications" && (
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
                    Bằng cấp và chứng chỉ
                  </h3>
                  {employeeDetails?.Qualifications && employeeDetails.Qualifications.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: theme.spacing.md }}>
                      {employeeDetails.Qualifications.map((qual) => (
                        <div key={qual.id} style={{
                          padding: theme.spacing.md,
                          backgroundColor: theme.neutral.gray50,
                          borderRadius: theme.radius.md,
                          border: `1px solid ${theme.neutral.gray200}`
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs, fontSize: "16px" }}>
                            {qual.name}
                          </div>
                          <div style={{ fontSize: "14px", color: theme.neutral.gray600 }}>
                            <div>Loại: {qual.type}</div>
                            {qual.issuedBy && <div>Cấp bởi: {qual.issuedBy}</div>}
                            {qual.issuedDate && (
                              <div>Cấp ngày: {new Date(qual.issuedDate).toLocaleDateString('vi-VN')}</div>
                            )}
                            {qual.documentPath && (
                              <a
                                href={`${apiBase}${qual.documentPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: theme.primary.main, textDecoration: "underline", fontSize: "12px" }}
                              >
                                Xem tài liệu
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: theme.neutral.gray500, fontStyle: "italic" }}>Chưa có bằng cấp hoặc chứng chỉ</p>
                  )}
                </div>
              )}

              {/* Tab: Chuyên cần */}
              {activeTab === "attendance" && (
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
                    Thống kê chuyên cần
                  </h3>
                  {employeeDetails?.attendanceStats ? (
                    <div style={infoGridStyle}>
                      <div style={infoCardStyle}>
                        <label style={labelStyle}>Tổng ngày làm việc</label>
                        <div style={{ ...valueStyle, fontSize: "24px", fontWeight: 700, color: theme.primary.main }}>
                          {employeeDetails.attendanceStats.totalDaysWorked || 0}
                        </div>
                      </div>
                      <div style={infoCardStyle}>
                        <label style={labelStyle}>Số lần muộn</label>
                        <div style={{ ...valueStyle, fontSize: "24px", fontWeight: 700, color: theme.warning.main }}>
                          {employeeDetails.attendanceStats.totalLate || 0}
                        </div>
                      </div>
                      <div style={infoCardStyle}>
                        <label style={labelStyle}>Số lần về sớm</label>
                        <div style={{ ...valueStyle, fontSize: "24px", fontWeight: 700, color: theme.warning.main }}>
                          {employeeDetails.attendanceStats.totalEarlyLeave || 0}
                        </div>
                      </div>
                      <div style={infoCardStyle}>
                        <label style={labelStyle}>Số ngày vắng</label>
                        <div style={{ ...valueStyle, fontSize: "24px", fontWeight: 700, color: theme.error.main }}>
                          {employeeDetails.attendanceStats.totalAbsent || 0}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: theme.neutral.gray500 }}>Chưa có dữ liệu chuyên cần</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

