import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";

export default function SalaryManagementAdmin() {
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchSalaries();
    fetchEmployees();
  }, [selectedMonth, selectedYear]);

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/salary?month=${selectedMonth}&year=${selectedYear}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setSalaries(data.salaries || []);
      } else {
        setMessage("Lỗi khi tải dữ liệu lương: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error fetching salaries:", error);
      setMessage("Lỗi khi tải dữ liệu lương");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleCalculateSalary = async (userId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/salary/calculate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          month: selectedMonth,
          year: selectedYear
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Tính lương thành công!");
        fetchSalaries();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Lỗi: " + (data.message || "Không thể tính lương"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (salaryId, status) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/salary/${salaryId}/status`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Cập nhật trạng thái thành công!");
        fetchSalaries();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Lỗi: " + (data.message || "Không thể cập nhật"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { background: theme.warning.bg, color: theme.warning.text },
      approved: { background: theme.info.bg, color: theme.info.text },
      paid: { background: theme.success.bg, color: theme.success.text }
    };
    const labels = {
      pending: "Chờ duyệt",
      approved: "Đã duyệt",
      paid: "Đã thanh toán"
    };
    return { style: styles[status] || styles.pending, label: labels[status] || status };
  };

  return (
    <div style={{ padding: theme.spacing.xl, backgroundColor: theme.neutral.gray50 }}>
      <h1 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>📊 Quản lý Bảng Lương</h1>

      {message && (
        <div style={{
          padding: theme.spacing.md,
          background: message.includes("thành công") ? "#d4edda" : "#f8d7da",
          border: `1px solid ${message.includes("thành công") ? "#c3e6cb" : "#f5c6cb"}`,
          borderRadius: theme.radius.md,
          color: message.includes("thành công") ? "#155724" : "#721c24",
          marginBottom: theme.spacing.lg,
        }}>
          {message}
        </div>
      )}

      <div style={{ display: "flex", gap: theme.spacing.md, marginBottom: theme.spacing.lg, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", marginBottom: theme.spacing.sm, fontWeight: "600", fontSize: theme.typography.small.fontSize }}>
            Tháng
          </label>
          <select
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              border: `2px solid ${theme.neutral.gray200}`,
              borderRadius: theme.radius.md,
              fontSize: theme.typography.body.fontSize
            }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: theme.spacing.sm, fontWeight: "600", fontSize: theme.typography.small.fontSize }}>
            Năm
          </label>
          <select
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              border: `2px solid ${theme.neutral.gray200}`,
              borderRadius: theme.radius.md,
              fontSize: theme.typography.body.fontSize
            }}
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: theme.spacing.xxl }}>
          <div>Đang tải...</div>
        </div>
      ) : salaries.length === 0 ? (
        <div style={{ textAlign: "center", padding: theme.spacing.xxl, color: theme.neutral.gray500 }}>
          <div>Chưa có dữ liệu lương cho tháng {selectedMonth}/{selectedYear}</div>
        </div>
      ) : (
        <div style={{ backgroundColor: theme.neutral.white, borderRadius: theme.radius.lg, overflow: "hidden", boxShadow: theme.shadows.md }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: theme.primary.main, color: theme.neutral.white }}>
                <th style={{ padding: theme.spacing.md, textAlign: "left" }}>Employee</th>
                <th style={{ padding: theme.spacing.md, textAlign: "left" }}>Code</th>
                <th style={{ padding: theme.spacing.md, textAlign: "right" }}>Base Salary</th>
                <th style={{ padding: theme.spacing.md, textAlign: "right" }}>Bonus</th>
                <th style={{ padding: theme.spacing.md, textAlign: "right" }}>Deduction</th>
                <th style={{ padding: theme.spacing.md, textAlign: "right" }}>Net Pay</th>
                <th style={{ padding: theme.spacing.md, textAlign: "center" }}>Status</th>
                <th style={{ padding: theme.spacing.md, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {salaries.map(salary => {
                const statusBadge = getStatusBadge(salary.status);
                const employee = employees.find(e => e.id === salary.userId);
                return (
                  <tr key={salary.id} style={{ borderBottom: `1px solid ${theme.neutral.gray200}` }}>
                    <td style={{ padding: theme.spacing.md }}>{employee?.name || salary.User?.name || "N/A"}</td>
                    <td style={{ padding: theme.spacing.md }}>{employee?.employeeCode || salary.User?.employeeCode || "N/A"}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "right" }}>{formatCurrency(salary.baseSalary)}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "right" }}>{formatCurrency(salary.bonus)}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "right" }}>{formatCurrency(salary.deduction)}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "right" }}><strong>{formatCurrency(salary.finalSalary)}</strong></td>
                    <td style={{ padding: theme.spacing.md, textAlign: "center" }}>
                      <span style={{
                        ...statusBadge.style,
                        padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                        borderRadius: theme.radius.full,
                        fontSize: theme.typography.tiny.fontSize,
                        fontWeight: "600",
                      }}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td style={{ padding: theme.spacing.md, textAlign: "center" }}>
                      <div style={{ display: "flex", gap: theme.spacing.sm, justifyContent: "center" }}>
                        {salary.status === "pending" && (
                          <button
                            onClick={() => handleUpdateStatus(salary.id, "approved")}
                            style={{
                              padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                              background: theme.info.main,
                              color: theme.neutral.white,
                              border: "none",
                              borderRadius: theme.radius.md,
                              cursor: "pointer",
                              fontSize: theme.typography.tiny.fontSize,
                              fontWeight: "600"
                            }}
                          >
                            Duyệt
                          </button>
                        )}
                        {salary.status === "approved" && (
                          <button
                            onClick={() => handleUpdateStatus(salary.id, "paid")}
                            style={{
                              padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                              background: theme.success.main,
                              color: theme.neutral.white,
                              border: "none",
                              borderRadius: theme.radius.md,
                              cursor: "pointer",
                              fontSize: theme.typography.tiny.fontSize,
                              fontWeight: "600"
                            }}
                          >
                            Thanh toán
                          </button>
                        )}
                        <button
                          onClick={() => handleCalculateSalary(salary.userId || employee?.id)}
                          style={{
                            padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                            background: theme.neutral.gray600,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: "pointer",
                            fontSize: theme.typography.tiny.fontSize,
                            fontWeight: "600"
                          }}
                        >
                          Tính lại
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

