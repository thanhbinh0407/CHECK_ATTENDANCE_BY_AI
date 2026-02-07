import React, { useEffect, useMemo, useState } from "react";
import { theme } from "../styles/theme.js";

export default function SalaryAdvanceManagement() {
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const token = localStorage.getItem("authToken");

  const [advances, setAdvances] = useState([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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

  const handleAction = async (id, action) => {
    const comments = action === "reject" ? window.prompt("Reason (optional):") : window.prompt("Comments (optional):");
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
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: theme.neutral.white,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.neutral.gray200}`,
    boxShadow: theme.shadows.sm,
    padding: theme.spacing.xl,
  };

  return (
    <div style={{ display: "grid", gap: theme.spacing.xl }}>
      <div style={{ ...cardStyle, background: theme.gradients.primary, color: theme.neutral.white, border: "none" }}>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>💸 Salary Advances</div>
        <div style={{ opacity: 0.95 }}>Approve salary advance requests and track deductions later in payroll.</div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", gap: theme.spacing.md, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.neutral.gray300}`,
              fontWeight: 700,
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
              padding: "10px 14px",
              borderRadius: theme.radius.md,
              border: "none",
              background: theme.secondary.gradient,
              color: theme.neutral.white,
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div style={{ marginTop: theme.spacing.lg }}>
          {filtered.length === 0 ? (
            <div style={{ color: theme.neutral.gray500, fontStyle: "italic" }}>No requests.</div>
          ) : (
            <div style={{ display: "grid", gap: theme.spacing.md }}>
              {filtered.map((a) => (
                <div key={a.id} style={{
                  border: `1px solid ${theme.neutral.gray200}`,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                  backgroundColor: theme.neutral.gray50,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: theme.spacing.md, alignItems: "start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, color: theme.neutral.gray900 }}>
                        {a.User?.name || "Employee"} ({a.User?.employeeCode || a.userId})
                      </div>
                      <div style={{ fontSize: 12, color: theme.neutral.gray600, marginTop: 4 }}>
                        Period: {a.month}/{a.year} • Amount: <b>{Number(a.amount || 0).toLocaleString("en-US")} VND</b>
                      </div>
                      {a.reason ? (
                        <div style={{ fontSize: 13, color: theme.neutral.gray800, marginTop: 8 }}>
                          <b>Reason:</b> {a.reason}
                        </div>
                      ) : null}
                      <div style={{ fontSize: 12, color: theme.neutral.gray600, marginTop: 6 }}>
                        Status: <b>{a.approvalStatus}</b> • Deducted: <b>{a.isDeducted ? "Yes" : "No"}</b>
                      </div>
                    </div>

                    {a.approvalStatus === "pending" ? (
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => handleAction(a.id, "approve")}
                          disabled={loading}
                          style={{
                            padding: "8px 10px",
                            borderRadius: theme.radius.md,
                            border: "none",
                            backgroundColor: theme.success.main,
                            color: theme.neutral.white,
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(a.id, "reject")}
                          disabled={loading}
                          style={{
                            padding: "8px 10px",
                            borderRadius: theme.radius.md,
                            border: "none",
                            backgroundColor: theme.error.main,
                            color: theme.neutral.white,
                            fontWeight: 900,
                            cursor: "pointer",
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
          <div style={{ marginTop: theme.spacing.lg, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.neutral.gray50, border: `1px solid ${theme.neutral.gray200}`, fontWeight: 700 }}>
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}




