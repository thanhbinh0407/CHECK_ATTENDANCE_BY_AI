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
      setMessage("Lỗi khi tải danh sách nhân viên");
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
        setMessage("Không có nhân viên để tính lương");
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
      setMessage(`Tính lương thành công cho ${successCount} nhân viên${errorCount > 0 ? ` (${errorCount} lỗi)` : ''}`);
    } catch (error) {
      console.error("Error calculating salaries:", error);
      setMessage("Lỗi: " + error.message);
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
        setMessage("Phê duyệt lương thành công");
        calculateSalaries();
      }
    } catch (error) {
      console.error("Error approving salary:", error);
      setMessage("Lỗi: " + error.message);
    }
  };

  return (
    <>
      <div style={{ 
        padding: theme.spacing.xl, 
        backgroundColor: theme.neutral.gray50,
        minHeight: "100vh"
      }}>
      {/* Header Section */}
      <div style={{ 
        marginBottom: theme.spacing.xl
      }}>
        <h1 style={{ 
          color: theme.primary.main, 
          fontSize: "28px",
          fontWeight: "700",
          margin: 0,
          marginBottom: theme.spacing.xs
        }}>
          💰 Tính Lương Tháng
        </h1>
        <p style={{ 
          color: theme.neutral.gray600,
          fontSize: "14px",
          margin: 0
        }}>
          Tính toán và quản lý lương nhân viên theo tháng
        </p>
      </div>

      {/* Alert Message */}
      {message && (
        <div
          style={{
            padding: `${theme.spacing.md} ${theme.spacing.lg}`,
            marginBottom: theme.spacing.lg,
            backgroundColor: message.includes("thành công") ? "#d4edda" : "#f8d7da",
            color: message.includes("thành công") ? "#155724" : "#721c24",
            borderRadius: theme.radius.md,
            border: `1px solid ${message.includes("thành công") ? "#c3e6cb" : "#f5c6cb"}`,
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: theme.spacing.sm,
            boxShadow: theme.shadows.sm
          }}
        >
          {message.includes("thành công") ? "✓" : "⚠"} {message}
        </div>
      )}

      {/* Control Panel */}
      <div style={{ 
        marginBottom: theme.spacing.xl,
        backgroundColor: theme.neutral.white,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadows.md,
        border: `1px solid ${theme.neutral.gray200}`
      }}>
        <div style={{ 
          display: "flex", 
          gap: theme.spacing.lg, 
          alignItems: "flex-end",
          flexWrap: "wrap"
        }}>
          <div style={{ flex: "0 0 auto" }}>
            <label style={{ 
              display: "block",
              marginBottom: theme.spacing.sm, 
              fontWeight: "600",
              color: theme.neutral.gray700,
              fontSize: "13px",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Tháng
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `2px solid ${theme.neutral.gray300}`,
                width: "100px",
                fontSize: "15px",
                fontWeight: "500",
                transition: "all 0.2s",
                outline: "none"
              }}
            />
          </div>

          <div style={{ flex: "0 0 auto" }}>
            <label style={{ 
              display: "block",
              marginBottom: theme.spacing.sm, 
              fontWeight: "600",
              color: theme.neutral.gray700,
              fontSize: "13px",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Năm
            </label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `2px solid ${theme.neutral.gray300}`,
                width: "120px",
                fontSize: "15px",
                fontWeight: "500",
                transition: "all 0.2s",
                outline: "none"
              }}
            />
          </div>

          <button
            onClick={calculateSalaries}
            disabled={loading}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
              backgroundColor: theme.primary.main,
              color: theme.neutral.white,
              border: "none",
              borderRadius: theme.radius.md,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              fontSize: "15px",
              fontWeight: "600",
              transition: "all 0.2s",
              boxShadow: loading ? "none" : theme.shadows.sm,
              display: "flex",
              alignItems: "center",
              gap: theme.spacing.sm,
              height: "42px"
            }}
          >
            {loading ? "⏳ Đang tính..." : "💰 Tính lương"}
          </button>

          <button
            onClick={() => setShowRules(!showRules)}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
              backgroundColor: showRules ? theme.neutral.gray600 : theme.colors.secondary,
              color: theme.neutral.white,
              border: "none",
              borderRadius: theme.radius.md,
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
              transition: "all 0.2s",
              boxShadow: theme.shadows.sm,
              display: "flex",
              alignItems: "center",
              gap: theme.spacing.sm,
              height: "42px"
            }}
          >
            {showRules ? "📋 Ẩn Quy tắc" : "📋 Xem Quy tắc"}
          </button>
        </div>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: theme.spacing.xl,
            boxSizing: "border-box",
          }}
          onClick={() => setShowRules(false)}
        >
          <div
            style={{ 
              backgroundColor: theme.neutral.white, 
              padding: theme.spacing.xl, 
              borderRadius: theme.radius.xl, 
              border: `1px solid ${theme.neutral.gray200}`,
              boxShadow: theme.shadows.lg,
              maxWidth: "1000px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowRules(false)}
              style={{
                position: "absolute",
                top: theme.spacing.lg,
                right: theme.spacing.lg,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: theme.neutral.gray500,
                transition: "all 0.2s",
                padding: theme.spacing.sm,
                borderRadius: theme.radius.md,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                backgroundColor: theme.neutral.gray100
              }}
              title="Đóng"
            >
              ×
            </button>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: theme.spacing.xl,
            paddingBottom: theme.spacing.lg,
            borderBottom: `2px solid ${theme.neutral.gray200}`
          }}>
            <div>
              <h3 style={{ 
                color: theme.primary.main,
                fontSize: "24px",
                fontWeight: "700",
                margin: 0,
                marginBottom: theme.spacing.xs,
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.sm
              }}>
                📋 Quy Tắc Tính Lương
              </h3>
              <p style={{
                fontSize: "13px",
                color: theme.neutral.gray500,
                margin: 0,
                fontStyle: "italic"
              }}>
                Các quy tắc được thiết lập theo tiêu chuẩn công ty
              </p>
            </div>
            <div style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.neutral.gray100,
              borderRadius: theme.radius.md,
              fontSize: "12px",
              fontWeight: "600",
              color: theme.neutral.gray600,
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Chỉ Đọc
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.xl }}>
            {/* Deductions */}
            <div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.sm,
                marginBottom: theme.spacing.lg,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: "#fff5f5",
                borderRadius: theme.radius.md,
                border: `1px solid #ffebee`
              }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#ffebee",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px"
                }}>
                  📉
                </div>
                <h4 style={{ 
                  color: "#dc3545",
                  fontSize: "18px",
                  fontWeight: "700",
                  margin: 0
                }}>
                  Khấu Trừ
                </h4>
              </div>
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
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.sm,
                marginBottom: theme.spacing.lg,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: "#f0fdf4",
                borderRadius: theme.radius.md,
                border: `1px solid #dcfce7`
              }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px"
                }}>
                  📈
                </div>
                <h4 style={{ 
                  color: "#28a745",
                  fontSize: "18px",
                  fontWeight: "700",
                  margin: 0
                }}>
                  Thưởng
                </h4>
              </div>
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

          <div style={{ 
            marginTop: theme.spacing.xl, 
            padding: theme.spacing.lg, 
            backgroundColor: "#fffbea", 
            borderRadius: theme.radius.md, 
            fontSize: "14px", 
            color: theme.neutral.gray700,
            border: `2px solid #ffeaa7`,
            display: "flex",
            alignItems: "flex-start",
            gap: theme.spacing.md
          }}>
            <div style={{
              fontSize: "24px",
              flexShrink: 0
            }}>
              ⚠️
            </div>
            <div>
              <strong style={{ display: "block", marginBottom: theme.spacing.xs }}>
                Lưu ý quan trọng
              </strong>
              <div style={{ lineHeight: "1.6" }}>
                Các quy tắc này được thiết lập theo tiêu chuẩn của công ty chuyên nghiệp. Để thay đổi, vui lòng liên hệ với quản trị viên hệ thống.
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Calculated Salaries Table */}
      <div style={{ 
        backgroundColor: theme.neutral.white, 
        borderRadius: theme.radius.lg, 
        overflow: "hidden", 
        boxShadow: theme.shadows.md,
        border: `1px solid ${theme.neutral.gray200}`
      }}>
        <div style={{
          overflowX: "auto"
        }}>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse",
            minWidth: "1000px"
          }}>
            <thead style={{ 
              backgroundColor: theme.primary.main, 
              color: theme.neutral.white
            }}>
              <tr>
                <th style={{ 
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
                  textAlign: "left",
                  fontSize: "13px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Mã NV
                </th>
                <th style={{ 
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
                  textAlign: "left",
                  fontSize: "13px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Tên Nhân Viên
                </th>
                <th style={{ 
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
                  textAlign: "left",
                  fontSize: "13px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Phòng Ban
                </th>
                <th style={{ 
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
                  textAlign: "right",
                  fontSize: "13px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Lương Cơ Bản
                </th>
                <th style={{ 
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
                  textAlign: "right",
                  fontSize: "13px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Thưởng
                </th>
                <th style={{ 
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
                  textAlign: "right",
                  fontSize: "13px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Khấu Trừ
                </th>
                <th style={{ 
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
                  textAlign: "right",
                  fontSize: "13px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Lương Thực
                </th>
                <th style={{ 
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
                  textAlign: "center",
                  fontSize: "13px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Trạng Thái
                </th>
                <th style={{ 
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
                  textAlign: "center",
                  fontSize: "13px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Hành Động
                </th>
              </tr>
            </thead>
            <tbody>
              {calculatedSalaries.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ 
                    padding: theme.spacing.xxl, 
                    textAlign: "center", 
                    color: theme.neutral.gray500,
                    fontSize: "15px"
                  }}>
                    <div style={{ 
                      display: "flex", 
                      flexDirection: "column", 
                      alignItems: "center",
                      gap: theme.spacing.md
                    }}>
                      <div style={{ fontSize: "48px" }}>📊</div>
                      <div>Chưa có dữ liệu. Nhấn "Tính lương" để bắt đầu.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                calculatedSalaries.map((salary, index) => {
                  const employee = employees.find(e => e.id === salary.userId);
                  return (
                    <tr
                      key={salary.id}
                      style={{
                        borderBottom: `1px solid ${theme.neutral.gray200}`,
                        backgroundColor: salary.status === "paid" ? "#f0fff4" : index % 2 === 0 ? theme.neutral.white : theme.neutral.gray50
                      }}
                    >
                      <td style={{ 
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                        fontWeight: "500",
                        color: theme.neutral.gray900
                      }}>
                        {employee?.employeeCode || "N/A"}
                      </td>
                      <td style={{ 
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                        fontWeight: "500",
                        color: theme.neutral.gray900
                      }}>
                        {employee?.name || "N/A"}
                      </td>
                      <td style={{ 
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                        color: theme.neutral.gray600,
                        fontSize: "14px"
                      }}>
                        {employee?.department || "N/A"}
                      </td>
                      <td style={{ 
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
                        textAlign: "right",
                        fontWeight: "500",
                        color: theme.neutral.gray900
                      }}>
                        ₫{salary.baseSalary?.toLocaleString("vi-VN") || "0"}
                      </td>
                      <td style={{ 
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
                        textAlign: "right", 
                        color: "#28a745",
                        fontWeight: "500"
                      }}>
                        +₫{(salary.bonus || 0).toLocaleString("vi-VN")}
                      </td>
                      <td style={{ 
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
                        textAlign: "right", 
                        color: "#dc3545",
                        fontWeight: "500"
                      }}>
                        -₫{(salary.deduction || 0).toLocaleString("vi-VN")}
                      </td>
                      <td style={{ 
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
                        textAlign: "right", 
                        fontWeight: "700", 
                        color: theme.primary.main,
                        fontSize: "15px"
                      }}>
                        ₫{salary.finalSalary?.toLocaleString("vi-VN") || "0"}
                      </td>
                      <td style={{ 
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
                        textAlign: "center" 
                      }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "600",
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
                                : "#997404",
                            border: `1px solid ${
                              salary.status === "paid"
                                ? "#c3e6cb"
                                : salary.status === "approved"
                                ? "#b6d4fe"
                                : "#ffecb5"
                            }`,
                            cursor: "default"
                          }}
                        >
                          {salary.status === "paid"
                            ? "✓ Đã thanh toán"
                            : salary.status === "approved"
                            ? "✓ Đã duyệt"
                            : "⏳ Chưa duyệt"}
                        </span>
                      </td>
                      <td style={{ 
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
                        textAlign: "center" 
                      }}>
                        <div style={{
                          display: "flex",
                          gap: theme.spacing.sm,
                          justifyContent: "center",
                          alignItems: "center"
                        }}>
                          <button
                            onClick={() => viewSalaryBreakdown(salary)}
                            title="Xem chi tiết"
                            style={{
                              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                              backgroundColor: theme.colors.secondary,
                              color: theme.neutral.white,
                              border: "none",
                              borderRadius: theme.radius.md,
                              cursor: "pointer",
                              fontSize: "14px"
                            }}
                          >
                            Xem
                          </button>
                          {salary.status !== "paid" && salary.status !== "approved" && (
                            <button
                              onClick={() => approveSalary(salary.id)}
                              title="Phê duyệt lương"
                              style={{
                                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                                backgroundColor: "#28a745",
                                color: theme.neutral.white,
                                border: "none",
                                borderRadius: theme.radius.md,
                                cursor: "pointer",
                                fontSize: "14px"
                              }}
                            >
                              Duyệt
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
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: theme.spacing.xl,
              paddingBottom: theme.spacing.md,
              borderBottom: `2px solid ${theme.neutral.gray200}`
            }}>
              <h2 style={{ 
                color: theme.primary.main, 
                margin: 0,
                fontSize: "24px",
                fontWeight: "700"
              }}>
                📊 Chi Tiết Tính Lương
              </h2>
              <button
                onClick={() => {
                  setSalaryBreakdown(null);
                  setSelectedEmployee(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: theme.neutral.gray500,
                  padding: "4px",
                  lineHeight: 1,
                  transition: "color 0.2s"
                }}
              >
                ×
              </button>
            </div>

            <div style={{ 
              marginBottom: theme.spacing.lg,
              padding: theme.spacing.md,
              backgroundColor: theme.neutral.gray50,
              borderRadius: theme.radius.md
            }}>
              <div style={{ marginBottom: theme.spacing.sm, fontSize: "14px", color: theme.neutral.gray600 }}>
                <strong style={{ color: theme.neutral.gray900 }}>Nhân viên:</strong> {selectedEmployee.name}
              </div>
              <div style={{ marginBottom: theme.spacing.sm, fontSize: "14px", color: theme.neutral.gray600 }}>
                <strong style={{ color: theme.neutral.gray900 }}>Mã NV:</strong> {selectedEmployee.employeeCode}
              </div>
              <div style={{ fontSize: "14px", color: theme.neutral.gray600 }}>
                <strong style={{ color: theme.neutral.gray900 }}>Tháng/Năm:</strong> {selectedMonth}/{selectedYear}
              </div>
            </div>

            <div style={{ 
              borderTop: `1px solid ${theme.neutral.gray200}`, 
              paddingTop: theme.spacing.lg 
            }}>
              <h4 style={{ 
                color: "#28a745",
                fontSize: "16px",
                fontWeight: "600",
                marginBottom: theme.spacing.md
              }}>
                💰 Thu Nhập
              </h4>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: theme.spacing.sm,
                padding: `${theme.spacing.sm} 0`,
                borderBottom: `1px solid ${theme.neutral.gray100}`
              }}>
                <span style={{ color: theme.neutral.gray700 }}>Lương cơ bản:</span>
                <strong style={{ color: theme.neutral.gray900 }}>₫{salaryBreakdown.baseSalary?.toLocaleString("vi-VN") || "0"}</strong>
              </div>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: theme.spacing.lg,
                padding: `${theme.spacing.sm} 0`
              }}>
                <span style={{ color: theme.neutral.gray700 }}>Thưởng:</span>
                <strong style={{ color: "#28a745" }}>+₫{(salaryBreakdown.bonus || 0).toLocaleString("vi-VN")}</strong>
              </div>

              <h4 style={{ 
                color: "#dc3545", 
                marginTop: theme.spacing.lg,
                fontSize: "16px",
                fontWeight: "600",
                marginBottom: theme.spacing.md
              }}>
                📉 Khấu Trừ
              </h4>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: theme.spacing.lg,
                padding: `${theme.spacing.sm} 0`
              }}>
                <span style={{ color: theme.neutral.gray700 }}>Tổng khấu trừ:</span>
                <strong style={{ color: "#dc3545" }}>-₫{(salaryBreakdown.deduction || 0).toLocaleString("vi-VN")}</strong>
              </div>

              <div
                style={{
                  borderTop: `2px solid ${theme.primary.main}`,
                  paddingTop: theme.spacing.lg,
                  marginTop: theme.spacing.lg,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "18px",
                  fontWeight: "700",
                  padding: theme.spacing.md,
                  backgroundColor: theme.neutral.gray50,
                  borderRadius: theme.radius.md
                }}
              >
                <span style={{ color: theme.neutral.gray900 }}>Lương thực nhận:</span>
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
              Đóng
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
    </>
  );
}
