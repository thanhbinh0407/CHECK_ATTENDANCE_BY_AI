import React, { useState, useEffect } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { theme } from "../styles/theme.js";
import { toastError } from "../lib/notify.jsx";

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
      if (!res.ok) {
        throw new Error(data?.message || "Failed to load analytics");
      }
      if (!data.analytics) {
        throw new Error("Analytics data is missing");
      }
      setAnalytics(data.analytics);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setAnalytics(null);
      toastError(`Error loading analytics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: theme.neutral.white,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.neutral.gray200}`,
    boxShadow: theme.shadows.sm,
    padding: theme.spacing.md,
  };

  const inputStyle = {
    width: "100%",
    padding: "6px 10px",
    borderRadius: theme.radius.sm,
    border: `1px solid ${theme.neutral.gray300}`,
    fontWeight: 600,
    fontSize: "13px",
    boxSizing: "border-box",
  };

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ textAlign: "center", padding: theme.spacing.md }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div style={cardStyle}>
        <div style={{ textAlign: "center", padding: theme.spacing.md }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.error.main }}>Failed to load analytics</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: theme.spacing.md }}>
      {/* Header */}
      <div style={{ ...cardStyle, background: theme.gradients.primary, color: theme.neutral.white, border: "none", padding: "14px 18px" }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 3, lineHeight: 1.25 }}>📊 Analytics</div>
        <div style={{ opacity: 0.92, fontSize: "13px", lineHeight: 1.4 }}>HR metrics and charts.</div>
      </div>

      {/* Filters */}
      <div style={cardStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: theme.spacing.sm, maxWidth: "360px" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.neutral.gray700, marginBottom: 4 }}>Month</div>
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
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.neutral.gray700, marginBottom: 4 }}>Year</div>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: theme.spacing.sm }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.neutral.gray600, marginBottom: 4 }}>Total Employees</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: theme.primary.main, lineHeight: 1.1 }}>
            {analytics.summary?.totalEmployees || 0}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.neutral.gray600, marginBottom: 4 }}>Average Attendance Rate</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: theme.success.main, lineHeight: 1.1 }}>
            {analytics.summary?.currentMonthAttendance?.averageAttendanceRate || 0}%
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.neutral.gray600, marginBottom: 4 }}>Total Payroll Cost</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: theme.warning.main, lineHeight: 1.15 }}>
            {new Intl.NumberFormat('vi-VN').format(analytics.summary?.currentMonthPayroll?.totalCost || 0)} VND
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.neutral.gray600, marginBottom: 4 }}>Total Overtime Hours</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: theme.secondary.main, lineHeight: 1.1 }}>
            {analytics.summary?.currentMonthOvertime?.totalHours || 0}
          </div>
        </div>
      </div>

      {/* Charts Row 1: Pie Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: theme.spacing.md }}>
        {/* Structure by Department */}
        {analytics.charts?.structureByDepartment && analytics.charts.structureByDepartment.length > 0 && (
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: theme.spacing.sm }}>Department Distribution</div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={analytics.charts.structureByDepartment}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={68}
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
        )}

        {/* Age Distribution */}
        {analytics.charts?.ageDistribution && analytics.charts.ageDistribution.length > 0 && (
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: theme.spacing.sm }}>Age Distribution</div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={analytics.charts.ageDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={68}
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
        )}
      </div>

      {/* Charts Row 2: Line Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: theme.spacing.md }}>
        {/* Turnover Trend */}
        {analytics.charts?.turnoverTrend && analytics.charts.turnoverTrend.length > 0 && (
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: theme.spacing.sm }}>Turnover Trend (6 months)</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={analytics.charts.turnoverTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="turnoverRate" stroke="#8884d8" name="Turnover rate (%)" />
                <Line type="monotone" dataKey="newEmployees" stroke="#82ca9d" name="New employees" />
                <Line type="monotone" dataKey="terminatedEmployees" stroke="#ff7300" name="Resigned employees" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Payroll Cost Trend */}
        {analytics.charts?.payrollTrend && analytics.charts.payrollTrend.length > 0 && (
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: theme.spacing.sm }}>Payroll Cost Trend (6 months)</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={analytics.charts.payrollTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN').format(value) + ' VND'} />
                <Legend />
                <Line type="monotone" dataKey="totalCost" stroke="#8884d8" name="Total cost" />
                <Line type="monotone" dataKey="totalGrossSalary" stroke="#82ca9d" name="Gross salary" />
                <Line type="monotone" dataKey="totalInsurance" stroke="#ff7300" name="Insurance" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Charts Row 3: Bar Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: theme.spacing.md }}>
        {/* Overtime by Department */}
        {analytics.charts?.overtimeByDepartment && analytics.charts.overtimeByDepartment.length > 0 && (
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: theme.spacing.sm }}>Overtime Hours by Department</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={analytics.charts.overtimeByDepartment}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="#8884d8" name="Total hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top 10 Overtime Employees */}
        {analytics.charts?.topOvertimeEmployees && analytics.charts.topOvertimeEmployees.length > 0 && (
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: theme.spacing.sm }}>Top 10 Overtime Employees</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={analytics.charts.topOvertimeEmployees} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="#82ca9d" name="Overtime hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Attendance Trend */}
      {analytics.charts?.attendanceTrend && analytics.charts.attendanceTrend.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: theme.spacing.sm }}>Attendance Trend (6 months)</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={analytics.charts.attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="averageAttendanceRate" stroke="#8884d8" name="Attendance rate (%)" />
              <Line type="monotone" dataKey="totalLate" stroke="#ff7300" name="Total late arrivals" />
              <Line type="monotone" dataKey="totalAbsent" stroke="#ffc658" name="Total absences" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
