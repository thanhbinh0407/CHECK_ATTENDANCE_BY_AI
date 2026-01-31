import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";

export default function ApprovalManagement() {
  const [activeTab, setActiveTab] = useState("leave");
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [dependents, setDependents] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailType, setDetailType] = useState(null); // 'leave', 'dependent', 'qualification'
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    if (activeTab === "leave") fetchLeaveRequests();
    else if (activeTab === "dependents") fetchDependents();
    else if (activeTab === "qualifications") fetchQualifications();
  }, [activeTab]);

  const fetchLeaveRequests = async () => {
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
    } catch (error) {
      setMessage("Lỗi khi tải đơn nghỉ phép");
    } finally {
      setLoading(false);
    }
  };

  const fetchDependents = async () => {
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
    } catch (error) {
      setMessage("Lỗi khi tải người phụ thuộc");
    } finally {
      setLoading(false);
    }
  };

  const fetchQualifications = async () => {
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
    } catch (error) {
      setMessage("Lỗi khi tải chứng chỉ");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (id) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/leave/requests/${id}/approve`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage("Duyệt đơn nghỉ phép thành công");
        fetchLeaveRequests();
      }
    } catch (error) {
      setMessage("Lỗi khi duyệt đơn");
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
        body: JSON.stringify({ rejectionReason: reason || "Không đủ điều kiện" })
      });
      if (res.ok) {
        setMessage("Từ chối đơn nghỉ phép thành công");
        fetchLeaveRequests();
      }
    } catch (error) {
      setMessage("Lỗi khi từ chối đơn");
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
        setMessage("Duyệt người phụ thuộc thành công");
        fetchDependents();
      }
    } catch (error) {
      setMessage("Lỗi khi duyệt");
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
        body: JSON.stringify({ reason: reason || "Không đủ điều kiện" })
      });
      if (res.ok) {
        setMessage("Từ chối người phụ thuộc thành công");
        fetchDependents();
      }
    } catch (error) {
      setMessage("Lỗi khi từ chối");
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
        setMessage("Duyệt chứng chỉ thành công");
        fetchQualifications();
      }
    } catch (error) {
      setMessage("Lỗi khi duyệt");
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
        body: JSON.stringify({ reason: reason || "Không đủ điều kiện" })
      });
      if (res.ok) {
        setMessage("Từ chối chứng chỉ thành công");
        fetchQualifications();
        setSelectedDetail(null);
      }
    } catch (error) {
      setMessage("Lỗi khi từ chối");
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
    <div style={{ padding: theme.spacing.xl }}>
      <h2 style={{ ...theme.typography.h2, marginBottom: theme.spacing.lg }}>Duyệt Yêu Cầu</h2>

      {message && (
        <div style={{
          padding: theme.spacing.md,
          marginBottom: theme.spacing.md,
          backgroundColor: message.includes("thành công") ? "#d4edda" : "#f8d7da",
          color: message.includes("thành công") ? "#155724" : "#721c24",
          borderRadius: theme.radius.md
        }}>
          {message}
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
          Đơn nghỉ phép ({leaveRequests.length})
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
          Người phụ thuộc ({dependents.length})
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
          Chứng chỉ ({qualifications.length})
        </button>
      </div>

      {loading ? (
        <div>Đang tải...</div>
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
                <p>Không có đơn nghỉ phép nào đang chờ duyệt</p>
              ) : (
                leaveRequests.map((req) => (
                  <div key={req.id} style={{
                    padding: theme.spacing.md,
                    borderBottom: `1px solid ${theme.neutral.gray200}`,
                    marginBottom: theme.spacing.md
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => handleViewDetail(req, "leave")}>
                        <h4>{req.User?.name} ({req.User?.employeeCode})</h4>
                        <p>Loại: {req.type} | Từ {req.startDate} đến {req.endDate} ({req.days} ngày)</p>
                        <p>Lý do: {req.reason || "-"}</p>
                      </div>
                      <div style={{ display: "flex", gap: theme.spacing.sm }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(req, "leave");
                          }}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: theme.info.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.sm,
                            cursor: "pointer"
                          }}
                        >
                          👁️ Chi tiết
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveLeave(req.id);
                          }}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: theme.success.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.sm,
                            cursor: "pointer"
                          }}
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const reason = prompt("Lý do từ chối:");
                            if (reason) handleRejectLeave(req.id, reason);
                          }}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: theme.error.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.sm,
                            cursor: "pointer"
                          }}
                        >
                          Từ chối
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
                <p>Không có người phụ thuộc nào đang chờ duyệt</p>
              ) : (
                dependents.map((dep) => (
                  <div key={dep.id} style={{
                    padding: theme.spacing.md,
                    borderBottom: `1px solid ${theme.neutral.gray200}`,
                    marginBottom: theme.spacing.md
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => handleViewDetail(dep, "dependent")}>
                        <h4>{dep.fullName} - {dep.relationship}</h4>
                        <p>Nhân viên: {dep.User?.name} ({dep.User?.employeeCode})</p>
                        <p>Ngày sinh: {dep.dateOfBirth || "-"} | Giới tính: {dep.gender || "-"}</p>
                      </div>
                      <div style={{ display: "flex", gap: theme.spacing.sm }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(dep, "dependent");
                          }}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: theme.info.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.sm,
                            cursor: "pointer"
                          }}
                        >
                          👁️ Chi tiết
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveDependent(dep.id);
                          }}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: theme.success.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.sm,
                            cursor: "pointer"
                          }}
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const reason = prompt("Lý do từ chối:");
                            if (reason) handleRejectDependent(dep.id, reason);
                          }}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: theme.error.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.sm,
                            cursor: "pointer"
                          }}
                        >
                          Từ chối
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
                <p>Không có chứng chỉ nào đang chờ duyệt</p>
              ) : (
                qualifications.map((qual) => (
                  <div key={qual.id} style={{
                    padding: theme.spacing.md,
                    borderBottom: `1px solid ${theme.neutral.gray200}`,
                    marginBottom: theme.spacing.md
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => handleViewDetail(qual, "qualification")}>
                        <h4>{qual.name} - {qual.type}</h4>
                        <p>Nhân viên: {qual.User?.name} ({qual.User?.employeeCode})</p>
                        <p>Cấp bởi: {qual.issuedBy || "-"} | Số: {qual.certificateNumber || "-"}</p>
                        {qual.documentPath && (
                          <a
                            href={`${apiBase}${qual.documentPath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: theme.primary.main, textDecoration: "underline" }}
                          >
                            Xem tài liệu đính kèm
                          </a>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: theme.spacing.sm }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(qual, "qualification");
                          }}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: theme.info.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.sm,
                            cursor: "pointer"
                          }}
                        >
                          👁️ Chi tiết
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveQualification(qual.id);
                          }}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: theme.success.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.sm,
                            cursor: "pointer"
                          }}
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const reason = prompt("Lý do từ chối:");
                            if (reason) handleRejectQualification(qual.id, reason);
                          }}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: theme.error.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.sm,
                            cursor: "pointer"
                          }}
                        >
                          Từ chối
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
                {detailType === "leave" && "📝 Chi tiết đơn nghỉ phép"}
                {detailType === "dependent" && "👨‍👩‍👧‍👦 Chi tiết người phụ thuộc"}
                {detailType === "qualification" && "🎓 Chi tiết chứng chỉ/bằng cấp"}
              </h2>
              <button
                onClick={() => setSelectedDetail(null)}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  color: theme.neutral.white,
                  border: "none",
                  borderRadius: theme.radius.md,
                  cursor: "pointer",
                  fontSize: "20px",
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: theme.spacing.xl }}>
              {detailType === "leave" && selectedDetail && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: theme.spacing.lg, marginBottom: theme.spacing.xl }}>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Nhân viên
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.User?.name} ({selectedDetail.User?.employeeCode})
                      </div>
                      <div style={{ fontSize: "14px", color: theme.neutral.gray600, marginTop: theme.spacing.xs }}>
                        {selectedDetail.User?.email}
                      </div>
                    </div>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Loại nghỉ phép
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.type}
                      </div>
                    </div>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Ngày bắt đầu
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.startDate ? new Date(selectedDetail.startDate).toLocaleDateString('vi-VN') : "-"}
                      </div>
                    </div>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Ngày kết thúc
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.endDate ? new Date(selectedDetail.endDate).toLocaleDateString('vi-VN') : "-"}
                      </div>
                    </div>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Số ngày nghỉ
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600, color: theme.primary.main }}>
                        {selectedDetail.days} ngày
                      </div>
                    </div>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Trạng thái
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        <span style={{
                          padding: "4px 12px",
                          borderRadius: theme.radius.full,
                          backgroundColor: "#fff3cd",
                          color: "#856404",
                          fontSize: "12px"
                        }}>
                          ⏳ Chờ duyệt
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md, marginBottom: theme.spacing.xl }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                      Lý do nghỉ phép
                    </label>
                    <div style={{ fontSize: "14px", color: theme.neutral.gray900, whiteSpace: "pre-wrap" }}>
                      {selectedDetail.reason || "Không có lý do"}
                    </div>
                  </div>
                </div>
              )}

              {detailType === "dependent" && selectedDetail && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: theme.spacing.lg, marginBottom: theme.spacing.xl }}>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Nhân viên
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.User?.name} ({selectedDetail.User?.employeeCode})
                      </div>
                      <div style={{ fontSize: "14px", color: theme.neutral.gray600, marginTop: theme.spacing.xs }}>
                        {selectedDetail.User?.email}
                      </div>
                    </div>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Họ và tên
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.fullName}
                      </div>
                    </div>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Quan hệ
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.relationship}
                      </div>
                    </div>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Ngày sinh
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.dateOfBirth ? new Date(selectedDetail.dateOfBirth).toLocaleDateString('vi-VN') : "-"}
                      </div>
                    </div>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Giới tính
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.gender || "-"}
                      </div>
                    </div>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        CMND/CCCD
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.idNumber || "-"}
                      </div>
                    </div>
                    {selectedDetail.phoneNumber && (
                      <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                          Số điện thoại
                        </label>
                        <div style={{ fontSize: "16px", fontWeight: 600 }}>
                          {selectedDetail.phoneNumber}
                        </div>
                      </div>
                    )}
                    {selectedDetail.email && (
                      <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                          Email
                        </label>
                        <div style={{ fontSize: "16px", fontWeight: 600 }}>
                          {selectedDetail.email}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detailType === "qualification" && selectedDetail && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: theme.spacing.lg, marginBottom: theme.spacing.xl }}>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Nhân viên
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.User?.name} ({selectedDetail.User?.employeeCode})
                      </div>
                      <div style={{ fontSize: "14px", color: theme.neutral.gray600, marginTop: theme.spacing.xs }}>
                        {selectedDetail.User?.email}
                      </div>
                    </div>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Loại
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.type}
                      </div>
                    </div>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md, gridColumn: "1 / -1" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Tên chứng chỉ/bằng cấp
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.name}
                      </div>
                    </div>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Cơ quan cấp
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.issuedBy || "-"}
                      </div>
                    </div>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Số chứng chỉ
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.certificateNumber || "-"}
                      </div>
                    </div>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Ngày cấp
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.issuedDate ? new Date(selectedDetail.issuedDate).toLocaleDateString('vi-VN') : "-"}
                      </div>
                    </div>
                    <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                        Ngày hết hạn
                      </label>
                      <div style={{ fontSize: "16px", fontWeight: 600 }}>
                        {selectedDetail.expiryDate ? new Date(selectedDetail.expiryDate).toLocaleDateString('vi-VN') : "Không có"}
                      </div>
                    </div>
                    {selectedDetail.description && (
                      <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md, gridColumn: "1 / -1" }}>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                          Ghi chú
                        </label>
                        <div style={{ fontSize: "14px", color: theme.neutral.gray900, whiteSpace: "pre-wrap" }}>
                          {selectedDetail.description}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Document Preview */}
                  {selectedDetail.documentPath && (
                    <div style={{ marginBottom: theme.spacing.xl }}>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: theme.neutral.gray900, marginBottom: theme.spacing.md }}>
                        📄 Ảnh scan chứng chỉ/bằng cấp
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
                              Mở file PDF
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
                            Mở trong tab mới
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
                  style={{
                    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                    backgroundColor: theme.neutral.gray300,
                    color: theme.neutral.gray700,
                    border: "none",
                    borderRadius: theme.radius.md,
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  Đóng
                </button>
                <button
                  onClick={handleApproveFromDetail}
                  style={{
                    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                    backgroundColor: theme.success.main,
                    color: theme.neutral.white,
                    border: "none",
                    borderRadius: theme.radius.md,
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  ✅ Duyệt
                </button>
                <button
                  onClick={() => {
                    const reason = prompt("Lý do từ chối:");
                    if (reason) handleRejectFromDetail(reason);
                  }}
                  style={{
                    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                    backgroundColor: theme.error.main,
                    color: theme.neutral.white,
                    border: "none",
                    borderRadius: theme.radius.md,
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  ❌ Từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

