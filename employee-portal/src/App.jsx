import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import EmployeeDashboard from "./components/EmployeeDashboard.jsx";
import AttendanceHistory from "./components/AttendanceHistory.jsx";
import SalaryHistory from "./components/SalaryHistory.jsx";
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
import socket from "./socket.js";
import { toastWarning } from "./lib/notify.jsx";
import "./App.css";

const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:5000").replace(/\/$/, "");

const INITIAL_PORTAL_REFRESH = {
  attendance: 0,
  leave: 0,
  qualification: 0,
  dependent: 0,
  salary_advance: 0,
  overtime: 0,
  business_trip: 0,
};

function portalAvatarSrc(apiBase, avatarUrl) {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  const base = (apiBase || "").replace(/\/$/, "");
  const path = avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`;
  return `${base}${path}`;
}

const CONTRACT_DURATION_MONTHS = {
  probation_3_month: 3,
  probation_6_month: 6,
  formal_1_year: 12,
  formal_2_year: 24,
  formal_3_year: 36,
};

function toLocalStartOfDay(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatPortalDate(value) {
  const date = toLocalStartOfDay(value);
  return date ? date.toLocaleDateString("en-US") : "-";
}

function getContractExpiryReminder(profile) {
  if (!profile?.contractType || !profile?.startDate) return null;
  if (["terminated", "resigned"].includes(String(profile.employmentStatus || "").toLowerCase())) {
    return null;
  }

  const months = CONTRACT_DURATION_MONTHS[profile.contractType];
  if (!months) return null;

  const startDate = toLocalStartOfDay(profile.startDate);
  if (!startDate) return null;

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + months);
  endDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
  if (daysLeft > 30) return null;

  const endDateLabel = endDate.toLocaleDateString("vi-VN");
  const message =
    daysLeft < 0
      ? `Your contract expired on ${endDateLabel}. Please contact HR to renew it.`
      : daysLeft === 0
        ? `Your contract expires today (${endDateLabel}). Please renew it now.`
        : `Your contract will expire in ${daysLeft} day(s) (${endDateLabel}). Please renew it.`;

  return {
    daysLeft,
    endDate,
    endDateKey: endDate.toISOString().slice(0, 10),
    endDateLabel,
    message,
  };
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
  const [portalRefresh, setPortalRefresh] = useState(() => ({ ...INITIAL_PORTAL_REFRESH }));
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [contractReminderOpen, setContractReminderOpen] = useState(false);
  const notificationRef = useRef(null);

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

  useEffect(() => {
    if (!authToken || String(user?.role || "").toLowerCase() !== "employee") {
      setEmployeeProfile(null);
      return;
    }

    let cancelled = false;
    fetch(`${API_BASE}/api/employee/profile`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || data.status !== "success" || !data.user) return;
        setEmployeeProfile(data.user);
        setUser((prev) => {
          if (!prev) return prev;
          const merged = { ...prev, ...data.user };
          localStorage.setItem("user", JSON.stringify(merged));
          return merged;
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [authToken, user?.role]);

  useEffect(() => {
    if (!authToken || !user?.id) return;

    const joinRoom = () => {
      socket.emit("join-room", { room: `user-${user.id}` });
    };

    const onPortalRefresh = (payload) => {
      const domain = payload?.domain;
      if (!domain || typeof domain !== "string") return;
      setPortalRefresh((prev) => {
        if (prev[domain] === undefined) return prev;
        return { ...prev, [domain]: prev[domain] + 1 };
      });
    };

    socket.on("connect", joinRoom);
    socket.on("portal-refresh", onPortalRefresh);
    socket.on("force-logout", handleLogout);
    socket.connect();
    if (socket.connected) joinRoom();

    return () => {
      socket.off("connect", joinRoom);
      socket.off("portal-refresh", onPortalRefresh);
      socket.off("force-logout", handleLogout);
      socket.disconnect();
    };
  }, [authToken, user?.id]);

  const contractReminder = useMemo(() => {
    return getContractExpiryReminder(employeeProfile || user);
  }, [employeeProfile, user]);

  useEffect(() => {
    if (!contractReminder || !user?.id) return;

    const storageKey = `contract-expiry-reminder:${user.id}:${contractReminder.endDateKey}`;
    if (localStorage.getItem(storageKey)) return;

    toastWarning(contractReminder.message);
    localStorage.setItem(storageKey, "1");
  }, [contractReminder, user?.id]);

  useEffect(() => {
    if (!contractReminderOpen) return;

    const onOutsideClick = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setContractReminderOpen(false);
      }
    };

    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [contractReminderOpen]);

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
            <div ref={notificationRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setContractReminderOpen((prev) => !prev)}
                aria-label="Contract reminders"
                title={contractReminder ? "Contract expiry reminder" : "No contract reminders"}
                style={{
                  border: "none",
                  background: "rgba(255,255,255,0.18)",
                  color: "#fff",
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  cursor: contractReminder ? "pointer" : "default",
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  boxShadow: contractReminder ? "0 0 0 2px rgba(255,255,255,0.15)" : "none",
                  opacity: contractReminder ? 1 : 0.8,
                }}
                disabled={!contractReminder}
              >
                🔔
                {contractReminder && (
                  <span
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -2,
                      minWidth: 18,
                      height: 18,
                      padding: "0 4px",
                      borderRadius: 999,
                      backgroundColor: contractReminder.daysLeft < 0 ? "#ef4444" : "#f97316",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid rgba(255,255,255,0.95)",
                      boxSizing: "border-box",
                    }}
                  >
                    1
                  </span>
                )}
              </button>
              {contractReminderOpen && contractReminder && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 12px)",
                    right: 0,
                    width: 320,
                    backgroundColor: "#fff",
                    color: "#111827",
                    borderRadius: 14,
                    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.18)",
                    border: "1px solid #e5e7eb",
                    padding: 16,
                    zIndex: 40,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: contractReminder.daysLeft < 0 ? "#dc2626" : "#f97316", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Contract reminder
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
                    {contractReminder.message}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
                    Contract end date: {formatPortalDate(contractReminder.endDate)}
                  </div>
                </div>
              )}
            </div>
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
        {user?.role !== "employee" && (
          <button
            onClick={() => setActiveTab("salary")}
            style={tabStyle(activeTab === "salary")}
            onMouseEnter={(e) => handleTabHover(e, activeTab === "salary")}
            onMouseLeave={(e) => handleTabLeave(e, activeTab === "salary")}
          >
            Salary
          </button>
        )}
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
        {user?.role !== "employee" && (
          <button
            onClick={() => setActiveTab("salary-advance")}
            style={tabStyle(activeTab === "salary-advance")}
            onMouseEnter={(e) => handleTabHover(e, activeTab === "salary-advance")}
            onMouseLeave={(e) => handleTabLeave(e, activeTab === "salary-advance")}
          >
            Salary Advance
          </button>
        )}
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
          <EmployeeDashboard userId={user?.id} userName={user?.name} userRole={user?.role} onNavigate={setActiveTab} />
        )}
        {activeTab === "attendance" && <AttendanceHistory userId={user?.id} refreshVersion={portalRefresh.attendance} />}
        {activeTab === "salary" && user?.role !== "employee" && <SalaryHistory userId={user?.id} isActive={true} />}
        {activeTab === "leave" && (
          <LeaveRequest userId={user?.id} refreshVersion={portalRefresh.leave} />
        )}
        {activeTab === "qualifications" && (
          <Qualifications userId={user?.id} refreshVersion={portalRefresh.qualification} />
        )}
        {activeTab === "dependents" && (
          <Dependents userId={user?.id} refreshVersion={portalRefresh.dependent} />
        )}
        {activeTab === "salary-advance" && user?.role !== "employee" && (
          <SalaryAdvanceRequest refreshVersion={portalRefresh.salary_advance} />
        )}
        {activeTab === "overtime" && (
          <OvertimeRequest userId={user?.id || user?.userId} refreshVersion={portalRefresh.overtime} />
        )}
        {activeTab === "business-trip" && (
          <BusinessTripRequest userId={user?.id} refreshVersion={portalRefresh.business_trip} />
        )}
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

