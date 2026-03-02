import { useState, useEffect } from "react";
import EnrollmentForm from "./components/EnrollmentForm.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import ShiftAdmin from "./components/ShiftAdmin.jsx";
import AttendanceLog from "./components/AttendanceLog.jsx";
import SalaryManagement from "./components/SalaryManagement.jsx";
import LeaveManagement from "./components/LeaveManagement.jsx";
import AnalyticsDashboard from "./components/AnalyticsDashboard.jsx";
import DepartmentManagement from "./components/DepartmentManagement.jsx";
import JobTitleManagement from "./components/JobTitleManagement.jsx";
import ApprovalManagement from "./components/ApprovalManagement.jsx";
import DocumentManagement from "./components/DocumentManagement.jsx";
import OvertimeManagement from "./components/OvertimeManagement.jsx";
import BusinessTripManagement from "./components/BusinessTripManagement.jsx";
import SalaryAdvanceManagement from "./components/SalaryAdvanceManagement.jsx";
import SalaryGradeManagement from "./components/SalaryGradeManagement.jsx";
import InsuranceConfigManagement from "./components/InsuranceConfigManagement.jsx";
import InsuranceFormTK1TS from "./components/InsuranceFormTK1TS.jsx";
import InsuranceFormD02LT from "./components/InsuranceFormD02LT.jsx";
import ReportsDashboard from "./components/ReportsDashboard.jsx";
import { theme, commonStyles } from "./styles/theme.js";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [approvalCount, setApprovalCount] = useState(0);
  
  // Use lazy initialization to read from localStorage only once on mount
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

  useEffect(() => {
    // Check URL parameters first (from login portal redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const userFromUrl = urlParams.get('user');
    
    console.log('[AUTH] Checking authentication...', { tokenFromUrl: !!tokenFromUrl, userFromUrl: !!userFromUrl });
    
    if (tokenFromUrl && userFromUrl) {
      try {
        const decodedToken = decodeURIComponent(tokenFromUrl);
        const decodedUser = JSON.parse(decodeURIComponent(userFromUrl));
        console.log('[AUTH] Token and user found in URL, saving to localStorage');
        // Save to localStorage
        localStorage.setItem('authToken', decodedToken);
        localStorage.setItem('user', JSON.stringify(decodedUser));
        setAuthToken(decodedToken);
        setUser(decodedUser);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsChecking(false);
        console.log('[AUTH] Authentication successful from URL params');
        return;
      } catch (error) {
        console.error("[AUTH] Error parsing token/user from URL:", error);
      }
    }
    
    // Fallback to localStorage
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setAuthToken(token);
        setUser(parsedUser);
        console.log('[AUTH] Authentication found in localStorage');
      } catch (error) {
        console.error("[AUTH] Error parsing user data:", error);
      }
    } else {
      console.log('[AUTH] No authentication found, redirecting to login portal');
      // Redirect to login portal if no auth found
      window.location.href = "http://localhost:3000/";
      return;
    }
    setIsChecking(false);
  }, []);

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
    // Redirect to login portal
    window.location.href = "http://localhost:3000/";
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!authToken) return;

    const handleKeyPress = (e) => {
      // Ctrl/Cmd + number shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const num = parseInt(e.key);
        if (num >= 0 && num <= 9) {
          e.preventDefault();
          const tabs = ["enrollment", "dashboard", "logs", "shifts", "salary", "leave", "approvals", "departments", "job-titles", "analytics"];
          const tabIndex = num === 0 ? 9 : num - 1;
          if (tabs[tabIndex] && user?.role === "admin") {
            setActiveTab(tabs[tabIndex]);
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

  // Redirect to login portal if not authenticated (only after checking is complete)
  useEffect(() => {
    if (!isChecking && !authToken && !user) {
      console.log('[AUTH] No authentication found after check, redirecting to login portal');
      window.location.href = "http://localhost:3000/";
    }
  }, [isChecking, authToken, user]);

  // Fetch approval counts
  useEffect(() => {
    if (!authToken || !user) return;

    const fetchApprovalCounts = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
        const headers = { "Authorization": `Bearer ${authToken}` };

        // Fetch all pending approvals
        const [leaveRes, dependentsRes, qualificationsRes] = await Promise.all([
          fetch(`${apiBase}/api/leave/requests?status=pending`, { headers }),
          fetch(`${apiBase}/api/dependents?approvalStatus=pending`, { headers }),
          fetch(`${apiBase}/api/qualifications?approvalStatus=pending`, { headers })
        ]);

        const [leaveData, dependentsData, qualificationsData] = await Promise.all([
          leaveRes.ok ? leaveRes.json() : { leaveRequests: [] },
          dependentsRes.ok ? dependentsRes.json() : { dependents: [] },
          qualificationsRes.ok ? qualificationsRes.json() : { qualifications: [] }
        ]);

        const totalCount = 
          (leaveData.leaveRequests?.length || 0) +
          (dependentsData.dependents?.length || 0) +
          (qualificationsData.qualifications?.length || 0);

        setApprovalCount(totalCount);
      } catch (error) {
        console.error('Error fetching approval counts:', error);
      }
    };

    fetchApprovalCounts();
    
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchApprovalCounts, 30000);
    return () => clearInterval(interval);
  }, [authToken, user]);

  // Show loading while checking
  if (isChecking) {
    return null;
  }

  if (!authToken || !user) {
    return null; // Return null while redirecting
  }

  const navigationItems = [
    { id: "enrollment", label: "Enroll Employee", shortcut: "1", icon: "👤" },
    { id: "dashboard", label: "Employee Management", shortcut: "2", icon: "👥" },
    { id: "logs", label: "Attendance History", shortcut: "3", icon: "📋" },
    { id: "shifts", label: "Work Schedule", shortcut: "4", icon: "🕐" },
    { id: "salary", label: "Payroll Management", shortcut: "5", icon: "💰" },
    { id: "leave", label: "Leave Management", shortcut: "6", icon: "🏖️" },
    { id: "approvals", label: "Approval Management", shortcut: "7", icon: "✅" },
    { id: "departments", label: "Department Management", shortcut: "8", icon: "🏢" },
    { id: "job-titles", label: "Job Title Management", shortcut: "9", icon: "💼" },
    { id: "analytics", label: "Analytics Dashboard", shortcut: "0", icon: "📈" },
    { id: "documents", label: "Document Management", shortcut: "", icon: "📄" },
    { id: "overtime", label: "Overtime Requests", shortcut: "", icon: "⏱️" },
    { id: "business-trips", label: "Business Trip Requests", shortcut: "", icon: "🧳" },
    { id: "salary-advances", label: "Salary Advances", shortcut: "", icon: "💸" },
    { id: "salary-grades", label: "Salary Grade Management", shortcut: "", icon: "💰" },
    { id: "insurance-configs", label: "Insurance & Cost Config", shortcut: "", icon: "🛡️" },
    { id: "insurance-form", label: "BHXH/BHYT Form (TK1-TS)", shortcut: "", icon: "📋" },
    { id: "insurance-report", label: "D02-LT Report", shortcut: "", icon: "📊" },
    { id: "reports", label: "Reporting", shortcut: "", icon: "📈" },
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

  const getNavItemStyle = (itemId) => {
    const isActive = activeTab === itemId;
    return {
      ...commonStyles.sidebarItem,
      ...(isActive ? {
        ...commonStyles.sidebarItemActive,
        backgroundColor: "#f0f9ff",
        color: "#667eea",
        fontWeight: "700",
        borderLeft: "4px solid #667eea",
        boxShadow: "0 4px 12px rgba(102, 126, 234, 0.15)",
        transform: "translateX(4px)",
        position: "relative",
      } : {}),
      justifyContent: sidebarCollapsed ? "center" : "flex-start",
      padding: sidebarCollapsed ? theme.spacing.md : `${theme.spacing.md} ${theme.spacing.lg}`,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    };
  };

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
          {user?.role === "admin" && navigationItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
            <div
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={getNavItemStyle(item.id)}
              title={item.shortcut ? (sidebarCollapsed ? `${item.label} (Ctrl+${item.shortcut})` : `Ctrl+${item.shortcut}`) : item.label}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = theme.neutral.gray100;
                  e.currentTarget.style.color = theme.primary.main;
                  e.currentTarget.style.transform = "translateX(2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = theme.neutral.gray700;
                  e.currentTarget.style.transform = "translateX(0)";
                }
              }}
            >
              {!sidebarCollapsed && (
                <>
                  <span style={{ 
                    marginRight: theme.spacing.sm,
                    fontSize: "18px"
                  }}>
                    {item.icon || "•"}
                  </span>
                  <span style={{ 
                    flex: 1, 
                    fontWeight: activeTab === item.id ? "700" : "500",
                    color: activeTab === item.id ? "#667eea" : "inherit"
                  }}>
                    {item.label}
                  </span>
                  {item.id === "approvals" && approvalCount > 0 && (
                    <span style={{ 
                      fontSize: "11px",
                      color: "#fff",
                      backgroundColor: "#ef4444",
                      padding: "3px 7px",
                      borderRadius: "10px",
                      fontWeight: "700",
                      marginLeft: theme.spacing.xs,
                      marginRight: theme.spacing.xs,
                      minWidth: "20px",
                      textAlign: "center",
                      boxShadow: "0 2px 4px rgba(239, 68, 68, 0.3)"
                    }}>
                      {approvalCount}
                    </span>
                  )}
                  {item.shortcut ? (
                    <span style={{ 
                      fontSize: theme.typography.tiny.fontSize, 
                      color: activeTab === item.id ? "#667eea" : theme.neutral.gray400,
                      backgroundColor: activeTab === item.id ? "#e0e7ff" : theme.neutral.gray100,
                      padding: `4px ${theme.spacing.xs}`,
                      borderRadius: theme.radius.sm,
                      fontWeight: activeTab === item.id ? "700" : "500",
                      border: activeTab === item.id ? "1px solid #667eea" : "none",
                      transition: "all 0.2s"
                    }}>
                      {item.shortcut}
                    </span>
                  ) : null}
                </>
              )}
              {sidebarCollapsed && (
                <span style={{ fontSize: "20px", position: "relative" }}>
                  {item.icon || "•"}
                  {item.id === "approvals" && approvalCount > 0 && (
                    <span style={{ 
                      position: "absolute",
                      top: "-6px",
                      right: "-6px",
                      fontSize: "9px",
                      color: "#fff",
                      backgroundColor: "#ef4444",
                      padding: "2px 5px",
                      borderRadius: "8px",
                      fontWeight: "700",
                      minWidth: "16px",
                      textAlign: "center",
                      boxShadow: "0 2px 4px rgba(239, 68, 68, 0.3)"
                    }}>
                      {approvalCount}
                    </span>
                  )}
                </span>
              )}
            </div>
            );
          })}
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
                {user?.role === "admin" ? "Admin" : "Employee"}
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
              {sidebarCollapsed ? "" : ` Attendance Management System`}
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
              Logout
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
        {activeTab === "approvals" && user?.role === "admin" && <ApprovalManagement />}
        {activeTab === "departments" && user?.role === "admin" && <DepartmentManagement />}
        {activeTab === "job-titles" && user?.role === "admin" && <JobTitleManagement />}
        {activeTab === "analytics" && user?.role === "admin" && <AnalyticsDashboard />}
        {activeTab === "documents" && user?.role === "admin" && <DocumentManagement />}
        {activeTab === "overtime" && user?.role === "admin" && <OvertimeManagement />}
        {activeTab === "business-trips" && user?.role === "admin" && <BusinessTripManagement />}
        {activeTab === "salary-advances" && user?.role === "admin" && <SalaryAdvanceManagement />}
        {activeTab === "salary-grades" && user?.role === "admin" && <SalaryGradeManagement />}
        {activeTab === "insurance-configs" && user?.role === "admin" && <InsuranceConfigManagement />}
        {activeTab === "insurance-form" && user?.role === "admin" && <InsuranceFormTK1TS />}
        {activeTab === "insurance-report" && user?.role === "admin" && <InsuranceFormD02LT />}
        {activeTab === "reports" && user?.role === "admin" && <ReportsDashboard />}
      </div>
      </main>
    </div>
  );
}

export default App;
