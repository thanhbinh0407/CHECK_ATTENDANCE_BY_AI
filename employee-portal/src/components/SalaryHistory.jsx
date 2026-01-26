import React, { useState, useEffect } from "react";

export default function SalaryHistory({ userId }) {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSalary, setSelectedSalary] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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

  const viewSalaryDetail = (salary) => {
    setSelectedSalary(salary);
    setShowDetailModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(amount || 0);
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
                transition: "all 0.3s",
                cursor: "pointer"
              }}
              onClick={() => viewSalaryDetail(salary)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#007bff";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,123,255,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e0e0e0";
                e.currentTarget.style.boxShadow = "none";
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
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                    Nhấn để xem chi tiết
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

      {/* Salary Detail Modal */}
      {showDetailModal && selectedSalary && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
          }}
          onClick={() => {
            setShowDetailModal(false);
            setSelectedSalary(null);
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "30px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#1a1a1a" }}>
                💰 Chi Tiết Lương Tháng {selectedSalary.month}/{selectedSalary.year}
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedSalary(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#999",
                  padding: "5px 10px"
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>Trạng thái</div>
              <div>{getStatusBadge(selectedSalary.status)}</div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "15px", color: "#28a745" }}>Thu Nhập</h3>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                <span style={{ fontSize: "14px" }}>Lương cơ bản:</span>
                <strong style={{ fontSize: "16px" }}>{formatCurrency(selectedSalary.baseSalary)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", padding: "10px", backgroundColor: "#e8f5e9", borderRadius: "6px" }}>
                <span style={{ fontSize: "14px" }}>Thưởng:</span>
                <strong style={{ fontSize: "16px", color: "#28a745" }}>+{formatCurrency(selectedSalary.bonus)}</strong>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "15px", color: "#dc3545" }}>Khấu Trừ</h3>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", backgroundColor: "#ffe5e5", borderRadius: "6px" }}>
                <span style={{ fontSize: "14px" }}>Tổng khấu trừ:</span>
                <strong style={{ fontSize: "16px", color: "#dc3545" }}>-{formatCurrency(selectedSalary.deduction)}</strong>
              </div>
            </div>

            <div style={{ borderTop: "2px solid #007bff", paddingTop: "20px", marginTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "18px", fontWeight: "700" }}>Lương thực nhận:</span>
                <strong style={{ fontSize: "24px", fontWeight: "700", color: "#007bff" }}>
                  {formatCurrency(selectedSalary.finalSalary)}
                </strong>
              </div>
            </div>

            {selectedSalary.notes && (
              <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#fffbea", borderRadius: "8px" }}>
                <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "5px" }}>Ghi chú:</div>
                <div style={{ fontSize: "14px", color: "#666" }}>{selectedSalary.notes}</div>
              </div>
            )}

            {selectedSalary.calculatedAt && (
              <div style={{ marginTop: "15px", fontSize: "12px", color: "#999", textAlign: "right" }}>
                Tính toán lúc: {new Date(selectedSalary.calculatedAt).toLocaleString('vi-VN')}
              </div>
            )}

            <button
              onClick={() => {
                setShowDetailModal(false);
                setSelectedSalary(null);
              }}
              style={{
                marginTop: "20px",
                width: "100%",
                padding: "12px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px"
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

