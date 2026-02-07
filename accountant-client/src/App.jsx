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

  // Modern Header Styles - Blue Pink Mystical Theme
  const headerStyle = {
    background: "linear-gradient(135deg, #3b82f6 0%, #ec4899 50%, #f472b6 100%)",
    backgroundSize: "200% 200%",
    color: "#fff",
    padding: "24px 32px",
    boxShadow: "0 4px 30px rgba(59, 130, 246, 0.4), 0 0 60px rgba(236, 72, 153, 0.2)",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    animation: "fadeIn 0.5s ease-out, gradientShift 8s ease infinite"
  };

  const headerContentStyle = {
    maxWidth: "1600px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const titleStyle = {
    fontSize: "28px",
    fontWeight: "800",
    margin: 0,
    letterSpacing: "-0.02em",
    display: "flex",
    alignItems: "center",
    gap: "12px"
  };

  const userInfoStyle = {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  };

  const avatarStyle = {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(10px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "18px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    transition: "all 0.3s"
  };

  const logoutButtonStyle = {
    padding: "12px 24px",
    background: "rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(10px)",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "12px",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  // Modern Navigation Styles
  const navStyle = {
    display: "flex",
    gap: "8px",
    marginBottom: "32px",
    backgroundColor: "#fff",
    padding: "8px",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb",
    overflowX: "auto",
    animation: "fadeInUp 0.6s ease-out 0.1s backwards"
  };

  const navButtonStyle = (isActive) => ({
    padding: "14px 24px",
    backgroundColor: isActive ? "linear-gradient(135deg, #3b82f6, #ec4899)" : "transparent",
    background: isActive ? "linear-gradient(135deg, #3b82f6, #ec4899)" : "transparent",
    color: isActive ? "#fff" : "#6b7280",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: isActive ? "700" : "600",
    fontSize: "15px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: isActive ? "0 4px 20px rgba(59, 130, 246, 0.4), 0 0 20px rgba(236, 72, 153, 0.3)" : "none",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    whiteSpace: "nowrap",
    position: "relative"
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
      background: "linear-gradient(180deg, #f0f9ff 0%, #fdf2f8 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif"
    }}>
      {/* Modern Header */}
      <header style={headerStyle}>
        <div style={headerContentStyle}>
          <h1 style={titleStyle}>
            <span>💼</span>
            <span>Payroll Management System</span>
          </h1>
          <div style={userInfoStyle}>
            <div
              style={avatarStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              }}
            >
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
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
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
                    e.currentTarget.style.backgroundColor = "#e5e7eb";
                    e.currentTarget.style.color = "#374151";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#6b7280";
                  }
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Content Area - No nested divs */}
        <div style={{
          animation: "fadeInUp 0.5s ease-out"
        }}>
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
