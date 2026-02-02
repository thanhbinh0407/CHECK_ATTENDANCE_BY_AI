import React, { useState, useEffect, useMemo } from "react";

export default function AttendanceHistory({ userId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState("table"); // "table" or "calendar"
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // "asc" or "desc"

  useEffect(() => {
    fetchAttendance();
  }, [selectedMonth, selectedYear, userId]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      if (!token) return;

      const res = await fetch(`${apiBase}/api/employee/attendance?month=${selectedMonth}&year=${selectedYear}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  };

  const formatDateOnly = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const getStatusBadge = (log) => {
    if (log.type === "IN") {
      return log.isLate ? (
        <span style={{ 
          backgroundColor: "#dc3545", 
          color: "#fff", 
          padding: "5px 14px", 
          borderRadius: "4px", 
          fontSize: "11px", 
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          Late
        </span>
      ) : (
        <span style={{ 
          backgroundColor: "#28a745", 
          color: "#fff", 
          padding: "5px 14px", 
          borderRadius: "4px", 
          fontSize: "11px", 
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          On Time
        </span>
      );
    } else {
      return log.isEarlyLeave ? (
        <span style={{ 
          backgroundColor: "#ffc107", 
          color: "#000", 
          padding: "5px 14px", 
          borderRadius: "4px", 
          fontSize: "11px", 
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          Early Leave
        </span>
      ) : log.isOvertime ? (
        <span style={{ 
          backgroundColor: "#007bff", 
          color: "#fff", 
          padding: "5px 14px", 
          borderRadius: "4px", 
          fontSize: "11px", 
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          Overtime
        </span>
      ) : (
        <span style={{ 
          backgroundColor: "#6c757d", 
          color: "#fff", 
          padding: "5px 14px", 
          borderRadius: "4px", 
          fontSize: "11px", 
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          Normal
        </span>
      );
    }
  };

  // Group logs by date for better display
  const groupedLogs = useMemo(() => {
    const grouped = {};
    logs.forEach(log => {
      const date = new Date(log.timestamp).toLocaleDateString("en-US");
      if (!grouped[date]) {
        grouped[date] = { checkIn: null, checkOut: null, date: log.timestamp };
      }
      if (log.type === "IN") {
        grouped[date].checkIn = log;
      } else {
        grouped[date].checkOut = log;
      }
    });
    
    const result = Object.entries(grouped).map(([date, data]) => ({
      date,
      ...data
    }));

    // Sort by date
    result.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    // Filter by search
    if (searchQuery) {
      return result.filter(item => 
        item.date.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [logs, sortOrder, searchQuery]);

  // Calculate working hours
  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "N/A";
    const diff = new Date(checkOut.timestamp) - new Date(checkIn.timestamp);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Calculate late duration
  const calculateLateDuration = (checkIn) => {
    if (!checkIn || !checkIn.isLate) return null;
    const checkInTime = new Date(checkIn.timestamp);
    const standardTime = new Date(checkInTime);
    standardTime.setHours(8, 0, 0, 0); // Standard check-in at 8:00 AM
    
    if (checkInTime > standardTime) {
      const diff = checkInTime - standardTime;
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} min`;
    }
    return null;
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Date", "Check In", "Check Out", "Late Duration", "Total Hours", "Status"];
    const rows = groupedLogs.map(item => [
      item.date,
      item.checkIn ? formatTime(item.checkIn.timestamp) : "N/A",
      item.checkOut ? formatTime(item.checkOut.timestamp) : "N/A",
      calculateLateDuration(item.checkIn) || "No",
      calculateWorkingHours(item.checkIn, item.checkOut),
      item.checkIn?.isLate ? "Late" : "On Time"
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_${selectedMonth}_${selectedYear}.csv`;
    link.click();
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Statistics
  const stats = useMemo(() => {
    const totalDays = groupedLogs.length;
    const lateDays = groupedLogs.filter(item => item.checkIn?.isLate).length;
    const onTimeDays = totalDays - lateDays;
    const onTimeRate = totalDays > 0 ? ((onTimeDays / totalDays) * 100).toFixed(1) : 0;

    return { totalDays, lateDays, onTimeDays, onTimeRate };
  }, [groupedLogs]);

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
              Attendance History
            </h2>
            <p style={{ 
              margin: 0, 
              color: "#666", 
              fontSize: "14px" 
            }}>
              Track your check-in and check-out records
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
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
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
              {months.map(m => (
                <option key={m} value={m}>Month {m}</option>
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
                cursor: "pointer",
                backgroundColor: "#fff",
                fontWeight: "500",
                transition: "all 0.2s"
              }}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            
            {/* Export Button */}
            <button
              onClick={exportToCSV}
              disabled={groupedLogs.length === 0}
              style={{
                padding: "10px 20px",
                backgroundColor: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: groupedLogs.length === 0 ? "not-allowed" : "pointer",
                opacity: groupedLogs.length === 0 ? 0.5 : 1,
                transition: "all 0.2s",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Search and Sort */}
        <div style={{ 
          marginTop: "20px",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap"
        }}>
          <input
            type="text"
            placeholder="Search by date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: "1",
              minWidth: "200px",
              padding: "10px 16px",
              border: "2px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
              transition: "border-color 0.2s"
            }}
          />
          <button
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#f5f5f5",
              color: "#333",
              border: "1px solid #e0e0e0",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}
          >
            {sortOrder === "desc" ? "Newest First" : "Oldest First"}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {!loading && groupedLogs.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "24px",
          marginBottom: "32px"
        }}>
          {/* Total Days */}
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
                Total Days
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
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
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
              {stats.totalDays}
            </div>
            
            <div style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.8)",
              fontWeight: "500"
            }}>
              Working days recorded
            </div>
          </div>

          {/* On Time */}
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
                On Time
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
              {stats.onTimeDays}
            </div>
            
            <div style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.8)",
              fontWeight: "500"
            }}>
              Punctual arrivals
            </div>
          </div>

          {/* Late Arrivals */}
          <div style={{
            background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            borderRadius: "16px",
            padding: "28px 24px",
            boxShadow: "0 8px 24px rgba(250, 112, 154, 0.25)",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.3s ease",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 12px 32px rgba(250, 112, 154, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(250, 112, 154, 0.25)";
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
                Late Arrivals
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
              {stats.lateDays}
            </div>
            
            <div style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.8)",
              fontWeight: "500"
            }}>
              Delayed check-ins
            </div>
          </div>

          {/* On-Time Rate */}
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
                On-Time Rate
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
              {stats.onTimeRate}%
            </div>
            
            <div style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.8)",
              fontWeight: "500"
            }}>
              Punctuality score
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
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "500" }}>Loading data...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : groupedLogs.length === 0 ? (
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
              No Attendance Records
            </p>
            <p style={{ margin: 0, fontSize: "14px", color: "#999" }}>
              No attendance data found for {selectedMonth}/{selectedYear}
            </p>
          </div>
        ) : (
          /* Desktop Table View */
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
                <thead>
                  <tr>
                    <th style={{ 
                      padding: "16px", 
                      textAlign: "left", 
                      fontWeight: "700", 
                      color: "#333", 
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "8px 0 0 8px"
                    }}>
                      Date
                    </th>
                    <th style={{ 
                      padding: "16px", 
                      textAlign: "left", 
                      fontWeight: "700", 
                      color: "#333", 
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      backgroundColor: "#f8f9fa"
                    }}>
                      Check In
                    </th>
                    <th style={{ 
                      padding: "16px", 
                      textAlign: "left", 
                      fontWeight: "700", 
                      color: "#333", 
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      backgroundColor: "#f8f9fa"
                    }}>
                      Check Out
                    </th>
                    <th style={{ 
                      padding: "16px", 
                      textAlign: "left", 
                      fontWeight: "700", 
                      color: "#333", 
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      backgroundColor: "#f8f9fa"
                    }}>
                      Total Hours
                    </th>
                    <th style={{ 
                      padding: "16px", 
                      textAlign: "left", 
                      fontWeight: "700", 
                      color: "#333", 
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      backgroundColor: "#f8f9fa"
                    }}>
                      Status
                    </th>
                    <th style={{ 
                      padding: "16px", 
                      textAlign: "left", 
                      fontWeight: "700", 
                      color: "#333", 
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "0 8px 8px 0"
                    }}>
                      Late Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedLogs.map((item, index) => (
                    <tr 
                      key={index} 
                      style={{ 
                        backgroundColor: "#fff",
                        transition: "all 0.2s",
                        cursor: "default"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f8f9fa";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#fff";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
                      }}
                    >
                      <td style={{ 
                        padding: "16px", 
                        fontSize: "14px", 
                        color: "#333",
                        fontWeight: "600",
                        borderRadius: "8px 0 0 8px",
                        border: "1px solid #f0f0f0",
                        borderRight: "none"
                      }}>
                        {item.date}
                      </td>
                      <td style={{ 
                        padding: "16px",
                        border: "1px solid #f0f0f0",
                        borderRight: "none",
                        borderLeft: "none"
                      }}>
                        {item.checkIn ? (
                          <div style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "8px" 
                          }}>
                            <span style={{ 
                              fontSize: "16px", 
                              fontWeight: "600",
                              color: item.checkIn.isLate ? "#dc3545" : "#28a745"
                            }}>
                              {formatTime(item.checkIn.timestamp)}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: "#999", fontSize: "14px" }}>—</span>
                        )}
                      </td>
                      <td style={{ 
                        padding: "16px",
                        border: "1px solid #f0f0f0",
                        borderRight: "none",
                        borderLeft: "none"
                      }}>
                        {item.checkOut ? (
                          <div style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "8px" 
                          }}>
                            <span style={{ 
                              fontSize: "16px", 
                              fontWeight: "600",
                              color: "#333"
                            }}>
                              {formatTime(item.checkOut.timestamp)}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: "#999", fontSize: "14px" }}>—</span>
                        )}
                      </td>
                      <td style={{ 
                        padding: "16px",
                        border: "1px solid #f0f0f0",
                        borderRight: "none",
                        borderLeft: "none"
                      }}>
                        <span style={{ 
                          fontSize: "15px",
                          fontWeight: "600",
                          color: "#007bff"
                        }}>
                          {calculateWorkingHours(item.checkIn, item.checkOut)}
                        </span>
                      </td>
                      <td style={{ 
                        padding: "16px",
                        border: "1px solid #f0f0f0",
                        borderRight: "none",
                        borderLeft: "none"
                      }}>
                        {item.checkIn && getStatusBadge(item.checkIn)}
                      </td>
                      <td style={{ 
                        padding: "16px",
                        borderRadius: "0 8px 8px 0",
                        border: "1px solid #f0f0f0",
                        borderLeft: "none"
                      }}>
                        {calculateLateDuration(item.checkIn) ? (
                          <span style={{
                            backgroundColor: "#fff3cd",
                            color: "#856404",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "13px",
                            fontWeight: "600"
                          }}>
                            {calculateLateDuration(item.checkIn)}
                          </span>
                        ) : (
                          <span style={{ color: "#999", fontSize: "14px" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div style={{
              display: "none"
            }}>
              {groupedLogs.map((item, index) => (
                <div 
                  key={index}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    padding: "20px",
                    marginBottom: "12px",
                    border: "1px solid #e0e0e0",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                  }}
                >
                  <div style={{ 
                    fontWeight: "700",
                    fontSize: "15px",
                    marginBottom: "16px",
                    color: "#333",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span>{item.date}</span>
                    {item.checkIn && getStatusBadge(item.checkIn)}
                  </div>
                  
                  <div style={{ 
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px"
                  }}>
                    <div>
                      <div style={{ 
                        fontSize: "11px", 
                        color: "#666",
                        marginBottom: "6px",
                        textTransform: "uppercase",
                        fontWeight: "600",
                        letterSpacing: "0.5px"
                      }}>
                        Check In
                      </div>
                      <div style={{ 
                        fontSize: "16px",
                        fontWeight: "600",
                        color: item.checkIn?.isLate ? "#dc3545" : "#28a745"
                      }}>
                        {item.checkIn ? formatTime(item.checkIn.timestamp) : "—"}
                      </div>
                    </div>
                    
                    <div>
                      <div style={{ 
                        fontSize: "11px", 
                        color: "#666",
                        marginBottom: "6px",
                        textTransform: "uppercase",
                        fontWeight: "600",
                        letterSpacing: "0.5px"
                      }}>
                        Check Out
                      </div>
                      <div style={{ 
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#333"
                      }}>
                        {item.checkOut ? formatTime(item.checkOut.timestamp) : "—"}
                      </div>
                    </div>
                    
                    <div>
                      <div style={{ 
                        fontSize: "11px", 
                        color: "#666",
                        marginBottom: "6px",
                        textTransform: "uppercase",
                        fontWeight: "600",
                        letterSpacing: "0.5px"
                      }}>
                        Total Hours
                      </div>
                      <div style={{ 
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#1976d2"
                      }}>
                        {calculateWorkingHours(item.checkIn, item.checkOut)}
                      </div>
                    </div>
                    
                    {calculateLateDuration(item.checkIn) && (
                      <div>
                        <div style={{ 
                          fontSize: "11px", 
                          color: "#666",
                          marginBottom: "6px",
                          textTransform: "uppercase",
                          fontWeight: "600",
                          letterSpacing: "0.5px"
                        }}>
                          Late
                        </div>
                        <div style={{ 
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#dc3545"
                        }}>
                          {calculateLateDuration(item.checkIn)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Responsive CSS */}
            <style>{`
              @media (max-width: 768px) {
                table { display: none !important; }
                .mobile-cards { display: block !important; }
              }
            `}</style>
          </>
        )}
      </div>
    </div>
  );
}

