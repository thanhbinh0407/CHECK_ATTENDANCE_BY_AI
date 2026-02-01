import React, { useState, useEffect } from "react";
import { calculateCompleteSalary, formatCurrency } from "../utils/salaryCalculation.js";
import { exportSalariesToExcel } from "../utils/exportUtils.js";

export default function SalaryManagement() {
  const [rules, setRules] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("salaries");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState("all"); // all, pending, approved, paid
  const [page, setPage] = useState(1);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const ITEMS_PER_PAGE = 12;
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    name: "",
    type: "bonus",
    triggerType: "late",
    amount: "",
    amountType: "fixed",
    threshold: "",
    description: "",
    priority: 0,
    isActive: true
  });

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    if (activeTab === "rules") {
      fetchRules();
    } else if (activeTab === "salaries") {
      fetchSalaries();
      fetchEmployees();
    }
  }, [activeTab, selectedMonth, selectedYear]);

  const filteredSalaries = salaries.filter(s => {
    if (filterStatus === "all") return true;
    return (s.status || "pending") === filterStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filteredSalaries.length / ITEMS_PER_PAGE));
  const paginatedSalaries = filteredSalaries.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, selectedMonth, selectedYear]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/salary/rules`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error("Error fetching rules:", error);
    } finally {
      setLoading(false);
    }
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
        body: JSON.stringify({ userId, month: selectedMonth, year: selectedYear })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Payroll calculated successfully!");
        fetchSalaries();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleCreateRule = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/salary/rules`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...ruleForm,
          amount: parseFloat(ruleForm.amount),
          threshold: ruleForm.threshold ? parseInt(ruleForm.threshold) : null
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Rule created successfully!");
        setShowRuleForm(false);
        setRuleForm({
          name: "",
          type: "bonus",
          triggerType: "late",
          amount: "",
          amountType: "fixed",
          threshold: "",
          description: "",
          priority: 0,
          isActive: true
        });
        fetchRules();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRule = async (ruleId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/salary/rules/${ruleId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...ruleForm,
          amount: parseFloat(ruleForm.amount),
          threshold: ruleForm.threshold ? parseInt(ruleForm.threshold) : null
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Cập nhật quy tắc thành công!");
        setShowRuleForm(false);
        setEditingRule(null);
        setRuleForm({
          name: "",
          type: "bonus",
          triggerType: "late",
          amount: "",
          amountType: "fixed",
          threshold: "",
          description: "",
          priority: 0,
          isActive: true
        });
        fetchRules();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm("Are you sure you want to delete this rule?")) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/salary/rules/${ruleId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Rule deleted successfully!");
        fetchRules();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditForm = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name || "",
      type: rule.type || "bonus",
      triggerType: rule.triggerType || "late",
      amount: rule.amount || "",
      amountType: rule.amountType || "fixed",
      threshold: rule.threshold || "",
      description: rule.description || "",
      priority: rule.priority || 0,
      isActive: rule.isActive !== undefined ? rule.isActive : true
    });
    setShowRuleForm(true);
  };

  const openCreateForm = () => {
    setEditingRule(null);
    setRuleForm({
      name: "",
      type: "bonus",
      triggerType: "late",
      amount: "",
      amountType: "fixed",
      threshold: "",
      description: "",
      priority: 0,
      isActive: true
    });
    setShowRuleForm(true);
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0" }}>
      {/* Welcome Header */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#fff",
        padding: "48px 40px",
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)"
      }}>
        <h1 style={{ margin: "0 0 12px 0", fontSize: "36px", fontWeight: "700" }}>
          💰 Payroll Management
        </h1>
        <p style={{ margin: 0, fontSize: "16px", opacity: 0.95 }}>
          Manage payroll rules and employee payroll. Set up bonus/penalty rules based on attendance and automatic payroll calculation.
        </p>
      </div>

      {/* Main Content */}
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "0 0 16px 16px",
        padding: "40px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)"
      }}>
        {message && (
          <div style={{
            padding: "16px 20px",
            backgroundColor: (message.includes("successfully") || message.includes("thành công")) ? "#d4edda" : "#f8d7da",
            border: `2px solid ${(message.includes("successfully") || message.includes("thành công")) ? "#c3e6cb" : "#f5c6cb"}`,
            borderRadius: "12px",
            color: (message.includes("successfully") || message.includes("thành công")) ? "#155724" : "#721c24",
            marginBottom: "24px",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            {message}
          </div>
        )}

        {/* Modern Tabs - Only Salaries Tab (Rules Manager Hidden) */}
        <div style={{
          display: "flex",
          gap: "8px",
          marginBottom: "32px",
          borderBottom: "2px solid #e8e8e8",
          backgroundColor: "#f8f9fa",
          padding: "4px",
          borderRadius: "12px"
        }}>
          {/* Quy Tắc Lương Tab is hidden - using default payroll calculation logic */}
          <button
            onClick={() => setActiveTab("salaries")}
            style={{
              flex: 1,
              padding: "14px 24px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: activeTab === "salaries" ? "#fff" : "transparent",
              color: activeTab === "salaries" ? "#667eea" : "#666",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "15px",
              transition: "all 0.3s",
              boxShadow: activeTab === "salaries" ? "0 2px 8px rgba(0,0,0,0.1)" : "none"
            }}
          >
            Bảng Lương
          </button>
        </div>

        {/* Rules Tab */}
        {activeTab === "rules" && (
          <div>
            <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#1a1a1a" }}>
                Payroll Rules
              </h2>
              <button
                onClick={openCreateForm}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#28a745",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.2s",
                  boxShadow: "0 2px 8px rgba(40,167,69,0.3)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(40,167,69,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(40,167,69,0.3)";
                }}
              >
                Add New Rule
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "60px", color: "#666" }}>
                <div style={{ fontSize: "16px", fontWeight: "500" }}>Đang tải quy tắc...</div>
              </div>
            ) : rules.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "60px 40px",
                backgroundColor: "#f8f9fa",
                borderRadius: "12px",
                border: "2px dashed #dee2e6"
              }}>
                <div style={{ fontSize: "64px", marginBottom: "16px" }}>📋</div>
                <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
                  No rules yet
                </h3>
                <p style={{ fontSize: "14px", color: "#666" }}>
                  Add your first rule to enable automatic payroll calculation
                </p>
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                gap: "24px"
              }}>
                {rules.map(rule => (
                  <div
                    key={rule.id}
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: "16px",
                      padding: "24px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                      border: "1px solid #e8e8e8",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      overflow: "hidden"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
                    }}
                  >
                    {/* Status Badge */}
                    <div style={{
                      position: "absolute",
                      top: "16px",
                      right: "16px",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      backgroundColor: rule.isActive ? "#d4edda" : "#f8d7da",
                      color: rule.isActive ? "#155724" : "#721c24"
                    }}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </div>

                    {/* Rule Type Badge */}
                    <div style={{
                      display: "inline-block",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      marginBottom: "16px",
                      fontSize: "12px",
                      fontWeight: "700",
                      backgroundColor: rule.type === "bonus" ? "#d4edda" : "#f8d7da",
                      color: rule.type === "bonus" ? "#155724" : "#721c24"
                    }}>
                      {rule.type === "bonus" ? "Thưởng" : "Khấu trừ"}
                    </div>

                    {/* Rule Name */}
                    <h3 style={{
                      margin: "0 0 16px 0",
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#1a1a1a"
                    }}>
                      {rule.name}
                    </h3>

                    {/* Rule Details */}
                    <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "13px", color: "#666", fontWeight: "500" }}>Trigger:</span>
                        <span style={{ fontSize: "13px", color: "#1a1a1a", fontWeight: "600" }}>
                          {rule.triggerType === "late" ? "Late" :
                           rule.triggerType === "early_leave" ? "Early Leave" :
                           rule.triggerType === "overtime" ? "Overtime" :
                           rule.triggerType === "absent" ? "Absent" :
                           rule.triggerType === "full_attendance" ? "Full Attendance" :
                           rule.triggerType}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "13px", color: "#666", fontWeight: "500" }}>Amount:</span>
                        <span style={{
                          fontSize: "16px",
                          color: rule.type === "bonus" ? "#28a745" : "#dc3545",
                          fontWeight: "700"
                        }}>
                          {rule.amountType === "percentage" ? `${rule.amount}%` : formatCurrency(rule.amount)}
                        </span>
                      </div>
                      {rule.threshold && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "13px", color: "#666", fontWeight: "500" }}>Threshold:</span>
                          <span style={{ fontSize: "13px", color: "#1a1a1a", fontWeight: "600" }}>
                            {rule.threshold}
                          </span>
                        </div>
                      )}
                      {rule.description && (
                        <div style={{
                          padding: "12px",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "8px",
                          fontSize: "13px",
                          color: "#666",
                          lineHeight: "1.5"
                        }}>
                          {rule.description}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                      display: "flex",
                      gap: "8px",
                      paddingTop: "20px",
                      borderTop: "1px solid #f0f0f0"
                    }}>
                      <button
                        onClick={() => openEditForm(rule)}
                        style={{
                          flex: 1,
                          padding: "10px 16px",
                          backgroundColor: "#007bff",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "13px",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#0056b3"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#007bff"}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        style={{
                          padding: "10px 16px",
                          backgroundColor: "#dc3545",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "13px",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#c82333"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#dc3545"}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Salaries Tab */}
        {activeTab === "salaries" && (
          <div>
            {/* Filters */}
            <div style={{
              marginBottom: "32px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px"
            }}>
              <div>
                <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: "700", color: "#1a1a1a" }}>
                  Payroll for {new Date(selectedYear, selectedMonth - 1).toLocaleString("en-US", { month: "long" })} {selectedYear}
                </h2>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  {employees.length} employees • {salaries.length} payrolls • Showing {filteredSalaries.length} {filterStatus !== "all" ? `(${filterStatus})` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: "10px 16px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    backgroundColor: "#fff"
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  style={{
                    padding: "10px 16px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    backgroundColor: "#fff"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "#f5576c"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e0e0e0"}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString("en-US", { month: "long" })}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  style={{
                    padding: "10px 16px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    backgroundColor: "#fff"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "#f5576c"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e0e0e0"}
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    if (!window.confirm(`Calculate payroll for all ${employees.length} employees?`)) return;
                    setLoading(true);
                    try {
                      const token = localStorage.getItem("authToken");
                      if (!token) return;
                      
                      let successCount = 0;
                      let failCount = 0;
                      for (const emp of employees) {
                        try {
                          const res = await fetch(`${apiBase}/api/salary/calculate`, {
                            method: "POST",
                            headers: {
                              "Authorization": `Bearer ${token}`,
                              "Content-Type": "application/json"
                            },
                            body: JSON.stringify({ userId: emp.id, month: selectedMonth, year: selectedYear })
                          });
                          if (res.ok) successCount++;
                          else failCount++;
                        } catch (e) {
                          failCount++;
                        }
                      }
                      setMessage(`Payroll calculated: ${successCount}/${employees.length} employees${failCount > 0 ? ` (${failCount} errors)` : ''}`);
                      fetchSalaries();
                      setTimeout(() => setMessage(""), 5000);
                    } catch (error) {
                      setMessage("Lỗi: " + error.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || employees.length === 0}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#28a745",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: (loading || employees.length === 0) ? "not-allowed" : "pointer",
                    fontWeight: "700",
                    fontSize: "14px",
                    transition: "all 0.2s",
                    opacity: (loading || employees.length === 0) ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && employees.length > 0) {
                      e.currentTarget.style.backgroundColor = "#218838";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#28a745";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {loading ? "Calculating..." : "Calculate All"}
                </button>
                <button
                  onClick={() => exportSalariesToExcel(salaries, `payroll-${selectedMonth}-${selectedYear}`)}
                  disabled={salaries.length === 0}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#007bff",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: salaries.length === 0 ? "not-allowed" : "pointer",
                    fontWeight: "700",
                    fontSize: "14px",
                    transition: "all 0.2s",
                    opacity: salaries.length === 0 ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                  onMouseEnter={(e) => {
                    if (salaries.length > 0) {
                      e.currentTarget.style.backgroundColor = "#0056b3";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#007bff";
                  }}
                >
                  Export Excel
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "60px", color: "#666" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
                <div style={{ fontSize: "16px", fontWeight: "500" }}>Loading payroll...</div>
              </div>
            ) : filteredSalaries.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "60px 40px",
                backgroundColor: "#f8f9fa",
                borderRadius: "12px",
                border: "2px dashed #dee2e6"
              }}>
                <div style={{ fontSize: "64px", marginBottom: "16px" }}>📭</div>
                <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
                  {salaries.length === 0 ? "No payroll data" : `No ${filterStatus === "all" ? "" : filterStatus + " "}payrolls`}
                </h3>
                <p style={{ fontSize: "14px", color: "#666" }}>
                  {salaries.length === 0
                    ? `No payroll data for ${new Date(selectedYear, selectedMonth - 1).toLocaleString("en-US", { month: "long" })} ${selectedYear}`
                    : `Try changing the status filter or month/year`}
                </p>
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
                gap: "24px"
              }}>
                {paginatedSalaries.map(salary => (
                  <div
                    key={salary.id}
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: "16px",
                      padding: "28px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                      border: "1px solid #e8e8e8",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      overflow: "hidden"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
                    }}
                  >
                    {/* Status Badge */}
                    <div style={{
                      position: "absolute",
                      top: "16px",
                      right: "16px",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      backgroundColor: salary.status === "paid" ? "#d4edda" : salary.status === "approved" ? "#d1ecf1" : "#fff3cd",
                      color: salary.status === "paid" ? "#155724" : salary.status === "approved" ? "#0c5460" : "#856404"
                    }}>
                      {salary.status === "paid" ? "Paid" : salary.status === "approved" ? "Approved" : "Pending"}
                    </div>

                    {/* Employee Info */}
                    <div style={{ marginBottom: "24px" }}>
                      <div style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "14px",
                        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                        fontWeight: "700",
                        color: "#fff",
                        marginBottom: "16px"
                      }}>
                        {salary.User?.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <h3 style={{
                        margin: "0 0 6px 0",
                        fontSize: "22px",
                        fontWeight: "700",
                        color: "#1a1a1a"
                      }}>
                        {salary.User?.name || "N/A"}
                      </h3>
                      <div style={{
                        fontSize: "13px",
                        color: "#f5576c",
                        fontWeight: "600",
                        letterSpacing: "0.5px"
                      }}>
                        {salary.User?.employeeCode || "N/A"}
                      </div>
                    </div>

                    {/* Salary Breakdown - Vietnamese Standard */}
                    {(() => {
                      // Calculate salary using Vietnamese standard formula 2026
                      // Use default values if not available from backend
                      const baseSalary = parseFloat(salary.baseSalary) || 1800000; // Default base salary
                      const totalCoefficient = parseFloat(salary.User?.totalCoefficient) || parseFloat(salary.totalCoefficient) || parseFloat(salary.User?.coefficient) || parseFloat(salary.coefficient) || 1;
                      const dependents = parseInt(salary.User?.dependents) || parseInt(salary.dependents) || 0;
                      const bonus = parseFloat(salary.bonus) || 0;
                      const deduction = parseFloat(salary.deduction) || 0;
                      
                      let salaryCalc = null;
                      try {
                        salaryCalc = calculateCompleteSalary({
                          baseSalary,
                          totalCoefficient,
                          dependents,
                          bonus,
                          deduction,
                        });
                      } catch (error) {
                        console.error("Error calculating salary:", error);
                      }
                      
                      return (
                    <div style={{
                      backgroundColor: "#f8f9fa",
                      borderRadius: "12px",
                      padding: "20px",
                      marginBottom: "24px"
                    }}>
                          {/* Gross Salary Section */}
                          <div style={{ marginBottom: "20px" }}>
                            <div style={{
                              fontSize: "12px",
                              color: "#666",
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              marginBottom: "12px"
                            }}>
                              Income
                            </div>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                              marginBottom: "8px"
                      }}>
                        <span style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>Base Salary:</span>
                              <span style={{ fontSize: "15px", color: "#1a1a1a", fontWeight: "600" }}>
                                {formatCurrency(baseSalary)}
                        </span>
                      </div>
                            {totalCoefficient !== 1 && (
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                                marginBottom: "8px"
                              }}>
                                <span style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>Total coefficient: {totalCoefficient.toFixed(2)}</span>
                                <span style={{ fontSize: "15px", color: "#1a1a1a", fontWeight: "600" }}>
                                  {formatCurrency(salaryCalc?.grossSalary || baseSalary * totalCoefficient)}
                                </span>
                              </div>
                            )}
                            {bonus > 0 && (
                              <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "8px"
                      }}>
                        <span style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>Bonus:</span>
                                <span style={{ fontSize: "15px", color: "#10b981", fontWeight: "600" }}>
                                  +{formatCurrency(bonus)}
                        </span>
                      </div>
                            )}
                            {deduction > 0 && (
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                                marginBottom: "8px"
                      }}>
                        <span style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>Deduction:</span>
                                <span style={{ fontSize: "15px", color: "#ef4444", fontWeight: "600" }}>
                                  -{formatCurrency(deduction)}
                        </span>
                      </div>
                            )}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                              paddingTop: "12px",
                              marginTop: "12px",
                              borderTop: "1px solid #e0e0e0"
                            }}>
                              <span style={{ fontSize: "15px", color: "#1a1a1a", fontWeight: "700" }}>Total Income (Gross):</span>
                              <span style={{ fontSize: "18px", color: "#6366f1", fontWeight: "700" }}>
                                {formatCurrency(salaryCalc?.grossSalary || baseSalary + bonus - deduction)}
                              </span>
                            </div>
                          </div>

                          {/* Insurance Section */}
                          {salaryCalc && (
                            <>
                              <div style={{ marginBottom: "20px", paddingTop: "20px", borderTop: "1px solid #e0e0e0" }}>
                                <div style={{
                                  fontSize: "12px",
                                  color: "#666",
                                  fontWeight: "600",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                  marginBottom: "12px"
                                }}>
                                  Insurance (Employee)
                                </div>
                                <div style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: "6px"
                                }}>
                                  <span style={{ fontSize: "13px", color: "#666" }}>BHXH (8%):</span>
                                  <span style={{ fontSize: "14px", color: "#1a1a1a", fontWeight: "600" }}>
                                    {formatCurrency(salaryCalc.insurance.bhxh)}
                                  </span>
                                </div>
                                <div style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: "6px"
                                }}>
                                  <span style={{ fontSize: "13px", color: "#666" }}>BHYT (1.5%):</span>
                                  <span style={{ fontSize: "14px", color: "#1a1a1a", fontWeight: "600" }}>
                                    {formatCurrency(salaryCalc.insurance.bhyt)}
                                  </span>
                                </div>
                                <div style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: "8px"
                                }}>
                                  <span style={{ fontSize: "13px", color: "#666" }}>BHTN (1%):</span>
                                  <span style={{ fontSize: "14px", color: "#1a1a1a", fontWeight: "600" }}>
                                    {formatCurrency(salaryCalc.insurance.bhtn)}
                                  </span>
                                </div>
                                <div style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  paddingTop: "8px",
                                  marginTop: "8px",
                                  borderTop: "1px solid #e0e0e0"
                                }}>
                                  <span style={{ fontSize: "14px", color: "#666", fontWeight: "600" }}>Tổng BH:</span>
                                  <span style={{ fontSize: "15px", color: "#f59e0b", fontWeight: "700" }}>
                                    {formatCurrency(salaryCalc.insurance.total)}
                                  </span>
                                </div>
                              </div>

                              {/* Tax Section */}
                              <div style={{ marginBottom: "20px", paddingTop: "20px", borderTop: "1px solid #e0e0e0" }}>
                                <div style={{
                                  fontSize: "12px",
                                  color: "#666",
                                  fontWeight: "600",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                  marginBottom: "12px"
                                }}>
                                  PIT (Personal Income Tax)
                                </div>
                                {dependents > 0 && (
                                  <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "6px"
                                  }}>
                                    <span style={{ fontSize: "13px", color: "#666" }}>Deduction ({dependents} dependents):</span>
                                    <span style={{ fontSize: "14px", color: "#10b981", fontWeight: "600" }}>
                                      -{formatCurrency(salaryCalc.tax.personalDeduction)}
                                    </span>
                                  </div>
                                )}
                                <div style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  paddingTop: "8px",
                                  marginTop: "8px",
                                  borderTop: "1px solid #e0e0e0"
                                }}>
                                  <span style={{ fontSize: "14px", color: "#666", fontWeight: "600" }}>PIT:</span>
                                  <span style={{ fontSize: "15px", color: "#ef4444", fontWeight: "700" }}>
                                    {formatCurrency(salaryCalc.tax.pit)}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}

                          {/* Net Salary */}
                          <div style={{
                            paddingTop: "20px",
                        borderTop: "2px solid #e0e0e0",
                            marginTop: "20px"
                          }}>
                            <div style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}>
                              <span style={{ fontSize: "16px", color: "#1a1a1a", fontWeight: "700" }}>Net Pay:</span>
                        <span style={{
                                fontSize: "26px",
                                color: "#6366f1",
                                fontWeight: "800"
                              }}>
                                {formatCurrency(salaryCalc?.netSalary || salary.finalSalary)}
                        </span>
                      </div>
                    </div>
                        </div>
                      );
                    })()}

                    {/* Action Button */}
                    <button
                      onClick={() => handleCalculateSalary(salary.User?.id)}
                      style={{
                        width: "100%",
                        padding: "12px 20px",
                        backgroundColor: "#007bff",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "700",
                        fontSize: "14px",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#0056b3";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#007bff";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      Recalculate
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && salaries.length > 0 && totalPages > 1 && (
              <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                marginTop: "32px",
                paddingTop: "24px",
                borderTop: "1px solid #e8e8e8"
              }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    padding: "8px 16px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    backgroundColor: "#fff",
                    cursor: page <= 1 ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    opacity: page <= 1 ? 0.5 : 1
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#333", padding: "0 16px" }}>
                  Page {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    padding: "8px 16px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    backgroundColor: "#fff",
                    cursor: page >= totalPages ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    opacity: page >= totalPages ? 0.5 : 1
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Rule Form Modal */}
        {showRuleForm && (
          <div
            onClick={() => {
              setShowRuleForm(false);
              setEditingRule(null);
            }}
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
              zIndex: 9999
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "#fff",
                borderRadius: "16px",
                padding: "32px",
                maxWidth: "600px",
                width: "90%",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
              }}
            >
              <h2 style={{ margin: "0 0 24px 0", fontSize: "24px", fontWeight: "700", color: "#1a1a1a" }}>
                {editingRule ? "Sửa Quy Tắc" : "Tạo Quy Tắc Mới"}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#495057" }}>
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm({...ruleForm, name: e.target.value})}
                    placeholder="e.g., Deduct for late"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      transition: "all 0.2s"
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#495057" }}>
                      Loại *
                    </label>
                    <select
                      value={ruleForm.type}
                      onChange={(e) => setRuleForm({...ruleForm, type: e.target.value})}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "2px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        cursor: "pointer"
                      }}
                    >
                      <option value="bonus">Bonus</option>
                      <option value="deduction">Deduction</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#495057" }}>
                      Trigger *
                    </label>
                    <select
                      value={ruleForm.triggerType}
                      onChange={(e) => setRuleForm({...ruleForm, triggerType: e.target.value})}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "2px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        cursor: "pointer"
                      }}
                    >
                      <option value="late">Muộn</option>
                      <option value="early_leave">Về sớm</option>
                      <option value="overtime">Tăng ca</option>
                      <option value="absent">Vắng mặt</option>
                      <option value="full_attendance">Chuyên cần</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#495057" }}>
                      Amount Type *
                    </label>
                    <select
                      value={ruleForm.amountType}
                      onChange={(e) => setRuleForm({...ruleForm, amountType: e.target.value})}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "2px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        cursor: "pointer"
                      }}
                    >
                      <option value="fixed">Fixed (VND)</option>
                      <option value="percentage">% of base salary</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#495057" }}>
                      Amount / % *
                    </label>
                    <input
                      type="number"
                      value={ruleForm.amount}
                      onChange={(e) => setRuleForm({...ruleForm, amount: e.target.value})}
                      placeholder={ruleForm.amountType === "percentage" ? "e.g., 10" : "e.g., 50000"}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "2px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "14px"
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#495057" }}>
                    Threshold (optional)
                  </label>
                  <input
                    type="number"
                    value={ruleForm.threshold}
                    onChange={(e) => setRuleForm({...ruleForm, threshold: e.target.value})}
                    placeholder="e.g., Minimum late count to apply"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "14px"
                    }}
                  />
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                    Apply when count/hours {'>='} this threshold
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#495057" }}>
                    Description
                  </label>
                  <textarea
                    value={ruleForm.description}
                    onChange={(e) => setRuleForm({...ruleForm, description: e.target.value})}
                    placeholder="Describe this rule..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      resize: "vertical"
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={ruleForm.isActive}
                      onChange={(e) => setRuleForm({...ruleForm, isActive: e.target.checked})}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <label htmlFor="isActive" style={{ fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>
                      Enable rule
                    </label>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <button
                    onClick={() => {
                      setShowRuleForm(false);
                      setEditingRule(null);
                    }}
                    style={{
                      flex: 1,
                      padding: "12px 20px",
                      backgroundColor: "#6c757d",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "700",
                      fontSize: "14px",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#5a6268"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#6c757d"}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => editingRule ? handleUpdateRule(editingRule.id) : handleCreateRule()}
                    disabled={!ruleForm.name || !ruleForm.amount}
                    style={{
                      flex: 1,
                      padding: "12px 20px",
                      backgroundColor: editingRule ? "#007bff" : "#28a745",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: (!ruleForm.name || !ruleForm.amount) ? "not-allowed" : "pointer",
                      fontWeight: "700",
                      fontSize: "14px",
                      transition: "all 0.2s",
                      opacity: (!ruleForm.name || !ruleForm.amount) ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (ruleForm.name && ruleForm.amount) {
                        e.currentTarget.style.backgroundColor = editingRule ? "#0056b3" : "#218838";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = editingRule ? "#007bff" : "#28a745";
                    }}
                  >
                    {editingRule ? "Update" : "Create"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

