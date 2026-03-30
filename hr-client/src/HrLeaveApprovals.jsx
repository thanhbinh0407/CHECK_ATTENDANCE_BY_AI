import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/**
 * Duyệt đơn nghỉ phép (HR / Manager — cùng API với Supervisor).
 */
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
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Đã từ chối</option>
        </select>
      </div>
      <div className="card">
        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Loại</th>
                  <th>Từ</th>
                  <th>Đến</th>
                  <th>Lý do</th>
                  <th>Trạng thái</th>
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
                      <td>{item.leaveType || item.type || '—'}</td>
                      <td>{item.startDate ? String(item.startDate).slice(0, 10) : '—'}</td>
                      <td>{item.endDate ? String(item.endDate).slice(0, 10) : '—'}</td>
                      <td style={{ maxWidth: 200, fontSize: 13 }}>{item.reason || '—'}</td>
                      <td>
                        <span className={`badge badge-${st}`}>
                          {{ pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Đã từ chối' }[st] || st}
                        </span>
                      </td>
                      <td>
                        {st === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setModal({ item, action: 'approve' }); setComment(''); }}>
                              Duyệt
                            </button>
                            <button type="button" className="btn" style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #e53e3e', color: '#c53030' }} onClick={() => { setModal({ item, action: 'reject' }); setComment(''); }}>
                              Từ chối
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#718096', padding: 24 }}>Không có đơn nghỉ</td>
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
            <h3 style={{ marginTop: 0 }}>{modal.action === 'approve' ? 'Xác nhận duyệt đơn nghỉ?' : 'Từ chối đơn nghỉ'}</h3>
            {modal.action === 'reject' && (
              <textarea
                placeholder="Lý do từ chối (tùy chọn)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                style={{ width: '100%', marginBottom: 12, padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setModal(null)}>Hủy</button>
              <button type="button" className="btn btn-primary" onClick={modal.action === 'approve' ? approve : reject}>
                {modal.action === 'approve' ? 'Duyệt' : 'Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
