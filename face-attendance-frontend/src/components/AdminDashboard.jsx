import React, { useEffect, useState } from "react";
import { exportEmployeesToExcel, exportEmployeesToPDF, importEmployeesFromExcel, downloadEmployeeTemplate } from "../utils/exportUtils.js";
import { theme, commonStyles } from "../styles/theme.js";

export default function AdminDashboard() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, withFace, withoutFace
  const [savedFilters, setSavedFilters] = useState([]);
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchEmployees();
    // Load saved filters from localStorage
    const saved = localStorage.getItem("adminDashboardFilters");
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading saved filters:", e);
      }
    }
  }, []);

  // Apply search and filters
  useEffect(() => {
    let filtered = [...employees];

    // Apply search query (full-text search)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.name?.toLowerCase().includes(query) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.employeeCode?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus === "withFace") {
      filtered = filtered.filter(emp => emp.FaceProfiles && emp.FaceProfiles.length > 0);
    } else if (filterStatus === "withoutFace") {
      filtered = filtered.filter(emp => !emp.FaceProfiles || emp.FaceProfiles.length === 0);
    }

    setFilteredEmployees(filtered);
  }, [searchQuery, filterStatus, employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      if (!token || !token.trim()) {
        setMessage("Lỗi: Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
        // Redirect to login after 2 seconds
        setTimeout(() => {
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          window.location.reload();
        }, 2000);
        return;
      }

      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok) {
        const empList = data.employees || [];
        setEmployees(empList);
        setFilteredEmployees(empList);
        setMessage(""); // Clear any previous error messages
      } else {
        if (res.status === 401) {
          setMessage("Lỗi xác thực: Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
          // Clear invalid token and reload
          setTimeout(() => {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.reload();
          }, 2000);
        } else {
          setMessage("Lỗi tải danh sách nhân viên: " + (data.message || "Unknown error"));
        }
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
      console.error("Fetch employees error:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteEmployee = async (employeeId) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa nhân viên này?")) return;

    try {
      const token = localStorage.getItem("authToken");

      if (!token || !token.trim()) {
        setMessage("Lỗi: Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
        setTimeout(() => {
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          window.location.reload();
        }, 2000);
        return;
      }

      const res = await fetch(`${apiBase}/api/admin/employees/${employeeId}`, {
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Xóa nhân viên thành công: " + data.deletedEmployee?.name);
        // Remove from UI immediately
        setEmployees(prev => prev.filter(e => e.id !== employeeId));
      } else {
        if (res.status === 401) {
          setMessage("Lỗi xác thực: Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
          setTimeout(() => {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.reload();
          }, 2000);
        } else {
          setMessage("Lỗi xóa nhân viên: " + (data.message || "Unknown error"));
          console.error("Delete error:", data);
        }
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
      console.error("Delete exception:", error);
    }
  };

  const containerStyle = {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "0"
  };

  const welcomeStyle = {
    background: theme.gradients.primary,
    color: theme.neutral.white,
    padding: `${theme.spacing.xxl} ${theme.spacing.xl}`,
    borderRadius: `${theme.radius.xl} ${theme.radius.xl} 0 0`,
    marginBottom: "0"
  };

  const contentCardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "0 0 16px 16px",
    padding: "40px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.1)"
  };

  const statsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "24px",
    marginBottom: "32px"
  };

  const statCardStyle = {
    ...commonStyles.card,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    transition: theme.transitions.slow,
    cursor: "pointer"
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "0",
    marginBottom: "32px",
    backgroundColor: "#fff",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  };

  const thStyle = {
    backgroundColor: "#f8f9fa",
    padding: "16px",
    textAlign: "left",
    fontWeight: "700",
    fontSize: "13px",
    color: "#495057",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: "2px solid #dee2e6"
  };

  const tdStyle = {
    padding: "16px",
    borderBottom: "1px solid #f0f0f0",
    fontSize: "14px"
  };

  const buttonStyle = {
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "600",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    marginRight: "8px",
    transition: "all 0.3s ease"
  };

                    const deleteButtonStyle = {
                      ...buttonStyle,
                      backgroundColor: theme.error.main,
                      color: theme.neutral.white
                    };

  const viewButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#007bff",
    color: "#fff"
  };

  const totalEmployees = employees.length;
  const employeesWithFace = employees.filter(e => e.FaceProfiles?.length > 0).length;
  const employeesWithoutFace = totalEmployees - employeesWithFace;
  
  const filteredTotal = filteredEmployees.length;
  const filteredWithFace = filteredEmployees.filter(e => e.FaceProfiles?.length > 0).length;
  const filteredWithoutFace = filteredTotal - filteredWithFace;

  return (
    <div style={containerStyle}>
      {/* Welcome Header */}
      <div style={welcomeStyle}>
        <h1 style={{ margin: "0 0 12px 0", fontSize: "36px", fontWeight: "700" }}>
          Quản Lý Nhân Viên
        </h1>
        <p style={{ margin: 0, fontSize: "16px", opacity: 0.95 }}>
          Chào mừng bạn đến với hệ thống quản lý nhân viên! Tại đây bạn có thể xem, quản lý và cập nhật thông tin của tất cả nhân viên trong hệ thống.
        </p>
      </div>

      {/* Main Content */}
      <div style={contentCardStyle}>
        {/* Statistics Cards */}
        <div style={statsGridStyle}>
          <div style={statCardStyle}>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px", fontWeight: "500" }}>
              Tổng số nhân viên
            </div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#667eea" }}>
              {totalEmployees}
            </div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: theme.typography.body.fontSize, color: theme.neutral.gray600, marginBottom: theme.spacing.sm, fontWeight: "500" }}>
              Đã đăng ký khuôn mặt
            </div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: theme.success.main }}>
              {employeesWithFace}
            </div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: theme.typography.body.fontSize, color: theme.neutral.gray600, marginBottom: theme.spacing.sm, fontWeight: "500" }}>
              Chưa đăng ký khuôn mặt
            </div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: theme.warning.main }}>
              {employeesWithoutFace}
            </div>
          </div>
        </div>

          {message && (
          <div style={{
            padding: "16px 20px",
            backgroundColor: message.includes("thành công") ? "#d4edda" : "#f8d7da",
            border: `2px solid ${message.includes("thành công") ? "#c3e6cb" : "#f5c6cb"}`,
            borderRadius: "8px",
            color: message.includes("thành công") ? "#155724" : "#721c24",
            marginBottom: "24px",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            {message}
          </div>
        )}

        {/* Advanced Search & Filters */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "32px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
            {/* Search Input */}
            <div style={{ flex: "1", minWidth: "300px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#495057" }}>
                Tìm kiếm
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, email, mã nhân viên..."
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  transition: "all 0.2s"
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
              />
            </div>

            {/* Status Filter */}
            <div style={{ minWidth: "200px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#495057" }}>
                Lọc theo trạng thái
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.target.style.borderColor = "#667eea"}
                onMouseLeave={(e) => e.target.style.borderColor = "#e0e0e0"}
              >
                <option value="all">Tất cả ({employees.length})</option>
                <option value="withFace">Đã đăng ký khuôn mặt ({employees.filter(e => e.FaceProfiles && e.FaceProfiles.length > 0).length})</option>
                <option value="withoutFace">Chưa đăng ký ({employees.filter(e => !e.FaceProfiles || e.FaceProfiles.length === 0).length})</option>
              </select>
            </div>

            {/* Quick Filters */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                }}
                style={{
                  padding: "12px 20px",
                  backgroundColor: "#6c757d",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#5a6268"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#6c757d"}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Export/Import Buttons */}
          <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #e0e0e0", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => exportEmployeesToExcel(filteredEmployees, `danh-sach-nhan-vien-${new Date().toISOString().split('T')[0]}`)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#218838"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#28a745"}
            >
              Xuất Excel
            </button>
            <button
              onClick={() => exportEmployeesToPDF(filteredEmployees, `danh-sach-nhan-vien-${new Date().toISOString().split('T')[0]}`)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#dc3545",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#c82333"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#dc3545"}
            >
              Xuất PDF
            </button>
            <button
              onClick={downloadEmployeeTemplate}
              style={{
                padding: "10px 20px",
                backgroundColor: "#17a2b8",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#138496"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#17a2b8"}
            >
              Download Template
            </button>
            <label
              style={{
                padding: "10px 20px",
                backgroundColor: "#ffc107",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e0a800"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#ffc107"}
            >
              Nhập từ Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  try {
                    const employees = await importEmployeesFromExcel(file);
                    const token = localStorage.getItem("authToken");
                    
                    let successCount = 0;
                    let failCount = 0;
                    for (const emp of employees) {
                      try {
                        const res = await fetch(`${apiBase}/api/admin/employees/bulk`, {
                          method: "POST",
                          headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                          },
                          body: JSON.stringify(emp)
                        });
                        if (res.ok) successCount++;
                        else failCount++;
                      } catch (err) {
                        failCount++;
                      }
                    }
                    setMessage(`Nhập thành công: ${successCount}/${employees.length} nhân viên${failCount > 0 ? ` (${failCount} lỗi)` : ''}`);
                    fetchEmployees();
                    e.target.value = "";
                  } catch (error) {
                    setMessage("Lỗi nhập file: " + error.message);
                    e.target.value = "";
                  }
                }}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* Results Count */}
          <div style={{ marginTop: "16px", fontSize: "14px", color: "#666" }}>
            Hiển thị <strong>{filteredEmployees.length}</strong> / {employees.length} nhân viên
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: theme.neutral.gray600 }}>
            <div style={{ fontSize: "16px", fontWeight: "500" }}>Đang tải danh sách nhân viên...</div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "60px 40px",
            backgroundColor: "#f8f9fa",
            borderRadius: "12px",
            border: "2px dashed #dee2e6"
          }}>
            <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
              {employees.length === 0 ? "Chưa có nhân viên nào" : "Không tìm thấy kết quả"}
            </h3>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "24px" }}>
              {employees.length === 0 
                ? "Hãy bắt đầu bằng cách đăng ký nhân viên mới"
                : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc"
              }
            </p>
            {employees.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                }}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#667eea",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
        <>
          {/* Employee Cards Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "24px",
            marginBottom: "32px"
          }}>
            {filteredEmployees.map((emp) => {
              const hasFace = emp.FaceProfiles && emp.FaceProfiles.length > 0;
              return (
                <div
                  key={emp.id}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "16px",
                    padding: "24px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    border: "1px solid #e8e8e8",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
                  }}
                  onClick={() => setSelectedEmployee(emp)}
                >
                  {/* Status Badge */}
                  <div style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    backgroundColor: hasFace ? "#d4edda" : "#fff3cd",
                    color: hasFace ? "#155724" : "#856404"
                  }}>
                    {hasFace ? "Đã đăng ký" : "Chưa có"}
                  </div>

                  {/* Employee Avatar/Icon */}
                  <div style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    fontWeight: "700",
                    color: "#fff",
                    marginBottom: "16px"
                  }}>
                    {emp.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Employee Name */}
                  <h3 style={{
                    margin: "0 0 8px 0",
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "#1a1a1a",
                    lineHeight: "1.3"
                  }}>
                    {emp.name}
                  </h3>

                  {/* Employee Code */}
                  <div style={{
                    fontSize: "13px",
                    color: "#667eea",
                    fontWeight: "600",
                    marginBottom: "16px",
                    letterSpacing: "0.5px"
                  }}>
                    {emp.employeeCode}
                  </div>

                  {/* Email */}
                  <div style={{
                    fontSize: "13px",
                    color: "#666",
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <span style={{ wordBreak: "break-word" }}>{emp.email}</span>
                  </div>

                  {/* Created Date */}
                  <div style={{
                    fontSize: "12px",
                    color: "#999",
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <span>Ngày tạo: {new Date(emp.createdAt).toLocaleDateString("vi-VN")}</span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "20px",
                    paddingTop: "20px",
                    borderTop: "1px solid #f0f0f0"
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEmployee(emp);
                      }}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        backgroundColor: "#007bff",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "13px",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.info.dark;
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.info.main;
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      Chi tiết
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEmployee(emp.id);
                      }}
                      style={{
                        padding: "10px 16px",
                        backgroundColor: "#dc3545",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "13px",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.error.dark}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.error.main}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </>
      )}

        {selectedEmployee && (
          <div style={{
            marginTop: "32px",
            padding: "32px",
            backgroundColor: "#fff",
            borderRadius: "12px",
            border: "2px solid #007bff",
            boxShadow: "0 4px 12px rgba(0,123,255,0.15)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "2px solid #e0e0e0" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "24px", fontWeight: "700", color: "#1a1a1a" }}>
                  Chi tiết nhân viên
                </h3>
                <p style={{ margin: 0, fontSize: "16px", color: "#666", fontWeight: "600" }}>
                  {selectedEmployee.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#6c757d",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#5a6268"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#6c757d"}
              >
                Đóng
              </button>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "24px",
              fontSize: "14px"
            }}>
              <div style={{ padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                <label style={{ display: "block", fontWeight: "700", color: "#495057", marginBottom: "8px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Tên đầy đủ
                </label>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1a1a1a" }}>{selectedEmployee.name}</p>
              </div>
              <div style={{ padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                <label style={{ display: "block", fontWeight: "700", color: "#495057", marginBottom: "8px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Email
                </label>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1a1a1a" }}>{selectedEmployee.email}</p>
              </div>
              <div style={{ padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                <label style={{ display: "block", fontWeight: "700", color: "#495057", marginBottom: "8px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Mã nhân viên
                </label>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#007bff" }}>{selectedEmployee.employeeCode}</p>
              </div>
              <div style={{ padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                <label style={{ display: "block", fontWeight: "700", color: "#495057", marginBottom: "8px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Vai trò
                </label>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1a1a1a" }}>
                  {selectedEmployee.role === "admin" ? "Quản lý" : "Nhân viên"}
                </p>
              </div>
              <div style={{ padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                <label style={{ display: "block", fontWeight: "700", color: "#495057", marginBottom: "8px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Ngày tạo
                </label>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1a1a1a" }}>
                  {new Date(selectedEmployee.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
              <div style={{ padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                <label style={{ display: "block", fontWeight: "700", color: "#495057", marginBottom: "8px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Trạng thái khuôn mặt
                </label>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
                  {selectedEmployee.FaceProfiles?.length > 0 ? (
                    <span style={{ color: "#28a745" }}>
                      Đã đăng ký ({selectedEmployee.FaceProfiles.length} profile)
                    </span>
                  ) : (
                    <span style={{ color: "#ffc107" }}>Chưa đăng ký</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
