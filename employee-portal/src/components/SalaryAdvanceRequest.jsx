import React, { useState, useEffect, useMemo } from "react";

// Chỉ cho chọn: tháng hiện tại, hoặc 1–2 tháng kế tiếp (không quá khứ, không xa hơn 2 tháng)
function getAllowedMonthYearOptions() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const options = [];
  for (let i = 0; i <= 2; i++) {
    let m = currentMonth + i;
    let y = currentYear;
    if (m > 12) {
      m -= 12;
      y += 1;
    }
    options.push({
      month: m,
      year: y,
      label: `Tháng ${m}/${y}`
    });
  }
  return options;
}

export default function SalaryAdvanceRequest({ userId }) {
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const allowedPeriods = useMemo(getAllowedMonthYearOptions, []);
  const availablePeriods = useMemo(
    () => allowedPeriods.filter(
      (p) => !advances.some((a) => Number(a.month) === p.month && Number(a.year) === p.year)
    ),
    [allowedPeriods, advances]
  );
  const defaultPeriod = allowedPeriods[0] || { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
  const [formData, setFormData] = useState({
    month: defaultPeriod.month,
    year: defaultPeriod.year,
    amount: "",
    reason: ""
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchAdvances();
  }, [userId]);

  const prevShowForm = React.useRef(false);
  useEffect(() => {
    if (showForm && !prevShowForm.current && availablePeriods.length > 0) {
      const first = availablePeriods[0];
      setFormData((prev) => ({
        ...prev,
        month: first.month,
        year: first.year,
        amount: "",
        reason: ""
      }));
    }
    prevShowForm.current = showForm;
  }, [showForm, availablePeriods]);

  const fetchAdvances = async () => {
    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      if (!token) return;

      const query = typeof userId === "number" || (typeof userId === "string" && userId !== "" && userId !== "undefined") ? `?userId=${userId}` : "";
      const res = await fetch(`${apiBase}/api/salary-advances${query}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok) {
        setAdvances(data.advances || []);
        setMessage("");
      } else {
        setMessage(data?.message ? `Lỗi: ${data.message}` : "Không tải được danh sách ứng lương.");
      }
    } catch (error) {
      console.error("Error fetching salary advances:", error);
      setMessage("Lỗi kết nối. Vui lòng đăng nhập lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const alreadyRequested = advances.some(
      (a) => Number(a.month) === Number(formData.month) && Number(a.year) === Number(formData.year)
    );
    if (alreadyRequested) {
      setMessage("❌ Bạn đã có yêu cầu ứng lương cho tháng/năm này. Mỗi tháng chỉ được ứng 1 lần.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      if (!token) return;

      const res = await fetch(`${apiBase}/api/salary-advances`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Yêu cầu ứng lương đã được gửi thành công!");
        setShowForm(false);
        setFormData({
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          amount: "",
          reason: ""
        });
        fetchAdvances();
        setTimeout(() => setMessage(""), 5000);
      } else {
        setMessage(`❌ Lỗi: ${data.message || "Không thể tạo yêu cầu"}`);
      }
    } catch (error) {
      console.error("Error creating salary advance:", error);
      setMessage(`❌ Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { backgroundColor: "#ff9800", color: "#fff" },
      approved: { backgroundColor: "#28a745", color: "#fff" },
      rejected: { backgroundColor: "#dc3545", color: "#fff" },
      deducted: { backgroundColor: "#17a2b8", color: "#fff" }
    };
    const labels = {
      pending: "ĐANG CHỜ DUYỆT",
      approved: "ĐÃ DUYỆT",
      rejected: "ĐÃ TỪ CHỐI",
      deducted: "ĐÃ KHẤU TRỪ"
    };
    const style = styles[status] || styles.pending;
    return (
      <span style={{
        ...style,
        padding: "5px 14px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "0.5px"
      }}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div style={{
      backgroundColor: "#f8f9fa",
      minHeight: "100vh",
      padding: "24px"
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "16px",
        padding: "24px 32px",
        marginBottom: "24px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}>
          <div>
            <h2 style={{
              margin: "0 0 8px 0",
              fontSize: "28px",
              fontWeight: "700",
              color: "#1a1a1a"
            }}>
              💸 Ứng Lương
            </h2>
            <p style={{
              margin: 0,
              color: "#666",
              fontSize: "14px"
            }}>
              Yêu cầu ứng lương trước và theo dõi trạng thái
            </p>
          </div>
          <button
            onClick={() => {
              const first = allowedPeriods[0];
              setFormData((prev) => ({
                ...prev,
                month: first?.month ?? new Date().getMonth() + 1,
                year: first?.year ?? new Date().getFullYear(),
                amount: "",
                reason: ""
              }));
              setShowForm(true);
            }}
            style={{
              padding: "12px 24px",
              backgroundColor: "#28a745",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "14px",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#218838"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#28a745"}
          >
            + Tạo Yêu Cầu Mới
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          padding: "16px 20px",
          backgroundColor: message.includes("✅") ? "#d4edda" : "#f8d7da",
          border: `2px solid ${message.includes("✅") ? "#c3e6cb" : "#f5c6cb"}`,
          borderRadius: "12px",
          color: message.includes("✅") ? "#155724" : "#721c24",
          marginBottom: "24px",
          fontSize: "14px",
          fontWeight: "500"
        }}>
          {message}
        </div>
      )}

      {/* Request Form Modal */}
      {showForm && (
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
          onClick={() => setShowForm(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "500px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              margin: "0 0 24px 0",
              fontSize: "24px",
              fontWeight: "700",
              color: "#1a1a1a"
            }}>
              Tạo Yêu Cầu Ứng Lương
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#333"
                }}>
                  Tháng/Năm * <span style={{ fontWeight: 400, color: "#666", fontSize: "12px" }}>(chỉ tháng hiện tại hoặc 2 tháng kế tiếp, mỗi tháng ứng 1 lần)</span>
                </label>
                {availablePeriods.length === 0 ? (
                  <div style={{ padding: "12px", background: "#fff3cd", borderRadius: "8px", color: "#856404", fontSize: "14px" }}>
                    Bạn đã có yêu cầu ứng lương cho tất cả các tháng được phép (tháng hiện tại và 2 tháng kế tiếp).
                  </div>
                ) : (
                  <select
                    value={(() => {
                      const currentValue = `${formData.month}-${formData.year}`;
                      const exists = availablePeriods.some((p) => `${p.month}-${p.year}` === currentValue);
                      return exists ? currentValue : `${availablePeriods[0].month}-${availablePeriods[0].year}`;
                    })()}
                    onChange={(e) => {
                      const [month, year] = e.target.value.split("-").map(Number);
                      setFormData({ ...formData, month, year });
                    }}
                    required
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "14px"
                    }}
                  >
                    {availablePeriods.map((p) => (
                      <option key={`${p.month}-${p.year}`} value={`${p.month}-${p.year}`}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#333"
                }}>
                  Số Tiền (VND) *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  min="0"
                  step="1000"
                  placeholder="Nhập số tiền muốn ứng"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "14px"
                  }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#333"
                }}>
                  Lý Do (Tùy chọn)
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Nhập lý do ứng lương..."
                  rows="4"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1,
                    padding: "14px",
                    backgroundColor: "#6c757d",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "700",
                    fontSize: "14px"
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading || availablePeriods.length === 0}
                  style={{
                    flex: 1,
                    padding: "14px",
                    backgroundColor: "#28a745",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "700",
                    fontSize: "14px"
                  }}
                >
                  {loading ? "Đang gửi..." : "Gửi Yêu Cầu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Requests List */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "16px",
        padding: "32px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
      }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}>
            <div style={{
              width: "50px",
              height: "50px",
              border: "4px solid #f0f0f0",
              borderTop: "4px solid #1976d2",
              borderRadius: "50%",
              margin: "0 auto 16px",
              animation: "spin 1s linear infinite"
            }}></div>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "500" }}>Đang tải...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : advances.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
            <div style={{ fontSize: "64px", marginBottom: "16px", opacity: 0.3 }}>💸</div>
            <p style={{
              margin: "0 0 8px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "#666"
            }}>
              Chưa có yêu cầu ứng lương
            </p>
            <p style={{ margin: 0, fontSize: "14px", color: "#999" }}>
              Nhấn "Tạo Yêu Cầu Mới" để bắt đầu
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {advances.map((advance) => (
              <div
                key={advance.id}
                style={{
                  border: "2px solid #e0e0e0",
                  borderRadius: "12px",
                  padding: "24px",
                  transition: "all 0.3s",
                  backgroundColor: "#fff"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#28a745";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(40,167,69,0.15)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: "22px",
                      fontWeight: "700",
                      color: "#1a1a1a",
                      marginBottom: "8px",
                      letterSpacing: "-0.5px"
                    }}>
                      {advance.month}/{advance.year}
                    </div>
                    <div style={{ marginBottom: "4px" }}>
                      {getStatusBadge(advance.approvalStatus)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "13px", color: "#666", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                      Số Tiền
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: "700", color: "#28a745", letterSpacing: "-0.5px" }}>
                      {formatCurrency(advance.amount)}
                    </div>
                  </div>
                </div>

                {advance.reason && (
                  <div style={{
                    padding: "12px 16px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                    marginBottom: "12px"
                  }}>
                    <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                      Lý Do
                    </div>
                    <div style={{ fontSize: "14px", color: "#333" }}>
                      {advance.reason}
                    </div>
                  </div>
                )}

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "12px",
                  paddingTop: "20px",
                  borderTop: "2px solid #f0f0f0"
                }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                      Ngày Tạo
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#333" }}>
                      {new Date(advance.createdAt).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                  {advance.approvedAt && (
                    <div>
                      <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                        Ngày Duyệt
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#333" }}>
                        {new Date(advance.approvedAt).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                  )}
                </div>

                {advance.approverComments && (
                  <div style={{
                    marginTop: "12px",
                    padding: "12px 16px",
                    backgroundColor: "#e3f2fd",
                    borderRadius: "8px",
                    borderLeft: "4px solid #1976d2"
                  }}>
                    <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                      Ghi Chú Từ Người Duyệt
                    </div>
                    <div style={{ fontSize: "13px", color: "#333" }}>
                      {advance.approverComments}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

