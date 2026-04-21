import React, { useEffect, useMemo, useState } from "react";
import { theme } from "../styles/theme.js";
import { toastPrompt, toastSuccess } from "../lib/notify.jsx";

export default function OvertimeManagement() {
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const token = localStorage.getItem("authToken");

  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    if (status === "all") return requests;
    return requests.filter((r) => r.approvalStatus === status);
  }, [requests, status]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setMessage("");
      const res = await fetch(`${apiBase}/api/overtime-requests?status=${status === "all" ? "" : status}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load overtime requests");
      setRequests(data.requests || []);
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleAction = async (id, action) => {
    const promptMsg = action === "reject" ? "Reason (optional):" : "Comments (optional):";
    const commentsRaw = await toastPrompt({ message: promptMsg });
    if (commentsRaw === null) return;
    const comments = commentsRaw;
    try {
      setLoading(true);
      setMessage("");
      const res = await fetch(`${apiBase}/api/overtime-requests/${id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, comments: comments || "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Action failed");
      await fetchRequests();
      setMessage(`✅ Request ${action}d.`);
      toastSuccess(`Request ${action}d.`);
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: theme.neutral.white,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.neutral.gray200}`,
    boxShadow: theme.shadows.sm,
    padding: theme.spacing.md,
  };

  return (
    <div style={{ display: "grid", gap: theme.spacing.md }}>
      <div
        style={{
          ...cardStyle,
          background: theme.gradients.primary,
          color: theme.neutral.white,
          border: "none",
          padding: "14px 18px",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 3, lineHeight: 1.25 }}>
          ⏱️ Overtime Requests
        </div>
        <div style={{ opacity: 0.92, fontSize: 13, lineHeight: 1.4 }}>
          Review and approve OT (multi-level workflow).
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", gap: theme.spacing.sm, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: theme.radius.sm,
              border: `1px solid ${theme.neutral.gray300}`,
              fontWeight: 600,
              fontSize: 13,
              backgroundColor: theme.neutral.white,
            }}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
          <button
            onClick={fetchRequests}
            disabled={loading}
            style={{
              padding: "6px 12px",
              borderRadius: theme.radius.sm,
              border: "none",
              background: theme.secondary.gradient,
              color: theme.neutral.white,
              fontWeight: 600,
              fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.85 : 1,
            }}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div style={{ marginTop: theme.spacing.md }}>
          {filtered.length === 0 ? (
            <div style={{ color: theme.neutral.gray500, fontStyle: "italic", fontSize: 13 }}>No requests.</div>
          ) : (
            <div style={{ display: "grid", gap: theme.spacing.sm }}>
              {filtered.map((r) => (
                <div
                  key={r.id}
                  style={{
                    border: `1px solid ${theme.neutral.gray200}`,
                    borderRadius: theme.radius.sm,
                    padding: "10px 12px",
                    backgroundColor: theme.neutral.gray50,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: theme.spacing.sm,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: theme.neutral.gray900,
                          lineHeight: 1.3,
                        }}
                      >
                        {r.User?.name || "Employee"}{" "}
                        <span style={{ color: theme.neutral.gray600, fontWeight: 600, fontSize: 12 }}>
                          ({r.User?.employeeCode || r.userId})
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: theme.neutral.gray600, marginTop: 3, lineHeight: 1.4 }}>
                        {r.date} · {r.startTime}–{r.endTime} · {r.totalHours}h
                      </div>
                      <div style={{ fontSize: 12, color: theme.neutral.gray800, marginTop: 4, lineHeight: 1.4 }}>
                        <span style={{ color: theme.neutral.gray500, fontWeight: 600 }}>Reason:</span> {r.reason}
                      </div>
                      <div style={{ fontSize: 11, color: theme.neutral.gray600, marginTop: 3 }}>
                        <b style={{ fontWeight: 600 }}>{r.approvalStatus}</b>
                        <span style={{ margin: "0 6px", color: theme.neutral.gray400 }}>·</span>
                        L{r.approvalLevel}
                      </div>
                    </div>

                    {r.approvalStatus === "pending" ? (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => handleAction(r.id, "approve")}
                          disabled={loading}
                          style={{
                            padding: "5px 10px",
                            borderRadius: theme.radius.sm,
                            border: "none",
                            backgroundColor: theme.success.main,
                            color: theme.neutral.white,
                            fontWeight: 600,
                            fontSize: 12,
                            cursor: loading ? "not-allowed" : "pointer",
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(r.id, "reject")}
                          disabled={loading}
                          style={{
                            padding: "5px 10px",
                            borderRadius: theme.radius.sm,
                            border: "none",
                            backgroundColor: theme.error.main,
                            color: theme.neutral.white,
                            fontWeight: 600,
                            fontSize: 12,
                            cursor: loading ? "not-allowed" : "pointer",
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {message ? (
          <div
            style={{
              marginTop: theme.spacing.md,
              padding: "8px 12px",
              borderRadius: theme.radius.sm,
              backgroundColor: theme.neutral.gray50,
              border: `1px solid ${theme.neutral.gray200}`,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}




