import React, { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { theme } from "../styles/theme.js";

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

  const fetchAllData = useCallback(async () => {
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
  }, [apiBase, selectedMonth, selectedYear, trendDays]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

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
        <div style={{ fontSize: "16px", fontWeight: "500" }}>Loading analytics data...</div>
      </div>
    );
  }

  const pieData = distribution ? [
    { name: "On Time", value: distribution.onTime },
    { name: "Late", value: distribution.late },
    { name: "Early Leave", value: distribution.earlyLeave },
    { name: "Unmatched", value: distribution.unmatched }
  ].filter(item => item.value > 0) : [];

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes cardFadeIn {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes numberCount {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: theme.spacing.xl }}>
        {/* Welcome Header */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          padding: theme.spacing.xl,
          borderRadius: theme.radius.lg,
          marginBottom: theme.spacing.xl,
          boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)",
          animation: "fadeInUp 0.6s ease-out"
        }}>
          <h1 style={{ margin: "0 0 12px 0", fontSize: "36px", fontWeight: "700" }}>
            📊 Analytics Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: "16px", opacity: 0.95 }}>
            Comprehensive analysis and statistics on attendance, employees, and salaries. View trends and detailed insights.
          </p>
        </div>

        {/* Overview Cards */}
        {overview && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: theme.spacing.lg,
            marginBottom: theme.spacing.xl
          }}>
            <div 
              style={{
                backgroundColor: "#fff",
                padding: theme.spacing.xl,
                borderRadius: theme.radius.lg,
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                border: "1px solid #e8e8e8",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                animation: `cardFadeIn 0.5s ease-out 0.1s both`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.2)";
                e.currentTarget.style.borderColor = "#667eea";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
                e.currentTarget.style.borderColor = "#e8e8e8";
              }}
            >
              <div style={{ 
                fontSize: "13px", 
                color: "#666", 
                marginBottom: theme.spacing.sm, 
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Total Employees
              </div>
              <div style={{ 
                fontSize: "36px", 
                fontWeight: "700", 
                color: "#667eea",
                animation: "numberCount 0.6s ease-out 0.3s both"
              }}>
                {overview.totalEmployees}
              </div>
            </div>
            <div 
              style={{
                backgroundColor: "#fff",
                padding: theme.spacing.xl,
                borderRadius: theme.radius.lg,
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                border: "1px solid #e8e8e8",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                animation: `cardFadeIn 0.5s ease-out 0.2s both`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(40, 167, 69, 0.2)";
                e.currentTarget.style.borderColor = "#28a745";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
                e.currentTarget.style.borderColor = "#e8e8e8";
              }}
            >
              <div style={{ 
                fontSize: "13px", 
                color: "#666", 
                marginBottom: theme.spacing.sm, 
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Today's Attendance
              </div>
              <div style={{ 
                fontSize: "36px", 
                fontWeight: "700", 
                color: "#28a745",
                animation: "numberCount 0.6s ease-out 0.4s both"
              }}>
                {overview.todayAttendance}
              </div>
            </div>
            <div 
              style={{
                backgroundColor: "#fff",
                padding: theme.spacing.xl,
                borderRadius: theme.radius.lg,
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                border: "1px solid #e8e8e8",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                animation: `cardFadeIn 0.5s ease-out 0.3s both`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(255, 193, 7, 0.2)";
                e.currentTarget.style.borderColor = "#ffc107";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
                e.currentTarget.style.borderColor = "#e8e8e8";
              }}
            >
              <div style={{ 
                fontSize: "13px", 
                color: "#666", 
                marginBottom: theme.spacing.sm, 
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Pending Leave Requests
              </div>
              <div style={{ 
                fontSize: "36px", 
                fontWeight: "700", 
                color: "#ffc107",
                animation: "numberCount 0.6s ease-out 0.5s both"
              }}>
                {overview.pendingLeaves}
              </div>
            </div>
            <div 
              style={{
                backgroundColor: "#fff",
                padding: theme.spacing.xl,
                borderRadius: theme.radius.lg,
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                border: "1px solid #e8e8e8",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                animation: `cardFadeIn 0.5s ease-out 0.4s both`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(23, 162, 184, 0.2)";
                e.currentTarget.style.borderColor = "#17a2b8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
                e.currentTarget.style.borderColor = "#e8e8e8";
              }}
            >
              <div style={{ 
                fontSize: "13px", 
                color: "#666", 
                marginBottom: theme.spacing.sm, 
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Employees with Face Registered
              </div>
              <div style={{ 
                fontSize: "36px", 
                fontWeight: "700", 
                color: "#17a2b8",
                animation: "numberCount 0.6s ease-out 0.6s both"
              }}>
                {overview.employeesWithFace}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: theme.radius.lg,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.xl,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          border: "1px solid #e8e8e8",
          animation: "fadeInUp 0.5s ease-out 0.5s both"
        }}>
          <div style={{ display: "flex", gap: theme.spacing.lg, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: theme.spacing.sm, 
                fontWeight: "700", 
                fontSize: "13px", 
                color: "#495057",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                  border: "2px solid #e0e0e0",
                  borderRadius: theme.radius.md,
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  outline: "none",
                  backgroundColor: "#f8f9fa"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = theme.primary.main;
                  e.currentTarget.style.boxShadow = `0 0 0 3px rgba(102, 126, 234, 0.1)`;
                  e.currentTarget.style.backgroundColor = "#fff";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Month {m}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: theme.spacing.sm, 
                fontWeight: "700", 
                fontSize: "13px", 
                color: "#495057",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                  border: "2px solid #e0e0e0",
                  borderRadius: theme.radius.md,
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  outline: "none",
                  backgroundColor: "#f8f9fa"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = theme.primary.main;
                  e.currentTarget.style.boxShadow = `0 0 0 3px rgba(102, 126, 234, 0.1)`;
                  e.currentTarget.style.backgroundColor = "#fff";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
                }}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: theme.spacing.sm, 
                fontWeight: "700", 
                fontSize: "13px", 
                color: "#495057",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Trend (Days)
              </label>
              <select
                value={trendDays}
                onChange={(e) => setTrendDays(parseInt(e.target.value))}
                style={{
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                  border: "2px solid #e0e0e0",
                  borderRadius: theme.radius.md,
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  outline: "none",
                  backgroundColor: "#f8f9fa"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = theme.primary.main;
                  e.currentTarget.style.boxShadow = `0 0 0 3px rgba(102, 126, 234, 0.1)`;
                  e.currentTarget.style.backgroundColor = "#fff";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
                }}
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
          gap: theme.spacing.lg,
          marginBottom: theme.spacing.xl
        }}>
          {/* Attendance Trend Line Chart */}
          <div style={{
            backgroundColor: "#fff",
            borderRadius: theme.radius.lg,
            padding: theme.spacing.xl,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            border: "1px solid #e8e8e8",
            transition: "all 0.3s",
            animation: "slideInLeft 0.6s ease-out 0.6s both"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
          }}
          >
            <h3 style={{ 
              margin: "0 0 20px 0", 
              fontSize: "20px", 
              fontWeight: "700", 
              color: "#1a1a1a",
              display: "flex",
              alignItems: "center",
              gap: theme.spacing.sm
            }}>
              📈 Attendance Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#666" }} />
                <YAxis tick={{ fontSize: 12, fill: "#666" }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e8e8e8",
                    borderRadius: theme.radius.md,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#667eea" strokeWidth={3} name="Total" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="onTime" stroke="#28a745" strokeWidth={3} name="On Time" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="late" stroke="#ffc107" strokeWidth={3} name="Late" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Attendance Distribution Pie Chart */}
          <div style={{
            backgroundColor: "#fff",
            borderRadius: theme.radius.lg,
            padding: theme.spacing.xl,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            border: "1px solid #e8e8e8",
            transition: "all 0.3s",
            animation: "slideInLeft 0.6s ease-out 0.7s both"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
          }}
          >
            <h3 style={{ 
              margin: "0 0 20px 0", 
              fontSize: "20px", 
              fontWeight: "700", 
              color: "#1a1a1a",
              display: "flex",
              alignItems: "center",
              gap: theme.spacing.sm
            }}>
              🥧 Attendance Distribution
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
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e8e8e8",
                    borderRadius: theme.radius.md,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Employees Bar Chart */}
        {employeeStats.length > 0 && (
          <div style={{
            backgroundColor: "#fff",
            borderRadius: theme.radius.lg,
            padding: theme.spacing.xl,
            marginBottom: theme.spacing.xl,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            border: "1px solid #e8e8e8",
            transition: "all 0.3s",
            animation: "fadeInUp 0.6s ease-out 0.8s both"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
          }}
          >
            <h3 style={{ 
              margin: "0 0 20px 0", 
              fontSize: "20px", 
              fontWeight: "700", 
              color: "#1a1a1a",
              display: "flex",
              alignItems: "center",
              gap: theme.spacing.sm
            }}>
              🏆 Top Employees - On Time Attendance
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={employeeStats.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#666" }} angle={-45} textAnchor="end" height={100} />
                <YAxis tick={{ fontSize: 12, fill: "#666" }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e8e8e8",
                    borderRadius: theme.radius.md,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                />
                <Legend />
                <Bar dataKey="onTimeCount" fill="#28a745" name="On Time" radius={[8, 8, 0, 0]} />
                <Bar dataKey="lateCount" fill="#ffc107" name="Late" radius={[8, 8, 0, 0]} />
                <Bar dataKey="earlyLeaveCount" fill="#dc3545" name="Early Leave" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Salary Statistics */}
        {salaryStats && (
          <div style={{
            backgroundColor: "#fff",
            borderRadius: theme.radius.lg,
            padding: theme.spacing.xl,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            border: "1px solid #e8e8e8",
            transition: "all 0.3s",
            animation: "fadeInUp 0.6s ease-out 0.9s both"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
          }}
          >
            <h3 style={{ 
              margin: "0 0 20px 0", 
              fontSize: "20px", 
              fontWeight: "700", 
              color: "#1a1a1a",
              display: "flex",
              alignItems: "center",
              gap: theme.spacing.sm
            }}>
              💰 Salary Statistics - {selectedMonth}/{selectedYear}
            </h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: theme.spacing.md
            }}>
              {[
                { label: "Total Base Salary", value: salaryStats.totalBaseSalary, color: "#667eea", delay: "1s" },
                { label: "Total Bonus", value: salaryStats.totalBonus, color: "#28a745", delay: "1.1s" },
                { label: "Total Deduction", value: salaryStats.totalDeduction, color: "#dc3545", delay: "1.2s" },
                { label: "Total Net Salary", value: salaryStats.totalFinalSalary, color: "#f5576c", delay: "1.3s" },
                { label: "Average Salary", value: salaryStats.averageSalary, color: "#17a2b8", delay: "1.4s" }
              ].map((stat) => (
                <div 
                  key={stat.label}
                  style={{
                    padding: theme.spacing.lg,
                    backgroundColor: "#f8f9fa",
                    borderRadius: theme.radius.md,
                    border: "1px solid #e8e8e8",
                    transition: "all 0.3s",
                    animation: `cardFadeIn 0.5s ease-out ${stat.delay} both`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
                    e.currentTarget.style.boxShadow = `0 8px 16px rgba(0,0,0,0.1)`;
                    e.currentTarget.style.borderColor = stat.color;
                    e.currentTarget.style.backgroundColor = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "#e8e8e8";
                    e.currentTarget.style.backgroundColor = "#f8f9fa";
                  }}
                >
                  <div style={{ 
                    fontSize: "13px", 
                    color: "#666", 
                    marginBottom: theme.spacing.sm,
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    {stat.label}
                  </div>
                  <div style={{ 
                    fontSize: "24px", 
                    fontWeight: "700", 
                    color: stat.color,
                    animation: "numberCount 0.6s ease-out both"
                  }}>
                    {formatCurrency(stat.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

