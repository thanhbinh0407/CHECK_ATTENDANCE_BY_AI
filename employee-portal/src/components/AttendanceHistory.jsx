import React, { useState, useEffect } from "react";

export default function AttendanceHistory({ userId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAttendance();
  }, [selectedMonth, selectedYear, userId]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      if (!token) return;

      const res = await fetch(`${apiBase}/api/employee/attendance?month=${selectedMonth}&year=${selectedYear}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (log) => {
    if (log.type === "IN") {
      return log.isLate ? (
        <span style={{ backgroundColor: "#dc3545", color: "#fff", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
          ⏰ Muộn
        </span>
      ) : (
        <span style={{ backgroundColor: "#28a745", color: "#fff", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
          ✓ Check-in
        </span>
      );
    } else {
      return log.isEarlyLeave ? (
        <span style={{ backgroundColor: "#ffc107", color: "#333", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
          ⚠️ Về sớm
        </span>
      ) : log.isOvertime ? (
        <span style={{ backgroundColor: "#007bff", color: "#fff", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
          ⏱️ Tăng ca
        </span>
      ) : (
        <span style={{ backgroundColor: "#28a745", color: "#fff", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
          ✓ Check-out
        </span>
      );
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: "12px",
      padding: "32px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    }}>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#1a1a1a" }}>
          📅 Lịch Sử Điểm Danh
        </h2>
        <div style={{ display: "flex", gap: "12px" }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{
              padding: "8px 12px",
              border: "2px solid #e0e0e0",
              borderRadius: "6px",
              fontSize: "14px",
              cursor: "pointer"
            }}
          >
            {months.map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{
              padding: "8px 12px",
              border: "2px solid #e0e0e0",
              borderRadius: "6px",
              fontSize: "14px",
              cursor: "pointer"
            }}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
          Đang tải dữ liệu...
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          <p>Không có dữ liệu điểm danh trong tháng này</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#666", fontSize: "13px" }}>
                  Thời gian
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#666", fontSize: "13px" }}>
                  Loại
                </th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#666", fontSize: "13px" }}>
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "14px", fontSize: "14px", color: "#333" }}>
                    {formatDate(log.timestamp)}
                  </td>
                  <td style={{ padding: "14px" }}>
                    {log.type === "IN" ? (
                      <span style={{ color: "#007bff", fontWeight: "600" }}>Check-in</span>
                    ) : (
                      <span style={{ color: "#6c757d", fontWeight: "600" }}>Check-out</span>
                    )}
                  </td>
                  <td style={{ padding: "14px" }}>
                    {getStatusBadge(log)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

