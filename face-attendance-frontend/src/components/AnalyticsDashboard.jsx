import React, { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { theme, commonStyles } from "../styles/theme.js";

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState(null);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [employeeStats, setEmployeeStats] = useState([]);
  const [salaryStats, setSalaryStats] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [trendDays, setTrendDays] = useState(30);

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchAllData();
  }, [selectedMonth, selectedYear, trendDays]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const [overviewRes, trendRes, employeeRes, salaryRes, distRes] = await Promise.all([
        fetch(`${apiBase}/api/analytics/overview`, {
          headers: { "Authorization": `Bearer ${token}` }
        }),
        fetch(`${apiBase}/api/analytics/attendance-trend?days=${trendDays}`, {
          headers: { "Authorization": `Bearer ${token}` }
        }),
        fetch(`${apiBase}/api/analytics/employee-stats?month=${selectedMonth}&year=${selectedYear}`, {
          headers: { "Authorization": `Bearer ${token}` }
        }),
        fetch(`${apiBase}/api/analytics/salary-stats?month=${selectedMonth}&year=${selectedYear}`, {
          headers: { "Authorization": `Bearer ${token}` }
        }),
        fetch(`${apiBase}/api/analytics/attendance-distribution?month=${selectedMonth}&year=${selectedYear}`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
      ]);

      const [overviewData, trendData, employeeData, salaryData, distData] = await Promise.all([
        overviewRes.json(),
        trendRes.json(),
        employeeRes.json(),
        salaryRes.json(),
        distRes.json()
      ]);

      if (overviewData.status === "success") setOverview(overviewData.overview);
      if (trendData.status === "success") setAttendanceTrend(trendData.trend);
      if (employeeData.status === "success") setEmployeeStats(employeeData.stats);
      if (salaryData.status === "success") setSalaryStats(salaryData.stats);
      if (distData.status === "success") setDistribution(distData.distribution);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#28a745', '#ffc107', '#dc3545', '#17a2b8'];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(amount);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px", color: "#666" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
        <div style={{ fontSize: "16px", fontWeight: "500" }}>Đang tải dữ liệu phân tích...</div>
      </div>
    );
  }

  const pieData = distribution ? [
    { name: "Đúng giờ", value: distribution.onTime },
    { name: "Muộn", value: distribution.late },
    { name: "Về sớm", value: distribution.earlyLeave },
    { name: "Chưa khớp", value: distribution.unmatched }
  ].filter(item => item.value > 0) : [];

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0" }}>
      {/* Welcome Header */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#fff",
        padding: "48px 40px",
        borderRadius: "16px 16px 0 0"
      }}>
        <h1 style={{ margin: "0 0 12px 0", fontSize: "36px", fontWeight: "700" }}>
          📊 Analytics Dashboard
        </h1>
        <p style={{ margin: 0, fontSize: "16px", opacity: 0.95 }}>
          Phân tích và thống kê toàn diện về điểm danh, nhân viên và lương. Xem xu hướng và insights chi tiết.
        </p>
      </div>

      {/* Main Content */}
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "0 0 16px 16px",
        padding: "40px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)"
      }}>
        {/* Overview Cards */}
        {overview && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "24px",
            marginBottom: "32px"
          }}>
            <div style={{
              backgroundColor: "#fff",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              border: "1px solid #e0e0e0"
            }}>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px", fontWeight: "500" }}>
                Tổng nhân viên
              </div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#667eea" }}>
                {overview.totalEmployees}
              </div>
            </div>
            <div style={{
              backgroundColor: "#fff",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              border: "1px solid #e0e0e0"
            }}>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px", fontWeight: "500" }}>
                Điểm danh hôm nay
              </div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#28a745" }}>
                {overview.todayAttendance}
              </div>
            </div>
            <div style={{
              backgroundColor: "#fff",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              border: "1px solid #e0e0e0"
            }}>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px", fontWeight: "500" }}>
                Đơn nghỉ chờ duyệt
              </div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#ffc107" }}>
                {overview.pendingLeaves}
              </div>
            </div>
            <div style={{
              backgroundColor: "#fff",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              border: "1px solid #e0e0e0"
            }}>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px", fontWeight: "500" }}>
                Đã đăng ký khuôn mặt
              </div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#17a2b8" }}>
                {overview.employeesWithFace}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "32px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "13px", color: "#495057" }}>
                Tháng
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{
                  padding: "10px 16px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "13px", color: "#495057" }}>
                Năm
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{
                  padding: "10px 16px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "13px", color: "#495057" }}>
                Xu hướng (ngày)
              </label>
              <select
                value={trendDays}
                onChange={(e) => setTrendDays(parseInt(e.target.value))}
                style={{
                  padding: "10px 16px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                <option value={7}>7 ngày</option>
                <option value={30}>30 ngày</option>
                <option value={90}>90 ngày</option>
              </select>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
          gap: "24px",
          marginBottom: "32px"
        }}>
          {/* Attendance Trend Line Chart */}
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "20px", fontWeight: "700", color: "#1a1a1a" }}>
              📈 Xu Hướng Điểm Danh
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#667eea" strokeWidth={2} name="Tổng" />
                <Line type="monotone" dataKey="onTime" stroke="#28a745" strokeWidth={2} name="Đúng giờ" />
                <Line type="monotone" dataKey="late" stroke="#ffc107" strokeWidth={2} name="Muộn" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Attendance Distribution Pie Chart */}
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "20px", fontWeight: "700", color: "#1a1a1a" }}>
              🥧 Phân Bố Điểm Danh
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Employees Bar Chart */}
        {employeeStats.length > 0 && (
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "32px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "20px", fontWeight: "700", color: "#1a1a1a" }}>
              🏆 Top Nhân Viên Đi Làm Đúng Giờ
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={employeeStats.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={100} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="onTimeCount" fill="#28a745" name="Đúng giờ" />
                <Bar dataKey="lateCount" fill="#ffc107" name="Muộn" />
                <Bar dataKey="earlyLeaveCount" fill="#dc3545" name="Về sớm" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Salary Statistics */}
        {salaryStats && (
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "20px", fontWeight: "700", color: "#1a1a1a" }}>
              💰 Thống Kê Lương Tháng {selectedMonth}/{selectedYear}
            </h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px"
            }}>
              <div style={{
                padding: "20px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px"
              }}>
                <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>Tổng lương cơ bản</div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#667eea" }}>
                  {formatCurrency(salaryStats.totalBaseSalary)}
                </div>
              </div>
              <div style={{
                padding: "20px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px"
              }}>
                <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>Tổng thưởng</div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#28a745" }}>
                  {formatCurrency(salaryStats.totalBonus)}
                </div>
              </div>
              <div style={{
                padding: "20px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px"
              }}>
                <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>Tổng khấu trừ</div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#dc3545" }}>
                  {formatCurrency(salaryStats.totalDeduction)}
                </div>
              </div>
              <div style={{
                padding: "20px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px"
              }}>
                <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>Tổng thực nhận</div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#f5576c" }}>
                  {formatCurrency(salaryStats.totalFinalSalary)}
                </div>
              </div>
              <div style={{
                padding: "20px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px"
              }}>
                <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>Lương trung bình</div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#17a2b8" }}>
                  {formatCurrency(salaryStats.averageSalary)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

