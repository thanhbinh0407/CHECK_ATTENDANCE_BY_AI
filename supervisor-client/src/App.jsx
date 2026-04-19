import { useState, useEffect, useCallback } from 'react';
import SupervisorReports from './SupervisorReports.jsx';
import socket from './socket.js';
import { toastInfo } from './lib/notify.jsx';
import './index.css';
import './supervisorDashboard.css';

const API = 'http://localhost:5000/api';
function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ token, onNavigate }) {
  const [stats, setStats] = useState({ pendingLeave: 0, pendingOvertime: 0, pendingTrip: 0, pendingAdvance: 0, pendingSalary: 0 });
  const [recentQueue, setRecentQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/leave/requests?status=pending`, { headers: authHeaders(token) }).then(r => r.json()),
      fetch(`${API}/overtime-requests?status=pending`, { headers: authHeaders(token) }).then(r => r.json()),
      fetch(`${API}/business-trip-requests?status=pending`, { headers: authHeaders(token) }).then(r => r.json()),
      fetch(`${API}/salary-advances?status=pending`, { headers: authHeaders(token) }).then(r => r.json()),
      fetch(`${API}/salary/pending`, { headers: authHeaders(token) }).then(r => r.json()).catch(() => ({})),
    ]).then(([leave, ot, trip, adv, sal]) => {
      const leaveList = leave.leaveRequests || leave.data || [];
      const otList = ot.requests || ot.overtimeRequests || ot.data || [];
      const tripList = trip.requests || trip.businessTripRequests || trip.data || [];
      const advList = adv.advances || adv.salaryAdvances || adv.data || [];
      const salList = sal.salaries || sal.data || sal.pending || [];

      const queue = [
        ...(leaveList || []).slice(0, 2).map((l) => ({
          id: l.id,
          type: "Leave",
          label: `${l.type || "Leave"}: ${l.startDate}→${l.endDate}`,
          meta: l.userId || l.userID || l.employeeCode || "",
          status: l.status || "pending",
        })),
        ...(otList || []).slice(0, 2).map((r) => ({
          id: r.id,
          type: "Overtime",
          label: `${r.date || ""} ${r.startTime || ""}→${r.endTime || ""}`.trim(),
          meta: r.totalHours ? `${r.totalHours}h` : "",
          status: r.approvalStatus || "pending",
        })),
        ...(tripList || []).slice(0, 2).map((r) => ({
          id: r.id,
          type: "Business trip",
          label: `${r.destination || r.location || "—"}`.trim(),
          meta: r.date || r.startDate || "",
          status: r.approvalStatus || "pending",
        })),
        ...(advList || []).slice(0, 2).map((a) => ({
          id: a.id,
          type: "Salary advance",
          label: `${a.month || ""}/${a.year || ""}`.trim(),
          meta: a.amount ? `${Number(a.amount).toLocaleString("vi-VN")} VND` : "",
          status: a.approvalStatus || "pending",
        })),
        ...(salList || []).slice(0, 2).map((s) => ({
          id: s.id,
          type: "Payroll",
          label: `${s.User?.name || "Employee"} • ${s.month}/${s.year}`,
          meta: s.status,
          status: s.status || "pending",
        })),
      ];

      const recent = queue.filter(Boolean).slice(0, 7);
      setStats({
        pendingLeave: Array.isArray(leaveList) ? leaveList.length : 0,
        pendingOvertime: Array.isArray(otList) ? otList.length : 0,
        pendingTrip: Array.isArray(tripList) ? tripList.length : 0,
        pendingAdvance: Array.isArray(advList) ? advList.length : 0,
        pendingSalary: Array.isArray(salList) ? salList.length : 0,
      });
      setRecentQueue(recent);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  const total = stats.pendingLeave + stats.pendingOvertime + stats.pendingTrip + stats.pendingAdvance + stats.pendingSalary;
  const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const go = (tab) => {
    if (typeof onNavigate === 'function') onNavigate(tab);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="sup-dash">
      <div className="sup-dash-hero">
        <div className="sup-dash-hero-inner">
          <h2>Approval Center</h2>
          <p>
            Track all pending requests in one place within your assigned scope. Prioritize older requests or requests tied to attendance and payroll cycles.
          </p>
          <div className="sup-dash-pills">
            <span className="sup-dash-pill">{total} pending items</span>
            <span className="sup-dash-pill">Leave · Overtime · Business Trip · Advance · Payroll</span>
          </div>
        </div>
      </div>

      <div className="sup-dash-kpis">
        <button type="button" className="sup-dash-kpi" style={{ cursor: 'pointer', border: '1px solid rgba(148,163,184,0.35)', font: 'inherit', textAlign: 'left' }} onClick={() => go('leave')}>
          <span className="sup-dash-kpi-deco" aria-hidden>📋</span>
          <div className="lbl">Leave</div>
          <div className="val">{stats.pendingLeave}</div>
          <div className="hint">Click to review →</div>
        </button>
        <button type="button" className="sup-dash-kpi" style={{ cursor: 'pointer', border: '1px solid rgba(148,163,184,0.35)', font: 'inherit', textAlign: 'left' }} onClick={() => go('overtime')}>
          <span className="sup-dash-kpi-deco" aria-hidden>⏰</span>
          <div className="lbl">Overtime</div>
          <div className="val">{stats.pendingOvertime}</div>
          <div className="hint">Review OT hours →</div>
        </button>
        <button type="button" className="sup-dash-kpi" style={{ cursor: 'pointer', border: '1px solid rgba(148,163,184,0.35)', font: 'inherit', textAlign: 'left' }} onClick={() => go('business-trip')}>
          <span className="sup-dash-kpi-deco" aria-hidden>✈️</span>
          <div className="lbl">Business trip</div>
          <div className="val">{stats.pendingTrip}</div>
          <div className="hint">Cost &amp; schedule →</div>
        </button>
        <button type="button" className="sup-dash-kpi" style={{ cursor: 'pointer', border: '1px solid rgba(148,163,184,0.35)', font: 'inherit', textAlign: 'left' }} onClick={() => go('salary-advance')}>
          <span className="sup-dash-kpi-deco" aria-hidden>💵</span>
          <div className="lbl">Salary advance</div>
          <div className="val">{stats.pendingAdvance}</div>
          <div className="hint">Advance request →</div>
        </button>
      </div>

      <div className="sup-dash-kpis" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', marginBottom: 16 }}>
        <button type="button" className="sup-dash-kpi" style={{ cursor: 'pointer', border: '1px solid rgba(148,163,184,0.35)', font: 'inherit', textAlign: 'left' }} onClick={() => go('salary')}>
          <span className="sup-dash-kpi-deco" aria-hidden>💰</span>
          <div className="lbl">Pending payroll</div>
          <div className="val">{stats.pendingSalary}</div>
          <div className="hint">If API is empty, this cycle may not have pending payroll</div>
        </button>
        <div className="sup-dash-kpi">
          <span className="sup-dash-kpi-deco" aria-hidden>📊</span>
          <div className="lbl">Total backlog</div>
          <div className="val" style={{ color: '#1e1b4b' }}>{total}</div>
          <div className="hint">Includes payroll (if available)</div>
        </div>
      </div>

      {total > 0 && (
        <div className="card" style={{ marginBottom: 16, borderRadius: 16 }}>
          <p className="card-title">Pending distribution (%)</p>
          <div className="sup-dash-bar">
            {[
              ['Leave', stats.pendingLeave],
              ['Overtime', stats.pendingOvertime],
              ['Trip', stats.pendingTrip],
              ['Advance', stats.pendingAdvance],
              ['Payroll', stats.pendingSalary],
            ].map(([label, n]) => (
              <div key={label} className="sup-dash-bar-row">
                <span>{label}</span>
                <div className="sup-dash-bar-track">
                  <div className="sup-dash-bar-fill" style={{ width: `${pct(n)}%` }} />
                </div>
                <span style={{ width: 36, textAlign: 'right', fontWeight: 700, color: '#5b21b6' }}>{pct(n)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentQueue.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderRadius: 16 }}>
          <p className="card-title">Recent queue</p>
          <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
            {recentQueue.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: 10, border: "1px solid rgba(148,163,184,0.35)", borderRadius: 12, background: "#fff" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.type}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.label}
                    {item.meta ? ` • ${item.meta}` : ""}
                  </div>
                </div>
                <span style={{ fontWeight: 900, color: "#5b21b6" }}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sup-dash-foot">
        <h3>Suggested workflow</h3>
        <p>
          Review in this order: <strong>leave</strong> (affects attendance) → <strong>overtime / business trip</strong> → <strong>salary advance</strong> → <strong>payroll</strong>.
          Use the <strong>Reports</strong> tab to reconcile after closing the cycle.
        </p>
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => go('reports')}>Open reports</button>
          <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => go('leave')}>Leave requests</button>
        </div>
      </div>
    </div>
  );
}

// ─── GENERIC APPROVAL LIST ─────────────────────────────────────────────────────
function buildApprovalSearchText(item, columns) {
  const bits = [];
  for (const c of columns) {
    try {
      const v = c.render ? c.render(item) : item[c.key];
      if (v != null && v !== '') bits.push(String(v));
    } catch {
      /* ignore */
    }
  }
  if (item.User) {
    bits.push(item.User.name, item.User.employeeCode, item.User.email);
  }
  bits.push(String(item.id ?? ''), String(item.userId ?? ''));
  if (item.month != null && item.year != null) bits.push(`${item.month}/${item.year}`);
  if (item.amount != null) bits.push(String(item.amount));
  return bits.filter(Boolean).join(' ').toLowerCase();
}

function ApprovalList({ token, type, apiPath, columns, extractList }) {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null); // { item, action }
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const url = statusFilter
      ? `${API}/${apiPath}?status=${statusFilter}`
      : `${API}/${apiPath}`;
    const res = await fetch(url, { headers: authHeaders(token) });
    const data = await res.json();
    setItems(extractList(data));
    setLoading(false);
  }, [token, apiPath, statusFilter, extractList]);

  useEffect(() => { load(); }, [load]);

  const approve = async () => {
    const { item } = actionModal;
    if (type === 'leave') {
      await fetch(`${API}/leave/requests/${item.id}/approve`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({}),
      });
    } else {
      const url = `${API}/${apiPath}/${item.id}/approve`;
      await fetch(url, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ action: 'approve', comments: comment || undefined }),
      });
    }
    setActionModal(null);
    setComment('');
    load();
  };

  const reject = async () => {
    const { item } = actionModal;
    if (type === 'leave') {
      await fetch(`${API}/leave/requests/${item.id}/reject`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ rejectionReason: comment || null }),
      });
    } else {
      const url = `${API}/${apiPath}/${item.id}/approve`;
      await fetch(url, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ action: 'reject', comments: comment || undefined }),
      });
    }
    setActionModal(null);
    setComment('');
    load();
  };

  const q = search.trim().toLowerCase();
  const filteredItems = q
    ? items.filter((it) => buildApprovalSearchText(it, columns).includes(q))
    : items;

  return (
    <div>
      <div className="sup-approval-toolbar card">
        <div className="sup-approval-toolbar-inner">
          <div className="sup-approval-search-wrap">
            <label className="sup-approval-label" htmlFor={`sup-ap-search-${type}`}>Search</label>
            <input
              id={`sup-ap-search-${type}`}
              className="sup-approval-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, employee code, dates, reason…"
              autoComplete="off"
            />
          </div>
          <div className="sup-approval-filter-wrap">
            <label className="sup-approval-label" htmlFor={`sup-ap-status-${type}`}>Status</label>
            <select
              id={`sup-ap-status-${type}`}
              className="sup-approval-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="sup-approval-meta">
            {loading ? 'Loading…' : `${filteredItems.length} of ${items.length} shown`}
          </div>
        </div>
      </div>
      <div className="card sup-approval-table-card">
        {loading ? <div className="loading">Loading...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map(c => <th key={c.key}>{c.label}</th>)}
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const rowStatus = item.status ?? item.approvalStatus ?? 'pending';
                  return (
                  <tr key={item.id}>
                    {columns.map(c => (
                      <td key={c.key}>{c.render ? c.render(item) : item[c.key] || '—'}</td>
                    ))}
                    <td>
                      <span className={`badge badge-${rowStatus || 'pending'}`}>
                        {{ pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[rowStatus] || rowStatus}
                      </span>
                    </td>
                    <td>
                      {rowStatus === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-approve"
                            style={{ fontSize: 12, padding: '4px 10px' }}
                            onClick={() => { setActionModal({ item, action: 'approve' }); setComment(''); }}
                          >✓ Approve</button>
                          <button
                            className="btn btn-reject"
                            style={{ fontSize: 12, padding: '4px 10px' }}
                            onClick={() => { setActionModal({ item, action: 'reject' }); setComment(''); }}
                          >✗ Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )})}
                {items.length === 0 && (
                  <tr><td colSpan={columns.length + 2} style={{ textAlign: 'center', color: '#718096', padding: 20 }}>No data</td></tr>
                )}
                {items.length > 0 && filteredItems.length === 0 && (
                  <tr><td colSpan={columns.length + 2} style={{ textAlign: 'center', color: '#718096', padding: 20 }}>No rows match your search</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{actionModal.action === 'approve' ? '✓ Confirm approval' : '✗ Confirm rejection'}</h3>
              <button className="close-btn" onClick={() => setActionModal(null)}>×</button>
            </div>
            <div className="form-group">
              <label>Comment (optional)</label>
              <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="Enter comment..." />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
              {actionModal.action === 'approve'
                ? <button className="btn btn-approve" onClick={approve}>Confirm approval</button>
                : <button className="btn btn-reject" onClick={reject}>Confirm rejection</button>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LEAVE APPROVALS ───────────────────────────────────────────────────────────
function LeaveApprovals({ token }) {
  return (
    <ApprovalList
      token={token}
      type="leave"
      apiPath="leave/requests"
      extractList={d => d.leaveRequests || d.data || []}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'User', label: 'Employee', render: r => r.User?.name || r.userId },
        { key: 'type', label: 'Leave type' },
        { key: 'startDate', label: 'From', render: r => r.startDate?.slice(0, 10) },
        { key: 'endDate', label: 'To', render: r => r.endDate?.slice(0, 10) },
        { key: 'days', label: 'Days' },
        { key: 'reason', label: 'Reason' },
      ]}
    />
  );
}

// ─── OVERTIME APPROVALS ────────────────────────────────────────────────────────
function OvertimeApprovals({ token }) {
  return (
    <ApprovalList
      token={token}
      type="overtime"
      apiPath="overtime-requests"
      extractList={d => d.requests || d.overtimeRequests || d.data || []}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'User', label: 'Employee', render: r => r.User?.name || r.userId },
        { key: 'date', label: 'Date', render: r => r.date?.slice(0, 10) },
        { key: 'totalHours', label: 'Hours', render: r => r.totalHours ?? r.hours ?? '—' },
        { key: 'reason', label: 'Reason' },
      ]}
    />
  );
}

// ─── BUSINESS TRIP APPROVALS ───────────────────────────────────────────────────
function BusinessTripApprovals({ token }) {
  return (
    <ApprovalList
      token={token}
      type="businessTrip"
      apiPath="business-trip-requests"
      extractList={d => d.requests || d.businessTripRequests || d.data || []}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'User', label: 'Employee', render: r => r.User?.name || r.userId },
        { key: 'destination', label: 'Destination' },
        { key: 'startDate', label: 'From', render: r => r.startDate?.slice(0, 10) },
        { key: 'endDate', label: 'To', render: r => r.endDate?.slice(0, 10) },
        { key: 'purpose', label: 'Purpose' },
      ]}
    />
  );
}

// ─── SALARY ADVANCE APPROVALS ──────────────────────────────────────────────────
function SalaryAdvanceApprovals({ token }) {
  return (
    <ApprovalList
      token={token}
      type="salaryAdvance"
      apiPath="salary-advances"
      extractList={d => d.advances || d.salaryAdvances || d.data || []}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'User', label: 'Employee', render: r => r.User?.name || r.userId },
        { key: 'amount', label: 'Amount', render: r => Number(r.amount || 0).toLocaleString('en-US') + ' VND' },
        { key: 'reason', label: 'Reason' },
        { key: 'requestDate', label: 'Requested date', render: r => r.requestDate?.slice(0, 10) || r.createdAt?.slice(0, 10) },
      ]}
    />
  );
}

// ─── SALARY APPROVALS ──────────────────────────────────────────────────────────
function SalaryApprovals({ token }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/salary/pending`, { headers: authHeaders(token) });
    const data = await res.json();
    setItems(data.salaries || data.data || []);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, action) => {
    await fetch(`${API}/salary/${id}/${action}`, { method: 'PUT', headers: authHeaders(token) });
    load();
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter((item) => {
        const net = Number(item.finalSalary ?? item.netSalary ?? item.totalSalary ?? 0);
        const hay = [
          String(item.id),
          String(item.userId),
          item.User?.name,
          item.User?.employeeCode,
          `${item.month}/${item.year}`,
          net.toString(),
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      })
    : items;

  return (
    <div>
      <div className="sup-approval-toolbar card">
        <div className="sup-approval-toolbar-inner">
          <div className="sup-approval-search-wrap sup-approval-search-wrap--grow">
            <label className="sup-approval-label" htmlFor="sup-payroll-search">Search</label>
            <input
              id="sup-payroll-search"
              className="sup-approval-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Employee name, code, period, amount…"
              autoComplete="off"
            />
          </div>
          <div className="sup-approval-meta">
            {loading ? 'Loading…' : `${filtered.length} of ${items.length} shown`}
          </div>
        </div>
      </div>
      <div className="card sup-approval-table-card">
        <p className="card-title">Pending payroll</p>
        {loading ? <div className="loading">Loading...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Employee</th><th>Month/Year</th>
                  <th>Net salary</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.User?.name || item.userId}</td>
                    <td>{item.month}/{item.year}</td>
                    <td>{Number(item.finalSalary ?? item.netSalary ?? item.totalSalary ?? 0).toLocaleString('en-US')} VND</td>
                    <td><span className="badge badge-pending">Pending</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-approve" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => act(item.id, 'approve')}>✓ Approve</button>
                        <button className="btn btn-reject" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => act(item.id, 'reject')}>✗ Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#718096', padding: 20 }}>No pending payroll</td></tr>
                )}
                {items.length > 0 && filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#718096', padding: 20 }}>No rows match your search</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP ROOT ──────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'dashboard',     label: 'Overview',        icon: '📊' },
  { key: 'leave',         label: 'Leave approvals', icon: '📋' },
  { key: 'overtime',      label: 'Overtime approvals', icon: '⏰' },
  { key: 'business-trip', label: 'Trip approvals',  icon: '✈️' },
  { key: 'salary-advance',label: 'Advance approvals', icon: '💵' },
  { key: 'salary',        label: 'Payroll approvals', icon: '💰' },
  { key: 'reports',       label: 'Reports',         icon: '📈' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      const urlUser = params.get('user');

      if (urlToken && urlUser) {
        try {
          const parsedUser = JSON.parse(decodeURIComponent(urlUser));
          const t = decodeURIComponent(urlToken);
          localStorage.setItem('authToken', t);
          localStorage.setItem('user', JSON.stringify(parsedUser));
          if (!cancelled) {
            setToken(t);
            setUser(parsedUser);
          }
          window.history.replaceState({}, '', window.location.pathname);
          return;
        } catch (_) { /* fall through */ }
      }

      if (urlToken) {
        const t = decodeURIComponent(urlToken);
        localStorage.setItem('authToken', t);
        try {
          const res = await fetch(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${t}` },
          });
          const data = await res.json();
          if (!cancelled && data.status === 'success' && data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            setToken(t);
            setUser(data.user);
            window.history.replaceState({}, '', window.location.pathname);
            return;
          }
        } catch (_) { /* fall through */ }
      }

      const savedToken = localStorage.getItem('authToken');
      const savedUser = localStorage.getItem('user');
      if (savedToken && savedUser) {
        if (!cancelled) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } else if (!cancelled) {
        window.location.href = 'http://localhost:3000/';
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token || !user?.id) return;
    const joinRooms = () => {
      socket.emit('join-room', { room: `user-${user.id}` });
      socket.emit('join-room', { room: 'admin' });
    };
    if (socket.connected) joinRooms();
    socket.on('connect', joinRooms);
    const onNotify = (data) => {
      const title = data?.title || 'Notification';
      toastInfo(`New: ${title}`);
    };
    socket.on('new-notification', onNotify);
    return () => {
      socket.off('connect', joinRooms);
      socket.off('new-notification', onNotify);
    };
  }, [token, user?.id]);

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = 'http://localhost:3000/';
  };

  if (!token) return <div className="loading">Authenticating...</div>;

  if (user?.role !== 'supervisor' && user?.role !== 'manager') {
    return (
      <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}>
        <div className="card" style={{ textAlign:'center' }}>
          <p style={{ fontSize:18, marginBottom:12 }}>⛔ Access denied</p>
          <p style={{ color:'#718096', marginBottom:20 }}>This page is only for Supervisor or Manager roles.</p>
          <button className="btn btn-primary" onClick={logout}>Back to login</button>
        </div>
      </div>
    );
  }

  const tabTitles = {
    dashboard: 'Supervisor overview',
    leave: 'Leave approvals',
    overtime: 'Overtime approvals',
    'business-trip': 'Business trip approvals',
    'salary-advance': 'Salary advance approvals',
    salary: 'Payroll approvals',
    reports: 'Reports',
  };

  return (
    <div className="app-layout">
      <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header sup-sidebar-head">
          <span className="sup-sidebar-mark" aria-hidden />
          <h2>Supervisor</h2>
        </div>
        <div className="sidebar-nav sup-sidebar-nav">
          {TABS.map(tab => (
            <div
              key={tab.key}
              className={`nav-item sup-nav-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="nav-icon sup-nav-icon" aria-hidden>{tab.icon}</span>
              <span className="nav-label">{tab.label}</span>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="user-info">
            <strong>{user?.name}</strong><br />
            <span style={{ opacity: 0.65 }}>{user?.role === 'manager' ? 'Manager' : 'Supervisor'}</span>
          </div>
          <button className="logout-btn" onClick={logout}>Log out</button>
        </div>
      </nav>

      <div className="main-content">
        <div className="topbar">
          <h1>{tabTitles[activeTab]}</h1>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ background:'none',border:'1px solid #e2e8f0',borderRadius:6,padding:'6px 12px',cursor:'pointer' }}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>
        <div className="page-content">
          {activeTab === 'dashboard'      && <Dashboard token={token} onNavigate={setActiveTab} />}
          {activeTab === 'leave'          && <LeaveApprovals token={token} />}
          {activeTab === 'overtime'       && <OvertimeApprovals token={token} />}
          {activeTab === 'business-trip'  && <BusinessTripApprovals token={token} />}
          {activeTab === 'salary-advance' && <SalaryAdvanceApprovals token={token} />}
          {activeTab === 'salary'         && <SalaryApprovals token={token} />}
          {activeTab === 'reports'        && <SupervisorReports token={token} />}
        </div>
      </div>
    </div>
  );
}
