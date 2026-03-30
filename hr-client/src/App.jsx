import { useState, useEffect, useCallback } from 'react';
import './hrDashboardExtras.css';
import HrDashboard from './HrDashboard.jsx';
import HrLeaveApprovals from './HrLeaveApprovals.jsx';
import HrAnalytics from './HrAnalytics.jsx';
import HrReports from './HrReports.jsx';
import './index.css';

const API = 'http://localhost:5000/api';

// ─── helpers ──────────────────────────────────────────────────────────────────
function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ─── EMPLOYEE LIST ─────────────────────────────────────────────────────────────
function EmployeeManagement({ token }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', employeeCode: '', role: 'employee',
    departmentId: '', jobTitleId: '', phoneNumber: '', gender: '',
    dateOfBirth: '', contractType: '', startDate: '', baseSalary: '',
    effectiveDate: '', historyNote: '', salaryChangeReason: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, deptRes, jtRes] = await Promise.all([
        fetch(`${API}/admin/employees`, { headers: authHeaders(token) }),
        fetch(`${API}/departments`, { headers: authHeaders(token) }),
        fetch(`${API}/job-titles`, { headers: authHeaders(token) }),
      ]);
      const empData = await empRes.json();
      const deptData = await deptRes.json();
      const jtData = await jtRes.json();
      setEmployees(empData.employees || empData.data || []);
      setDepartments(deptData.departments || deptData.data || []);
      setJobTitles(jtData.jobTitles || jtData.data || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', employeeCode: '', role: 'employee', departmentId: '', jobTitleId: '', phoneNumber: '', gender: '', dateOfBirth: '', contractType: '', startDate: '', baseSalary: '', effectiveDate: '', historyNote: '', salaryChangeReason: '' });
    setShowModal(true);
  };

  const openEdit = (emp) => {
    setEditing(emp);
    setForm({
      name: emp.name || '', email: emp.email || '', employeeCode: emp.employeeCode || '',
      role: emp.role || 'employee', departmentId: emp.departmentId || '',
      jobTitleId: emp.jobTitleId || '', phoneNumber: emp.phoneNumber || '',
      gender: emp.gender || '', dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.slice(0, 10) : '',
      contractType: emp.contractType || '', startDate: emp.startDate ? emp.startDate.slice(0, 10) : '',
      baseSalary: emp.baseSalary || '',
      effectiveDate: '', historyNote: '', salaryChangeReason: '',
    });
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing
      ? `${API}/admin/employees/${editing.id}`
      : `${API}/admin/employees`;
    const body = editing ? { ...form } : { ...form, password: '12345678' };
    const res = await fetch(url, { method, headers: authHeaders(token), body: JSON.stringify(body) });
    const data = await res.json();
    if (data.status === 'success' || data.employee || data.data) {
      setShowModal(false);
      load();
    } else {
      alert(data.message || 'Lỗi khi lưu');
    }
  };

  const filtered = employees.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="search-bar">
        <input placeholder="Tìm theo tên, email, mã nhân viên..." value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-primary" onClick={openCreate}>+ Thêm nhân viên</button>
      </div>
      {error && <div className="error-msg">{error}</div>}
      <div className="card">
        {loading ? <div className="loading">Đang tải...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã NV</th><th>Họ tên</th><th>Email</th><th>Phòng ban</th>
                  <th>Chức danh</th><th>Vai trò</th><th>Trạng thái</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id}>
                    <td>{emp.employeeCode}</td>
                    <td>{emp.name}</td>
                    <td>{emp.email}</td>
                    <td>{emp.Department?.name || emp.departmentId || '—'}</td>
                    <td>{emp.JobTitle?.name || emp.jobTitleId || '—'}</td>
                    <td><span style={{fontSize:12,background:'#ebf8ff',color:'#2b6cb0',padding:'2px 8px',borderRadius:999}}>{emp.role}</span></td>
                    <td>
                      <span className={`badge ${emp.isActive ? 'badge-active' : 'badge-inactive'}`}>
                        {emp.isActive ? 'Đang làm' : 'Nghỉ việc'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{fontSize:12,padding:'4px 10px'}} onClick={() => openEdit(emp)}>Sửa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="loading">Không có dữ liệu</div>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="form-row">
                <div className="form-group"><label>Họ tên *</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="form-group"><label>Email *</label><input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Mã nhân viên</label><input value={form.employeeCode} onChange={e => setForm({ ...form, employeeCode: e.target.value })} /></div>
                <div className="form-group"><label>Điện thoại</label><input value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phòng ban</label>
                  <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Chức danh</label>
                  <select value={form.jobTitleId} onChange={e => setForm({ ...form, jobTitleId: e.target.value })}>
                    <option value="">-- Chọn chức danh --</option>
                    {jobTitles.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Vai trò</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="employee">Nhân viên</option>
                    <option value="hr">Nhân sự (HR)</option>
                    <option value="accountant">Kế toán</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Giới tính</label>
                  <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Ngày sinh</label><input type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
                <div className="form-group"><label>Ngày vào làm</label><input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Loại hợp đồng</label>
                  <select value={form.contractType} onChange={e => setForm({ ...form, contractType: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    <option value="probation">Thử việc</option>
                    <option value="1_year">1 năm</option>
                    <option value="3_year">3 năm</option>
                    <option value="indefinite">Không xác định thời hạn</option>
                  </select>
                </div>
                <div className="form-group"><label>Lương cơ bản</label><input type="number" value={form.baseSalary} onChange={e => setForm({ ...form, baseSalary: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ngày hiệu lực thay đổi</label>
                  <input type="date" value={form.effectiveDate} onChange={e => setForm({ ...form, effectiveDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Lý do thay đổi lương</label>
                  <input value={form.salaryChangeReason} onChange={e => setForm({ ...form, salaryChangeReason: e.target.value })} placeholder="VD: Điều chỉnh theo kỳ đánh giá" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ width: '100%' }}>
                  <label>Ghi chú thay đổi</label>
                  <textarea rows={3} value={form.historyNote} onChange={e => setForm({ ...form, historyNote: e.target.value })} placeholder="Mô tả thay đổi chức danh/phòng ban/lương" style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DEPARTMENT MANAGEMENT ─────────────────────────────────────────────────────
function DepartmentManagement({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/departments`, { headers: authHeaders(token) });
    const data = await res.json();
    setItems(data.departments || data.data || []);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '' }); setShowModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ name: item.name, description: item.description || '' }); setShowModal(true); };

  const save = async (e) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/departments/${editing.id}` : `${API}/departments`;
    const res = await fetch(url, { method, headers: authHeaders(token), body: JSON.stringify(form) });
    const data = await res.json();
    if (data.status === 'success' || data.department || data.data) { setShowModal(false); load(); }
    else alert(data.message || 'Lỗi khi lưu');
  };

  const remove = async (id) => {
    if (!confirm('Xác nhận xóa phòng ban này?')) return;
    const res = await fetch(`${API}/departments/${id}`, { method: 'DELETE', headers: authHeaders(token) });
    const data = await res.json();
    if (data.status === 'success') load();
    else alert(data.message || 'Lỗi khi xóa');
  };

  return (
    <div>
      <div className="search-bar" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={openCreate}>+ Thêm phòng ban</button>
      </div>
      <div className="card">
        {loading ? <div className="loading">Đang tải...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Tên phòng ban</th><th>Mô tả</th><th></th></tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>{item.id}</td><td>{item.name}</td><td>{item.description || '—'}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => openEdit(item)}>Sửa</button>
                      <button className="btn btn-danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => remove(item.id)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Cập nhật phòng ban' : 'Thêm phòng ban'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Tên phòng ban *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Mô tả</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── JOB TITLE MANAGEMENT ──────────────────────────────────────────────────────
function JobTitleManagement({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', level: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/job-titles`, { headers: authHeaders(token) });
    const data = await res.json();
    setItems(data.jobTitles || data.data || []);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', level: '' }); setShowModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ name: item.name, description: item.description || '', level: item.level || '' }); setShowModal(true); };

  const save = async (e) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/job-titles/${editing.id}` : `${API}/job-titles`;
    const res = await fetch(url, { method, headers: authHeaders(token), body: JSON.stringify(form) });
    const data = await res.json();
    if (data.status === 'success' || data.jobTitle || data.data) { setShowModal(false); load(); }
    else alert(data.message || 'Lỗi khi lưu');
  };

  return (
    <div>
      <div className="search-bar" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={openCreate}>+ Thêm chức danh</button>
      </div>
      <div className="card">
        {loading ? <div className="loading">Đang tải...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Chức danh</th><th>Cấp bậc</th><th>Mô tả</th><th></th></tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>{item.id}</td><td>{item.name}</td><td>{item.level || '—'}</td><td>{item.description || '—'}</td>
                    <td><button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => openEdit(item)}>Sửa</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Cập nhật chức danh' : 'Thêm chức danh'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Tên chức danh *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Cấp bậc</label>
                <input type="number" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Mô tả</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ATTENDANCE OVERVIEW ───────────────────────────────────────────────────────
function AttendanceOverview({ token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/admin/logs`, { headers: authHeaders(token) })
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  return (
    <div className="card">
      <p className="card-title">Nhật ký chấm công gần nhất</p>
      {loading ? <div className="loading">Đang tải...</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Thời gian</th><th>Mã NV</th><th>Họ tên</th><th>Loại</th><th>IP</th></tr></thead>
            <tbody>
              {logs.slice(0, 50).map(log => (
                <tr key={log.id}>
                  <td>{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                  <td>{log.User?.employeeCode || log.userId}</td>
                  <td>{log.User?.name || '—'}</td>
                  <td>{log.type || log.status}</td>
                  <td>{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── APP ROOT ──────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'dashboard',   label: 'Tổng quan',     icon: '📊' },
  { key: 'employees',   label: 'Nhân viên',     icon: '👥' },
  { key: 'departments', label: 'Phòng ban',     icon: '🏢' },
  { key: 'job-titles',  label: 'Chức danh',     icon: '📋' },
  { key: 'attendance',  label: 'Chấm công',     icon: '📅' },
  { key: 'leave',       label: 'Duyệt nghỉ phép', icon: '✅' },
  { key: 'analytics',   label: 'Phân tích',      icon: '📉' },
  { key: 'reports',     label: 'Báo cáo HR',     icon: '📑' },
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

  // Kiểm tra quyền HR hoặc Manager
  if (user?.role !== 'hr' && user?.role !== 'manager') {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div className="card" style={{ textAlign:'center' }}>
          <p style={{ fontSize:18, marginBottom:12 }}>⛔ Không có quyền truy cập</p>
          <p style={{ color:'#718096', marginBottom:20 }}>Trang này chỉ dành cho Nhân sự (HR) hoặc Manager</p>
          <button className="btn btn-primary" onClick={logout}>Đăng nhập lại</button>
        </div>
      </div>
    );
  }

  const tabTitles = {
    dashboard: 'Tổng quan — HR',
    employees: 'Quản lý Nhân viên',
    departments: 'Quản lý Phòng ban',
    'job-titles': 'Quản lý Chức danh',
    attendance: 'Theo dõi Chấm công',
    leave: 'Duyệt đơn nghỉ phép',
    analytics: 'Phân tích HR',
    reports: 'Báo cáo HR',
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <span style={{ fontSize: 22 }}>👥</span>
          <h2>HR Portal</h2>
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
            <span style={{ opacity: 0.65 }}>{user?.role === 'manager' ? 'Manager' : 'HR Staff'}</span>
          </div>
          <button className="logout-btn" onClick={logout}>Đăng xuất</button>
        </div>
      </nav>

      {/* Main */}
      <div className="main-content">
        <div className="topbar">
          <h1>{tabTitles[activeTab]}</h1>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>
        <div className="page-content">
          {activeTab === 'dashboard'   && <HrDashboard token={token} onNavigate={setActiveTab} />}
          {activeTab === 'employees'   && <EmployeeManagement token={token} />}
          {activeTab === 'departments' && <DepartmentManagement token={token} />}
          {activeTab === 'job-titles'  && <JobTitleManagement token={token} />}
          {activeTab === 'attendance'  && <AttendanceOverview token={token} />}
          {activeTab === 'leave'       && <HrLeaveApprovals token={token} />}
          {activeTab === 'analytics'   && <HrAnalytics token={token} />}
          {activeTab === 'reports'     && <HrReports token={token} />}
        </div>
      </div>
    </div>
  );
}
