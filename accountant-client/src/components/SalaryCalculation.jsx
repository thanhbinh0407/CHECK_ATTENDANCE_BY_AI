import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";
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
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
      max-height: 0;
    }
    to {
      opacity: 1;
      transform: translateY(0);
      max-height: 1000px;
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
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
  
  .fade-in-up {
    animation: fadeInUp 0.6s ease-out;
  }
  
  .fade-in {
    animation: fadeIn 0.4s ease-out;
  }
  
  .slide-down {
    animation: slideDown 0.4s ease-out;
  }
`;
if (!document.head.querySelector('style[data-salary-animation]')) {
  styleSheet.setAttribute('data-salary-animation', 'true');
  document.head.appendChild(styleSheet);
}

export default function SalaryCalculation() {
  const [employees, setEmployees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [calculatedSalaries, setCalculatedSalaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [toastPopup, setToastPopup] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [salaryBreakdown, setSalaryBreakdown] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [rules, setRules] = useState([]);
  const [calculatingProgress, setCalculatingProgress] = useState(0);

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
  const canApprove = currentRole === "manager" || currentRole === "supervisor";

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
    fetchEmployees();
    fetchRules();
  }, []);

  // Auto-load existing salary records whenever month or year changes
  useEffect(() => {
    fetchExistingSalaries(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const fetchExistingSalaries = async (month, year) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;
      const res = await fetch(
        `${apiBase}/api/salary?month=${month}&year=${year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setCalculatedSalaries(data.salaries || []);
      }
    } catch (error) {
      console.error("Error fetching existing salaries:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchRules = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/salary/rules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error("Error fetching rules:", error);
    }
  };

  const calculateSalaries = async () => {
    try {
      setLoading(true);
      setMessage("");
      setCalculatingProgress(0);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      if (employees.length === 0) {
        setMessage("No employees to calculate salary");
        return;
      }

      const calculatedSalariesList = [];
      let successCount = 0;
      let errorCount = 0;
      const totalEmployees = employees.length;

      // Calculate salary for each employee with progress
      for (let i = 0; i < employees.length; i++) {
        const employee = employees[i];
        try {
          setCalculatingProgress(Math.round(((i + 1) / totalEmployees) * 100));
          
          const res = await fetch(`${apiBase}/api/salary/calculate`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              userId: employee.id,
              month: selectedMonth,
              year: selectedYear
            })
          });

          const data = await res.json();
          if (res.ok && data.salary) {
            calculatedSalariesList.push(data.salary);
            successCount++;
          } else {
            errorCount++;
            console.error(`Error calculating salary for ${employee.name}:`, res.status, data);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error calculating salary for ${employee.name}:`, error);
        }
      }

      // Set the calculated salaries
      setCalculatedSalaries(calculatedSalariesList);
      
      // Try to reload from API to get full data with User associations
      // But if it fails, keep the calculated data
      try {
        const res = await fetch(
          `${apiBase}/api/salary?month=${selectedMonth}&year=${selectedYear}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.salaries && data.salaries.length > 0) {
            // Only update if API returns data
            setCalculatedSalaries(data.salaries);
          }
        }
      } catch (error) {
        // If reload fails, keep the initially calculated data
        console.warn("Could not reload from API, using calculated data instead:", error);
      }
      
      const successMsg = `Salary calculated for ${successCount} employee(s)${errorCount > 0 ? ` (${errorCount} error(s))` : ''}`;
      setToastPopup(successMsg);
      setTimeout(() => setToastPopup(""), 5000);
      setCalculatingProgress(0);
    } catch (error) {
      console.error("Error calculating salaries:", error);
      setMessage("Error: " + error.message);
      setCalculatingProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const viewSalaryBreakdown = (salary) => {
    setSalaryBreakdown(salary);
    const selected = employees.find(e => Number(e.id) === Number(salary.userId)) || salary.User || {};
    setSelectedEmployee(selected);
    setShowBreakdownModal(true);
  };

  const approveSalary = async (salaryId) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/salary/${salaryId}/approve`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (res.ok) {
        setToastPopup("Salary approved successfully");
        setTimeout(() => setToastPopup(""), 5000);
        calculateSalaries();
      }
    } catch (error) {
      console.error("Error approving salary:", error);
      setMessage("Error: " + error.message);
    }
  };


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
    color: theme.primary.main,
    display: "flex",
    alignItems: "center",
    gap: "12px",
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
    animation: "fadeInUp 0.5s ease-out 0.08s backwards",
  };

  const inputGroupStyle = {
    display: "flex",
    gap: "16px",
    alignItems: "flex-end",
    flexWrap: "wrap"
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
    transition: "border-color 0.2s",
  };

  const buttonPrimaryStyle = {
    padding: "12px 24px",
    background: theme.accent.main,
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: loading ? "not-allowed" : "pointer",
    transition: "background 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    opacity: loading ? 0.7 : 1,
  };

  const buttonSecondaryStyle = {
    padding: "12px 24px",
    backgroundColor: "#64748b",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
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

  const statusBadgeStyle = (status) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    backgroundColor:
      status === "paid"
        ? "#ccfbf1"
        : status === "approved"
        ? "#dbeafe"
        : "#fef3c7",
    color:
      status === "paid"
        ? "#0f766e"
        : status === "approved"
        ? "#1e40af"
        : "#92400e",
  });

  const emptyStateStyle = {
    padding: "48px 24px",
    textAlign: "center",
    color: "#64748b",
  };

  const emptyStateIconStyle = {
    fontSize: "48px",
    marginBottom: "16px",
    opacity: 0.6,
  };

  return (
    <div>
      {/* Hero Section */}
      <div style={heroSectionStyle}>
        <div style={heroTitleStyle}>
          <span style={{ fontSize: "28px" }} aria-hidden>💰</span>
          <span>Monthly Salary Calculation</span>
        </div>
        <p style={heroSubtitleStyle}>
          Calculate and manage employee salaries for the selected period
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
      {message && message.includes("Error") && (
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
            border: `1px solid ${message.includes("thành công") ? "#a7f3d0" : "#fecaca"}`,
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
        <div style={inputGroupStyle}>
          <div style={inputWrapperStyle}>
            <label style={labelStyle}>Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={{ ...inputStyle, cursor: "pointer" }}
              onFocus={(e) => { e.target.style.borderColor = theme.accent.main; }}
              onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString("en-US", { month: "long" })}
                </option>
              ))}
            </select>
          </div>

          <div style={inputWrapperStyle}>
            <label style={labelStyle}>Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{ ...inputStyle, cursor: "pointer" }}
              onFocus={(e) => { e.target.style.borderColor = theme.accent.main; }}
              onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; }}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={calculateSalaries}
            disabled={loading}
            style={buttonPrimaryStyle}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = theme.accent.hover;
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = theme.accent.main;
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: "18px",
                    height: "18px",
                    border: "3px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite"
                  }}
                />
                <span>Calculating... {calculatingProgress > 0 && `${calculatingProgress}%`}</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Calculate</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowRules(!showRules)}
            style={buttonSecondaryStyle}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#475569"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#64748b"; }}
          >
            {showRules ? "📋 Hide Rules" : "📋 Show Rules"}
          </button>
        </div>

        {/* Progress Bar */}
        {loading && calculatingProgress > 0 && (
          <div style={{ marginTop: "20px" }}>
            <div style={{
              width: "100%",
              height: "6px",
              backgroundColor: "#e2e8f0",
              borderRadius: "6px",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${calculatingProgress}%`,
                height: "100%",
                background: theme.accent.main,
                borderRadius: "6px",
                transition: "width 0.3s ease-out",
              }} />
            </div>
            <p style={{
              marginTop: "6px",
              fontSize: "13px",
              color: "#64748b",
              textAlign: "center",
              fontWeight: "500",
            }}>
              Processing {calculatingProgress}%...
            </p>
          </div>
        )}
      </div>

      {/* Rules Section */}
      {showRules && (
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #e2e8f0",
            animation: "slideDown 0.3s ease-out",
          }}
        >
          <h3 style={{
            color: theme.primary.main,
            marginTop: 0,
            marginBottom: "20px",
            fontSize: "18px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <span aria-hidden>📋</span>
            <span>Salary Calculation Rules</span>
          </h3>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px"
          }}>
            {/* Deductions */}
            <div>
              <h4 style={{
                color: "#ef4444",
                marginBottom: "16px",
                fontSize: "18px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>📉</span>
                <span>Deductions</span>
              </h4>
              {rules.filter(r => r.type === "deduction").length === 0 ? (
                <div style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "#9ca3af",
                  fontStyle: "italic",
                  backgroundColor: "#f9fafb",
                  borderRadius: "12px"
                }}>
                  No deduction rules
                </div>
              ) : (
                rules.filter(r => r.type === "deduction").map((rule, index) => (
                  <div
                    key={rule.id}
                    style={{
                      padding: "16px",
                      marginBottom: "10px",
                      backgroundColor: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderLeft: "4px solid #dc2626",
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "8px"
                    }}>
                      <div style={{
                        fontWeight: "700",
                        fontSize: "16px",
                        color: "#111827"
                      }}>
                        {rule.name}
                      </div>
                      <div style={{
                        padding: "4px 12px",
                        backgroundColor: "#fee2e2",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "#ef4444",
                        textTransform: "uppercase"
                      }}>
                        Deduction
                      </div>
                    </div>
                    <div style={{
                      fontSize: "15px",
                      color: "#374151",
                      marginBottom: "4px",
                      fontWeight: "600"
                    }}>
                      {rule.amountType === "percentage"
                        ? `${rule.amount}% of base salary`
                        : `₫${parseFloat(rule.amount).toLocaleString("vi-VN")}`}
                    </div>
                    {rule.description && (
                      <div style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        lineHeight: "1.5"
                      }}>
                        {rule.description}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Bonuses */}
            <div>
              <h4 style={{
                color: theme.accent.dark,
                marginBottom: "12px",
                fontSize: "15px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <span aria-hidden>📈</span>
                <span>Bonuses</span>
              </h4>
              {rules.filter(r => r.type === "bonus").length === 0 ? (
                <div style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "#9ca3af",
                  fontStyle: "italic",
                  backgroundColor: "#f9fafb",
                  borderRadius: "12px"
                }}>
                  No bonus rules
                </div>
              ) : (
                rules.filter(r => r.type === "bonus").map((rule, index) => (
                  <div
                    key={rule.id}
                    style={{
                      padding: "16px",
                      marginBottom: "10px",
                      backgroundColor: "#f0fdfa",
                      border: "1px solid #99f6e4",
                      borderLeft: "4px solid #0d9488",
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "8px"
                    }}>
                      <div style={{
                        fontWeight: "700",
                        fontSize: "16px",
                        color: "#111827"
                      }}>
                        {rule.name}
                      </div>
                      <div style={{
                        padding: "4px 12px",
                        backgroundColor: theme.accent.light,
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: "700",
                        color: theme.accent.dark,
                        textTransform: "uppercase"
                      }}>
                        Bonus
                      </div>
                    </div>
                    <div style={{
                      fontSize: "15px",
                      color: "#374151",
                      marginBottom: "4px",
                      fontWeight: "600"
                    }}>
                      {rule.amountType === "percentage"
                        ? `${rule.amount}% of base salary`
                        : `₫${parseFloat(rule.amount).toLocaleString("vi-VN")}`}
                    </div>
                    {rule.description && (
                      <div style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        lineHeight: "1.5"
                      }}>
                        {rule.description}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{
            marginTop: "20px",
            padding: "14px",
            backgroundColor: "#fffbeb",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#92400e",
            border: "1px solid #fde68a",
          }}>
            <strong>Note:</strong> These rules are set by company policy. Contact system administrator to change.
          </div>
        </div>
      )}

      {/* Salary Table */}
      <div style={tableContainerStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={tableHeaderStyle}>
            <tr>
              <th style={{ ...thStyle, width: "10%" }}>Emp. ID</th>
              <th style={{ ...thStyle, width: "18%" }}>Employee Name</th>
              <th style={{ ...thStyle, width: "12%" }}>Department</th>
              <th style={{ ...thStyle, width: "12%", textAlign: "right" }}>Base Salary</th>
              <th style={{ ...thStyle, width: "12%", textAlign: "right" }}>Bonus</th>
              <th style={{ ...thStyle, width: "12%", textAlign: "right" }}>Deduction</th>
              <th style={{ ...thStyle, width: "12%", textAlign: "right" }}>Net Salary</th>
              <th style={{ ...thStyle, width: "10%", textAlign: "center" }}>Status</th>
              <th style={{ ...thStyle, width: "12%", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {calculatedSalaries.length === 0 ? (
              <tr>
                <td colSpan="9" style={emptyStateStyle}>
                  <div style={emptyStateIconStyle}>📊</div>
                  <h3 style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#334155",
                    margin: "0 0 6px 0",
                  }}>
                    No salary records
                  </h3>
                  <p style={{
                    fontSize: "14px",
                    color: "#64748b",
                    margin: 0,
                  }}>
                    No data for this period. Click "Calculate" to generate salaries.
                  </p>
                </td>
              </tr>
            ) : (
              [...calculatedSalaries]
                .sort((a, b) => {
                  const order = { paid: 0, approved: 1, pending: 2 };
                  return (order[a.status] ?? 2) - (order[b.status] ?? 2);
                })
                .map((salary, index) => {
                  const employee = employees.find(e => e.id === salary.userId) || salary.User || {};
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
                      <td style={{ ...tdStyle, fontWeight: "600", color: theme.accent.dark }}>
                        {employee?.employeeCode || "N/A"}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: "600" }}>
                        {employee?.name || "N/A"}
                      </td>
                      <td style={tdStyle}>
                        {employee?.Department?.name || employee?.department || "N/A"}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600" }}>
                        ₫{salary.baseSalary?.toLocaleString("vi-VN") || "0"}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: theme.accent.dark, fontWeight: "600" }}>
                        +₫{(salary.bonus || 0).toLocaleString("vi-VN")}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "#ef4444", fontWeight: "600" }}>
                        -₫{(salary.deduction || 0).toLocaleString("vi-VN")}
                      </td>
                      <td style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: "700",
                        fontSize: "15px",
                        color: theme.accent.dark,
                      }}>
                        ₫{salary.finalSalary?.toLocaleString("vi-VN") || "0"}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <span style={statusBadgeStyle(salary.status)}>
                          {salary.status === "paid"
                            ? "Paid"
                            : salary.status === "approved"
                            ? "Approved"
                            : "Pending"}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <button
                            onClick={() => viewSalaryBreakdown(salary)}
                            style={{
                              padding: "8px 14px",
                              background: theme.accent.main,
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "13px",
                              fontWeight: "600",
                              transition: "background 0.2s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = theme.accent.hover; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = theme.accent.main; }}
                          >
                            Details
                          </button>
                          {salary.status !== "paid" &&
                            salary.status !== "approved" &&
                            canApprove && (
                            <button
                              onClick={() => approveSalary(salary.id)}
                              style={{
                                padding: "8px 14px",
                                background: "#059669",
                                color: "#fff",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: "600",
                                transition: "background 0.2s",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "#047857"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "#059669"; }}
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>

      {/* Salary Breakdown Modal */}
      {showBreakdownModal && salaryBreakdown && selectedEmployee && (
        <SalaryBreakdownModal
          salary={salaryBreakdown}
          employee={selectedEmployee}
          rules={rules}
          onClose={() => {
            setShowBreakdownModal(false);
            setSalaryBreakdown(null);
            setSelectedEmployee(null);
          }}
          onUpdate={(updatedSalary) => {
            setSalaryBreakdown(updatedSalary);
            setCalculatedSalaries(
              calculatedSalaries.map(s => s.id === updatedSalary.id ? updatedSalary : s)
            );
          }}
        />
      )}
    </div>
  );
}
