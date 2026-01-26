import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";

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
  const [rules, setRules] = useState([]);

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchEmployees();
    fetchRules();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setMessage("Lỗi: Không tìm thấy token. Vui lòng đăng nhập lại.");
        return;
      }

      console.log("Fetching employees from:", `${apiBase}/api/admin/employees`);
      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);
      
      if (res.ok) {
        setEmployees(data.employees || []);
      } else {
        setMessage(`Lỗi (${res.status}): ${data.message || 'Không tải được danh sách'}`);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setMessage("Lỗi khi tải danh sách nhân viên: " + error.message);
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
      } else {
        console.error("Error fetching rules:", res.status, data);
      }
    } catch (error) {
      console.error("Error fetching rules:", error);
    }
  };

  const calculateSalaries = async () => {
    try {
      setLoading(true);
      setMessage("");
      setCalculatedSalaries([]);
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
            const errorMsg = data.message || `Unknown error for ${employee.name}`;
            console.error(`Error calculating salary for ${employee.name}:`, data);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error calculating salary for ${employee.name}:`, error);
        }
      }

      setCalculatedSalaries(calculatedSalariesList);
      if (successCount > 0) {
        setMessage(`Tính lương thành công cho ${successCount} nhân viên${errorCount > 0 ? ` (${errorCount} lỗi)` : ''}`);
      } else {
        setMessage("Lỗi khi tính lương cho tất cả nhân viên");
      }
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
    <div style={{ padding: theme.spacing.xl, backgroundColor: theme.neutral.gray50 }}>
      <h1 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>💰 Tính Lương Tháng</h1>

      {message && (
        <div
          style={{
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            backgroundColor: message.includes("thành công") ? "#d4edda" : "#f8d7da",
            color: message.includes("thành công") ? "#155724" : "#721c24",
            borderRadius: theme.radius.md
          }}
        >
          {message}
        </div>
      )}

      <div style={{ marginBottom: theme.spacing.xl, display: "flex", gap: theme.spacing.lg, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <label style={{ marginRight: theme.spacing.sm, fontWeight: "600" }}>Tháng:</label>
          <input
            type="number"
            min="1"
            max="12"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{
              padding: theme.spacing.sm,
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.neutral.gray300}`,
              width: "80px"
            }}
          />
        </div>

        <div>
          <label style={{ marginRight: theme.spacing.sm, fontWeight: "600" }}>Năm:</label>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{
              padding: theme.spacing.sm,
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.neutral.gray300}`,
              width: "100px"
            }}
          />
        </div>

        <button
          onClick={calculateSalaries}
          disabled={loading}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            backgroundColor: theme.primary.main,
            color: theme.neutral.white,
            border: "none",
            borderRadius: theme.radius.md,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            fontWeight: "600"
          }}
        >
          {loading ? "Đang tính..." : "Tính lương"}
        </button>

        <button
          onClick={() => setShowRules(!showRules)}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            backgroundColor: theme.info.main,
            color: theme.neutral.white,
            border: "none",
            borderRadius: theme.radius.md,
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          {showRules ? "Ẩn" : "Xem"} Quy tắc
        </button>
      </div>

      {/* Rules Section */}
      {showRules && (
        <div style={{ marginBottom: theme.spacing.xl, backgroundColor: theme.neutral.white, padding: theme.spacing.lg, borderRadius: theme.radius.lg, border: `1px solid ${theme.neutral.gray200}` }}>
          <h3 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>📋 Quy Tắc Tính Lương</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.xl }}>
            {/* Deductions */}
            <div>
              <h4 style={{ color: theme.error.main, marginBottom: theme.spacing.md }}>📉 Khấu Trừ:</h4>
              {rules.filter(r => r.type === "deduction").map(rule => (
                <div
                  key={rule.id}
                  style={{
                    padding: theme.spacing.md,
                    marginBottom: theme.spacing.sm,
                    backgroundColor: "#fff5f5",
                    borderLeft: `4px solid ${theme.error.main}`,
                    borderRadius: theme.radius.md
                  }}
                >
                  <div style={{ fontWeight: "600" }}>{rule.name}</div>
                  <div style={{ fontSize: theme.typography.small.fontSize, color: theme.neutral.gray600 }}>
                    {rule.amountType === "percentage"
                      ? `${rule.amount}% lương cơ bản`
                      : `₫${rule.amount?.toLocaleString("vi-VN") || "0"}`}
                  </div>
                </div>
              ))}
            </div>

            {/* Bonuses */}
            <div>
              <h4 style={{ color: theme.success.main, marginBottom: theme.spacing.md }}>📈 Thưởng:</h4>
              {rules.filter(r => r.type === "bonus").map(rule => (
                <div
                  key={rule.id}
                  style={{
                    padding: theme.spacing.md,
                    marginBottom: theme.spacing.sm,
                    backgroundColor: "#f5fff5",
                    borderLeft: `4px solid ${theme.success.main}`,
                    borderRadius: theme.radius.md
                  }}
                >
                  <div style={{ fontWeight: "600" }}>{rule.name}</div>
                  <div style={{ fontSize: theme.typography.small.fontSize, color: theme.neutral.gray600 }}>
                    {rule.amountType === "percentage"
                      ? `${rule.amount}% lương cơ bản`
                      : `₫${rule.amount?.toLocaleString("vi-VN") || "0"}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Calculated Salaries Table */}
      <div style={{ backgroundColor: theme.neutral.white, borderRadius: theme.radius.lg, overflow: "hidden", boxShadow: theme.shadows.md }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: theme.primary.main, color: theme.neutral.white }}>
            <tr>
              <th style={{ padding: theme.spacing.md, textAlign: "left" }}>Mã NV</th>
              <th style={{ padding: theme.spacing.md, textAlign: "left" }}>Tên Nhân Viên</th>
              <th style={{ padding: theme.spacing.md, textAlign: "left" }}>Phòng Ban</th>
              <th style={{ padding: theme.spacing.md, textAlign: "right" }}>Lương Cơ Bản</th>
              <th style={{ padding: theme.spacing.md, textAlign: "right" }}>Thưởng</th>
              <th style={{ padding: theme.spacing.md, textAlign: "right" }}>Khấu Trừ</th>
              <th style={{ padding: theme.spacing.md, textAlign: "right" }}>Lương Thực</th>
              <th style={{ padding: theme.spacing.md, textAlign: "center" }}>Trạng Thái</th>
              <th style={{ padding: theme.spacing.md, textAlign: "center" }}>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {calculatedSalaries.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: theme.spacing.xl, textAlign: "center", color: theme.neutral.gray500 }}>
                  Chưa có dữ liệu. Nhấn "Tính lương" để bắt đầu.
                </td>
              </tr>
            ) : (
              calculatedSalaries.map((salary) => {
                const employee = employees.find(e => e.id === salary.userId);
                return (
                  <tr
                    key={salary.id}
                    style={{
                      borderBottom: `1px solid ${theme.neutral.gray200}`,
                      backgroundColor: salary.status === "paid" ? "#f0fff4" : theme.neutral.white
                    }}
                  >
                    <td style={{ padding: theme.spacing.md }}>{employee?.employeeCode || "N/A"}</td>
                    <td style={{ padding: theme.spacing.md }}>{employee?.name || "N/A"}</td>
                    <td style={{ padding: theme.spacing.md }}>{employee?.Department?.name || "N/A"}</td>
                    <td style={{ padding: theme.spacing.md, textAlign: "right" }}>
                      ₫{salary.baseSalary?.toLocaleString("vi-VN") || "0"}
                    </td>
                    <td style={{ padding: theme.spacing.md, textAlign: "right", color: theme.success.main }}>
                      +₫{(salary.bonus || 0).toLocaleString("vi-VN")}
                    </td>
                    <td style={{ padding: theme.spacing.md, textAlign: "right", color: theme.error.main }}>
                      -₫{(salary.deduction || 0).toLocaleString("vi-VN")}
                    </td>
                    <td style={{ padding: theme.spacing.md, textAlign: "right", fontWeight: "600", color: theme.primary.main }}>
                      ₫{salary.finalSalary?.toLocaleString("vi-VN") || "0"}
                    </td>
                    <td style={{ padding: theme.spacing.md, textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                          borderRadius: theme.radius.full,
                          fontSize: theme.typography.tiny.fontSize,
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
                              : "#997404"
                        }}
                      >
                        {salary.status === "paid"
                          ? "Đã thanh toán"
                          : salary.status === "approved"
                          ? "Đã duyệt"
                          : "Chưa duyệt"}
                      </span>
                    </td>
                    <td style={{ padding: theme.spacing.md, textAlign: "center" }}>
                      <button
                        onClick={() => viewSalaryBreakdown(salary)}
                        style={{
                          padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                          marginRight: theme.spacing.xs,
                          backgroundColor: theme.info.main,
                          color: theme.neutral.white,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: "pointer",
                          fontSize: theme.typography.small.fontSize
                        }}
                      >
                        Chi tiết
                      </button>
                      {salary.status !== "paid" && (
                        <button
                          onClick={() => approveSalary(salary.id)}
                          style={{
                            padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                            backgroundColor: theme.success.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: "pointer",
                            fontSize: theme.typography.small.fontSize
                          }}
                        >
                          Duyệt
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
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: theme.zIndex.modal
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
              borderRadius: theme.radius.lg,
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: theme.shadows.xl
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: theme.primary.main, marginBottom: theme.spacing.lg }}>
              📊 Chi Tiết Tính Lương
            </h2>

            <div style={{ marginBottom: theme.spacing.md }}>
              <strong>Nhân viên:</strong> {selectedEmployee.name}
            </div>
            <div style={{ marginBottom: theme.spacing.md }}>
              <strong>Mã NV:</strong> {selectedEmployee.employeeCode}
            </div>
            <div style={{ marginBottom: theme.spacing.lg }}>
              <strong>Tháng/Năm:</strong> {selectedMonth}/{selectedYear}
            </div>

            <div style={{ borderTop: `1px solid ${theme.neutral.gray200}`, paddingTop: theme.spacing.md }}>
              <h4 style={{ color: theme.success.main }}>Thu Nhập:</h4>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: theme.spacing.xs }}>
                <span>Lương cơ bản:</span>
                <strong>₫{salaryBreakdown.baseSalary?.toLocaleString("vi-VN") || "0"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: theme.spacing.md }}>
                <span>Thưởng:</span>
                <strong style={{ color: theme.success.main }}>+₫{(salaryBreakdown.bonus || 0).toLocaleString("vi-VN")}</strong>
              </div>

              <h4 style={{ color: theme.error.main, marginTop: theme.spacing.md }}>Khấu Trừ:</h4>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: theme.spacing.md }}>
                <span>Tổng khấu trừ:</span>
                <strong style={{ color: theme.error.main }}>-₫{(salaryBreakdown.deduction || 0).toLocaleString("vi-VN")}</strong>
              </div>

              <div
                style={{
                  borderTop: `2px solid ${theme.primary.main}`,
                  paddingTop: theme.spacing.md,
                  marginTop: theme.spacing.md,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: theme.typography.h5.fontSize
                }}
              >
                <strong>Lương thực nhận:</strong>
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
                marginTop: theme.spacing.lg,
                width: "100%",
                padding: theme.spacing.md,
                backgroundColor: theme.primary.main,
                color: theme.neutral.white,
                border: "none",
                borderRadius: theme.radius.md,
                cursor: "pointer",
                fontWeight: "600"
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

