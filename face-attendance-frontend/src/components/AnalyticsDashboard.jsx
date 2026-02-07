import React, { useState, useEffect } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { theme } from "../styles/theme.js";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function AnalyticsDashboard() {
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const token = localStorage.getItem("authToken");

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAnalytics();
  }, [month, year]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/analytics/dashboard?month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load analytics");
      setAnalytics(data.analytics);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: theme.neutral.white,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.neutral.gray200}`,
    boxShadow: theme.shadows.sm,
    padding: theme.spacing.xl,
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.neutral.gray300}`,
    fontWeight: 600,
  };

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ textAlign: "center", padding: theme.spacing.xl }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div style={cardStyle}>
        <div style={{ textAlign: "center", padding: theme.spacing.xl }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: theme.error.main }}>Failed to load analytics</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: theme.spacing.xl }}>
      {/* Header */}
      <div style={{ ...cardStyle, background: theme.gradients.primary, color: theme.neutral.white, border: "none" }}>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>📊 Advanced Analytics Dashboard</div>
        <div style={{ opacity: 0.95 }}>Visual analytics and insights for HR management</div>
      </div>

      {/* Filters */}
      <div style={cardStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: theme.spacing.md, maxWidth: "400px" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.neutral.gray700, marginBottom: 6 }}>Month</div>
            <input
              type="number"
              min="1"
              max="12"
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value) || 1)}
              style={inputStyle}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.neutral.gray700, marginBottom: 6 }}>Year</div>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: theme.spacing.md }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.neutral.gray600, marginBottom: 8 }}>Total Employees</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: theme.primary.main }}>
            {analytics.summary.totalEmployees}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.neutral.gray600, marginBottom: 8 }}>Average Attendance Rate</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: theme.success.main }}>
            {analytics.summary.currentMonthAttendance.averageAttendanceRate}%
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.neutral.gray600, marginBottom: 8 }}>Total Payroll Cost</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: theme.warning.main }}>
            {new Intl.NumberFormat('vi-VN').format(analytics.summary.currentMonthPayroll.totalCost)} VND
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.neutral.gray600, marginBottom: 8 }}>Total Overtime Hours</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: theme.secondary.main }}>
            {analytics.summary.currentMonthOvertime.totalHours}
          </div>
        </div>
      </div>

      {/* Charts Row 1: Pie Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: theme.spacing.lg }}>
        {/* Structure by Department */}
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: theme.spacing.md }}>Cơ cấu theo Phòng ban</div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.charts.structureByDepartment}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.charts.structureByDepartment.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Age Distribution */}
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: theme.spacing.md }}>Phân bổ theo Độ tuổi</div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.charts.ageDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.charts.ageDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Line Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: theme.spacing.lg }}>
        {/* Turnover Trend */}
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: theme.spacing.md }}>Xu hướng Tỷ lệ Luân chuyển (6 tháng)</div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.charts.turnoverTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="turnoverRate" stroke="#8884d8" name="Tỷ lệ luân chuyển (%)" />
              <Line type="monotone" dataKey="newEmployees" stroke="#82ca9d" name="Nhân viên mới" />
              <Line type="monotone" dataKey="terminatedEmployees" stroke="#ff7300" name="Nhân viên nghỉ" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payroll Cost Trend */}
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: theme.spacing.md }}>Xu hướng Chi phí Lương (6 tháng)</div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.charts.payrollTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN').format(value) + ' VND'} />
              <Legend />
              <Line type="monotone" dataKey="totalCost" stroke="#8884d8" name="Tổng chi phí" />
              <Line type="monotone" dataKey="totalGrossSalary" stroke="#82ca9d" name="Lương gộp" />
              <Line type="monotone" dataKey="totalInsurance" stroke="#ff7300" name="Bảo hiểm" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 3: Bar Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: theme.spacing.lg }}>
        {/* Overtime by Department */}
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: theme.spacing.md }}>Giờ làm thêm theo Phòng ban</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.charts.overtimeByDepartment}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="hours" fill="#8884d8" name="Tổng giờ" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 10 Overtime Employees */}
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: theme.spacing.md }}>Top 10 Nhân viên Làm thêm giờ</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.charts.topOvertimeEmployees} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="hours" fill="#82ca9d" name="Giờ làm thêm" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attendance Trend */}
      <div style={cardStyle}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: theme.spacing.md }}>Xu hướng Chấm công (6 tháng)</div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.charts.attendanceTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="averageAttendanceRate" stroke="#8884d8" name="Tỷ lệ chấm công (%)" />
            <Line type="monotone" dataKey="totalLate" stroke="#ff7300" name="Tổng đi muộn" />
            <Line type="monotone" dataKey="totalAbsent" stroke="#ffc658" name="Tổng vắng mặt" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
