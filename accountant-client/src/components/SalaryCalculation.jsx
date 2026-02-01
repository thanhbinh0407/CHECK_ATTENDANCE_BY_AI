import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";
import SalaryBreakdownModal from "./SalaryBreakdownModal.jsx";

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

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchEmployees();
    fetchRules();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      calculateSalaries();
    }
  }, [selectedMonth, selectedYear, employees]);

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
      setMessage("Error loading employee list");
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
      const token = localStorage.getItem("authToken");
      if (!token) return;

      if (employees.length === 0) {
        setMessage("No employees to calculate salary");
        return;
      }

      const calculatedSalariesList = [];
      let successCount = 0;
      let errorCount = 0;

      // Calculate salary for each employee
      for (const employee of employees) {
        try {
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
      const successMsg = `Salary calculated for ${successCount} employee(s)${errorCount > 0 ? ` (${errorCount} error(s))` : ''}`;
      setToastPopup(successMsg);
      setTimeout(() => setToastPopup(""), 5000);
    } catch (error) {
      console.error("Error calculating salaries:", error);
      setMessage("Error: " + error.message);
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

  return (
    <div>
      <h1 style={{ color: theme.primary.main, marginTop: 0 }}>💰 Monthly Salary Calculation</h1>

      {toastPopup && (
        <div
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "12px 24px",
            backgroundColor: "#059669",
            color: "#fff",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            fontWeight: "600",
            fontSize: "15px",
            zIndex: 9999
          }}
        >
          {toastPopup}
        </div>
      )}

      {message && message.includes("Error") && (
        <div
          style={{
            padding: "10px",
            marginBottom: "15px",
            backgroundColor: "#f8d7da",
            color: "#721c24",
            borderRadius: "5px"
          }}
        >
          {message}
        </div>
      )}

      <div style={{ marginBottom: "20px", display: "flex", gap: "20px", alignItems: "center" }}>
        <div>
          <label style={{ marginRight: "10px", fontWeight: "bold" }}>Month:</label>
          <input
            type="number"
            min="1"
            max="12"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              width: "80px"
            }}
          />
        </div>

        <div>
          <label style={{ marginRight: "10px", fontWeight: "bold" }}>Year:</label>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              width: "100px"
            }}
          />
        </div>

        <button
          onClick={calculateSalaries}
          disabled={loading}
          style={{
            padding: "8px 20px",
            backgroundColor: "#047857",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? "Calculating..." : "Calculate"}
        </button>

        <button
          onClick={() => setShowRules(!showRules)}
          style={{
            padding: "8px 20px",
            backgroundColor: "#6b7280",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          {showRules ? "Hide" : "Show"} Rules
        </button>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div style={{ marginBottom: "20px", backgroundColor: "white", padding: "15px", borderRadius: "8px", border: `1px solid ${theme.neutral.gray200}` }}>
          <h3 style={{ color: theme.primary.main }}>📋 Salary Calculation Rules (Read-only)</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.xl }}>
            {/* Deductions */}
            <div>
              <h4 style={{ color: "#dc3545" }}>📉 Deductions:</h4>
              {rules.filter(r => r.type === "deduction").length === 0 ? (
                <div style={{
                  padding: theme.spacing.lg,
                  textAlign: "center",
                  color: theme.neutral.gray400,
                  fontStyle: "italic"
                }}>
                  Không có quy tắc khấu trừ
                </div>
              ) : (
                rules.filter(r => r.type === "deduction").map(rule => (
                  <div
                    key={rule.id}
                    style={{
                      padding: theme.spacing.lg,
                      marginBottom: theme.spacing.md,
                      backgroundColor: "#fff5f5",
                      borderLeft: `5px solid #dc3545`,
                      borderRadius: theme.radius.md,
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: theme.shadows.sm,
                      border: `1px solid #ffebee`,
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: theme.spacing.sm
                    }}>
                      <div style={{ 
                        fontWeight: "700", 
                        fontSize: "16px",
                        color: theme.neutral.gray900 
                      }}>
                        {rule.name}
                      </div>
                      <div style={{
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        backgroundColor: "#ffebee",
                        borderRadius: theme.radius.sm,
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "#dc3545",
                        textTransform: "uppercase"
                      }}>
                        Khấu Trừ
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: "15px", 
                      color: theme.neutral.gray700, 
                      marginBottom: theme.spacing.xs,
                      fontWeight: "500"
                    }}>
                      {rule.amountType === "percentage"
                        ? `${rule.amount}% lương cơ bản`
                        : `₫${rule.amount.toLocaleString("vi-VN")}`}
                    </div>
                    <div style={{ 
                      fontSize: "13px", 
                      color: theme.neutral.gray600,
                      lineHeight: "1.5"
                    }}>
                      {rule.description}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bonuses */}
            <div>
              <h4 style={{ color: "#28a745" }}>📈 Bonuses:</h4>
              {rules.filter(r => r.type === "bonus").length === 0 ? (
                <div style={{
                  padding: theme.spacing.lg,
                  textAlign: "center",
                  color: theme.neutral.gray400,
                  fontStyle: "italic"
                }}>
                  Không có quy tắc thưởng
                </div>
              ) : (
                rules.filter(r => r.type === "bonus").map(rule => (
                  <div
                    key={rule.id}
                    style={{
                      padding: theme.spacing.lg,
                      marginBottom: theme.spacing.md,
                      backgroundColor: "#f0fdf4",
                      borderLeft: `5px solid #28a745`,
                      borderRadius: theme.radius.md,
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: theme.shadows.sm,
                      border: `1px solid #dcfce7`,
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: theme.spacing.sm
                    }}>
                      <div style={{ 
                        fontWeight: "700", 
                        fontSize: "16px",
                        color: theme.neutral.gray900 
                      }}>
                        {rule.name}
                      </div>
                      <div style={{
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        backgroundColor: "#dcfce7",
                        borderRadius: theme.radius.sm,
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "#28a745",
                        textTransform: "uppercase"
                      }}>
                        Thưởng
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: "15px", 
                      color: theme.neutral.gray700, 
                      marginBottom: theme.spacing.xs,
                      fontWeight: "500"
                    }}>
                      {rule.amountType === "percentage"
                        ? `${rule.amount}% lương cơ bản`
                        : `₫${rule.amount.toLocaleString("vi-VN")}`}
                    </div>
                    <div style={{ 
                      fontSize: "13px", 
                      color: theme.neutral.gray600,
                      lineHeight: "1.5"
                    }}>
                      {rule.description}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#fffbea", borderRadius: "4px", fontSize: "0.9em", color: "#666" }}>
            <strong>⚠️ Note:</strong> These rules are set by company policy. Contact system administrator to change.
          </div>
        </div>
      )}

      {/* Calculated Salaries Table */}
      <div style={{ backgroundColor: "white", borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: theme.primary.main, color: "white" }}>
            <tr>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: `2px solid ${theme.neutral.gray200}` }}>
                Emp. ID
              </th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: `2px solid ${theme.neutral.gray200}` }}>
                Employee Name
              </th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: `2px solid ${theme.neutral.gray200}` }}>
                Department
              </th>
              <th style={{ padding: "12px", textAlign: "right", borderBottom: `2px solid ${theme.neutral.gray200}` }}>
                Base Salary
              </th>
              <th style={{ padding: "12px", textAlign: "right", borderBottom: `2px solid ${theme.neutral.gray200}` }}>
                Bonus
              </th>
              <th style={{ padding: "12px", textAlign: "right", borderBottom: `2px solid ${theme.neutral.gray200}` }}>
                Deduction
              </th>
              <th style={{ padding: "12px", textAlign: "right", borderBottom: `2px solid ${theme.neutral.gray200}` }}>
                Net Salary
              </th>
              <th style={{ padding: "12px", textAlign: "center", borderBottom: `2px solid ${theme.neutral.gray200}` }}>
                Status
              </th>
              <th style={{ padding: "12px", textAlign: "center", borderBottom: `2px solid ${theme.neutral.gray200}` }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {calculatedSalaries.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                  No data yet. Click "Calculate" to start.
                </td>
              </tr>
            ) : (
              [...calculatedSalaries]
                .sort((a, b) => {
                  const order = { paid: 0, approved: 1, pending: 2 };
                  return (order[a.status] ?? 2) - (order[b.status] ?? 2);
                })
                .map((salary) => {
                const employee = employees.find(e => e.id === salary.userId);
                return (
                  <tr
                    key={salary.id}
                    style={{
                      borderBottom: `1px solid ${theme.neutral.gray200}`,
                      backgroundColor: salary.status === "paid" ? "#f0fff4" : "white"
                    }}
                  >
                    <td style={{ padding: "12px" }}>{employee?.employeeCode || "N/A"}</td>
                    <td style={{ padding: "12px" }}>{employee?.name || "N/A"}</td>
                    <td style={{ padding: "12px" }}>{employee?.department || "N/A"}</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      ₫{salary.baseSalary?.toLocaleString("vi-VN") || "0"}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", color: "#28a745" }}>
                      +₫{(salary.bonus || 0).toLocaleString("vi-VN")}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", color: "#dc3545" }}>
                      -₫{(salary.deduction || 0).toLocaleString("vi-VN")}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: "bold", color: theme.primary.main }}>
                      ₫{salary.finalSalary?.toLocaleString("vi-VN") || "0"}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "0.85em",
                          fontWeight: "bold",
                          backgroundColor:
                            salary.status === "paid"
                              ? "#d4edda"
                              : salary.status === "approved"
                              ? "#cfe2ff"
                              : "#fff3cd",
                          color:
                            salary.status === "paid"
                              ? "#155724"
                              : salary.status === "approved"
                              ? "#084298"
                              : "#997404"
                        }}
                      >
                        {salary.status === "paid"
                          ? "Paid"
                          : salary.status === "approved"
                          ? "Approved"
                          : "Pending"}
                      </span>
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <button
                        onClick={() => viewSalaryBreakdown(salary)}
                        style={{
                          padding: "6px 12px",
                          marginRight: "5px",
                          backgroundColor: theme.colors.secondary,
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.9em"
                        }}
                      >
                        Details
                      </button>
                      {salary.status !== "paid" && salary.status !== "approved" && (
                        <button
                          onClick={() => approveSalary(salary.id)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.9em"
                          }}
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Salary Breakdown Modal */}
      {salaryBreakdown && selectedEmployee && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => {
            setSalaryBreakdown(null);
            setSelectedEmployee(null);
          }}
        >
          <div
            style={{
              backgroundColor: theme.neutral.white,
              padding: theme.spacing.xl,
              borderRadius: theme.radius.xl,
              maxWidth: "600px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: theme.shadows.lg,
              border: `1px solid ${theme.neutral.gray200}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: theme.primary.main, marginBottom: "20px" }}>
              📊 Salary Breakdown
            </h2>

            <div style={{ marginBottom: "15px" }}>
              <strong>Employee:</strong> {selectedEmployee.name}
            </div>
            <div style={{ marginBottom: "15px" }}>
              <strong>Emp. ID:</strong> {selectedEmployee.employeeCode}
            </div>
            <div style={{ marginBottom: "20px" }}>
              <strong>Month/Year:</strong> {selectedMonth}/{selectedYear}
            </div>

            <div style={{ borderTop: `1px solid ${theme.neutral.gray200}`, paddingTop: "15px" }}>
              <h4 style={{ color: "#28a745" }}>Income:</h4>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>Base salary:</span>
                <strong>₫{salaryBreakdown.baseSalary?.toLocaleString("vi-VN") || "0"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                <span>Bonus:</span>
                <strong style={{ color: "#28a745" }}>+₫{(salaryBreakdown.bonus || 0).toLocaleString("vi-VN")}</strong>
              </div>

              <h4 style={{ color: "#dc3545", marginTop: "15px" }}>Deductions:</h4>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                <span>Total deduction:</span>
                <strong style={{ color: "#dc3545" }}>-₫{(salaryBreakdown.deduction || 0).toLocaleString("vi-VN")}</strong>
              </div>

              <div
                style={{
                  borderTop: `2px solid ${theme.primary.main}`,
                  paddingTop: "15px",
                  marginTop: "15px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "18px",
                  fontWeight: "700",
                  padding: "10px",
                  backgroundColor: theme.neutral.gray50,
                  borderRadius: "5px"
                }}
              >
                <strong>Net pay:</strong>
                <strong style={{ color: theme.primary.main }}>
                  ₫{salaryBreakdown.finalSalary?.toLocaleString("vi-VN") || "0"}
                </strong>
              </div>
            </div>

            <button
              onClick={() => {
                setSalaryBreakdown(null);
                setSelectedEmployee(null);
              }}
              style={{
                marginTop: theme.spacing.xl,
                width: "100%",
                padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                backgroundColor: theme.primary.main,
                color: theme.neutral.white,
                border: "none",
                borderRadius: theme.radius.md,
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "15px",
                transition: "all 0.2s",
                boxShadow: theme.shadows.sm
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

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

