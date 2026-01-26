import React, { useState } from "react";
import { theme } from "../theme.js";

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
      setMessage("");
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
        setMessage("Đăng nhập thất bại: " + (data.message || "Email hoặc mật khẩu không đúng"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
    background: theme.primary.gradient,
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "440px",
    backgroundColor: theme.neutral.white,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xxl,
    boxShadow: theme.shadows.lg,
  };

  const titleStyle = {
    fontSize: "32px",
    fontWeight: "700",
    color: theme.neutral.gray900,
    marginBottom: theme.spacing.sm,
    textAlign: "center"
  };

  const subtitleStyle = {
    fontSize: "14px",
    color: theme.neutral.gray600,
    marginBottom: theme.spacing.xl,
    textAlign: "center"
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    border: `2px solid ${theme.neutral.gray200}`,
    borderRadius: theme.radius.md,
    fontSize: "15px",
    marginBottom: theme.spacing.md,
    transition: "border-color 0.2s"
  };

  const buttonStyle = {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    border: "none",
    borderRadius: theme.radius.md,
    cursor: loading ? "not-allowed" : "pointer",
    background: theme.primary.main,
    color: theme.neutral.white,
    transition: "all 0.2s",
    opacity: loading ? 0.7 : 1
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={titleStyle}>Đăng Nhập</div>
        <div style={subtitleStyle}>Hệ thống Quản lý Lương - Kế toán</div>

        {message && (
          <div style={{
            padding: "12px 16px",
            backgroundColor: message.includes("thành công") ? "#d4edda" : "#f8d7da",
            border: `1px solid ${message.includes("thành công") ? "#c3e6cb" : "#f5c6cb"}`,
            borderRadius: theme.radius.md,
            color: message.includes("thành công") ? "#155724" : "#721c24",
            marginBottom: theme.spacing.lg,
            fontSize: "14px"
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: theme.spacing.md }}>
            <label style={{ display: "block", marginBottom: theme.spacing.sm, fontWeight: "600", color: theme.neutral.gray700, fontSize: "14px" }}>
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

          <div style={{ marginBottom: theme.spacing.xl }}>
            <label style={{ display: "block", marginBottom: theme.spacing.sm, fontWeight: "600", color: theme.neutral.gray700, fontSize: "14px" }}>
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

