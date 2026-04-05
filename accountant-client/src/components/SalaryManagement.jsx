import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";
import { exportSalariesToExcel, exportSalariesToPDF } from "../utils/exportUtils.js";
import SalaryBreakdownModal from "./SalaryBreakdownModal.jsx";

// Add keyframe animations
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
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes gradientShift {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
`;
if (!document.head.querySelector('style[data-salary-mgmt-animation]')) {
  styleSheet.setAttribute('data-salary-mgmt-animation', 'true');
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
  const [rules, setRules] = useState([]);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [salaryBreakdown, setSalaryBreakdown] = useState(null);
  const [selectedEmployeeForModal, setSelectedEmployeeForModal] = useState(null);

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const currentRole = (() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      const u = JSON.parse(raw);
      return u?.role || null;
    } catch {
      return null;
    }
  })();

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

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;
        const res = await fetch(`${apiBase}/api/salary/rules`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setRules(data.rules || []);
        }
      } catch (e) {
        console.error("Error fetching salary rules:", e);
      }
    };
    fetchRules();
  }, []);

  const formatSalaryRowDate = (salary) => {
    const raw = salary.calculatedAt || salary.updatedAt || salary.createdAt;
    if (raw) {
      return new Date(raw).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
    const y = Number(salary.year);
    const m = Number(salary.month);
    if (Number.isFinite(y) && Number.isFinite(m)) {
      const end = new Date(y, m, 0);
      return end.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
    return "—";
  };

  const viewSalaryBreakdown = (salary) => {
    setSalaryBreakdown(salary);
    const selected =
      employees.find((e) => Number(e.id) === Number(salary.userId)) ||
      salary.User ||
      {};
    setSelectedEmployeeForModal(selected);
    setShowBreakdownModal(true);
  };

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

  const handleMarkPaid = async (salaryId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/salary/${salaryId}/mark-paid`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ notes: "Marked as paid by Accountant" })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("");
        setToastPopup("Paid successfully!");
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

  /** Tính lại lương cho toàn bộ nhân viên theo tháng/năm đang chọn (toolbar). */
  const handleRecalculateAllForMonth = async () => {
    if (employees.length === 0) {
      setMessage("No employees to recalculate");
      return;
    }
    try {
      setLoading(true);
      setMessage("");
      const token = localStorage.getItem("authToken");
      if (!token) return;

      let ok = 0;
      let fail = 0;
      for (const employee of employees) {
        try {
          const res = await fetch(`${apiBase}/api/salary/calculate`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: employee.id,
              month: selectedMonth,
              year: selectedYear,
            }),
          });
          if (res.ok) ok += 1;
          else fail += 1;
        } catch {
          fail += 1;
        }
      }

      await fetchSalaries();
      setToastPopup(
        `Recalculate: ${ok} OK${fail ? `, ${fail} failed` : ""} (${selectedMonth}/${selectedYear})`
      );
      setTimeout(() => setToastPopup(""), 6000);
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount ?? 0) + " ₫";
  };

  /** Net hiển thị: ưu tiên DB; nếu DB còn 0 (bản ghi cũ clamp) mà gross − deduction < 0 thì hiện âm đúng. */
  const displayNetSalary = (s) => {
    const stored = Number(s.finalSalary);
    const g = parseFloat(s.grossSalary ?? 0);
    const d = parseFloat(s.deduction ?? 0);
    const recomputed = parseFloat((g - d).toFixed(2));
    if (Math.abs(stored) < 0.005 && recomputed < 0) return recomputed;
    return Number.isFinite(stored) ? stored : recomputed;
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { background: "#fef3c7", color: "#92400e" },
      approved: { background: "#dbeafe", color: "#1e40af" },
      paid: { background: theme.accent.light, color: theme.accent.dark }
    };
    const labels = {
      pending: "Pending",
      approved: "Approved",
      paid: "Paid"
    };
    return { style: styles[status] || styles.pending, label: labels[status] || status };
  };

  // Layout & cards
  const heroSectionStyle = {
    background: "#fff",
    borderRadius: "12px",
    padding: "28px 32px",
    marginBottom: "24px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    animation: "fadeInUp 0.5s ease-out",
  };

  const heroTitleStyle = {
    fontSize: "24px",
    fontWeight: "700",
    margin: "0 0 8px 0",
    letterSpacing: "-0.02em",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: theme.primary.main,
  };

  const heroSubtitleStyle = {
    fontSize: "15px",
    color: "#64748b",
    fontWeight: "400",
    margin: 0,
  };

  const controlCardStyle = {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0",
  };

  const inputWrapperStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: "140px"
  };

  const labelStyle = {
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
  };

  const inputStyle = {
    padding: "10px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "15px",
    color: theme.primary.main,
    backgroundColor: "#fff",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    cursor: "pointer",
    transition: "border-color 0.2s",
  };

  const buttonStyle = {
    padding: "12px 24px",
    background: theme.accent.main,
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const tableContainerStyle = {
    backgroundColor: "#fff",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0",
    animation: "fadeInUp 0.5s ease-out 0.15s backwards",
  };

  const tableHeaderStyle = {
    background: "#f1f5f9",
    color: "#475569",
  };

  const thStyle = {
    padding: "14px 20px",
    textAlign: "left",
    fontWeight: "600",
    fontSize: "12px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };

  const tdStyle = {
    padding: "14px 20px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "14px",
    color: "#334155",
  };

  const emptyStateStyle = {
    padding: "48px 24px",
    textAlign: "center",
    color: "#64748b",
  };

  return (
    <div>
      {/* Hero Section */}
      <div style={heroSectionStyle}>
        <div style={heroTitleStyle}>
          <span style={{ fontSize: "28px" }} aria-hidden>📊</span>
          <span>Salary Management</span>
        </div>
        <p style={heroSubtitleStyle}>
          Manage and view employee salaries by month
        </p>
      </div>

      {/* Toast Notification */}
      {toastPopup && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "12px 24px",
            backgroundColor: theme.accent.dark,
            color: "#fff",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            fontWeight: "600",
            fontSize: "14px",
            zIndex: 10000,
            animation: "slideInRight 0.3s ease-out",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span aria-hidden style={{ fontSize: "18px" }}>✅</span>
          {toastPopup}
        </div>
      )}

      {/* Error Message */}
      {message && !toastPopup && (
        <div
          style={{
            position: "fixed",
            top: "72px",
            right: "20px",
            padding: "14px 20px",
            backgroundColor: message.includes("thành công") ? "#ecfdf5" : "#fef2f2",
            color: message.includes("thành công") ? "#065f46" : "#991b1b",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 9999,
            minWidth: "280px",
            maxWidth: "360px",
            animation: "slideInRight 0.3s ease-out",
            border: `1px solid ${message.includes("thành công") ? "#a7f3d0" : "#fecaca"}`
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span aria-hidden style={{ fontSize: "18px" }}>
              {message.includes("thành công") ? "✅" : "❌"}
            </span>
            <span style={{ flex: 1, fontWeight: "600", fontSize: "14px" }}>{message}</span>
          </div>
        </div>
      )}

      {/* Control Card */}
      <div style={controlCardStyle}>
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={inputWrapperStyle}>
            <label style={labelStyle}>Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = theme.accent.main;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
              }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
              <option key={m} value={m}>Month {m}</option>
            ))}
          </select>
        </div>

          <div style={inputWrapperStyle}>
            <label style={labelStyle}>Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = theme.accent.main;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
              }}
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => exportSalariesToExcel(salaries, `bang-luong-${selectedMonth}-${selectedYear}`)}
          disabled={salaries.length === 0}
            style={{
              ...buttonStyle,
              opacity: salaries.length === 0 ? 0.5 : 1,
              cursor: salaries.length === 0 ? "not-allowed" : "pointer"
            }}
            onMouseEnter={(e) => {
              if (salaries.length > 0) {
                e.currentTarget.style.background = theme.accent.hover;
              }
            }}
            onMouseLeave={(e) => {
              if (salaries.length > 0) {
                e.currentTarget.style.background = theme.accent.main;
              }
            }}
          >
            <span>📥</span>
            <span>Export Excel</span>
        </button>

        <button
          onClick={() => exportSalariesToPDF(salaries, `bang-luong-${selectedMonth}-${selectedYear}`)}
          disabled={salaries.length === 0}
            style={{
              ...buttonStyle,
              background: "#b91c1c",
              opacity: salaries.length === 0 ? 0.5 : 1,
              cursor: salaries.length === 0 ? "not-allowed" : "pointer"
            }}
            onMouseEnter={(e) => {
              if (salaries.length > 0) {
                e.currentTarget.style.background = "#991b1b";
              }
            }}
            onMouseLeave={(e) => {
              if (salaries.length > 0) {
                e.currentTarget.style.background = "#b91c1c";
              }
            }}
          >
            <span>📄</span>
            <span>Export PDF</span>
        </button>

        <button
          type="button"
          onClick={handleRecalculateAllForMonth}
          disabled={loading || employees.length === 0}
          style={{
            ...buttonStyle,
            background: "#2563eb",
            opacity: loading || employees.length === 0 ? 0.5 : 1,
            cursor: loading || employees.length === 0 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
          onMouseEnter={(e) => {
            if (!loading && employees.length > 0) {
              e.currentTarget.style.background = "#1d4ed8";
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && employees.length > 0) {
              e.currentTarget.style.background = "#2563eb";
            }
          }}
        >
          <span aria-hidden>🔄</span>
          <span>Recalculate</span>
        </button>
        </div>
      </div>

      {/* Salary Table */}
      {loading ? (
        <div style={{ ...emptyStateStyle, animation: "fadeInUp 0.5s ease-out" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>⏳</div>
          <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#334155", margin: "0 0 6px 0" }}>
            Loading...
          </h3>
        </div>
      ) : salaries.length === 0 ? (
        <div style={tableContainerStyle}>
          <div style={emptyStateStyle}>
            <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.6 }}>📊</div>
            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#334155", margin: "0 0 6px 0" }}>
              No salary data
            </h3>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
              No salary data for {selectedMonth}/{selectedYear}
            </p>
          </div>
        </div>
      ) : (
        <div style={tableContainerStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={tableHeaderStyle}>
              <tr>
                <th style={{ ...thStyle }}>Employee</th>
                <th style={{ ...thStyle }}>Emp. ID</th>
                <th style={{ ...thStyle }}>Date</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Base Salary</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Bonus</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Deduction</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Net Salary</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Status</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
          <tbody>
              {salaries.map((salary, index) => {
              const statusBadge = getStatusBadge(salary.status);
              return (
                  <tr
                    key={salary.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: salary.status === "paid" ? "#f0fdfa" : "#fff",
                      animation: `fadeInUp 0.35s ease-out ${Math.min(index * 0.04, 0.6)}s backwards`,
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = salary.status === "paid" ? "#ccfbf1" : "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = salary.status === "paid" ? "#f0fdfa" : "#fff";
                    }}
                  >
                    <td style={{ ...tdStyle, fontWeight: "600" }}>{salary.User?.name || "N/A"}</td>
                    <td style={{ ...tdStyle, fontWeight: "600", color: theme.accent.dark }}>{salary.User?.employeeCode || "N/A"}</td>
                    <td style={{ ...tdStyle, color: "#64748b", fontSize: "13px" }}>{formatSalaryRowDate(salary)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600" }}>{formatCurrency(salary.baseSalary)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", color: theme.accent.dark, fontWeight: "600" }}>+{formatCurrency(salary.bonus)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", color: "#ef4444", fontWeight: "600" }}>-{formatCurrency(salary.deduction)}</td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: "700",
                        fontSize: "15px",
                        color: displayNetSalary(salary) < 0 ? "#b91c1c" : theme.accent.dark,
                      }}
                    >
                      {formatCurrency(displayNetSalary(salary))}
                    </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span style={{
                      ...statusBadge.style,
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                    }}>
                      {statusBadge.label}
                    </span>
                  </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => viewSalaryBreakdown(salary)}
                          style={{
                            padding: "8px 14px",
                            background: "#b91c1c",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600",
                            transition: "background 0.2s",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#991b1b";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#b91c1c";
                          }}
                        >
                          <span aria-hidden>📄</span>
                          Detail
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCalculateSalary(salary.User?.id)}
                          style={{
                            padding: "8px 14px",
                            backgroundColor: "#64748b",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#475569";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#64748b";
                          }}
                        >
                          Recalculate
                        </button>
                        {salary.status === "approved" && currentRole === "accountant" && (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(salary.id)}
                            style={{
                              padding: "8px 14px",
                              background: theme.accent.main,
                              color: "#fff",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "13px",
                              fontWeight: "600",
                              transition: "background 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = theme.accent.hover;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = theme.accent.main;
                            }}
                          >
                            Thanh toán
                          </button>
                        )}
                      </div>
                    </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}

      {showBreakdownModal && salaryBreakdown && selectedEmployeeForModal && (
        <SalaryBreakdownModal
          salary={salaryBreakdown}
          employee={selectedEmployeeForModal}
          rules={rules}
          onClose={() => {
            setShowBreakdownModal(false);
            setSalaryBreakdown(null);
            setSelectedEmployeeForModal(null);
          }}
          onUpdate={(updatedSalary) => {
            setSalaryBreakdown(updatedSalary);
            setSalaries((prev) =>
              prev.map((s) => (s.id === updatedSalary.id ? updatedSalary : s))
            );
          }}
        />
      )}
    </div>
  );
}
