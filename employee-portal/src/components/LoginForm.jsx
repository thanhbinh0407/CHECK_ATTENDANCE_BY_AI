import React, { useState } from "react";

export default function LoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage("Vui lòng nhập email và mật khẩu");
      return;
    }

    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setMessage("Đăng nhập thành công!");
        setTimeout(() => onLoginSuccess(data.token, data.user), 500);
      } else {
        setMessage("Đăng nhập thất bại: " + (data.message || "Thông tin không đúng"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    maxWidth: "420px",
    margin: "80px auto",
    padding: "48px 40px",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
  };

  const titleStyle = {
    fontSize: "32px",
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: "8px",
    textAlign: "center"
  };

  const subtitleStyle = {
    fontSize: "14px",
    color: "#666",
    marginBottom: "32px",
    textAlign: "center"
  };

  const inputStyle = {
    width: "100%",
    padding: "14px 16px",
    border: "2px solid #e0e0e0",
    borderRadius: "8px",
    fontSize: "15px",
    boxSizing: "border-box",
    transition: "border-color 0.3s"
  };

  const buttonStyle = {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    border: "none",
    borderRadius: "8px",
    cursor: loading ? "not-allowed" : "pointer",
    backgroundColor: "#007bff",
    color: "#fff",
    transition: "all 0.3s",
    opacity: loading ? 0.7 : 1
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f7fa", display: "flex", alignItems: "center" }}>
      <div style={containerStyle}>
        <div style={titleStyle}>👤 Đăng Nhập</div>
        <div style={subtitleStyle}>Hệ thống quản lý điểm danh nhân viên</div>

        {message && (
          <div style={{
            padding: "12px 16px",
            backgroundColor: message.includes("thành công") ? "#d4edda" : "#f8d7da",
            border: "1px solid #c3e6cb",
            borderRadius: "8px",
            color: message.includes("thành công") ? "#155724" : "#721c24",
            marginBottom: "24px",
            fontSize: "14px"
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333", fontSize: "14px" }}>
              Email
            </label>
            <input
              type="email"
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email của bạn"
              required
            />
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333", fontSize: "14px" }}>
              Mật khẩu
            </label>
            <input
              type="password"
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}

