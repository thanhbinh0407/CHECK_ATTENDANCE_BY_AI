import React, { useState, useEffect } from "react";

export default function SalaryHistory({ userId }) {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalaries();
  }, [userId]);

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      if (!token) return;

      const res = await fetch(`${apiBase}/api/employee/salary`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok) {
        setSalaries(data.salaries || []);
      }
    } catch (error) {
      console.error("Error fetching salaries:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { backgroundColor: "#ffc107", color: "#333" },
      approved: { backgroundColor: "#17a2b8", color: "#fff" },
      paid: { backgroundColor: "#28a745", color: "#fff" }
    };
    const labels = {
      pending: "Chờ duyệt",
      approved: "Đã duyệt",
      paid: "Đã thanh toán"
    };
    const style = styles[status] || styles.pending;
    return (
      <span style={{
        ...style,
        padding: "4px 12px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "600"
      }}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: "12px",
      padding: "32px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    }}>
      <h2 style={{ margin: "0 0 24px 0", fontSize: "24px", fontWeight: "700", color: "#1a1a1a" }}>
        💰 Lịch Sử Lương
      </h2>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
          Đang tải dữ liệu...
        </div>
      ) : salaries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          <p>Chưa có dữ liệu lương</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {salaries.map((salary) => (
            <div
              key={salary.id}
              style={{
                border: "2px solid #e0e0e0",
                borderRadius: "8px",
                padding: "20px",
                transition: "all 0.3s"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "#1a1a1a", marginBottom: "4px" }}>
                    Tháng {salary.month}/{salary.year}
                  </div>
                  <div style={{ fontSize: "13px", color: "#666" }}>
                    {getStatusBadge(salary.status)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: "#28a745" }}>
                    {formatCurrency(salary.finalSalary)}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", paddingTop: "16px", borderTop: "1px solid #f0f0f0" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Lương cơ bản</div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#333" }}>
                    {formatCurrency(salary.baseSalary)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Thưởng</div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#28a745" }}>
                    +{formatCurrency(salary.bonus)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Khấu trừ</div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#dc3545" }}>
                    -{formatCurrency(salary.deduction)}
                  </div>
                </div>
              </div>

              {salary.notes && (
                <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#f8f9fa", borderRadius: "6px", fontSize: "13px", color: "#666" }}>
                  📝 {salary.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

