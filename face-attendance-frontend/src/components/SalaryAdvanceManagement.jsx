import React, { useEffect, useMemo, useState } from "react";
import { theme } from "../styles/theme.js";
import { toastPrompt, toastSuccess } from "../lib/notify.jsx";

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("en-US");
}

export default function SalaryAdvanceManagement() {
  const apiBase = (import.meta.env.VITE_API_BASE || "http://localhost:5000").replace(/\/$/, "");
  const token = localStorage.getItem("authToken");
  let userRole = null;
  try {
    userRole = JSON.parse(localStorage.getItem("user") || "{}").role;
  } catch {
    userRole = null;
  }

  const [advances, setAdvances] = useState([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [openPreviewId, setOpenPreviewId] = useState(null);
  const [previewById, setPreviewById] = useState({});
  const [previewLoadingId, setPreviewLoadingId] = useState(null);

  const filtered = useMemo(() => {
    if (status === "all") return advances;
    return advances.filter((a) => a.approvalStatus === status);
  }, [advances, status]);

  const fetchAdvances = async () => {
    try {
      setLoading(true);
      setMessage("");
      const res = await fetch(`${apiBase}/api/salary-advances?status=${status === "all" ? "" : status}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load salary advances");
      setAdvances(data.advances || []);
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchPreview = async (id) => {
    setPreviewLoadingId(id);
    setMessage("");
    try {
      const res = await fetch(`${apiBase}/api/salary-advances/${id}/salary-preview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Preview failed");
      setPreviewById((prev) => ({ ...prev, [id]: data }));
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const togglePreview = async (id) => {
    if (openPreviewId === id) {
      setOpenPreviewId(null);
      return;
    }
    setOpenPreviewId(id);
    if (!previewById[id]) await fetchPreview(id);
  };

  const handleDisburse = async (id) => {
    if (!window.confirm("Mark this advance as disbursed (funds transferred to employee)?")) return;
    try {
      setLoading(true);
      setMessage("");
      const res = await fetch(`${apiBase}/api/salary-advances/${id}/disburse`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Disburse failed");
      toastSuccess("Marked as disbursed.");
      await fetchAdvances();
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    const promptMsg = action === "reject" ? "Reason (optional):" : "Comments (optional):";
    const commentsRaw = await toastPrompt({ message: promptMsg });
    if (commentsRaw === null) return;
    const comments = commentsRaw;
    try {
      setLoading(true);
      setMessage("");
      const res = await fetch(`${apiBase}/api/salary-advances/${id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, comments: comments || "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Action failed");
      await fetchAdvances();
      setMessage(`✅ Advance ${action}d.`);
      toastSuccess(`Advance ${action}d.`);
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
          💸 Salary Advances
        </div>
        <div style={{ opacity: 0.92, fontSize: 13, lineHeight: 1.4 }}>
          Approve advances, open payroll preview, accountants mark disbursement on/after payout day.
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
            onClick={fetchAdvances}
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
              {filtered.map((a) => (
                <div
                  key={a.id}
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
                        {a.User?.name || "Employee"}{" "}
                        <span style={{ color: theme.neutral.gray600, fontWeight: 600, fontSize: 12 }}>
                          ({a.User?.employeeCode || a.userId})
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: theme.neutral.gray600, marginTop: 3, lineHeight: 1.4 }}>
                        {a.month}/{a.year} · <strong>{Number(a.amount || 0).toLocaleString("en-US")} VND</strong>
                      </div>
                      {a.reason ? (
                        <div style={{ fontSize: 12, color: theme.neutral.gray800, marginTop: 4, lineHeight: 1.4 }}>
                          <span style={{ color: theme.neutral.gray500, fontWeight: 600 }}>Reason:</span> {a.reason}
                        </div>
                      ) : null}
                      <div style={{ fontSize: 11, color: theme.neutral.gray600, marginTop: 3 }}>
                        <b style={{ fontWeight: 600 }}>{a.approvalStatus}</b>
                        <span style={{ margin: "0 6px", color: theme.neutral.gray400 }}>·</span>
                        Deducted: {a.isDeducted ? "Yes" : "No"}
                        {a.approvalStatus === "approved" && (
                          <>
                            <span style={{ margin: "0 6px", color: theme.neutral.gray400 }}>·</span>
                            {a.disbursedAt ? "Disbursed" : `Payout from ${a.payoutDueDate || "—"}`}
                          </>
                        )}
                      </div>
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => togglePreview(a.id)}
                          disabled={!!previewLoadingId}
                          style={{
                            padding: "5px 10px",
                            borderRadius: theme.radius.sm,
                            border: `1px solid ${theme.neutral.gray300}`,
                            backgroundColor: theme.neutral.white,
                            fontWeight: 600,
                            fontSize: 12,
                            cursor: previewLoadingId ? "not-allowed" : "pointer",
                          }}
                        >
                          {openPreviewId === a.id ? "Hide payroll preview" : "Payroll preview"}
                        </button>
                        {userRole === "accountant" &&
                          a.approvalStatus === "approved" &&
                          !a.disbursedAt && (
                            <button
                              type="button"
                              onClick={() => handleDisburse(a.id)}
                              disabled={loading}
                              style={{
                                padding: "5px 10px",
                                borderRadius: theme.radius.sm,
                                border: "none",
                                backgroundColor: theme.info?.main || "#0284c7",
                                color: theme.neutral.white,
                                fontWeight: 600,
                                fontSize: 12,
                                cursor: loading ? "not-allowed" : "pointer",
                              }}
                            >
                              Mark disbursed
                            </button>
                          )}
                      </div>
                      {openPreviewId === a.id && (
                        <div
                          style={{
                            marginTop: 10,
                            padding: 10,
                            borderRadius: theme.radius.sm,
                            backgroundColor: theme.neutral.white,
                            border: `1px solid ${theme.neutral.gray200}`,
                            fontSize: 12,
                          }}
                        >
                          {previewLoadingId === a.id && <div style={{ color: theme.neutral.gray600 }}>Loading preview…</div>}
                          {!previewLoadingId && previewById[a.id]?.preview && (
                            <div style={{ display: "grid", gap: 6 }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>Gross</span>
                                <strong>{formatMoney(previewById[a.id].preview.grossSalary)}</strong>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", color: "#b45309" }}>
                                <span>Advance (this request)</span>
                                <strong>−{formatMoney(previewById[a.id].preview.advanceDeduction)}</strong>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626" }}>
                                <span>Total deductions</span>
                                <strong>{formatMoney(previewById[a.id].preview.deduction)}</strong>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                                <span>Net (preview)</span>
                                <span>{formatMoney(previewById[a.id].preview.finalSalary)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => fetchPreview(a.id)}
                                style={{
                                  marginTop: 4,
                                  fontSize: 11,
                                  padding: "4px 8px",
                                  alignSelf: "flex-start",
                                }}
                              >
                                Refresh numbers
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {a.approvalStatus === "pending" ? (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => handleAction(a.id, "approve")}
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
                          onClick={() => handleAction(a.id, "reject")}
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




