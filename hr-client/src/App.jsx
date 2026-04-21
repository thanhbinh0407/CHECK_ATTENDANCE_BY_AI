import { useState, useEffect, useCallback } from 'react';
import './hrDashboardExtras.css';
import HrDashboard from './HrDashboard.jsx';
import HrLeaveApprovals from './HrLeaveApprovals.jsx';
import HrAnalytics from './HrAnalytics.jsx';
import HrReports from './HrReports.jsx';
import HrShiftAdmin from './HrShiftAdmin.jsx';
import EmployeeManagement from './EmployeeManagement.jsx';
import HrAttendance from './HrAttendance.jsx';
import HrPayrollReference from './HrPayrollReference.jsx';
import PersonalProfileModal from './PersonalProfileModal.jsx';
import DepartmentManagement from './components/DepartmentManagement.jsx';
import JobTitleManagement from './components/JobTitleManagement.jsx';
import './index.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const API = `${String(API_BASE).replace(/\/$/, '')}/api`;

function portalAvatarSrc(apiBase, avatarUrl) {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  const base = (apiBase || '').replace(/\/$/, '');
  const path = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  return `${base}${path}`;
}

// ─── APP ROOT ──────────────────────────────────────────────────────────────────
/** Sidebar groups (Organization mirrors Manager Console). */
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ key: 'dashboard', label: 'Overview', icon: '📊' }],
  },
  {
    label: 'People',
    items: [{ key: 'employees', label: 'Employees', icon: '👥' }],
  },
  {
    label: 'Organization',
    items: [
      { key: 'departments', label: 'Departments', icon: '🏢' },
      { key: 'job-titles', label: 'Job titles', icon: '📋' },
      { key: 'shifts', label: 'Work shifts', icon: '🕐' },
    ],
  },
  {
    label: 'Attendance & leave',
    items: [
      { key: 'attendance', label: 'Attendance', icon: '📅' },
      { key: 'leave', label: 'Leave approval', icon: '✅' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { key: 'analytics', label: 'Analytics', icon: '📉' },
      { key: 'reports', label: 'HR reports', icon: '📑' },
    ],
  },
  {
    label: 'Payroll',
    items: [{ key: 'payroll-ref', label: 'Payroll ref.', icon: '💼' }],
  },
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
    'payroll-ref': 'Payroll reference',
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
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="hr-nav-group">
              <div className="hr-nav-group-label">{group.label}</div>
              {group.items.map((tab) => (
                <div
                  key={tab.key}
                  className={`nav-item ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveTab(tab.key);
                    }
                  }}
                >
                  <span className="nav-icon">{tab.icon}</span>
                  <span className="nav-label">{tab.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="user-info">
            <strong>{user?.name}</strong><br />
            <span style={{ opacity: 0.65 }}>{user?.role === 'manager' ? 'Manager' : 'HR Staff'}</span>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="main-content">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}
              aria-label="Toggle menu"
            >
              {collapsed ? '→' : '←'}
            </button>
            <h1>{tabTitles[activeTab]}</h1>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="portal-avatar-btn"
              onClick={() => setProfileOpen(true)}
              title="Personal profile"
              aria-label="Open personal profile"
            >
              {portalAvatarSrc(API_BASE, user?.avatarUrl) ? (
                <img className="portal-avatar-img" src={portalAvatarSrc(API_BASE, user?.avatarUrl)} alt="" />
              ) : (
                <span className="portal-avatar-fallback" aria-hidden>
                  {(user?.name || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </button>
            <span style={{ fontSize: 13, color: '#64748b' }}>{user?.email}</span>
            <button type="button" className="topbar-signout" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
        <div className="page-content">
          {activeTab === 'dashboard'   && <HrDashboard token={token} onNavigate={setActiveTab} />}
          {activeTab === 'employees'   && <EmployeeManagement token={token} user={user} />}
          {activeTab === 'departments' && <DepartmentManagement />}
          {activeTab === 'job-titles'  && <JobTitleManagement />}
          {activeTab === 'shifts'      && <HrShiftAdmin />}
          {activeTab === 'attendance'  && <HrAttendance token={token} />}
          {activeTab === 'payroll-ref' && <HrPayrollReference token={token} />}
          {activeTab === 'leave'       && <HrLeaveApprovals token={token} />}
          {activeTab === 'analytics'   && <HrAnalytics token={token} />}
          {activeTab === 'reports'     && <HrReports token={token} />}
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
