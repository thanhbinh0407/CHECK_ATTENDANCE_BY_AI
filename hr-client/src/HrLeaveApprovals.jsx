import { useState, useEffect, useCallback, useMemo } from 'react';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/**
 * Duyệt đơn nghỉ phép (HR / Manager — cùng API với Supervisor).
 */
const LEAVE_TYPE_BADGE = {
  sick:      { background: '#fed7d7', color: '#9b2c2c' },
  unpaid:    { background: '#fefcbf', color: '#744210' },
  maternity: { background: '#e9d8fd', color: '#553c9a' },
  annual:    { background: '#c6f6d5', color: '#276749' },
  other:     { background: '#e2e8f0', color: '#4a5568' },
};

const STATUS_BADGE = {
  pending:  { background: '#fefcbf', color: '#744210' },
  approved: { background: '#c6f6d5', color: '#276749' },
  rejected: { background: '#fed7d7', color: '#9b2c2c' },
};

export default function HrLeaveApprovals({ token }) {
  const [items, setItems]               = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState(null);
  const [comment, setComment]           = useState('');

  // client-side filters
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const q = statusFilter ? `?status=${statusFilter}` : '';
    const res = await fetch(`${API}/leave/requests${q}`, { headers: authHeaders(token) });
    const data = await res.json();
    const list = data.leaveRequests || data.data || [];
    setItems(Array.isArray(list) ? list : []);
    setLoading(false);
  }, [token, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // unique leave types for dropdown
  const leaveTypes = useMemo(() => {
    const s = new Set(items.map(i => i.leaveType || i.type).filter(Boolean));
    return [...s].sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(item => {
      const emp = item.User || item.user || {};
      const matchSearch =
        !q ||
        (emp.name || '').toLowerCase().includes(q) ||
        (emp.employeeCode || '').toLowerCase().includes(q);
      const matchType =
        !filterType || (item.leaveType || item.type) === filterType;
      const start = item.startDate ? String(item.startDate).slice(0, 10) : '';
      const end   = item.endDate   ? String(item.endDate).slice(0, 10)   : '';
      const matchFrom = !filterFrom || start >= filterFrom;
      const matchTo   = !filterTo   || (end  ? end <= filterTo : start <= filterTo);
      return matchSearch && matchType && matchFrom && matchTo;
    });
  }, [items, search, filterType, filterFrom, filterTo]);

  const hasFilter = search || filterType || filterFrom || filterTo;
  const clearFilters = () => {
    setSearch(''); setFilterType(''); setFilterFrom(''); setFilterTo('');
  };

  const approve = async () => {
    const item = modal?.item;
    if (!item) return;
    await fetch(`${API}/leave/requests/${item.id}/approve`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({}),
    });
    setModal(null);
    setComment('');
    load();
  };

  const reject = async () => {
    const item = modal?.item;
    if (!item) return;
    await fetch(`${API}/leave/requests/${item.id}/reject`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ rejectionReason: comment || null }),
    });
    setModal(null);
    setComment('');
    load();
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="emp-toolbar">
        <input
          className="emp-search"
          placeholder="Search by employee name or code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="emp-filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          className="emp-filter-select"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All Leave Types</option>
          {leaveTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          type="date"
          className="emp-filter-select"
          style={{ minWidth: 140 }}
          value={filterFrom}
          onChange={e => setFilterFrom(e.target.value)}
          title="From date"
        />
        <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center' }}>—</span>
        <input
          type="date"
          className="emp-filter-select"
          style={{ minWidth: 140 }}
          value={filterTo}
          onChange={e => setFilterTo(e.target.value)}
          title="To date"
        />
        <button
          className="btn btn-secondary"
          style={{ fontSize: 13, padding: '8px 14px', flexShrink: 0 }}
          onClick={load}
          title="Reload"
        >
          ↻ Reload
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {/* Summary bar */}
        <div className="emp-summary-bar">
          <span>
            Showing <strong>{filtered.length}</strong> / {items.length} requests
          </span>
          {hasFilter && (
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '3px 10px' }}
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading">Loading leave requests...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const st  = item.status ?? 'pending';
                  const emp = item.User || item.user || {};
                  const leaveType  = item.leaveType || item.type || '';
                  const typeBadge  = LEAVE_TYPE_BADGE[leaveType] || LEAVE_TYPE_BADGE.other;
                  const stBadge    = STATUS_BADGE[st] || STATUS_BADGE.other;
                  const start = item.startDate ? String(item.startDate).slice(0, 10) : '—';
                  const end   = item.endDate   ? String(item.endDate).slice(0, 10)   : '—';
                  const days  = (item.startDate && item.endDate)
                    ? Math.max(1, Math.round((new Date(item.endDate) - new Date(item.startDate)) / 86400000) + 1)
                    : '—';
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{emp.name || item.userId || '—'}</div>
                        {emp.employeeCode && (
                          <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>
                            {emp.employeeCode}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          ...typeBadge, padding: '2px 10px', borderRadius: 999,
                          fontSize: 12, fontWeight: 600,
                        }}>
                          {leaveType || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>{start}</td>
                      <td style={{ fontSize: 13 }}>{end}</td>
                      <td style={{ fontSize: 13, textAlign: 'center' }}>{days}</td>
                      <td style={{ maxWidth: 220, fontSize: 13, color: '#4a5568' }}>{item.reason || '—'}</td>
                      <td>
                        <span style={{
                          ...stBadge, padding: '3px 10px', borderRadius: 999,
                          fontSize: 12, fontWeight: 600,
                        }}>
                          {{ pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[st] || st}
                        </span>
                      </td>
                      <td>
                        {st === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="btn-tbl btn-tbl-details"
                              style={{ background: '#2b6cb0', color: '#fff', borderRadius: 6, padding: '4px 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                              onClick={() => { setModal({ item, action: 'approve' }); setComment(''); }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn-tbl btn-tbl-delete"
                              style={{ borderRadius: 6, padding: '4px 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                              onClick={() => { setModal({ item, action: 'reject' }); setComment(''); }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>
                      {items.length === 0 ? 'No leave requests found.' : 'No requests match the current filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="card" style={{ width: 'min(420px, 92vw)', padding: 24 }}>
            <h3 style={{ marginTop: 0 }}>{modal.action === 'approve' ? 'Confirm approve leave request?' : 'Reject Leave Request'}</h3>
            {modal.action === 'reject' && (
              <textarea
                placeholder="Rejection reason (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                style={{ width: '100%', marginBottom: 12, padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={modal.action === 'approve' ? approve : reject}>
                {modal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
