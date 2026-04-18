import { useState, useEffect, useCallback } from 'react';
import { toastConfirm, toastError } from './lib/notify.jsx';
import './hrDashboardExtras.css';
import HrDashboard from './HrDashboard.jsx';
import HrLeaveApprovals from './HrLeaveApprovals.jsx';
import HrAnalytics from './HrAnalytics.jsx';
import HrReports from './HrReports.jsx';
import HrShiftAdmin from './HrShiftAdmin.jsx';
import EmployeeManagement from './EmployeeManagement.jsx';
import './index.css';

const API = 'http://localhost:5000/api';

// ─── helpers ──────────────────────────────────────────────────────────────────
function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
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
    else toastError(data.message || 'Error saving department');
  };

  const remove = async (id) => {
    const ok = await toastConfirm({ message: 'Delete this department?' });
    if (!ok) return;
    const res = await fetch(`${API}/departments/${id}`, { method: 'DELETE', headers: authHeaders(token) });
    const data = await res.json();
    if (data.status === 'success') load();
    else toastError(data.message || 'Error deleting department');
  };

  return (
    <div>
      <div className="search-bar" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={openCreate}>+ Add department</button>
      </div>
      <div className="card">
        {loading ? <div className="loading">Loading...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Department name</th><th>Description</th><th></th></tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>{item.id}</td><td>{item.name}</td><td>{item.description || '—'}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => openEdit(item)}>Edit</button>
                      <button className="btn btn-danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => remove(item.id)}>Delete</button>
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
              <h3>{editing ? 'Update department' : 'Add department'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Department name *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
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
    else toastError(data.message || 'Error saving job title');
  };

  return (
    <div>
      <div className="search-bar" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={openCreate}>+ Add job title</button>
      </div>
      <div className="card">
        {loading ? <div className="loading">Loading...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Job title</th><th>Level</th><th>Description</th><th></th></tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>{item.id}</td><td>{item.name}</td><td>{item.level || '—'}</td><td>{item.description || '—'}</td>
                    <td><button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => openEdit(item)}>Edit</button></td>
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
              <h3>{editing ? 'Update job title' : 'Add job title'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Job title name *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Level</label>
                <input type="number" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
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
      <p className="card-title">Latest attendance logs</p>
      {loading ? <div className="loading">Loading...</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>Employee code</th><th>Full name</th><th>Type</th><th>IP</th></tr></thead>
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
  { key: 'dashboard',   label: 'Overview',      icon: '📊' },
  { key: 'employees',   label: 'Employees',     icon: '👥' },
  { key: 'departments', label: 'Departments',   icon: '🏢' },
  { key: 'job-titles',  label: 'Job titles',    icon: '📋' },
  { key: 'shifts',      label: 'Work shifts',   icon: '🕐' },
  { key: 'attendance',  label: 'Attendance',    icon: '📅' },
  { key: 'leave',       label: 'Leave approval', icon: '✅' },
  { key: 'analytics',   label: 'Analytics',     icon: '📉' },
  { key: 'reports',     label: 'HR reports',    icon: '📑' },
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

  if (!token) return <div className="loading">Authenticating...</div>;

  // Verify HR or Manager access
  if (user?.role !== 'hr' && user?.role !== 'manager') {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div className="card" style={{ textAlign:'center' }}>
          <p style={{ fontSize:18, marginBottom:12 }}>⛔ Access denied</p>
          <p style={{ color:'#718096', marginBottom:20 }}>This page is only for HR staff or managers.</p>
          <button className="btn btn-primary" onClick={logout}>Back to login</button>
        </div>
      </div>
    );
  }

  const tabTitles = {
    dashboard: 'HR overview',
    employees: 'Employee management',
    departments: 'Department management',
    'job-titles': 'Job title management',
    shifts: 'Work shifts',
    attendance: 'Attendance tracking',
    leave: 'Leave approvals',
    analytics: 'HR analytics',
    reports: 'HR reports',
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
          <button className="logout-btn" onClick={logout}>Log out</button>
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
          {activeTab === 'employees'   && <EmployeeManagement token={token} user={user} />}
          {activeTab === 'departments' && <DepartmentManagement token={token} />}
          {activeTab === 'job-titles'  && <JobTitleManagement token={token} />}
          {activeTab === 'shifts'      && <HrShiftAdmin token={token} />}
          {activeTab === 'attendance'  && <AttendanceOverview token={token} />}
          {activeTab === 'leave'       && <HrLeaveApprovals token={token} />}
          {activeTab === 'analytics'   && <HrAnalytics token={token} />}
          {activeTab === 'reports'     && <HrReports token={token} />}
        </div>
      </div>
    </div>
  );
}
