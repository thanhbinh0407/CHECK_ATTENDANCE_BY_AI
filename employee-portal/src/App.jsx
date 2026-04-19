import { useState, useEffect, useCallback } from "react";
import EmployeeDashboard from "./components/EmployeeDashboard.jsx";
import AttendanceHistory from "./components/AttendanceHistory.jsx";
import SalaryHistory from "./components/SalaryHistory.jsx";
import JobHistoryTimeline from "./components/JobHistoryTimeline.jsx";
import LeaveRequest from "./components/LeaveRequest.jsx";
import Qualifications from "./components/Qualifications.jsx";
import Dependents from "./components/Dependents.jsx";
import ApprovalManagement from "./components/ApprovalManagement.jsx";
import SalaryRulesManagement from "./components/SalaryRulesManagement.jsx";
import SalaryAdvanceRequest from "./components/SalaryAdvanceRequest.jsx";
import OvertimeRequest from "./components/OvertimeRequest.jsx";
import BusinessTripRequest from "./components/BusinessTripRequest.jsx";
import ChangePassword from "./components/ChangePassword.jsx";
import PersonalProfileModal from "./components/PersonalProfileModal.jsx";
import "./App.css";

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
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  });
  const [activeTab, setActiveTab] = useState("dashboard");
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
          setAuthToken(token);
          setUser(JSON.parse(userData));
        }
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

  const handleLoginSuccess = (token, userData) => {
    setAuthToken(token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setAuthToken(null);
    setUser(null);
    setActiveTab("attendance");
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

  // Show loading while checking
  if (isChecking) {
    return null;
  }

  if (!authToken || !user) {
    return null; // Return null while redirecting
  }

  const headerStyle = {
    background: "linear-gradient(135deg, #A2B9ED 0%, #8BA3E0 100%)",
    color: "#fff",
    padding: "20px 24px",
    boxShadow: "0 4px 12px rgba(162, 185, 237, 0.3)"
  };

  const headerContentStyle = {
    maxWidth: "1400px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  };

  const tabsStyle = {
    maxWidth: "1400px",
    margin: "0 auto",
    display: "flex",
    flexWrap: "nowrap",
    overflowX: "auto",
    overflowY: "hidden",
    gap: "6px",
    rowGap: "8px",
    backgroundColor: "#fff",
    borderBottom: "2px solid #e8eaf6",
    padding: "10px 16px 12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    alignItems: "center",
    // smooth horizontal scroll across browsers
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(162,185,237,0.7) transparent",
  };

  const tabStyle = (active) => ({
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.45px",
    border: "none",
    borderBottom: active ? "3px solid #A2B9ED" : "3px solid transparent",
    color: active ? "#A2B9ED" : "#666",
    background: active
      ? "linear-gradient(135deg, rgba(162, 185, 237, 0.12) 0%, rgba(139, 163, 224, 0.12) 100%)"
      : "transparent",
    transition: "all 0.2s ease",
    outline: "none",
    borderRadius: "8px",
    flex: "0 0 auto",
    whiteSpace: "nowrap",
    minHeight: "40px",
    boxSizing: "border-box",
  });

  const handleTabHover = (e, isActive) => {
    if (!isActive) {
      e.target.style.background = "linear-gradient(135deg, rgba(162, 185, 237, 0.06) 0%, rgba(139, 163, 224, 0.06) 100%)";
      e.target.style.color = "#A2B9ED";
      e.target.style.transform = "translateY(-1px)";
    }
  };

  const handleTabLeave = (e, isActive) => {
    if (!isActive) {
      e.target.style.background = "transparent";
      e.target.style.color = "#666";
      e.target.style.transform = "translateY(0)";
    }
  };

  const contentStyle = {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "32px 24px",
    backgroundColor: "#f8f9fa"
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={headerContentStyle}>
          <div>
            <h1 style={{ 
              fontSize: "24px", 
              fontWeight: "700", 
              margin: "0 0 4px 0",
              letterSpacing: "0.5px"
            }}>
              EMPLOYEE PORTAL
            </h1>
            <p style={{ 
              margin: 0, 
              fontSize: "13px", 
              opacity: 0.9,
              fontWeight: "400"
            }}>
              Attendance & Payroll Management System
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              title="Personal profile"
              aria-label="Open personal profile"
              style={{
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: "transparent",
                borderRadius: "50%",
                flexShrink: 0,
              }}
            >
              {portalAvatarSrc(API_BASE, user?.avatarUrl) ? (
                <img
                  src={portalAvatarSrc(API_BASE, user?.avatarUrl)}
                  alt=""
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid rgba(255,255,255,0.85)",
                    display: "block",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.25)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 16,
                    border: "2px solid rgba(255,255,255,0.85)",
                    boxSizing: "border-box",
                  }}
                  aria-hidden
                >
                  {(user?.name || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </button>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: "600", fontSize: "15px" }}>{user?.name}</div>
              <div style={{ fontSize: "12px", opacity: 0.85 }}>{user?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: "10px 24px",
                backgroundColor: "#dc3545",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#c82333";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#dc3545";
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Tabs — wrap + cuộn ngang khi hẹp, tránh tràn một hàng */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", backgroundColor: "#fff" }}>
        <div style={tabsStyle}>
        <button
          onClick={() => setActiveTab("dashboard")}
          style={tabStyle(activeTab === "dashboard")}
          onMouseEnter={(e) => handleTabHover(e, activeTab === "dashboard")}
          onMouseLeave={(e) => handleTabLeave(e, activeTab === "dashboard")}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          style={tabStyle(activeTab === "attendance")}
          onMouseEnter={(e) => handleTabHover(e, activeTab === "attendance")}
          onMouseLeave={(e) => handleTabLeave(e, activeTab === "attendance")}
        >
          Attendance
        </button>
        <button
          onClick={() => setActiveTab("salary")}
          style={tabStyle(activeTab === "salary")}
          onMouseEnter={(e) => handleTabHover(e, activeTab === "salary")}
          onMouseLeave={(e) => handleTabLeave(e, activeTab === "salary")}
        >
          Salary
        </button>
        <button
          onClick={() => setActiveTab("job-history")}
          style={tabStyle(activeTab === "job-history")}
          onMouseEnter={(e) => handleTabHover(e, activeTab === "job-history")}
          onMouseLeave={(e) => handleTabLeave(e, activeTab === "job-history")}
        >
          Job History
        </button>
        <button
          onClick={() => setActiveTab("leave")}
          style={tabStyle(activeTab === "leave")}
          onMouseEnter={(e) => handleTabHover(e, activeTab === "leave")}
          onMouseLeave={(e) => handleTabLeave(e, activeTab === "leave")}
        >
          Leave Request
        </button>
        <button
          onClick={() => setActiveTab("qualifications")}
          style={tabStyle(activeTab === "qualifications")}
          onMouseEnter={(e) => handleTabHover(e, activeTab === "qualifications")}
          onMouseLeave={(e) => handleTabLeave(e, activeTab === "qualifications")}
        >
          Qualifications
        </button>
        <button
          onClick={() => setActiveTab("dependents")}
          style={tabStyle(activeTab === "dependents")}
          onMouseEnter={(e) => handleTabHover(e, activeTab === "dependents")}
          onMouseLeave={(e) => handleTabLeave(e, activeTab === "dependents")}
        >
          Dependents
        </button>
        <button
          onClick={() => setActiveTab("salary-advance")}
          style={tabStyle(activeTab === "salary-advance")}
          onMouseEnter={(e) => handleTabHover(e, activeTab === "salary-advance")}
          onMouseLeave={(e) => handleTabLeave(e, activeTab === "salary-advance")}
        >
          Salary Advance
        </button>
        <button
          onClick={() => setActiveTab("overtime")}
          style={tabStyle(activeTab === "overtime")}
          onMouseEnter={(e) => handleTabHover(e, activeTab === "overtime")}
          onMouseLeave={(e) => handleTabLeave(e, activeTab === "overtime")}
        >
          Overtime
        </button>
        <button
          onClick={() => setActiveTab("business-trip")}
          style={tabStyle(activeTab === "business-trip")}
          onMouseEnter={(e) => handleTabHover(e, activeTab === "business-trip")}
          onMouseLeave={(e) => handleTabLeave(e, activeTab === "business-trip")}
        >
          Business Trip
        </button>
        <button
          onClick={() => setActiveTab("account")}
          style={tabStyle(activeTab === "account")}
          onMouseEnter={(e) => handleTabHover(e, activeTab === "account")}
          onMouseLeave={(e) => handleTabLeave(e, activeTab === "account")}
        >
          Account
        </button>
        {user?.role === "admin" && (
          <>
            <button
              onClick={() => setActiveTab("approval")}
              style={tabStyle(activeTab === "approval")}
              onMouseEnter={(e) => handleTabHover(e, activeTab === "approval")}
              onMouseLeave={(e) => handleTabLeave(e, activeTab === "approval")}
            >
              Approval
            </button>
            <button
              onClick={() => setActiveTab("rules")}
              style={tabStyle(activeTab === "rules")}
              onMouseEnter={(e) => handleTabHover(e, activeTab === "rules")}
              onMouseLeave={(e) => handleTabLeave(e, activeTab === "rules")}
            >
              Salary Rules
            </button>
          </>
        )}
        </div>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {activeTab === "dashboard" && (
          <EmployeeDashboard userId={user?.id} userName={user?.name} onNavigate={setActiveTab} />
        )}
        {activeTab === "attendance" && <AttendanceHistory userId={user?.id} />}
        {activeTab === "salary" && <SalaryHistory userId={user?.id} isActive={true} />}
        {activeTab === "job-history" && <JobHistoryTimeline />}
        {activeTab === "leave" && <LeaveRequest userId={user?.id} />}
        {activeTab === "qualifications" && <Qualifications userId={user?.id} />}
        {activeTab === "dependents" && <Dependents userId={user?.id} />}
        {activeTab === "salary-advance" && <SalaryAdvanceRequest userId={user?.id} />}
        {activeTab === "overtime" && <OvertimeRequest userId={user?.id || user?.userId} />}
        {activeTab === "business-trip" && <BusinessTripRequest userId={user?.id} />}
        {activeTab === "account" && <ChangePassword />}
        {activeTab === "approval" && user?.role === "admin" && <ApprovalManagement />}
        {activeTab === "rules" && user?.role === "admin" && <SalaryRulesManagement />}
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

