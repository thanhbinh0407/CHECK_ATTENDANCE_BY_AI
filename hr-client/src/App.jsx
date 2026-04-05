import { useState, useEffect, useCallback, useMemo } from 'react';
import './hrDashboardExtras.css';
import './index.css';
import EmployeeManagement from './EmployeeManagement.jsx';
import HrDashboard from './HrDashboard.jsx';
import HrLeaveApprovals from './HrLeaveApprovals.jsx';
import HrAnalytics from './HrAnalytics.jsx';
import HrReports from './HrReports.jsx';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ─── DEPARTMENT MANAGEMENT ─────────────────────────────────────────────────────
function DepartmentManagement({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/departments`, { headers: authHeaders(token) });
      const data = await res.json();
      setItems(data.departments || data.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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
    else alert(data.message || 'Error saving');
  };

  const remove = async (id) => {
    if (!confirm('Confirm delete this department?')) return;
    const res = await fetch(`${API}/departments/${id}`, { method: 'DELETE', headers: authHeaders(token) });
    const data = await res.json();
    if (data.status === 'success') load();
    else alert(data.message || 'Error deleting');
  };

  return (
    <div>
      <div className="search-bar" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Department</button>
      </div>
      {error && <div className="error-msg">{error}</div>}
      <div className="card">
        {loading ? <div className="loading">Loading...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Department Name</th><th>Description</th><th></th></tr></thead>
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
              <h3>{editing ? 'Update Department' : 'Add Department'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Department Name *</label>
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
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', level: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/job-titles`, { headers: authHeaders(token) });
      const data = await res.json();
      setItems(data.jobTitles || data.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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
    else alert(data.message || 'Error saving');
  };

  return (
    <div>
      <div className="search-bar" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Job Title</button>
      </div>
      {error && <div className="error-msg">{error}</div>}
      <div className="card">
        {loading ? <div className="loading">Loading...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Job Title</th><th>Level</th><th>Description</th><th></th></tr></thead>
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
              <h3>{editing ? 'Update Job Title' : 'Add Job Title'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Job Title Name *</label>
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
const TYPE_BADGE = {
  IN:  { background: '#c6f6d5', color: '#276749' },
  OUT: { background: '#fed7d7', color: '#9b2c2c' },
};

function AttendanceOverview({ token }) {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [filterType, setFilterType]   = useState('');
  const [filterDate, setFilterDate]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API}/admin/logs`, { headers: authHeaders(token) });
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      setError('Failed to load attendance logs: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // unique types from data
  const logTypes = useMemo(() => {
    const s = new Set(logs.map(l => (l.type || l.status || '').toUpperCase()).filter(Boolean));
    return [...s].sort();
  }, [logs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter(log => {
      const matchSearch =
        !q ||
        (log.User?.name || '').toLowerCase().includes(q) ||
        (log.User?.employeeCode || '').toLowerCase().includes(q) ||
        String(log.userId || '').includes(q);
      const logType = (log.type || log.status || '').toUpperCase();
      const matchType = !filterType || logType === filterType;
      const matchDate = !filterDate ||
        (log.timestamp && log.timestamp.slice(0, 10) === filterDate);
      return matchSearch && matchType && matchDate;
    });
  }, [logs, search, filterType, filterDate]);

  const hasFilter = search || filterType || filterDate;
  const clearFilters = () => { setSearch(''); setFilterType(''); setFilterDate(''); };

  return (
    <div>
      {/* Toolbar */}
      <div className="emp-toolbar">
        <input
          className="emp-search"
          placeholder="Search by name or employee code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="emp-filter-select"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          {logTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          type="date"
          className="emp-filter-select"
          style={{ minWidth: 150 }}
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          title="Filter by date"
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

      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ padding: 0 }}>
        {/* Summary bar */}
        <div className="emp-summary-bar">
          <span>
            Showing <strong>{filtered.length}</strong> / {logs.length} logs
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
          <div className="loading">Loading attendance logs...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Emp. Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => {
                  const logType = (log.type || log.status || '').toUpperCase();
                  const badge   = TYPE_BADGE[logType];
                  return (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('en-US') : '—'}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2b6cb0', fontSize: 13 }}>
                          {log.User?.employeeCode || log.userId || '—'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{log.User?.name || '—'}</td>
                      <td style={{ color: '#718096', fontSize: 13 }}>{log.User?.Department?.name || '—'}</td>
                      <td>
                        {badge ? (
                          <span style={{
                            ...badge, padding: '2px 10px', borderRadius: 999,
                            fontSize: 12, fontWeight: 600,
                          }}>
                            {logType}
                          </span>
                        ) : (
                          <span style={{ fontSize: 13, color: '#4a5568' }}>{logType || '—'}</span>
                        )}
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: 13 }}>{log.ipAddress || '—'}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                      {logs.length === 0 ? 'No attendance logs available.' : 'No logs match the current filters.'}
                    </td>
                  </tr>
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
  { key: 'dashboard',   label: 'Overview',       icon: '📊' },
  { key: 'employees',   label: 'Employees',      icon: '👥' },
  { key: 'departments', label: 'Departments',    icon: '🏢' },
  { key: 'job-titles',  label: 'Job Titles',     icon: '📋' },
  { key: 'attendance',  label: 'Attendance',     icon: '📅' },
  { key: 'leave',       label: 'Leave Approvals',icon: '✅' },
  { key: 'analytics',   label: 'Analytics',      icon: '📉' },
  { key: 'reports',     label: 'HR Reports',     icon: '📑' },
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

  if (user?.role !== 'hr' && user?.role !== 'manager') {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div className="card" style={{ textAlign:'center' }}>
          <p style={{ fontSize:18, marginBottom:12 }}>⛔ Access Denied</p>
          <p style={{ color:'#718096', marginBottom:20 }}>This page is only accessible to HR Staff or Managers</p>
          <button className="btn btn-primary" onClick={logout}>Back to Login</button>
        </div>
      </div>
    );
  }

  const tabTitles = {
    dashboard:   'HR Overview',
    employees:   'Employee Management',
    departments: 'Department Management',
    'job-titles':'Job Title Management',
    attendance:  'Attendance Tracking',
    leave:       'Leave Approvals',
    analytics:   'HR Analytics',
    reports:     'HR Reports',
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
          <button className="logout-btn" onClick={logout}>Log Out</button>
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
          {activeTab === 'attendance'  && <AttendanceOverview token={token} />}
          {activeTab === 'leave'       && <HrLeaveApprovals token={token} />}
          {activeTab === 'analytics'   && <HrAnalytics token={token} />}
          {activeTab === 'reports'     && <HrReports token={token} />}
        </div>
      </div>
    </div>
  );
}
