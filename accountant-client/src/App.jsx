import { useState, useEffect } from "react";
import LoginForm from "./components/LoginForm.jsx";
import SalaryManagement from "./components/SalaryManagement.jsx";
import { theme } from "./theme.js";
import "./App.css";

function App() {
  const [authToken, setAuthToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      setAuthToken(token);
      setUser(JSON.parse(userData));
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

  return (
    <div className="app-container">
      <header style={headerStyle}>
        <div style={headerContentStyle}>
          <h1 style={titleStyle}>Hệ thống Quản lý Lương</h1>
          <div style={userInfoStyle}>
            <div style={avatarStyle}>
              {user?.name?.charAt(0)?.toUpperCase() || "K"}
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "600" }}>
                {user?.name || "Kế toán"}
              </div>
              <div style={{ fontSize: "12px", opacity: 0.9 }}>
                {user?.email || ""}
              </div>
            </div>
            <button onClick={handleLogout} style={logoutButtonStyle}>
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: theme.spacing.xl }}>
        <SalaryManagement />
      </main>
    </div>
  );
}

export default App;

