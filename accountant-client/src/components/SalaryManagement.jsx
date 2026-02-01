import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";
import { exportSalariesToExcel, exportSalariesToPDF } from "../utils/exportUtils.js";

// Add keyframe animation for notification popup
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
if (!document.head.querySelector('style[data-notification-animation]')) {
  styleSheet.setAttribute('data-notification-animation', 'true');
  document.head.appendChild(styleSheet);
}

export default function SalaryManagement() {
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [toastPopup, setToastPopup] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  // Auto-hide message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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
      setMessage("Error loading salary data");
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
        setMessage("");
        setToastPopup("Salary calculated successfully!");
        fetchSalaries();
        setTimeout(() => setToastPopup(""), 5000);
      } else {
        setMessage("Error: " + (data.message || "Cannot calculate salary"));
      }
    } catch (error) {
      setMessage("Error: " + error.message);
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
        setMessage("");
        setToastPopup("Status updated successfully!");
        fetchSalaries();
        setTimeout(() => { setMessage(""); setToastPopup(""); }, 5000);
      } else {
        setMessage("Error: " + (data.message || "Could not update"));
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount || 0) + " ₫";
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { background: "#fff3cd", color: "#997404" },
      approved: { background: "#cfe2ff", color: "#084298" },
      paid: { background: "#d4edda", color: "#155724" }
    };
    const labels = {
      pending: "Pending",
      approved: "Approved",
      paid: "Paid"
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

  const tableWrapperStyle = {
    backgroundColor: theme.neutral.white,
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    marginTop: theme.spacing.lg,
    border: "1px solid #e5e7eb",
  };

  const headerBg = "#1e293b";
  const thStyle = {
    padding: "12px 16px",
    textAlign: "left",
    borderBottom: "2px solid rgba(255,255,255,0.2)",
    fontWeight: "600",
    color: "#fff",
    fontSize: "14px",
    backgroundColor: headerBg,
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
          💼 Quản lý Bảng Lương
        </h2>
        <p style={{ margin: `${theme.spacing.sm} 0 0 0`, color: theme.neutral.gray600, fontSize: "14px" }}>
          Quản lý và tính lương nhân viên theo tháng
        </p>
      </div>

      {message && !toastPopup && (
        <div style={{
          position: "fixed",
          top: "80px",
          right: "20px",
          padding: "15px 20px",
          background: message.includes("thành công") ? "#d4edda" : "#f8d7da",
          border: message.includes("thành công") ? "2px solid #28a745" : "2px solid #dc3545",
          borderRadius: "8px",
          color: message.includes("thành công") ? "#155724" : "#721c24",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 9999,
          minWidth: "300px",
          maxWidth: "400px",
          animation: "slideInRight 0.3s ease-out"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.2em" }}>
              {message.includes("thành công") ? "✅" : "❌"}
            </span>
            <span style={{ flex: 1, fontWeight: "500" }}>{message}</span>
          </div>
        </div>
      )}

      {toastPopup && (
        <div style={{
          position: "fixed",
          top: 24,
          left: "50%",
          transform: "translateX(-50%)",
          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
          background: "#059669",
          color: "#fff",
          borderRadius: theme.radius.lg,
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          fontWeight: "600",
          fontSize: "15px",
          zIndex: 9999,
        }}>
          {toastPopup}
        </div>
      )}

      <div style={filtersStyle}>
        <div>
          <label style={{ display: "block", marginBottom: theme.spacing.sm, fontWeight: "600", fontSize: "14px" }}>
            Month
          </label>
          <select
            style={inputStyle}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
              <option key={m} value={m}>Month {m}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: theme.spacing.sm, fontWeight: "600", fontSize: "14px" }}>
            Year
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
          Export Excel
        </button>

        <button
          onClick={() => exportSalariesToPDF(salaries, `bang-luong-${selectedMonth}-${selectedYear}`)}
          disabled={salaries.length === 0}
          style={{ ...buttonStyle, background: "#ef4444" }}
        >
          Export PDF
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: theme.spacing.xxl }}>
          <div>Loading...</div>
        </div>
      ) : salaries.length === 0 ? (
        <div style={{ textAlign: "center", padding: theme.spacing.xxl, color: theme.neutral.gray500 }}>
          <div>No salary data for {selectedMonth}/{selectedYear}</div>
        </div>
      ) : (
        <div style={{ backgroundColor: "white", borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <table style={tableStyle}>
            <thead style={{ backgroundColor: theme.colors.primary, color: "white" }}>
              <tr>
                <th style={{ ...thStyle, color: "white", borderBottom: "none" }}>👥 Nhân viên</th>
                <th style={{ ...thStyle, color: "white", borderBottom: "none" }}>🎫 Mã NV</th>
                <th style={{ ...thStyle, color: "white", borderBottom: "none", textAlign: "right" }}>💵 Lương cơ bản</th>
                <th style={{ ...thStyle, color: "white", borderBottom: "none", textAlign: "right" }}>📈 Thưởng</th>
                <th style={{ ...thStyle, color: "white", borderBottom: "none", textAlign: "right" }}>📉 Khấu trừ</th>
                <th style={{ ...thStyle, color: "white", borderBottom: "none", textAlign: "right" }}>💰 Thực nhận</th>
                <th style={{ ...thStyle, color: "white", borderBottom: "none", textAlign: "center" }}>📊 Trạng thái</th>
                <th style={{ ...thStyle, color: "white", borderBottom: "none", textAlign: "center" }}>⚙️ Thao tác</th>
              </tr>
            </thead>
          <tbody>
            {salaries.map(salary => {
              const statusBadge = getStatusBadge(salary.status);
              return (
                <tr key={salary.id}>
                  <td style={{ ...tdStyle, fontWeight: "bold" }}>{salary.User?.name || "N/A"}</td>
                  <td style={{ ...tdStyle, fontWeight: "bold" }}>{salary.User?.employeeCode || "N/A"}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{formatCurrency(salary.baseSalary)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#28a745" }}>+{formatCurrency(salary.bonus)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#dc3545" }}>-{formatCurrency(salary.deduction)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}><strong>{formatCurrency(salary.finalSalary)}</strong></td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
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
                          onClick={() => handleCalculateSalary(salary.User?.id)}
                          style={{ ...buttonStyle, background: theme.colors?.secondary || "#3b82f6", color: "#fff", padding: "6px 12px", fontSize: "12px", borderRadius: "4px" }}
                        >
                          Recalculate
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
        </div>
      )}
    </div>
  );
}

