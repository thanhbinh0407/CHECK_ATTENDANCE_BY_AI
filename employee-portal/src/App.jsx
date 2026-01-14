import { useState, useEffect } from "react";
import LoginForm from "./components/LoginForm.jsx";
import AttendanceHistory from "./components/AttendanceHistory.jsx";
import SalaryHistory from "./components/SalaryHistory.jsx";
import "./App.css";

function App() {
  const [authToken, setAuthToken] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("attendance");

  useEffect(() => {
    // Check if already logged in
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
    setActiveTab("attendance");
  };

  if (!authToken || !user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  const headerStyle = {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    padding: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
  };

  const headerContentStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  };

  const tabsStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    borderBottom: "2px solid #e0e0e0",
    backgroundColor: "#fff"
  };

  const tabStyle = (active) => ({
    padding: "16px 32px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "15px",
    borderBottom: active ? "3px solid #007bff" : "3px solid transparent",
    color: active ? "#007bff" : "#666",
    backgroundColor: "transparent",
    transition: "all 0.3s"
  });

  const contentStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "32px 20px"
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", backgroundColor: "#f5f7fa" }}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={headerContentStyle}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "700", margin: "0 0 4px 0" }}>
              👤 Employee Portal
            </h1>
            <p style={{ margin: 0, fontSize: "14px", opacity: 0.9 }}>
              Hệ thống quản lý điểm danh và lương nhân viên
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: "600", fontSize: "16px" }}>{user?.name}</div>
              <div style={{ fontSize: "13px", opacity: 0.8 }}>{user?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: "10px 20px",
                backgroundColor: "#dc3545",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px"
              }}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={tabsStyle}>
        <button
          onClick={() => setActiveTab("attendance")}
          style={tabStyle(activeTab === "attendance")}
        >
          📅 Điểm Danh
        </button>
        <button
          onClick={() => setActiveTab("salary")}
          style={tabStyle(activeTab === "salary")}
        >
          💰 Lương
        </button>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {activeTab === "attendance" && <AttendanceHistory userId={user?.id} />}
        {activeTab === "salary" && <SalaryHistory userId={user?.id} />}
      </div>
    </div>
  );
}

export default App;

