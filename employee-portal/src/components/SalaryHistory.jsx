import React, { useState, useEffect, useMemo } from "react";

export default function SalaryHistory({ userId }) {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSalary, setSelectedSalary] = useState(null);
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

  const viewSalaryDetail = (salary) => {
    setSelectedSalary(salary);
    setShowDetailModal(true);
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
          <div style={{ display: "grid", gap: "16px" }}>
            {filteredSalaries.map((salary) => (
              <div
                key={salary.id}
                style={{
                  border: "2px solid #e0e0e0",
                  borderRadius: "12px",
                  padding: "24px",
                  transition: "all 0.3s",
                  cursor: "pointer",
                  backgroundColor: "#fff"
                }}
                onClick={() => viewSalaryDetail(salary)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#1976d2";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(25,118,210,0.15)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: "22px", 
                      fontWeight: "700", 
                      color: "#1a1a1a", 
                      marginBottom: "8px",
                      letterSpacing: "-0.5px"
                    }}>
                      {new Date(salary.year, salary.month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </div>
                    <div style={{ marginBottom: "4px" }}>
                      {getStatusBadge(salary.status)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "13px", color: "#666", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                      Net Pay
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: "700", color: "#28a745", letterSpacing: "-0.5px" }}>
                      {formatCurrency(salary.finalSalary)}
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(3, 1fr)", 
                  gap: "16px", 
                  paddingTop: "20px", 
                  borderTop: "2px solid #f0f0f0" 
                }}>
                  <div style={{ 
                    padding: "12px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px"
                  }}>
                    <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                      Base Salary
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#333" }}>
                      {formatCurrency(salary.baseSalary)}
                    </div>
                  </div>
                  <div style={{ 
                    padding: "12px",
                    backgroundColor: "#e8f5e9",
                    borderRadius: "8px"
                  }}>
                    <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                      Bonus
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#28a745" }}>
                      +{formatCurrency(salary.bonus)}
                    </div>
                  </div>
                  <div style={{ 
                    padding: "12px",
                    backgroundColor: "#ffebee",
                    borderRadius: "8px"
                  }}>
                    <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                      Deductions
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#dc3545" }}>
                      -{formatCurrency(salary.deduction)}
                    </div>
                  </div>
                </div>

                <div style={{ 
                  marginTop: "16px",
                  padding: "12px 16px",
                  backgroundColor: "#e3f2fd",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <span style={{ 
                    fontSize: "12px", 
                    color: "#1976d2", 
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Click to view details →
                  </span>
                </div>
              </div>
            ))}
          </div>
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
                  <span style={{ fontSize: "14px", fontWeight: "500", color: "#333" }}>Base Salary</span>
                  <strong style={{ fontSize: "18px", fontWeight: "700", color: "#1a1a1a" }}>
                    {formatCurrency(selectedSalary.baseSalary)}
                  </strong>
                </div>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  padding: "16px 20px", 
                  backgroundColor: "#e8f5e9", 
                  borderRadius: "8px",
                  border: "1px solid #c8e6c9"
                }}>
                  <span style={{ fontSize: "14px", fontWeight: "500", color: "#333" }}>Bonus</span>
                  <strong style={{ fontSize: "18px", fontWeight: "700", color: "#28a745" }}>
                    +{formatCurrency(selectedSalary.bonus)}
                  </strong>
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
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  padding: "16px 20px", 
                  backgroundColor: "#ffebee", 
                  borderRadius: "8px",
                  border: "1px solid #ffcdd2"
                }}>
                  <span style={{ fontSize: "14px", fontWeight: "500", color: "#333" }}>Total Deductions</span>
                  <strong style={{ fontSize: "18px", fontWeight: "700", color: "#dc3545" }}>
                    -{formatCurrency(selectedSalary.deduction)}
                  </strong>
                </div>
              </div>

              {/* Net Pay Section */}
              <div style={{ 
                borderTop: "3px solid #1976d2", 
                paddingTop: "24px", 
                marginTop: "28px",
                backgroundColor: "#e3f2fd",
                padding: "24px",
                borderRadius: "12px"
              }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center" 
                }}>
                  <span style={{ 
                    fontSize: "16px", 
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    color: "#1a1a1a"
                  }}>
                    Net Pay
                  </span>
                  <strong style={{ 
                    fontSize: "32px", 
                    fontWeight: "700", 
                    color: "#1976d2",
                    letterSpacing: "-0.5px"
                  }}>
                    {formatCurrency(selectedSalary.finalSalary)}
                  </strong>
                </div>
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

