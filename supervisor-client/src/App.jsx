import { useState, useEffect, useCallback } from 'react';
import SupervisorReports from './SupervisorReports.jsx';
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
          type: "Nghỉ phép",
          label: `${l.type || "Leave"}: ${l.startDate}→${l.endDate}`,
          meta: l.userId || l.userID || l.employeeCode || "",
          status: l.status || "pending",
        })),
        ...(otList || []).slice(0, 2).map((r) => ({
          id: r.id,
          type: "Tăng ca",
          label: `${r.date || ""} ${r.startTime || ""}→${r.endTime || ""}`.trim(),
          meta: r.totalHours ? `${r.totalHours}h` : "",
          status: r.approvalStatus || "pending",
        })),
        ...(tripList || []).slice(0, 2).map((r) => ({
          id: r.id,
          type: "Công tác",
          label: `${r.destination || r.location || "—"}`.trim(),
          meta: r.date || r.startDate || "",
          status: r.approvalStatus || "pending",
        })),
        ...(advList || []).slice(0, 2).map((a) => ({
          id: a.id,
          type: "Tạm ứng",
          label: `${a.month || ""}/${a.year || ""}`.trim(),
          meta: a.amount ? `${Number(a.amount).toLocaleString("vi-VN")} VND` : "",
          status: a.approvalStatus || "pending",
        })),
        ...(salList || []).slice(0, 2).map((s) => ({
          id: s.id,
          type: "Lương",
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

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
    <div className="sup-dash">
      <div className="sup-dash-hero">
        <div className="sup-dash-hero-inner">
          <h2>Trung tâm phê duyệt</h2>
          <p>
            Theo dõi một chỗ tất cả đơn chờ xử lý trong phạm vi được phân quyền. Ưu tiên đơn cũ hoặc có SLA gắn với kỳ chấm công / lương.
          </p>
          <div className="sup-dash-pills">
            <span className="sup-dash-pill">{total} việc chờ xử lý</span>
            <span className="sup-dash-pill">Nghỉ · Tăng ca · Công tác · Tạm ứng · Lương</span>
          </div>
        </div>
      </div>

      <div className="sup-dash-kpis">
        <button type="button" className="sup-dash-kpi" style={{ cursor: 'pointer', border: '1px solid rgba(148,163,184,0.35)', font: 'inherit', textAlign: 'left' }} onClick={() => go('leave')}>
          <span className="sup-dash-kpi-deco" aria-hidden>📋</span>
          <div className="lbl">Nghỉ phép</div>
          <div className="val">{stats.pendingLeave}</div>
          <div className="hint">Nhấn để duyệt →</div>
        </button>
        <button type="button" className="sup-dash-kpi" style={{ cursor: 'pointer', border: '1px solid rgba(148,163,184,0.35)', font: 'inherit', textAlign: 'left' }} onClick={() => go('overtime')}>
          <span className="sup-dash-kpi-deco" aria-hidden>⏰</span>
          <div className="lbl">Tăng ca</div>
          <div className="val">{stats.pendingOvertime}</div>
          <div className="hint">Duyệt giờ TC →</div>
        </button>
        <button type="button" className="sup-dash-kpi" style={{ cursor: 'pointer', border: '1px solid rgba(148,163,184,0.35)', font: 'inherit', textAlign: 'left' }} onClick={() => go('business-trip')}>
          <span className="sup-dash-kpi-deco" aria-hidden>✈️</span>
          <div className="lbl">Công tác</div>
          <div className="val">{stats.pendingTrip}</div>
          <div className="hint">Chi phí &amp; lịch →</div>
        </button>
        <button type="button" className="sup-dash-kpi" style={{ cursor: 'pointer', border: '1px solid rgba(148,163,184,0.35)', font: 'inherit', textAlign: 'left' }} onClick={() => go('salary-advance')}>
          <span className="sup-dash-kpi-deco" aria-hidden>💵</span>
          <div className="lbl">Tạm ứng</div>
          <div className="val">{stats.pendingAdvance}</div>
          <div className="hint">Ứng lương →</div>
        </button>
      </div>

      <div className="sup-dash-kpis" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', marginBottom: 16 }}>
        <button type="button" className="sup-dash-kpi" style={{ cursor: 'pointer', border: '1px solid rgba(148,163,184,0.35)', font: 'inherit', textAlign: 'left' }} onClick={() => go('salary')}>
          <span className="sup-dash-kpi-deco" aria-hidden>💰</span>
          <div className="lbl">Bảng lương chờ duyệt</div>
          <div className="val">{stats.pendingSalary}</div>
          <div className="hint">Nếu API trả về rỗng, có thể kỳ này chưa có bảng chờ</div>
        </button>
        <div className="sup-dash-kpi">
          <span className="sup-dash-kpi-deco" aria-hidden>📊</span>
          <div className="lbl">Tổng backlog</div>
          <div className="val" style={{ color: '#1e1b4b' }}>{total}</div>
          <div className="hint">Gồm cả lương (nếu có dữ liệu)</div>
        </div>
      </div>

      {total > 0 && (
        <div className="card" style={{ marginBottom: 16, borderRadius: 16 }}>
          <p className="card-title">Phân bổ đơn chờ (%)</p>
          <div className="sup-dash-bar">
            {[
              ['Nghỉ', stats.pendingLeave],
              ['Tăng ca', stats.pendingOvertime],
              ['Công tác', stats.pendingTrip],
              ['Tạm ứng', stats.pendingAdvance],
              ['Lương', stats.pendingSalary],
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
          <p className="card-title">Hàng đợi gần đây</p>
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
        <h3>Gợi ý thao tác</h3>
        <p>
          Duyệt theo thứ tự: <strong>nghỉ phép</strong> (ảnh hưởng chấm công) → <strong>tăng ca / công tác</strong> → <strong>tạm ứng</strong> → <strong>bảng lương</strong>.
          Dùng tab <strong>Báo cáo</strong> để đối soát sau khi đóng kỳ.
        </p>
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => go('reports')}>Mở báo cáo</button>
          <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => go('leave')}>Đơn nghỉ</button>
        </div>
      </div>
    </div>
  );
}

// ─── GENERIC APPROVAL LIST ─────────────────────────────────────────────────────
function ApprovalList({ token, type, apiPath, columns, extractList }) {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
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

  return (
    <div>
      <div className="filters">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Đã từ chối</option>
        </select>
      </div>
      <div className="card">
        {loading ? <div className="loading">Đang tải...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map(c => <th key={c.key}>{c.label}</th>)}
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const rowStatus = item.status ?? item.approvalStatus ?? 'pending';
                  return (
                  <tr key={item.id}>
                    {columns.map(c => (
                      <td key={c.key}>{c.render ? c.render(item) : item[c.key] || '—'}</td>
                    ))}
                    <td>
                      <span className={`badge badge-${rowStatus || 'pending'}`}>
                        {{ pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Đã từ chối' }[rowStatus] || rowStatus}
                      </span>
                    </td>
                    <td>
                      {rowStatus === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-approve"
                            style={{ fontSize: 12, padding: '4px 10px' }}
                            onClick={() => { setActionModal({ item, action: 'approve' }); setComment(''); }}
                          >✓ Duyệt</button>
                          <button
                            className="btn btn-reject"
                            style={{ fontSize: 12, padding: '4px 10px' }}
                            onClick={() => { setActionModal({ item, action: 'reject' }); setComment(''); }}
                          >✗ Từ chối</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )})}
                {items.length === 0 && (
                  <tr><td colSpan={columns.length + 2} style={{ textAlign: 'center', color: '#718096', padding: 20 }}>Không có dữ liệu</td></tr>
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
              <h3>{actionModal.action === 'approve' ? '✓ Xác nhận duyệt' : '✗ Xác nhận từ chối'}</h3>
              <button className="close-btn" onClick={() => setActionModal(null)}>×</button>
            </div>
            <div className="form-group">
              <label>Nhận xét (tuỳ chọn)</label>
              <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="Nhập nhận xét..." />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Hủy</button>
              {actionModal.action === 'approve'
                ? <button className="btn btn-approve" onClick={approve}>Xác nhận duyệt</button>
                : <button className="btn btn-reject" onClick={reject}>Xác nhận từ chối</button>
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
        { key: 'User', label: 'Nhân viên', render: r => r.User?.name || r.userId },
        { key: 'type', label: 'Loại nghỉ' },
        { key: 'startDate', label: 'Từ ngày', render: r => r.startDate?.slice(0, 10) },
        { key: 'endDate', label: 'Đến ngày', render: r => r.endDate?.slice(0, 10) },
        { key: 'days', label: 'Số ngày' },
        { key: 'reason', label: 'Lý do' },
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
        { key: 'User', label: 'Nhân viên', render: r => r.User?.name || r.userId },
        { key: 'date', label: 'Ngày', render: r => r.date?.slice(0, 10) },
        { key: 'totalHours', label: 'Số giờ', render: r => r.totalHours ?? r.hours ?? '—' },
        { key: 'reason', label: 'Lý do' },
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
        { key: 'User', label: 'Nhân viên', render: r => r.User?.name || r.userId },
        { key: 'destination', label: 'Điểm đến' },
        { key: 'startDate', label: 'Từ ngày', render: r => r.startDate?.slice(0, 10) },
        { key: 'endDate', label: 'Đến ngày', render: r => r.endDate?.slice(0, 10) },
        { key: 'purpose', label: 'Mục đích' },
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
        { key: 'User', label: 'Nhân viên', render: r => r.User?.name || r.userId },
        { key: 'amount', label: 'Số tiền', render: r => Number(r.amount || 0).toLocaleString('vi-VN') + ' đ' },
        { key: 'reason', label: 'Lý do' },
        { key: 'requestDate', label: 'Ngày yêu cầu', render: r => r.requestDate?.slice(0, 10) || r.createdAt?.slice(0, 10) },
      ]}
    />
  );
}

// ─── SALARY APPROVALS ──────────────────────────────────────────────────────────
function SalaryApprovals({ token }) {
  const [items, setItems] = useState([]);
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

  return (
    <div className="card">
      <p className="card-title">Bảng lương chờ duyệt</p>
      {loading ? <div className="loading">Đang tải...</div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Nhân viên</th><th>Tháng/Năm</th>
                <th>Lương thực lĩnh</th><th>Trạng thái</th><th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.User?.name || item.userId}</td>
                  <td>{item.month}/{item.year}</td>
                  <td>{Number(item.netSalary || item.totalSalary || 0).toLocaleString('vi-VN')} đ</td>
                  <td><span className="badge badge-pending">Chờ duyệt</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-approve" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => act(item.id, 'approve')}>✓ Duyệt</button>
                      <button className="btn btn-reject" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => act(item.id, 'reject')}>✗ Từ chối</button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#718096', padding: 20 }}>Không có bảng lương chờ duyệt</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── APP ROOT ──────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'dashboard',     label: 'Tổng quan',      icon: '📊' },
  { key: 'leave',         label: 'Duyệt nghỉ phép', icon: '📋' },
  { key: 'overtime',      label: 'Duyệt tăng ca',   icon: '⏰' },
  { key: 'business-trip', label: 'Duyệt công tác',  icon: '✈️' },
  { key: 'salary-advance',label: 'Duyệt tạm ứng',   icon: '💵' },
  { key: 'salary',        label: 'Duyệt lương',     icon: '💰' },
  { key: 'reports',       label: 'Báo cáo',         icon: '📈' },
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

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = 'http://localhost:3000/';
  };

  if (!token) return <div className="loading">Đang xác thực...</div>;

  if (user?.role !== 'supervisor' && user?.role !== 'manager') {
    return (
      <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}>
        <div className="card" style={{ textAlign:'center' }}>
          <p style={{ fontSize:18, marginBottom:12 }}>⛔ Không có quyền truy cập</p>
          <p style={{ color:'#718096', marginBottom:20 }}>Trang này chỉ dành cho Quản lý (Supervisor) hoặc Manager</p>
          <button className="btn btn-primary" onClick={logout}>Đăng nhập lại</button>
        </div>
      </div>
    );
  }

  const tabTitles = {
    dashboard: 'Tổng quan - Quản lý',
    leave: 'Phê duyệt Nghỉ phép',
    overtime: 'Phê duyệt Tăng ca',
    'business-trip': 'Phê duyệt Công tác',
    'salary-advance': 'Phê duyệt Tạm ứng Lương',
    salary: 'Phê duyệt Bảng lương',
    reports: 'Xem Báo cáo',
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
          <button className="logout-btn" onClick={logout}>Đăng xuất</button>
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
