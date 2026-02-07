import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";
import { exportSalariesToExcel, exportSalariesToPDF } from "../utils/exportUtils.js";

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
      pending: { background: "#fef3c7", color: "#92400e" },
      approved: { background: "#dbeafe", color: "#1e40af" },
      paid: { background: "#d1fae5", color: "#065f46" }
    };
    const labels = {
      pending: "Pending",
      approved: "Approved",
      paid: "Paid"
    };
    return { style: styles[status] || styles.pending, label: labels[status] || status };
  };

  // Modern Styles
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
    boxSizing: "border-box",
    cursor: "pointer"
  };

  const buttonStyle = {
    padding: "14px 32px",
    background: "linear-gradient(135deg, #3b82f6, #ec4899)",
    backgroundColor: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 4px 20px rgba(59, 130, 246, 0.5), 0 0 30px rgba(236, 72, 153, 0.3)",
    display: "flex",
    alignItems: "center",
    gap: "8px"
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

  const emptyStateStyle = {
    padding: "80px 40px",
    textAlign: "center",
    color: "#9ca3af"
  };

  return (
    <div>
      {/* Hero Section */}
      <div style={heroSectionStyle}>
        <div style={heroTitleStyle}>
          <span style={{ fontSize: "48px" }}>📊</span>
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
      {message && !toastPopup && (
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
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={inputWrapperStyle}>
            <label style={labelStyle}>Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = "#3b82f6";
                e.target.style.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.2), 0 0 0 8px rgba(236, 72, 153, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e5e7eb";
                e.target.style.boxShadow = "none";
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
                e.target.style.borderColor = "#3b82f6";
                e.target.style.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.2), 0 0 0 8px rgba(236, 72, 153, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e5e7eb";
                e.target.style.boxShadow = "none";
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
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(59, 130, 246, 0.6), 0 0 40px rgba(236, 72, 153, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (salaries.length > 0) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(59, 130, 246, 0.5), 0 0 30px rgba(236, 72, 153, 0.3)";
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
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              backgroundColor: "#ef4444",
              boxShadow: "0 4px 20px rgba(239, 68, 68, 0.5), 0 0 30px rgba(220, 38, 38, 0.3)",
              opacity: salaries.length === 0 ? 0.5 : 1,
              cursor: salaries.length === 0 ? "not-allowed" : "pointer"
            }}
            onMouseEnter={(e) => {
              if (salaries.length > 0) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(239, 68, 68, 0.6), 0 0 40px rgba(220, 38, 38, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (salaries.length > 0) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(239, 68, 68, 0.5), 0 0 30px rgba(220, 38, 38, 0.3)";
              }
            }}
          >
            <span>📄</span>
            <span>Export PDF</span>
        </button>
        </div>
      </div>

      {/* Salary Table */}
      {loading ? (
        <div style={{ ...emptyStateStyle, animation: "fadeInUp 0.5s ease-out" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
          <h3 style={{ fontSize: "24px", fontWeight: "700", color: "#374151", margin: "0 0 8px 0" }}>
            Loading...
          </h3>
        </div>
      ) : salaries.length === 0 ? (
        <div style={tableContainerStyle}>
          <div style={emptyStateStyle}>
            <div style={{ fontSize: "80px", marginBottom: "24px", opacity: 0.5 }}>📊</div>
            <h3 style={{ fontSize: "24px", fontWeight: "700", color: "#374151", margin: "0 0 8px 0" }}>
              No salary data
            </h3>
            <p style={{ fontSize: "16px", color: "#6b7280", margin: 0 }}>
              No salary data for {selectedMonth}/{selectedYear}
            </p>
          </div>
        </div>
      ) : (
        <div style={tableContainerStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={tableHeaderStyle}>
              <tr>
                <th style={{ ...thStyle }}>👥 Employee</th>
                <th style={{ ...thStyle }}>🎫 Emp. ID</th>
                <th style={{ ...thStyle, textAlign: "right" }}>💵 Base Salary</th>
                <th style={{ ...thStyle, textAlign: "right" }}>📈 Bonus</th>
                <th style={{ ...thStyle, textAlign: "right" }}>📉 Deduction</th>
                <th style={{ ...thStyle, textAlign: "right" }}>💰 Net Salary</th>
                <th style={{ ...thStyle, textAlign: "center" }}>📊 Status</th>
                <th style={{ ...thStyle, textAlign: "center" }}>⚙️ Actions</th>
              </tr>
            </thead>
          <tbody>
              {salaries.map((salary, index) => {
              const statusBadge = getStatusBadge(salary.status);
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
                    <td style={{ ...tdStyle, fontWeight: "600" }}>{salary.User?.name || "N/A"}</td>
                    <td style={{ ...tdStyle, fontWeight: "700", color: "#3b82f6" }}>{salary.User?.employeeCode || "N/A"}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600" }}>{formatCurrency(salary.baseSalary)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", color: "#3b82f6", fontWeight: "600" }}>+{formatCurrency(salary.bonus)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", color: "#ef4444", fontWeight: "600" }}>-{formatCurrency(salary.deduction)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: "700", fontSize: "16px", color: "#3b82f6" }}>
                      {formatCurrency(salary.finalSalary)}
                    </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span style={{
                      ...statusBadge.style,
                        padding: "8px 16px",
                        borderRadius: "20px",
                      fontSize: "12px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        transition: "all 0.2s"
                    }}>
                      {statusBadge.label}
                    </span>
                  </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      {salary.status === "pending" && (
                        <button
                          onClick={() => handleUpdateStatus(salary.id, "approved")}
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
                            Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleCalculateSalary(salary.User?.id)}
                          style={{
                            padding: "8px 16px",
                            backgroundColor: "#6b7280",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600",
                            transition: "all 0.2s",
                            boxShadow: "0 2px 8px rgba(107, 114, 128, 0.3)"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(107, 114, 128, 0.4)";
                            e.currentTarget.style.backgroundColor = "#4b5563";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(107, 114, 128, 0.3)";
                            e.currentTarget.style.backgroundColor = "#6b7280";
                          }}
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
  );
}
