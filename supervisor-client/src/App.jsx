import { useState, useEffect, useCallback } from 'react';
import SupervisorReports from './SupervisorReports.jsx';
import PersonalProfileModal from './PersonalProfileModal.jsx';
import './index.css';
import './supervisorDashboard.css';

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:5000').replace(/\/$/, '');
const API = `${API_BASE}/api`;
function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function portalAvatarSrc(apiBase, avatarUrl) {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  const base = (apiBase || '').replace(/\/$/, '');
  const path = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  return `${base}${path}`;
}

function formatDuration(ms) {
  const safeMs = Math.max(0, Number(ms) || 0);
  const totalMinutes = Math.floor(safeMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function getFilterDate(item) {
  const candidates = [
    item?.date,
    item?.startDate,
    item?.requestDate,
    item?.createdAt,
    item?.updatedAt,
    item?.approvedAt,
    item?.endDate,
  ];

  for (const v of candidates) {
    if (!v) continue;
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ token, onNavigate }) {
  const [stats, setStats] = useState({ pendingLeave: 0, pendingOvertime: 0, pendingTrip: 0, pendingAdvance: 0, pendingSalary: 0 });
  const [recentQueue, setRecentQueue] = useState([]);
  const [workDurations, setWorkDurations] = useState([]);
  const [workSummary, setWorkSummary] = useState({ active: 0, finished: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/leave/requests?status=pending`, { headers: authHeaders(token) }).then(r => r.json()),
      fetch(`${API}/overtime-requests?status=pending`, { headers: authHeaders(token) }).then(r => r.json()),
      fetch(`${API}/business-trip-requests?status=pending`, { headers: authHeaders(token) }).then(r => r.json()),
      fetch(`${API}/salary-advances?status=pending`, { headers: authHeaders(token) }).then(r => r.json()),
      fetch(`${API}/salary/pending`, { headers: authHeaders(token) }).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/attendance/today`, { headers: authHeaders(token) }).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/admin/employees`, { headers: authHeaders(token) }).then(r => r.json()).catch(() => ({})),
    ]).then(([leave, ot, trip, adv, sal, attendanceToday, employeesData]) => {
      const leaveList = leave.leaveRequests || leave.data || [];
      const otList = ot.requests || ot.overtimeRequests || ot.data || [];
      const tripList = trip.requests || trip.businessTripRequests || trip.data || [];
      const advList = adv.advances || adv.salaryAdvances || adv.data || [];
      const salList = sal.salaries || sal.data || sal.pending || [];
      const todayLogs = attendanceToday.logs || attendanceToday.data || [];
      const employees = employeesData.employees || employeesData.data || [];

      const userNameMap = new Map();
      employees.forEach((u) => {
        userNameMap.set(String(u.id), u.name || u.employeeCode || `#${u.id}`);
      });

      const byUser = new Map();
      todayLogs.forEach((log) => {
        if (!log?.userId) return;
        const uid = String(log.userId);
        const ts = new Date(log.timestamp);
        if (!byUser.has(uid)) {
          byUser.set(uid, {
            userId: log.userId,
            name: userNameMap.get(uid) || log.detectedName || `Employee #${log.userId}`,
            firstIn: null,
            lastOut: null,
            lastType: null,
            lastAt: null,
          });
        }
        const row = byUser.get(uid);
        if (log.type === 'IN' && (!row.firstIn || ts < row.firstIn)) {
          row.firstIn = ts;
        }
        if (log.type === 'OUT' && (!row.lastOut || ts > row.lastOut)) {
          row.lastOut = ts;
        }
        if (!row.lastAt || ts > row.lastAt) {
          row.lastAt = ts;
          row.lastType = log.type;
        }
      });

      const now = Date.now();
      const rows = Array.from(byUser.values())
        .filter((u) => !!u.firstIn)
        .map((u) => {
          const endTime = u.lastType === 'IN' ? now : (u.lastOut ? u.lastOut.getTime() : now);
          const durationMs = Math.max(0, endTime - u.firstIn.getTime());
          const status = u.lastType === 'IN' ? 'Working' : 'Checked out';
          return {
            userId: u.userId,
            name: u.name,
            status,
            durationText: formatDuration(durationMs),
            durationMs,
            firstInText: u.firstIn.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            lastActionText: u.lastAt
              ? u.lastAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              : '—',
          };
        })
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === 'Working' ? -1 : 1;
          return b.durationMs - a.durationMs;
        });

      setWorkDurations(rows.slice(0, 8));
      setWorkSummary({
        active: rows.filter((r) => r.status === 'Working').length,
        finished: rows.filter((r) => r.status === 'Checked out').length,
      });

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
            Track every pending request in one place within your permission scope. Prioritize older requests or those tied to attendance/payroll deadlines.
          </p>
          <div className="sup-dash-pills">
            <span className="sup-dash-pill">{total} items pending</span>
            <span className="sup-dash-pill">Leave · Overtime · Trip · Advance · Payroll</span>
          </div>
        </div>
      </div>

      <div className="sup-dash-kpis">
        <button type="button" className="sup-dash-kpi" style={{ cursor: 'pointer', border: '1px solid rgba(148,163,184,0.35)', font: 'inherit', textAlign: 'left' }} onClick={() => go('leave')}>
          <span className="sup-dash-kpi-deco" aria-hidden>📋</span>
          <div className="lbl">Leave Requests</div>
          <div className="val">{stats.pendingLeave}</div>
          <div className="hint">Open approval list →</div>
        </button>
        <button type="button" className="sup-dash-kpi" style={{ cursor: 'pointer', border: '1px solid rgba(148,163,184,0.35)', font: 'inherit', textAlign: 'left' }} onClick={() => go('overtime')}>
          <span className="sup-dash-kpi-deco" aria-hidden>⏰</span>
          <div className="lbl">Overtime</div>
          <div className="val">{stats.pendingOvertime}</div>
          <div className="hint">Review overtime hours →</div>
        </button>
        <button type="button" className="sup-dash-kpi" style={{ cursor: 'pointer', border: '1px solid rgba(148,163,184,0.35)', font: 'inherit', textAlign: 'left' }} onClick={() => go('business-trip')}>
          <span className="sup-dash-kpi-deco" aria-hidden>✈️</span>
          <div className="lbl">Business Trips</div>
          <div className="val">{stats.pendingTrip}</div>
          <div className="hint">Review schedule &amp; cost →</div>
        </button>
        <button type="button" className="sup-dash-kpi" style={{ cursor: 'pointer', border: '1px solid rgba(148,163,184,0.35)', font: 'inherit', textAlign: 'left' }} onClick={() => go('salary-advance')}>
          <span className="sup-dash-kpi-deco" aria-hidden>💵</span>
          <div className="lbl">Salary Advances</div>
          <div className="val">{stats.pendingAdvance}</div>
          <div className="hint">Advance requests →</div>
        </button>
      </div>

      <div className="sup-dash-kpis" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', marginBottom: 16 }}>
        <button type="button" className="sup-dash-kpi" style={{ cursor: 'pointer', border: '1px solid rgba(148,163,184,0.35)', font: 'inherit', textAlign: 'left' }} onClick={() => go('salary')}>
          <span className="sup-dash-kpi-deco" aria-hidden>💰</span>
          <div className="lbl">Pending Payroll</div>
          <div className="val">{stats.pendingSalary}</div>
          <div className="hint">If empty, this cycle may have no pending payroll</div>
        </button>
        <div className="sup-dash-kpi">
          <span className="sup-dash-kpi-deco" aria-hidden>📊</span>
          <div className="lbl">Total Backlog</div>
          <div className="val" style={{ color: '#1e1b4b' }}>{total}</div>
          <div className="hint">Including payroll when available</div>
        </div>
      </div>

      <div className="card sup-work-card" style={{ marginBottom: 16, borderRadius: 16 }}>
        <div className="sup-work-head">
          <p className="card-title" style={{ marginBottom: 0 }}>Today Work Status</p>
          <div className="sup-work-pills">
            <span className="sup-work-pill active">Working: {workSummary.active}</span>
            <span className="sup-work-pill done">Checked out: {workSummary.finished}</span>
          </div>
        </div>

        {workDurations.length > 0 ? (
          <div className="sup-work-list">
            {workDurations.map((row) => (
              <div key={row.userId} className="sup-work-row">
                <div className="sup-work-main">
                  <div className="sup-work-name">{row.name}</div>
                  <div className="sup-work-meta">Checked in: {row.firstInText} • Last update: {row.lastActionText}</div>
                </div>
                <div className="sup-work-side">
                  <span className={`sup-work-status ${row.status === 'Working' ? 'is-active' : 'is-done'}`}>{row.status}</span>
                  <strong className="sup-work-duration">{row.durationText}</strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#718096', fontSize: 13, marginTop: 6 }}>No attendance data today to calculate working duration.</div>
        )}
      </div>

      {total > 0 && (
        <div className="card" style={{ marginBottom: 16, borderRadius: 16 }}>
          <p className="card-title">Pending Distribution (%)</p>
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
          <p className="card-title">Recent Queue</p>
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
        <h3>Suggested Workflow</h3>
        <p>
          Approve in this order: <strong>leave</strong> (affects attendance) → <strong>overtime / trips</strong> → <strong>salary advances</strong> → <strong>payroll</strong>.
          Use the <strong>Reports</strong> tab for reconciliation after closing the cycle.
        </p>
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => go('reports')}>Open Reports</button>
          <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => go('leave')}>Open Leave Requests</button>
        </div>
      </div>
    </div>
  );
}

// ─── GENERIC APPROVAL LIST ─────────────────────────────────────────────────────
function ApprovalList({ token, type, apiPath, columns, extractList }) {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchText, setSearchText] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
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

  const filteredItems = items.filter((item) => {
    const q = normalizeText(searchText).trim();
    if (q) {
      const textPayload = [
        item?.id,
        item?.reason,
        item?.purpose,
        item?.destination,
        item?.type,
        item?.approvalStatus,
        item?.status,
        item?.User?.name,
        item?.employeeCode,
        item?.userId,
        ...columns.map((c) => (c.render ? c.render(item) : item?.[c.key])),
      ]
        .map((v) => normalizeText(v))
        .join(' | ');

      if (!textPayload.includes(q)) return false;
    }

    if (fromDate || toDate) {
      const rowDate = getFilterDate(item);
      if (!rowDate) return false;

      if (fromDate) {
        const min = new Date(`${fromDate}T00:00:00`);
        if (rowDate < min) return false;
      }
      if (toDate) {
        const max = new Date(`${toDate}T23:59:59`);
        if (rowDate > max) return false;
      }
    }

    return true;
  });

  return (
    <div>
      <div className="filters">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search by employee, reason, code..."
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          title="From date"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          title="To date"
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setStatusFilter('pending');
            setSearchText('');
            setFromDate('');
            setToDate('');
          }}
        >
          Clear filters
        </button>
      </div>
      <div className="card">
        {!loading && (
          <p style={{ marginBottom: 10, fontSize: 12, color: '#64748b' }}>
            Showing {filteredItems.length}/{items.length} records
          </p>
        )}
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
                          >Approve</button>
                          <button
                            className="btn btn-reject"
                            style={{ fontSize: 12, padding: '4px 10px' }}
                            onClick={() => { setActionModal({ item, action: 'reject' }); setComment(''); }}
                          >Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )})}
                {filteredItems.length === 0 && (
                  <tr><td colSpan={columns.length + 2} style={{ textAlign: 'center', color: '#718096', padding: 20 }}>No data found</td></tr>
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
              <h3>{actionModal.action === 'approve' ? 'Confirm approval' : 'Confirm rejection'}</h3>
              <button className="close-btn" onClick={() => setActionModal(null)}>×</button>
            </div>
            <div className="form-group">
              <label>Comment (optional)</label>
              <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
              {actionModal.action === 'approve'
                ? <button className="btn btn-approve" onClick={approve}>Confirm</button>
                : <button className="btn btn-reject" onClick={reject}>Confirm</button>
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
        { key: 'amount', label: 'Amount', render: r => Number(r.amount || 0).toLocaleString('vi-VN') + ' đ' },
        { key: 'reason', label: 'Reason' },
        { key: 'requestDate', label: 'Request date', render: r => r.requestDate?.slice(0, 10) || r.createdAt?.slice(0, 10) },
      ]}
    />
  );
}

