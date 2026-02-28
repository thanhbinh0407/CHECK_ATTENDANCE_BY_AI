import React, { useState, useEffect } from "react";
import { vietnamProvinces } from "../data/vietnamProvinces.js";

export default function BusinessTripRequest({ userId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    destination: "",
    purpose: "",
    estimatedCost: "",
    transportType: "",
    accommodation: ""
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchRequests();
  }, [userId]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      if (!token) return;

      const res = await fetch(`${apiBase}/api/business-trip-requests?userId=${userId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching business trip requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage("");
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      if (!token) return;

      const res = await fetch(`${apiBase}/api/business-trip-requests`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formData,
          estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : null
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Yêu cầu đi công tác đã được gửi thành công!");
        setShowForm(false);
        setFormData({
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          destination: "",
          purpose: "",
          estimatedCost: "",
          transportType: "",
          accommodation: ""
        });
        fetchRequests();
        setTimeout(() => setMessage(""), 5000);
      } else {
        setMessage(`❌ Lỗi: ${data.message || "Không thể tạo yêu cầu"}`);
      }
    } catch (error) {
      console.error("Error creating business trip request:", error);
      setMessage(`❌ Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? days : 0;
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
      rejected: { backgroundColor: "#dc3545", color: "#fff" }
    };
    const labels = {
      pending: "ĐANG CHỜ DUYỆT",
      approved: "ĐÃ DUYỆT",
      rejected: "ĐÃ TỪ CHỐI"
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
              🧳 Yêu Cầu Đi Công Tác
            </h2>
            <p style={{
              margin: 0,
              color: "#666",
              fontSize: "14px"
            }}>
              Tạo và theo dõi yêu cầu đi công tác
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: "12px 24px",
              backgroundColor: "#17a2b8",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "14px",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#138496"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#17a2b8"}
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
              maxWidth: "700px",
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
              Tạo Yêu Cầu Đi Công Tác
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
                  Thời Gian Công Tác *
                </label>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Ngày Bắt Đầu</div>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "2px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "14px"
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Ngày Kết Thúc</div>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                      min={formData.startDate}
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "2px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "14px"
                      }}
                    />
                  </div>
                  {calculateDays() > 0 && (
                    <div style={{
                      padding: "8px 12px",
                      backgroundColor: "#e3f2fd",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#17a2b8",
                      whiteSpace: "nowrap"
                    }}>
                      {calculateDays()} ngày
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#333"
                }}>
                  Địa Điểm Công Tác *
                </label>
                <select
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "14px"
                  }}
                >
                  <option value="">Chọn địa điểm (tỉnh/thành phố)</option>
                  {vietnamProvinces.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#333"
                }}>
                  Mục Đích Công Tác *
                </label>
                <textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  required
                  placeholder="Mô tả mục đích và công việc cần thực hiện..."
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#333"
                  }}>
                    Phương Tiện Di Chuyển
                  </label>
                  <select
                    value={formData.transportType}
                    onChange={(e) => setFormData({ ...formData, transportType: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "14px"
                    }}
                  >
                    <option value="">Chọn phương tiện</option>
                    <option value="plane">Máy bay</option>
                    <option value="train">Tàu hỏa</option>
                    <option value="bus">Xe khách</option>
                    <option value="car">Ô tô</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#333"
                  }}>
                    Chi Phí Dự Kiến (VND)
                  </label>
                  <input
                    type="number"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                    min="0"
                    step="1000"
                    placeholder="Nhập chi phí dự kiến"
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "14px"
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#333"
                }}>
                  Nơi Ở (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={formData.accommodation}
                  onChange={(e) => setFormData({ ...formData, accommodation: e.target.value })}
                  placeholder="Tên khách sạn hoặc nơi ở"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "14px"
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
                  disabled={loading || calculateDays() <= 0}
                  style={{
                    flex: 1,
                    padding: "14px",
                    backgroundColor: "#17a2b8",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "700",
                    fontSize: "14px",
                    opacity: (loading || calculateDays() <= 0) ? 0.6 : 1
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
              borderTop: "4px solid #17a2b8",
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
        ) : requests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
            <div style={{ fontSize: "64px", marginBottom: "16px", opacity: 0.3 }}>🧳</div>
            <p style={{
              margin: "0 0 8px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "#666"
            }}>
              Chưa có yêu cầu đi công tác
            </p>
            <p style={{ margin: 0, fontSize: "14px", color: "#999" }}>
              Nhấn "Tạo Yêu Cầu Mới" để bắt đầu
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {requests.map((request) => {
              const startDate = new Date(request.startDate);
              const endDate = new Date(request.endDate);
              const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
              
              return (
                <div
                  key={request.id}
                  style={{
                    border: "2px solid #e0e0e0",
                    borderRadius: "12px",
                    padding: "24px",
                    transition: "all 0.3s",
                    backgroundColor: "#fff"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#17a2b8";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(23,162,184,0.15)";
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
                        {request.destination}
                      </div>
                      <div style={{ marginBottom: "4px" }}>
                        {getStatusBadge(request.approvalStatus)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "13px", color: "#666", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                        Thời Gian
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: "#17a2b8", letterSpacing: "-0.5px" }}>
                        {days} ngày
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "12px",
                    marginBottom: "12px",
                    padding: "12px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px"
                  }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                        Ngày Bắt Đầu
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                        {new Date(request.startDate).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                        Ngày Kết Thúc
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                        {new Date(request.endDate).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                  </div>

                  {request.purpose && (
                    <div style={{
                      padding: "12px 16px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "8px",
                      marginBottom: "12px"
                    }}>
                      <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                        Mục Đích
                      </div>
                      <div style={{ fontSize: "14px", color: "#333" }}>
                        {request.purpose}
                      </div>
                    </div>
                  )}

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "12px",
                    marginBottom: "12px"
                  }}>
                    {request.transportType && (
                      <div style={{
                        padding: "12px",
                        backgroundColor: "#e3f2fd",
                        borderRadius: "8px"
                      }}>
                        <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                          Phương Tiện
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#333" }}>
                          {request.transportType === "plane" ? "Máy bay" :
                           request.transportType === "train" ? "Tàu hỏa" :
                           request.transportType === "bus" ? "Xe khách" :
                           request.transportType === "car" ? "Ô tô" :
                           request.transportType}
                        </div>
                      </div>
                    )}
                    {request.estimatedCost && (
                      <div style={{
                        padding: "12px",
                        backgroundColor: "#fff3e0",
                        borderRadius: "8px"
                      }}>
                        <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                          Chi Phí Dự Kiến
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#f57c00" }}>
                          {formatCurrency(request.estimatedCost)}
                        </div>
                      </div>
                    )}
                    {request.accommodation && (
                      <div style={{
                        padding: "12px",
                        backgroundColor: "#e8f5e9",
                        borderRadius: "8px"
                      }}>
                        <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                          Nơi Ở
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#333" }}>
                          {request.accommodation}
                        </div>
                      </div>
                    )}
                  </div>

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
                        {new Date(request.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                    {request.approvedAt && (
                      <div>
                        <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                          Ngày Duyệt
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#333" }}>
                          {new Date(request.approvedAt).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                    )}
                  </div>

                  {request.approverComments && (
                    <div style={{
                      marginTop: "12px",
                      padding: "12px 16px",
                      backgroundColor: "#e3f2fd",
                      borderRadius: "8px",
                      borderLeft: "4px solid #17a2b8"
                    }}>
                      <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                        Ghi Chú Từ Người Duyệt
                      </div>
                      <div style={{ fontSize: "13px", color: "#333" }}>
                        {request.approverComments}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

