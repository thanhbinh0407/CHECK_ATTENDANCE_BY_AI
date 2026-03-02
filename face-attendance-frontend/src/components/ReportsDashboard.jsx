import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

// Custom label renderer for pie charts to prevent overlapping
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, index }) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 30; // Position labels closer since they're shorter now
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  // Show only percentage - names will be in legend
  const labelText = `${(percent * 100).toFixed(0)}%`;
  
  return (
    <text 
      x={x} 
      y={y} 
      fill="#333" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      style={{ fontSize: '13px', fontWeight: 700 }}
    >
      {labelText}
    </text>
  );
};

// Custom tooltip formatter for pie charts
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{payload[0].name}</p>
        <p style={{ margin: '4px 0 0 0', color: payload[0].fill }}>
          Count: {payload[0].value} ({((payload[0].percent || 0) * 100).toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

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
      // Transform Vietnamese labels to English
      const transformedData = transformAnalyticsData(data.analytics);
      setAnalyticsData(transformedData);
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

  // Translate Vietnamese labels to English
  const translateLabel = (label) => {
    const translations = {
      // Contract types
      'Thử việc': 'Probation',
      'thử việc': 'Probation',
      '1 năm': '1 Year',
      '3 năm': '3 Years',
      'Không xác định': 'Indefinite',
      'không xác định': 'Indefinite',
      'Khác': 'Other',
      'khác': 'Other',
      // Education levels
      'Đại học': 'University',
      'đại học': 'University',
      'Cao đẳng': 'College',
      'cao đẳng': 'College',
      'Trung cấp': 'Intermediate',
      'trung cấp': 'Intermediate',
      'Thạc sĩ': 'Master',
      'thạc sĩ': 'Master',
      'Tiến sĩ': 'PhD',
      'tiến sĩ': 'PhD',
      'Phổ thông': 'High School',
      'phổ thông': 'High School',
      // Common terms
      'Không có': 'None',
      'không có': 'None',
      'Chưa có': 'Not Available',
      'chưa có': 'Not Available',
    };
    return translations[label] || label;
  };

  // Transform analytics data to English
  const transformAnalyticsData = (data) => {
    if (!data) return data;
    
    const transformed = { ...data };
    
    // Transform charts data
    if (transformed.charts) {
      // Structure by Contract Type
      if (transformed.charts.structureByContractType) {
        transformed.charts.structureByContractType = transformed.charts.structureByContractType.map(item => ({
          ...item,
          name: translateLabel(item.name)
        }));
      }
      
      // Structure by Department
      if (transformed.charts.structureByDepartment) {
        transformed.charts.structureByDepartment = transformed.charts.structureByDepartment.map(item => ({
          ...item,
          name: translateLabel(item.name)
        }));
      }
      
      // Age Distribution
      if (transformed.charts.ageDistribution) {
        transformed.charts.ageDistribution = transformed.charts.ageDistribution.map(item => ({
          ...item,
          name: translateLabel(item.name)
        }));
      }
      
      // Education Level
      if (transformed.charts.educationLevel) {
        transformed.charts.educationLevel = transformed.charts.educationLevel.map(item => ({
          ...item,
          name: translateLabel(item.name)
        }));
      }
    }
    
    return transformed;
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
                      <div style={{ fontWeight: 600 }}>{dept.departmentName || 'Unspecified'}</div>
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
                      <div style={{ fontWeight: 600 }}>{job.jobTitleName || 'Unspecified'}</div>
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
                        {contract.contractType === 'probation' ? 'Probation' :
                         contract.contractType === '1_year' ? '1 Year' :
                         contract.contractType === '3_year' ? '3 Years' :
                         contract.contractType === 'indefinite' ? 'Indefinite' :
                         contract.contractType || 'Other'}
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
    <div style={{ 
      padding: theme.spacing.xl, 
      backgroundColor: theme.neutral.gray50,
      minHeight: "100vh" 
    }}>
      <div style={{ 
        ...cardStyle, 
        background: theme.gradients.primary, 
        color: theme.neutral.white, 
        border: "none",
        marginBottom: theme.spacing.xxl 
      }}>
        <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>📊 Reporting & Analytics Dashboard</div>
        <div style={{ opacity: 0.95, fontSize: 15 }}>Comprehensive reports with visual charts and analytics dashboard.</div>
      </div>

      {/* ===== ANALYTICS DASHBOARD SECTION ===== */}
      {analyticsLoading && (
        <div style={cardStyle}>
          <div style={{ textAlign: "center", padding: theme.spacing.xl }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: theme.neutral.gray600 }}>🔄 Loading analytics...</div>
          </div>
        </div>
      )}
      {!analyticsLoading && analyticsData && (
        <div style={{ 
          marginBottom: theme.spacing.xxxl,
          paddingBottom: theme.spacing.xxxl,
          borderBottom: `4px solid ${theme.neutral.gray300}`
        }}>
          <div style={{ 
            ...cardStyle,
            background: "#ffffff",
            border: "1px solid #e0e0e0",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
            marginBottom: theme.spacing.xl
          }}>
            <div style={{ 
              fontSize: 24, 
              fontWeight: 700, 
              marginBottom: 8, 
              color: "#333",
              display: "flex",
              alignItems: "center",
              gap: theme.spacing.sm
            }}>
              📈 <span>Analytics Dashboard - {month}/{year}</span>
            </div>
            <div style={{ fontSize: 14, color: "#666" }}>
              Overview of key performance metrics and trends
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
            gap: theme.spacing.lg, 
            marginBottom: theme.spacing.xxxl 
          }}>
            <div style={{ 
              ...cardStyle,
              padding: theme.spacing.lg, 
              background: "#ffffff",
              textAlign: "center",
              transition: "all 0.3s ease",
              cursor: "default",
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.08)";
            }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: "#333", marginBottom: 12 }}>{analyticsData.summary?.totalEmployees || 0}</div>
              <div style={{ fontSize: 14, color: "#666", fontWeight: 600 }}>Total Employees</div>
            </div>
            <div style={{ 
              ...cardStyle,
              padding: theme.spacing.lg, 
              background: "#ffffff",
              textAlign: "center",
              transition: "all 0.3s ease",
              cursor: "default",
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.08)";
            }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: "#333", marginBottom: 12 }}>
                {analyticsData.summary?.currentMonthAttendance?.averageAttendanceRate || 0}%
              </div>
              <div style={{ fontSize: 14, color: "#666", fontWeight: 600 }}>Avg Attendance Rate</div>
            </div>
            <div style={{ 
              ...cardStyle,
              padding: theme.spacing.lg, 
              background: "#ffffff",
              textAlign: "center",
              transition: "all 0.3s ease",
              cursor: "default",
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.08)";
            }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#333", marginBottom: 12 }}>
                {analyticsData.summary?.currentMonthPayroll?.totalCost?.toLocaleString('vi-VN') || 0} VNĐ
              </div>
              <div style={{ fontSize: 14, color: "#666", fontWeight: 600 }}>Total Payroll Cost</div>
            </div>
            <div style={{ 
              ...cardStyle,
              padding: theme.spacing.lg, 
              background: "#ffffff",
              textAlign: "center",
              transition: "all 0.3s ease",
              cursor: "default",
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.08)";
            }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: "#333", marginBottom: 12 }}>
                {analyticsData.summary?.currentMonthOvertime?.totalHours || 0}h
              </div>
              <div style={{ fontSize: 14, color: "#666", fontWeight: 600 }}>Total Overtime Hours</div>
            </div>
          </div>

          {/* Charts Grid - Structure Analysis */}
          <div style={{ marginBottom: theme.spacing.xxxl }}>
            <div style={{ 
              ...cardStyle,
              background: "#ffffff",
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
              padding: theme.spacing.md,
              marginBottom: theme.spacing.lg
            }}>
              <h4 style={{ 
                fontSize: 20, 
                fontWeight: 700, 
                margin: 0,
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.sm
              }}>
                🏢 Employee Structure Analysis
              </h4>
            </div>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))", 
              gap: theme.spacing.xxl 
            }}>
            {/* Pie Chart: Structure by Department */}
            {analyticsData.charts?.structureByDepartment && analyticsData.charts.structureByDepartment.length > 0 && (
              <div style={{
                ...cardStyle,
                background: "#ffffff",
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
              }}>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 700, 
                  marginBottom: theme.spacing.lg,
                  color: "#333",
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.sm
                }}>
                  🏢 <span>Employee Structure by Department</span>
                </div>
                <ResponsiveContainer width="100%" height={450}>
                  <PieChart>
                    <Pie
                      data={analyticsData.charts.structureByDepartment}
                      cx="50%"
                      cy="45%"
                      labelLine={true}
                      label={renderCustomLabel}
                      outerRadius={85}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.charts.structureByDepartment.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pie Chart: Structure by Contract Type */}
            {analyticsData.charts?.structureByContractType && analyticsData.charts.structureByContractType.length > 0 && (
              <div style={{
                ...cardStyle,
                background: "#ffffff",
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
              }}>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 700, 
                  marginBottom: theme.spacing.lg,
                  color: "#333",
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.sm
                }}>
                  📄 <span>Employee Structure by Contract Type</span>
                </div>
                <ResponsiveContainer width="100%" height={450}>
                  <PieChart>
                    <Pie
                      data={analyticsData.charts.structureByContractType}
                      cx="50%"
                      cy="45%"
                      labelLine={true}
                      label={renderCustomLabel}
                      outerRadius={85}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.charts.structureByContractType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pie Chart: Age Distribution */}
            {analyticsData.charts?.ageDistribution && analyticsData.charts.ageDistribution.length > 0 && (
              <div style={{
                ...cardStyle,
                background: "#ffffff",
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
              }}>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 700, 
                  marginBottom: theme.spacing.lg,
                  color: "#333",
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.sm
                }}>
                  👥 <span>Age Distribution</span>
                </div>
                <ResponsiveContainer width="100%" height={450}>
                  <PieChart>
                    <Pie
                      data={analyticsData.charts.ageDistribution}
                      cx="50%"
                      cy="45%"
                      labelLine={true}
                      label={renderCustomLabel}
                      outerRadius={85}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.charts.ageDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pie Chart: Education Level */}
            {analyticsData.charts?.educationLevel && analyticsData.charts.educationLevel.length > 0 && (
              <div style={{
                ...cardStyle,
                background: "#ffffff",
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
              }}>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 700, 
                  marginBottom: theme.spacing.lg,
                  color: "#333",
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.sm
                }}>
                  🎓 <span>Education Level Distribution</span>
                </div>
                <ResponsiveContainer width="100%" height={450}>
                  <PieChart>
                    <Pie
                      data={analyticsData.charts.educationLevel}
                      cx="50%"
                      cy="45%"
                      labelLine={true}
                      label={renderCustomLabel}
                      outerRadius={85}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.charts.educationLevel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          </div>

          {/* Line Charts - Performance Trends */}
          <div>
            <div style={{ 
              ...cardStyle,
              background: "#ffffff",
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
              padding: theme.spacing.md,
              marginBottom: theme.spacing.lg
            }}>
              <h4 style={{ 
                fontSize: 20, 
                fontWeight: 700, 
                margin: 0,
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.sm
              }}>
                📊 Performance Trends (6 Months)
              </h4>
            </div>
            <div style={{ display: "grid", gap: theme.spacing.xxl }}>
            {/* Turnover Rate Trend */}
            {analyticsData.charts?.turnoverTrend && analyticsData.charts.turnoverTrend.length > 0 && (
              <div style={{
                ...cardStyle,
                background: "#ffffff",
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
              }}>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 700, 
                  marginBottom: theme.spacing.lg,
                  color: "#333",
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.sm
                }}>
                  🔄 <span>Employee Turnover Trend</span>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analyticsData.charts.turnoverTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="turnoverRate" stroke="#8884d8" strokeWidth={2} name="Turnover Rate (%)" />
                    <Line type="monotone" dataKey="newEmployees" stroke="#82ca9d" strokeWidth={2} name="New Employees" />
                    <Line type="monotone" dataKey="terminatedEmployees" stroke="#ff8042" strokeWidth={2} name="Terminated Employees" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Payroll Cost Trend */}
            {analyticsData.charts?.payrollTrend && analyticsData.charts.payrollTrend.length > 0 && (
              <div style={{
                ...cardStyle,
                background: "#ffffff",
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
              }}>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 700, 
                  marginBottom: theme.spacing.lg,
                  color: "#333",
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.sm
                }}>
                  💰 <span>Payroll Cost Trend</span>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={analyticsData.charts.payrollTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toLocaleString('en-US')} VND`} />
                    <Legend />
                    <Area type="monotone" dataKey="totalCost" stackId="1" stroke="#8884d8" fill="#8884d8" name="Total Cost" />
                    <Area type="monotone" dataKey="totalGrossSalary" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Total Gross Salary" />
                    <Area type="monotone" dataKey="totalInsurance" stackId="3" stroke="#ff8042" fill="#ff8042" name="Total Insurance" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Attendance Rate Trend */}
            {analyticsData.charts?.attendanceTrend && analyticsData.charts.attendanceTrend.length > 0 && (
              <div style={{
                ...cardStyle,
                background: "#ffffff",
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
              }}>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 700, 
                  marginBottom: theme.spacing.lg,
                  color: "#333",
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.sm
                }}>
                  📊 <span>Attendance Rate Trend</span>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analyticsData.charts.attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="averageAttendanceRate" stroke="#0088FE" strokeWidth={3} name="Avg Attendance Rate (%)" />
                    <Line type="monotone" dataKey="totalLate" stroke="#FF8042" strokeWidth={2} name="Total Late Count" />
                    <Line type="monotone" dataKey="totalAbsent" stroke="#FF0000" strokeWidth={2} name="Total Absent Days" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Overtime by Department - Bar Chart */}
            {analyticsData.charts?.overtimeByDepartment && analyticsData.charts.overtimeByDepartment.length > 0 && (
              <div style={{
                ...cardStyle,
                background: "#ffffff",
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
              }}>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 700, 
                  marginBottom: theme.spacing.lg,
                  color: "#333",
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.sm
                }}>
                  ⏱️ <span>Overtime by Department</span>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analyticsData.charts.overtimeByDepartment}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" fill="#8884d8" name="Total Overtime Hours" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="employees" fill="#82ca9d" name="Number of Employees" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Overtime Employees - Bar Chart */}
            {analyticsData.charts?.topOvertimeEmployees && analyticsData.charts.topOvertimeEmployees.length > 0 && (
              <div style={{
                ...cardStyle,
                background: "#ffffff",
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
              }}>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 700, 
                  marginBottom: theme.spacing.lg,
                  color: "#333",
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.sm
                }}>
                  🏆 <span>Top 10 Employees with Most Overtime</span>
                </div>
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart data={analyticsData.charts.topOvertimeEmployees} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={180} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" fill="#FF8042" name="Overtime Hours" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* ===== REPORT GENERATION SECTION ===== */}
      <div style={{
        ...cardStyle,
        marginTop: theme.spacing.xxxl,
        background: "#ffffff",
        border: "1px solid #e0e0e0",
        boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
      }}>
        <div style={{ 
          fontSize: 20, 
          fontWeight: 700, 
          marginBottom: theme.spacing.lg, 
          color: "#333",
          display: "flex",
          alignItems: "center",
          gap: theme.spacing.sm
        }}>
          📋 <span>Generate Detailed Reports</span>
        </div>
        <div style={{
          fontSize: 14,
          color: "#666",
          marginBottom: theme.spacing.xl,
          paddingBottom: theme.spacing.md,
          borderBottom: "1px solid #e0e0e0"
        }}>
          Generate comprehensive reports for specific periods with detailed employee data
        </div>

        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", 
          gap: theme.spacing.lg,
          marginBottom: theme.spacing.xl
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: theme.neutral.gray700, marginBottom: 8 }}>Month</div>
            <input 
              type="number" 
              min="1" 
              max="12" 
              value={month} 
              onChange={(e) => setMonth(parseInt(e.target.value) || 1)} 
              style={{
                ...inputStyle,
                fontSize: 15,
                fontWeight: 600
              }} 
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: theme.neutral.gray700, marginBottom: 8 }}>Year</div>
            <input 
              type="number" 
              value={year} 
              onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())} 
              style={{
                ...inputStyle,
                fontSize: 15,
                fontWeight: 600
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: theme.neutral.gray700, marginBottom: 8 }}>Start date (Turnover)</div>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              style={{
                ...inputStyle,
                fontSize: 14,
                fontWeight: 600
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: theme.neutral.gray700, marginBottom: 8 }}>End date (Turnover)</div>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              style={{
                ...inputStyle,
                fontSize: 14,
                fontWeight: 600
              }}
            />
          </div>
        </div>

        <div style={{ 
          display: "flex", 
          gap: theme.spacing.md, 
          flexWrap: "wrap"
        }}>
          <button
            onClick={() => callReport(`/api/reports/attendance?month=${month}&year=${year}`, 'attendance')}
            disabled={loading}
            style={{
              padding: "12px 20px",
              borderRadius: theme.radius.md,
              border: "1px solid #2196F3",
              background: loading ? "#e0e0e0" : "#2196F3",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#1976D2";
                e.currentTarget.style.boxShadow = "0 3px 6px rgba(0,0,0,0.15)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#2196F3";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }
            }}
          >
            📊 Attendance report
          </button>
          <button
            onClick={() => callReport(`/api/reports/payroll-cost?month=${month}&year=${year}`, 'payroll')}
            disabled={loading}
            style={{
              padding: "12px 20px",
              borderRadius: theme.radius.md,
              border: "1px solid #4CAF50",
              background: loading ? "#e0e0e0" : "#4CAF50",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#45a049";
                e.currentTarget.style.boxShadow = "0 3px 6px rgba(0,0,0,0.15)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#4CAF50";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }
            }}
          >
            💰 Payroll cost report
          </button>
          <button
            onClick={() => callReport(`/api/reports/turnover?startDate=${startDate}&endDate=${endDate}`, 'turnover')}
            disabled={loading}
            style={{
              padding: "12px 20px",
              borderRadius: theme.radius.md,
              border: "1px solid #FF9800",
              background: loading ? "#e0e0e0" : "#FF9800",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#F57C00";
                e.currentTarget.style.boxShadow = "0 3px 6px rgba(0,0,0,0.15)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#FF9800";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }
            }}
          >
            🔄 Turnover report
          </button>
          <button
            onClick={() => callReport(`/api/reports/structure`, 'structure')}
            disabled={loading}
            style={{
              padding: "12px 20px",
              borderRadius: theme.radius.md,
              border: "1px solid #9C27B0",
              background: loading ? "#e0e0e0" : "#9C27B0",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#7B1FA2";
                e.currentTarget.style.boxShadow = "0 3px 6px rgba(0,0,0,0.15)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#9C27B0";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }
            }}
          >
            🏢 Structure report
          </button>
        </div>

        {message ? (
          <div style={{ 
            marginTop: theme.spacing.xl, 
            padding: theme.spacing.lg, 
            borderRadius: theme.radius.lg, 
            backgroundColor: message.includes("✅") ? theme.success.light : message.includes("⚠️") ? theme.warning.light : theme.error.light,
            border: `2px solid ${message.includes("✅") ? theme.success.main : message.includes("⚠️") ? theme.warning.main : theme.error.main}`, 
            fontWeight: 700,
            fontSize: 15,
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
