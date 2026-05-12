import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/**
 * Leave request approvals (HR / Manager — same API as Supervisor).
 */
const leaveTypeMeta = {
  annual_leave: { icon: '🌴', label: 'Annual Leave', color: '#10B981' },
  paid_marriage: { icon: '💍', label: 'Marriage Leave (3 days)', color: '#EC4899' },
  paid_child_marriage: { icon: '👶', label: 'Child Marriage Leave (1 day)', color: '#EC4899' },
  paid_family_death: { icon: '🕊️', label: 'Family Death Leave (3 days)', color: '#F59E0B' },
  unpaid_family_death: { icon: '🕯️', label: 'Extended Family Death Leave (1 day)', color: '#6B7280' },
  unpaid_other: { icon: '⚖️', label: 'Other Unpaid Leave', color: '#6B7280' },
  sick: { icon: '🏥', label: 'Sick Leave (Social Insurance)', color: '#EF4444' },
  maternity_female: { icon: '👩‍🦱', label: 'Maternity Leave (Female)', color: '#EC4899' },
  maternity_male: { icon: '👨‍🦱', label: 'Maternity Leave (Male)', color: '#EC4899' },
  unpaid_negotiated: { icon: '📝', label: 'Negotiated Unpaid Leave', color: '#6B7280' },
  accident_leave: { icon: '⚠️', label: 'Work Accident/ Occupational Disease Leave', color: '#F97316' },
  civic_duty: { icon: '🪖', label: 'Civic Duty Leave', color: '#8B5CF6' },
  study_training: { icon: '🎓', label: 'Study/Training Leave', color: '#10B981' },
  suspended_work: { icon: '⏸️', label: 'Work Suspension Leave', color: '#F59E0B' },
  special_leave: { icon: '🌧️', label: 'Other Special Leave', color: '#6B7280' },
  other: { icon: '📌', label: 'Other', color: '#6B7280' }
};

function formatLeaveType(type) {
  const meta = leaveTypeMeta[type] || { icon: '📌', label: String(type || 'Other').replace(/_/g, ' '), color: '#6B7280' };
  return { icon: meta.icon, label: meta.label, color: meta.color };
}

export default function HrLeaveApprovals({ token }) {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [comment, setComment] = useState('');

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
      <div className="search-bar" style={{ marginBottom: 12 }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div className="card">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Annual Leave</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const st = item.status ?? 'pending';
                  const emp = item.User || item.user || {};
                  return (
                    <tr key={item.id}>
                      <td>{emp.name || emp.employeeCode || item.userId}</td>
                      <td>{(() => {
                        const leaveType = formatLeaveType(item.subType || item.leaveType || item.type);
                        return <span style={{ color: leaveType.color }}>{leaveType.icon} {leaveType.label}</span>;
                      })()}</td>
                      <td>{item.annualLeaveUsed != null ? `${item.annualLeaveUsed} days used` : '—'}</td>
                      <td>{item.startDate ? String(item.startDate).slice(0, 10) : '—'}</td>
                      <td>{item.endDate ? String(item.endDate).slice(0, 10) : '—'}</td>
                      <td style={{ maxWidth: 200, fontSize: 13 }}>{item.reason || '—'}</td>
                      <td>
                        <span className={`badge badge-${st}`}>
                          {{ pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[st] || st}
                        </span>
                      </td>
                      <td>
                        {st === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setModal({ item, action: 'approve' }); setComment(''); }}>
                              Approve
                            </button>
                            <button type="button" className="btn" style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #e53e3e', color: '#c53030' }} onClick={() => { setModal({ item, action: 'reject' }); setComment(''); }}>
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: '#718096', padding: 24 }}>No leave requests</td>
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
            <h3 style={{ marginTop: 0 }}>{modal.action === 'approve' ? 'Confirm leave approval?' : 'Reject leave request'}</h3>
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
