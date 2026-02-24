import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

export default function ReportsDashboard() {
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const token = localStorage.getItem("authToken");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState(null); // 'attendance', 'payroll', 'turnover', 'structure'
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

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

  // Load analytics dashboard data
  useEffect(() => {
    loadAnalytics();
  }, [month, year]);

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setMessage("");
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
      setAnalyticsData(data.analytics);
    } catch (err) {
      console.error("Error loading analytics:", err);
      setAnalyticsData(null);
      setMessage(`⚠️ Analytics error: ${err.message}`);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const callReport = async (path, type) => {
    try {
      setLoading(true);
      setMessage("");
      setReportData(null);
      setReportType(type);
      const res = await fetch(`${apiBase}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Report generation failed");
      }
      if (!data.report) {
        throw new Error("Report data is missing from response");
      }
      setReportData(data.report);
      setMessage(`✅ Report generated successfully!`);
    } catch (err) {
      console.error("Error generating report:", err);
      setReportData(null);
      setReportType(null);
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const renderReport = () => {
    if (!reportData || !reportType) return null;

    switch (reportType) {
      case 'attendance':
        return renderAttendanceReport();
      case 'payroll':
        return renderPayrollReport();
      case 'turnover':
        return renderTurnoverReport();
      case 'structure':
        return renderStructureReport();
      default:
        return null;
    }
  };

  const renderAttendanceReport = () => {
    if (!reportData.report || !Array.isArray(reportData.report)) return null;
    
    return (
      <div style={{ marginTop: theme.spacing.xl }}>
        <div style={{ ...cardStyle, marginBottom: theme.spacing.lg }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: theme.spacing.md, color: theme.primary.main }}>
            📊 Attendance Report - {reportData.month}/{reportData.year}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: theme.spacing.md }}>
            <div style={{ padding: theme.spacing.md, background: theme.primary.light, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: 12, color: theme.neutral.gray700, marginBottom: 4 }}>Total Employees</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: theme.primary.main }}>{reportData.totalEmployees || 0}</div>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${theme.neutral.gray300}`, backgroundColor: theme.neutral.gray50 }}>
                  <th style={{ padding: theme.spacing.md, textAlign: "left", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Employee</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Department</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Present Days</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Leave Days</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Absent Days</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Late Count</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Overtime Hours</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Attendance Rate</th>
                </tr>
              </thead>
              <tbody>
                {reportData.report.map((emp, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${theme.neutral.gray200}`, transition: "background 0.2s" }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.neutral.gray50}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                    <td style={{ padding: theme.spacing.md }}>
                      <div style={{ fontWeight: 600 }}>{emp.employeeName}</div>
                      <div style={{ fontSize: 12, color: theme.neutral.gray600 }}>{emp.employeeCode}</div>
                    </td>
                    <td style={{ padding: theme.spacing.md, textAlign: "center" }}>{emp.department || '-'}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 600, color: theme.success.main }}>{emp.presentDays || 0}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "center" }}>{emp.leaveDays || 0}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 600, color: theme.error.main }}>{emp.absentDays || 0}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "center", color: theme.warning.main }}>{emp.lateCount || 0}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "center", color: theme.secondary.main }}>{emp.overtimeHours || 0}h</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "center", fontWeight: 700 }}>
                      <span style={{ 
                        color: parseFloat(emp.attendanceRate) >= 90 ? theme.success.main : parseFloat(emp.attendanceRate) >= 70 ? theme.warning.main : theme.error.main
                      }}>
                        {emp.attendanceRate || 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPayrollReport = () => {
    if (!reportData.summary || !reportData.breakdown) return null;
    
    return (
      <div style={{ marginTop: theme.spacing.xl }}>
        <div style={{ ...cardStyle, marginBottom: theme.spacing.lg }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: theme.spacing.md, color: theme.primary.main }}>
            💰 Payroll Cost Report - {reportData.month}/{reportData.year}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: theme.spacing.md }}>
            <div style={{ padding: theme.spacing.md, background: theme.primary.light, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: 12, color: theme.neutral.gray700, marginBottom: 4 }}>Total Employees</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: theme.primary.main }}>{reportData.summary.totalEmployees || 0}</div>
            </div>
            <div style={{ padding: theme.spacing.md, background: theme.success.light, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: 12, color: theme.neutral.gray700, marginBottom: 4 }}>Total Gross Salary</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: theme.success.main }}>{formatCurrency(reportData.summary.totalGrossSalary)}</div>
            </div>
            <div style={{ padding: theme.spacing.md, background: theme.warning.light, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: 12, color: theme.neutral.gray700, marginBottom: 4 }}>Total Insurance</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: theme.warning.main }}>{formatCurrency(reportData.summary.totalInsurance)}</div>
            </div>
            <div style={{ padding: theme.spacing.md, background: theme.error.light, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: 12, color: theme.neutral.gray700, marginBottom: 4 }}>Total Tax</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: theme.error.main }}>{formatCurrency(reportData.summary.totalTax)}</div>
            </div>
            <div style={{ padding: theme.spacing.md, background: theme.secondary.light, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: 12, color: theme.neutral.gray700, marginBottom: 4 }}>Total Cost</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: theme.secondary.main }}>{formatCurrency(reportData.summary.totalCost)}</div>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: theme.spacing.md }}>Employee Breakdown</h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${theme.neutral.gray300}`, backgroundColor: theme.neutral.gray50 }}>
                  <th style={{ padding: theme.spacing.md, textAlign: "left", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Employee</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "right", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Gross Salary</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "right", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Insurance</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "right", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Tax</th>
                  <th style={{ padding: theme.spacing.md, textAlign: "right", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Net Salary</th>
                </tr>
              </thead>
              <tbody>
                {reportData.breakdown.map((emp, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${theme.neutral.gray200}`, transition: "background 0.2s" }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.neutral.gray50}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                    <td style={{ padding: theme.spacing.md }}>
                      <div style={{ fontWeight: 600 }}>{emp.employeeName}</div>
                      <div style={{ fontSize: 12, color: theme.neutral.gray600 }}>{emp.employeeCode} - {emp.department}</div>
                    </td>
                    <td style={{ padding: theme.spacing.md, textAlign: "right", fontWeight: 600 }}>{formatCurrency(emp.grossSalary)}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "right", color: theme.warning.main }}>{formatCurrency(emp.employeeInsurance + emp.employerInsurance)}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "right", color: theme.error.main }}>{formatCurrency(emp.tax)}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "right", fontWeight: 700, color: theme.success.main }}>{formatCurrency(emp.netSalary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderTurnoverReport = () => {
    if (!reportData.period) return null;
    
    return (
      <div style={{ marginTop: theme.spacing.xl }}>
        <div style={{ ...cardStyle, marginBottom: theme.spacing.lg }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: theme.spacing.md, color: theme.primary.main }}>
            🔄 Employee Turnover Report
          </h3>
          <div style={{ marginBottom: theme.spacing.md, padding: theme.spacing.md, background: theme.info.bg, borderRadius: theme.radius.md }}>
            <div style={{ fontSize: 12, color: theme.neutral.gray700, marginBottom: 4 }}>Period</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{formatDate(reportData.period.startDate)} - {formatDate(reportData.period.endDate)}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: theme.spacing.md }}>
            <div style={{ padding: theme.spacing.md, background: theme.success.light, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: 12, color: theme.neutral.gray700, marginBottom: 4 }}>New Employees</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: theme.success.main }}>{reportData.newEmployees || 0}</div>
            </div>
            <div style={{ padding: theme.spacing.md, background: theme.error.light, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: 12, color: theme.neutral.gray700, marginBottom: 4 }}>Terminated</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: theme.error.main }}>{reportData.terminatedEmployees || 0}</div>
            </div>
            <div style={{ padding: theme.spacing.md, background: theme.primary.light, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: 12, color: theme.neutral.gray700, marginBottom: 4 }}>Total at Start</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: theme.primary.main }}>{reportData.totalAtStart || 0}</div>
            </div>
            <div style={{ padding: theme.spacing.md, background: theme.secondary.light, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: 12, color: theme.neutral.gray700, marginBottom: 4 }}>Total at End</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: theme.secondary.main }}>{reportData.totalAtEnd || 0}</div>
            </div>
            <div style={{ padding: theme.spacing.md, background: theme.warning.light, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: 12, color: theme.neutral.gray700, marginBottom: 4 }}>Turnover Rate</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: theme.warning.main }}>{reportData.turnoverRate?.toFixed(2) || 0}%</div>
            </div>
          </div>
        </div>

        {reportData.details && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: theme.spacing.lg }}>
            {reportData.details.newEmployees && reportData.details.newEmployees.length > 0 && (
              <div style={cardStyle}>
                <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: theme.spacing.md, color: theme.success.main }}>New Employees</h4>
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {reportData.details.newEmployees.map((emp, idx) => (
                    <div key={idx} style={{ padding: theme.spacing.sm, borderBottom: `1px solid ${theme.neutral.gray200}`, marginBottom: theme.spacing.xs }}>
                      <div style={{ fontWeight: 600 }}>{emp.name}</div>
                      <div style={{ fontSize: 12, color: theme.neutral.gray600 }}>{emp.employeeCode} - Started: {formatDate(emp.startDate)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {reportData.details.terminatedEmployees && reportData.details.terminatedEmployees.length > 0 && (
              <div style={cardStyle}>
                <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: theme.spacing.md, color: theme.error.main }}>Terminated Employees</h4>
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {reportData.details.terminatedEmployees.map((emp, idx) => (
                    <div key={idx} style={{ padding: theme.spacing.sm, borderBottom: `1px solid ${theme.neutral.gray200}`, marginBottom: theme.spacing.xs }}>
                      <div style={{ fontWeight: 600 }}>{emp.name}</div>
                      <div style={{ fontSize: 12, color: theme.neutral.gray600 }}>{emp.employeeCode} - {emp.employmentStatus}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderStructureReport = () => {
    if (!reportData.byDepartment && !reportData.byJobTitle) return null;
    
    return (
      <div style={{ marginTop: theme.spacing.xl }}>
        <div style={{ ...cardStyle, marginBottom: theme.spacing.lg }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: theme.spacing.md, color: theme.primary.main }}>
            🏢 Employee Structure Report
          </h3>
          <div style={{ padding: theme.spacing.md, background: theme.primary.light, borderRadius: theme.radius.md, marginBottom: theme.spacing.md }}>
            <div style={{ fontSize: 12, color: theme.neutral.gray700, marginBottom: 4 }}>Total Employees</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: theme.primary.main }}>{reportData.total || 0}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: theme.spacing.lg }}>
          {reportData.byDepartment && reportData.byDepartment.length > 0 && (
            <div style={cardStyle}>
              <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: theme.spacing.md }}>By Department</h4>
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {reportData.byDepartment.map((dept, idx) => (
                  <div key={idx} style={{ 
                    padding: theme.spacing.md, 
                    borderBottom: `1px solid ${theme.neutral.gray200}`, 
                    marginBottom: theme.spacing.xs,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{dept.departmentName || 'Không xác định'}</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: theme.primary.main }}>{dept.count || 0}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportData.byJobTitle && reportData.byJobTitle.length > 0 && (
            <div style={cardStyle}>
              <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: theme.spacing.md }}>By Job Title</h4>
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {reportData.byJobTitle.map((job, idx) => (
                  <div key={idx} style={{ 
                    padding: theme.spacing.md, 
                    borderBottom: `1px solid ${theme.neutral.gray200}`, 
                    marginBottom: theme.spacing.xs,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{job.jobTitleName || 'Không xác định'}</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: theme.secondary.main }}>{job.count || 0}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportData.byContractType && reportData.byContractType.length > 0 && (
            <div style={cardStyle}>
              <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: theme.spacing.md }}>By Contract Type</h4>
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {reportData.byContractType.map((contract, idx) => (
                  <div key={idx} style={{ 
                    padding: theme.spacing.md, 
                    borderBottom: `1px solid ${theme.neutral.gray200}`, 
                    marginBottom: theme.spacing.xs,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {contract.contractType === 'probation' ? 'Thử việc' :
                         contract.contractType === '1_year' ? '1 năm' :
                         contract.contractType === '3_year' ? '3 năm' :
                         contract.contractType === 'indefinite' ? 'Không xác định' :
                         contract.contractType || 'Khác'}
                      </div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: theme.warning.main }}>{contract.count || 0}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gap: theme.spacing.xl }}>
      <div style={{ ...cardStyle, background: theme.gradients.primary, color: theme.neutral.white, border: "none" }}>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>📊 Reporting & Analytics</div>
        <div style={{ opacity: 0.95 }}>Comprehensive reports with visual charts and analytics dashboard.</div>
      </div>

      {/* Analytics Dashboard Section */}
      {analyticsLoading && (
        <div style={cardStyle}>
          <div style={{ textAlign: "center", padding: theme.spacing.xl }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Loading analytics...</div>
          </div>
        </div>
      )}
      {!analyticsLoading && analyticsData && (
        <div style={cardStyle}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
            📈 Analytics Dashboard - {month}/{year}
          </div>

          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: theme.spacing.md, marginBottom: theme.spacing.xl }}>
            <div style={{ padding: theme.spacing.md, background: theme.primary.light, borderRadius: theme.radius.md, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: theme.primary.main }}>{analyticsData.summary?.totalEmployees || 0}</div>
              <div style={{ fontSize: 12, color: theme.neutral.gray700 }}>Total Employees</div>
            </div>
            <div style={{ padding: theme.spacing.md, background: theme.secondary.light, borderRadius: theme.radius.md, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: theme.secondary.main }}>
                {analyticsData.summary?.currentMonthAttendance?.averageAttendanceRate || 0}%
              </div>
              <div style={{ fontSize: 12, color: theme.neutral.gray700 }}>Avg Attendance Rate</div>
            </div>
            <div style={{ padding: theme.spacing.md, background: "#E8F5E9", borderRadius: theme.radius.md, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#2E7D32" }}>
                {analyticsData.summary?.currentMonthPayroll?.totalCost?.toLocaleString('vi-VN') || 0} VNĐ
              </div>
              <div style={{ fontSize: 12, color: theme.neutral.gray700 }}>Total Payroll Cost</div>
            </div>
            <div style={{ padding: theme.spacing.md, background: "#FFF3E0", borderRadius: theme.radius.md, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#F57C00" }}>
                {analyticsData.summary?.currentMonthOvertime?.totalHours || 0}h
              </div>
              <div style={{ fontSize: 12, color: theme.neutral.gray700 }}>Total Overtime Hours</div>
            </div>
          </div>

          {/* Charts Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: theme.spacing.xl, marginTop: theme.spacing.xl }}>
            {/* Pie Chart: Structure by Department */}
            {analyticsData.charts?.structureByDepartment && analyticsData.charts.structureByDepartment.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: theme.spacing.md }}>Cơ cấu nhân sự theo phòng ban</div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.charts.structureByDepartment}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.charts.structureByDepartment.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pie Chart: Structure by Contract Type */}
            {analyticsData.charts?.structureByContractType && analyticsData.charts.structureByContractType.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: theme.spacing.md }}>Cơ cấu nhân sự theo loại hợp đồng</div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.charts.structureByContractType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.charts.structureByContractType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pie Chart: Age Distribution */}
            {analyticsData.charts?.ageDistribution && analyticsData.charts.ageDistribution.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: theme.spacing.md }}>Phân bổ theo độ tuổi</div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.charts.ageDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.charts.ageDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pie Chart: Education Level */}
            {analyticsData.charts?.educationLevel && analyticsData.charts.educationLevel.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: theme.spacing.md }}>Phân bổ theo trình độ học vấn</div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.charts.educationLevel}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.charts.educationLevel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Line Charts - Full Width */}
          <div style={{ display: "grid", gap: theme.spacing.xl, marginTop: theme.spacing.xl }}>
            {/* Turnover Rate Trend */}
            {analyticsData.charts?.turnoverTrend && analyticsData.charts.turnoverTrend.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: theme.spacing.md }}>Xu hướng tỷ lệ luân chuyển nhân sự (6 tháng)</div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.charts.turnoverTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="turnoverRate" stroke="#8884d8" name="Tỷ lệ luân chuyển (%)" />
                    <Line type="monotone" dataKey="newEmployees" stroke="#82ca9d" name="Nhân viên mới" />
                    <Line type="monotone" dataKey="terminatedEmployees" stroke="#ff8042" name="Nhân viên nghỉ việc" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Payroll Cost Trend */}
            {analyticsData.charts?.payrollTrend && analyticsData.charts.payrollTrend.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: theme.spacing.md }}>Xu hướng chi phí lương (6 tháng)</div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.charts.payrollTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toLocaleString('vi-VN')} VNĐ`} />
                    <Legend />
                    <Area type="monotone" dataKey="totalCost" stackId="1" stroke="#8884d8" fill="#8884d8" name="Tổng chi phí" />
                    <Area type="monotone" dataKey="totalGrossSalary" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Tổng lương gộp" />
                    <Area type="monotone" dataKey="totalInsurance" stackId="3" stroke="#ff8042" fill="#ff8042" name="Tổng bảo hiểm" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Attendance Rate Trend */}
            {analyticsData.charts?.attendanceTrend && analyticsData.charts.attendanceTrend.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: theme.spacing.md }}>Xu hướng tỷ lệ chấm công (6 tháng)</div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.charts.attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="averageAttendanceRate" stroke="#0088FE" strokeWidth={2} name="Tỷ lệ chấm công TB (%)" />
                    <Line type="monotone" dataKey="totalLate" stroke="#FF8042" name="Tổng số lần đi muộn" />
                    <Line type="monotone" dataKey="totalAbsent" stroke="#FF0000" name="Tổng số ngày vắng mặt" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Overtime by Department - Bar Chart */}
            {analyticsData.charts?.overtimeByDepartment && analyticsData.charts.overtimeByDepartment.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: theme.spacing.md }}>Giờ làm thêm theo phòng ban</div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.charts.overtimeByDepartment}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" fill="#8884d8" name="Tổng giờ làm thêm" />
                    <Bar dataKey="employees" fill="#82ca9d" name="Số nhân viên" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Overtime Employees - Bar Chart */}
            {analyticsData.charts?.topOvertimeEmployees && analyticsData.charts.topOvertimeEmployees.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: theme.spacing.md }}>Top 10 nhân viên làm thêm giờ nhiều nhất</div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.charts.topOvertimeEmployees} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" fill="#FF8042" name="Giờ làm thêm" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Generation Section */}
      <div style={cardStyle}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
          📋 Generate Reports
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: theme.spacing.md }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.neutral.gray700, marginBottom: 6 }}>Month</div>
            <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(parseInt(e.target.value) || 1)} style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.neutral.gray700, marginBottom: 6 }}>Year</div>
            <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())} style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.neutral.gray700, marginBottom: 6 }}>Start date (Turnover)</div>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.neutral.gray700, marginBottom: 6 }}>End date (Turnover)</div>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ marginTop: theme.spacing.lg, display: "flex", gap: theme.spacing.md, flexWrap: "wrap" }}>
          <button
            onClick={() => callReport(`/api/reports/attendance?month=${month}&year=${year}`, 'attendance')}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: theme.radius.md,
              border: "none",
              background: theme.secondary.gradient,
              color: theme.neutral.white,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Attendance report
          </button>
          <button
            onClick={() => callReport(`/api/reports/payroll-cost?month=${month}&year=${year}`, 'payroll')}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: theme.radius.md,
              border: "none",
              background: theme.secondary.gradient,
              color: theme.neutral.white,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Payroll cost report
          </button>
          <button
            onClick={() => callReport(`/api/reports/turnover?startDate=${startDate}&endDate=${endDate}`, 'turnover')}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: theme.radius.md,
              border: "none",
              background: theme.secondary.gradient,
              color: theme.neutral.white,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Turnover report
          </button>
          <button
            onClick={() => callReport(`/api/reports/structure`, 'structure')}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: theme.radius.md,
              border: "none",
              background: theme.secondary.gradient,
              color: theme.neutral.white,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Structure report
          </button>
        </div>

        {message ? (
          <div style={{ 
            marginTop: theme.spacing.lg, 
            padding: theme.spacing.md, 
            borderRadius: theme.radius.md, 
            backgroundColor: message.includes("✅") ? theme.success.light : message.includes("⚠️") ? theme.warning.light : theme.error.light,
            border: `1px solid ${message.includes("✅") ? theme.success.main : message.includes("⚠️") ? theme.warning.main : theme.error.main}`, 
            fontWeight: 700,
            color: message.includes("✅") ? theme.success.dark : message.includes("⚠️") ? theme.warning.dark : theme.error.dark
          }}>
            {message}
          </div>
        ) : null}

        {reportData && renderReport()}
      </div>
    </div>
  );
}
