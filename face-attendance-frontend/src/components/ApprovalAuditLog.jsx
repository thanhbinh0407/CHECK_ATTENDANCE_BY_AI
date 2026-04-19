import { useEffect, useMemo, useRef, useState } from "react";
import socket from "../socket";
import "./approvalAuditLog.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function getHeaders() {
  const token = localStorage.getItem("authToken");
  return { Authorization: `Bearer ${token}` };
}

/** Same palette as Accounts & Permissions (UserManagement) */
const ROLE_COLORS = {
  manager: { bg: "#e9d8fd", color: "#553c9a" },
  supervisor: { bg: "#bee3f8", color: "#2c5282" },
  hr: { bg: "#c6f6d5", color: "#276749" },
  accountant: { bg: "#fefcbf", color: "#744210" },
  employee: { bg: "#e2e8f0", color: "#4a5568" },
  system: { bg: "#fde68a", color: "#92400e" },
};

const ROLE_LABELS = {
  manager: "Manager",
  supervisor: "Supervisor",
  hr: "HR Staff",
  accountant: "Accountant",
  employee: "Employee",
  system: "System",
};

const ROLE_ICONS = {
  manager: "🏢",
  supervisor: "✅",
  hr: "👥",
  accountant: "💰",
  employee: "👤",
  system: "⚙️",
};

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "manager", label: "🏢 Manager" },
  { value: "supervisor", label: "✅ Supervisor" },
  { value: "hr", label: "👥 HR Staff" },
  { value: "accountant", label: "💰 Accountant" },
  { value: "employee", label: "👤 Employee" },
];

const REQUEST_TYPE_OPTIONS = [
  { value: "", label: "All request types" },
  { value: "leave", label: "Leave" },
  { value: "overtime", label: "Overtime" },
  { value: "business_trip", label: "Business Trip" },
  { value: "salary_advance", label: "Salary Advance" },
];

const REQUEST_TYPE_LABELS = {
  leave: "Leave",
  overtime: "Overtime",
  business_trip: "Business Trip",
  salary_advance: "Salary Advance",
  other: "Payroll / Other",
};

const STATUS_OPTIONS = [
  { value: "", label: "All approval statuses" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "skipped", label: "Skipped" },
  { value: "pending", label: "Pending" },
];

const ACTION_CATEGORY_OPTIONS = [
  { value: "", label: "All action categories" },
  { value: "employee_lifecycle", label: "Employee lifecycle" },
  { value: "employee_update", label: "Employee update" },
  { value: "password", label: "Password" },
  { value: "role_change", label: "Role change" },
  { value: "own_request", label: "Own request" },
  { value: "own_profile", label: "Own profile" },
  { value: "own_document", label: "Own document" },
  { value: "own_qualification", label: "Own qualification" },
  { value: "own_dependent", label: "Own dependent" },
  { value: "own_work_experience", label: "Own work experience" },
  { value: "own_notification", label: "Own notification" },
  { value: "other", label: "Other" },
];

const CATEGORY_LABELS = Object.fromEntries(
  ACTION_CATEGORY_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label])
);

const ADMIN_ACTION_LABELS = {
  "employee.create": "Created employee",
  "employee.bulk_create": "Bulk created employees",
  "employee.update": "Updated employee",
  "employee.update_role": "Updated employee role",
  "employee.deactivate": "Deactivated employee",
  "employee.restore": "Restored employee",
  "employee.delete_permanent": "Permanently deleted employee",
  "employee.reset_password": "Reset employee password",
};

