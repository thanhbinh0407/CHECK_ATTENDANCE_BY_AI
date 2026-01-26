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
    <div style={{ padding: "20px", backgroundColor: theme.colors.light }}>
      <h1 style={{ color: theme.colors.primary }}>💰 Tính Lương Tháng</h1>

      {message && (
        <div
          style={{
            padding: "10px",
            marginBottom: "15px",
            backgroundColor: message.includes("thành công") ? "#d4edda" : "#f8d7da",
            color: message.includes("thành công") ? "#155724" : "#721c24",
            borderRadius: "5px"
          }}
        >
          {message}
        </div>
      )}

      <div style={{ marginBottom: "20px", display: "flex", gap: "20px", alignItems: "center" }}>
        <div>
          <label style={{ marginRight: "10px", fontWeight: "bold" }}>Tháng:</label>
          <input
            type="number"
            min="1"
            max="12"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{
              padding: "8px",
              borderRadius: "5px",
              border: `1px solid ${theme.colors.border}`,
              width: "80px"
            }}
          />
        </div>

        <div>
          <label style={{ marginRight: "10px", fontWeight: "bold" }}>Năm:</label>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{
              padding: "8px",
              borderRadius: "5px",
              border: `1px solid ${theme.colors.border}`,
              width: "100px"
            }}
          />
        </div>

        <button
          onClick={calculateSalaries}
          disabled={loading}
          style={{
            padding: "8px 20px",
            backgroundColor: theme.colors.primary,
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? "Đang tính..." : "Tính lương"}
        </button>

        <button
          onClick={() => setShowRules(!showRules)}
          style={{
            padding: "8px 20px",
            backgroundColor: theme.colors.secondary,
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          {showRules ? "Ẩn" : "Xem"} Quy tắc
        </button>
      </div>

      {/* Rules Section */}
      {showRules && (
        <div style={{ marginBottom: "20px", backgroundColor: "white", padding: "15px", borderRadius: "8px", border: `1px solid ${theme.colors.border}` }}>
          <h3 style={{ color: theme.colors.primary }}>📋 Quy Tắc Tính Lương (Không Thể Chỉnh Sửa)</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Deductions */}
            <div>
              <h4 style={{ color: "#dc3545" }}>📉 Khấu Trừ:</h4>
              {rules.filter(r => r.type === "deduction").map(rule => (
                <div
                  key={rule.id}
                  style={{
                    padding: "10px",
                    marginBottom: "8px",
                    backgroundColor: "#fff5f5",
                    borderLeft: `4px solid #dc3545`,
                    borderRadius: "4px"
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>{rule.name}</div>
                  <div style={{ fontSize: "0.9em", color: "#666" }}>
                    {rule.amountType === "percentage"
                      ? `${rule.amount}% lương cơ bản`
                      : `₫${rule.amount.toLocaleString("vi-VN")}`}
                  </div>
                  <div style={{ fontSize: "0.85em", color: "#999", marginTop: "4px" }}>
                    {rule.description}
                  </div>
                </div>
              ))}
            </div>

            {/* Bonuses */}
            <div>
              <h4 style={{ color: "#28a745" }}>📈 Thưởng:</h4>
              {rules.filter(r => r.type === "bonus").map(rule => (
                <div
                  key={rule.id}
                  style={{
                    padding: "10px",
                    marginBottom: "8px",
                    backgroundColor: "#f5fff5",
                    borderLeft: `4px solid #28a745`,
                    borderRadius: "4px"
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>{rule.name}</div>
                  <div style={{ fontSize: "0.9em", color: "#666" }}>
                    {rule.amountType === "percentage"
                      ? `${rule.amount}% lương cơ bản`
                      : `₫${rule.amount.toLocaleString("vi-VN")}`}
                  </div>
                  <div style={{ fontSize: "0.85em", color: "#999", marginTop: "4px" }}>
                    {rule.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#fffbea", borderRadius: "4px", fontSize: "0.9em", color: "#666" }}>
            <strong>⚠️ Lưu ý:</strong> Các quy tắc này được thiết lập theo tiêu chuẩn của công ty chuyên nghiệp. Để thay đổi, vui lòng liên hệ với quản trị viên hệ thống.
          </div>
        </div>
      )}

      {/* Calculated Salaries Table */}
      <div style={{ backgroundColor: "white", borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: theme.colors.primary, color: "white" }}>
            <tr>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: `2px solid ${theme.colors.border}` }}>
                Mã NV
              </th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: `2px solid ${theme.colors.border}` }}>
                Tên Nhân Viên
              </th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: `2px solid ${theme.colors.border}` }}>
                Phòng Ban
              </th>
              <th style={{ padding: "12px", textAlign: "right", borderBottom: `2px solid ${theme.colors.border}` }}>
                Lương Cơ Bản
              </th>
              <th style={{ padding: "12px", textAlign: "right", borderBottom: `2px solid ${theme.colors.border}` }}>
                Thưởng
              </th>
              <th style={{ padding: "12px", textAlign: "right", borderBottom: `2px solid ${theme.colors.border}` }}>
                Khấu Trừ
              </th>
              <th style={{ padding: "12px", textAlign: "right", borderBottom: `2px solid ${theme.colors.border}` }}>
                Lương Thực
              </th>
              <th style={{ padding: "12px", textAlign: "center", borderBottom: `2px solid ${theme.colors.border}` }}>
                Trạng Thái
              </th>
              <th style={{ padding: "12px", textAlign: "center", borderBottom: `2px solid ${theme.colors.border}` }}>
                Hành Động
              </th>
            </tr>
          </thead>
          <tbody>
            {calculatedSalaries.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: "20px", textAlign: "center", color: "#999" }}>
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
                      borderBottom: `1px solid ${theme.colors.border}`,
                      backgroundColor: salary.status === "paid" ? "#f0fff4" : "white",
                      "&:hover": { backgroundColor: "#f9f9f9" }
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
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: "bold", color: theme.colors.primary }}>
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
                          ? "Đã thanh toán"
                          : salary.status === "approved"
                          ? "Đã duyệt"
                          : "Chưa duyệt"}
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
                        Chi tiết
                      </button>
                      {salary.status !== "paid" && (
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
            zIndex: 1000
          }}
          onClick={() => {
            setSalaryBreakdown(null);
            setSelectedEmployee(null);
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 5px 15px rgba(0,0,0,0.3)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: theme.colors.primary, marginBottom: "20px" }}>
              📊 Chi Tiết Tính Lương
            </h2>

            <div style={{ marginBottom: "15px" }}>
              <strong>Nhân viên:</strong> {selectedEmployee.name}
            </div>
            <div style={{ marginBottom: "15px" }}>
              <strong>Mã NV:</strong> {selectedEmployee.employeeCode}
            </div>
            <div style={{ marginBottom: "20px" }}>
              <strong>Tháng/Năm:</strong> {selectedMonth}/{selectedYear}
            </div>

            <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: "15px" }}>
              <h4 style={{ color: "#28a745" }}>Thu Nhập:</h4>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>Lương cơ bản:</span>
                <strong>₫{salaryBreakdown.baseSalary?.toLocaleString("vi-VN") || "0"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                <span>Thưởng:</span>
                <strong style={{ color: "#28a745" }}>+₫{(salaryBreakdown.bonus || 0).toLocaleString("vi-VN")}</strong>
              </div>

              <h4 style={{ color: "#dc3545", marginTop: "15px" }}>Khấu Trừ:</h4>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                <span>Tổng khấu trừ:</span>
                <strong style={{ color: "#dc3545" }}>-₫{(salaryBreakdown.deduction || 0).toLocaleString("vi-VN")}</strong>
              </div>

              <div
                style={{
                  borderTop: `2px solid ${theme.colors.primary}`,
                  paddingTop: "15px",
                  marginTop: "15px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "1.1em"
                }}
              >
                <strong>Lương thực nhận:</strong>
                <strong style={{ color: theme.colors.primary }}>
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
                marginTop: "20px",
                width: "100%",
                padding: "10px",
                backgroundColor: theme.colors.primary,
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold"
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
  );
}
