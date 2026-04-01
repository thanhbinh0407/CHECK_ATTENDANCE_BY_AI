import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import './managerShell.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const NAV_GROUPS = [
  {
    label: 'Tổng quan',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: '📊' }],
  },
  {
    label: 'Nhân sự & tài khoản',
    items: [
      { to: '/employees', label: 'Hồ sơ nhân viên', icon: '👥' },
      { to: '/users', label: 'Tài khoản & phân quyền', icon: '🔐' },
    ],
  },
  {
    label: 'Tổ chức',
    items: [
      { to: '/departments', label: 'Phòng ban', icon: '🏢' },
      { to: '/job-titles', label: 'Chức danh', icon: '📋' },
      { to: '/shifts', label: 'Ca làm việc', icon: '🕐' },
    ],
  },
  {
    label: 'Chấm công',
    items: [
      { to: '/camera', label: 'Kiosk nhận diện', icon: '📷' },
      { to: '/attendance-logs', label: 'Nhật ký chấm công', icon: '📅' },
    ],
  },
  {
    label: 'Đơn từ',
    items: [
      { to: '/leave', label: 'Nghỉ phép', icon: '🏖️' },
      { to: '/overtime', label: 'Tăng ca', icon: '⏱️' },
      { to: '/business-trips', label: 'Công tác', icon: '✈️' },
      { to: '/salary-advances', label: 'Tạm ứng lương', icon: '💵' },
      { to: '/approvals', label: 'Luồng duyệt (HR)', icon: '✅' },
    ],
  },
  {
    label: 'Lương & BH',
    items: [
      { to: '/salary', label: 'Quản lý lương', icon: '💰' },
      { to: '/salary-admin', label: 'Lương (admin)', icon: '📑' },
      { to: '/salary-calc', label: 'Tính lương', icon: '🧮' },
      { to: '/salary-grades', label: 'Cấp bậc lương', icon: '📈' },
      { to: '/insurance-config', label: 'Cấu hình BH', icon: '🏥' },
      { to: '/insurance-d02', label: 'D02-LT', icon: '📄' },
      { to: '/insurance-tk1', label: 'TK1-TS', icon: '📝' },
    ],
  },
  {
    label: 'Báo cáo',
    items: [
      { to: '/reports', label: 'Báo cáo', icon: '📊' },
      { to: '/analytics', label: 'Phân tích', icon: '📉' },
    ],
  },
  {
    label: 'Hồ sơ & tài liệu',
    items: [
      { to: '/documents', label: 'Tài liệu', icon: '📎' },
      { to: '/dependents', label: 'Người phụ thuộc', icon: '👨‍👩‍👧' },
      { to: '/qualifications', label: 'Bằng cấp / CC', icon: '🎓' },
    ],
  },
  {
    label: 'Khác',
    items: [{ to: '/enrollment', label: 'Đăng ký khuôn mặt', icon: '🪪' }],
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

export default function ManagerLayout() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

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
    if (token && !raw) {
      fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.status === 'success' && data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
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
    return <div className="mgr-loading">Đang kiểm tra phiên đăng nhập…</div>;
  }

  if (!user) {
    return <div className="mgr-loading">Đang tải thông tin tài khoản…</div>;
  }

  if (user.role !== 'manager') {
    return <div className="mgr-loading">Đang chuyển hướng…</div>;
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
              <div>Giám đốc / Manager</div>
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
            <span style={{ fontSize: 13, color: '#64748b' }}>{user?.email}</span>
            <button type="button" className="mgr-btn-logout" onClick={logout}>
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="mgr-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