function humanizeAction(action) {
  if (!action) return "Action";
  if (ADMIN_ACTION_LABELS[action]) return ADMIN_ACTION_LABELS[action];
  const parts = action.split(".");
  const head = parts[0] ? parts[0].replace(/_/g, " ") : "";
  const tail = parts.slice(1).join(" ").replace(/_/g, " ");
  const s = [head, tail].filter(Boolean).join(" • ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function RoleBadge({ role }) {
  const key = (role || "").toLowerCase();
  const style = ROLE_COLORS[key] || ROLE_COLORS.employee;
  const label = ROLE_LABELS[key] || (role ? String(role) : "—");
  const icon = ROLE_ICONS[key] || "•";
  return (
    <span className="aal-role-pill" style={{ background: style.bg, color: style.color }}>
      <span aria-hidden>{icon}</span> {label}
    </span>
  );
}

function ActionBadge({ status }) {
  const s = (status || "").toLowerCase();
  let cls = "aal-action-pill aal-action-pending";
  if (s === "approved") cls = "aal-action-pill aal-action-approved";
  else if (s === "rejected") cls = "aal-action-pill aal-action-rejected";
  else if (s === "skipped") cls = "aal-action-pill aal-action-skipped";
  else if (s === "pending") cls = "aal-action-pill aal-action-pending";
  return <span className={cls}>{status || "—"}</span>;
}

function AdminActionBadge({ action, category }) {
  const label = humanizeAction(action);
  let cls = "aal-action-pill aal-action-admin";
  if (category === "employee_lifecycle") cls += " aal-action-lifecycle";
  else if (category === "password") cls += " aal-action-password";
  else if (category === "role_change") cls += " aal-action-role";
  else if (category === "employee_update") cls += " aal-action-update";
  return <span className={cls}>{label}</span>;
}

function requestTypeLabel(type) {
  if (!type) return "—";
  return REQUEST_TYPE_LABELS[type] || CATEGORY_LABELS[type] || String(type).replace(/_/g, " ");
}

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(d) {
  if (!d) return "—";
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString("vi-VN");
  } catch {
    return String(d);
  }
}

function formatDateTime(d) {
  if (!d) return "—";
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    return date.toLocaleString("vi-VN");
  } catch {
    return String(d);
  }
}

function formatCurrency(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `${n.toLocaleString("vi-VN")} đ`;
}

function dayKeyFromDate(d) {
  if (!d) return null;
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
  } catch {
    return null;
  }
}

/**
 * Decide whether a live `audit:new` payload should trigger an auto-refresh
 * given the filters currently in effect. Mirrors the server-side filtering
 * in `getApprovalAuditLogs` so the user never sees a refresh that would not
 * change what they are looking at.
 */
function eventMatchesFilters(payload, filters) {
  if (!payload) return false;
  const kind = payload.kind || "action_audit";

  const role = filters.role || "";
  const requestType = filters.requestType || "";
  const status = filters.status || "";
  const actionCategory = filters.actionCategory || "";
  const fromDate = filters.fromDate || "";
  const toDate = filters.toDate || "";

  const ts = payload.approvedAt || payload.createdAt;
  if (fromDate || toDate) {
    const day = dayKeyFromDate(ts);
    if (!day) return false;
    if (fromDate && day < fromDate) return false;
    if (toDate && day > toDate) return false;
  }

  if (kind === "approval") {
    // actionCategory is ActionAudit-specific; when set, approval rows
    // are excluded server-side — so the live row would not show either.
    if (actionCategory) return false;
    if (requestType && payload.requestType !== requestType) return false;
    if (status && String(payload.status || "").toLowerCase() !== status) return false;
    if (role) {
      const approverRole = String(payload.Approver?.role || "").toLowerCase();
      if (approverRole !== role) return false;
    }
    return true;
  }

  // action_audit (default) — server drops ActionAudit when requestType or
  // status filter is active, so live refresh is also suppressed.
  if (requestType || status) return false;
  if (actionCategory && payload.category !== actionCategory) return false;
  if (role) {
    const actorRole = String(payload.actorRole || payload.Actor?.role || "").toLowerCase();
    if (actorRole !== role) return false;
  }
  return true;
}

function formatActionVerb(status) {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "Approved";
  if (s === "rejected") return "Rejected";
  if (s === "skipped") return "Skipped";
  if (s === "pending") return "Pending on";
  return capitalize(status || "Acted on");
}

function describeTargetEmployee(log) {
  if (log.TargetEmployee?.name) return log.TargetEmployee.name;
  if (log.TargetEmployee?.employeeCode) return log.TargetEmployee.employeeCode;
  return `Employee #${log.requestId ?? "?"}`;
}

