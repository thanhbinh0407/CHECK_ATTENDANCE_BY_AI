import { useState, useEffect } from "react";
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
import "./App.css";

function App() {
  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem("authToken");
  });
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  });
  const [activeTab, setActiveTab] = useState("attendance");
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
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      setAuthToken(token);
      setUser(JSON.parse(userData));
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
    gap: "2px",
    backgroundColor: "#fff",
    borderBottom: "2px solid #e8eaf6",
    padding: "0 24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  };

  const tabStyle = (active) => ({
    padding: "16px 28px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    border: "none",
    borderBottom: active ? "3px solid #A2B9ED" : "3px solid transparent",
    color: active ? "#A2B9ED" : "#666",
    background: active 
      ? "linear-gradient(135deg, rgba(162, 185, 237, 0.12) 0%, rgba(139, 163, 224, 0.12) 100%)" 
      : "transparent",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    outline: "none",
    position: "relative",
    borderRadius: active ? "8px 8px 0 0" : "0",
    transform: active ? "translateY(-2px)" : "translateY(0)",
    boxShadow: active ? "0 4px 12px rgba(162, 185, 237, 0.15)" : "none"
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
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
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

      {/* Tabs */}
      <div style={tabsStyle}>
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

      {/* Content */}
      <div style={contentStyle}>
        {activeTab === "attendance" && <AttendanceHistory userId={user?.id} />}
        {activeTab === "salary" && <SalaryHistory userId={user?.id} />}
        {activeTab === "leave" && <LeaveRequest userId={user?.id} />}
        {activeTab === "qualifications" && <Qualifications userId={user?.id} />}
        {activeTab === "dependents" && <Dependents userId={user?.id} />}
        {activeTab === "salary-advance" && <SalaryAdvanceRequest userId={user?.id} />}
        {activeTab === "overtime" && <OvertimeRequest userId={user?.id || user?.userId} />}
        {activeTab === "business-trip" && <BusinessTripRequest userId={user?.id} />}
        {activeTab === "approval" && user?.role === "admin" && <ApprovalManagement />}
        {activeTab === "rules" && user?.role === "admin" && <SalaryRulesManagement />}
      </div>
    </div>
  );
}

export default App;

