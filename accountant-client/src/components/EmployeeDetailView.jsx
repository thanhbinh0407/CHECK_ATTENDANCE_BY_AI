import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";

export default function EmployeeDetailView() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("info");

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

  const viewEmployeeDetails = async (employeeId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/admin/employees/${employeeId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setEmployeeDetails(data.employee || {});
        setSelectedEmployee(employeeId);
        setActiveTab("info");
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

  const [showModal, setShowModal] = useState(false);
  const [selectedEmployeeForModal, setSelectedEmployeeForModal] = useState(null);

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

  return (
    <div style={{ padding: "20px", backgroundColor: theme.colors.light, minHeight: "100vh" }}>
      <h1 style={{ color: theme.colors.primary, marginBottom: "20px" }}>👤 Thông Tin Chi Tiết Nhân Viên</h1>

      {message && (
        <div
          style={{
            padding: "10px",
            marginBottom: "15px",
            backgroundColor: message.includes("Lỗi") ? "#f8d7da" : "#d4edda",
            color: message.includes("Lỗi") ? "#721c24" : "#155724",
            borderRadius: "5px"
          }}
        >
          {message}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "20px" }}>
        {/* Employee List */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "15px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            height: "fit-content"
          }}
        >
          <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>📋 Danh Sách Nhân Viên</h3>

          <input
            type="text"
            placeholder="Tìm kiếm tên hoặc mã NV..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "15px",
              borderRadius: "5px",
              border: `1px solid ${theme.colors.border}`
            }}
          />

          <div style={{ maxHeight: "600px", overflowY: "auto" }}>
            {filteredEmployees.length === 0 ? (
              <p style={{ color: "#999", textAlign: "center", padding: "20px 0" }}>
                Không tìm thấy nhân viên
              </p>
            ) : (
              filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => openEmployeeModal(emp.id)}
                  style={{
                    padding: "12px",
                    marginBottom: "8px",
                    backgroundColor: selectedEmployee === emp.id ? theme.colors.primary : "#f9f9f9",
                    color: selectedEmployee === emp.id ? "white" : "black",
                    borderRadius: "5px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    borderLeft: selectedEmployee === emp.id ? `4px solid white` : "none"
                  }}
                >
                  <div style={{ fontWeight: "bold", fontSize: "0.95em" }}>{emp.name}</div>
                  <div style={{ fontSize: "0.85em", opacity: 0.8 }}>
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
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "40px",
                textAlign: "center",
                color: "#999"
              }}
            >
              <div style={{ fontSize: "3em", marginBottom: "10px" }}>👈</div>
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
              zIndex: 1000,
              padding: "20px"
            }}
            onClick={() => {
              setShowModal(false);
              setSelectedEmployeeForModal(null);
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
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
                  backgroundColor: theme.colors.primary,
                  color: "white",
                  padding: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <h2 style={{ margin: "0 0 10px 0" }}>{selectedEmployeeForModal.name}</h2>
                  <div style={{ display: "flex", gap: "20px", fontSize: "0.95em" }}>
                    <span><strong>Mã NV:</strong> {selectedEmployeeForModal.employeeCode}</span>
                    <span><strong>Chức vụ:</strong> {selectedEmployeeForModal.jobTitle || "N/A"}</span>
                    <span><strong>Phòng ban:</strong> {selectedEmployeeForModal.department || "N/A"}</span>
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
                    color: "white",
                    fontSize: "24px",
                    cursor: "pointer",
                    padding: "5px 10px"
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: `1px solid ${theme.colors.border}` }}>
                {["info", "attendance", "leave", "salary"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1,
                      padding: "15px",
                      border: "none",
                      backgroundColor: activeTab === tab ? theme.colors.primary : "white",
                      color: activeTab === tab ? "white" : "black",
                      cursor: "pointer",
                      fontWeight: activeTab === tab ? "bold" : "normal",
                      borderBottom: activeTab === tab ? `3px solid ${theme.colors.secondary}` : "none"
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
              <div style={{ padding: "20px" }}>
                {/* Info Tab */}
                {activeTab === "info" && selectedEmployeeForModal && (
                  <div>
                    <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>Thông Tin Cá Nhân</h3>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Email:</label>
                        <p style={{ margin: 0, color: "#666" }}>{selectedEmployeeForModal.email}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Số điện thoại:</label>
                        <p style={{ margin: 0, color: "#666" }}>{selectedEmployeeForModal.phoneNumber || "Chưa cập nhật"}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Ngày sinh:</label>
                        <p style={{ margin: 0, color: "#666" }}>{selectedEmployeeForModal.dateOfBirth ? new Date(selectedEmployeeForModal.dateOfBirth).toLocaleDateString('vi-VN') : "Chưa cập nhật"}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Giới tính:</label>
                        <p style={{ margin: 0, color: "#666" }}>{selectedEmployeeForModal.gender || "Chưa cập nhật"}</p>
                      </div>
                    </div>

                    <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: "20px", marginTop: "20px" }}>
                      <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>👨‍👩‍👧‍👦 Người Phụ Thuộc</h3>

                      {selectedEmployeeForModal.dependents && selectedEmployeeForModal.dependents.length > 0 ? (
                        <div>
                          <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#f0f8ff", borderRadius: "5px" }}>
                            <strong>Tổng cộng: {selectedEmployeeForModal.dependents.length} người</strong>
                          </div>
                          
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                            {selectedEmployeeForModal.dependents.map((dep, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: "12px",
                                  backgroundColor: "#f9f9f9",
                                  borderLeft: `3px solid ${theme.colors.secondary}`,
                                  borderRadius: "4px"
                                }}
                              >
                                <div style={{ fontWeight: "bold", marginBottom: "5px" }}>{dep.fullName}</div>
                                <div style={{ fontSize: "0.9em", color: "#666" }}>
                                  <div>Quan hệ: {dep.relationship}</div>
                                  <div>Ngày sinh: {dep.dateOfBirth ? new Date(dep.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</div>
                                  {dep.gender && <div>Giới tính: {dep.gender}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: "#999", fontStyle: "italic" }}>Chưa có người phụ thuộc</p>
                      )}
                    </div>

                    <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: "20px", marginTop: "20px" }}>
                      <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>📜 Bằng Cấp & Chứng Chỉ</h3>

                      {selectedEmployeeForModal.qualifications && selectedEmployeeForModal.qualifications.length > 0 ? (
                        <div>
                          <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#f0f8ff", borderRadius: "5px" }}>
                            <strong>Tổng cộng: {selectedEmployeeForModal.qualifications.length} bằng cấp</strong>
                          </div>
                          
                          {/* Qualifications by type */}
                          {(() => {
                            const grouped = {};
                            selectedEmployeeForModal.qualifications.forEach(q => {
                              if (!grouped[q.type]) grouped[q.type] = [];
                              grouped[q.type].push(q);
                            });
                            return Object.entries(grouped).map(([type, quals]) => (
                              <div key={type} style={{ marginBottom: "15px" }}>
                                <div style={{ 
                                  fontWeight: "bold", 
                                  color: theme.colors.primary,
                                  padding: "10px",
                                  backgroundColor: "#e7f3ff",
                                  borderRadius: "4px",
                                  marginBottom: "10px"
                                }}>
                                  {type === 'degree' && '🎓 Bằng Cấp'}
                                  {type === 'certificate' && '🏅 Chứng Chỉ'}
                                  {type === 'license' && '📋 Giấy Phép'}
                                  {type === 'training' && '📚 Huấn Luyện'}
                                  <span style={{ marginLeft: "10px", color: "#666", fontWeight: "normal" }}>({quals.length})</span>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                  {quals.map((qual, idx) => (
                                    <div
                                      key={idx}
                                      style={{
                                        padding: "12px",
                                        backgroundColor: "#f9f9f9",
                                        borderLeft: `3px solid ${theme.colors.secondary}`,
                                        borderRadius: "4px",
                                        fontSize: "0.95em"
                                      }}
                                    >
                                      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>{qual.name}</div>
                                      {qual.issuedBy && (
                                        <div style={{ color: "#666", fontSize: "0.9em" }}>Cơ quan: {qual.issuedBy}</div>
                                      )}
                                      {qual.issuedDate && (
                                        <div style={{ color: "#666", fontSize: "0.9em" }}>
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
                        <p style={{ color: "#999", fontStyle: "italic" }}>Chưa có bằng cấp hoặc chứng chỉ</p>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px" }}>
                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Phòng ban:</label>
                        <p style={{ margin: 0, color: "#666" }}>{selectedEmployeeForModal.department || "N/A"}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Chức vụ:</label>
                        <p style={{ margin: 0, color: "#666" }}>{selectedEmployeeForModal.jobTitle || "N/A"}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Bậc lương:</label>
                        <p style={{ margin: 0, color: "#666" }}>{selectedEmployeeForModal.salaryGrade || "Chưa cập nhật"}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Lương cơ bản:</label>
                        <p style={{ margin: 0, color: "#666", fontWeight: "bold" }}>
                          ₫{selectedEmployeeForModal.baseSalary?.toLocaleString("vi-VN") || "0"}
                        </p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Ngày vào công ty:</label>
                        <p style={{ margin: 0, color: "#666" }}>{selectedEmployeeForModal.joiningDate ? new Date(selectedEmployeeForModal.joiningDate).toLocaleDateString('vi-VN') : "Chưa cập nhật"}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Trạng thái:</label>
                        <p
                          style={{
                            margin: 0,
                            display: "inline-block",
                            padding: "4px 12px",
                            borderRadius: "20px",
                            backgroundColor: selectedEmployeeForModal.isActive ? "#d4edda" : "#f8d7da",
                            color: selectedEmployeeForModal.isActive ? "#155724" : "#721c24"
                          }}
                        >
                          {selectedEmployeeForModal.isActive ? "Đang làm việc" : "Đã nghỉ"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === "attendance" && selectedEmployeeForModal && (
                  <div>
                    <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>Thống Kê Chuyên Cần</h3>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", marginBottom: "20px" }}>
                      <div
                        style={{
                          padding: "15px",
                          backgroundColor: "#e7f3ff",
                          borderRadius: "8px",
                          textAlign: "center",
                          borderLeft: `4px solid ${theme.colors.primary}`
                        }}
                      >
                        <div style={{ fontSize: "1.2em", fontWeight: "bold", color: theme.colors.primary }}>
                          {selectedEmployeeForModal.attendanceStats?.totalDaysWorked || 0}
                        </div>
                        <div style={{ fontSize: "0.9em", color: "#666" }}>Ngày làm việc</div>
                      </div>

                      <div
                        style={{
                          padding: "15px",
                          backgroundColor: "#ffe7e7",
                          borderRadius: "8px",
                          textAlign: "center",
                          borderLeft: "4px solid #dc3545"
                        }}
                      >
                        <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#dc3545" }}>
                          {selectedEmployeeForModal.attendanceStats?.totalLate || 0}
                        </div>
                        <div style={{ fontSize: "0.9em", color: "#666" }}>Lần đi muộn</div>
                      </div>

                      <div
                        style={{
                          padding: "15px",
                          backgroundColor: "#fff7e7",
                          borderRadius: "8px",
                          textAlign: "center",
                          borderLeft: "4px solid #ffc107"
                        }}
                      >
                        <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#ffc107" }}>
                          {selectedEmployeeForModal.attendanceStats?.totalAbsent || 0}
                        </div>
                        <div style={{ fontSize: "0.9em", color: "#666" }}>Lần vắng</div>
                      </div>

                      <div
                        style={{
                          padding: "15px",
                          backgroundColor: "#e7ffe7",
                          borderRadius: "8px",
                          textAlign: "center",
                          borderLeft: "4px solid #28a745"
                        }}
                      >
                        <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#28a745" }}>
                          {selectedEmployeeForModal.attendanceStats?.totalEarlyLeave || 0}
                        </div>
                        <div style={{ fontSize: "0.9em", color: "#666" }}>Lần về sớm</div>
                      </div>
                    </div>

                    {selectedEmployeeForModal.recentAttendance && selectedEmployeeForModal.recentAttendance.length > 0 && (
                      <div>
                        <h4 style={{ marginBottom: "10px" }}>Điểm danh gần đây:</h4>
                        <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead style={{ backgroundColor: "#f5f5f5" }}>
                              <tr>
                                <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>Ngày</th>
                                <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>Giờ vào</th>
                                <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>Giờ ra</th>
                                <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedEmployeeForModal.recentAttendance.map((record, idx) => (
                                <tr key={idx} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                  <td style={{ padding: "8px" }}>{record.date}</td>
                                  <td style={{ padding: "8px" }}>{record.checkIn || "-"}</td>
                                  <td style={{ padding: "8px" }}>{record.checkOut || "-"}</td>
                                  <td style={{ padding: "8px" }}>{record.status || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Leave Tab */}
                {activeTab === "leave" && selectedEmployeeForModal && (
                  <div>
                    <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>Lịch Sử Nghỉ Phép</h3>

                    {selectedEmployeeForModal.leaveHistory && selectedEmployeeForModal.leaveHistory.length > 0 ? (
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
                          <div
                            style={{
                              padding: "15px",
                              backgroundColor: "#e7f3ff",
                              borderRadius: "8px",
                              textAlign: "center"
                            }}
                          >
                            <div style={{ fontSize: "1.2em", fontWeight: "bold", color: theme.colors.primary }}>
                              {selectedEmployeeForModal.leaveStats?.totalDaysUsed || 0}
                            </div>
                            <div style={{ fontSize: "0.9em", color: "#666" }}>Ngày đã dùng</div>
                          </div>

                          <div
                            style={{
                              padding: "15px",
                              backgroundColor: "#e7ffe7",
                              borderRadius: "8px",
                              textAlign: "center"
                            }}
                          >
                            <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#28a745" }}>
                              {selectedEmployeeForModal.leaveStats?.totalDaysRemaining || 0}
                            </div>
                            <div style={{ fontSize: "0.9em", color: "#666" }}>Ngày còn lại</div>
                          </div>
                        </div>

                        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead style={{ backgroundColor: "#f5f5f5" }}>
                              <tr>
                                <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>Loại</th>
                                <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>Từ ngày</th>
                                <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>Đến ngày</th>
                                <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedEmployeeForModal.leaveHistory.map((leave, idx) => (
                                <tr key={idx} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                  <td style={{ padding: "8px" }}>{leave.type}</td>
                                  <td style={{ padding: "8px" }}>{leave.startDate}</td>
                                  <td style={{ padding: "8px" }}>{leave.endDate}</td>
                                  <td style={{ padding: "8px" }}>
                                    <span
                                      style={{
                                        display: "inline-block",
                                        padding: "4px 8px",
                                        borderRadius: "4px",
                                        fontSize: "0.85em",
                                        backgroundColor:
                                          leave.status === "approved" ? "#d4edda" : leave.status === "rejected" ? "#f8d7da" : "#fff3cd",
                                        color:
                                          leave.status === "approved" ? "#155724" : leave.status === "rejected" ? "#721c24" : "#997404"
                                      }}
                                    >
                                      {leave.status === "approved"
                                        ? "Đã duyệt"
                                        : leave.status === "rejected"
                                        ? "Từ chối"
                                        : "Chờ duyệt"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: "#999", textAlign: "center", padding: "20px" }}>
                        Chưa có lịch sử nghỉ phép
                      </p>
                    )}
                  </div>
                )}

                {/* Salary Tab */}
                {activeTab === "salary" && selectedEmployeeForModal && (
                  <div>
                    <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>Lịch Sử Lương</h3>

                    {selectedEmployeeForModal.salaryHistory && selectedEmployeeForModal.salaryHistory.length > 0 ? (
                      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead style={{ backgroundColor: "#f5f5f5" }}>
                            <tr>
                              <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>Tháng/Năm</th>
                              <th style={{ padding: "8px", textAlign: "right", borderBottom: `1px solid ${theme.colors.border}` }}>Lương cơ bản</th>
                              <th style={{ padding: "8px", textAlign: "right", borderBottom: `1px solid ${theme.colors.border}` }}>Thưởng</th>
                              <th style={{ padding: "8px", textAlign: "right", borderBottom: `1px solid ${theme.colors.border}` }}>Khấu trừ</th>
                              <th style={{ padding: "8px", textAlign: "right", borderBottom: `1px solid ${theme.colors.border}` }}>Lương thực</th>
                              <th style={{ padding: "8px", textAlign: "center", borderBottom: `1px solid ${theme.colors.border}` }}>Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedEmployeeForModal.salaryHistory.map((salary, idx) => (
                              <tr key={idx} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                <td style={{ padding: "8px" }}>{salary.month}/{salary.year}</td>
                                <td style={{ padding: "8px", textAlign: "right" }}>
                                  ₫{salary.baseSalary?.toLocaleString("vi-VN") || "0"}
                                </td>
                                <td style={{ padding: "8px", textAlign: "right", color: "#28a745" }}>
                                  +₫{(salary.bonus || 0).toLocaleString("vi-VN")}
                                </td>
                                <td style={{ padding: "8px", textAlign: "right", color: "#dc3545" }}>
                                  -₫{(salary.deduction || 0).toLocaleString("vi-VN")}
                                </td>
                                <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: theme.colors.primary }}>
                                  ₫{salary.finalSalary?.toLocaleString("vi-VN") || "0"}
                                </td>
                                <td style={{ padding: "8px", textAlign: "center" }}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      fontSize: "0.85em",
                                      backgroundColor:
                                        salary.status === "paid" ? "#d4edda" : salary.status === "approved" ? "#cfe2ff" : "#fff3cd",
                                      color:
                                        salary.status === "paid" ? "#155724" : salary.status === "approved" ? "#084298" : "#997404"
                                    }}
                                  >
                                    {salary.status === "paid"
                                      ? "Đã thanh toán"
                                      : salary.status === "approved"
                                      ? "Đã duyệt"
                                      : "Chưa duyệt"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ color: "#999", textAlign: "center", padding: "20px" }}>
                        Chưa có lịch sử lương
                      </p>
                    )}
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
