import { useState, useEffect } from "react";
import LoginForm from "./components/LoginForm.jsx";
import EnrollmentForm from "./components/EnrollmentForm.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import ShiftAdmin from "./components/ShiftAdmin.jsx";
import AttendanceLog from "./components/AttendanceLog.jsx";
import SalaryManagement from "./components/SalaryManagement.jsx";
import LeaveManagement from "./components/LeaveManagement.jsx";
import AnalyticsDashboard from "./components/AnalyticsDashboard.jsx";
import { theme, commonStyles } from "./styles/theme.js";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Use lazy initialization to read from localStorage only once on mount
  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem("authToken");
  });
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  });

  const handleLoginSuccess = (token, userData) => {
    setAuthToken(token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setAuthToken(null);
    setUser(null);
    setActiveTab("dashboard");
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!authToken) return;

    const handleKeyPress = (e) => {
      // Ctrl/Cmd + number shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 7) {
          e.preventDefault();
          const tabs = ["enrollment", "dashboard", "logs", "shifts", "salary", "leave", "analytics"];
          if (tabs[num - 1] && user?.role === "admin") {
            setActiveTab(tabs[num - 1]);
          }
        }
      }
      
      // Ctrl/Cmd + L for logout
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        handleLogout();
      }

      // Ctrl/Cmd + B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [authToken, user, sidebarCollapsed]);

  if (!authToken) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  const navigationItems = [
    { id: "enrollment", label: "Đăng ký nhân viên", shortcut: "1" },
    { id: "dashboard", label: "Quản lý nhân viên", shortcut: "2" },
    { id: "logs", label: "Lịch sử điểm danh", shortcut: "3" },
    { id: "shifts", label: "Ca làm việc", shortcut: "4" },
    { id: "salary", label: "Quản lý lương", shortcut: "5" },
    { id: "leave", label: "Nghỉ phép", shortcut: "6" },
    { id: "analytics", label: "Phân tích", shortcut: "7" },
  ];

  // Layout styles
  const appContainerStyle = {
    display: "flex",
    width: "100%",
    minHeight: "100vh",
    backgroundColor: theme.neutral.gray50,
    fontFamily: theme.typography.fontFamily,
  };

  const sidebarStyle = {
    width: sidebarCollapsed ? "80px" : "280px",
    backgroundColor: theme.neutral.white,
    borderRight: `1px solid ${theme.neutral.gray200}`,
    display: "flex",
    flexDirection: "column",
    transition: theme.transitions.slow,
    boxShadow: theme.shadows.sm,
    position: "sticky",
    top: 0,
    height: "100vh",
    overflowY: "auto",
    overflowX: "hidden",
  };

  const sidebarHeaderStyle = {
    padding: theme.spacing.xl,
    borderBottom: `1px solid ${theme.neutral.gray200}`,
    display: "flex",
    alignItems: "center",
    justifyContent: sidebarCollapsed ? "center" : "space-between",
    gap: theme.spacing.md,
  };

  const logoStyle = {
    fontSize: sidebarCollapsed ? "24px" : theme.typography.h4.fontSize,
    fontWeight: "800",
    background: theme.gradients.primary,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    display: sidebarCollapsed ? "block" : "block",
    textAlign: sidebarCollapsed ? "center" : "left",
  };

  const mainContentStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  const headerStyle = {
    backgroundColor: theme.neutral.white,
    borderBottom: `1px solid ${theme.neutral.gray200}`,
    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: theme.shadows.xs,
    position: "sticky",
    top: 0,
    zIndex: theme.zIndex.sticky,
  };

  const userInfoStyle = {
    display: "flex",
    gap: theme.spacing.md,
    alignItems: "center",
  };

  const contentAreaStyle = {
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing.xl,
  };

  const getNavItemStyle = (itemId) => ({
    ...commonStyles.sidebarItem,
    ...(activeTab === itemId ? commonStyles.sidebarItemActive : {}),
    justifyContent: sidebarCollapsed ? "center" : "flex-start",
    padding: sidebarCollapsed ? theme.spacing.md : `${theme.spacing.md} ${theme.spacing.lg}`,
  });

  return (
    <div style={appContainerStyle}>
      {/* Sidebar Navigation */}
      <aside style={sidebarStyle}>
        <div style={sidebarHeaderStyle}>
          {!sidebarCollapsed && (
            <div>
              <div style={logoStyle}>Face Recognition</div>
              <div style={{ fontSize: theme.typography.small.fontSize, color: theme.neutral.gray500, marginTop: theme.spacing.xs }}>
                Attendance System
              </div>
            </div>
          )}
          {sidebarCollapsed && <div style={logoStyle}>FR</div>}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              padding: theme.spacing.sm,
              border: "none",
              backgroundColor: "transparent",
              borderRadius: theme.radius.md,
              cursor: "pointer",
              color: theme.neutral.gray600,
              fontSize: "18px",
              transition: theme.transitions.normal,
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme.neutral.gray100;
              e.target.style.color = theme.primary.main;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = theme.neutral.gray600;
            }}
            title={sidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu (Ctrl+B)"}
          >
            {sidebarCollapsed ? "→" : "←"}
          </button>
        </div>

        <nav style={{ padding: theme.spacing.md, flex: 1 }}>
          {user?.role === "admin" && navigationItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={getNavItemStyle(item.id)}
              title={sidebarCollapsed ? `${item.label} (Ctrl+${item.shortcut})` : `Ctrl+${item.shortcut}`}
            >
              {!sidebarCollapsed && (
                <>
                  <span style={{ flex: 1, fontWeight: activeTab === item.id ? "600" : "500" }}>{item.label}</span>
                  <span style={{ 
                    fontSize: theme.typography.tiny.fontSize, 
                    color: theme.neutral.gray400,
                    backgroundColor: theme.neutral.gray100,
                    padding: `2px ${theme.spacing.xs}`,
                    borderRadius: theme.radius.sm,
                  }}>
                    {item.shortcut}
                  </span>
                </>
              )}
              {sidebarCollapsed && (
                <span style={{ fontSize: theme.typography.tiny.fontSize, color: theme.neutral.gray400 }}>
                  {item.shortcut}
                </span>
              )}
            </div>
          ))}
        </nav>

        {/* User section */}
        <div style={{ 
          padding: theme.spacing.md, 
          borderTop: `1px solid ${theme.neutral.gray200}`,
          display: "flex",
          flexDirection: sidebarCollapsed ? "column" : "row",
          alignItems: sidebarCollapsed ? "center" : "flex-start",
          gap: theme.spacing.md,
        }}>
          <div style={{
            width: sidebarCollapsed ? "40px" : "48px",
            height: sidebarCollapsed ? "40px" : "48px",
            borderRadius: theme.radius.full,
            background: theme.gradients.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme.neutral.white,
            fontWeight: "700",
            fontSize: sidebarCollapsed ? "16px" : "20px",
            flexShrink: 0,
          }}>
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          {!sidebarCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontSize: theme.typography.body.fontSize, 
                fontWeight: "600", 
                color: theme.neutral.gray900,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {user?.name || "User"}
              </div>
              <div style={{ 
                fontSize: theme.typography.small.fontSize, 
                color: theme.neutral.gray500,
              }}>
                {user?.role === "admin" ? "Quản trị viên" : "Nhân viên"}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={mainContentStyle}>
      {/* Header */}
        <header style={headerStyle}>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: theme.typography.h4.fontSize, 
              fontWeight: "700",
              color: theme.neutral.gray900,
            }}>
              {navigationItems.find(item => item.id === activeTab)?.label || "Dashboard"}
            </h1>
            <p style={{ 
              margin: `${theme.spacing.xs} 0 0 0`, 
              fontSize: theme.typography.small.fontSize, 
              color: theme.neutral.gray500 
            }}>
              {navigationItems.find(item => item.id === activeTab)?.icon} 
              {sidebarCollapsed ? "" : ` Quản lý hệ thống điểm danh`}
            </p>
          </div>
          <div style={userInfoStyle}>
            <button
              onClick={handleLogout}
              style={{
                padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                backgroundColor: theme.error.main,
                color: theme.neutral.white,
                border: "none",
                borderRadius: theme.radius.lg,
                cursor: "pointer",
                fontWeight: "600",
                fontSize: theme.typography.body.fontSize,
                transition: theme.transitions.normal,
                boxShadow: theme.shadows.sm,
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = theme.error.dark;
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = theme.shadows.md;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = theme.error.main;
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = theme.shadows.sm;
              }}
            >
              Đăng xuất
            </button>
          </div>
        </header>

      {/* Content */}
        <div style={contentAreaStyle}>
        {activeTab === "enrollment" && user?.role === "admin" && <EnrollmentForm />}
        {activeTab === "dashboard" && user?.role === "admin" && <AdminDashboard />}
        {activeTab === "logs" && user?.role === "admin" && <AttendanceLog />}
        {activeTab === "shifts" && user?.role === "admin" && <ShiftAdmin />}
        {activeTab === "salary" && user?.role === "admin" && <SalaryManagement />}
        {activeTab === "leave" && user?.role === "admin" && <LeaveManagement />}
        {activeTab === "analytics" && user?.role === "admin" && <AnalyticsDashboard />}
      </div>
      </main>
    </div>
  );
}

export default App;
