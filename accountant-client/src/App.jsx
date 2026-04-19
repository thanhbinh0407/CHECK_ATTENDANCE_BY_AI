import { useState, useEffect, useCallback } from "react";
import AccountantDashboard from "./components/AccountantDashboard.jsx";
import SalaryManagement from "./components/SalaryManagement.jsx";
import SalaryCalculation from "./components/SalaryCalculation.jsx";
import SalaryApprovalDashboard from "./components/SalaryApprovalDashboard.jsx";
import SalaryRulesManagement from "./components/SalaryRulesManagement.jsx";
import EmployeeManagement from "./components/EmployeeManagement.jsx";
import SalaryGradeManagement from "./components/SalaryGradeManagement.jsx";
import InsuranceConfigManagement from "./components/InsuranceConfigManagement.jsx";
import D02LTReport from "./components/D02LTReport.jsx";
import TK1TSForm from "./components/TK1TSForm.jsx";
import RegulatoryExports from "./components/RegulatoryExports.jsx";
import { theme } from "./theme.js";
import socket from "./socket.js";
import "./App.css";
import "./accountantShell.css";
import PersonalProfileModal from "./components/PersonalProfileModal.jsx";
import { toastInfo } from "./lib/notify.jsx";

const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:5000").replace(/\/$/, "");

