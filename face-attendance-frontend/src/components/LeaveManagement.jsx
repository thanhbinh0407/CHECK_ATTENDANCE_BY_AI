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
      <style>{`
        @keyframes lmFadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lmFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lmSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      {/* Welcome Header */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#fff",
        padding: "18px 22px",
        borderRadius: "12px 12px 0 0",
        boxShadow: "0 2px 12px rgba(102, 126, 234, 0.25)"
      }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "22px", fontWeight: "700", lineHeight: 1.25 }}>
          📅 Leave Management
        </h1>
        <p style={{ margin: 0, fontSize: "13px", opacity: 0.92, lineHeight: 1.4 }}>
          Review and approve employee leave requests.
        </p>
      </div>

      {/* Main Content */}
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "0 0 12px 12px",
        padding: "18px 22px",
        boxShadow: "0 2px 16px rgba(0,0,0,0.08)"
      }}>
        {message && (
          <div style={{
            padding: "10px 14px",
            backgroundColor: message.includes("successfully") ? "#d4edda" : "#f8d7da",
            border: `1px solid ${message.includes("successfully") ? "#c3e6cb" : "#f5c6cb"}`,
            borderRadius: "8px",
            color: message.includes("successfully") ? "#155724" : "#721c24",
            marginBottom: "14px",
            fontSize: "13px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            {message.includes("successfully") ? "✅" : "❌"} {message}
          </div>
        )}

        {/* Filters */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "10px",
          padding: "10px 14px",
          marginBottom: "16px",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          border: "1px solid #e8e8e8",
          display: "inline-block",
          width: "fit-content"
        }}>
          <div style={{ 
            display: "flex", 
            gap: "12px", 
            alignItems: "center",
            flexWrap: "wrap"
          }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "8px"
            }}>
              <label style={{ 
                fontWeight: "600", 
                fontSize: "13px", 
                color: "#495057",
                whiteSpace: "nowrap"
              }}>
                Status:
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #d8d8d8",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                  backgroundColor: "#fff",
                  transition: "all 0.2s",
                  outline: "none",
                  width: "auto",
                  minWidth: "150px"
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
          <div style={{ textAlign: "center", padding: "28px", color: "#666" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>⏳</div>
            <div style={{ fontSize: "13px", fontWeight: "500" }}>Loading leave requests...</div>
          </div>
        ) : leaveRequests.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "28px 20px",
            backgroundColor: "#f8f9fa",
            borderRadius: "10px",
            border: "1px dashed #dee2e6"
          }}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>📭</div>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
              No Leave Requests
            </h3>
            <p style={{ fontSize: "13px", color: "#666" }}>
              {filterStatus === "all" 
                ? "No leave requests found in the system"
                : `No leave requests with status "${filterStatus}"`
              }
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "14px"
          }}>
            {leaveRequests.map((request, index) => {
              const statusBadge = getStatusBadge(request.status);
              return (
                <div
                  key={request.id}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    padding: "0",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                    border: "1px solid #e8e8e8",
                    transition: "box-shadow 0.2s ease, border-color 0.2s ease",
                    position: "relative",
                    overflow: "hidden",
                    animation: `lmFadeInUp 0.35s ease-out ${Math.min(index, 8) * 0.04}s both`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.1)";
                    e.currentTarget.style.borderColor = "#c5cae8";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.06)";
                    e.currentTarget.style.borderColor = "#e8e8e8";
                  }}
                >
                  {/* Status Badge */}
                  <div style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    backgroundColor: statusBadge.bg,
                    color: statusBadge.color,
                    border: `1px solid ${statusBadge.color}33`,
                    zIndex: 10
                  }}>
                    {statusBadge.text}
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: "14px 14px 12px", paddingRight: "120px" }}>
                    {/* Employee Info */}
                    <div style={{ 
                      marginBottom: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px"
                    }}>
                      <div style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "17px",
                        fontWeight: "700",
                        color: "#fff",
                        flexShrink: 0
                      }}>
                        {request.User?.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                          margin: "0 0 2px 0",
                          fontSize: "15px",
                          fontWeight: "700",
                          color: "#1a1a1a",
                          lineHeight: 1.25
                        }}>
                          {request.User?.name || "N/A"}
                        </h3>
                        <div style={{
                          fontSize: "12px",
                          color: "#5c6bc0",
                          fontWeight: "600"
                        }}>
                          {request.User?.employeeCode || "N/A"}
                        </div>
                      </div>
                    </div>

                    {/* Leave Details — compact row */}
                    <div style={{
                      backgroundColor: "#f8f9fa",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      marginBottom: "10px",
                      border: "1px solid #eceff1",
                      fontSize: "12px",
                      lineHeight: 1.45,
                      color: "#333"
                    }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", alignItems: "baseline" }}>
                        <span>
                          <span style={{ color: "#888", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>Type </span>
                          <strong>{getTypeLabel(request.type)}</strong>
                        </span>
                        <span>
                          <span style={{ color: "#888", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>Days </span>
                          <strong style={{ color: "#5c6bc0" }}>{request.days}</strong>
                        </span>
                        <span>
                          <span style={{ color: "#888", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>From </span>
                          <strong>{new Date(request.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>
                        </span>
                        <span>
                          <span style={{ color: "#888", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" }}>To </span>
                          <strong>{new Date(request.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>
                        </span>
                      </div>

                      {request.reason && (
                        <div style={{
                          marginTop: "8px",
                          paddingTop: "8px",
                          borderTop: "1px solid #e0e0e0"
                        }}>
                          <div style={{ 
                            fontSize: "10px", 
                            color: "#888", 
                            fontWeight: "600",
                            textTransform: "uppercase",
                            marginBottom: "4px"
                          }}>
                            Reason
                          </div>
                          <div style={{ 
                            fontSize: "12px", 
                            color: "#1a1a1a", 
                            lineHeight: 1.45
                          }}>
                            {request.reason}
                          </div>
                        </div>
                      )}
                      {request.rejectionReason && (
                        <div style={{
                          marginTop: "8px",
                          paddingTop: "8px",
                          borderTop: "1px solid #fecaca"
                        }}>
                          <div style={{ 
                            fontSize: "10px", 
                            color: "#dc3545", 
                            fontWeight: "600",
                            textTransform: "uppercase",
                            marginBottom: "4px"
                          }}>
                            Rejection
                          </div>
                          <div style={{ 
                            fontSize: "12px", 
                            color: "#721c24", 
                            lineHeight: 1.45
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
                        gap: "8px", 
                        justifyContent: "stretch",
                        paddingTop: "2px"
                      }}>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setApprovalAction("approve");
                            setShowApprovalModal(true);
                          }}
                          title="Approve Leave Request"
                          style={{
                            padding: "8px 14px",
                            backgroundColor: "#28a745",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            fontWeight: "600",
                            fontSize: "12px",
                            transition: "background 0.2s",
                            flex: 1
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#218838"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#28a745"; }}
                        >
                          <CheckIcon size={15} />
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
                            padding: "8px 14px",
                            backgroundColor: "#dc3545",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            fontWeight: "600",
                            fontSize: "12px",
                            transition: "background 0.2s",
                            flex: 1
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#c82333"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#dc3545"; }}
                        >
                          <XIcon size={15} />
                          Reject
                        </button>
                      </div>
                    )}

                    {request.status === "approved" && request.Approver && (
                      <div style={{
                        marginTop: "8px",
                        paddingTop: "8px",
                        borderTop: "1px solid #e8e8e8",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        backgroundColor: "#f0f9ff",
                        borderRadius: "8px",
                        border: "1px solid #bae6fd"
                      }}>
                        <div style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "8px",
                          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "14px",
                          fontWeight: "700",
                          flexShrink: 0
                        }}>
                          ✓
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: "10px",
                            color: "#059669",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            marginBottom: "2px"
                          }}>
                            Approved by
                          </div>
                          <div style={{
                            fontSize: "12px",
                            color: "#1a1a1a",
                            fontWeight: "600"
                          }}>
                            {request.Approver.name}
                          </div>
                          {request.approvedAt && (
                            <div style={{
                              fontSize: "11px",
                              color: "#666",
                              marginTop: "2px"
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
              backgroundColor: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(3px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              animation: "lmFadeIn 0.15s ease-out"
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "#fff",
                borderRadius: "14px",
                padding: "0",
                maxWidth: approvalAction === "reject" ? "480px" : "420px",
                width: "92%",
                boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
                animation: "lmSlideUp 0.22s ease-out",
                overflow: "hidden"
              }}
            >
              {/* Modal Header */}
              <div style={{
                padding: "14px 18px",
                background: approvalAction === "approve" 
                  ? "linear-gradient(135deg, #28a745 0%, #20c997 100%)"
                  : "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
                color: "#fff"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                  <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", lineHeight: 1.3 }}>
                    {approvalAction === "approve" ? "✅ Approve request" : "❌ Reject request"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowApprovalModal(false);
                      setSelectedRequest(null);
                      setRejectionReason("");
                    }}
                    style={{
                      padding: "6px",
                      backgroundColor: "rgba(255,255,255,0.2)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "32px",
                      height: "32px",
                      flexShrink: 0,
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
              <div style={{ padding: "16px 18px 18px" }}>
                {/* Employee Info Card */}
                <div style={{
                  backgroundColor: "#f8f9fa",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  marginBottom: "14px",
                  border: "1px solid #e8e8e8",
                  fontSize: "13px"
                }}>
                  <div style={{ marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#666", fontWeight: "500" }}>Employee:</span>
                    <strong style={{ fontSize: "14px", color: "#1a1a1a", marginLeft: "6px" }}>
                      {selectedRequest.User?.name}
                    </strong>
                  </div>
                  <div style={{ marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#666", fontWeight: "500" }}>Code:</span>
                    <span style={{ fontSize: "13px", color: "#1a1a1a", marginLeft: "6px", fontWeight: "600" }}>
                      {selectedRequest.User?.employeeCode || "N/A"}
                    </span>
                  </div>
                  <div style={{ marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#666", fontWeight: "500" }}>Type:</span>
                    <span style={{ fontSize: "13px", color: "#1a1a1a", marginLeft: "6px", fontWeight: "600" }}>
                      {getTypeLabel(selectedRequest.type)}
                    </span>
                  </div>
                  <div style={{ marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#666", fontWeight: "500" }}>Period:</span>
                    <span style={{ fontSize: "13px", color: "#1a1a1a", marginLeft: "6px", fontWeight: "600" }}>
                      {new Date(selectedRequest.startDate).toLocaleDateString("en-US")} – {new Date(selectedRequest.endDate).toLocaleDateString("en-US")}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#666", fontWeight: "500" }}>Duration:</span>
                    <span style={{ fontSize: "14px", color: "#5c6bc0", fontWeight: "700", marginLeft: "6px" }}>
                      {selectedRequest.days} {selectedRequest.days === 1 ? "day" : "days"}
                    </span>
                  </div>
                  {selectedRequest.reason && (
                    <div style={{
                      marginTop: "10px",
                      paddingTop: "10px",
                      borderTop: "1px solid #e0e0e0"
                    }}>
                      <div style={{ fontSize: "12px", color: "#666", fontWeight: "500", marginBottom: "4px" }}>
                        Reason:
                      </div>
                      <div style={{ fontSize: "13px", color: "#1a1a1a", lineHeight: 1.45 }}>
                        {selectedRequest.reason}
                      </div>
                    </div>
                  )}
                </div>

                {approvalAction === "reject" && (
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ 
                      display: "block", 
                      marginBottom: "6px", 
                      fontWeight: "600", 
                      fontSize: "13px", 
                      color: "#495057" 
                    }}>
                      Rejection reason <span style={{ color: "#dc3545" }}>*</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontFamily: "inherit",
                        resize: "vertical",
                        transition: "all 0.2s",
                        outline: "none",
                        boxSizing: "border-box"
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
                    borderRadius: "8px",
                    padding: "10px 12px",
                    marginBottom: "14px"
                  }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: "13px", 
                      color: "#155724",
                      lineHeight: 1.45
                    }}>
                      Approve this leave request? This cannot be undone.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => {
                      setShowApprovalModal(false);
                      setSelectedRequest(null);
                      setRejectionReason("");
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      backgroundColor: "#6c757d",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "13px",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#5a6268"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#6c757d"; }}
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
                      padding: "10px 16px",
                      backgroundColor: approvalAction === "approve" ? "#28a745" : "#dc3545",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: approvalAction === "reject" && !rejectionReason.trim() ? "not-allowed" : "pointer",
                      opacity: approvalAction === "reject" && !rejectionReason.trim() ? 0.6 : 1,
                      fontWeight: "600",
                      fontSize: "13px",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      if (!(approvalAction === "reject" && !rejectionReason.trim())) {
                        e.currentTarget.style.backgroundColor = approvalAction === "approve" ? "#218838" : "#c82333";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = approvalAction === "approve" ? "#28a745" : "#dc3545";
                    }}
                  >
                    {approvalAction === "approve" ? "Confirm" : "Reject"}
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

