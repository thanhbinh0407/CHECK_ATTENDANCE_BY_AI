import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";
import { exportSalariesToExcel, exportSalariesToPDF } from "../utils/exportUtils.js";

export default function SalaryManagement() {
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [toastPopup, setToastPopup] = useState("");
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
    <div style={{ padding: "20px", backgroundColor: theme.colors?.light || theme.neutral.gray50, minHeight: "100%" }}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "700", color: theme.colors?.primary || theme.primary?.main }}>
            Salary Management
          </h1>
          <p style={{ margin: `${theme.spacing.sm} 0 0 0`, color: theme.neutral.gray600, fontSize: "14px" }}>
            Manage and calculate employee salaries by month
          </p>
        </div>

      {message && !toastPopup && (
        <div style={{
          padding: theme.spacing.md,
          background: message.includes("success") ? "#d4edda" : "#f8d7da",
          border: `1px solid ${message.includes("success") ? "#c3e6cb" : "#f5c6cb"}`,
          borderRadius: theme.radius.md,
          color: message.includes("success") ? "#155724" : "#721c24",
          marginBottom: theme.spacing.lg,
        }}>
          {message}
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
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead style={{ backgroundColor: "#1e293b", color: "#fff" }}>
              <tr>
                <th style={thStyle}>Employee</th>
                <th style={thStyle}>Emp. ID</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Base Salary</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Bonus</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Deduction</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Net Pay</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Status</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...salaries]
                .sort((a, b) => {
                  const order = { paid: 0, approved: 1, pending: 2 };
                  return (order[a.status] ?? 2) - (order[b.status] ?? 2);
                })
                .map(salary => {
                const statusBadge = getStatusBadge(salary.status);
                return (
                  <tr
                    key={salary.id}
                    style={{
                      backgroundColor: salary.status === "paid" ? "#f0fdf4" : theme.neutral.white,
                      borderBottom: `1px solid ${theme.neutral.gray200}`,
                    }}
                  >
                    <td style={tdStyle}>{salary.User?.name || "N/A"}</td>
                    <td style={tdStyle}><strong>{salary.User?.employeeCode || "N/A"}</strong></td>
                    <td style={tdStyle}>{formatCurrency(salary.baseSalary)}</td>
                    <td style={{ ...tdStyle, color: "#16a34a", fontWeight: "500" }}>{formatCurrency(salary.bonus)}</td>
                    <td style={{ ...tdStyle, color: "#dc2626", fontWeight: "500" }}>{formatCurrency(salary.deduction)}</td>
                    <td style={tdStyle}><strong>{formatCurrency(salary.finalSalary)}</strong></td>
                    <td style={tdStyle}>
                      <span style={{
                        ...statusBadge.style,
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        display: "inline-block",
                      }}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: theme.spacing.sm, flexWrap: "wrap" }}>
                        {salary.status === "pending" && (
                          <button
                            onClick={() => handleUpdateStatus(salary.id, "approved")}
                            style={{ ...buttonStyle, background: "#28a745", color: "#fff", padding: "6px 12px", fontSize: "12px", borderRadius: "4px" }}
                          >
                            Approve
                          </button>
                        )}
                        {salary.status === "approved" && (
                          <button
                            onClick={() => handleUpdateStatus(salary.id, "paid")}
                            style={{ ...buttonStyle, background: "#28a745", color: "#fff", padding: "6px 12px", fontSize: "12px", borderRadius: "4px" }}
                          >
                            Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() => handleCalculateSalary(salary.User?.id)}
                          style={{ ...buttonStyle, background: theme.colors?.secondary || "#3b82f6", color: "#fff", padding: "6px 12px", fontSize: "12px", borderRadius: "4px" }}
                        >
                          Recalculate
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
    </div>
  );
}

