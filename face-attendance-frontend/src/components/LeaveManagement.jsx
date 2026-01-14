import React, { useState, useEffect } from "react";
import { theme, commonStyles } from "../styles/theme.js";

export default function LeaveManagement() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null); // 'approve' or 'reject'
  const [rejectionReason, setRejectionReason] = useState("");

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchLeaveRequests();
  }, [filterStatus]);

  const fetchLeaveRequests = async () => {
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
  };

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
        setMessage("Duyệt đơn nghỉ phép thành công!");
        fetchLeaveRequests();
        setShowApprovalModal(false);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Lỗi: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    }
  };

  const handleReject = async (requestId) => {
    if (!rejectionReason.trim()) {
      setMessage("Vui lòng nhập lý do từ chối");
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
        setMessage("Từ chối đơn nghỉ phép thành công!");
        fetchLeaveRequests();
        setShowApprovalModal(false);
        setRejectionReason("");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Lỗi: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      paid: "Có lương",
      unpaid: "Không lương",
      sick: "Ốm đau",
      maternity: "Thai sản",
      personal: "Việc riêng",
      other: "Khác"
    };
    return types[type] || type;
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: "#fff3cd", color: "#856404", text: "⏳ Chờ duyệt" },
      approved: { bg: "#d4edda", color: "#155724", text: "✅ Đã duyệt" },
      rejected: { bg: "#f8d7da", color: "#721c24", text: "❌ Từ chối" }
    };
    return styles[status] || styles.pending;
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0" }}>
      {/* Welcome Header */}
      <div style={{
        background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
        color: "#fff",
        padding: "48px 40px",
        borderRadius: "16px 16px 0 0"
      }}>
        <h1 style={{ margin: "0 0 12px 0", fontSize: "36px", fontWeight: "700" }}>
          📅 Quản Lý Nghỉ Phép
        </h1>
        <p style={{ margin: 0, fontSize: "16px", opacity: 0.95 }}>
          Duyệt và quản lý các đơn nghỉ phép của nhân viên. Xem lịch sử và trạng thái các đơn nghỉ phép.
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
            backgroundColor: message.includes("thành công") ? "#d4edda" : "#f8d7da",
            border: `2px solid ${message.includes("thành công") ? "#c3e6cb" : "#f5c6cb"}`,
            borderRadius: "8px",
            color: message.includes("thành công") ? "#155724" : "#721c24",
            marginBottom: "24px",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            {message.includes("thành công") ? "✅" : "❌"} {message}
          </div>
        )}

        {/* Filters */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "32px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <label style={{ fontWeight: "600", fontSize: "14px", color: "#495057" }}>
              Lọc theo trạng thái:
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: "10px 16px",
                border: "2px solid #e0e0e0",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer"
              }}
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#666" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
            <div style={{ fontSize: "16px", fontWeight: "500" }}>Đang tải đơn nghỉ phép...</div>
          </div>
        ) : leaveRequests.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "60px 40px",
            backgroundColor: "#f8f9fa",
            borderRadius: "12px",
            border: "2px dashed #dee2e6"
          }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>📭</div>
            <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
              Chưa có đơn nghỉ phép
            </h3>
            <p style={{ fontSize: "14px", color: "#666" }}>
              {filterStatus === "all" 
                ? "Chưa có đơn nghỉ phép nào trong hệ thống"
                : `Chưa có đơn nghỉ phép với trạng thái "${filterStatus}"`
              }
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
            gap: "24px"
          }}>
            {leaveRequests.map(request => {
              const statusBadge = getStatusBadge(request.status);
              return (
                <div
                  key={request.id}
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
                    backgroundColor: statusBadge.bg,
                    color: statusBadge.color
                  }}>
                    {statusBadge.text}
                  </div>

                  {/* Employee Info */}
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "14px",
                      background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      fontWeight: "700",
                      color: "#fff",
                      marginBottom: "16px"
                    }}>
                      {request.User?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <h3 style={{
                      margin: "0 0 6px 0",
                      fontSize: "22px",
                      fontWeight: "700",
                      color: "#1a1a1a"
                    }}>
                      {request.User?.name || "N/A"}
                    </h3>
                    <div style={{
                      fontSize: "13px",
                      color: "#666",
                      fontWeight: "500"
                    }}>
                      {request.User?.employeeCode || "N/A"}
                    </div>
                  </div>

                  {/* Leave Details */}
                  <div style={{
                    backgroundColor: "#f8f9fa",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "20px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                      <span style={{ fontSize: "13px", color: "#666", fontWeight: "500" }}>Loại:</span>
                      <span style={{ fontSize: "14px", color: "#1a1a1a", fontWeight: "600" }}>
                        {getTypeLabel(request.type)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                      <span style={{ fontSize: "13px", color: "#666", fontWeight: "500" }}>Từ ngày:</span>
                      <span style={{ fontSize: "14px", color: "#1a1a1a", fontWeight: "600" }}>
                        {new Date(request.startDate).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                      <span style={{ fontSize: "13px", color: "#666", fontWeight: "500" }}>Đến ngày:</span>
                      <span style={{ fontSize: "14px", color: "#1a1a1a", fontWeight: "600" }}>
                        {new Date(request.endDate).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                      <span style={{ fontSize: "13px", color: "#666", fontWeight: "500" }}>Số ngày:</span>
                      <span style={{ fontSize: "16px", color: "#fa709a", fontWeight: "700" }}>
                        {request.days} ngày
                      </span>
                    </div>
                    {request.reason && (
                      <div style={{
                        marginTop: "12px",
                        paddingTop: "12px",
                        borderTop: "1px solid #e0e0e0"
                      }}>
                        <div style={{ fontSize: "13px", color: "#666", fontWeight: "500", marginBottom: "8px" }}>
                          Lý do:
                        </div>
                        <div style={{ fontSize: "13px", color: "#1a1a1a", lineHeight: "1.5" }}>
                          {request.reason}
                        </div>
                      </div>
                    )}
                    {request.rejectionReason && (
                      <div style={{
                        marginTop: "12px",
                        paddingTop: "12px",
                        borderTop: "1px solid #e0e0e0"
                      }}>
                        <div style={{ fontSize: "13px", color: "#dc3545", fontWeight: "500", marginBottom: "8px" }}>
                          Lý do từ chối:
                        </div>
                        <div style={{ fontSize: "13px", color: "#721c24", lineHeight: "1.5" }}>
                          {request.rejectionReason}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {request.status === "pending" && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setApprovalAction("approve");
                          setShowApprovalModal(true);
                        }}
                        style={{
                          flex: 1,
                          padding: "10px 16px",
                          backgroundColor: "#28a745",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "13px",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#218838"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#28a745"}
                      >
                        ✅ Duyệt
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setApprovalAction("reject");
                          setRejectionReason("");
                          setShowApprovalModal(true);
                        }}
                        style={{
                          flex: 1,
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
                        ❌ Từ chối
                      </button>
                    </div>
                  )}

                  {request.status === "approved" && request.Approver && (
                    <div style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "12px",
                      paddingTop: "12px",
                      borderTop: "1px solid #f0f0f0"
                    }}>
                      Đã duyệt bởi: {request.Approver.name} ({request.approvedAt ? new Date(request.approvedAt).toLocaleDateString("vi-VN") : ""})
                    </div>
                  )}
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
                maxWidth: "500px",
                width: "90%",
                boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
              }}
            >
              <h2 style={{ margin: "0 0 24px 0", fontSize: "24px", fontWeight: "700", color: "#1a1a1a" }}>
                {approvalAction === "approve" ? "✅ Duyệt đơn nghỉ phép" : "❌ Từ chối đơn nghỉ phép"}
              </h2>

              <div style={{ marginBottom: "24px" }}>
                <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
                  Nhân viên: <strong>{selectedRequest.User?.name}</strong>
                </p>
                <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
                  Thời gian: {new Date(selectedRequest.startDate).toLocaleDateString("vi-VN")} - {new Date(selectedRequest.endDate).toLocaleDateString("vi-VN")} ({selectedRequest.days} ngày)
                </p>
              </div>

              {approvalAction === "reject" && (
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#495057" }}>
                    Lý do từ chối *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Nhập lý do từ chối..."
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
              )}

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedRequest(null);
                    setRejectionReason("");
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
                    fontSize: "14px"
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (approvalAction === "approve") {
                      handleApprove(selectedRequest.id);
                    } else {
                      handleReject(selectedRequest.id);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    backgroundColor: approvalAction === "approve" ? "#28a745" : "#dc3545",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "700",
                    fontSize: "14px"
                  }}
                >
                  {approvalAction === "approve" ? "Xác nhận duyệt" : "Xác nhận từ chối"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