function buildDescription(log) {
  if (log.kind === "admin_action") {
    return log.summary || humanizeAction(log.action);
  }
  if (log.kind === "actor_daily_summary" || log.kind === "employee_summary") {
    const roleKey = (log.Approver?.role || "employee").toLowerCase();
    const roleLabel = ROLE_LABELS[roleKey] || capitalize(roleKey);
    const who = log.Approver?.name || `${roleLabel} #${log.requestId}`;
    return `Daily summary · ${who} (${roleLabel}) performed ${log.count} action(s) on ${log.dayKey}`;
  }
  const verb = formatActionVerb(log.status);
  const typeLabel = requestTypeLabel(log.requestType);
  const who = describeTargetEmployee(log);
  const d = log.details || {};
  let summary = "";
  if (log.requestType === "leave") {
    if (d.days || d.startDate || d.endDate) {
      const parts = [];
      if (d.days) parts.push(`${d.days} day(s)`);
      if (d.startDate && d.endDate) parts.push(`${formatDate(d.startDate)} → ${formatDate(d.endDate)}`);
      if (parts.length) summary = ` (${parts.join(", ")})`;
    }
  } else if (log.requestType === "overtime") {
    const parts = [];
    if (d.date) parts.push(formatDate(d.date));
    if (d.totalHours) parts.push(`${d.totalHours}h`);
    if (parts.length) summary = ` (${parts.join(", ")})`;
  } else if (log.requestType === "business_trip") {
    const parts = [];
    if (d.destination) parts.push(d.destination);
    if (d.startDate && d.endDate) parts.push(`${formatDate(d.startDate)} → ${formatDate(d.endDate)}`);
    if (parts.length) summary = ` (${parts.join(", ")})`;
  } else if (log.requestType === "salary_advance") {
    if (d.amount) summary = ` (${formatCurrency(d.amount)})`;
  } else if (log.requestType === "other" && d.month) {
    summary = ` (payroll ${String(d.month).padStart(2, "0")}/${d.year})`;
  }
  return `${verb} ${typeLabel} for ${who}${summary}`;
}

