import React, { useState, useEffect, useCallback } from "react";
import { theme } from "../styles/theme.js";

export default function ApprovalManagement() {
  // Icon Components
  const EyeIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const CheckIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const XIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const CloseIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
  const [activeTab, setActiveTab] = useState("leave");
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [dependents, setDependents] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailType, setDetailType] = useState(null); // 'leave', 'dependent', 'qualification'
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const fetchLeaveRequests = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/leave/requests?status=pending`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setLeaveRequests(data.leaveRequests || []);
      }
    } catch {
      setMessage("Error loading leave requests");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  const fetchDependents = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/dependents?approvalStatus=pending`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setDependents(data.dependents || []);
      }
    } catch {
      setMessage("Error loading dependents");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  const fetchQualifications = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/qualifications?approvalStatus=pending`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setQualifications(data.qualifications || []);
      }
    } catch {
      setMessage("Error loading qualifications");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (activeTab === "leave") fetchLeaveRequests();
    else if (activeTab === "dependents") fetchDependents();
    else if (activeTab === "qualifications") fetchQualifications();
  }, [activeTab, fetchLeaveRequests, fetchDependents, fetchQualifications]);

  const handleApproveLeave = async (id) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/leave/requests/${id}/approve`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage("Leave request approved successfully");
        fetchLeaveRequests();
      }
    } catch {
      setMessage("Error approving request");
    }
  };

  const handleRejectLeave = async (id, reason) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/leave/requests/${id}/reject`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rejectionReason: reason || "Not eligible" })
      });
      if (res.ok) {
        setMessage("Leave request rejected successfully");
        fetchLeaveRequests();
      }
    } catch {
      setMessage("Error rejecting request");
    }
  };

  const handleApproveDependent = async (id) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/dependents/${id}/approve`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage("Dependent approved successfully");
        fetchDependents();
      }
    } catch {
      setMessage("Error approving");
    }
  };

  const handleRejectDependent = async (id, reason) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/dependents/${id}/reject`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: reason || "Not eligible" })
      });
      if (res.ok) {
        setMessage("Dependent rejected successfully");
        fetchDependents();
      }
    } catch {
      setMessage("Error rejecting");
    }
  };

  const handleApproveQualification = async (id) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/qualifications/${id}/approve`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage("Qualification approved successfully");
        fetchQualifications();
      }
    } catch {
      setMessage("Error approving");
    }
  };

  const handleRejectQualification = async (id, reason) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/qualifications/${id}/reject`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: reason || "Not eligible" })
      });
      if (res.ok) {
        setMessage("Qualification rejected successfully");
        fetchQualifications();
        setSelectedDetail(null);
      }
    } catch {
      setMessage("Error rejecting");
    }
  };

  const handleViewDetail = (item, type) => {
    setSelectedDetail(item);
    setDetailType(type);
  };

  const handleApproveFromDetail = async () => {
    if (!selectedDetail) return;
    
    if (detailType === "leave") {
      await handleApproveLeave(selectedDetail.id);
    } else if (detailType === "dependent") {
      await handleApproveDependent(selectedDetail.id);
    } else if (detailType === "qualification") {
      await handleApproveQualification(selectedDetail.id);
    }
    setSelectedDetail(null);
  };

  const handleRejectFromDetail = async (reason) => {
    if (!selectedDetail) return;
    
    if (detailType === "leave") {
      await handleRejectLeave(selectedDetail.id, reason);
    } else if (detailType === "dependent") {
      await handleRejectDependent(selectedDetail.id, reason);
    } else if (detailType === "qualification") {
      await handleRejectQualification(selectedDetail.id, reason);
    }
    setSelectedDetail(null);
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
      <div style={{ padding: theme.spacing.xl }}>
        <h2 style={{ ...theme.typography.h2, marginBottom: theme.spacing.lg }}>Approval Management</h2>

      {message && (
        <div style={{
          padding: `${theme.spacing.md} ${theme.spacing.lg}`,
          marginBottom: theme.spacing.md,
          backgroundColor: message.includes("successfully") ? "#d4edda" : "#f8d7da",
          color: message.includes("successfully") ? "#155724" : "#721c24",
          borderRadius: theme.radius.md,
          display: "inline-block",
          width: "fit-content",
          border: `1px solid ${message.includes("successfully") ? "#c3e6cb" : "#f5c6cb"}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          fontSize: "14px",
          fontWeight: "500"
        }}>
          {message.includes("successfully") ? "✅" : "❌"} {message}
        </div>
      )}

      <div style={{ display: "flex", gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
        <button
          onClick={() => setActiveTab("leave")}
          style={{
            padding: `${theme.spacing.md} ${theme.spacing.lg}`,
            backgroundColor: activeTab === "leave" ? theme.primary.main : theme.neutral.gray200,
            color: activeTab === "leave" ? theme.neutral.white : theme.neutral.gray700,
            border: "none",
            borderRadius: theme.radius.md,
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          Leave Requests ({leaveRequests.length})
        </button>
        <button
          onClick={() => setActiveTab("dependents")}
          style={{
            padding: `${theme.spacing.md} ${theme.spacing.lg}`,
            backgroundColor: activeTab === "dependents" ? theme.primary.main : theme.neutral.gray200,
            color: activeTab === "dependents" ? theme.neutral.white : theme.neutral.gray700,
            border: "none",
            borderRadius: theme.radius.md,
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          Dependents ({dependents.length})
        </button>
        <button
          onClick={() => setActiveTab("qualifications")}
          style={{
            padding: `${theme.spacing.md} ${theme.spacing.lg}`,
            backgroundColor: activeTab === "qualifications" ? theme.primary.main : theme.neutral.gray200,
            color: activeTab === "qualifications" ? theme.neutral.white : theme.neutral.gray700,
            border: "none",
            borderRadius: theme.radius.md,
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          Qualifications ({qualifications.length})
        </button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          {activeTab === "leave" && (
            <div style={{
              backgroundColor: theme.neutral.white,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.lg,
              boxShadow: theme.shadows.md
            }}>
              {leaveRequests.length === 0 ? (
                <p>No pending leave requests</p>
              ) : (
                leaveRequests.map((req, index) => (
                  <div 
                    key={req.id} 
                    style={{
                      padding: theme.spacing.lg,
                      borderBottom: `1px solid ${theme.neutral.gray200}`,
                      marginBottom: theme.spacing.md,
                      backgroundColor: theme.neutral.white,
                      borderRadius: theme.radius.lg,
                      border: "1px solid #e8e8e8",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                      cursor: "default"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
                      e.currentTarget.style.borderColor = "#667eea";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                      e.currentTarget.style.borderColor = "#e8e8e8";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div 
                        style={{ 
                          flex: 1, 
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }} 
                        onClick={() => handleViewDetail(req, "leave")}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateX(4px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateX(0)";
                        }}
                      >
                        <h4 style={{ 
                          margin: "0 0 8px 0",
                          fontSize: "18px",
                          fontWeight: "700",
                          color: theme.neutral.gray900
                        }}>
                          {req.User?.name} ({req.User?.employeeCode})
                        </h4>
                        <p style={{ 
                          margin: "4px 0",
                          fontSize: "14px",
                          color: theme.neutral.gray600
                        }}>
                          Type: <strong>{req.type}</strong> | From {req.startDate} to {req.endDate} ({req.days} days)
                        </p>
                        <p style={{ 
                          margin: "4px 0",
                          fontSize: "14px",
                          color: theme.neutral.gray700
                        }}>
                          Reason: {req.reason || "-"}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: theme.spacing.sm }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(req, "leave");
                          }}
                          title="View Details"
                          style={{
                            padding: "12px",
                            backgroundColor: theme.info.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "40px",
                            height: "40px",
                            transition: "all 0.3s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.1)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <EyeIcon size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveLeave(req.id);
                          }}
                          title="Approve"
                          style={{
                            padding: "12px",
                            backgroundColor: theme.success.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "40px",
                            height: "40px",
                            transition: "all 0.3s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.1) rotate(5deg)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1) rotate(0deg)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <CheckIcon size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const reason = prompt("Rejection reason:");
                            if (reason) handleRejectLeave(req.id, reason);
                          }}
                          title="Reject"
                          style={{
                            padding: "12px",
                            backgroundColor: theme.error.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "40px",
                            height: "40px",
                            transition: "all 0.3s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.1) rotate(-5deg)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1) rotate(0deg)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <XIcon size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "dependents" && (
            <div style={{
              backgroundColor: theme.neutral.white,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.lg,
              boxShadow: theme.shadows.md
            }}>
              {dependents.length === 0 ? (
                <p>No pending dependents</p>
              ) : (
                dependents.map((dep, index) => (
                  <div 
                    key={dep.id} 
                    style={{
                      padding: theme.spacing.lg,
                      borderBottom: `1px solid ${theme.neutral.gray200}`,
                      marginBottom: theme.spacing.md,
                      backgroundColor: theme.neutral.white,
                      borderRadius: theme.radius.lg,
                      border: "1px solid #e8e8e8",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                      cursor: "default"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
                      e.currentTarget.style.borderColor = "#f59e0b";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                      e.currentTarget.style.borderColor = "#e8e8e8";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div 
                        style={{ 
                          flex: 1, 
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }} 
                        onClick={() => handleViewDetail(dep, "dependent")}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateX(4px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateX(0)";
                        }}
                      >
                        <h4 style={{ 
                          margin: "0 0 8px 0",
                          fontSize: "18px",
                          fontWeight: "700",
                          color: theme.neutral.gray900
                        }}>
                          {dep.fullName} - <span style={{ color: "#f59e0b" }}>{dep.relationship}</span>
                        </h4>
                        <p style={{ 
                          margin: "4px 0",
                          fontSize: "14px",
                          color: theme.neutral.gray600
                        }}>
                          Employee: <strong>{dep.User?.name}</strong> ({dep.User?.employeeCode})
                        </p>
                        <p style={{ 
                          margin: "4px 0",
                          fontSize: "14px",
                          color: theme.neutral.gray700
                        }}>
                          Date of Birth: {dep.dateOfBirth || "-"} | Gender: {dep.gender || "-"}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: theme.spacing.sm }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(dep, "dependent");
                          }}
                          title="View Details"
                          style={{
                            padding: "12px",
                            backgroundColor: theme.info.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "40px",
                            height: "40px",
                            transition: "all 0.3s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.1)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <EyeIcon size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveDependent(dep.id);
                          }}
                          title="Approve"
                          style={{
                            padding: "12px",
                            backgroundColor: theme.success.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "40px",
                            height: "40px",
                            transition: "all 0.3s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.1) rotate(5deg)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1) rotate(0deg)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <CheckIcon size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const reason = prompt("Rejection reason:");
                            if (reason) handleRejectDependent(dep.id, reason);
                          }}
                          title="Reject"
                          style={{
                            padding: "12px",
                            backgroundColor: theme.error.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "40px",
                            height: "40px",
                            transition: "all 0.3s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.1) rotate(-5deg)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1) rotate(0deg)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <XIcon size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "qualifications" && (
            <div style={{
              backgroundColor: theme.neutral.white,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.lg,
              boxShadow: theme.shadows.md
            }}>
              {qualifications.length === 0 ? (
                <p>No pending qualifications</p>
              ) : (
                qualifications.map((qual, index) => (
                  <div 
                    key={qual.id} 
                    style={{
                      padding: theme.spacing.lg,
                      borderBottom: `1px solid ${theme.neutral.gray200}`,
                      marginBottom: theme.spacing.md,
                      backgroundColor: theme.neutral.white,
                      borderRadius: theme.radius.lg,
                      border: "1px solid #e8e8e8",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                      cursor: "default"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
                      e.currentTarget.style.borderColor = "#fef3c7";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                      e.currentTarget.style.borderColor = "#e8e8e8";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div 
                        style={{ 
                          flex: 1, 
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }} 
                        onClick={() => handleViewDetail(qual, "qualification")}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateX(4px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateX(0)";
                        }}
                      >
                        <h4 style={{ 
                          margin: "0 0 8px 0",
                          fontSize: "18px",
                          fontWeight: "700",
                          color: theme.neutral.gray900
                        }}>
                          🎓 {qual.name} - <span style={{ color: "#f59e0b" }}>{qual.type}</span>
                        </h4>
                        <p style={{ 
                          margin: "4px 0",
                          fontSize: "14px",
                          color: theme.neutral.gray600
                        }}>
                          Employee: <strong>{qual.User?.name}</strong> ({qual.User?.employeeCode})
                        </p>
                        <p style={{ 
                          margin: "4px 0",
                          fontSize: "14px",
                          color: theme.neutral.gray700
                        }}>
                          Issued by: {qual.issuedBy || "-"} | Number: {qual.certificateNumber || "-"}
                        </p>
                        {qual.documentPath && (
                          <a
                            href={`${apiBase}${qual.documentPath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ 
                              color: theme.primary.main, 
                              textDecoration: "none",
                              fontSize: "14px",
                              fontWeight: "600",
                              display: "inline-block",
                              marginTop: "8px",
                              padding: "4px 8px",
                              borderRadius: theme.radius.sm,
                              backgroundColor: "#f0f9ff",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#dbeafe";
                              e.currentTarget.style.textDecoration = "underline";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#f0f9ff";
                              e.currentTarget.style.textDecoration = "none";
                            }}
                          >
                            📄 View attached document
                          </a>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: theme.spacing.sm }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(qual, "qualification");
                          }}
                          title="View Details"
                          style={{
                            padding: "12px",
                            backgroundColor: theme.info.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "40px",
                            height: "40px",
                            transition: "all 0.3s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.1)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <EyeIcon size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveQualification(qual.id);
                          }}
                          title="Approve"
                          style={{
                            padding: "12px",
                            backgroundColor: theme.success.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "40px",
                            height: "40px",
                            transition: "all 0.3s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.1) rotate(5deg)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1) rotate(0deg)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <CheckIcon size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const reason = prompt("Rejection reason:");
                            if (reason) handleRejectQualification(qual.id, reason);
                          }}
                          title="Reject"
                          style={{
                            padding: "12px",
                            backgroundColor: theme.error.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "40px",
                            height: "40px",
                            transition: "all 0.3s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.1) rotate(-5deg)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1) rotate(0deg)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <XIcon size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedDetail && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          padding: theme.spacing.xl
        }} onClick={() => setSelectedDetail(null)}>
          <div style={{
            backgroundColor: theme.neutral.white,
            borderRadius: theme.radius.xl,
            width: "100%",
            maxWidth: "900px",
            maxHeight: "90vh",
            overflow: "auto",
            boxShadow: theme.shadows.xl,
            position: "relative"
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              background: theme.gradients.primary,
              color: theme.neutral.white,
              padding: theme.spacing.xl,
              borderRadius: `${theme.radius.xl} ${theme.radius.xl} 0 0`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 700 }}>
                {detailType === "leave" && "📝 Leave Request Details"}
                {detailType === "dependent" && "👨‍👩‍👧‍👦 Dependent Details"}
                {detailType === "qualification" && "🎓 Qualification/Certificate Details"}
              </h2>
              <button
                onClick={() => setSelectedDetail(null)}
                title="Close"
                style={{
                  padding: "8px",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  color: theme.neutral.white,
                  border: "none",
                  borderRadius: theme.radius.md,
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

            {/* Content */}
            <div style={{ padding: theme.spacing.xl }}>
              {detailType === "leave" && selectedDetail && (
                <div>
                  {/* Employee Info Card */}
                  <div style={{
                    padding: theme.spacing.lg,
                    backgroundColor: "#f0f9ff",
                    borderRadius: theme.radius.lg,
                    marginBottom: theme.spacing.xl,
                    border: "1px solid #bae6fd",
                    display: "flex",
                    alignItems: "center",
                    gap: theme.spacing.md
                  }}>
                    <div style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: theme.radius.lg,
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "28px",
                      fontWeight: "700",
                      color: "#fff",
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                      flexShrink: 0
                    }}>
                      {selectedDetail.User?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: theme.neutral.gray900, marginBottom: theme.spacing.xs }}>
                        {selectedDetail.User?.name || "N/A"}
                      </div>
                      <div style={{ fontSize: "14px", color: "#667eea", fontWeight: "600", marginBottom: theme.spacing.xs }}>
                        {selectedDetail.User?.employeeCode || "N/A"}
                      </div>
                      <div style={{ fontSize: "13px", color: theme.neutral.gray600 }}>
                        {selectedDetail.User?.email || ""}
                      </div>
                    </div>
                  </div>

                  {/* Leave Details Grid */}
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(2, 1fr)", 
                    gap: theme.spacing.md, 
                    marginBottom: theme.spacing.xl 
                  }}>
                    <div style={{ 
                      padding: theme.spacing.lg, 
                      backgroundColor: "#fff",
                      borderRadius: theme.radius.lg, 
                      border: "1px solid #e8e8e8",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                      <div style={{ 
                        fontSize: "11px", 
                        fontWeight: "700", 
                        color: "#999", 
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: theme.spacing.sm 
                      }}>
                        Leave Type
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: theme.neutral.gray900 }}>
                        {selectedDetail.type}
                      </div>
                    </div>
                    <div style={{ 
                      padding: theme.spacing.lg, 
                      backgroundColor: "#fff",
                      borderRadius: theme.radius.lg, 
                      border: "1px solid #e8e8e8",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                      <div style={{ 
                        fontSize: "11px", 
                        fontWeight: "700", 
                        color: "#999", 
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: theme.spacing.sm 
                      }}>
                        Duration
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: "#667eea" }}>
                        {selectedDetail.days} {selectedDetail.days === 1 ? "day" : "days"}
                      </div>
                    </div>
                    <div style={{ 
                      padding: theme.spacing.lg, 
                      backgroundColor: "#fff",
                      borderRadius: theme.radius.lg, 
                      border: "1px solid #e8e8e8",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                      <div style={{ 
                        fontSize: "11px", 
                        fontWeight: "700", 
                        color: "#999", 
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: theme.spacing.sm 
                      }}>
                        Start Date
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: theme.neutral.gray900 }}>
                        {selectedDetail.startDate ? new Date(selectedDetail.startDate).toLocaleDateString('en-US', { 
                          month: "short", 
                          day: "numeric", 
                          year: "numeric" 
                        }) : "-"}
                      </div>
                    </div>
                    <div style={{ 
                      padding: theme.spacing.lg, 
                      backgroundColor: "#fff",
                      borderRadius: theme.radius.lg, 
                      border: "1px solid #e8e8e8",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                      <div style={{ 
                        fontSize: "11px", 
                        fontWeight: "700", 
                        color: "#999", 
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: theme.spacing.sm 
                      }}>
                        End Date
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: theme.neutral.gray900 }}>
                        {selectedDetail.endDate ? new Date(selectedDetail.endDate).toLocaleDateString('en-US', { 
                          month: "short", 
                          day: "numeric", 
                          year: "numeric" 
                        }) : "-"}
                      </div>
                    </div>
                    <div style={{ 
                      padding: theme.spacing.lg, 
                      backgroundColor: "#fff",
                      borderRadius: theme.radius.lg, 
                      border: "1px solid #e8e8e8",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      gridColumn: "1 / -1"
                    }}>
                      <div style={{ 
                        fontSize: "11px", 
                        fontWeight: "700", 
                        color: "#999", 
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: theme.spacing.sm 
                      }}>
                        Status
                      </div>
                      <div>
                        <span style={{
                          padding: "8px 16px",
                          borderRadius: theme.radius.md,
                          backgroundColor: "#fff3cd",
                          color: "#856404",
                          fontSize: "13px",
                          fontWeight: "700",
                          border: "1px solid #ffecb5"
                        }}>
                          ⏳ Pending Approval
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reason Section */}
                  <div style={{ 
                    padding: theme.spacing.lg, 
                    backgroundColor: "#f8f9fa",
                    borderRadius: theme.radius.lg, 
                    marginBottom: theme.spacing.xl,
                    border: "1px solid #e8e8e8"
                  }}>
                    <div style={{ 
                      fontSize: "11px", 
                      fontWeight: "700", 
                      color: "#999", 
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: theme.spacing.md 
                    }}>
                      Reason for Leave
                    </div>
                    <div style={{ 
                      fontSize: "15px", 
                      color: theme.neutral.gray900, 
                      whiteSpace: "pre-wrap",
                      lineHeight: "1.6",
                      padding: theme.spacing.md,
                      backgroundColor: "#fff",
                      borderRadius: theme.radius.md,
                      border: "1px solid #e8e8e8"
                    }}>
                      {selectedDetail.reason || "No reason provided"}
                    </div>
                  </div>
                </div>
              )}

              {detailType === "dependent" && selectedDetail && (
                <div>
                  {/* Employee Info Card */}
                  <div style={{
                    padding: theme.spacing.lg,
                    backgroundColor: "#f0f9ff",
                    borderRadius: theme.radius.lg,
                    marginBottom: theme.spacing.xl,
                    border: "1px solid #bae6fd",
                    display: "flex",
                    alignItems: "center",
                    gap: theme.spacing.md
                  }}>
                    <div style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: theme.radius.lg,
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "28px",
                      fontWeight: "700",
                      color: "#fff",
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                      flexShrink: 0
                    }}>
                      {selectedDetail.User?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: theme.neutral.gray900, marginBottom: theme.spacing.xs }}>
                        {selectedDetail.User?.name || "N/A"}
                      </div>
                      <div style={{ fontSize: "14px", color: "#667eea", fontWeight: "600", marginBottom: theme.spacing.xs }}>
                        {selectedDetail.User?.employeeCode || "N/A"}
                      </div>
                      <div style={{ fontSize: "13px", color: theme.neutral.gray600 }}>
                        {selectedDetail.User?.email || ""}
                      </div>
                    </div>
                  </div>

                  {/* Dependent Info Card */}
                  <div style={{
                    padding: theme.spacing.lg,
                    backgroundColor: "#fff5f5",
                    borderRadius: theme.radius.lg,
                    marginBottom: theme.spacing.xl,
                    border: "1px solid #fecaca",
                    display: "flex",
                    alignItems: "center",
                    gap: theme.spacing.md
                  }}>
                    <div style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: theme.radius.lg,
                      background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "28px",
                      fontWeight: "700",
                      color: "#fff",
                      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                      flexShrink: 0
                    }}>
                      {selectedDetail.fullName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: theme.neutral.gray900, marginBottom: theme.spacing.xs }}>
                        {selectedDetail.fullName || "N/A"}
                      </div>
                      <div style={{ fontSize: "14px", color: "#f59e0b", fontWeight: "600" }}>
                        Relationship: {selectedDetail.relationship || "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(2, 1fr)", 
                    gap: theme.spacing.md, 
                    marginBottom: theme.spacing.xl 
                  }}>
                    <div style={{ 
                      padding: theme.spacing.lg, 
                      backgroundColor: "#fff",
                      borderRadius: theme.radius.lg, 
                      border: "1px solid #e8e8e8",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                      <div style={{ 
                        fontSize: "11px", 
                        fontWeight: "700", 
                        color: "#999", 
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: theme.spacing.sm 
                      }}>
                        Date of Birth
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: theme.neutral.gray900 }}>
                        {selectedDetail.dateOfBirth ? new Date(selectedDetail.dateOfBirth).toLocaleDateString('en-US', { 
                          month: "short", 
                          day: "numeric", 
                          year: "numeric" 
                        }) : "-"}
                      </div>
                    </div>
                    <div style={{ 
                      padding: theme.spacing.lg, 
                      backgroundColor: "#fff",
                      borderRadius: theme.radius.lg, 
                      border: "1px solid #e8e8e8",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                      <div style={{ 
                        fontSize: "11px", 
                        fontWeight: "700", 
                        color: "#999", 
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: theme.spacing.sm 
                      }}>
                        Gender
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: theme.neutral.gray900 }}>
                        {selectedDetail.gender || "-"}
                      </div>
                    </div>
                    <div style={{ 
                      padding: theme.spacing.lg, 
                      backgroundColor: "#fff",
                      borderRadius: theme.radius.lg, 
                      border: "1px solid #e8e8e8",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      gridColumn: "1 / -1"
                    }}>
                      <div style={{ 
                        fontSize: "11px", 
                        fontWeight: "700", 
                        color: "#999", 
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: theme.spacing.sm 
                      }}>
                        ID Number
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: theme.neutral.gray900 }}>
                        {selectedDetail.idNumber || "-"}
                      </div>
                    </div>
                    {selectedDetail.phoneNumber && (
                      <div style={{ 
                        padding: theme.spacing.lg, 
                        backgroundColor: "#fff",
                        borderRadius: theme.radius.lg, 
                        border: "1px solid #e8e8e8",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                      }}>
                        <div style={{ 
                          fontSize: "11px", 
                          fontWeight: "700", 
                          color: "#999", 
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          marginBottom: theme.spacing.sm 
                        }}>
                          Phone Number
                        </div>
                        <div style={{ fontSize: "16px", fontWeight: "700", color: theme.neutral.gray900 }}>
                          {selectedDetail.phoneNumber}
                        </div>
                      </div>
                    )}
                    {selectedDetail.email && (
                      <div style={{ 
                        padding: theme.spacing.lg, 
                        backgroundColor: "#fff",
                        borderRadius: theme.radius.lg, 
                        border: "1px solid #e8e8e8",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                      }}>
                        <div style={{ 
                          fontSize: "11px", 
                          fontWeight: "700", 
                          color: "#999", 
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          marginBottom: theme.spacing.sm 
                        }}>
                          Email
                        </div>
                        <div style={{ fontSize: "16px", fontWeight: "700", color: theme.neutral.gray900 }}>
                          {selectedDetail.email}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detailType === "qualification" && selectedDetail && (
                <div>
                  {/* Employee Info Card */}
                  <div style={{
                    padding: theme.spacing.lg,
                    backgroundColor: "#f0f9ff",
                    borderRadius: theme.radius.lg,
                    marginBottom: theme.spacing.xl,
                    border: "1px solid #bae6fd",
                    display: "flex",
                    alignItems: "center",
                    gap: theme.spacing.md
                  }}>
                    <div style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: theme.radius.lg,
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "28px",
                      fontWeight: "700",
                      color: "#fff",
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                      flexShrink: 0
                    }}>
                      {selectedDetail.User?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: theme.neutral.gray900, marginBottom: theme.spacing.xs }}>
                        {selectedDetail.User?.name || "N/A"}
                      </div>
                      <div style={{ fontSize: "14px", color: "#667eea", fontWeight: "600", marginBottom: theme.spacing.xs }}>
                        {selectedDetail.User?.employeeCode || "N/A"}
                      </div>
                      <div style={{ fontSize: "13px", color: theme.neutral.gray600 }}>
                        {selectedDetail.User?.email || ""}
                      </div>
                    </div>
                  </div>

                  {/* Qualification Name Card */}
                  <div style={{
                    padding: theme.spacing.lg,
                    backgroundColor: "#fef3c7",
                    borderRadius: theme.radius.lg,
                    marginBottom: theme.spacing.xl,
                    border: "1px solid #fde68a",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "24px", marginBottom: theme.spacing.sm }}>🎓</div>
                    <div style={{ fontSize: "22px", fontWeight: "700", color: theme.neutral.gray900, marginBottom: theme.spacing.xs }}>
                      {selectedDetail.name || "N/A"}
                    </div>
                    <div style={{ fontSize: "14px", color: "#f59e0b", fontWeight: "600" }}>
                      Type: {selectedDetail.type || "N/A"}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(2, 1fr)", 
                    gap: theme.spacing.md, 
                    marginBottom: theme.spacing.xl 
                  }}>
                    <div style={{ 
                      padding: theme.spacing.lg, 
                      backgroundColor: "#fff",
                      borderRadius: theme.radius.lg, 
                      border: "1px solid #e8e8e8",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                      <div style={{ 
                        fontSize: "11px", 
                        fontWeight: "700", 
                        color: "#999", 
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: theme.spacing.sm 
                      }}>
                        Issued By
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: theme.neutral.gray900 }}>
                        {selectedDetail.issuedBy || "-"}
                      </div>
                    </div>
                    <div style={{ 
                      padding: theme.spacing.lg, 
                      backgroundColor: "#fff",
                      borderRadius: theme.radius.lg, 
                      border: "1px solid #e8e8e8",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                      <div style={{ 
                        fontSize: "11px", 
                        fontWeight: "700", 
                        color: "#999", 
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: theme.spacing.sm 
                      }}>
                        Certificate Number
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: theme.neutral.gray900 }}>
                        {selectedDetail.certificateNumber || "-"}
                      </div>
                    </div>
                    <div style={{ 
                      padding: theme.spacing.lg, 
                      backgroundColor: "#fff",
                      borderRadius: theme.radius.lg, 
                      border: "1px solid #e8e8e8",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                      <div style={{ 
                        fontSize: "11px", 
                        fontWeight: "700", 
                        color: "#999", 
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: theme.spacing.sm 
                      }}>
                        Issue Date
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: theme.neutral.gray900 }}>
                        {selectedDetail.issuedDate ? new Date(selectedDetail.issuedDate).toLocaleDateString('en-US', { 
                          month: "short", 
                          day: "numeric", 
                          year: "numeric" 
                        }) : "-"}
                      </div>
                    </div>
                    <div style={{ 
                      padding: theme.spacing.lg, 
                      backgroundColor: "#fff",
                      borderRadius: theme.radius.lg, 
                      border: "1px solid #e8e8e8",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                      <div style={{ 
                        fontSize: "11px", 
                        fontWeight: "700", 
                        color: "#999", 
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: theme.spacing.sm 
                      }}>
                        Expiry Date
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: theme.neutral.gray900 }}>
                        {selectedDetail.expiryDate ? new Date(selectedDetail.expiryDate).toLocaleDateString('en-US', { 
                          month: "short", 
                          day: "numeric", 
                          year: "numeric" 
                        }) : "N/A"}
                      </div>
                    </div>
                    {selectedDetail.description && (
                      <div style={{ 
                        padding: theme.spacing.lg, 
                        backgroundColor: "#f8f9fa",
                        borderRadius: theme.radius.lg, 
                        border: "1px solid #e8e8e8",
                        gridColumn: "1 / -1"
                      }}>
                        <div style={{ 
                          fontSize: "11px", 
                          fontWeight: "700", 
                          color: "#999", 
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          marginBottom: theme.spacing.md 
                        }}>
                          Notes
                        </div>
                        <div style={{ 
                          fontSize: "15px", 
                          color: theme.neutral.gray900, 
                          whiteSpace: "pre-wrap",
                          lineHeight: "1.6",
                          padding: theme.spacing.md,
                          backgroundColor: "#fff",
                          borderRadius: theme.radius.md,
                          border: "1px solid #e8e8e8"
                        }}>
                          {selectedDetail.description}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Document Preview */}
                  {selectedDetail.documentPath && (
                    <div style={{ marginBottom: theme.spacing.xl }}>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: theme.neutral.gray900, marginBottom: theme.spacing.md }}>
                        📄 Certificate/Qualification Document Scan
                      </label>
                      <div style={{
                        border: `2px solid ${theme.neutral.gray200}`,
                        borderRadius: theme.radius.md,
                        padding: theme.spacing.md,
                        backgroundColor: theme.neutral.gray50
                      }}>
                        {selectedDetail.documentPath.toLowerCase().endsWith('.pdf') ? (
                          <div style={{ textAlign: "center", padding: theme.spacing.xl }}>
                            <div style={{ fontSize: "48px", marginBottom: theme.spacing.md }}>📄</div>
                            <a
                              href={`${apiBase}${selectedDetail.documentPath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                                backgroundColor: theme.primary.main,
                                color: theme.neutral.white,
                                textDecoration: "none",
                                borderRadius: theme.radius.md,
                                fontWeight: 600,
                                display: "inline-block"
                              }}
                            >
                              Open PDF File
                            </a>
                          </div>
                        ) : (
                          <img
                            src={`${apiBase}${selectedDetail.documentPath}`}
                            alt="Document scan"
                            style={{
                              maxWidth: "100%",
                              maxHeight: "500px",
                              borderRadius: theme.radius.md,
                              boxShadow: theme.shadows.md
                            }}
                          />
                        )}
                        <div style={{ marginTop: theme.spacing.md, textAlign: "center" }}>
                          <a
                            href={`${apiBase}${selectedDetail.documentPath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: theme.primary.main,
                              textDecoration: "underline",
                              fontSize: "14px"
                            }}
                          >
                            Open in new tab
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: theme.spacing.md, justifyContent: "flex-end", marginTop: theme.spacing.xl, paddingTop: theme.spacing.xl, borderTop: `1px solid ${theme.neutral.gray200}` }}>
                <button
                  onClick={() => setSelectedDetail(null)}
                  title="Close"
                  style={{
                    padding: "12px",
                    backgroundColor: theme.neutral.gray300,
                    color: theme.neutral.gray700,
                    border: "none",
                    borderRadius: theme.radius.md,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "40px",
                    height: "40px",
                    transition: "all 0.3s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.neutral.gray400;
                    e.currentTarget.style.transform = "scale(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.neutral.gray300;
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <CloseIcon size={18} />
                </button>
                <button
                  onClick={handleApproveFromDetail}
                  title="Approve"
                  style={{
                    padding: "12px",
                    backgroundColor: theme.success.main,
                    color: theme.neutral.white,
                    border: "none",
                    borderRadius: theme.radius.md,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "40px",
                    height: "40px",
                    transition: "all 0.3s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.success.dark;
                    e.currentTarget.style.transform = "scale(1.1) rotate(5deg)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.success.main;
                    e.currentTarget.style.transform = "scale(1) rotate(0deg)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <CheckIcon size={18} />
                </button>
                <button
                  onClick={() => {
                    const reason = prompt("Rejection reason:");
                    if (reason) handleRejectFromDetail(reason);
                  }}
                  title="Reject"
                  style={{
                    padding: "12px",
                    backgroundColor: theme.error.main,
                    color: theme.neutral.white,
                    border: "none",
                    borderRadius: theme.radius.md,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "40px",
                    height: "40px",
                    transition: "all 0.3s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.error.dark;
                    e.currentTarget.style.transform = "scale(1.1) rotate(-5deg)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.error.main;
                    e.currentTarget.style.transform = "scale(1) rotate(0deg)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <XIcon size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

