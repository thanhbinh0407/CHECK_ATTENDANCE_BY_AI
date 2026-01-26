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

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchEmployees();
  }, []);

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
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedEmployeeForModal(null);
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

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.xl, marginBottom: theme.spacing.xl }}>
                      <div>
                        <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Email:</label>
                        <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.email}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Số điện thoại:</label>
                        <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.phone || "Chưa cập nhật"}</p>
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

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.xl, marginTop: theme.spacing.xl }}>
                      <div>
                        <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Phòng ban:</label>
                        <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.Department?.name || "N/A"}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Chức vụ:</label>
                        <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.JobTitle?.name || "N/A"}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Bậc lương:</label>
                        <p style={{ margin: 0, color: theme.neutral.gray600 }}>{selectedEmployeeForModal.SalaryGrade?.name || "Chưa cập nhật"}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Lương cơ bản:</label>
                        <p style={{ margin: 0, color: theme.neutral.gray600, fontWeight: "600" }}>
                          ₫{selectedEmployeeForModal.baseSalary?.toLocaleString("vi-VN") || "0"}
                        </p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Ngày vào công ty:</label>
                        <p style={{ margin: 0, color: theme.neutral.gray600 }}>
                          {selectedEmployeeForModal.startDate ? new Date(selectedEmployeeForModal.startDate).toLocaleDateString('vi-VN') : "Chưa cập nhật"}
                        </p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "600", display: "block", marginBottom: theme.spacing.xs }}>Trạng thái:</label>
                        <p
                          style={{
                            margin: 0,
                            display: "inline-block",
                            padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                            borderRadius: theme.radius.full,
                            backgroundColor: selectedEmployeeForModal.isActive ? theme.success.bg : theme.error.bg,
                            color: selectedEmployeeForModal.isActive ? theme.success.text : theme.error.text
                          }}
                        >
                          {selectedEmployeeForModal.isActive ? "Đang làm việc" : "Đã nghỉ"}
                        </p>
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

