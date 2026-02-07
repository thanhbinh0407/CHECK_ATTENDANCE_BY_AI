import React, { useState, useEffect, useCallback } from "react";

export default function LeaveManagement() {
  // Icon Components
  const CheckIcon = ({ size = 18 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const XIcon = ({ size = 18 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const CloseIcon = ({ size = 18 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null); // 'approve' or 'reject'
  const [rejectionReason, setRejectionReason] = useState("");

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const fetchLeaveRequests = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const url = filterStatus === "all" 
        ? `${apiBase}/api/leave/requests`
        : `${apiBase}/api/leave/requests?status=${filterStatus}`;

      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setLeaveRequests(data.leaveRequests || []);
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, apiBase]);

  useEffect(() => {
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  const handleApprove = async (requestId) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/leave/requests/${requestId}/approve`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Leave request approved successfully!");
        fetchLeaveRequests();
        setShowApprovalModal(false);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    }
  };

  const handleReject = async (requestId) => {
    if (!rejectionReason.trim()) {
      setMessage("Please enter rejection reason");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/leave/requests/${requestId}/reject`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rejectionReason })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Leave request rejected successfully!");
        fetchLeaveRequests();
        setShowApprovalModal(false);
        setRejectionReason("");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      paid: "Paid Leave",
      unpaid: "Unpaid Leave",
      sick: "Sick Leave",
      maternity: "Maternity Leave",
      personal: "Personal Leave",
      other: "Other"
    };
    return types[type] || type;
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: "#fff3cd", color: "#856404", text: "⏳ Pending" },
      approved: { bg: "#d4edda", color: "#155724", text: "✅ Approved" },
      rejected: { bg: "#f8d7da", color: "#721c24", text: "❌ Rejected" }
    };
    return styles[status] || styles.pending;
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
          📅 Leave Management
        </h1>
        <p style={{ margin: 0, fontSize: "16px", opacity: 0.95 }}>
          Review and manage employee leave requests. View history and status of all leave applications.
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
            backgroundColor: message.includes("successfully") ? "#d4edda" : "#f8d7da",
            border: `2px solid ${message.includes("successfully") ? "#c3e6cb" : "#f5c6cb"}`,
            borderRadius: "12px",
            color: message.includes("successfully") ? "#155724" : "#721c24",
            marginBottom: "24px",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            {message.includes("successfully") ? "✅" : "❌"} {message}
          </div>
        )}

        {/* Filters */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "16px",
          padding: "20px 24px",
          marginBottom: "32px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          border: "1px solid #e8e8e8",
          display: "inline-block",
          width: "fit-content"
        }}>
          <div style={{ 
            display: "flex", 
            gap: "20px", 
            alignItems: "center",
            flexWrap: "wrap"
          }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "12px"
            }}>
              <label style={{ 
                fontWeight: "700", 
                fontSize: "15px", 
                color: "#495057",
                whiteSpace: "nowrap"
              }}>
                Filter by Status:
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: "12px 20px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "500",
                  cursor: "pointer",
                  backgroundColor: "#fff",
                  transition: "all 0.2s",
                  outline: "none",
                  width: "auto",
                  minWidth: "180px"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#667eea";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <option value="all">All Requests</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#666" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
            <div style={{ fontSize: "16px", fontWeight: "500" }}>Loading leave requests...</div>
          </div>
        ) : leaveRequests.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "60px 40px",
            backgroundColor: "#f8f9fa",
            borderRadius: "16px",
            border: "2px dashed #dee2e6"
          }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>📭</div>
            <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
              No Leave Requests
            </h3>
            <p style={{ fontSize: "14px", color: "#666" }}>
              {filterStatus === "all" 
                ? "No leave requests found in the system"
                : `No leave requests with status "${filterStatus}"`
              }
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
            gap: "28px"
          }}>
            {leaveRequests.map((request, index) => {
              const statusBadge = getStatusBadge(request.status);
              return (
                <div
                  key={request.id}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "20px",
                    padding: "0",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                    border: "1px solid #e8e8e8",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative",
                    overflow: "hidden",
                    animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.15)";
                    e.currentTarget.style.borderColor = "#667eea";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)";
                    e.currentTarget.style.borderColor = "#e8e8e8";
                  }}
                >
                  <style>{`
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
                  `}</style>
                  
                  {/* Status Badge */}
                  <div style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    padding: "8px 16px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    backgroundColor: statusBadge.bg,
                    color: statusBadge.color,
                    border: `2px solid ${statusBadge.color}20`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    zIndex: 10
                  }}>
                    {statusBadge.text}
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: "28px" }}>
                    {/* Employee Info */}
                    <div style={{ 
                      marginBottom: "24px",
                      display: "flex",
                      alignItems: "center",
                      gap: "16px"
                    }}>
                      <div style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "16px",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "28px",
                        fontWeight: "700",
                        color: "#fff",
                        boxShadow: "0 6px 16px rgba(102, 126, 234, 0.4)",
                        flexShrink: 0
                      }}>
                        {request.User?.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                          margin: "0 0 6px 0",
                          fontSize: "20px",
                          fontWeight: "700",
                          color: "#1a1a1a",
                          lineHeight: "1.3"
                        }}>
                          {request.User?.name || "N/A"}
                        </h3>
                        <div style={{
                          fontSize: "14px",
                          color: "#667eea",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}>
                          <span>👤</span>
                          {request.User?.employeeCode || "N/A"}
                        </div>
                      </div>
                    </div>

                    {/* Leave Details */}
                    <div style={{
                      backgroundColor: "#f8f9fa",
                      borderRadius: "16px",
                      padding: "20px",
                      marginBottom: "24px",
                      border: "1px solid #e8e8e8"
                    }}>
                      <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                        marginBottom: "16px"
                      }}>
                        <div style={{ 
                          padding: "12px",
                          backgroundColor: "#fff",
                          borderRadius: "10px",
                          border: "1px solid #e8e8e8"
                        }}>
                          <div style={{ 
                            fontSize: "11px", 
                            color: "#999", 
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "6px"
                          }}>
                            Type
                          </div>
                          <div style={{ 
                            fontSize: "14px", 
                            color: "#1a1a1a", 
                            fontWeight: "700"
                          }}>
                            {getTypeLabel(request.type)}
                          </div>
                        </div>
                        <div style={{ 
                          padding: "12px",
                          backgroundColor: "#fff",
                          borderRadius: "10px",
                          border: "1px solid #e8e8e8"
                        }}>
                          <div style={{ 
                            fontSize: "11px", 
                            color: "#999", 
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "6px"
                          }}>
                            Duration
                          </div>
                          <div style={{ 
                            fontSize: "18px", 
                            color: "#667eea", 
                            fontWeight: "700"
                          }}>
                            {request.days} {request.days === 1 ? "day" : "days"}
                          </div>
                        </div>
                      </div>

                      <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                        marginBottom: request.reason || request.rejectionReason ? "16px" : "0"
                      }}>
                        <div style={{ 
                          padding: "12px",
                          backgroundColor: "#fff",
                          borderRadius: "10px",
                          border: "1px solid #e8e8e8"
                        }}>
                          <div style={{ 
                            fontSize: "11px", 
                            color: "#999", 
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "6px"
                          }}>
                            From Date
                          </div>
                          <div style={{ 
                            fontSize: "14px", 
                            color: "#1a1a1a", 
                            fontWeight: "600"
                          }}>
                            {new Date(request.startDate).toLocaleDateString("en-US", { 
                              month: "short", 
                              day: "numeric", 
                              year: "numeric" 
                            })}
                          </div>
                        </div>
                        <div style={{ 
                          padding: "12px",
                          backgroundColor: "#fff",
                          borderRadius: "10px",
                          border: "1px solid #e8e8e8"
                        }}>
                          <div style={{ 
                            fontSize: "11px", 
                            color: "#999", 
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "6px"
                          }}>
                            To Date
                          </div>
                          <div style={{ 
                            fontSize: "14px", 
                            color: "#1a1a1a", 
                            fontWeight: "600"
                          }}>
                            {new Date(request.endDate).toLocaleDateString("en-US", { 
                              month: "short", 
                              day: "numeric", 
                              year: "numeric" 
                            })}
                          </div>
                        </div>
                      </div>

                      {request.reason && (
                        <div style={{
                          marginTop: "16px",
                          paddingTop: "16px",
                          borderTop: "2px solid #e8e8e8"
                        }}>
                          <div style={{ 
                            fontSize: "11px", 
                            color: "#999", 
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "10px"
                          }}>
                            Reason
                          </div>
                          <div style={{ 
                            fontSize: "14px", 
                            color: "#1a1a1a", 
                            lineHeight: "1.6",
                            padding: "12px",
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                            border: "1px solid #e8e8e8"
                          }}>
                            {request.reason}
                          </div>
                        </div>
                      )}
                      {request.rejectionReason && (
                        <div style={{
                          marginTop: "16px",
                          paddingTop: "16px",
                          borderTop: "2px solid #e8e8e8"
                        }}>
                          <div style={{ 
                            fontSize: "11px", 
                            color: "#dc3545", 
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "10px"
                          }}>
                            Rejection Reason
                          </div>
                          <div style={{ 
                            fontSize: "14px", 
                            color: "#721c24", 
                            lineHeight: "1.6",
                            padding: "12px",
                            backgroundColor: "#fff5f5",
                            borderRadius: "8px",
                            border: "1px solid #fecaca"
                          }}>
                            {request.rejectionReason}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {request.status === "pending" && (
                      <div style={{ 
                        display: "flex", 
                        gap: "12px", 
                        justifyContent: "center",
                        paddingTop: "8px"
                      }}>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setApprovalAction("approve");
                            setShowApprovalModal(true);
                          }}
                          title="Approve Leave Request"
                          style={{
                            padding: "14px 24px",
                            backgroundColor: "#28a745",
                            color: "#fff",
                            border: "none",
                            borderRadius: "12px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            fontWeight: "700",
                            fontSize: "14px",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            boxShadow: "0 4px 12px rgba(40, 167, 69, 0.3)",
                            flex: 1
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#218838";
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 6px 16px rgba(40, 167, 69, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#28a745";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(40, 167, 69, 0.3)";
                          }}
                          onMouseDown={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          <CheckIcon size={18} />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setApprovalAction("reject");
                            setRejectionReason("");
                            setShowApprovalModal(true);
                          }}
                          title="Reject Leave Request"
                          style={{
                            padding: "14px 24px",
                            backgroundColor: "#dc3545",
                            color: "#fff",
                            border: "none",
                            borderRadius: "12px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            fontWeight: "700",
                            fontSize: "14px",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            boxShadow: "0 4px 12px rgba(220, 53, 69, 0.3)",
                            flex: 1
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#c82333";
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 6px 16px rgba(220, 53, 69, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#dc3545";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(220, 53, 69, 0.3)";
                          }}
                          onMouseDown={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          <XIcon size={18} />
                          Reject
                        </button>
                      </div>
                    )}

                    {request.status === "approved" && request.Approver && (
                      <div style={{
                        marginTop: "20px",
                        paddingTop: "20px",
                        borderTop: "2px solid #e8e8e8",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "14px",
                        backgroundColor: "#f0f9ff",
                        borderRadius: "12px",
                        border: "1px solid #bae6fd"
                      }}>
                        <div style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "10px",
                          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "18px",
                          fontWeight: "700",
                          flexShrink: 0
                        }}>
                          ✓
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: "12px",
                            color: "#059669",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "4px"
                          }}>
                            Approved By
                          </div>
                          <div style={{
                            fontSize: "14px",
                            color: "#1a1a1a",
                            fontWeight: "600"
                          }}>
                            {request.Approver.name}
                          </div>
                          {request.approvedAt && (
                            <div style={{
                              fontSize: "12px",
                              color: "#666",
                              marginTop: "4px"
                            }}>
                              {new Date(request.approvedAt).toLocaleDateString("en-US", { 
                                month: "short", 
                                day: "numeric", 
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Approval Modal */}
        {showApprovalModal && selectedRequest && (
          <div
            onClick={() => {
              setShowApprovalModal(false);
              setSelectedRequest(null);
              setRejectionReason("");
            }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              animation: "fadeIn 0.2s ease-out"
            }}
          >
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes slideUp {
                from {
                  opacity: 0;
                  transform: translateY(20px) scale(0.95);
                }
                to {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }
            `}</style>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "#fff",
                borderRadius: "20px",
                padding: "0",
                maxWidth: approvalAction === "reject" ? "600px" : "500px",
                width: "90%",
                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                animation: "slideUp 0.3s ease-out",
                overflow: "hidden"
              }}
            >
              {/* Modal Header */}
              <div style={{
                padding: "32px 32px 24px 32px",
                background: approvalAction === "approve" 
                  ? "linear-gradient(135deg, #28a745 0%, #20c997 100%)"
                  : "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
                color: "#fff"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700" }}>
                    {approvalAction === "approve" ? "✅ Approve Leave Request" : "❌ Reject Leave Request"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowApprovalModal(false);
                      setSelectedRequest(null);
                      setRejectionReason("");
                    }}
                    style={{
                      padding: "8px",
                      backgroundColor: "rgba(255,255,255,0.2)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "36px",
                      height: "36px",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)"}
                  >
                    <CloseIcon size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div style={{ padding: "32px" }}>
                {/* Employee Info Card */}
                <div style={{
                  backgroundColor: "#f8f9fa",
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "24px",
                  border: "1px solid #e8e8e8"
                }}>
                  <div style={{ marginBottom: "12px" }}>
                    <span style={{ fontSize: "13px", color: "#666", fontWeight: "500" }}>Employee:</span>
                    <strong style={{ fontSize: "16px", color: "#1a1a1a", marginLeft: "8px" }}>
                      {selectedRequest.User?.name}
                    </strong>
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <span style={{ fontSize: "13px", color: "#666", fontWeight: "500" }}>Employee Code:</span>
                    <span style={{ fontSize: "14px", color: "#1a1a1a", marginLeft: "8px", fontWeight: "600" }}>
                      {selectedRequest.User?.employeeCode || "N/A"}
                    </span>
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <span style={{ fontSize: "13px", color: "#666", fontWeight: "500" }}>Leave Type:</span>
                    <span style={{ fontSize: "14px", color: "#1a1a1a", marginLeft: "8px", fontWeight: "600" }}>
                      {getTypeLabel(selectedRequest.type)}
                    </span>
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <span style={{ fontSize: "13px", color: "#666", fontWeight: "500" }}>Period:</span>
                    <span style={{ fontSize: "14px", color: "#1a1a1a", marginLeft: "8px", fontWeight: "600" }}>
                      {new Date(selectedRequest.startDate).toLocaleDateString("en-US")} - {new Date(selectedRequest.endDate).toLocaleDateString("en-US")}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: "13px", color: "#666", fontWeight: "500" }}>Duration:</span>
                    <span style={{ fontSize: "16px", color: "#667eea", fontWeight: "700", marginLeft: "8px" }}>
                      {selectedRequest.days} {selectedRequest.days === 1 ? "day" : "days"}
                    </span>
                  </div>
                  {selectedRequest.reason && (
                    <div style={{
                      marginTop: "16px",
                      paddingTop: "16px",
                      borderTop: "1px solid #e0e0e0"
                    }}>
                      <div style={{ fontSize: "13px", color: "#666", fontWeight: "500", marginBottom: "8px" }}>
                        Reason:
                      </div>
                      <div style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: "1.6" }}>
                        {selectedRequest.reason}
                      </div>
                    </div>
                  )}
                </div>

                {approvalAction === "reject" && (
                  <div style={{ marginBottom: "24px" }}>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "12px", 
                      fontWeight: "700", 
                      fontSize: "15px", 
                      color: "#495057" 
                    }}>
                      Rejection Reason <span style={{ color: "#dc3545" }}>*</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please enter the reason for rejection..."
                      rows={4}
                      style={{
                        width: "100%",
                        padding: "14px 18px",
                        border: "2px solid #e0e0e0",
                        borderRadius: "12px",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        resize: "vertical",
                        transition: "all 0.2s",
                        outline: "none"
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#dc3545";
                        e.target.style.boxShadow = "0 0 0 3px rgba(220, 53, 69, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e0e0e0";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                    {!rejectionReason.trim() && (
                      <p style={{ 
                        fontSize: "12px", 
                        color: "#dc3545", 
                        marginTop: "8px", 
                        marginBottom: 0 
                      }}>
                        Rejection reason is required
                      </p>
                    )}
                  </div>
                )}

                {approvalAction === "approve" && (
                  <div style={{
                    backgroundColor: "#d4edda",
                    border: "1px solid #c3e6cb",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "24px"
                  }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: "14px", 
                      color: "#155724",
                      lineHeight: "1.6"
                    }}>
                      Are you sure you want to approve this leave request? This action cannot be undone.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => {
                      setShowApprovalModal(false);
                      setSelectedRequest(null);
                      setRejectionReason("");
                    }}
                    style={{
                      flex: 1,
                      padding: "14px 24px",
                      backgroundColor: "#6c757d",
                      color: "#fff",
                      border: "none",
                      borderRadius: "12px",
                      cursor: "pointer",
                      fontWeight: "700",
                      fontSize: "15px",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#5a6268";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#6c757d";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (approvalAction === "approve") {
                        handleApprove(selectedRequest.id);
                      } else {
                        if (rejectionReason.trim()) {
                          handleReject(selectedRequest.id);
                        }
                      }
                    }}
                    disabled={approvalAction === "reject" && !rejectionReason.trim()}
                    style={{
                      flex: 1,
                      padding: "14px 24px",
                      backgroundColor: approvalAction === "approve" ? "#28a745" : "#dc3545",
                      color: "#fff",
                      border: "none",
                      borderRadius: "12px",
                      cursor: approvalAction === "reject" && !rejectionReason.trim() ? "not-allowed" : "pointer",
                      opacity: approvalAction === "reject" && !rejectionReason.trim() ? 0.6 : 1,
                      fontWeight: "700",
                      fontSize: "15px",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      if (!(approvalAction === "reject" && !rejectionReason.trim())) {
                        e.currentTarget.style.backgroundColor = approvalAction === "approve" ? "#218838" : "#c82333";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = approvalAction === "approve" ? "#28a745" : "#dc3545";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {approvalAction === "approve" ? "Confirm Approval" : "Confirm Rejection"}
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

