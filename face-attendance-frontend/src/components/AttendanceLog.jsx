import { useState, useEffect } from "react";
import { exportAttendanceToExcel, exportAttendanceToPDF } from "../utils/exportUtils.js";
import { theme, commonStyles } from "../styles/theme.js";

export default function AttendanceLog() {
  const [allLogs, setAllLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [filterType, setFilterType] = useState("all"); // all, IN, OUT
  const [filterStatus, setFilterStatus] = useState("all"); // all, matched, unmatched

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch all attendance logs
      const logsRes = await fetch(`${apiBase}/api/admin/logs`);
      const logsData = await logsRes.json();

      // Fetch all employees
      const token = localStorage.getItem("authToken");
      const empRes = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const empData = await empRes.json();

      if (logsData.logs) {
        // Group logs by employee
        setAllLogs(logsData.logs);
      }

      if (empData.employees) {
        setEmployees(empData.employees);
      }
    } catch (err) {
      setError("Lỗi tải dữ liệu: " + err.message);
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...allLogs];

    // Filter by employee
    if (selectedEmployeeId) {
      filtered = filtered.filter(log => log.userId === selectedEmployeeId);
    }

    // Full-text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => {
        const empName = getEmployeeName(log.userId).toLowerCase();
        const empCode = employees.find(e => e.id === log.userId)?.employeeCode?.toLowerCase() || "";
        return empName.includes(query) || 
               empCode.includes(query) ||
               log.detectedName?.toLowerCase().includes(query) ||
               log.deviceId?.toLowerCase().includes(query);
      });
    }

    // Filter by date range
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(log => new Date(log.timestamp) >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => new Date(log.timestamp) <= endDate);
    }

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter(log => log.type === filterType);
    }

    // Filter by status (matched/unmatched)
    if (filterStatus === "matched") {
      filtered = filtered.filter(log => log.userId !== null);
    } else if (filterStatus === "unmatched") {
      filtered = filtered.filter(log => log.userId === null);
    }

    setFilteredLogs(filtered);
  }, [selectedEmployeeId, allLogs, searchQuery, dateRange, filterType, filterStatus, employees]);

  const getEmployeeName = (userId) => {
    const emp = employees.find(e => e.id === userId);
    return emp?.name || `User ${userId}`;
  };

  const containerStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px"
  };

  const headerStyle = {
    marginBottom: "24px"
  };

  const selectStyle = {
    padding: "10px 15px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "14px",
    marginBottom: "16px"
  };

  const statsStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "24px"
  };

  const statBoxStyle = {
    backgroundColor: "#f8f9fa",
    padding: "16px",
    borderRadius: "8px",
    textAlign: "center"
  };

  const logsTableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#fff",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
  };

  const thStyle = {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    padding: "12px",
    textAlign: "left",
    fontWeight: "600",
    fontSize: "13px"
  };

  const tdStyle = {
    padding: "12px",
    borderBottom: "1px solid #eee",
    fontSize: "13px"
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
          📊 Đang tải dữ liệu lịch sử điểm danh...
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0" }}>
      {/* Welcome Header */}
      <div style={{
        background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
        color: "#fff",
        padding: "48px 40px",
        borderRadius: "16px 16px 0 0"
      }}>
        <h1 style={{ margin: "0 0 12px 0", fontSize: "36px", fontWeight: "700" }}>
          📊 Lịch Sử Điểm Danh
        </h1>
        <p style={{ margin: 0, fontSize: "16px", opacity: 0.95 }}>
          Xem chi tiết lịch sử điểm danh của tất cả nhân viên. Theo dõi thời gian vào/ra, độ chính xác và trạng thái điểm danh.
        </p>
      </div>

      {/* Main Content */}
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "0 0 16px 16px",
        padding: "40px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)"
      }}>

        {error && (
          <div style={{
            padding: "16px 20px",
            backgroundColor: "#f8d7da",
            border: "2px solid #f5c6cb",
            borderRadius: "8px",
            color: "#721c24",
            marginBottom: "24px",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            ❌ {error}
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
          <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#1a1a1a" }}>
              🔍 Tìm kiếm & Lọc nâng cao
            </h3>
            <button
              onClick={() => {
                setSearchQuery("");
                setDateRange({ start: "", end: "" });
                setFilterType("all");
                setFilterStatus("all");
                setSelectedEmployeeId(null);
              }}
              style={{
                padding: "8px 16px",
                backgroundColor: "#6c757d",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "13px"
              }}
            >
              🔄 Reset
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "16px" }}>
            {/* Search Input */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "13px", color: "#495057" }}>
                Tìm kiếm
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tên, mã NV, thiết bị..."
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "14px"
                }}
              />
            </div>

            {/* Employee Filter */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "13px", color: "#495057" }}>
                Nhân viên
              </label>
              <select
                value={selectedEmployeeId || ""}
                onChange={(e) => setSelectedEmployeeId(e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                <option value="">Tất cả</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "13px", color: "#495057" }}>
                Loại
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                <option value="all">Tất cả</option>
                <option value="IN">Vào</option>
                <option value="OUT">Ra</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "13px", color: "#495057" }}>
                Trạng thái
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                <option value="all">Tất cả</option>
                <option value="matched">Đã khớp</option>
                <option value="unmatched">Chưa khớp</option>
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "13px", color: "#495057" }}>
                Từ ngày
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "14px"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "13px", color: "#495057" }}>
                Đến ngày
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "14px"
                }}
              />
            </div>
          </div>

          {/* Quick Filters & Export */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setDateRange({ start: today, end: today });
                }}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #e0e0e0",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "500"
                }}
              >
                Hôm nay
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const weekStart = new Date(today);
                  weekStart.setDate(today.getDate() - today.getDay());
                  setDateRange({ 
                    start: weekStart.toISOString().split('T')[0], 
                    end: today.toISOString().split('T')[0] 
                  });
                }}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #e0e0e0",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "500"
                }}
              >
                Tuần này
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                  setDateRange({ 
                    start: monthStart.toISOString().split('T')[0], 
                    end: today.toISOString().split('T')[0] 
                  });
                }}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #e0e0e0",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "500"
                }}
              >
                Tháng này
              </button>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => exportAttendanceToExcel(filteredLogs, employees, `lich-su-diem-danh-${new Date().toISOString().split('T')[0]}`)}
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
                  gap: "8px"
                }}
              >
                📥 Xuất Excel
              </button>
              <button
                onClick={() => exportAttendanceToPDF(filteredLogs, employees, `lich-su-diem-danh-${new Date().toISOString().split('T')[0]}`)}
              style={{
                ...commonStyles.button.danger,
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.sm
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.error.dark;
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.error.main;
                e.currentTarget.style.transform = "translateY(0)";
              }}
              >
                📄 Xuất PDF
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div style={{ marginTop: "16px", fontSize: "14px", color: "#666", paddingTop: "16px", borderTop: "1px solid #f0f0f0" }}>
            Hiển thị <strong>{filteredLogs.length}</strong> / {allLogs.length} bản ghi
          </div>
        </div>

        {/* Stats Cards */}
        {selectedEmployeeId && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "24px",
            marginBottom: "32px"
          }}>
            <div style={{
              backgroundColor: "#fff",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              border: "1px solid #e0e0e0",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#28a745", marginBottom: "8px" }}>
                {filteredLogs.length}
              </div>
              <div style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>
                Tổng lần điểm danh
              </div>
            </div>
            <div style={{
              backgroundColor: "#fff",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              border: "1px solid #e0e0e0",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#4facfe", marginBottom: "8px" }}>
                {filteredLogs.filter(l => l.userId).length}
              </div>
              <div style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>
                Lần khớp chính xác
              </div>
            </div>
          </div>
        )}

        {/* Logs Display */}
        {filteredLogs.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "60px 40px",
            backgroundColor: "#f8f9fa",
            borderRadius: "12px",
            border: "2px dashed #dee2e6"
          }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>📭</div>
            <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
              {selectedEmployeeId ? "Chưa có lịch sử điểm danh" : "Chưa có dữ liệu"}
            </h3>
            <p style={{ fontSize: "14px", color: "#666" }}>
              {selectedEmployeeId
                ? `Nhân viên này chưa có lần điểm danh nào`
                : `Chưa có dữ liệu lịch sử điểm danh`
              }
            </p>
          </div>
        ) : (
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: "0"
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: "#f8f9fa",
                    borderBottom: "2px solid #e0e0e0"
                  }}>
                    <th style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: "700",
                      fontSize: "13px",
                      color: "#495057",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Thời gian</th>
                    <th style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: "700",
                      fontSize: "13px",
                      color: "#495057",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Nhân viên</th>
                    <th style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: "700",
                      fontSize: "13px",
                      color: "#495057",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Mã NV</th>
                    <th style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: "700",
                      fontSize: "13px",
                      color: "#495057",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Loại</th>
                    <th style={{
                      padding: "16px",
                      textAlign: "center",
                      fontWeight: "700",
                      fontSize: "13px",
                      color: "#495057",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Độ tin cậy</th>
                    <th style={{
                      padding: "16px",
                      textAlign: "center",
                      fontWeight: "700",
                      fontSize: "13px",
                      color: "#495057",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Khoảng cách</th>
                    <th style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: "700",
                      fontSize: "13px",
                      color: "#495057",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Thiết bị</th>
                    <th style={{
                      padding: "16px",
                      textAlign: "center",
                      fontWeight: "700",
                      fontSize: "13px",
                      color: "#495057",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Ảnh</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, index) => {
                    const empName = getEmployeeName(log.userId);
                    const emp = employees.find(e => e.id === log.userId);
                    const isIn = log.type === 'IN';
                    const typeColor = isIn ? "#28a745" : "#ff9800";
                    const typeBgColor = isIn ? "#d4edda" : "#fff3cd";
                    const typeTextColor = isIn ? "#155724" : "#856404";
                    return (
                      <tr
                        key={log.id}
                        style={{
                          borderBottom: "1px solid #f0f0f0",
                          transition: "background-color 0.2s",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <td style={{
                          padding: "16px",
                          fontSize: "14px",
                          color: "#1a1a1a"
                        }}>
                          <div style={{ fontWeight: "600" }}>
                            {new Date(log.timestamp).toLocaleDateString("vi-VN")}
                          </div>
                          <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                            {new Date(log.timestamp).toLocaleTimeString("vi-VN")}
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <span style={{
                            backgroundColor: log.userId ? "#d4edda" : "#fff3cd",
                            color: log.userId ? "#155724" : "#856404",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "600",
                            display: "inline-block"
                          }}>
                            {log.detectedName || empName}
                          </span>
                        </td>
                        <td style={{
                          padding: "16px",
                          fontSize: "14px",
                          color: "#666",
                          fontWeight: "500"
                        }}>
                          {emp?.employeeCode || "—"}
                        </td>
                        <td style={{ padding: "16px" }}>
                          <span style={{
                            backgroundColor: typeBgColor,
                            color: typeTextColor,
                            padding: "6px 14px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "700",
                            display: "inline-block",
                            border: `2px solid ${typeColor}`
                          }}>
                            {isIn ? "🟢 VÀO" : "🔴 RA"}
                          </span>
                        </td>
                        <td style={{
                          padding: "16px",
                          textAlign: "center",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: log.confidence > 0.8 ? "#28a745" : log.confidence > 0.6 ? "#ffc107" : "#dc3545"
                        }}>
                          {log.confidence ? `${(log.confidence * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td style={{
                          padding: "16px",
                          textAlign: "center",
                          fontSize: "13px",
                          color: "#666",
                          fontFamily: "monospace"
                        }}>
                          {log.matchDistance ? log.matchDistance.toFixed(3) : "—"}
                        </td>
                        <td style={{
                          padding: "16px",
                          fontSize: "13px",
                          color: "#666"
                        }}>
                          {log.deviceId || "unknown"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
