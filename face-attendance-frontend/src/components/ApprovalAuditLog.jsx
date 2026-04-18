import { useEffect, useMemo, useState } from "react";
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
};

const ROLE_LABELS = {
  manager: "Manager",
  supervisor: "Supervisor",
  hr: "HR Staff",
  accountant: "Accountant",
  employee: "Employee",
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
  { value: "other", label: "Other / Payroll" },
];

const REQUEST_TYPE_LABELS = {
  leave: "Leave",
  overtime: "Overtime",
  business_trip: "Business Trip",
  salary_advance: "Salary Advance",
  other: "Payroll / Other",
};

const STATUS_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "skipped", label: "Skipped" },
  { value: "pending", label: "Pending" },
];

function RoleBadge({ role }) {
  const key = (role || "").toLowerCase();
  const style = ROLE_COLORS[key] || ROLE_COLORS.employee;
  const label = ROLE_LABELS[key] || (role ? String(role) : "—");
  return (
    <span className="aal-role-pill" style={{ background: style.bg, color: style.color }}>
      {label}
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

function requestTypeLabel(type) {
  if (!type) return "—";
  return REQUEST_TYPE_LABELS[type] || String(type).replace(/_/g, " ");
}

export default function ApprovalAuditLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    role: "",
    requestType: "",
    status: "",
    fromDate: "",
    toDate: "",
  });
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, totalPages: 1, total: 0 });

  const hasFilters = useMemo(
    () => Boolean(filters.role || filters.requestType || filters.status || filters.fromDate || filters.toDate),
    [filters]
  );

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(meta.pageSize || 20),
      });
      if (filters.role) params.set("role", filters.role);
      if (filters.requestType) params.set("requestType", filters.requestType);
      if (filters.status) params.set("status", filters.status);
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
  }, [page, filters.role, filters.requestType, filters.status, filters.fromDate, filters.toDate]);

  return (
    <div className="aal-page">
      <header className="aal-hero">
        <div>
          <h1>Approval Responsibility Log</h1>
          <p className="aal-hero-desc">
            Track who approved or rejected each request, by role and timestamp — for clear accountability.
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
              setFilters({ role: "", requestType: "", status: "", fromDate: "", toDate: "" });
              setPage(1);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="aal-body">
        {error && <div className="aal-alert" role="alert">{error}</div>}

        {loading ? (
          <div className="aal-loading">Loading audit logs…</div>
        ) : (
          <div className="aal-table-wrap">
            <table className="aal-table">
              <thead>
                <tr>
                  {["Time", "Approver", "Role", "Action", "Request type", "Request ID", "Level", "Comment"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((log) => (
                  <tr key={log.id}>
                    <td className="aal-time">
                      {log.approvedAt
                        ? new Date(log.approvedAt).toLocaleString("vi-VN")
                        : log.updatedAt
                          ? new Date(log.updatedAt).toLocaleString("vi-VN")
                          : "—"}
                    </td>
                    <td>
                      <div className="aal-approver-name">{log.Approver?.name || "—"}</div>
                      <div className="aal-approver-sub">
                        {log.Approver?.employeeCode || log.Approver?.email || ""}
                      </div>
                    </td>
                    <td>
                      <RoleBadge role={log.Approver?.role} />
                    </td>
                    <td>
                      <ActionBadge status={log.status} />
                    </td>
                    <td>
                      <span className="aal-type-tag">{requestTypeLabel(log.requestType)}</span>
                    </td>
                    <td>
                      <span className="aal-req-id">#{log.requestId}</span>
                    </td>
                    <td>
                      <span className="aal-level">{log.level ?? "—"}</span>
                    </td>
                    <td>
                      <span className="aal-comment">{log.comments || "—"}</span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="aal-empty">
                      {hasFilters
                        ? "No audit logs match the selected filters."
                        : "No approval audit logs yet. Approve or reject a request, then refresh."}
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
    </div>
  );
}
