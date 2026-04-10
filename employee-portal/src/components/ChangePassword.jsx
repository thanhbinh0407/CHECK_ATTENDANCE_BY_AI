import React, { useState } from "react";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessageType("error");
      setMessage("Please fill in all required fields.");
      return;
    }

    if (newPassword.length < 8) {
      setMessageType("error");
      setMessage("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessageType("error");
      setMessage("Password confirmation does not match.");
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      setMessageType("error");
      setMessage("You are not logged in. Please sign in again.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/auth/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessageType("error");
        setMessage(data.message || "Password change failed.");
        return;
      }

      setMessageType("success");
      setMessage("✅ Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessageType("error");
      setMessage("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "32px", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#fff", borderRadius: "16px", padding: "28px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
        <h2 style={{ margin: "0 0 8px 0" }}>🔐 Change password</h2>
        <p style={{ margin: "0 0 20px 0", color: "#6c757d", fontSize: "13px" }}>
          For account security, use a strong password (minimum 8 characters).
        </p>

        {message && (
          <div style={{
            padding: "12px 14px",
            marginBottom: "16px",
            borderRadius: "10px",
            backgroundColor: messageType === "success" ? "#d4edda" : "#f8d7da",
            color: messageType === "success" ? "#155724" : "#721c24",
            border: `1px solid ${messageType === "success" ? "#28a745" : "#dc3545"}`,
            fontSize: "13px",
            fontWeight: 600
          }}>
            {message}
          </div>
        )}

        <form onSubmit={submit}>
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontWeight: 700, marginBottom: "6px" }}>Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{ width: "100%", padding: "12px 12px", borderRadius: "10px", border: "1px solid #e0e0e0" }}
              autoComplete="current-password"
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontWeight: 700, marginBottom: "6px" }}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: "100%", padding: "12px 12px", borderRadius: "10px", border: "1px solid #e0e0e0" }}
              autoComplete="new-password"
            />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontWeight: 700, marginBottom: "6px" }}>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: "100%", padding: "12px 12px", borderRadius: "10px", border: "1px solid #e0e0e0" }}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "12px",
              border: "none",
              background: loading ? "#adb5bd" : "linear-gradient(135deg, #A2B9ED 0%, #8BA3E0 100%)",
              color: "#fff",
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Processing..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}

