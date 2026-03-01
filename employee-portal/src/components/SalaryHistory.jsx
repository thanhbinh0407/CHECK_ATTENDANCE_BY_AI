import React, { useState, useEffect, useMemo } from "react";

export default function SalaryHistory({ userId }) {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSalary, setSelectedSalary] = useState(null);
  const [salaryDetails, setSalaryDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState("all"); // "all" or specific year
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "pending", "approved", "paid"

  useEffect(() => {
    fetchSalaries();
  }, [userId]);

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      if (!token) return;

      const res = await fetch(`${apiBase}/api/employee/salary`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
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

  const viewSalaryDetail = async (salary) => {
    setSelectedSalary(salary);
    setShowDetailModal(true);
    setSalaryDetails(null);
    setLoadingDetails(true);
    
    try {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");
      
      // Fetch detailed breakdown including bonus/deduction breakdown, insurance and tax
      const [breakdownRes, insuranceRes, taxRes] = await Promise.all([
        fetch(`${apiBase}/api/employee/salary/breakdown?month=${salary.month}&year=${salary.year}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null),
        fetch(`${apiBase}/api/insurance/employee?userId=${userId}&month=${salary.month}&year=${salary.year}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null),
        fetch(`${apiBase}/api/tax/calculate?userId=${userId}&month=${salary.month}&year=${salary.year}&grossSalary=${salary.baseSalary + salary.bonus}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null)
      ]);
      
      const breakdownData = breakdownRes?.ok ? await breakdownRes.json() : null;
      const insuranceData = insuranceRes?.ok ? await insuranceRes.json() : null;
      const taxData = taxRes?.ok ? await taxRes.json() : null;
      
      // Calculate breakdown
      const grossSalary = parseFloat(salary.baseSalary || 0) + parseFloat(salary.bonus || 0);
      const employeeInsurance = insuranceData?.insurance?.employee?.total || 0;
      const employerInsurance = insuranceData?.insurance?.employer?.total || 0;
      const tax = taxData?.taxAmount || 0;
      const deductions = parseFloat(salary.deduction || 0);
      const netSalary = grossSalary - employeeInsurance - tax - deductions;
      
      setSalaryDetails({
        grossSalary,
        baseSalary: parseFloat(salary.baseSalary || 0),
        bonus: parseFloat(salary.bonus || 0),
        bonusBreakdown: breakdownData?.breakdown?.bonusBreakdown || [],
        deductionBreakdown: breakdownData?.breakdown?.deductionBreakdown || [],
        employeeInsurance,
        employerInsurance,
        tax,
        deductions,
        netSalary,
        insuranceBreakdown: insuranceData?.insurance || null,
        taxBreakdown: taxData || null,
        attendance: breakdownData?.breakdown?.attendance || null
      });
    } catch (error) {
      console.error("Error fetching salary details:", error);
      // Fallback to basic calculation
      const grossSalary = parseFloat(salary.baseSalary || 0) + parseFloat(salary.bonus || 0);
      const deductions = parseFloat(salary.deduction || 0);
      setSalaryDetails({
        grossSalary,
        baseSalary: parseFloat(salary.baseSalary || 0),
        bonus: parseFloat(salary.bonus || 0),
        bonusBreakdown: [],
        deductionBreakdown: [],
        employeeInsurance: 0,
        employerInsurance: 0,
        tax: 0,
        deductions,
        netSalary: grossSalary - deductions,
        insuranceBreakdown: null,
        taxBreakdown: null,
        attendance: null
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { backgroundColor: "#ff9800", color: "#fff" },
      approved: { backgroundColor: "#2196f3", color: "#fff" },
      paid: { backgroundColor: "#28a745", color: "#fff" }
    };
    const labels = {
      pending: "PENDING APPROVAL",
      approved: "APPROVED",
      paid: "PAID"
    };
    const style = styles[status] || styles.pending;
    return (
      <span style={{
        ...style,
        padding: "5px 14px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "0.5px"
      }}>
        {labels[status] || status}
      </span>
    );
  };

  // Filter and sort salaries
  const filteredSalaries = useMemo(() => {
    let filtered = [...salaries];
    
    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(s => s.status === statusFilter);
    }
    
    // Filter by year (only if specific year is selected)
    if (selectedYear !== "all") {
      filtered = filtered.filter(s => s.year === selectedYear);
    }
    
    // Sort by month (newest first)
    filtered.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });
    
    return filtered;
  }, [salaries, statusFilter, selectedYear]);

  // Calculate statistics
  const stats = useMemo(() => {
    const yearSalaries = selectedYear === "all" ? salaries : salaries.filter(s => s.year === selectedYear);
    const totalEarnings = yearSalaries.reduce((sum, s) => {
      const salary = parseFloat(s.finalSalary) || 0;
      return sum + salary;
    }, 0);
    const pendingCount = yearSalaries.filter(s => s.status === "pending").length;
    const approvedCount = yearSalaries.filter(s => s.status === "approved").length;
    const paidCount = yearSalaries.filter(s => s.status === "paid").length;
    
    return { totalEarnings, pendingCount, approvedCount, paidCount };
  }, [salaries, selectedYear]);

  // Get available years from salary data
  const years = useMemo(() => {
    const yearSet = new Set(salaries.map(s => s.year));
    const yearArray = Array.from(yearSet).sort((a, b) => b - a);
    return yearArray;
  }, [salaries]);

  return (
    <div style={{
      backgroundColor: "#f8f9fa",
      minHeight: "100vh",
      padding: "24px"
    }}>
      {/* Header Section */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "16px",
        padding: "24px 32px",
        marginBottom: "24px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}>
          <div>
            <h2 style={{ 
              margin: "0 0 8px 0", 
              fontSize: "28px", 
              fontWeight: "700", 
              color: "#1a1a1a"
            }}>
              Salary History
            </h2>
            <p style={{ 
              margin: 0, 
              color: "#666", 
              fontSize: "14px" 
            }}>
              View your monthly salary records and payment status
            </p>
          </div>
          
          {/* Filter Controls */}
          <div style={{ 
            display: "flex", 
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center"
          }}>
            <select
              value={selectedYear}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedYear(value === "all" ? "all" : parseInt(value));
              }}
              style={{
                padding: "10px 16px",
                border: "2px solid #e0e0e0",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer",
                backgroundColor: "#fff",
                fontWeight: "500",
                transition: "all 0.2s"
              }}
            >
              <option value="all">All Years</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ 
          marginTop: "20px",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap"
        }}>
          {[
            { value: "all", label: "All Records" },
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "paid", label: "Paid" }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              style={{
                padding: "8px 20px",
                backgroundColor: statusFilter === tab.value ? "#1976d2" : "#f5f5f5",
                color: statusFilter === tab.value ? "#fff" : "#333",
                border: statusFilter === tab.value ? "2px solid #1976d2" : "2px solid #e0e0e0",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Cards */}
      {!loading && filteredSalaries.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "24px",
          marginBottom: "32px"
        }}>
          {/* Total Earnings */}
          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: "16px",
            padding: "28px 24px",
            boxShadow: "0 8px 24px rgba(102, 126, 234, 0.25)",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.3s ease",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.25)";
          }}>
            <div style={{
              position: "absolute",
              top: "-20px",
              right: "-20px",
              width: "100px",
              height: "100px",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: "50%"
            }}></div>
            
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "16px"
            }}>
              <div style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "rgba(255,255,255,0.9)",
                textTransform: "uppercase",
                letterSpacing: "1px"
              }}>
                Total Earnings
              </div>
              <div style={{
                width: "48px",
                height: "48px",
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(10px)"
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
            </div>
            
            <div style={{
              fontSize: "24px",
              fontWeight: "800",
              color: "#fff",
              lineHeight: "1.2",
              marginBottom: "4px"
            }}>
              {!isNaN(stats.totalEarnings) && stats.totalEarnings !== undefined ? formatCurrency(stats.totalEarnings) : "0 ₫"}
            </div>
            
            <div style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.8)",
              fontWeight: "500"
            }}>
              Total compensation
            </div>
          </div>

          {/* Pending */}
          <div style={{
            background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            borderRadius: "16px",
            padding: "28px 24px",
            boxShadow: "0 8px 24px rgba(240, 147, 251, 0.25)",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.3s ease",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 12px 32px rgba(240, 147, 251, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(240, 147, 251, 0.25)";
          }}>
            <div style={{
              position: "absolute",
              top: "-20px",
              right: "-20px",
              width: "100px",
              height: "100px",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: "50%"
            }}></div>
            
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "16px"
            }}>
              <div style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "rgba(255,255,255,0.9)",
                textTransform: "uppercase",
                letterSpacing: "1px"
              }}>
                Pending
              </div>
              <div style={{
                width: "48px",
                height: "48px",
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(10px)"
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
            </div>
            
            <div style={{
              fontSize: "40px",
              fontWeight: "800",
              color: "#fff",
              lineHeight: "1",
              marginBottom: "4px"
            }}>
              {stats.pendingCount}
            </div>
            
            <div style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.8)",
              fontWeight: "500"
            }}>
              Awaiting approval
            </div>
          </div>

          {/* Approved */}
          <div style={{
            background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
            borderRadius: "16px",
            padding: "28px 24px",
            boxShadow: "0 8px 24px rgba(79, 172, 254, 0.25)",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.3s ease",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 12px 32px rgba(79, 172, 254, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(79, 172, 254, 0.25)";
          }}>
            <div style={{
              position: "absolute",
              top: "-20px",
              right: "-20px",
              width: "100px",
              height: "100px",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: "50%"
            }}></div>
            
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "16px"
            }}>
              <div style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "rgba(255,255,255,0.9)",
                textTransform: "uppercase",
                letterSpacing: "1px"
              }}>
                Approved
              </div>
              <div style={{
                width: "48px",
                height: "48px",
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(10px)"
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
            
            <div style={{
              fontSize: "40px",
              fontWeight: "800",
              color: "#fff",
              lineHeight: "1",
              marginBottom: "4px"
            }}>
              {stats.approvedCount}
            </div>
            
            <div style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.8)",
              fontWeight: "500"
            }}>
              Ready for payment
            </div>
          </div>

          {/* Paid */}
          <div style={{
            background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
            borderRadius: "16px",
            padding: "28px 24px",
            boxShadow: "0 8px 24px rgba(67, 233, 123, 0.25)",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.3s ease",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 12px 32px rgba(67, 233, 123, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(67, 233, 123, 0.25)";
          }}>
            <div style={{
              position: "absolute",
              top: "-20px",
              right: "-20px",
              width: "100px",
              height: "100px",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: "50%"
            }}></div>
            
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "16px"
            }}>
              <div style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "rgba(255,255,255,0.9)",
                textTransform: "uppercase",
                letterSpacing: "1px"
              }}>
                Paid
              </div>
              <div style={{
                width: "48px",
                height: "48px",
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(10px)"
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
            </div>
            
            <div style={{
              fontSize: "40px",
              fontWeight: "800",
              color: "#fff",
              lineHeight: "1",
              marginBottom: "4px"
            }}>
              {stats.paidCount}
            </div>
            
            <div style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.8)",
              fontWeight: "500"
            }}>
              Completed payments
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "16px",
        padding: "32px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
      }}>
        {loading ? (
          <div style={{ 
            textAlign: "center", 
            padding: "60px 20px",
            color: "#666"
          }}>
            <div style={{
              width: "50px",
              height: "50px",
              border: "4px solid #f0f0f0",
              borderTop: "4px solid #1976d2",
              borderRadius: "50%",
              margin: "0 auto 16px",
              animation: "spin 1s linear infinite"
            }}></div>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "500" }}>Loading salary data...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : filteredSalaries.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "60px 20px",
            color: "#999"
          }}>
            <div style={{ fontSize: "64px", marginBottom: "16px", opacity: 0.3 }}>—</div>
            <p style={{ 
              margin: "0 0 8px 0", 
              fontSize: "18px", 
              fontWeight: "600",
              color: "#666"
            }}>
              No Salary Records
            </p>
            <p style={{ margin: 0, fontSize: "14px", color: "#999" }}>
              No salary records found for the selected filters
            </p>
          </div>
        ) : (
          <table style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "0",
            border: "1px solid #868e96",
            borderRadius: "8px",
            overflow: "hidden"
          }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                <th style={{
                  padding: "16px",
                  textAlign: "left",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderRight: "1px solid #868e96",
                  borderTopLeftRadius: "8px"
                }}>
                  Period
                </th>
                <th style={{
                  padding: "16px",
                  textAlign: "center",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderRight: "1px solid #868e96"
                }}>
                  Status
                </th>
                <th style={{
                  padding: "16px",
                  textAlign: "right",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderRight: "1px solid #868e96"
                }}>
                  Base Salary
                </th>
                <th style={{
                  padding: "16px",
                  textAlign: "right",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderRight: "1px solid #868e96"
                }}>
                  Bonus
                </th>
                <th style={{
                  padding: "16px",
                  textAlign: "right",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderRight: "1px solid #868e96"
                }}>
                  Deductions
                </th>
                <th style={{
                  padding: "16px",
                  textAlign: "right",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderRight: "1px solid #868e96"
                }}>
                  Net Pay
                </th>
                <th style={{
                  padding: "16px",
                  textAlign: "center",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderTopRightRadius: "8px"
                }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSalaries.map((salary, index) => {
                const isLastRow = index === filteredSalaries.length - 1;
                return (
                  <tr 
                    key={salary.id}
                    style={{ 
                      backgroundColor: "#fff",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onClick={() => viewSalaryDetail(salary)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#fff";
                    }}
                  >
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#333",
                      borderBottomLeftRadius: isLastRow ? "8px" : "0"
                    }}>
                      {new Date(salary.year, salary.month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      textAlign: "center"
                    }}>
                      {getStatusBadge(salary.status)}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      color: "#333",
                      textAlign: "right",
                      fontWeight: "500"
                    }}>
                      {formatCurrency(salary.baseSalary)}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      color: "#28a745",
                      textAlign: "right",
                      fontWeight: "600"
                    }}>
                      +{formatCurrency(salary.bonus)}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      color: "#dc3545",
                      textAlign: "right",
                      fontWeight: "600"
                    }}>
                      -{formatCurrency(salary.deduction)}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "16px",
                      color: "#28a745",
                      textAlign: "right",
                      fontWeight: "700"
                    }}>
                      {formatCurrency(salary.finalSalary)}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      textAlign: "center",
                      borderBottomRightRadius: isLastRow ? "8px" : "0"
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewSalaryDetail(salary);
                        }}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "#1976d2",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "600",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#1565c0";
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(25,118,210,0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#1976d2";
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Salary Detail Modal */}
      {showDetailModal && selectedSalary && (
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
            zIndex: 1000,
            padding: "20px"
          }}
          onClick={() => {
            setShowDetailModal(false);
            setSelectedSalary(null);
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "0",
              maxWidth: "650px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ 
              padding: "24px 32px",
              borderBottom: "2px solid #f0f0f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8f9fa"
            }}>
              <div>
                <h2 style={{ 
                  margin: "0 0 4px 0", 
                  fontSize: "24px", 
                  fontWeight: "700", 
                  color: "#1a1a1a",
                  letterSpacing: "-0.5px"
                }}>
                  Salary Details
                </h2>
                <p style={{ 
                  margin: 0, 
                  fontSize: "14px", 
                  color: "#666",
                  fontWeight: "500"
                }}>
                  {new Date(selectedSalary.year, selectedSalary.month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedSalary(null);
                }}
                style={{
                  background: "none",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  width: "40px",
                  height: "40px",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#666",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f5f5f5";
                  e.currentTarget.style.borderColor = "#999";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.borderColor = "#e0e0e0";
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "32px" }}>
              {/* Status Section */}
              <div style={{ 
                marginBottom: "28px",
                padding: "20px",
                backgroundColor: "#f8f9fa",
                borderRadius: "12px",
                borderLeft: "4px solid #1976d2"
              }}>
                <div style={{ 
                  fontSize: "11px", 
                  color: "#666", 
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  fontWeight: "600",
                  letterSpacing: "0.8px"
                }}>
                  Payment Status
                </div>
                <div>{getStatusBadge(selectedSalary.status)}</div>
              </div>

              {loadingDetails ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <div style={{ fontSize: "14px", color: "#666" }}>Loading detailed breakdown...</div>
                </div>
              ) : (
                <>
                  {/* Earnings Section */}
                  <div style={{ marginBottom: "28px" }}>
                    <h3 style={{ 
                      fontSize: "16px", 
                      fontWeight: "700", 
                      marginBottom: "16px", 
                      color: "#1a1a1a",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span style={{ 
                        width: "4px", 
                        height: "20px", 
                        backgroundColor: "#28a745",
                        borderRadius: "2px"
                      }}></span>
                      Earnings
                    </h3>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      marginBottom: "12px", 
                      padding: "16px 20px", 
                      backgroundColor: "#f8f9fa", 
                      borderRadius: "8px",
                      border: "1px solid #e0e0e0"
                    }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "500", color: "#333", marginBottom: "4px" }}>Base Salary</div>
                        <div style={{ fontSize: "11px", color: "#666" }}>Lương cơ bản theo hợp đồng</div>
                      </div>
                      <strong style={{ fontSize: "18px", fontWeight: "700", color: "#1a1a1a" }}>
                        {formatCurrency(salaryDetails?.baseSalary || selectedSalary.baseSalary)}
                      </strong>
                    </div>
                    {salaryDetails?.bonusBreakdown && salaryDetails.bonusBreakdown.length > 0 ? (
                      salaryDetails.bonusBreakdown.map((item, idx) => (
                        <div key={idx} style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "flex-start",
                          marginBottom: "12px",
                          padding: "16px 20px", 
                          backgroundColor: "#e8f5e9", 
                          borderRadius: "8px",
                          border: "1px solid #c8e6c9"
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#333", marginBottom: "4px" }}>
                              {item.ruleName || "Bonus"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#666", lineHeight: "1.5", marginBottom: "4px" }}>
                              {item.reason || item.ruleDescription || "Thưởng theo hiệu suất công việc"}
                            </div>
                            {item.quantity > 0 && (
                              <div style={{ fontSize: "10px", color: "#888", fontStyle: "italic" }}>
                                Số lượng: {item.quantity} {item.triggerType === 'overtime' ? 'giờ' : item.triggerType === 'absent' ? 'ngày' : 'lần'}
                                {item.amountType === 'percentage' && ` (${item.amount / salaryDetails.baseSalary * 100}% lương cơ bản)`}
                              </div>
                            )}
                          </div>
                          <strong style={{ fontSize: "18px", fontWeight: "700", color: "#28a745", marginLeft: "16px" }}>
                            +{formatCurrency(item.amount)}
                          </strong>
                        </div>
                      ))
                    ) : salaryDetails?.bonus > 0 ? (
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        padding: "16px 20px", 
                        backgroundColor: "#e8f5e9", 
                        borderRadius: "8px",
                        border: "1px solid #c8e6c9"
                      }}>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "500", color: "#333", marginBottom: "4px" }}>Bonus</div>
                          <div style={{ fontSize: "11px", color: "#666" }}>
                            {selectedSalary.notes || "Thưởng theo hiệu suất công việc"}
                          </div>
                        </div>
                        <strong style={{ fontSize: "18px", fontWeight: "700", color: "#28a745" }}>
                          +{formatCurrency(salaryDetails.bonus)}
                        </strong>
                      </div>
                    ) : null}
                    {/* Gross Salary Summary */}
                    <div style={{ 
                      marginTop: "12px",
                      padding: "20px", 
                      backgroundColor: "#e3f2fd", 
                      borderRadius: "8px",
                      border: "2px solid #1976d2"
                    }}>
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        marginBottom: "16px"
                      }}>
                        <div>
                          <div style={{ fontSize: "16px", fontWeight: "700", color: "#1976d2", marginBottom: "4px" }}>
                            Tổng Thu Nhập (Gross Salary)
                          </div>
                          <div style={{ fontSize: "12px", color: "#666" }}>Tổng thu nhập trước thuế và bảo hiểm</div>
                        </div>
                        <strong style={{ fontSize: "24px", fontWeight: "700", color: "#1976d2" }}>
                          {formatCurrency(salaryDetails?.grossSalary || (parseFloat(selectedSalary.baseSalary || 0) + parseFloat(selectedSalary.bonus || 0)))}
                        </strong>
                      </div>
                      
                      {/* Detailed Calculation */}
                      <div style={{ 
                        paddingTop: "16px", 
                        borderTop: "2px solid rgba(25, 118, 210, 0.3)",
                        backgroundColor: "#fff",
                        borderRadius: "8px",
                        padding: "16px",
                        marginTop: "12px"
                      }}>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: "#1976d2", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Chi Tiết Tính Toán:
                        </div>
                        <div style={{ fontSize: "13px", color: "#333", lineHeight: "2", fontFamily: "monospace" }}>
                          <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between" }}>
                            <span>Lương cơ bản:</span>
                            <strong style={{ color: "#333" }}>{formatCurrency(salaryDetails?.baseSalary || selectedSalary.baseSalary || 0)}</strong>
                          </div>
                          {salaryDetails?.bonusBreakdown && salaryDetails.bonusBreakdown.length > 0 ? (
                            <>
                              {salaryDetails.bonusBreakdown.map((item, idx) => (
                                <div key={idx} style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", paddingLeft: "16px" }}>
                                  <span style={{ color: "#28a745" }}>+ {item.ruleName}:</span>
                                  <strong style={{ color: "#28a745" }}>{formatCurrency(item.amount)}</strong>
                                </div>
                              ))}
                              <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #e0e0e0", display: "flex", justifyContent: "space-between", fontWeight: "600" }}>
                                <span>Tổng thưởng:</span>
                                <strong style={{ color: "#28a745" }}>
                                  {formatCurrency(salaryDetails.bonusBreakdown.reduce((sum, item) => sum + item.amount, 0))}
                                </strong>
                              </div>
                            </>
                          ) : salaryDetails?.bonus > 0 ? (
                            <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", paddingLeft: "16px" }}>
                              <span style={{ color: "#28a745" }}>+ Thưởng:</span>
                              <strong style={{ color: "#28a745" }}>{formatCurrency(salaryDetails.bonus)}</strong>
                            </div>
                          ) : null}
                          <div style={{ 
                            marginTop: "12px", 
                            paddingTop: "12px", 
                            borderTop: "2px solid #1976d2",
                            display: "flex", 
                            justifyContent: "space-between",
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "#1976d2"
                          }}>
                            <span>= Tổng thu nhập (Gross Salary):</span>
                            <strong>{formatCurrency(salaryDetails?.grossSalary || (parseFloat(selectedSalary.baseSalary || 0) + parseFloat(selectedSalary.bonus || 0)))}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Section */}
                  <div style={{ marginBottom: "28px" }}>
                    <h3 style={{ 
                      fontSize: "16px", 
                      fontWeight: "700", 
                      marginBottom: "16px", 
                      color: "#1a1a1a",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span style={{ 
                        width: "4px", 
                        height: "20px", 
                        backgroundColor: "#dc3545",
                        borderRadius: "2px"
                      }}></span>
                      Deductions
                    </h3>
                    
                    {/* Insurance Breakdown - Individual Items */}
                    {salaryDetails?.insuranceBreakdown?.employee && (
                      <>
                        {salaryDetails.insuranceBreakdown.employee.socialInsurance > 0 && (
                          <div style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "flex-start",
                            marginBottom: "12px",
                            padding: "16px 20px", 
                            backgroundColor: "#fff3e0", 
                            borderRadius: "8px",
                            border: "1px solid #ffcc80"
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "14px", fontWeight: "600", color: "#333", marginBottom: "4px" }}>
                                Bảo Hiểm Xã Hội (BHXH)
                              </div>
                              <div style={{ fontSize: "11px", color: "#666", lineHeight: "1.5" }}>
                                8% lương cơ bản ({formatCurrency(salaryDetails.baseSalary)} × 8%)
                              </div>
                            </div>
                            <strong style={{ fontSize: "18px", fontWeight: "700", color: "#f57c00", marginLeft: "16px" }}>
                              -{formatCurrency(salaryDetails.insuranceBreakdown.employee.socialInsurance)}
                            </strong>
                          </div>
                        )}
                        {salaryDetails.insuranceBreakdown.employee.healthInsurance > 0 && (
                          <div style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "flex-start",
                            marginBottom: "12px",
                            padding: "16px 20px", 
                            backgroundColor: "#fff3e0", 
                            borderRadius: "8px",
                            border: "1px solid #ffcc80"
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "14px", fontWeight: "600", color: "#333", marginBottom: "4px" }}>
                                Bảo Hiểm Y Tế (BHYT)
                              </div>
                              <div style={{ fontSize: "11px", color: "#666", lineHeight: "1.5" }}>
                                1.5% lương cơ bản ({formatCurrency(salaryDetails.baseSalary)} × 1.5%)
                              </div>
                            </div>
                            <strong style={{ fontSize: "18px", fontWeight: "700", color: "#f57c00", marginLeft: "16px" }}>
                              -{formatCurrency(salaryDetails.insuranceBreakdown.employee.healthInsurance)}
                            </strong>
                          </div>
                        )}
                        {salaryDetails.insuranceBreakdown.employee.unemploymentInsurance > 0 && (
                          <div style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "flex-start",
                            marginBottom: "12px",
                            padding: "16px 20px", 
                            backgroundColor: "#fff3e0", 
                            borderRadius: "8px",
                            border: "1px solid #ffcc80"
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "14px", fontWeight: "600", color: "#333", marginBottom: "4px" }}>
                                Bảo Hiểm Thất Nghiệp (BHTN)
                              </div>
                              <div style={{ fontSize: "11px", color: "#666", lineHeight: "1.5" }}>
                                1% lương cơ bản ({formatCurrency(salaryDetails.baseSalary)} × 1%)
                              </div>
                            </div>
                            <strong style={{ fontSize: "18px", fontWeight: "700", color: "#f57c00", marginLeft: "16px" }}>
                              -{formatCurrency(salaryDetails.insuranceBreakdown.employee.unemploymentInsurance)}
                            </strong>
                          </div>
                        )}
                        {salaryDetails.employeeInsurance > 0 && (
                          <div style={{ 
                            marginTop: "8px",
                            padding: "12px 16px", 
                            backgroundColor: "#ffe0b2", 
                            borderRadius: "8px",
                            border: "1px solid #ffcc80",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}>
                            <div style={{ fontSize: "13px", fontWeight: "600", color: "#e65100" }}>
                              Tổng Bảo Hiểm (Nhân Viên)
                            </div>
                            <strong style={{ fontSize: "16px", fontWeight: "700", color: "#e65100" }}>
                              -{formatCurrency(salaryDetails.employeeInsurance)}
                            </strong>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Fallback if insurance breakdown not available */}
                    {!salaryDetails?.insuranceBreakdown?.employee && salaryDetails?.employeeInsurance > 0 && (
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        marginBottom: "12px",
                        padding: "16px 20px", 
                        backgroundColor: "#fff3e0", 
                        borderRadius: "8px",
                        border: "1px solid #ffcc80"
                      }}>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "500", color: "#333", marginBottom: "4px" }}>Social Insurance (Employee)</div>
                          <div style={{ fontSize: "11px", color: "#666" }}>
                            Bảo hiểm xã hội, y tế, thất nghiệp (8% lương cơ bản)
                          </div>
                        </div>
                        <strong style={{ fontSize: "18px", fontWeight: "700", color: "#f57c00" }}>
                          -{formatCurrency(salaryDetails.employeeInsurance)}
                        </strong>
                      </div>
                    )}
                    
                    {/* Tax Breakdown - Individual Items */}
                    {salaryDetails?.taxBreakdown && salaryDetails.tax > 0 && (
                      <>
                        <div style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "flex-start",
                          marginBottom: "12px",
                          padding: "16px 20px", 
                          backgroundColor: "#ffebee", 
                          borderRadius: "8px",
                          border: "1px solid #ffcdd2"
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#333", marginBottom: "4px" }}>
                              Thuế Thu Nhập Cá Nhân (TNCN)
                            </div>
                            <div style={{ fontSize: "11px", color: "#666", lineHeight: "1.5", marginBottom: "4px" }}>
                              Thu nhập chịu thuế: {formatCurrency(salaryDetails.taxBreakdown.taxableIncome || 0)}
                            </div>
                            {salaryDetails.taxBreakdown.taxRate && (
                              <div style={{ fontSize: "11px", color: "#666", lineHeight: "1.5" }}>
                                Thuế suất: {salaryDetails.taxBreakdown.taxRate}%
                                {salaryDetails.taxBreakdown.taxBrackets && salaryDetails.taxBreakdown.taxBrackets.length > 0 && (
                                  <div style={{ marginTop: "4px", paddingLeft: "8px", fontSize: "10px", color: "#888" }}>
                                    {salaryDetails.taxBreakdown.taxBrackets.map((bracket, idx) => (
                                      <div key={idx} style={{ marginBottom: "2px" }}>
                                        Bậc {idx + 1}: {formatCurrency(bracket.amount)} (tỷ lệ: {bracket.rate}%)
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <strong style={{ fontSize: "18px", fontWeight: "700", color: "#dc3545", marginLeft: "16px" }}>
                            -{formatCurrency(salaryDetails.tax)}
                          </strong>
                        </div>
                      </>
                    )}
                    
                    {/* Fallback if tax breakdown not available */}
                    {!salaryDetails?.taxBreakdown && salaryDetails?.tax > 0 && (
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        marginBottom: "12px",
                        padding: "16px 20px", 
                        backgroundColor: "#ffebee", 
                        borderRadius: "8px",
                        border: "1px solid #ffcdd2"
                      }}>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "500", color: "#333", marginBottom: "4px" }}>Personal Income Tax</div>
                          <div style={{ fontSize: "11px", color: "#666" }}>
                            Thuế thu nhập cá nhân (theo biểu thuế lũy tiến)
                          </div>
                        </div>
                        <strong style={{ fontSize: "18px", fontWeight: "700", color: "#dc3545" }}>
                          -{formatCurrency(salaryDetails.tax)}
                        </strong>
                      </div>
                    )}
                    
                    {salaryDetails?.deductionBreakdown && salaryDetails.deductionBreakdown.length > 0 ? (
                      salaryDetails.deductionBreakdown.map((item, idx) => (
                        <div key={idx} style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "flex-start",
                          marginBottom: "12px",
                          padding: "16px 20px", 
                          backgroundColor: "#ffebee", 
                          borderRadius: "8px",
                          border: "1px solid #ffcdd2"
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#333", marginBottom: "4px" }}>
                              {item.ruleName || "Khấu trừ"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#666", lineHeight: "1.5", marginBottom: "4px" }}>
                              {item.reason || item.ruleDescription || "Khấu trừ theo quy định"}
                            </div>
                            {item.quantity > 0 && (
                              <div style={{ fontSize: "10px", color: "#888", fontStyle: "italic" }}>
                                Số lượng: {item.quantity} {item.triggerType === 'overtime' ? 'giờ' : item.triggerType === 'absent' ? 'ngày' : 'lần'}
                                {item.amountType === 'percentage' && ` (${item.amount / salaryDetails.baseSalary * 100}% lương cơ bản)`}
                              </div>
                            )}
                          </div>
                          <strong style={{ fontSize: "18px", fontWeight: "700", color: "#dc3545", marginLeft: "16px" }}>
                            -{formatCurrency(item.amount)}
                          </strong>
                        </div>
                      ))
                    ) : salaryDetails?.deductions > 0 ? (
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        padding: "16px 20px", 
                        backgroundColor: "#ffebee", 
                        borderRadius: "8px",
                        border: "1px solid #ffcdd2"
                      }}>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "500", color: "#333", marginBottom: "4px" }}>Other Deductions</div>
                          <div style={{ fontSize: "11px", color: "#666" }}>
                            {selectedSalary.notes || "Các khoản khấu trừ khác (đi muộn, vắng mặt, v.v.)"}
                          </div>
                        </div>
                        <strong style={{ fontSize: "18px", fontWeight: "700", color: "#dc3545" }}>
                          -{formatCurrency(salaryDetails.deductions)}
                        </strong>
                      </div>
                    ) : null}
                    
                    {(!salaryDetails || (salaryDetails.employeeInsurance === 0 && salaryDetails.tax === 0 && salaryDetails.deductions === 0)) && (
                      <div style={{ 
                        padding: "16px 20px", 
                        backgroundColor: "#f5f5f5", 
                        borderRadius: "8px",
                        border: "1px solid #e0e0e0",
                        textAlign: "center",
                        color: "#999",
                        fontSize: "14px"
                      }}>
                        No deductions this month
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Net Pay Section */}
              <div style={{ 
                borderTop: "3px solid #A2B9ED", 
                paddingTop: "24px", 
                marginTop: "28px",
                background: "linear-gradient(135deg, rgba(162, 185, 237, 0.1) 0%, rgba(162, 185, 237, 0.05) 100%)",
                padding: "24px",
                borderRadius: "12px",
                border: "1px solid rgba(162, 185, 237, 0.2)"
              }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  marginBottom: "12px"
                }}>
                  <div>
                    <div style={{ 
                      fontSize: "14px", 
                      fontWeight: "600",
                      color: "#666",
                      marginBottom: "4px"
                    }}>
                      Lương thực nhận
                    </div>
                    <div style={{ 
                      fontSize: "12px", 
                      color: "#999"
                    }}>
                      Net Pay
                    </div>
                  </div>
                  <strong style={{ 
                    fontSize: "36px", 
                    fontWeight: "700", 
                    color: "#A2B9ED",
                    letterSpacing: "-1px"
                  }}>
                    {formatCurrency(salaryDetails?.netSalary || selectedSalary.finalSalary)}
                  </strong>
                </div>
                {salaryDetails && (
                  <div style={{ 
                    marginTop: "20px",
                    padding: "20px",
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    border: "1px solid #e0e0e0"
                  }}>
                    <div style={{ 
                      fontSize: "14px", 
                      fontWeight: "600", 
                      color: "#333", 
                      marginBottom: "20px",
                      paddingBottom: "12px",
                      borderBottom: "2px solid #f0f0f0"
                    }}>
                      📊 Chi Tiết Tính Toán
                    </div>
                    
                    {/* Gross Salary */}
                    <div style={{ 
                      marginBottom: "16px",
                      padding: "12px 16px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "8px"
                    }}>
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span style={{ fontSize: "14px", color: "#666" }}>Tổng thu nhập</span>
                        <strong style={{ fontSize: "16px", color: "#1976d2", fontWeight: "600" }}>
                          {formatCurrency(salaryDetails.grossSalary)}
                        </strong>
                      </div>
                    </div>

                    {/* Deductions Summary */}
                    {(salaryDetails.employeeInsurance > 0 || salaryDetails.tax > 0 || salaryDetails.deductions > 0) && (
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ 
                          fontSize: "13px", 
                          color: "#666", 
                          marginBottom: "10px",
                          fontWeight: "500"
                        }}>
                          Khấu trừ:
                        </div>
                        
                        {salaryDetails.employeeInsurance > 0 && (
                          <div style={{ 
                            display: "flex", 
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            marginBottom: "6px",
                            backgroundColor: "#fff3e0",
                            borderRadius: "6px"
                          }}>
                            <span style={{ fontSize: "13px", color: "#666" }}>Bảo hiểm</span>
                            <strong style={{ fontSize: "14px", color: "#f57c00", fontWeight: "600" }}>
                              -{formatCurrency(salaryDetails.employeeInsurance)}
                            </strong>
                          </div>
                        )}
                        
                        {salaryDetails.tax > 0 && (
                          <div style={{ 
                            display: "flex", 
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            marginBottom: "6px",
                            backgroundColor: "#ffebee",
                            borderRadius: "6px"
                          }}>
                            <span style={{ fontSize: "13px", color: "#666" }}>Thuế TNCN</span>
                            <strong style={{ fontSize: "14px", color: "#dc3545", fontWeight: "600" }}>
                              -{formatCurrency(salaryDetails.tax)}
                            </strong>
                          </div>
                        )}
                        
                        {salaryDetails.deductionBreakdown && salaryDetails.deductionBreakdown.length > 0 ? (
                          salaryDetails.deductionBreakdown.map((item, idx) => (
                            <div key={idx} style={{ 
                              display: "flex", 
                              justifyContent: "space-between",
                              padding: "8px 12px",
                              marginBottom: "6px",
                              backgroundColor: "#ffebee",
                              borderRadius: "6px"
                            }}>
                              <span style={{ fontSize: "13px", color: "#666" }}>{item.ruleName}</span>
                              <strong style={{ fontSize: "14px", color: "#dc3545", fontWeight: "600" }}>
                                -{formatCurrency(item.amount)}
                              </strong>
                            </div>
                          ))
                        ) : salaryDetails.deductions > 0 ? (
                          <div style={{ 
                            display: "flex", 
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            marginBottom: "6px",
                            backgroundColor: "#ffebee",
                            borderRadius: "6px"
                          }}>
                            <span style={{ fontSize: "13px", color: "#666" }}>Khấu trừ khác</span>
                            <strong style={{ fontSize: "14px", color: "#dc3545", fontWeight: "600" }}>
                              -{formatCurrency(salaryDetails.deductions)}
                            </strong>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Net Salary */}
                    <div style={{ 
                      marginTop: "16px",
                      paddingTop: "16px",
                      borderTop: "2px solid #A2B9ED",
                      display: "flex", 
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <span style={{ 
                        fontSize: "16px", 
                        fontWeight: "600",
                        color: "#333"
                      }}>
                        Lương thực nhận
                      </span>
                      <strong style={{ 
                        fontSize: "20px", 
                        fontWeight: "700",
                        color: "#A2B9ED"
                      }}>
                        {formatCurrency(salaryDetails.netSalary)}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes Section */}
              {selectedSalary.notes && (
                <div style={{ 
                  marginTop: "24px", 
                  padding: "20px", 
                  backgroundColor: "#fffbea", 
                  borderRadius: "12px",
                  border: "1px solid #ffe082",
                  borderLeft: "4px solid #ff9800"
                }}>
                  <div style={{ 
                    fontSize: "11px", 
                    fontWeight: "700", 
                    marginBottom: "8px",
                    color: "#666",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px"
                  }}>
                    Note
                  </div>
                  <div style={{ fontSize: "14px", color: "#666", lineHeight: "1.6" }}>
                    {selectedSalary.notes}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              {selectedSalary.calculatedAt && (
                <div style={{ 
                  marginTop: "20px", 
                  fontSize: "12px", 
                  color: "#999", 
                  textAlign: "center",
                  paddingTop: "20px",
                  borderTop: "1px solid #f0f0f0"
                }}>
                  Calculated on {new Date(selectedSalary.calculatedAt).toLocaleDateString("en-US", { 
                    year: "numeric", 
                    month: "long", 
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ 
              padding: "20px 32px",
              borderTop: "2px solid #f0f0f0",
              backgroundColor: "#f8f9fa"
            }}>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedSalary(null);
                }}
                style={{
                  width: "100%",
                  padding: "14px",
                  backgroundColor: "#1976d2",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "14px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#1565c0";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(25,118,210,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#1976d2";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