export default function ApprovalAuditLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    role: "",
    requestType: "",
    status: "",
    actionCategory: "",
    fromDate: "",
    toDate: "",
  });
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, totalPages: 1, total: 0 });
  const [selected, setSelected] = useState(null);
  const [hasNewEvents, setHasNewEvents] = useState(false);
  const [newEventCount, setNewEventCount] = useState(0);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const pageRef = useRef(page);
  pageRef.current = page;

  const hasFilters = useMemo(
    () =>
      Boolean(
        filters.role ||
          filters.requestType ||
          filters.status ||
          filters.actionCategory ||
          filters.fromDate ||
          filters.toDate
      ),
    [filters]
  );

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError("");
      setHasNewEvents(false);
      setNewEventCount(0);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(meta.pageSize || 20),
      });
      if (filters.role) params.set("role", filters.role);
      if (filters.requestType) params.set("requestType", filters.requestType);
      if (filters.status) params.set("status", filters.status);
      if (filters.actionCategory) params.set("actionCategory", filters.actionCategory);
      if (filters.fromDate) params.set("fromDate", filters.fromDate);
      if (filters.toDate) params.set("toDate", filters.toDate);

      const res = await fetch(`${API_BASE}/api/admin/audits/approval-actions?${params.toString()}`, {
        headers: getHeaders(),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        /* ignore */
      }
      if (!res.ok || data.status !== "success") {
        setError(data.message || "Cannot load approval audit logs.");
        return;
      }
      setRows(data.logs || []);
      setMeta(data.pagination || { page, pageSize: 20, totalPages: 1, total: 0 });
    } catch (e) {
      setError(`Cannot load approval audit logs: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.role, filters.requestType, filters.status, filters.actionCategory, filters.fromDate, filters.toDate]);

  // Socket.IO: join `audit-managers` room and listen for new audit events
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const handleConnect = () => {
      socket.emit("join-room", { room: "audit-managers" });
    };
    const handleNew = (payload) => {
      const f = filtersRef.current;
      const onFirstPage = pageRef.current === 1;
      const matches = eventMatchesFilters(payload, f);

      // Auto-refresh only when the user is on page 1 AND the incoming
      // event would actually appear in their currently-filtered view.
      // Any other case just surfaces the live banner so the user can
      // choose when to refresh without losing their place.
      if (onFirstPage && matches) {
        loadLogs();
      } else if (matches || !payload) {
        setHasNewEvents(true);
        setNewEventCount((n) => n + 1);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("audit:new", handleNew);
    if (socket.connected) handleConnect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("audit:new", handleNew);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="aal-page">
      <header className="aal-hero">
        <div>
          <h1>Approval Responsibility Log</h1>
          <p className="aal-hero-desc">
            Every mutating action taken by managers, HR, accountants, supervisors, and employees — with role,
            target and timestamp for full accountability.
          </p>
          <div className="aal-meta">
            <span aria-hidden>📋</span>
            {loading ? "Loading…" : `${meta.total || 0} record(s) loaded`}
          </div>
        </div>
        <button type="button" className="aal-btn-refresh" onClick={loadLogs}>
          Refresh
        </button>
      </header>

      <div className="aal-toolbar">
        <div className="aal-toolbar-grid">
          <select
            className="aal-select"
            value={filters.role}
            onChange={(e) => {
              setFilters((p) => ({ ...p, role: e.target.value }));
              setPage(1);
            }}
          >
            {ROLE_OPTIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
          <select
            className="aal-select"
            value={filters.actionCategory}
            onChange={(e) => {
              setFilters((p) => ({ ...p, actionCategory: e.target.value }));
              setPage(1);
            }}
          >
            {ACTION_CATEGORY_OPTIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
          <select
            className="aal-select"
            value={filters.requestType}
            onChange={(e) => {
              setFilters((p) => ({ ...p, requestType: e.target.value }));
              setPage(1);
            }}
          >
            {REQUEST_TYPE_OPTIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
          <select
            className="aal-select"
            value={filters.status}
            onChange={(e) => {
              setFilters((p) => ({ ...p, status: e.target.value }));
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
          <div className="aal-date-wrap">
            <span className="aal-date-label">FROM</span>
            <input
              className="aal-date-input"
              type="date"
              value={filters.fromDate}
              onChange={(e) => {
                setFilters((p) => ({ ...p, fromDate: e.target.value }));
                setPage(1);
              }}
            />
          </div>
          <div className="aal-date-wrap">
            <span className="aal-date-label">TO</span>
            <input
              className="aal-date-input"
              type="date"
              value={filters.toDate}
              onChange={(e) => {
                setFilters((p) => ({ ...p, toDate: e.target.value }));
                setPage(1);
              }}
            />
          </div>
        </div>
        {hasFilters && (
          <button
            type="button"
            className="aal-clear"
            onClick={() => {
              setFilters({
                role: "",
                requestType: "",
                status: "",
                actionCategory: "",
                fromDate: "",
                toDate: "",
              });
              setPage(1);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="aal-body">
        {error && <div className="aal-alert" role="alert">{error}</div>}

        {hasNewEvents && (
          <div className="aal-live-banner" role="status" aria-live="polite">
            <span className="aal-live-banner-text">
              <span className="aal-live-banner-dot" aria-hidden />
              {newEventCount > 0
                ? `${newEventCount} new event${newEventCount === 1 ? "" : "s"} available`
                : "New activity available"}
            </span>
            <button
              type="button"
              className="aal-live-banner-btn"
              onClick={() => {
                setPage(1);
                loadLogs();
              }}
            >
              Refresh now
            </button>
          </div>
        )}

        {loading ? (
          <div className="aal-loading">Loading audit logs…</div>
        ) : (
          <div className="aal-table-wrap">
            <table className="aal-table">
              <thead>
                <tr>
                  {["Time", "Actor", "Role", "Action", "Category", "Target / Ref", "Description", ""].map((h, idx) => (
                    <th key={`${h}-${idx}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((log) => (
                  <AuditRow key={log.id} log={log} onOpen={setSelected} />
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="aal-empty">
                      {hasFilters
                        ? "No audit logs match the selected filters."
                        : "No audit logs yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <footer className="aal-footer">
          <button
            type="button"
            className="aal-page-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="aal-page-info">
            Page {meta.page || page} / {meta.totalPages || 1}
          </span>
          <button
            type="button"
            className="aal-page-btn"
            disabled={page >= (meta.totalPages || 1)}
            onClick={() => setPage((p) => Math.min(meta.totalPages || 1, p + 1))}
          >
            Next
          </button>
        </footer>
      </div>

      {selected?.kind === "actor_daily_summary" || selected?.kind === "employee_summary" ? (
        <ActorDayModal log={selected} onClose={() => setSelected(null)} />
      ) : selected ? (
        <ApprovalDetailsModal log={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function AuditRow({ log, onOpen }) {
  const time = log.approvedAt || log.updatedAt;
  const role = log.Approver?.role;
  const isSummary =
    log.kind === "actor_daily_summary" || log.kind === "employee_summary";
  const isAdminAction = log.kind === "admin_action";

  let rowClass = "";
  if (isSummary) rowClass = "aal-row-summary";
  else if (isAdminAction) rowClass = "aal-row-admin";

  const topCategoryLabel = isSummary && log.topCategory
    ? (CATEGORY_LABELS[log.topCategory] ||
        REQUEST_TYPE_LABELS[log.topCategory] ||
        String(log.topCategory).replace(/_/g, " "))
    : null;

  return (
    <tr className={rowClass}>
      <td className="aal-time">{time ? new Date(time).toLocaleString("vi-VN") : "—"}</td>
      <td>
        <div className="aal-approver-name">{log.Approver?.name || "—"}</div>
        <div className="aal-approver-sub">
          {log.Approver?.employeeCode || log.Approver?.email || ""}
        </div>
      </td>
      <td>
        <RoleBadge role={role} />
      </td>
      <td>
        {isSummary ? (
          <span className="aal-summary-badge">Daily summary · {log.count}</span>
        ) : isAdminAction ? (
          <AdminActionBadge action={log.action} category={log.category} />
        ) : (
          <ActionBadge status={log.status} />
        )}
      </td>
      <td>
        {isSummary ? (
          <span className="aal-type-tag">
            {topCategoryLabel ? `Mixed · top: ${topCategoryLabel}` : "Daily summary"}
          </span>
        ) : isAdminAction ? (
          <span className="aal-type-tag">{CATEGORY_LABELS[log.category] || log.category || "—"}</span>
        ) : (
          <span className="aal-type-tag">{requestTypeLabel(log.requestType)}</span>
        )}
      </td>
      <td>
        {isSummary ? (
          <span className="aal-req-id">{log.dayKey}</span>
        ) : isAdminAction ? (
          <span className="aal-req-id">
            {log.TargetEmployee?.name || (log.entityId ? `#${log.entityId}` : "—")}
          </span>
        ) : (
          <span className="aal-req-id">#{log.requestId}</span>
        )}
      </td>
      <td>
        <div className="aal-description">{buildDescription(log)}</div>
        {log.comments && (
          <div className="aal-description-note" title={log.comments}>
            Note: {log.comments}
          </div>
        )}
      </td>
      <td>
        <button type="button" className="aal-details-btn" onClick={() => onOpen(log)}>
          Details
        </button>
      </td>
    </tr>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="aal-modal-row">
      <span className="aal-modal-label">{label}</span>
      <span className="aal-modal-value">{value ?? "—"}</span>
    </div>
  );
}

function renderRequestDetails(log) {
  const d = log.details || {};
  const type = log.requestType;
  if (type === "leave") {
    return (
      <>
        <DetailRow label="Leave type" value={d.type ? capitalize(String(d.type).replace(/_/g, " ")) : "—"} />
        <DetailRow label="From → To" value={`${formatDate(d.startDate)} → ${formatDate(d.endDate)}`} />
        <DetailRow label="Days" value={d.days ?? "—"} />
        <DetailRow label="Reason" value={d.reason || "—"} />
      </>
    );
  }
  if (type === "overtime") {
    return (
      <>
        <DetailRow label="Date" value={formatDate(d.date)} />
        <DetailRow label="Time" value={d.startTime && d.endTime ? `${d.startTime} – ${d.endTime}` : "—"} />
        <DetailRow label="Total hours" value={d.totalHours ? `${d.totalHours}h` : "—"} />
        <DetailRow label="Project" value={d.projectName || "—"} />
        <DetailRow label="Reason" value={d.reason || "—"} />
      </>
    );
  }
  if (type === "business_trip") {
    return (
      <>
        <DetailRow label="Destination" value={d.destination || "—"} />
        <DetailRow label="From → To" value={`${formatDate(d.startDate)} → ${formatDate(d.endDate)}`} />
        <DetailRow label="Transport" value={d.transportType || "—"} />
        <DetailRow label="Estimated cost" value={d.estimatedCost ? formatCurrency(d.estimatedCost) : "—"} />
        <DetailRow label="Purpose" value={d.purpose || "—"} />
      </>
    );
  }
  if (type === "salary_advance") {
    return (
      <>
        <DetailRow label="Amount" value={formatCurrency(d.amount)} />
        <DetailRow label="Month / Year" value={d.month && d.year ? `${String(d.month).padStart(2, "0")}/${d.year}` : "—"} />
        <DetailRow label="Requested on" value={formatDate(d.requestDate)} />
        <DetailRow label="Reason" value={d.reason || "—"} />
      </>
    );
  }
  if (type === "other") {
    return (
      <>
        <DetailRow
          label="Payroll period"
          value={d.month && d.year ? `${String(d.month).padStart(2, "0")}/${d.year}` : "—"}
        />
        <DetailRow label="Total income" value={d.totalIncome ? formatCurrency(d.totalIncome) : "—"} />
        <DetailRow label="Total deduction" value={d.totalDeduction ? formatCurrency(d.totalDeduction) : "—"} />
        <DetailRow label="Net salary" value={d.netSalary ? formatCurrency(d.netSalary) : "—"} />
      </>
    );
  }
  return <DetailRow label="Details" value="—" />;
}

function renderAdminMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return null;
  const entries = Object.entries(metadata);
  if (!entries.length) return <DetailRow label="Metadata" value="—" />;
  return entries.map(([k, v]) => {
    let display = v;
    if (v === null || v === undefined) display = "—";
    else if (typeof v === "object") {
      try {
        display = JSON.stringify(v);
      } catch {
        display = String(v);
      }
    } else {
      display = String(v);
    }
    return <DetailRow key={k} label={k} value={display} />;
  });
}

function ApprovalDetailsModal({ log, onClose }) {
  const approver = log.Approver || {};
  const target = log.TargetEmployee || {};
  const time = log.approvedAt || log.updatedAt;
  const isAdminAction = log.kind === "admin_action";

  return (
    <div className="aal-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="aal-modal" onClick={(e) => e.stopPropagation()}>
        <header className="aal-modal-header">
          <div>
            <h2>{isAdminAction ? "Admin Action Details" : "Action Details"}</h2>
            <p className="aal-modal-sub">{buildDescription(log)}</p>
          </div>
          <button type="button" className="aal-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="aal-modal-body">
          <section className="aal-modal-section">
            <h3>Action</h3>
            <div className="aal-modal-grid">
              <DetailRow label="Time" value={formatDateTime(time)} />
              {isAdminAction ? (
                <>
                  <DetailRow label="Action" value={<AdminActionBadge action={log.action} category={log.category} />} />
                  <DetailRow label="Category" value={CATEGORY_LABELS[log.category] || log.category || "—"} />
                  <DetailRow label="Action key" value={log.action} />
                </>
              ) : (
                <>
                  <DetailRow label="Status" value={<ActionBadge status={log.status} />} />
                  <DetailRow label="Level" value={log.level ?? "—"} />
                  <DetailRow label="Request" value={`${requestTypeLabel(log.requestType)} #${log.requestId}`} />
                </>
              )}
            </div>
          </section>

          <section className="aal-modal-section">
            <h3>{isAdminAction ? "Actor" : "Approver"}</h3>
            <div className="aal-modal-grid">
              <DetailRow label="Name" value={approver.name || "—"} />
              <DetailRow label="Role" value={<RoleBadge role={approver.role} />} />
              <DetailRow label="Employee code" value={approver.employeeCode || "—"} />
              <DetailRow label="Email" value={approver.email || "—"} />
            </div>
          </section>

          <section className="aal-modal-section">
            <h3>Target employee</h3>
            <div className="aal-modal-grid">
              <DetailRow label="Name" value={target.name || "—"} />
              <DetailRow label="Employee code" value={target.employeeCode || "—"} />
              <DetailRow label="Email" value={target.email || "—"} />
            </div>
          </section>

          <section className="aal-modal-section">
            <h3>{isAdminAction ? "Metadata" : "Request details"}</h3>
            <div className="aal-modal-grid">
              {isAdminAction ? renderAdminMetadata(log.details) : renderRequestDetails(log)}
            </div>
          </section>

          {log.comments && (
            <section className="aal-modal-section">
              <h3>Note / Comment</h3>
              <div className="aal-modal-note">{log.comments}</div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ActorDayModal({ log, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API_BASE}/api/admin/audits/employee-day/${log.requestId}?date=${encodeURIComponent(log.dayKey)}`,
          { headers: getHeaders() }
        );
        let body = {};
        try {
          body = await res.json();
        } catch {
          /* ignore */
        }
        if (cancel) return;
        if (!res.ok || body.status !== "success") {
          setErr(body.message || "Failed to load actor actions.");
          return;
        }
        setData(body);
      } catch (e) {
        if (!cancel) setErr(e.message);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [log.requestId, log.dayKey]);

  const actor = data?.employee || log.Approver || {};
  const roleKey = (actor.role || log.Approver?.role || "employee").toLowerCase();
  const roleLabel = ROLE_LABELS[roleKey] || capitalize(roleKey);

  return (
    <div className="aal-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="aal-modal aal-modal-lg" onClick={(e) => e.stopPropagation()}>
        <header className="aal-modal-header">
          <div>
            <h2>{roleLabel} Daily Timeline</h2>
            <p className="aal-modal-sub">
              {actor.name || `${roleLabel} #${log.requestId}`}
              {actor.employeeCode ? ` (${actor.employeeCode})` : ""} — {log.dayKey}
              {data?.total ? ` · ${data.total} action(s)` : ""}
            </p>
          </div>
          <button type="button" className="aal-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="aal-modal-body">
          {loading && <div className="aal-loading">Loading timeline…</div>}
          {err && <div className="aal-alert">{err}</div>}
          {!loading && !err && data && (
            <>
              <section className="aal-modal-section">
                <h3>Breakdown</h3>
                <div className="aal-breakdown">
                  {Object.entries(log.breakdown || {}).map(([action, count]) => (
                    <span key={action} className="aal-breakdown-chip">
                      {humanizeAction(action)} · {count}
                    </span>
                  ))}
                  {Object.keys(log.breakdown || {}).length === 0 && <span>—</span>}
                </div>
              </section>

              {(data.hourGroups || []).length === 0 ? (
                <div className="aal-empty">No recorded actions.</div>
              ) : (
                (data.hourGroups || []).map((group) => {
                  const items = Array.isArray(group.items) ? group.items : [];
                  // Badge shows what's actually rendered, not a server-side
                  // count that might drift from the items array.
                  const actionLabel = `${items.length} action${items.length === 1 ? "" : "s"}`;
                  return (
                  <section key={group.hour} className="aal-hour-group">
                    <div className="aal-hour-label">
                      <span>{group.hour}:00</span>
                      <span className="aal-hour-count">{actionLabel}</span>
                    </div>
                    <ul className="aal-hour-list">
                      {items.map((it, idx) => {
                        const isApproval = it.kind === "approval";
                        // Composite key guards against any duplicate `it.id`
                        // sneaking through from the server so React never
                        // silently drops a row.
                        const rowKey = `${it.id || "row"}-${it.createdAt || ""}-${idx}`;
                        return (
                          <li key={rowKey} className="aal-hour-item">
                            <div className="aal-hour-time">
                              {new Date(it.createdAt).toLocaleTimeString("vi-VN")}
                            </div>
                            <div className="aal-hour-body">
                              <div className="aal-hour-title">
                                <strong>{humanizeAction(it.action)}</strong>
                                {isApproval && it.TargetUser?.name ? (
                                  <span className="aal-hour-ref">
                                    {" · for "}
                                    <strong>{it.TargetUser.name}</strong>
                                    {it.TargetUser.employeeCode
                                      ? ` (${it.TargetUser.employeeCode})`
                                      : ""}
                                  </span>
                                ) : it.entityType && it.entityId ? (
                                  <span className="aal-hour-ref">
                                    {" · "}
                                    {it.entityType} #{it.entityId}
                                  </span>
                                ) : null}
                              </div>
                              {it.summary && <div className="aal-hour-summary">{it.summary}</div>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