// ─── SALARY APPROVALS ──────────────────────────────────────────────────────────
function SalaryApprovals({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

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

  const yearOptions = Array.from(new Set(items.map((i) => Number(i.year)).filter((v) => Number.isFinite(v)))).sort((a, b) => b - a);

  const filteredItems = items.filter((item) => {
    const q = normalizeText(searchText).trim();
    if (q) {
      const textPayload = [
        item?.id,
        item?.User?.name,
        item?.userId,
        item?.month,
        item?.year,
      ]
        .map((v) => normalizeText(v))
        .join(' | ');
      if (!textPayload.includes(q)) return false;
    }

    if (monthFilter && Number(item.month) !== Number(monthFilter)) return false;
    if (yearFilter && Number(item.year) !== Number(yearFilter)) return false;

    return true;
  });

  return (
    <div>
      <div className="filters">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search by employee or ID..."
        />
        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
          <option value="">All months</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>Month {m}</option>
          ))}
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          <option value="">All years</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setSearchText('');
            setMonthFilter('');
            setYearFilter('');
          }}
        >
          Clear filters
        </button>
      </div>

      <div className="card">
        <p className="card-title">Pending Payroll</p>
        {!loading && (
          <p style={{ marginBottom: 10, fontSize: 12, color: '#64748b' }}>
            Showing {filteredItems.length}/{items.length} payroll items
          </p>
        )}
      {loading ? <div className="loading">Loading...</div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Employee</th><th>Month/Year</th>
                <th>Net Salary</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.User?.name || item.userId}</td>
                  <td>{item.month}/{item.year}</td>
                  <td>{Number(item.netSalary || item.totalSalary || 0).toLocaleString('vi-VN')} đ</td>
                  <td><span className="badge badge-pending">Pending</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-approve" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => act(item.id, 'approve')}>Approve</button>
                      <button className="btn btn-reject" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => act(item.id, 'reject')}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#718096', padding: 20 }}>No pending payroll records</td></tr>
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
  { key: 'dashboard',     label: 'Overview',         icon: '📊' },
  { key: 'leave',         label: 'Leave Approvals',  icon: '📋' },
  { key: 'overtime',      label: 'Overtime Approvals', icon: '⏰' },
  { key: 'business-trip', label: 'Trip Approvals',   icon: '✈️' },
  { key: 'salary-advance',label: 'Advance Approvals', icon: '💵' },
  { key: 'salary',        label: 'Payroll Approvals', icon: '💰' },
  { key: 'reports',       label: 'Reports',          icon: '📈' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const patchSessionUser = useCallback((patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

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
    if (!token) return;
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 'success' && data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      })
      .catch(() => {});
  }, [token]);

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
          <p style={{ color:'#718096', marginBottom:20 }}>This page is available only for Supervisor or Manager roles.</p>
          <button className="btn btn-primary" onClick={logout}>Sign in again</button>
        </div>
      </div>
    );
  }

  const tabTitles = {
    dashboard: 'Overview - Supervisor',
    leave: 'Leave Approvals',
    overtime: 'Overtime Approvals',
    'business-trip': 'Business Trip Approvals',
    'salary-advance': 'Salary Advance Approvals',
    salary: 'Payroll Approvals',
    reports: 'Reports',
  };

  return (
    <div className="app-layout">
      <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <span style={{ fontSize: 22 }}>✅</span>
          <h2>Supervisor</h2>
        </div>
        <div className="sidebar-nav">
          {TABS.map(tab => (
            <div
              key={tab.key}
              className={`nav-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span className="nav-label">{tab.label}</span>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="user-info">
            <strong>{user?.name}</strong><br />
            <span style={{ opacity: 0.65 }}>{user?.role === 'manager' ? 'Manager' : 'Supervisor'}</span>
          </div>
          <button className="logout-btn" onClick={logout}>Sign out</button>
        </div>
      </nav>

      <div className="main-content">
        <div className="topbar">
          <h1 style={{ margin: 0 }}>{tabTitles[activeTab]}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              className="portal-avatar-btn"
              onClick={() => setProfileOpen(true)}
              title="Hồ sơ cá nhân"
              aria-label="Mở hồ sơ cá nhân"
            >
              {portalAvatarSrc(API_BASE, user?.avatarUrl) ? (
                <img className="portal-avatar-img" src={portalAvatarSrc(API_BASE, user?.avatarUrl)} alt="" />
              ) : (
                <span className="portal-avatar-fallback" aria-hidden>
                  {(user?.name || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </button>
            <span className="portal-topbar-email">{user?.email}</span>
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}
            >
              {collapsed ? '→' : '←'}
            </button>
          </div>
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
      <PersonalProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        apiBase={API_BASE}
        onSessionUserPatch={patchSessionUser}
      />
    </div>
  );
}
