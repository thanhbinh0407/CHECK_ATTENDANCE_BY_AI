import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";

export default function EmployeeDetailView() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("info");
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployeeForModal, setSelectedEmployeeForModal] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [managers, setManagers] = useState([]);

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchJobTitles();
    fetchManagers();
  }, []);

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

  const fetchManagers = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        const managerList = (data.employees || []).filter(emp =>
          (emp.role === "admin" || emp.role === "accountant" || emp.isActive)
        );
        setManagers(managerList);
      }
    } catch (error) {
      console.error("Error fetching managers:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setMessage("Lỗi khi tải danh sách nhân viên");
    } finally {
      setLoading(false);
    }
  };

  const openEmployeeModal = async (employeeId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/admin/employees/${employeeId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedEmployeeForModal(data.employee || {});
        setShowModal(true);
        setSelectedEmployee(employeeId);
      } else {
        setMessage("Không thể tải chi tiết nhân viên");
      }
    } catch (error) {
      console.error("Error fetching employee details:", error);
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditForm({
      name: selectedEmployeeForModal.name || "",
      email: selectedEmployeeForModal.email || "",
      phoneNumber: selectedEmployeeForModal.phoneNumber || "",
      address: selectedEmployeeForModal.address || "",
      dateOfBirth: selectedEmployeeForModal.dateOfBirth ? new Date(selectedEmployeeForModal.dateOfBirth).toISOString().split('T')[0] : "",
      gender: selectedEmployeeForModal.gender || "",
      departmentId: selectedEmployeeForModal.departmentId || null,
      jobTitleId: selectedEmployeeForModal.jobTitleId || null,
      baseSalary: selectedEmployeeForModal.baseSalary || 0,
      isActive: selectedEmployeeForModal.isActive !== undefined ? selectedEmployeeForModal.isActive : true,
      startDate: selectedEmployeeForModal.startDate ? new Date(selectedEmployeeForModal.startDate).toISOString().split('T')[0] : "",
      contractType: selectedEmployeeForModal.contractType || "",
      employmentStatus: selectedEmployeeForModal.employmentStatus || "active",
      managerId: selectedEmployeeForModal.managerId || null,
      branchName: selectedEmployeeForModal.branchName || ""
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const payload = {
        ...editForm,
        contractType: editForm.contractType || null,
        startDate: editForm.startDate || null,
        managerId: editForm.managerId ? parseInt(editForm.managerId) : null
      };
      const res = await fetch(`${apiBase}/api/admin/employees/${selectedEmployeeForModal.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Cập nhật thông tin nhân viên thành công!");
        setIsEditing(false);
        openEmployeeModal(selectedEmployeeForModal.id); // Refresh data
        fetchEmployees(); // Refresh list
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

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: theme.spacing.xl, backgroundColor: theme.neutral.gray50, minHeight: "100vh" }}>
      <h1 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>👤 Thông Tin Chi Tiết Nhân Viên</h1>

      {message && (
        <div
          style={{
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            backgroundColor: message.includes("Lỗi") ? "#f8d7da" : "#d4edda",
            color: message.includes("Lỗi") ? "#721c24" : "#155724",
            borderRadius: theme.radius.md
          }}
        >
          {message}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: theme.spacing.xl }}>
        {/* Employee List */}
        <div
          style={{
            backgroundColor: theme.neutral.white,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.lg,
            boxShadow: theme.shadows.md,
            height: "fit-content"
          }}
        >
          <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>📋 Danh Sách Nhân Viên</h3>

          <input
            type="text"
            placeholder="Tìm kiếm tên hoặc mã NV..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: theme.spacing.md,
              marginBottom: theme.spacing.lg,
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.neutral.gray300}`
            }}
          />

          <div style={{ maxHeight: "600px", overflowY: "auto" }}>
            {filteredEmployees.length === 0 ? (
              <p style={{ color: theme.neutral.gray500, textAlign: "center", padding: theme.spacing.xl }}>
                Không tìm thấy nhân viên
              </p>
            ) : (
              filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => openEmployeeModal(emp.id)}
                  style={{
                    padding: theme.spacing.md,
                    marginBottom: theme.spacing.sm,
                    backgroundColor: selectedEmployee === emp.id ? theme.primary.main : theme.neutral.gray100,
                    color: selectedEmployee === emp.id ? theme.neutral.white : theme.neutral.gray900,
                    borderRadius: theme.radius.md,
                    cursor: "pointer",
                    transition: theme.transitions.normal,
                    borderLeft: selectedEmployee === emp.id ? `4px solid ${theme.neutral.white}` : "none"
                  }}
                >
                  <div style={{ fontWeight: "600", fontSize: theme.typography.body.fontSize }}>{emp.name}</div>
                  <div style={{ fontSize: theme.typography.small.fontSize, opacity: 0.8 }}>
                    {emp.employeeCode} | {emp.Department?.name || "N/A"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Employee Details - Now shown in modal */}
        <div>
          {!showModal && (
            <div
              style={{
                backgroundColor: theme.neutral.white,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.xxl,
                textAlign: "center",
                color: theme.neutral.gray500
              }}
            >
              <div style={{ fontSize: "3em", marginBottom: theme.spacing.md }}>👈</div>
              <p>Chọn một nhân viên từ danh sách để xem chi tiết</p>
            </div>
          )}
        </div>

        {/* Employee Details Modal */}
        {showModal && selectedEmployeeForModal && (
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
              zIndex: theme.zIndex.modal,
              padding: theme.spacing.xl
            }}
            onClick={() => {
              setShowModal(false);
              setSelectedEmployeeForModal(null);
            }}
          >
            <div
              style={{
                backgroundColor: theme.neutral.white,
                borderRadius: theme.radius.lg,
                overflow: "hidden",
                boxShadow: theme.shadows.xl,
                maxWidth: "900px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  backgroundColor: theme.primary.main,
                  color: theme.neutral.white,
                  padding: theme.spacing.xl,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <h2 style={{ margin: `0 0 ${theme.spacing.md} 0` }}>{selectedEmployeeForModal.name}</h2>
                  <div style={{ display: "flex", gap: theme.spacing.xl, fontSize: theme.typography.small.fontSize }}>
                    <span><strong>Mã NV:</strong> {selectedEmployeeForModal.employeeCode}</span>
                    <span><strong>Chức vụ:</strong> {selectedEmployeeForModal.JobTitle?.name || "N/A"}</span>
                    <span><strong>Phòng ban:</strong> {selectedEmployeeForModal.Department?.name || "N/A"}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: theme.spacing.sm }}>
                  {!isEditing && (
                    <button
                      onClick={handleEdit}
                      style={{
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        backgroundColor: "rgba(255,255,255,0.2)",
                        color: theme.neutral.white,
                        border: "none",
                        borderRadius: theme.radius.md,
                        cursor: "pointer",
                        fontWeight: 600
                      }}
                    >
                      ✏️ Chỉnh sửa
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedEmployeeForModal(null);
                      setIsEditing(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: theme.neutral.white,
                      fontSize: "24px",
                      cursor: "pointer",
                      padding: `${theme.spacing.xs} ${theme.spacing.md}`
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: `1px solid ${theme.neutral.gray200}` }}>
                {["info", "attendance", "leave", "salary"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1,
                      padding: theme.spacing.md,
                      border: "none",
                      backgroundColor: activeTab === tab ? theme.primary.main : theme.neutral.white,
                      color: activeTab === tab ? theme.neutral.white : theme.neutral.gray900,
                      cursor: "pointer",
                      fontWeight: activeTab === tab ? "600" : "400",
                      borderBottom: activeTab === tab ? `3px solid ${theme.info.main}` : "none"
                    }}
                  >
                    {tab === "info" && "ℹ️ Thông Tin"}
                    {tab === "attendance" && "📍 Chuyên Cần"}
                    {tab === "leave" && "📅 Nghỉ Phép"}
                    {tab === "salary" && "💰 Lương"}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div style={{ padding: theme.spacing.xl }}>
                {/* Info Tab */}
                {activeTab === "info" && selectedEmployeeForModal && (
                  <div>
                    <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>Thông Tin Cá Nhân</h3>

                    {isEditing ? (
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.xl, marginBottom: theme.spacing.xl }}>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Tên *</label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Email *</label>
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Số điện thoại</label>
                            <input
                              type="text"
                              value={editForm.phoneNumber}
                              onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Ngày sinh</label>
                            <input
                              type="date"
                              value={editForm.dateOfBirth}
                              onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Giới tính</label>
                            <select
                              value={editForm.gender}
                              onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            >
                              <option value="">Chọn giới tính</option>
                              <option value="male">Nam</option>
                              <option value="female">Nữ</option>
                              <option value="other">Khác</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Phòng ban</label>
                            <select
                              value={editForm.departmentId || ""}
                              onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value ? parseInt(e.target.value) : null })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            >
                              <option value="">Chọn phòng ban</option>
                              {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Chức vụ</label>
                            <select
                              value={editForm.jobTitleId || ""}
                              onChange={(e) => setEditForm({ ...editForm, jobTitleId: e.target.value ? parseInt(e.target.value) : null })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            >
                              <option value="">Chọn chức vụ</option>
                              {jobTitles.map(job => (
                                <option key={job.id} value={job.id}>{job.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Lương cơ bản (VNĐ)</label>
                            <input
                              type="number"
                              value={editForm.baseSalary}
                              onChange={(e) => setEditForm({ ...editForm, baseSalary: parseFloat(e.target.value) || 0 })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Ngày bắt đầu làm việc</label>
                            <input
                              type="date"
                              value={editForm.startDate}
                              onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            />
                            <p style={{ margin: theme.spacing.xs, fontSize: theme.typography.small.fontSize, color: theme.neutral.gray500 }}>
                              Dùng để tính thâm niên và ngày phép năm
                            </p>
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Loại hợp đồng</label>
                            <select
                              value={editForm.contractType || ""}
                              onChange={(e) => setEditForm({ ...editForm, contractType: e.target.value || null })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            >
                              <option value="">Chọn loại hợp đồng</option>
                              <option value="probation">Thử việc</option>
                              <option value="1_year">Hợp đồng 1 năm</option>
                              <option value="3_year">Hợp đồng 3 năm</option>
                              <option value="indefinite">Không xác định thời hạn</option>
                              <option value="other">Khác</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Trạng thái lao động</label>
                            <select
                              value={editForm.employmentStatus || "active"}
                              onChange={(e) => setEditForm({ ...editForm, employmentStatus: e.target.value })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            >
                              <option value="active">Đang làm việc</option>
                              <option value="maternity_leave">Đang nghỉ thai sản</option>
                              <option value="unpaid_leave">Nghỉ không lương</option>
                              <option value="terminated">Đã nghỉ việc</option>
                              <option value="resigned">Đã từ chức</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Chi nhánh</label>
                            <input
                              type="text"
                              value={editForm.branchName}
                              onChange={(e) => setEditForm({ ...editForm, branchName: e.target.value })}
                              placeholder="Tên chi nhánh/văn phòng"
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Quản lý trực tiếp</label>
                            <select
                              value={editForm.managerId || ""}
                              onChange={(e) => setEditForm({ ...editForm, managerId: e.target.value ? parseInt(e.target.value) : null })}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            >
                              <option value="">Chọn quản lý (duyệt đơn chấm công, nghỉ phép)</option>
                              {managers.filter(m => m.id !== selectedEmployeeForModal?.id).map(mgr => (
                                <option key={mgr.id} value={mgr.id}>
                                  {mgr.name} ({mgr.employeeCode || mgr.email})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Địa chỉ</label>
                            <textarea
                              value={editForm.address}
                              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                              rows={3}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                border: `1px solid ${theme.neutral.gray300}`,
                                borderRadius: theme.radius.md
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
                              <input
                                type="checkbox"
                                checked={editForm.isActive}
                                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                              />
                              <span style={{ fontWeight: "600" }}>Đang làm việc</span>
                            </label>
                          </div>
                        </div>
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
                              fontWeight: 600
                            }}
                          >
                            {loading ? "Đang lưu..." : "💾 Lưu thay đổi"}
                          </button>
                          <button
                            onClick={() => {
                              setIsEditing(false);
                              setEditForm({});
                            }}
                            style={{
                              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
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
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.xl, marginBottom: theme.spacing.xl }}>
                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Email:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.email}</p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Số điện thoại:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.phoneNumber || "Chưa cập nhật"}</p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Ngày sinh:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>
                            {selectedEmployeeForModal.dateOfBirth ? new Date(selectedEmployeeForModal.dateOfBirth).toLocaleDateString('vi-VN') : "Chưa cập nhật"}
                          </p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Giới tính:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.gender || "Chưa cập nhật"}</p>
                        </div>
                      </div>
                    )}

                    <div style={{ borderTop: `1px solid ${theme.neutral.gray200}`, paddingTop: theme.spacing.xl, marginTop: theme.spacing.xl }}>
                      <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>👨‍👩‍👧‍👦 Người Phụ Thuộc</h3>

                      {selectedEmployeeForModal.Dependents && selectedEmployeeForModal.Dependents.length > 0 ? (
                        <div>
                          <div style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.md, backgroundColor: theme.info.bg, borderRadius: theme.radius.md }}>
                            <strong>Tổng cộng: {selectedEmployeeForModal.Dependents.length} người</strong>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.lg }}>
                            {selectedEmployeeForModal.Dependents.map((dep, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: theme.spacing.md,
                                  backgroundColor: theme.neutral.gray50,
                                  borderLeft: `3px solid ${theme.info.main}`,
                                  borderRadius: theme.radius.md
                                }}
                              >
                                <div style={{ fontWeight: "600", marginBottom: theme.spacing.xs }}>{dep.fullName}</div>
                                <div style={{ fontSize: theme.typography.small.fontSize, color: theme.neutral.gray600 }}>
                                  <div>Quan hệ: {dep.relationship}</div>
                                  <div>Ngày sinh: {dep.dateOfBirth ? new Date(dep.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</div>
                                  {dep.gender && <div>Giới tính: {dep.gender}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: theme.neutral.gray500, fontStyle: "italic" }}>Chưa có người phụ thuộc</p>
                      )}
                    </div>

                    <div style={{ borderTop: `1px solid ${theme.neutral.gray200}`, paddingTop: theme.spacing.xl, marginTop: theme.spacing.xl }}>
                      <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>📜 Bằng Cấp & Chứng Chỉ</h3>

                      {selectedEmployeeForModal.Qualifications && selectedEmployeeForModal.Qualifications.length > 0 ? (
                        <div>
                          <div style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.md, backgroundColor: theme.info.bg, borderRadius: theme.radius.md }}>
                            <strong>Tổng cộng: {selectedEmployeeForModal.Qualifications.length} bằng cấp</strong>
                          </div>

                          {(() => {
                            const grouped = {};
                            selectedEmployeeForModal.Qualifications.forEach(q => {
                              if (!grouped[q.type]) grouped[q.type] = [];
                              grouped[q.type].push(q);
                            });
                            return Object.entries(grouped).map(([type, quals]) => (
                              <div key={type} style={{ marginBottom: theme.spacing.lg }}>
                                <div style={{
                                  fontWeight: "600",
                                  color: theme.primary.main,
                                  padding: theme.spacing.md,
                                  backgroundColor: theme.info.bg,
                                  borderRadius: theme.radius.md,
                                  marginBottom: theme.spacing.md
                                }}>
                                  {type === 'degree' && '🎓 Bằng Cấp'}
                                  {type === 'certificate' && '🏅 Chứng Chỉ'}
                                  {type === 'license' && '📋 Giấy Phép'}
                                  {type === 'training' && '📚 Huấn Luyện'}
                                  <span style={{ marginLeft: theme.spacing.sm, color: theme.neutral.gray600, fontWeight: "400" }}>({quals.length})</span>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md }}>
                                  {quals.map((qual, idx) => (
                                    <div
                                      key={idx}
                                      style={{
                                        padding: theme.spacing.md,
                                        backgroundColor: theme.neutral.gray50,
                                        borderLeft: `3px solid ${theme.info.main}`,
                                        borderRadius: theme.radius.md,
                                        fontSize: theme.typography.small.fontSize
                                      }}
                                    >
                                      <div style={{ fontWeight: "600", marginBottom: theme.spacing.xs }}>{qual.name}</div>
                                      {qual.issuedBy && (
                                        <div style={{ color: theme.neutral.gray600, fontSize: theme.typography.tiny.fontSize }}>Cơ quan: {qual.issuedBy}</div>
                                      )}
                                      {qual.issuedDate && (
                                        <div style={{ color: theme.neutral.gray600, fontSize: theme.typography.tiny.fontSize }}>
                                          Cấp ngày: {new Date(qual.issuedDate).toLocaleDateString('vi-VN')}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      ) : (
                        <p style={{ color: theme.neutral.gray500, fontStyle: "italic" }}>Chưa có bằng cấp hoặc chứng chỉ</p>
                      )}
                    </div>

                    <div style={{ borderTop: `1px solid ${theme.neutral.gray200}`, paddingTop: theme.spacing.xl, marginTop: theme.spacing.xl }}>
                      <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>💼 Thông tin Công việc</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.xl }}>
                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Phòng ban/Bộ phận:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.Department?.name || selectedEmployeeForModal.department || "Chưa cập nhật"}</p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Chi nhánh:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.branchName || "Chưa cập nhật"}</p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Chức danh/Vị trí:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.JobTitle?.name || selectedEmployeeForModal.jobTitle || "Chưa cập nhật"}</p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Loại hợp đồng:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>
                            {selectedEmployeeForModal.contractType === "probation" ? "Thử việc" :
                             selectedEmployeeForModal.contractType === "1_year" ? "Hợp đồng 1 năm" :
                             selectedEmployeeForModal.contractType === "3_year" ? "Hợp đồng 3 năm" :
                             selectedEmployeeForModal.contractType === "indefinite" ? "Không xác định thời hạn" :
                             selectedEmployeeForModal.contractType === "other" ? "Khác" : "Chưa cập nhật"}
                          </p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Trạng thái lao động:</label>
                          <p
                            style={{
                              margin: 0,
                              display: "inline-block",
                              padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                              borderRadius: theme.radius.full,
                              backgroundColor: (selectedEmployeeForModal.employmentStatus || selectedEmployeeForModal.isActive) === "active" ? theme.success.bg :
                                selectedEmployeeForModal.employmentStatus === "maternity_leave" ? theme.info.bg :
                                selectedEmployeeForModal.employmentStatus === "unpaid_leave" ? "#fff3cd" :
                                theme.error.bg,
                              color: (selectedEmployeeForModal.employmentStatus || selectedEmployeeForModal.isActive) === "active" ? theme.success.text :
                                selectedEmployeeForModal.employmentStatus === "maternity_leave" ? theme.info.text :
                                selectedEmployeeForModal.employmentStatus === "unpaid_leave" ? "#856404" :
                                theme.error.text
                            }}
                          >
                            {selectedEmployeeForModal.employmentStatus === "active" ? "Đang làm việc" :
                             selectedEmployeeForModal.employmentStatus === "maternity_leave" ? "Đang nghỉ thai sản" :
                             selectedEmployeeForModal.employmentStatus === "unpaid_leave" ? "Nghỉ không lương" :
                             selectedEmployeeForModal.employmentStatus === "terminated" ? "Đã nghỉ việc" :
                             selectedEmployeeForModal.employmentStatus === "resigned" ? "Đã từ chức" :
                             selectedEmployeeForModal.isActive ? "Đang làm việc" : "Đã nghỉ việc"}
                          </p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Ngày bắt đầu làm việc:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>
                            {selectedEmployeeForModal.startDate ? new Date(selectedEmployeeForModal.startDate).toLocaleDateString('vi-VN') : "Chưa cập nhật"}
                          </p>
                          <p style={{ margin: theme.spacing.xs, fontSize: theme.typography.small.fontSize, color: theme.neutral.gray500 }}>
                            (Dùng để tính thâm niên và ngày phép năm)
                          </p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Quản lý trực tiếp:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>
                            {selectedEmployeeForModal.Manager?.name
                              ? `${selectedEmployeeForModal.Manager.name}${selectedEmployeeForModal.Manager.employeeCode ? ` (${selectedEmployeeForModal.Manager.employeeCode})` : ""}`
                              : "Chưa cập nhật"}
                          </p>
                          <p style={{ margin: theme.spacing.xs, fontSize: theme.typography.small.fontSize, color: theme.neutral.gray500 }}>
                            Người duyệt đơn chấm công, nghỉ phép
                          </p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Bậc lương:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.SalaryGrade?.name || selectedEmployeeForModal.salaryGrade || "Chưa cập nhật"}</p>
                        </div>

                        <div>
                          <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Lương cơ bản:</label>
                          <p style={{ margin: 0, color: theme.neutral.gray600, fontWeight: "600" }}>
                            ₫{selectedEmployeeForModal.baseSalary?.toLocaleString("vi-VN") || "0"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attendance Tab */}
                {activeTab === "attendance" && selectedEmployeeForModal && (
                  <div>
                    <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>Thống Kê Chuyên Cần</h3>
                    <p style={{ color: theme.neutral.gray500 }}>Chức năng đang được phát triển...</p>
                  </div>
                )}

                {/* Leave Tab */}
                {activeTab === "leave" && selectedEmployeeForModal && (
                  <div>
                    <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>Lịch Sử Nghỉ Phép</h3>
                    <p style={{ color: theme.neutral.gray500 }}>Chức năng đang được phát triển...</p>
                  </div>
                )}

                {/* Salary Tab */}
                {activeTab === "salary" && selectedEmployeeForModal && (
                  <div>
                    <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>Lịch Sử Lương</h3>
                    <p style={{ color: theme.neutral.gray500 }}>Chức năng đang được phát triển...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

