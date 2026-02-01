import { useState, useEffect } from "react";
import LoginForm from "./components/LoginForm.jsx";
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
  const [authToken, setAuthToken] = useState(null);
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState("salary-calculation");

  useEffect(() => {
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
  };

  if (!authToken || !user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  const headerStyle = {
    background: theme.primary.gradient,
    color: theme.neutral.white,
    padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
    boxShadow: theme.shadows.md,
  };

  const headerContentStyle = {
    maxWidth: "1400px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const titleStyle = {
    fontSize: "24px",
    fontWeight: "700",
    margin: 0,
  };

  const userInfoStyle = {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.md,
  };

  const avatarStyle = {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
    fontSize: "16px",
  };

  const logoutButtonStyle = {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    background: "rgba(255, 255, 255, 0.2)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: theme.radius.md,
    color: theme.neutral.white,
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s",
  };

  const navStyle = {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    borderBottom: `2px solid ${theme.colors.border}`,
    paddingBottom: "15px"
  };

  const navButtonStyle = (isActive) => ({
    padding: "10px 20px",
    backgroundColor: isActive ? theme.colors.primary : "transparent",
    color: isActive ? "white" : theme.colors.primary,
    border: "none",
    borderRadius: "5px 5px 0 0",
    cursor: "pointer",
    fontWeight: isActive ? "bold" : "normal",
    fontSize: "0.95em",
    transition: "all 0.3s ease"
  });

  return (
    <div className="app-container">
      <header style={headerStyle}>
        <div style={headerContentStyle}>
          <h1 style={titleStyle}>Payroll Management System</h1>
          <div style={userInfoStyle}>
            <div style={avatarStyle}>
              {user?.name?.charAt(0)?.toUpperCase() || "K"}
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "600" }}>
                {user?.name || "Accountant"}
              </div>
              <div style={{ fontSize: "12px", opacity: 0.9 }}>
                {user?.email || ""}
              </div>
            </div>
            <button onClick={handleLogout} style={logoutButtonStyle}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: theme.spacing.xl }}>
        <div style={navStyle}>
          <button
            onClick={() => setCurrentView("salary-calculation")}
            style={navButtonStyle(currentView === "salary-calculation")}
          >
            💰 Calculate Salary
          </button>
          <button
            onClick={() => setCurrentView("salary-management")}
            style={navButtonStyle(currentView === "salary-management")}
          >
            📊 Salary Management
          </button>
          <button
            onClick={() => setCurrentView("salary-approval")}
            style={navButtonStyle(currentView === "salary-approval")}
          >
            ✅ Approve Payroll
          </button>
          {user?.role === "admin" && (
            <button
              onClick={() => setCurrentView("approvals")}
              style={navButtonStyle(currentView === "approvals")}
            >
              🆗 Approve Records
            </button>
          )}
          {user?.role === "admin" && (
            <button
              onClick={() => setCurrentView("rules")}
              style={navButtonStyle(currentView === "rules")}
            >
              ⚙️ Salary Rules
            </button>
          )}
          <button
            onClick={() => setCurrentView("employee-details")}
            style={navButtonStyle(currentView === "employee-details")}
          >
            👤 Employee Info
          </button>
          <button
            onClick={() => setCurrentView("employee-management")}
            style={navButtonStyle(currentView === "employee-management")}
          >
            🏢 Employee Management
          </button>
        </div>

        <div style={{ padding: "20px", backgroundColor: theme.colors.light, borderRadius: "8px", minHeight: "400px" }}>
          <div style={{ backgroundColor: theme.neutral.white, borderRadius: "8px", padding: "24px", boxShadow: "0 2px 4px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb" }}>
            {currentView === "salary-calculation" && <SalaryCalculation />}
            {currentView === "salary-management" && <SalaryManagement />}
            {currentView === "salary-approval" && <SalaryApprovalDashboard />}
            {currentView === "approvals" && <ApprovalManagement />}
            {currentView === "rules" && <SalaryRulesManagement />}
            {currentView === "employee-details" && <EmployeeDetailView />}
            {currentView === "employee-management" && <EmployeeManagement />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