function portalAvatarSrc(apiBase, avatarUrl) {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  const base = (apiBase || "").replace(/\/$/, "");
  const path = avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`;
  return `${base}${path}`;
}

function App() {
  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem("authToken");
  });
  const [user, setUser] = useState(() => {
    try {
      const userData = localStorage.getItem("user");
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Error reading user from localStorage:", error);
      return null;
    }
  });
  const [currentView, setCurrentView] = useState("dashboard");
  const [isChecking, setIsChecking] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const patchSessionUser = useCallback((patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get("token");
        const userFromUrl = urlParams.get("user");

        if (tokenFromUrl && userFromUrl) {
          try {
            const decodedToken = decodeURIComponent(tokenFromUrl);
            const decodedUser = JSON.parse(decodeURIComponent(userFromUrl));
            localStorage.setItem("authToken", decodedToken);
            localStorage.setItem("user", JSON.stringify(decodedUser));
            setAuthToken(decodedToken);
            setUser(decodedUser);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          } catch (error) {
            console.error("Error parsing token/user from URL:", error);
          }
        }

        if (tokenFromUrl) {
          try {
            const decodedToken = decodeURIComponent(tokenFromUrl);
            localStorage.setItem("authToken", decodedToken);
            const res = await fetch(`${API_BASE}/api/auth/me`, {
              headers: { Authorization: `Bearer ${decodedToken}` },
            });
            const data = await res.json();
            if (data.status === "success" && data.user) {
              localStorage.setItem("user", JSON.stringify(data.user));
              setAuthToken(decodedToken);
              setUser(data.user);
              window.history.replaceState({}, document.title, window.location.pathname);
              return;
            }
          } catch (e) {
            console.error("auth/me from URL token:", e);
          }
        }

        const token = localStorage.getItem("authToken");
        const userData = localStorage.getItem("user");
        if (token && userData) {
          const user = JSON.parse(userData);
          setAuthToken(token);
          setUser(user);
        }
      } catch (error) {
        console.error("Error reading localStorage:", error);
        localStorage.clear();
      } finally {
        setIsChecking(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!authToken) return;
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "success" && data.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      })
      .catch(() => {});
  }, [authToken]);

  useEffect(() => {
    // Socket connection for real-time updates
    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('join-room', { room: 'admin' });
    });

    socket.on('attendance-update', (data) => {
      console.log('Real-time attendance update:', data);
      // Trigger refresh for salary calculations or approvals
    });

    socket.on('new-notification', (data) => {
      console.log('Real-time notification:', data);
      toastInfo(`New notification: ${data.title}`);
    });

    return () => {
      socket.off('connect');
      socket.off('attendance-update');
      socket.off('new-notification');
    };
  }, []);

  useEffect(() => {
    if (currentView === "approvals") setCurrentView("dashboard");
  }, [currentView]);

  useEffect(() => {
    if (currentView === "employee-details") setCurrentView("employee-management");
  }, [currentView]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setAuthToken(null);
    setUser(null);
    // Redirect to login portal
    window.location.href = "http://localhost:3000/";
  };

  // Redirect to login portal if not authenticated (only after checking localStorage)
  useEffect(() => {
    if (!isChecking) {
      const token = localStorage.getItem("authToken");
      const userData = localStorage.getItem("user");
      if (!token || !userData) {
        window.location.href = "http://localhost:3000/";
      }
    }
  }, [isChecking]);

  // Add global animations
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Main shell only: avoid opacity in "backwards" phase blocking clicks on tables/buttons */
      @keyframes accShellIn {
        from {
          transform: translateY(12px);
        }
        to {
          transform: translateY(0);
        }
      }
      
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(20px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
      
      @keyframes gradientShift {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }
      
      @keyframes shimmer {
        0% {
          background-position: -1000px 0;
        }
        100% {
          background-position: 1000px 0;
        }
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.98);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `;
    if (!document.head.querySelector('style[data-payroll-animations]')) {
      styleSheet.setAttribute('data-payroll-animations', 'true');
      document.head.appendChild(styleSheet);
    }
  }, []);

  // Show loading while checking
  if (isChecking) {
    return null;
  }

  if (!authToken || !user) {
    return null; // Return null while redirecting
  }

  const financeExtraRoles = ["admin", "accountant", "manager"];

  const navCore = [
    { id: "dashboard", label: "Overview", icon: "📊" },
    { id: "salary-calculation", label: "Salary calculation", icon: "💰" },
    { id: "salary-management", label: "Salary management", icon: "📋" },
    { id: "salary-approval", label: "Payroll approval", icon: "✅" },
  ];

  const navFinance = financeExtraRoles.includes(user?.role)
    ? [
        { id: "rules", label: "Salary rules", icon: "⚙️" },
        { id: "salary-grades", label: "Salary grades", icon: "📈" },
        { id: "insurance-config", label: "Insurance settings", icon: "🏥" },
        { id: "d02-lt-report", label: "D02-LT report", icon: "📄" },
        { id: "tk1-ts-form", label: "TK1-TS form", icon: "📋" },
        { id: "regulatory-exports", label: "Annual tax (Excel)", icon: "🧾" },
      ]
    : [];

  const navPeople = [{ id: "employee-management", label: "Employees", icon: "🏢" }];

  const viewTitles = {
    dashboard: "Overview",
    "salary-calculation": "Salary calculation",
    "salary-management": "Salary management",
    "salary-approval": "Payroll approval",
    rules: "Salary rules",
    "salary-grades": "Salary grades",
    "insurance-config": "Insurance settings",
    "d02-lt-report": "D02-LT report",
    "tk1-ts-form": "TK1-TS form",
    "regulatory-exports": "Annual tax export",
    "employee-management": "Employees",
  };

  return (
    <div className="acc-app">
      <aside className="acc-sidebar" aria-label="Main navigation">
        <div className="acc-brand">
          <div className="acc-brand-mark" aria-hidden>
            💼
          </div>
          <div className="acc-brand-title">Payroll &amp; statutory insurance</div>
          <div className="acc-brand-sub">Accountant · Dashboard</div>
        </div>
        <nav className="acc-nav">
          <div className="acc-nav-label">Salary &amp; payroll</div>
          {navCore.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`acc-nav-item${currentView === item.id ? " acc-nav-item--active" : ""}`}
              onClick={() => setCurrentView(item.id)}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </button>
          ))}
          {navFinance.length > 0 && (
            <>
              <div className="acc-nav-label">Compliance &amp; configuration</div>
              {navFinance.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`acc-nav-item${currentView === item.id ? " acc-nav-item--active" : ""}`}
                  onClick={() => setCurrentView(item.id)}
                >
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </>
          )}
          <div className="acc-nav-label">Human resources</div>
          {navPeople.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`acc-nav-item${currentView === item.id ? " acc-nav-item--active" : ""}`}
              onClick={() => setCurrentView(item.id)}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="acc-sidebar-footer">
          <strong>{user?.name || "Accountant"}</strong>
          <span style={{ opacity: 0.75 }}>{user?.email}</span>
          <span style={{ display: "block", marginTop: 6, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.6 }}>
            {user?.role || "accountant"}
          </span>
          <button type="button" className="acc-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="acc-main">
        <header className="acc-topbar">
          <h1>{viewTitles[currentView] || "Payroll"}</h1>
          <div className="acc-topbar-actions">
            <button
              type="button"
              className="portal-avatar-btn"
              onClick={() => setProfileOpen(true)}
              title="Hồ sơ cá nhân"
              aria-label="Mở hồ sơ cá nhân"
            >
              {portalAvatarSrc(API_BASE, user?.avatarUrl) ? (
                <img className="portal-avatar-img" src={portalAvatarSrc(API_BASE, user?.avatarUrl)} alt="" />
              ) : (
                <span className="portal-avatar-fallback" aria-hidden>
                  {(user?.name || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </button>
            <span className="acc-topbar-meta">
              {new Intl.DateTimeFormat("en-US", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(new Date())}
            </span>
          </div>
        </header>
        <div className="acc-content" style={{ animation: "accShellIn 0.45s ease-out" }}>
          {currentView === "dashboard" && <AccountantDashboard onNavigate={setCurrentView} />}
          {currentView === "salary-calculation" && <SalaryCalculation />}
          {currentView === "salary-management" && <SalaryManagement />}
          {currentView === "salary-approval" && <SalaryApprovalDashboard onNavigate={setCurrentView} />}
          {currentView === "rules" && <SalaryRulesManagement />}
          {currentView === "salary-grades" && <SalaryGradeManagement />}
          {currentView === "insurance-config" && <InsuranceConfigManagement />}
          {currentView === "d02-lt-report" && <D02LTReport />}
          {currentView === "tk1-ts-form" && <TK1TSForm />}
          {currentView === "regulatory-exports" && (
            <RegulatoryExports apiBase={API_BASE} token={authToken} />
          )}
          {currentView === "employee-management" && <EmployeeManagement />}
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

export default App;
