import { useState, useEffect } from "react";
import AttendanceScanner from "./components/AttendanceScanner.jsx";
import "./App.css";

function App() {
  const [serverStatus, setServerStatus] = useState("checking");

  useEffect(() => {
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const res = await fetch(`${apiBase}/api/attendance/today`, {
        method: "GET"
      });
      if (res.ok) {
        setServerStatus("connected");
      } else {
        setServerStatus("offline");
      }
    } catch (error) {
      setServerStatus("offline");
    }
  };

  if (serverStatus === "checking") {
    return (
      <div style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
        fontSize: "16px",
        color: "#666"
      }}>
        Đang kiểm tra kết nối server...
      </div>
    );
  }

  if (serverStatus === "offline") {
    return (
      <div style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff3cd",
        flexDirection: "column",
        gap: "16px"
      }}>
        <div style={{ fontSize: "28px" }}>⚠️</div>
        <div style={{ fontSize: "18px", fontWeight: "600", color: "#856404" }}>
          Server không có sẵn
        </div>
        <div style={{ fontSize: "13px", color: "#856404" }}>
          Vui lòng đảm bảo backend chạy trên http://localhost:5000
        </div>
        <button
          onClick={checkServerStatus}
          style={{
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            marginTop: "16px"
          }}
        >
          Kiểm tra lại
        </button>
      </div>
    );
  }

  const headerStyle = {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    textAlign: "center"
  };

  const titleStyle = {
    fontSize: "24px",
    fontWeight: "700",
    margin: "0 0 4px 0"
  };

  const subtitleStyle = {
    fontSize: "13px",
    opacity: 0.8,
    margin: 0
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>Employee Attendance Kiosk</h1>
        <p style={subtitleStyle}>Quét khuôn mặt để điểm danh</p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px 20px" }}>
        <AttendanceScanner />
      </div>
    </div>
  );
}

export default App;
