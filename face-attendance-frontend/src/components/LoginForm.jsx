import React, { useState } from "react";
import { theme, commonStyles } from "../styles/theme.js";

export default function LoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "employee"
  });

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

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!registerData.name || !registerData.email || !registerData.password) {
      setMessage("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      
      const res = await fetch(`${apiBase}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password,
          role: registerData.role
        })
      });

      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setMessage("Đăng ký thành công! Đang đăng nhập...");
        setTimeout(() => onLoginSuccess(data.token, data.user), 500);
      } else {
        setMessage("Đăng ký thất bại: " + (data.message || "Có lỗi xảy ra"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Modern container with glassmorphism
  const containerStyle = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
    background: `linear-gradient(135deg, #1f2937 0%, #111827 50%, #030712 100%)`,
    position: "relative",
    overflow: "hidden",
  };

  const backgroundDecorationStyle = {
    position: "absolute",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.1)",
    filter: "blur(80px)",
    top: "-200px",
    right: "-200px",
    animation: "fadeIn 1s ease-out",
  };

  const backgroundDecorationStyle2 = {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.08)",
    filter: "blur(60px)",
    bottom: "-150px",
    left: "-150px",
    animation: "fadeIn 1s ease-out 0.2s backwards",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "440px",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: theme.radius["2xl"],
    padding: theme.spacing["2xl"],
    boxShadow: theme.shadows["2xl"],
    border: "1px solid rgba(255, 255, 255, 0.3)",
    animation: "scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
    position: "relative",
    zIndex: 1,
  };

  const headerStyle = {
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  };

  const logoStyle = {
    width: "64px",
    height: "64px",
    borderRadius: theme.radius.xl,
    background: theme.gradients.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    margin: `0 auto ${theme.spacing.lg} auto`,
    boxShadow: theme.shadows.lg,
    animation: "fadeIn 0.6s ease-out 0.2s backwards",
  };

  const titleStyle = {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: "700",
    color: theme.neutral.gray900,
    marginBottom: theme.spacing.sm,
    letterSpacing: "-0.025em",
  };

  const subtitleStyle = {
    fontSize: theme.typography.body.fontSize,
    color: theme.neutral.gray500,
    margin: 0,
  };

  const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.lg,
  };

  const formGroupStyle = {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.xs,
  };

  const labelStyle = {
    fontSize: theme.typography.small.fontSize,
    fontWeight: "600",
    color: theme.neutral.gray700,
    letterSpacing: "0.025em",
  };

  const inputStyle = {
    ...commonStyles.input,
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
  };

  const buttonStyle = {
    ...commonStyles.button.primary,
    width: "100%",
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    marginTop: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
    fontWeight: "600",
    position: "relative",
    overflow: "hidden",
  };

  const toggleContainerStyle = {
    textAlign: "center",
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    borderTop: `1px solid ${theme.neutral.gray200}`,
  };

  const toggleTextStyle = {
    fontSize: theme.typography.body.fontSize,
    color: theme.neutral.gray600,
  };

  const toggleLinkStyle = {
    color: theme.primary.main,
    fontWeight: "600",
    cursor: "pointer",
    textDecoration: "none",
    marginLeft: theme.spacing.xs,
    transition: theme.transitions.normal,
  };

  const messageStyle = {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    fontSize: theme.typography.small.fontSize,
    fontWeight: "500",
    marginBottom: theme.spacing.lg,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.sm,
    animation: "fadeIn 0.3s ease-out",
    backgroundColor: message.includes("thất bại") || message.includes("Lỗi") 
      ? theme.error.bg 
      : message.includes("thành công") 
        ? theme.success.bg 
        : theme.warning.bg,
    color: message.includes("thất bại") || message.includes("Lỗi")
      ? theme.error.text
      : message.includes("thành công")
        ? theme.success.text
        : theme.warning.text,
    border: `1px solid ${
      message.includes("thất bại") || message.includes("Lỗi")
        ? theme.error.border
        : message.includes("thành công")
          ? theme.success.border
          : theme.warning.border
    }`,
  };

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
  };

  return (
    <div style={containerStyle}>
      {/* Background decorations */}
      <div style={backgroundDecorationStyle}></div>
      <div style={backgroundDecorationStyle2}></div>

      {/* Login Card */}
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{...logoStyle, fontSize: "24px", fontWeight: "800", color: theme.neutral.white}}>FR</div>
          <h1 style={titleStyle}>
            {isRegister ? "Tạo tài khoản" : "Đăng nhập"}
          </h1>
          <p style={subtitleStyle}>
            {isRegister 
              ? "Bắt đầu sử dụng hệ thống ngay hôm nay" 
              : "Chào mừng bạn quay trở lại"}
          </p>
        </div>

        {message && (
          <div style={messageStyle}>
            <span>{message}</span>
          </div>
        )}

        {!isRegister ? (
          <form onSubmit={handleLogin} style={formStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                style={inputStyle}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                disabled={loading}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Mật khẩu</label>
              <input
                type="password"
                style={inputStyle}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              style={buttonStyle} 
              disabled={loading}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = theme.shadows.lg;
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = theme.shadows.sm;
                }
              }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: theme.spacing.sm }}>
                  <span style={{ 
                    width: "16px", 
                    height: "16px", 
                    border: "2px solid rgba(255,255,255,0.3)", 
                    borderTop: "2px solid white",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite"
                  }}></span>
                  Đang đăng nhập...
                </span>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={formStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Họ và tên</label>
              <input
                type="text"
                style={inputStyle}
                value={registerData.name}
                onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                placeholder="Nguyễn Văn A"
                disabled={loading}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                style={inputStyle}
                value={registerData.email}
                onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                placeholder="name@company.com"
                disabled={loading}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Mật khẩu</label>
              <input
                type="password"
                style={inputStyle}
                value={registerData.password}
                onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Xác nhận mật khẩu</label>
              <input
                type="password"
                style={inputStyle}
                value={registerData.confirmPassword}
                onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Vai trò</label>
              <select
                style={selectStyle}
                value={registerData.role}
                onChange={(e) => setRegisterData({...registerData, role: e.target.value})}
                disabled={loading}
              >
                <option value="employee">Nhân viên</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>

            <button 
              type="submit" 
              style={buttonStyle} 
              disabled={loading}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = theme.shadows.lg;
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = theme.shadows.sm;
                }
              }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: theme.spacing.sm }}>
                  <span style={{ 
                    width: "16px", 
                    height: "16px", 
                    border: "2px solid rgba(255,255,255,0.3)", 
                    borderTop: "2px solid white",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite"
                  }}></span>
                  Đang tạo tài khoản...
                </span>
              ) : (
                "Tạo tài khoản"
              )}
            </button>
          </form>
        )}

        <div style={toggleContainerStyle}>
          <span style={toggleTextStyle}>
            {isRegister ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
          </span>
          <a
            style={toggleLinkStyle}
            onClick={(e) => {
              e.preventDefault();
              setIsRegister(!isRegister);
              setMessage("");
            }}
            onMouseEnter={(e) => {
              e.target.style.color = theme.primary.dark;
              e.target.style.textDecoration = "underline";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = theme.primary.main;
              e.target.style.textDecoration = "none";
            }}
          >
            {isRegister ? "Đăng nhập" : "Đăng ký ngay"}
          </a>
        </div>
      </div>
    </div>
  );
}
