import { useState, useEffect } from "react";
import AccountantDashboard from "./components/AccountantDashboard.jsx";
import SalaryManagement from "./components/SalaryManagement.jsx";
import SalaryCalculation from "./components/SalaryCalculation.jsx";
import SalaryApprovalDashboard from "./components/SalaryApprovalDashboard.jsx";
import ApprovalManagement from "./components/ApprovalManagement.jsx";
import SalaryRulesManagement from "./components/SalaryRulesManagement.jsx";
import EmployeeDetailView from "./components/EmployeeDetailView.jsx";
import EmployeeManagement from "./components/EmployeeManagement.jsx";
import D02LTReport from "./components/D02LTReport.jsx";
import TK1TSForm from "./components/TK1TSForm.jsx";
import { theme } from "./theme.js";
import socket from "./socket.js";
import "./App.css";
import "./accountantShell.css";

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

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

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
            const res = await fetch(`${apiBase}/api/auth/me`, {
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
      alert(`New notification: ${data.title}`);
    });

    return () => {
      socket.off('connect');
      socket.off('attendance-update');
      socket.off('new-notification');
    };
  }, []);

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
    { id: "dashboard", label: "Tổng quan", icon: "📊" },
    { id: "salary-calculation", label: "Tính lương", icon: "💰" },
    { id: "salary-management", label: "Quản lý lương", icon: "📋" },
    { id: "salary-approval", label: "Duyệt payroll", icon: "✅" },
  ];

  const navFinance = financeExtraRoles.includes(user?.role)
    ? [
        { id: "approvals", label: "Duyệt hồ sơ liên quan", icon: "🆗" },
        { id: "rules", label: "Quy tắc lương", icon: "⚙️" },
        { id: "d02-lt-report", label: "Báo cáo D02-LT", icon: "📄" },
        { id: "tk1-ts-form", label: "Mẫu TK1-TS", icon: "🏥" },
      ]
    : [];

  const navPeople = [
    { id: "employee-details", label: "Thông tin nhân viên", icon: "👤" },
    { id: "employee-management", label: "Danh sách nhân viên", icon: "🏢" },
  ];

  const viewTitles = {
    dashboard: "Tổng quan",
    "salary-calculation": "Tính lương",
    "salary-management": "Quản lý lương",
    "salary-approval": "Duyệt payroll",
    approvals: "Duyệt hồ sơ",
    rules: "Quy tắc lương",
    "d02-lt-report": "Báo cáo D02-LT",
    "tk1-ts-form": "Mẫu TK1-TS",
    "employee-details": "Thông tin nhân viên",
    "employee-management": "Quản lý nhân viên",
  };

  return (
    <div className="acc-app">
      <aside className="acc-sidebar" aria-label="Điều hướng chính">
        <div className="acc-brand">
          <div className="acc-brand-mark" aria-hidden>
            💼
          </div>
          <div className="acc-brand-title">Payroll &amp; BHXH</div>
          <div className="acc-brand-sub">Kế toán · Dashboard</div>
        </div>
        <nav className="acc-nav">
          <div className="acc-nav-label">Lương &amp; payroll</div>
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
              <div className="acc-nav-label">Tuân thủ &amp; cấu hình</div>
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
          <div className="acc-nav-label">Nhân sự</div>
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
          <strong>{user?.name || "Kế toán viên"}</strong>
          <span style={{ opacity: 0.75 }}>{user?.email}</span>
          <span style={{ display: "block", marginTop: 6, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.6 }}>
            {user?.role || "accountant"}
          </span>
          <button type="button" className="acc-logout" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="acc-main">
        <header className="acc-topbar">
          <h1>{viewTitles[currentView] || "Payroll"}</h1>
          <span className="acc-topbar-meta">
            {new Intl.DateTimeFormat("vi-VN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date())}
          </span>
        </header>
        <div className="acc-content" style={{ animation: "fadeInUp 0.45s ease-out 0.05s backwards" }}>
          {currentView === "dashboard" && <AccountantDashboard onNavigate={setCurrentView} />}
          {currentView === "salary-calculation" && <SalaryCalculation />}
          {currentView === "salary-management" && <SalaryManagement />}
          {currentView === "salary-approval" && <SalaryApprovalDashboard />}
          {currentView === "approvals" && <ApprovalManagement />}
          {currentView === "rules" && <SalaryRulesManagement />}
          {currentView === "d02-lt-report" && <D02LTReport />}
          {currentView === "tk1-ts-form" && <TK1TSForm />}
          {currentView === "employee-details" && <EmployeeDetailView />}
          {currentView === "employee-management" && <EmployeeManagement />}
        </div>
      </div>
    </div>
  );
}

export default App;
