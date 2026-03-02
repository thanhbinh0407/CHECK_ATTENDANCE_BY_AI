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

      setCalculatedSalaries(calculatedSalariesList);
      // Reload from API to get full data with User associations
      await fetchExistingSalaries(selectedMonth, selectedYear);
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
    setSelectedEmployee(employees.find(e => e.id === salary.userId));
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
    background: "linear-gradient(135deg, #3b82f6 0%, #ec4899 50%, #f472b6 100%)",
    backgroundSize: "200% 200%",
    borderRadius: "24px",
    padding: "48px 40px",
    marginBottom: "32px",
    color: "#fff",
    boxShadow: "0 20px 80px rgba(59, 130, 246, 0.4), 0 0 100px rgba(236, 72, 153, 0.3)",
    position: "relative",
    overflow: "hidden",
    animation: "fadeInUp 0.6s ease-out, gradientShift 10s ease infinite"
  };

  const heroTitleStyle = {
    fontSize: "42px",
    fontWeight: "800",
    margin: "0 0 12px 0",
    letterSpacing: "-0.02em",
    display: "flex",
    alignItems: "center",
    gap: "16px"
  };

  const heroSubtitleStyle = {
    fontSize: "18px",
    opacity: 0.95,
    fontWeight: "400",
    margin: 0
  };

  const controlCardStyle = {
    backgroundColor: "#fff",
    borderRadius: "20px",
    padding: "32px",
    marginBottom: "32px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "1px solid rgba(0,0,0,0.05)",
    animation: "fadeInUp 0.7s ease-out 0.1s backwards"
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
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    letterSpacing: "0.01em"
  };

  const inputStyle = {
    padding: "14px 18px",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "500",
    color: "#111827",
    backgroundColor: "#fff",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box"
  };

  const buttonPrimaryStyle = {
    padding: "14px 32px",
    background: "linear-gradient(135deg, #3b82f6, #ec4899)",
    backgroundColor: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: loading ? "not-allowed" : "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: loading ? "none" : "0 4px 20px rgba(59, 130, 246, 0.5), 0 0 30px rgba(236, 72, 153, 0.3)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    opacity: loading ? 0.7 : 1,
    position: "relative",
    overflow: "hidden"
  };

  const buttonSecondaryStyle = {
    padding: "14px 32px",
    backgroundColor: "#6b7280",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 4px 14px rgba(107, 114, 128, 0.3)"
  };

  const tableContainerStyle = {
    backgroundColor: "#fff",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "1px solid rgba(0,0,0,0.05)",
    animation: "fadeInUp 0.8s ease-out 0.2s backwards"
  };

  const tableHeaderStyle = {
    background: "linear-gradient(135deg, #3b82f6 0%, #ec4899 50%, #f472b6 100%)",
    backgroundSize: "200% 200%",
    color: "#fff",
    animation: "gradientShift 8s ease infinite"
  };

  const thStyle = {
    padding: "20px 24px",
    textAlign: "left",
    fontWeight: "700",
    fontSize: "14px",
    letterSpacing: "0.05em",
    textTransform: "uppercase"
  };

  const tdStyle = {
    padding: "20px 24px",
    borderBottom: "1px solid #f3f4f6",
    fontSize: "15px",
    color: "#374151"
  };

  const statusBadgeStyle = (status) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    backgroundColor:
      status === "paid"
        ? "#d1fae5"
        : status === "approved"
        ? "#dbeafe"
        : "#fef3c7",
    color:
      status === "paid"
        ? "#065f46"
        : status === "approved"
        ? "#1e40af"
        : "#92400e",
    transition: "all 0.2s"
  });

  const emptyStateStyle = {
    padding: "80px 40px",
    textAlign: "center",
    color: "#9ca3af"
  };

  const emptyStateIconStyle = {
    fontSize: "80px",
    marginBottom: "24px",
    opacity: 0.5,
    animation: "pulse 2s infinite"
  };

  return (
    <div>
      {/* Hero Section */}
      <div style={heroSectionStyle}>
        <div style={heroTitleStyle}>
          <span style={{ fontSize: "48px" }}>💰</span>
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
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "16px 32px",
            backgroundColor: "#059669",
            color: "#fff",
            borderRadius: "16px",
            boxShadow: "0 20px 60px rgba(5, 150, 105, 0.4)",
            fontWeight: "600",
            fontSize: "15px",
            zIndex: 10000,
            animation: "slideInRight 0.4s ease-out",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <span style={{ fontSize: "20px" }}>✅</span>
          {toastPopup}
        </div>
      )}

      {/* Error Message */}
      {message && message.includes("Error") && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            right: "20px",
            padding: "20px 24px",
            backgroundColor: message.includes("thành công") ? "#d1fae5" : "#fee2e2",
            color: message.includes("thành công") ? "#065f46" : "#991b1b",
            borderRadius: "16px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
            zIndex: 9999,
            minWidth: "320px",
            maxWidth: "400px",
            animation: "slideInRight 0.4s ease-out",
            border: `2px solid ${message.includes("thành công") ? "#3b82f6" : "#ef4444"}`
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "24px" }}>
              {message.includes("thành công") ? "✅" : "❌"}
            </span>
            <span style={{ flex: 1, fontWeight: "600" }}>{message}</span>
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
              style={{
                ...inputStyle,
                cursor: "pointer"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3b82f6";
                e.target.style.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.2), 0 0 0 8px rgba(236, 72, 153, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e5e7eb";
                e.target.style.boxShadow = "none";
              }}
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
              style={{
                ...inputStyle,
                cursor: "pointer"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3b82f6";
                e.target.style.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.2), 0 0 0 8px rgba(236, 72, 153, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e5e7eb";
                e.target.style.boxShadow = "none";
              }}
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
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(59, 130, 246, 0.6), 0 0 40px rgba(236, 72, 153, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(59, 130, 246, 0.5), 0 0 30px rgba(236, 72, 153, 0.3)";
              }
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
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(107, 114, 128, 0.4)";
              e.currentTarget.style.backgroundColor = "#4b5563";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(107, 114, 128, 0.3)";
              e.currentTarget.style.backgroundColor = "#6b7280";
            }}
          >
            {showRules ? "📋 Hide Rules" : "📋 Show Rules"}
          </button>
        </div>

        {/* Progress Bar */}
        {loading && calculatingProgress > 0 && (
          <div style={{ marginTop: "24px" }}>
            <div style={{
              width: "100%",
              height: "8px",
              backgroundColor: "#e5e7eb",
              borderRadius: "10px",
              overflow: "hidden"
            }}>
              <div style={{
                width: `${calculatingProgress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #3b82f6, #ec4899)",
                borderRadius: "10px",
                transition: "width 0.3s ease-out",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)"
              }} />
            </div>
            <p style={{
              marginTop: "8px",
              fontSize: "13px",
              color: "#6b7280",
              textAlign: "center",
              fontWeight: "500"
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
            borderRadius: "20px",
            padding: "32px",
            marginBottom: "32px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.05)",
            animation: "slideDown 0.4s ease-out"
          }}
        >
          <h3 style={{
            color: theme.primary.main,
            marginTop: 0,
            marginBottom: "24px",
            fontSize: "24px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <span>📋</span>
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
                      padding: "20px",
                      marginBottom: "12px",
                      backgroundColor: "#fef2f2",
                      borderLeft: "4px solid #ef4444",
                      borderRadius: "12px",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: "0 2px 8px rgba(239, 68, 68, 0.1)",
                      animation: `fadeInUp 0.5s ease-out ${index * 0.1}s backwards`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateX(4px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateX(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(239, 68, 68, 0.1)";
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
                        color: "#ec4899",
                marginBottom: "16px",
                fontSize: "18px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>📈</span>
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
                      padding: "20px",
                      marginBottom: "12px",
                      backgroundColor: "#f0fdf4",
                      borderLeft: "4px solid #3b82f6",
                      borderRadius: "12px",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: "0 2px 8px rgba(16, 185, 129, 0.1)",
                      animation: `fadeInUp 0.5s ease-out ${index * 0.1}s backwards`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateX(4px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateX(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.1)";
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
                        backgroundColor: "#d1fae5",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "#3b82f6",
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
            marginTop: "24px",
            padding: "16px",
            backgroundColor: "#fffbeb",
            borderRadius: "12px",
            fontSize: "14px",
            color: "#92400e",
            border: "1px solid #fef3c7"
          }}>
            <strong>⚠️ Note:</strong> These rules are set by company policy. Contact system administrator to change.
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
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#374151",
                    margin: "0 0 8px 0"
                  }}>
                    No salary records
                  </h3>
                  <p style={{
                    fontSize: "16px",
                    color: "#6b7280",
                    margin: 0
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
                        borderBottom: "1px solid #f3f4f6",
                        backgroundColor: salary.status === "paid" ? "#f0fdf4" : "white",
                        transition: "all 0.2s",
                        animation: `fadeInUp 0.5s ease-out ${index * 0.05}s backwards`
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f9fafb";
                        e.currentTarget.style.transform = "scale(1.01)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = salary.status === "paid" ? "#f0fdf4" : "white";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      <td style={{ ...tdStyle, fontWeight: "700", color: "#3b82f6" }}>
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
                      <td style={{ ...tdStyle, textAlign: "right", color: "#3b82f6", fontWeight: "600" }}>
                        +₫{(salary.bonus || 0).toLocaleString("vi-VN")}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "#ef4444", fontWeight: "600" }}>
                        -₫{(salary.deduction || 0).toLocaleString("vi-VN")}
                      </td>
                      <td style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: "700",
                        fontSize: "16px",
                        color: "#3b82f6"
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
                              padding: "8px 16px",
                              background: "linear-gradient(135deg, #3b82f6, #ec4899)",
                              backgroundColor: "#3b82f6",
                              color: "#fff",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "13px",
                              fontWeight: "600",
                              transition: "all 0.2s",
                              boxShadow: "0 2px 12px rgba(59, 130, 246, 0.4), 0 0 20px rgba(236, 72, 153, 0.2)"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateY(-2px)";
                              e.currentTarget.style.boxShadow = "0 4px 20px rgba(59, 130, 246, 0.5), 0 0 30px rgba(236, 72, 153, 0.3)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow = "0 2px 12px rgba(59, 130, 246, 0.4), 0 0 20px rgba(236, 72, 153, 0.2)";
                            }}
                          >
                            Details
                          </button>
                          {salary.status !== "paid" && salary.status !== "approved" && (
                            <button
                              onClick={() => approveSalary(salary.id)}
                              style={{
                                padding: "8px 16px",
                                background: "linear-gradient(135deg, #3b82f6, #ec4899)",
                                backgroundColor: "#3b82f6",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: "600",
                                transition: "all 0.2s",
                                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.4)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.3)";
                              }}
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
