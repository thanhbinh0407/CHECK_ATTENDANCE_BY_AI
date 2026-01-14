import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";
import { exportSalariesToExcel, exportSalariesToPDF } from "../utils/exportUtils.js";

export default function SalaryManagement() {
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
      pending: { background: "#fbbf24", color: "#78350f" },
      approved: { background: "#3b82f6", color: "#1e3a8a" },
      paid: { background: "#10b981", color: "#065f46" }
    };
    const labels = {
      pending: "Chờ duyệt",
      approved: "Đã duyệt",
      paid: "Đã thanh toán"
    };
    return { style: styles[status] || styles.pending, label: labels[status] || status };
  };

  const containerStyle = {
    background: theme.neutral.white,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    boxShadow: theme.shadows.sm,
  };

  const headerStyle = {
    marginBottom: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    borderBottom: `2px solid ${theme.neutral.gray200}`,
  };

  const filtersStyle = {
    display: "flex",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    alignItems: "flex-end",
  };

  const inputStyle = {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    border: `2px solid ${theme.neutral.gray200}`,
    borderRadius: theme.radius.md,
    fontSize: "14px",
  };

  const buttonStyle = {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    background: theme.primary.main,
    color: theme.neutral.white,
    border: "none",
    borderRadius: theme.radius.md,
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: theme.spacing.lg,
  };

  const thStyle = {
    padding: theme.spacing.md,
    textAlign: "left",
    borderBottom: `2px solid ${theme.neutral.gray200}`,
    fontWeight: "600",
    color: theme.neutral.gray700,
    fontSize: "14px",
  };

  const tdStyle = {
    padding: theme.spacing.md,
    borderBottom: `1px solid ${theme.neutral.gray200}`,
    fontSize: "14px",
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: theme.neutral.gray900 }}>
          Quản lý Bảng Lương
        </h2>
        <p style={{ margin: `${theme.spacing.sm} 0 0 0`, color: theme.neutral.gray600, fontSize: "14px" }}>
          Quản lý và tính lương nhân viên theo tháng
        </p>
      </div>

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

      <div style={filtersStyle}>
        <div>
          <label style={{ display: "block", marginBottom: theme.spacing.sm, fontWeight: "600", fontSize: "14px" }}>
            Tháng
          </label>
          <select
            style={inputStyle}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: theme.spacing.sm, fontWeight: "600", fontSize: "14px" }}>
            Năm
          </label>
          <select
            style={inputStyle}
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => exportSalariesToExcel(salaries, `bang-luong-${selectedMonth}-${selectedYear}`)}
          disabled={salaries.length === 0}
          style={{ ...buttonStyle, background: "#10b981" }}
        >
          Xuất Excel
        </button>

        <button
          onClick={() => exportSalariesToPDF(salaries, `bang-luong-${selectedMonth}-${selectedYear}`)}
          disabled={salaries.length === 0}
          style={{ ...buttonStyle, background: "#ef4444" }}
        >
          Xuất PDF
        </button>
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
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Nhân viên</th>
              <th style={thStyle}>Mã NV</th>
              <th style={thStyle}>Lương cơ bản</th>
              <th style={thStyle}>Thưởng</th>
              <th style={thStyle}>Khấu trừ</th>
              <th style={thStyle}>Thực nhận</th>
              <th style={thStyle}>Trạng thái</th>
              <th style={thStyle}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map(salary => {
              const statusBadge = getStatusBadge(salary.status);
              return (
                <tr key={salary.id}>
                  <td style={tdStyle}>{salary.User?.name || "N/A"}</td>
                  <td style={tdStyle}>{salary.User?.employeeCode || "N/A"}</td>
                  <td style={tdStyle}>{formatCurrency(salary.baseSalary)}</td>
                  <td style={tdStyle}>{formatCurrency(salary.bonus)}</td>
                  <td style={tdStyle}>{formatCurrency(salary.deduction)}</td>
                  <td style={tdStyle}><strong>{formatCurrency(salary.finalSalary)}</strong></td>
                  <td style={tdStyle}>
                    <span style={{
                      ...statusBadge.style,
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}>
                      {statusBadge.label}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: theme.spacing.sm }}>
                      {salary.status === "pending" && (
                        <button
                          onClick={() => handleUpdateStatus(salary.id, "approved")}
                          style={{ ...buttonStyle, background: "#3b82f6", padding: "6px 12px", fontSize: "12px" }}
                        >
                          Duyệt
                        </button>
                      )}
                      {salary.status === "approved" && (
                        <button
                          onClick={() => handleUpdateStatus(salary.id, "paid")}
                          style={{ ...buttonStyle, background: "#10b981", padding: "6px 12px", fontSize: "12px" }}
                        >
                          Thanh toán
                        </button>
                      )}
                      <button
                        onClick={() => handleCalculateSalary(salary.User?.id)}
                        style={{ ...buttonStyle, background: theme.neutral.gray600, padding: "6px 12px", fontSize: "12px" }}
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
      )}
    </div>
  );
}

