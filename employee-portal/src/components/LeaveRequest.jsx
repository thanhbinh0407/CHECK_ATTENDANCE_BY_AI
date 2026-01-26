import React, { useState, useEffect } from "react";

export default function LeaveRequest({ userId }) {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [leaveBalance, setLeaveBalance] = useState({ total: 12, used: 0, remaining: 12 });
  const [formData, setFormData] = useState({
    type: "paid",
    startDate: "",
    endDate: "",
    reason: ""
  });

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeaveBalance();
  }, [userId]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/leave/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setLeaveRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/leave/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setLeaveBalance(data.balance || { total: 12, used: 0, remaining: 12 });
      }
    } catch (error) {
      console.error("Error fetching leave balance:", error);
    }
  };

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.startDate || !formData.endDate) {
      setMessage("Vui lòng chọn ngày bắt đầu và ngày kết thúc");
      return;
    }

    const days = calculateDays(formData.startDate, formData.endDate);
    if (days <= 0) {
      setMessage("Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }

    if (formData.type === "paid" && days > leaveBalance.remaining) {
      setMessage(`Bạn chỉ còn ${leaveBalance.remaining} ngày phép. Vui lòng chọn lại thời gian.`);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/leave/request`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formData,
          days: days
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Gửi đơn nghỉ phép thành công!");
        setShowForm(false);
        setFormData({ type: "paid", startDate: "", endDate: "", reason: "" });
        fetchLeaveRequests();
        fetchLeaveBalance();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Lỗi: " + (data.message || "Không thể gửi đơn nghỉ phép"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (requestId) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn nghỉ phép này?")) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/leave/requests/${requestId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setMessage("Hủy đơn nghỉ phép thành công!");
        fetchLeaveRequests();
        fetchLeaveBalance();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Lỗi khi hủy đơn nghỉ phép");
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { background: "#fff3cd", color: "#997404" },
      approved: { background: "#d4edda", color: "#155724" },
      rejected: { background: "#f8d7da", color: "#721c24" }
    };
    const labels = {
      pending: "Chờ duyệt",
      approved: "Đã duyệt",
      rejected: "Từ chối"
    };
    return { style: styles[status] || styles.pending, label: labels[status] || status };
  };

  const getTypeLabel = (type) => {
    const labels = {
      paid: "Nghỉ phép có lương",
      unpaid: "Nghỉ phép không lương",
      sick: "Nghỉ ốm",
      maternity: "Nghỉ thai sản",
      personal: "Nghỉ việc riêng",
      other: "Khác"
    };
    return labels[type] || type;
  };

  return (
    <div style={{ backgroundColor: "white", borderRadius: "8px", padding: "24px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#333" }}>📅 Đơn Nghỉ Phép</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px"
          }}
        >
          {showForm ? "Hủy" : "+ Gửi Đơn Nghỉ"}
        </button>
      </div>

      {message && (
        <div style={{
          padding: "12px",
          marginBottom: "20px",
          backgroundColor: message.includes("thành công") ? "#d4edda" : "#f8d7da",
          color: message.includes("thành công") ? "#155724" : "#721c24",
          borderRadius: "6px",
          fontSize: "14px"
        }}>
          {message}
        </div>
      )}

      {/* Leave Balance */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px", marginBottom: "24px" }}>
        <div style={{ padding: "20px", backgroundColor: "#e7f3ff", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#007bff" }}>{leaveBalance.total}</div>
          <div style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>Tổng ngày phép</div>
        </div>
        <div style={{ padding: "20px", backgroundColor: "#fff3cd", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#997404" }}>{leaveBalance.used}</div>
          <div style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>Đã sử dụng</div>
        </div>
        <div style={{ padding: "20px", backgroundColor: "#d4edda", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#155724" }}>{leaveBalance.remaining}</div>
          <div style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>Còn lại</div>
        </div>
      </div>

      {/* Leave Request Form */}
      {showForm && (
        <div style={{ marginBottom: "24px", padding: "20px", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #dee2e6" }}>
          <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "18px", fontWeight: "600" }}>📝 Gửi Đơn Nghỉ Phép</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "14px" }}>Loại nghỉ phép</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #dee2e6",
                  borderRadius: "6px",
                  fontSize: "14px"
                }}
              >
                <option value="paid">Nghỉ phép có lương</option>
                <option value="unpaid">Nghỉ phép không lương</option>
                <option value="sick">Nghỉ ốm</option>
                <option value="maternity">Nghỉ thai sản</option>
                <option value="personal">Nghỉ việc riêng</option>
                <option value="other">Khác</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "14px" }}>Từ ngày</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    setFormData({ ...formData, startDate: e.target.value });
                    if (formData.endDate && e.target.value > formData.endDate) {
                      setFormData({ ...formData, startDate: e.target.value, endDate: "" });
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    fontSize: "14px"
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "14px" }}>Đến ngày</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    fontSize: "14px"
                  }}
                  required
                />
              </div>
            </div>

            {formData.startDate && formData.endDate && (
              <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#e7f3ff", borderRadius: "6px" }}>
                <strong>Số ngày nghỉ: {calculateDays(formData.startDate, formData.endDate)} ngày</strong>
              </div>
            )}

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "14px" }}>Lý do</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #dee2e6",
                  borderRadius: "6px",
                  fontSize: "14px",
                  minHeight: "100px",
                  resize: "vertical"
                }}
                placeholder="Nhập lý do nghỉ phép..."
                required
              />
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ type: "paid", startDate: "", endDate: "", reason: "" });
                }}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? "Đang gửi..." : "Gửi Đơn"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Leave Requests List */}
      <div>
        <h3 style={{ marginBottom: "15px", fontSize: "18px", fontWeight: "600" }}>Lịch Sử Đơn Nghỉ Phép</h3>
        {loading && leaveRequests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>Đang tải...</div>
        ) : leaveRequests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>Chưa có đơn nghỉ phép nào</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa" }}>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6", fontSize: "14px", fontWeight: "600" }}>Loại</th>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6", fontSize: "14px", fontWeight: "600" }}>Từ ngày</th>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6", fontSize: "14px", fontWeight: "600" }}>Đến ngày</th>
                  <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #dee2e6", fontSize: "14px", fontWeight: "600" }}>Số ngày</th>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6", fontSize: "14px", fontWeight: "600" }}>Trạng thái</th>
                  <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #dee2e6", fontSize: "14px", fontWeight: "600" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((request) => {
                  const statusBadge = getStatusBadge(request.status);
                  return (
                    <tr key={request.id} style={{ borderBottom: "1px solid #dee2e6" }}>
                      <td style={{ padding: "12px", fontSize: "14px" }}>{getTypeLabel(request.type)}</td>
                      <td style={{ padding: "12px", fontSize: "14px" }}>{new Date(request.startDate).toLocaleDateString('vi-VN')}</td>
                      <td style={{ padding: "12px", fontSize: "14px" }}>{new Date(request.endDate).toLocaleDateString('vi-VN')}</td>
                      <td style={{ padding: "12px", textAlign: "center", fontSize: "14px", fontWeight: "600" }}>{request.days}</td>
                      <td style={{ padding: "12px", fontSize: "14px" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "600",
                          ...statusBadge.style
                        }}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        {request.status === "pending" && (
                          <button
                            onClick={() => handleDelete(request.id)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#dc3545",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}
                          >
                            Hủy
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

