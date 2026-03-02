import { useState, useEffect } from "react";
import SalaryManagement from "./components/SalaryManagement.jsx";
import SalaryCalculation from "./components/SalaryCalculation.jsx";
import SalaryApprovalDashboard from "./components/SalaryApprovalDashboard.jsx";
import ApprovalManagement from "./components/ApprovalManagement.jsx";
import SalaryRulesManagement from "./components/SalaryRulesManagement.jsx";
import EmployeeDetailView from "./components/EmployeeDetailView.jsx";
import EmployeeManagement from "./components/EmployeeManagement.jsx";
import { theme } from "./theme.js";
import "./App.css";

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
  const [currentView, setCurrentView] = useState("salary-calculation");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check URL parameters first (from login portal redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const userFromUrl = urlParams.get('user');
    
    if (tokenFromUrl && userFromUrl) {
      try {
        const decodedToken = decodeURIComponent(tokenFromUrl);
        const decodedUser = JSON.parse(decodeURIComponent(userFromUrl));
        // Save to localStorage
        localStorage.setItem('authToken', decodedToken);
        localStorage.setItem('user', JSON.stringify(decodedUser));
        setAuthToken(decodedToken);
        setUser(decodedUser);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsChecking(false);
        return;
      } catch (error) {
        console.error("Error parsing token/user from URL:", error);
      }
    }
    
    // Fallback to localStorage
    try {
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
    }
    setIsChecking(false);
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

  const headerStyle = {
    background: theme.primary.main,
    color: "#fff",
    padding: "16px 32px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
    position: "sticky",
    top: 0,
    zIndex: 1000,
  };

  const headerContentStyle = {
    maxWidth: "1600px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const titleStyle = {
    fontSize: "22px",
    fontWeight: "700",
    margin: 0,
    letterSpacing: "-0.02em",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  };

  const userInfoStyle = {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  };

  const avatarStyle = {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
    fontSize: "16px",
    border: "1px solid rgba(255,255,255,0.25)",
  };

  const logoutButtonStyle = {
    padding: "10px 20px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "background 0.2s, border-color 0.2s",
  };

  const navStyle = {
    display: "flex",
    gap: "4px",
    marginBottom: "24px",
    backgroundColor: "#fff",
    padding: "6px",
    borderRadius: "10px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    border: "1px solid #e2e8f0",
    overflowX: "auto",
    animation: "fadeInUp 0.45s ease-out 0.05s backwards",
  };

  const navButtonStyle = (isActive) => ({
    padding: "12px 20px",
    background: isActive ? theme.accent.main : "transparent",
    color: isActive ? "#fff" : "#64748b",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: isActive ? "600" : "500",
    fontSize: "14px",
    transition: "background 0.25s ease, color 0.25s ease, transform 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    whiteSpace: "nowrap",
  });

  const navigationItems = [
    { id: "salary-calculation", label: "💰 Calculate Salary", icon: "💰" },
    { id: "salary-management", label: "📊 Salary Management", icon: "📊" },
    { id: "salary-approval", label: "✅ Approve Payroll", icon: "✅" },
    ...(user?.role === "admin" ? [
      { id: "approvals", label: "🆗 Approve Records", icon: "🆗" },
      { id: "rules", label: "⚙️ Salary Rules", icon: "⚙️" }
    ] : []),
    { id: "employee-details", label: "👤 Employee Info", icon: "👤" },
    { id: "employee-management", label: "🏢 Employee Management", icon: "🏢" }
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.colors.light,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    }}>
      {/* Modern Header */}
      <header style={headerStyle}>
        <div style={headerContentStyle}>
          <h1 style={titleStyle}>
            <span aria-hidden>💼</span>
            <span>Payroll Management System</span>
          </h1>
          <div style={userInfoStyle}>
            <div style={avatarStyle}>
              {user?.name?.charAt(0)?.toUpperCase() || "K"}
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "700" }}>
                {user?.name || "Accountant"}
              </div>
              <div style={{ fontSize: "13px", opacity: 0.9 }}>
                {user?.email || ""}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={logoutButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.2)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: "1600px",
        margin: "0 auto",
        padding: "32px",
        minHeight: "calc(100vh - 120px)"
      }}>
        {/* Modern Navigation */}
        <div style={navStyle}>
          {navigationItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                style={navButtonStyle(isActive)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "#f1f5f9";
                    e.currentTarget.style.color = "#334155";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#64748b";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div style={{ animation: "fadeInUp 0.45s ease-out 0.1s backwards" }}>
          {currentView === "salary-calculation" && <SalaryCalculation />}
          {currentView === "salary-management" && <SalaryManagement />}
          {currentView === "salary-approval" && <SalaryApprovalDashboard />}
          {currentView === "approvals" && <ApprovalManagement />}
          {currentView === "rules" && <SalaryRulesManagement />}
          {currentView === "employee-details" && <EmployeeDetailView />}
          {currentView === "employee-management" && <EmployeeManagement />}
        </div>
      </main>
    </div>
  );
}

export default App;
