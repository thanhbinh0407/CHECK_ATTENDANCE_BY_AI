import React, { useState, useEffect, useCallback, useMemo } from "react";
import { theme } from "../theme.js";

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes salaryApprovalToast {
    from { transform: translateX(120%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
if (!document.head.querySelector("style[data-salary-approval-toast]")) {
  styleSheet.setAttribute("data-salary-approval-toast", "true");
  document.head.appendChild(styleSheet);
}

function currentUserRole() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw)?.role || null;
  } catch {
    return null;
  }
}

function parseRejectionReason(notes) {
  if (typeof notes !== "string") return "";
  return notes.replace(/^\[REJECTED\]\s*/i, "").trim();
}

async function readApiError(res) {
  try {
    const d = await res.json();
    return d.message || d.error || `Error ${res.status}`;
  } catch {
    return res.statusText || `Error ${res.status}`;
  }
}

/**
 * Luồng: pending → (Supervisor/Manager duyệt) → approved → (Kế toán mark paid) → paid
 * Trang này nằm trên accountant-client nhưng nút Duyệt/Từ chối chỉ cho supervisor/manager (theo API).
 * Kế toán: theo dõi hàng chờ + bản ghi bị trả về để tính lại lương.
 */
export default function SalaryApprovalDashboard({ onNavigate } = {}) {
  const [pendingSalaries, setPendingSalaries] = useState([]);
  const [awaitingRecalc, setAwaitingRecalc] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [approvalInProgress, setApprovalInProgress] = useState({});
  const [showRejectReason, setShowRejectReason] = useState({});
  const [rejectReasons, setRejectReasons] = useState({});
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const role = useMemo(() => currentUserRole(), []);
  const canApprove = role === "manager" || role === "supervisor";
  const isAccountant = role === "accountant";

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(t);
  }, [message]);

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  }, [now]);

  const fetchPendingSalaries = useCallback(async () => {
    const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
    const token = localStorage.getItem("authToken");
    if (!token) {
      setFetchError("Not signed in.");
      setLoading(false);
      return;
    }
    setFetchError("");
    try {
      setLoading(true);
      const res = await fetch(
        `${apiBase}/api/salary/pending?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.message || "Could not load the list.");
        setPendingSalaries([]);
        setAwaitingRecalc([]);
        return;
      }
      setPendingSalaries(data.salaries || []);
      setAwaitingRecalc(data.awaitingRecalc || []);
    } catch (e) {
      console.error(e);
      setFetchError(e.message || "Network error.");
      setPendingSalaries([]);
      setAwaitingRecalc([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchPendingSalaries();
  }, [fetchPendingSalaries]);

  const clearProgress = (salaryId) => {
    setApprovalInProgress((prev) => {
      const next = { ...prev };
      delete next[salaryId];
      return next;
    });
  };

  const approveSalary = async (salaryId) => {
    const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
    const token = localStorage.getItem("authToken");
    setApprovalInProgress((p) => ({ ...p, [salaryId]: "approving" }));
    try {
      const res = await fetch(`${apiBase}/api/salary/${salaryId}/approve`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const msg = await readApiError(res);
        setMessage(`❌ ${msg}`);
        clearProgress(salaryId);
        return;
      }
      await fetchPendingSalaries();
      setMessage("✅ Payroll approved. Accountants can mark as paid when ready.");
      clearProgress(salaryId);
    } catch (e) {
      console.error(e);
      setMessage("❌ Error while approving.");
      clearProgress(salaryId);
    }
  };

  const rejectSalary = async (salaryId) => {
    const reason = (rejectReasons[salaryId] || "").trim();
    if (!reason) {
      setMessage("❌ Please enter a rejection reason.");
      return;
    }
    const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
    const token = localStorage.getItem("authToken");
    setApprovalInProgress((p) => ({ ...p, [salaryId]: "rejecting" }));
    try {
      const res = await fetch(`${apiBase}/api/salary/${salaryId}/reject`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const msg = await readApiError(res);
        setMessage(`❌ ${msg}`);
        clearProgress(salaryId);
        return;
      }
      await fetchPendingSalaries();
      setShowRejectReason((p) => ({ ...p, [salaryId]: false }));
      setRejectReasons((p) => {
        const n = { ...p };
        delete n[salaryId];
        return n;
      });
      setMessage("✅ Rejection saved. Record moves to “Awaiting recalculation” — please rerun salary calculation.");
      clearProgress(salaryId);
    } catch (e) {
      console.error(e);
      setMessage("❌ Error while rejecting.");
      clearProgress(salaryId);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN").format(Number(amount) || 0) + " ₫";

  const formatPayPeriod = (s) => {
    const y = Number(s.year);
    const m = Number(s.month);
    if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
      return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    return `${s.month ?? "—"}/${s.year ?? "—"}`;
  };

  const formatCalculatedShort = (s) => {
    const raw = s.calculatedAt;
    if (!raw) return "—";
    try {
      return new Date(raw).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  /** Net display: align with salary management when DB net is 0 but gross − deductions is negative. */
  const displayNetSalary = (s) => {
    const stored = Number(s.finalSalary);
    const g = parseFloat(s.grossSalary ?? 0);
    const d = parseFloat(s.deduction ?? 0);
    const recomputed = parseFloat((g - d).toFixed(2));
    if (Math.abs(stored) < 0.005 && recomputed < 0) return recomputed;
    return Number.isFinite(stored) ? stored : recomputed;
  };

  const filteredPendingSalaries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pendingSalaries;
    return pendingSalaries.filter((s) => {
      const name = (s.User?.name || "").toLowerCase();
      const code = (s.User?.employeeCode || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [pendingSalaries, searchQuery]);

  const filteredAwaitingRecalc = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return awaitingRecalc;
    return awaitingRecalc.filter((s) => {
      const name = (s.User?.name || "").toLowerCase();
      const code = (s.User?.employeeCode || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [awaitingRecalc, searchQuery]);

  const pendingTableColSpan = 11;

  const thStyle = {
    padding: "12px 14px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: theme.neutral.white,
    borderBottom: "none",
  };

  const cell = { padding: "12px 14px", fontSize: "14px", color: theme.primary.main };

  return (
    <div style={{ padding: "0", maxWidth: "1200px" }}>
      {message && (
        <div
          style={{
            position: "fixed",
            top: "88px",
            right: "24px",
            padding: "14px 18px",
            backgroundColor: message.includes("✅") ? "#ecfdf5" : "#fef2f2",
            color: message.includes("✅") ? "#065f46" : "#991b1b",
            borderRadius: "12px",
            boxShadow: "0 10px 40px rgba(15,23,42,0.12)",
            zIndex: 9999,
            maxWidth: "380px",
            animation: "salaryApprovalToast 0.35s ease-out",
            border: `1px solid ${message.includes("✅") ? "#6ee7b7" : "#fecaca"}`,
            fontSize: "14px",
            lineHeight: 1.45,
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          background: `linear-gradient(135deg, ${theme.primary.dark} 0%, ${theme.primary.main} 100%)`,
          color: "#fff",
          borderRadius: "14px",
          padding: "22px 24px",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: "0 0 8px 0", fontSize: "1.35rem", fontWeight: "800" }}>
          Payroll approval
        </h2>
        <p style={{ margin: 0, opacity: 0.88, fontSize: "14px", maxWidth: "640px", lineHeight: 1.5 }}>
          {canApprove && (
            <>
              You may <strong>approve / reject</strong> records in <em>pending</em> status. Rejection sends the record back for{" "}
              <strong>salary recalculation</strong> (handled by payroll), without deleting data.
            </>
          )}
          {isAccountant && (
            <>
              As <strong>accountant</strong>, you <strong>cannot approve</strong> payroll (per system rules).
              Use this page to <strong>monitor queues</strong> and returned records; after a Director/Supervisor approves,
              use <strong>Salary management</strong> to mark payments.
            </>
          )}
          {!canApprove && !isAccountant && (
            <>
              View payroll pending by month/year. Approval actions are only for <strong>Supervisor</strong> or{" "}
              <strong>Manager</strong>.
            </>
          )}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "flex-end",
          marginBottom: "20px",
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: theme.neutral.gray500, marginBottom: "6px" }}>
            Month
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: `1px solid ${theme.colors.border}`,
              minWidth: "120px",
              fontSize: "14px",
              background: "#fff",
            }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Month {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: theme.neutral.gray500, marginBottom: "6px" }}>
            Year
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: `1px solid ${theme.colors.border}`,
              minWidth: "100px",
              fontSize: "14px",
              background: "#fff",
            }}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => fetchPendingSalaries()}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            border: `1px solid ${theme.accent.main}`,
            background: theme.neutral.white,
            color: theme.accent.dark,
            fontWeight: "700",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Refresh
        </button>
        <div style={{ flex: "1 1 240px", minWidth: "200px", maxWidth: "400px" }}>
          <label
            style={{ display: "block", fontSize: "12px", fontWeight: "600", color: theme.neutral.gray500, marginBottom: "6px" }}
            htmlFor="payroll-approval-search"
          >
            Search
          </label>
          <input
            id="payroll-approval-search"
            type="search"
            placeholder="Name or employee ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "10px",
              border: `1px solid ${theme.colors.border}`,
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>
        <span style={{ fontSize: "14px", color: theme.neutral.gray600, fontWeight: "600", alignSelf: "center" }}>
          {!searchQuery.trim() ? (
            <>
              {pendingSalaries.length} pending
              {awaitingRecalc.length > 0 ? ` · ${awaitingRecalc.length} awaiting recalc` : ""}
            </>
          ) : (
            <>
              {filteredPendingSalaries.length}/{pendingSalaries.length} pending (search)
              {awaitingRecalc.length > 0
                ? ` · ${filteredAwaitingRecalc.length}/${awaitingRecalc.length} awaiting recalc`
                : ""}
            </>
          )}
        </span>
      </div>

      {isAccountant && onNavigate && awaitingRecalc.length > 0 && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: "12px",
            fontSize: "13px",
            color: "#92400e",
          }}
        >
          Some records need <strong>salary recalculation</strong>. Open{" "}
          <button
            type="button"
            onClick={() => onNavigate("salary-calculation")}
            style={{
              border: "none",
              background: "none",
              color: theme.accent.hover,
              fontWeight: "800",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Salary calculation
          </button>{" "}
          for the correct month/year; the record will return to the approval queue (rejection notes cleared).
        </div>
      )}

      {fetchError && (
        <div style={{ padding: "14px", background: "#fef2f2", color: "#991b1b", borderRadius: "10px", marginBottom: "16px" }}>
          {fetchError}
        </div>
      )}

      {loading ? (
        <p style={{ color: theme.neutral.gray500 }}>Loading…</p>
      ) : (
        <>
          <div
            style={{
              background: theme.neutral.white,
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              border: `1px solid ${theme.colors.border}`,
              marginBottom: "24px",
            }}
          >
            <div style={{ padding: "12px 16px", background: theme.neutral.gray50, borderBottom: `1px solid ${theme.colors.border}` }}>
              <strong style={{ color: theme.primary.main }}>Pending approval (Supervisor / Manager)</strong>
            </div>
            {pendingSalaries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: theme.neutral.gray500 }}>
                No payroll pending approval for {selectedMonth}/{selectedYear}.
              </div>
            ) : filteredPendingSalaries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: theme.neutral.gray500 }}>
                No rows match your search. Clear the search box or try another name / ID.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: theme.primary.main }}>
                    <tr>
                      <th style={thStyle}>Employee</th>
                      <th style={thStyle}>Emp. ID</th>
                      <th style={thStyle}>Pay period</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Gross</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Base</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Bonus</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Advance</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Deduction</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Net pay</th>
                      <th style={thStyle}>Calculated</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingSalaries.map((salary) => (
                      <React.Fragment key={salary.id}>
                        <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                          <td style={cell}>
                            <div style={{ fontWeight: "700" }}>{salary.User?.name || "—"}</div>
                            {approvalInProgress[salary.id] === "approving" && (
                              <div style={{ fontSize: "12px", color: theme.accent.main }}>Approving…</div>
                            )}
                            {approvalInProgress[salary.id] === "rejecting" && (
                              <div style={{ fontSize: "12px", color: "#ea580c" }}>Rejecting…</div>
                            )}
                          </td>
                          <td style={{ ...cell, fontWeight: "600" }}>{salary.User?.employeeCode || "—"}</td>
                          <td style={{ ...cell, color: theme.neutral.gray600, fontSize: "13px" }}>
                            {formatPayPeriod(salary)}
                          </td>
                          <td style={{ ...cell, textAlign: "right", fontWeight: "600" }}>{formatCurrency(salary.grossSalary)}</td>
                          <td style={{ ...cell, textAlign: "right" }}>{formatCurrency(salary.baseSalary)}</td>
                          <td style={{ ...cell, textAlign: "right", color: "#059669" }}>+{formatCurrency(salary.bonus)}</td>
                          <td style={{ ...cell, textAlign: "right", color: "#b45309" }}>
                            {Number(salary.advanceDeduction) > 0 ? `−${formatCurrency(salary.advanceDeduction)}` : "—"}
                          </td>
                          <td style={{ ...cell, textAlign: "right", color: "#dc2626" }}>-{formatCurrency(salary.deduction)}</td>
                          <td
                            style={{
                              ...cell,
                              textAlign: "right",
                              fontWeight: "800",
                              color: displayNetSalary(salary) < 0 ? "#b91c1c" : theme.accent.dark,
                            }}
                          >
                            {formatCurrency(displayNetSalary(salary))}
                          </td>
                          <td style={{ ...cell, fontSize: "12px", color: theme.neutral.gray600, whiteSpace: "nowrap" }}>
                            {formatCalculatedShort(salary)}
                          </td>
                          <td style={{ ...cell, textAlign: "center" }}>
                            {!approvalInProgress[salary.id] && canApprove && (
                              <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  onClick={() => approveSalary(salary.id)}
                                  style={{
                                    padding: "8px 14px",
                                    backgroundColor: theme.accent.main,
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowRejectReason((p) => ({
                                      ...p,
                                      [salary.id]: !p[salary.id],
                                    }))
                                  }
                                  style={{
                                    padding: "8px 14px",
                                    backgroundColor: "#fff",
                                    color: "#b91c1c",
                                    border: "1px solid #fecaca",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                  }}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                            {!canApprove && (
                              <span style={{ fontSize: "12px", color: theme.neutral.gray400 }}>View only</span>
                            )}
                          </td>
                        </tr>
                        {showRejectReason[salary.id] && canApprove && (
                          <tr style={{ background: "#fffbeb" }}>
                            <td colSpan={pendingTableColSpan} style={{ padding: "16px" }}>
                              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "13px" }}>
                                Rejection reason (shared with payroll for adjustment / recalc)
                              </label>
                              <textarea
                                value={rejectReasons[salary.id] || ""}
                                onChange={(e) =>
                                  setRejectReasons((p) => ({
                                    ...p,
                                    [salary.id]: e.target.value,
                                  }))
                                }
                                style={{
                                  width: "100%",
                                  maxWidth: "560px",
                                  padding: "10px",
                                  borderRadius: "8px",
                                  border: `1px solid ${theme.colors.border}`,
                                  minHeight: "72px",
                                  fontSize: "14px",
                                }}
                                placeholder="e.g. Wrong attendance, missing allowance…"
                              />
                              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                                <button
                                  type="button"
                                  onClick={() => rejectSalary(salary.id)}
                                  style={{
                                    padding: "8px 16px",
                                    background: "#dc2626",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontWeight: "700",
                                  }}
                                >
                                  Confirm reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowRejectReason((p) => ({
                                      ...p,
                                      [salary.id]: false,
                                    }))
                                  }
                                  style={{
                                    padding: "8px 16px",
                                    background: theme.neutral.gray200,
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontWeight: "600",
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {awaitingRecalc.length > 0 && (
            <div
              style={{
                background: theme.neutral.white,
                borderRadius: "14px",
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                border: `1px solid ${theme.colors.border}`,
              }}
            >
              <div style={{ padding: "12px 16px", background: "#fff7ed", borderBottom: "1px solid #fed7aa" }}>
                <strong style={{ color: "#9a3412" }}>Awaiting salary recalculation (approval rejected)</strong>
                <div style={{ fontSize: "12px", color: "#c2410c", marginTop: "4px" }}>
                  Not shown in the pending queue. After payroll recalculates, the record returns to normal pending approval.
                </div>
              </div>
              {filteredAwaitingRecalc.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px", color: theme.neutral.gray500 }}>
                  No awaiting-recalc rows match your search.
                </div>
              ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: theme.neutral.gray700 }}>
                    <tr>
                      <th style={thStyle}>Employee</th>
                      <th style={thStyle}>Period</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Gross</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Net pay (current)</th>
                      <th style={thStyle}>Rejection reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAwaitingRecalc.map((s) => (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                        <td style={cell}>
                          <strong>{s.User?.name || "—"}</strong>
                          <div style={{ fontSize: "12px", color: theme.neutral.gray500 }}>{s.User?.employeeCode}</div>
                        </td>
                        <td style={cell}>
                          {formatPayPeriod(s)}
                        </td>
                        <td style={{ ...cell, textAlign: "right", fontWeight: "600" }}>{formatCurrency(s.grossSalary)}</td>
                        <td style={{ ...cell, textAlign: "right", fontWeight: "700" }}>{formatCurrency(displayNetSalary(s))}</td>
                        <td style={{ ...cell, fontSize: "13px", color: theme.neutral.gray700 }}>
                          {parseRejectionReason(s.notes) || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
