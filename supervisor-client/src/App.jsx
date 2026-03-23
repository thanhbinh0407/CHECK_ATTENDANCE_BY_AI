import { useState, useEffect, useCallback } from 'react';
import './index.css';

const API = 'http://localhost:5000/api';
function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ token }) {
  const [stats, setStats] = useState({ pendingLeave: 0, pendingOvertime: 0, pendingTrip: 0, pendingAdvance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/leave/requests?status=pending`, { headers: authHeaders(token) }).then(r => r.json()),
      fetch(`${API}/overtime?status=pending`, { headers: authHeaders(token) }).then(r => r.json()),
      fetch(`${API}/business-trip?status=pending`, { headers: authHeaders(token) }).then(r => r.json()),
      fetch(`${API}/salary-advance?status=pending`, { headers: authHeaders(token) }).then(r => r.json()),
    ]).then(([leave, ot, trip, adv]) => {
      setStats({
        pendingLeave:    (leave.leaveRequests || leave.data || []).length,
        pendingOvertime: (ot.overtimeRequests || ot.data || []).length,
        pendingTrip:     (trip.businessTripRequests || trip.data || []).length,
        pendingAdvance:  (adv.salaryAdvances || adv.data || []).length,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.pendingLeave}</div>
          <div className="stat-label">Đơn nghỉ chờ duyệt</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.pendingOvertime}</div>
          <div className="stat-label">Đơn tăng ca chờ duyệt</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.pendingTrip}</div>
          <div className="stat-label">Đơn công tác chờ duyệt</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.pendingAdvance}</div>
          <div className="stat-label">Tạm ứng chờ duyệt</div>
        </div>
      </div>
      <div className="card">
        <p className="card-title">Tổng quan</p>
        <p style={{ color: '#718096', fontSize: 14 }}>
          Xem và phê duyệt các đơn từ của nhân viên tại các mục bên trái.
          Supervisor có thể duyệt đơn nghỉ phép, tăng ca, công tác và tạm ứng lương.
        </p>
      </div>
    </>
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
    const url = `${API}/${apiPath}/${item.id}/approve`;
    const body = JSON.stringify({ status: 'approved', comments: comment });
    await fetch(url, { method: 'PUT', headers: authHeaders(token), body });
    setActionModal(null);
    setComment('');
    load();
  };

  const reject = async () => {
    const { item } = actionModal;
    const url = `${API}/${apiPath}/${item.id}/approve`;
    const body = JSON.stringify({ status: 'rejected', comments: comment });
    await fetch(url, { method: 'PUT', headers: authHeaders(token), body });
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
                {items.map(item => (
                  <tr key={item.id}>
                    {columns.map(c => (
                      <td key={c.key}>{c.render ? c.render(item) : item[c.key] || '—'}</td>
                    ))}
                    <td>
                      <span className={`badge badge-${item.status || 'pending'}`}>
                        {{ pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Đã từ chối' }[item.status] || item.status}
                      </span>
                    </td>
                    <td>
                      {item.status === 'pending' && (
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
                ))}
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
      apiPath="overtime"
      extractList={d => d.overtimeRequests || d.data || []}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'User', label: 'Nhân viên', render: r => r.User?.name || r.userId },
        { key: 'date', label: 'Ngày', render: r => r.date?.slice(0, 10) },
        { key: 'hours', label: 'Số giờ' },
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
      apiPath="business-trip"
      extractList={d => d.businessTripRequests || d.data || []}
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
      apiPath="salary-advance"
      extractList={d => d.salaryAdvances || d.data || []}
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

// ─── REPORTS OVERVIEW ──────────────────────────────────────────────────────────
function ReportsOverview({ token }) {
  const [report, setReport] = useState(null);
  const [reportType, setReportType] = useState('attendance');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    const res = await fetch(`${API}/reports/${reportType}?month=${month}&year=${year}`, { headers: authHeaders(token) });
    const data = await res.json();
    setReport(data);
    setLoading(false);
  };

  return (
    <div>
      <div className="filters">
        <select value={reportType} onChange={e => setReportType(e.target.value)}>
          <option value="attendance">Chấm công</option>
          <option value="leave-status">Nghỉ phép</option>
          <option value="overtime">Tăng ca</option>
          <option value="payroll-cost">Chi phí lương</option>
          <option value="average-income">Thu nhập bình quân</option>
          <option value="turnover">Biến động nhân sự</option>
        </select>
        <select value={month} onChange={e => setMonth(e.target.value)}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
          ))}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)}>
          {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button className="btn btn-primary" onClick={loadReport}>Xem báo cáo</button>
      </div>
      {loading && <div className="loading">Đang tải...</div>}
      {report && !loading && (
        <div className="card">
          <p className="card-title">Kết quả báo cáo</p>
          <pre style={{ fontSize: 12, overflow: 'auto', maxHeight: 400, whiteSpace: 'pre-wrap', color: '#4a5568' }}>
            {JSON.stringify(report, null, 2)}
          </pre>
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
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const urlUser  = params.get('user');
    if (urlToken && urlUser) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(urlUser));
        localStorage.setItem('authToken', decodeURIComponent(urlToken));
        localStorage.setItem('user', JSON.stringify(parsedUser));
        setToken(decodeURIComponent(urlToken));
        setUser(parsedUser);
        window.history.replaceState({}, '', window.location.pathname);
        return;
      } catch (_) {}
    }
    const savedToken = localStorage.getItem('authToken');
    const savedUser  = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    } else {
      window.location.href = 'http://localhost:3000/';
    }
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
          {activeTab === 'dashboard'      && <Dashboard token={token} />}
          {activeTab === 'leave'          && <LeaveApprovals token={token} />}
          {activeTab === 'overtime'       && <OvertimeApprovals token={token} />}
          {activeTab === 'business-trip'  && <BusinessTripApprovals token={token} />}
          {activeTab === 'salary-advance' && <SalaryAdvanceApprovals token={token} />}
          {activeTab === 'salary'         && <SalaryApprovals token={token} />}
          {activeTab === 'reports'        && <ReportsOverview token={token} />}
        </div>
      </div>
    </div>
  );
}
