import { useCallback, useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import PersonalProfileModal from '../components/PersonalProfileModal.jsx';
import './managerShell.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: '📊' }],
  },
  {
    label: 'People & Accounts',
    items: [
      { to: '/employees', label: 'Employee Profiles', icon: '👥' },
      { to: '/users', label: 'Accounts & Permissions', icon: '🔐' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { to: '/departments', label: 'Departments', icon: '🏢' },
      { to: '/job-titles', label: 'Job Titles', icon: '📋' },
      { to: '/shifts', label: 'Work Shifts', icon: '🕐' },
    ],
  },
  {
    label: 'Attendance',
    items: [
      { to: '/camera', label: 'Face Recognition Kiosk', icon: '📷' },
      { to: '/attendance-logs', label: 'Attendance Logs', icon: '📅' },
    ],
  },
  {
    label: 'Requests',
    items: [
      { to: '/leave', label: 'Leave Requests', icon: '🏖️' },
      { to: '/overtime', label: 'Overtime', icon: '⏱️' },
      { to: '/business-trips', label: 'Business Trips', icon: '✈️' },
      { to: '/salary-advances', label: 'Salary Advances', icon: '💵' },
      { to: '/approvals', label: 'Approval Flow (HR)', icon: '✅' },
    ],
  },
  {
    label: 'Payroll & Insurance',
    items: [
      { to: '/salary', label: 'Payroll Management', icon: '💰' },
      { to: '/salary-admin', label: 'Payroll (Admin)', icon: '📑' },
      { to: '/salary-calc', label: 'Payroll Calculation', icon: '🧮' },
      { to: '/salary-grades', label: 'Salary Grades', icon: '📈' },
      { to: '/insurance-config', label: 'Insurance Settings', icon: '🏥' },
      { to: '/insurance-d02', label: 'D02-LT', icon: '📄' },
      { to: '/insurance-tk1', label: 'TK1-TS', icon: '📝' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { to: '/reports', label: 'Reports', icon: '📊' },
      { to: '/analytics', label: 'Analytics', icon: '📉' },
      { to: '/approval-audit', label: 'Approval Responsibility Log', icon: '🧾' },
    ],
  },
  {
    label: 'Profiles & Documents',
    items: [
      { to: '/documents', label: 'Documents', icon: '📎' },
      { to: '/dependents', label: 'Dependents', icon: '👨‍👩‍👧' },
      { to: '/qualifications', label: 'Qualifications / Certificates', icon: '🎓' },
    ],
  },
  {
    label: 'Other',
    items: [{ to: '/enrollment', label: 'Face Enrollment', icon: '🪪' }],
  },
];

function titleFromPath(pathname) {
  for (const g of NAV_GROUPS) {
    const f = g.items.find((i) => i.to === pathname);
    if (f) return f.label;
  }
  if (pathname === '/') return 'Dashboard';
  return 'HRMS Manager';
}

const ROLE_LABEL = {
  manager: 'Director / Administrator',
  hr: 'HR Staff',
  accountant: 'Accountant',
  supervisor: 'Supervisor',
  employee: 'Employee',
};

function resolveAvatarUrl(apiBase, avatarUrl) {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  const base = (apiBase || '').replace(/\/$/, '');
  const path = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  return `${base}${path}`;
}

export default function ManagerLayout() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();

  const patchSessionUser = useCallback((patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        setUser(null);
      }
    }
    if (token) {
      fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.status === 'success' && data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
          } else {
            // Token invalidated (e.g. role changed) => force logout
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = 'http://localhost:3000/';
          }
        })
        .catch(() => {});
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!localStorage.getItem('authToken')) {
      window.location.href = 'http://localhost:3000/';
      return;
    }
    if (user && user.role !== 'manager') {
      window.location.href = 'http://localhost:3000/';
    }
  }, [ready, user]);

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = 'http://localhost:3000/';
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  if (!ready || !token) {
    return <div className="mgr-loading">Checking your sign-in session...</div>;
  }

  if (!user) {
    return <div className="mgr-loading">Loading account information...</div>;
  }

  if (user.role !== 'manager') {
    return <div className="mgr-loading">Redirecting...</div>;
  }

  const pageTitle = titleFromPath(location.pathname);

  return (
    <div className={`mgr-app ${collapsed ? 'mgr-collapsed' : ''}`}>
      <aside className="mgr-sidebar">
        <div className="mgr-brand">
          <div className="mgr-brand-mark">H</div>
          {!collapsed && (
            <div className="mgr-brand-text">
              HRMS
              <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.75 }}>Manager Console</div>
            </div>
          )}
        </div>
        <nav className="mgr-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="mgr-nav-group-label">{group.label}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `mgr-nav-item${isActive ? ' active' : ''}`}
                  end={item.to === '/dashboard'}
                >
                  <span className="mgr-nav-ico">{item.icon}</span>
                  <span className="mgr-nav-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="mgr-sidebar-footer">
          {!collapsed && (
            <>
              <strong style={{ color: '#cbd5e1' }}>{user?.name}</strong>
              <div>{ROLE_LABEL[user?.role] || 'Account'}</div>
            </>
          )}
        </div>
      </aside>
      <div className="mgr-main">
        <header className="mgr-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button type="button" className="mgr-btn-ghost" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle menu">
              {collapsed ? '→' : '←'}
            </button>
            <span className="mgr-topbar-title">{pageTitle}</span>
          </div>
          <div className="mgr-topbar-actions">
            <button
              type="button"
              className="mgr-topbar-avatar-btn"
              onClick={() => setProfileOpen(true)}
              title="Personal profile"
              aria-label="Open personal profile"
            >
              {resolveAvatarUrl(API_BASE, user?.avatarUrl) ? (
                <img
                  className="mgr-topbar-avatar"
                  src={resolveAvatarUrl(API_BASE, user?.avatarUrl)}
                  alt=""
                />
              ) : (
                <span className="mgr-topbar-avatar mgr-topbar-avatar--fallback" aria-hidden>
                  {(user?.name || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </button>
            <span style={{ fontSize: 13, color: '#64748b' }}>{user?.email}</span>
            <button type="button" className="mgr-btn-logout" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>
        <main className="mgr-content">
          <Outlet />
        </main>
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
