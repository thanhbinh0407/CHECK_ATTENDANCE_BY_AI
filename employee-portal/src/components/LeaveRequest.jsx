import React, { useState, useEffect, useMemo } from "react";

export default function LeaveRequest({ userId }) {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"
  const [leaveBalance, setLeaveBalance] = useState({ total: 12, used: 0, remaining: 12 });
  const [editingId, setEditingId] = useState(null); // Track which request is being edited
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteRequestId, setDeleteRequestId] = useState(null);
  const [formData, setFormData] = useState({
    type: "paid",
    startDate: "",
    endDate: "",
    reason: ""
  });
  const [formErrors, setFormErrors] = useState({});

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeaveBalance();
  }, [userId]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/leave/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setLeaveRequests(data.leaveRequests || []);
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/leave/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setLeaveBalance(data.balance || { total: 12, used: 0, remaining: 12 });
      }
    } catch (error) {
      console.error("Error fetching leave balance:", error);
    }
  };

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const validateForm = () => {
    const errors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!formData.startDate) {
      errors.startDate = "Start date is required";
    } else {
      const startDate = new Date(formData.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      // Only validate against today if creating a new request (not editing)
      if (!editingId && startDate < today) {
        errors.startDate = "Start date cannot be earlier than today";
      }
    }
    
    if (!formData.endDate) {
      errors.endDate = "End date is required";
    }
    
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        errors.endDate = "End date must be after start date";
      }
    }
    
    if (!formData.reason || formData.reason.trim().length < 10) {
      errors.reason = "Please provide a reason (at least 10 characters)";
    }
    
    const days = calculateDays(formData.startDate, formData.endDate);
    if (formData.type === "paid" && days > leaveBalance.remaining) {
      errors.general = `You only have ${leaveBalance.remaining} days remaining. Please adjust your dates.`;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const days = calculateDays(formData.startDate, formData.endDate);

    try {
      setSubmitting(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      // Check if we're editing or creating
      const url = editingId 
        ? `${apiBase}/api/leave/requests/${editingId}`
        : `${apiBase}/api/leave/request`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formData,
          days: days
        })
      });

      const data = await res.json();
      if (res.ok) {
        showMessage(
          editingId 
            ? "Leave request updated successfully!" 
            : "Leave request submitted successfully!", 
          "success"
        );
        setShowForm(false);
        setEditingId(null);
        setFormData({ type: "paid", startDate: "", endDate: "", reason: "" });
        setFormErrors({});
        fetchLeaveRequests();
        fetchLeaveBalance();
      } else {
        showMessage("Error: " + (data.message || "Unable to submit leave request"), "error");
      }
    } catch (error) {
      showMessage("Error: " + error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (request) => {
    setEditingId(request.id);
    setFormData({
      type: request.type,
      startDate: request.startDate,
      endDate: request.endDate,
      reason: request.reason || ""
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleDelete = async (requestId) => {
    setDeleteRequestId(requestId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteRequestId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/leave/requests/${deleteRequestId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        showMessage("Leave request deleted successfully!", "success");
        fetchLeaveRequests();
        fetchLeaveBalance();
      } else {
        showMessage("Error deleting leave request", "error");
      }
    } catch (error) {
      showMessage("Error: " + error.message, "error");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setDeleteRequestId(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteRequestId(null);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { backgroundColor: "#ff9800", color: "#fff" },
      approved: { backgroundColor: "#28a745", color: "#fff" },
      rejected: { backgroundColor: "#dc3545", color: "#fff" }
    };
    const labels = {
      pending: "PENDING",
      approved: "APPROVED",
      rejected: "REJECTED"
    };
    const style = styles[status] || styles.pending;
    const label = labels[status] || status.toUpperCase();
    
    return (
      <span style={{
        ...style,
        padding: "5px 14px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        display: "inline-block"
      }}>
        {label}
      </span>
    );
  };

  const getTypeLabel = (type) => {
    const labels = {
      paid: "Paid Leave",
      unpaid: "Unpaid Leave",
      sick: "Sick Leave",
      maternity: "Maternity Leave",
      personal: "Personal Leave",
      other: "Other"
    };
    return labels[type] || type;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <div style={{
      backgroundColor: "#f8f9fa",
      minHeight: "100vh",
      padding: "24px"
    }}>
      {/* Toast Message */}
      {message && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 2000,
          padding: "16px 24px",
          backgroundColor: messageType === "success" ? "#28a745" : "#dc3545",
          color: "#fff",
          borderRadius: "8px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          fontSize: "14px",
          fontWeight: "600",
          maxWidth: "400px",
          animation: "slideIn 0.3s ease"
        }}>
          {message}
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(400px); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}

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
              Leave Request
            </h2>
            <p style={{ 
              margin: 0, 
              color: "#666", 
              fontSize: "14px" 
            }}>
              Manage your leave requests and balance
            </p>
          </div>
          
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ type: "paid", startDate: "", endDate: "", reason: "" });
              setFormErrors({});
              setShowForm(true);
            }}
            style={{
              padding: "12px 24px",
              backgroundColor: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "14px",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              transition: "all 0.2s",
              boxShadow: "0 2px 8px rgba(25,118,210,0.3)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#1565c0";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(25,118,210,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#1976d2";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(25,118,210,0.3)";
            }}
          >
            + Request Leave
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "24px",
        marginBottom: "32px"
      }}>
        {/* Total Requests */}
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
          {/* Background Pattern */}
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
              Total Requests
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
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
            {leaveRequests.length}
          </div>
          
          <div style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.8)",
            fontWeight: "500"
          }}>
            All time requests
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
            {leaveRequests.filter(r => r.status === 'pending').length}
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
            {leaveRequests.filter(r => r.status === 'approved').length}
          </div>
          
          <div style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.8)",
            fontWeight: "500"
          }}>
            Successfully approved
          </div>
        </div>

        {/* Rejected */}
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
              Rejected
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
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
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
            {leaveRequests.filter(r => r.status === 'rejected').length}
          </div>
          
          <div style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.8)",
            fontWeight: "500"
          }}>
            Declined requests
          </div>
        </div>

        {/* Total Days Leave */}
        <div style={{
          background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
          borderRadius: "16px",
          padding: "28px 24px",
          boxShadow: "0 8px 24px rgba(168, 237, 234, 0.25)",
          position: "relative",
          overflow: "hidden",
          transition: "all 0.3s ease",
          cursor: "pointer"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 32px rgba(168, 237, 234, 0.35)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(168, 237, 234, 0.25)";
        }}>
          <div style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            width: "100px",
            height: "100px",
            backgroundColor: "rgba(255,255,255,0.15)",
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
              color: "#2c3e50",
              textTransform: "uppercase",
              letterSpacing: "1px"
            }}>
              Total Days Leave
            </div>
            <div style={{
              width: "48px",
              height: "48px",
              backgroundColor: "rgba(255,255,255,0.5)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2c3e50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
            color: "#2c3e50",
            lineHeight: "1",
            marginBottom: "4px"
          }}>
            {leaveRequests
              .filter(r => r.status === 'approved')
              .reduce((total, r) => {
                const days = calculateDays(r.startDate, r.endDate);
                return total + days;
              }, 0)}
          </div>
          
          <div style={{
            fontSize: "13px",
            color: "#34495e",
            fontWeight: "500"
          }}>
            Days off approved
          </div>
        </div>
      </div>

      {/* Leave Request History */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "16px",
        padding: "32px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
      }}>
        <h3 style={{ 
          margin: "0 0 24px 0", 
          fontSize: "20px", 
          fontWeight: "700",
          color: "#1a1a1a",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          Leave Request History
        </h3>

        {loading && leaveRequests.length === 0 ? (
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
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "500" }}>Loading leave requests...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : leaveRequests.length === 0 ? (
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
              No Leave Requests
            </p>
            <p style={{ margin: 0, fontSize: "14px", color: "#999" }}>
              You haven't submitted any leave requests yet
            </p>
          </div>
        ) : (
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
                    Type
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
                    Start Date
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
                    End Date
                  </th>
                  <th style={{ 
                    padding: "16px", 
                    textAlign: "center", 
                    fontWeight: "700", 
                    color: "#333", 
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    backgroundColor: "#f8f9fa"
                  }}>
                    Days
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
                    textAlign: "center", 
                    fontWeight: "700", 
                    color: "#333", 
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "0 8px 8px 0"
                  }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((request) => (
                  <tr key={request.id} style={{ 
                    backgroundColor: "#fff",
                    transition: "all 0.2s"
                  }}>
                    <td style={{ 
                      padding: "20px 16px", 
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#333",
                      borderTop: "1px solid #f0f0f0",
                      borderBottom: "1px solid #f0f0f0"
                    }}>
                      {getTypeLabel(request.type)}
                    </td>
                    <td style={{ 
                      padding: "20px 16px", 
                      fontSize: "14px",
                      color: "#666",
                      borderTop: "1px solid #f0f0f0",
                      borderBottom: "1px solid #f0f0f0"
                    }}>
                      {formatDate(request.startDate)}
                    </td>
                    <td style={{ 
                      padding: "20px 16px", 
                      fontSize: "14px",
                      color: "#666",
                      borderTop: "1px solid #f0f0f0",
                      borderBottom: "1px solid #f0f0f0"
                    }}>
                      {formatDate(request.endDate)}
                    </td>
                    <td style={{ 
                      padding: "20px 16px", 
                      textAlign: "center", 
                      fontSize: "16px", 
                      fontWeight: "700",
                      color: "#1976d2",
                      borderTop: "1px solid #f0f0f0",
                      borderBottom: "1px solid #f0f0f0"
                    }}>
                      {request.days}
                    </td>
                    <td style={{ 
                      padding: "20px 16px", 
                      fontSize: "14px",
                      borderTop: "1px solid #f0f0f0",
                      borderBottom: "1px solid #f0f0f0"
                    }}>
                      {getStatusBadge(request.status)}
                    </td>
                    <td style={{ 
                      padding: "20px 16px", 
                      textAlign: "center",
                      borderTop: "1px solid #f0f0f0",
                      borderBottom: "1px solid #f0f0f0"
                    }}>
                      {request.status === "pending" && (
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <button
                            onClick={() => handleEdit(request)}
                            style={{
                              padding: "8px 16px",
                              backgroundColor: "#1976d2",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#1565c0";
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#1976d2";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(request.id)}
                            style={{
                              padding: "8px 16px",
                              backgroundColor: "#dc3545",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#c82333";
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#dc3545";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leave Request Form Modal */}
      {showForm && (
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
            if (!submitting) {
              setShowForm(false);
              setEditingId(null);
              setFormData({ type: "paid", startDate: "", endDate: "", reason: "" });
              setFormErrors({});
            }
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "0",
              maxWidth: "700px",
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
                  {editingId ? "Edit Leave Request" : "Request Leave"}
                </h2>
                <p style={{ 
                  margin: 0, 
                  fontSize: "14px", 
                  color: "#666",
                  fontWeight: "500"
                }}>
                  {editingId ? "Update your leave request" : "Submit your leave request"}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!submitting) {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ type: "paid", startDate: "", endDate: "", reason: "" });
                    setFormErrors({});
                  }
                }}
                disabled={submitting}
                style={{
                  background: "none",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  width: "40px",
                  height: "40px",
                  fontSize: "20px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  color: "#666",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  opacity: submitting ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                    e.currentTarget.style.borderColor = "#999";
                  }
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
            <form onSubmit={handleSubmit}>
              <div style={{ padding: "32px" }}>
                {/* General Error */}
                {formErrors.general && (
                  <div style={{
                    padding: "12px 16px",
                    marginBottom: "20px",
                    backgroundColor: "#ffebee",
                    color: "#c62828",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    border: "1px solid #ffcdd2"
                  }}>
                    {formErrors.general}
                  </div>
                )}

                {/* Leave Type */}
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "8px", 
                    fontWeight: "700", 
                    fontSize: "13px",
                    color: "#333",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Leave Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      setFormData({ ...formData, type: e.target.value });
                      setFormErrors({ ...formErrors, general: "" });
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      outline: "none"
                    }}
                  >
                    <option value="paid">Paid Leave</option>
                    <option value="unpaid">Unpaid Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="maternity">Maternity Leave</option>
                    <option value="personal">Personal Leave</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Date Range */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                  <div>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "8px", 
                      fontWeight: "700", 
                      fontSize: "13px",
                      color: "#333",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      min={!editingId ? new Date().toISOString().split('T')[0] : undefined}
                      onChange={(e) => {
                        setFormData({ ...formData, startDate: e.target.value });
                        setFormErrors({ ...formErrors, startDate: "", endDate: "", general: "" });
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: formErrors.startDate ? "2px solid #dc3545" : "2px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        transition: "all 0.2s",
                        outline: "none"
                      }}
                    />
                    {formErrors.startDate && (
                      <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#dc3545", fontWeight: "500" }}>
                        {formErrors.startDate}
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "8px", 
                      fontWeight: "700", 
                      fontSize: "13px",
                      color: "#333",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => {
                        setFormData({ ...formData, endDate: e.target.value });
                        setFormErrors({ ...formErrors, endDate: "", general: "" });
                      }}
                      min={formData.startDate}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: formErrors.endDate ? "2px solid #dc3545" : "2px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        transition: "all 0.2s",
                        outline: "none"
                      }}
                    />
                    {formErrors.endDate && (
                      <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#dc3545", fontWeight: "500" }}>
                        {formErrors.endDate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Reason */}
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "8px", 
                    fontWeight: "700", 
                    fontSize: "13px",
                    color: "#333",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Reason *
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => {
                      setFormData({ ...formData, reason: e.target.value });
                      setFormErrors({ ...formErrors, reason: "" });
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: formErrors.reason ? "2px solid #dc3545" : "2px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      minHeight: "120px",
                      resize: "vertical",
                      fontFamily: "inherit",
                      lineHeight: "1.6",
                      transition: "all 0.2s",
                      outline: "none"
                    }}
                    placeholder="Enter your reason for leave request..."
                  />
                  {formErrors.reason && (
                    <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#dc3545", fontWeight: "500" }}>
                      {formErrors.reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ 
                padding: "20px 32px",
                borderTop: "2px solid #f0f0f0",
                backgroundColor: "#f8f9fa",
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end"
              }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!submitting) {
                      setShowForm(false);
                      setEditingId(null);
                      setFormData({ type: "paid", startDate: "", endDate: "", reason: "" });
                      setFormErrors({});
                    }
                  }}
                  disabled={submitting}
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "#fff",
                    color: "#666",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontWeight: "700",
                    fontSize: "14px",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    transition: "all 0.2s",
                    opacity: submitting ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.backgroundColor = "#f5f5f5";
                      e.currentTarget.style.borderColor = "#999";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#fff";
                    e.currentTarget.style.borderColor = "#e0e0e0";
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "12px 32px",
                    backgroundColor: submitting ? "#90caf9" : "#1976d2",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontWeight: "700",
                    fontSize: "14px",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.backgroundColor = "#1565c0";
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(25,118,210,0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.backgroundColor = "#1976d2";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  {submitting ? (
                    <>
                      <div style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid #fff",
                        borderTop: "2px solid transparent",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite"
                      }}></div>
                      {editingId ? "Updating..." : "Submitting..."}
                    </>
                  ) : (
                    editingId ? "Update Request" : "Submit Request"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 2000,
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "16px",
            padding: "32px",
            maxWidth: "480px",
            width: "100%",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            animation: "slideDown 0.3s ease-out",
            position: "relative"
          }}>
            {/* Warning Icon */}
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "#fff3e0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              border: "3px solid #ff9800"
            }}>
              <svg 
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#ff9800" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>

            {/* Title */}
            <h3 style={{
              margin: "0 0 12px",
              fontSize: "24px",
              fontWeight: "700",
              color: "#1a1a1a",
              textAlign: "center",
              letterSpacing: "-0.5px"
            }}>
              Delete Leave Request?
            </h3>

            {/* Description */}
            <p style={{
              margin: "0 0 28px",
              fontSize: "15px",
              color: "#666",
              textAlign: "center",
              lineHeight: "1.6"
            }}>
              This action cannot be undone. Are you sure you want to permanently delete this leave request?
            </p>

            {/* Buttons */}
            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center"
            }}>
              {/* Cancel Button */}
              <button
                onClick={cancelDelete}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  fontSize: "15px",
                  fontWeight: "600",
                  color: "#666",
                  backgroundColor: "#f5f5f5",
                  border: "2px solid #e0e0e0",
                  borderRadius: "10px",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  letterSpacing: "0.3px",
                  opacity: loading ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = "#eeeeee";
                    e.currentTarget.style.borderColor = "#d0d0d0";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                    e.currentTarget.style.borderColor = "#e0e0e0";
                  }
                }}
              >
                Cancel
              </button>

              {/* Delete Button */}
              <button
                onClick={confirmDelete}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  fontSize: "15px",
                  fontWeight: "600",
                  color: "#fff",
                  backgroundColor: "#dc3545",
                  border: "none",
                  borderRadius: "10px",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  letterSpacing: "0.3px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  opacity: loading ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = "#c82333";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(220, 53, 69, 0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = "#dc3545";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid #fff",
                      borderTop: "2px solid transparent",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite"
                    }}></div>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
