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
      label: `Month ${m}/${y}`
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
        setMessage(data?.message ? `Error: ${data.message}` : "Failed to load salary advance requests.");
      }
    } catch (error) {
      console.error("Error fetching salary advances:", error);
      setMessage("Connection error. Please login again.");
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
      setMessage("❌ You already have a salary advance request for this month/year. Only one request per month is allowed.");
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
        setMessage("✅ Salary advance request submitted successfully!");
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
        setMessage(`❌ Error: ${data.message || "Unable to create request"}`);
      }
    } catch (error) {
      console.error("Error creating salary advance:", error);
      setMessage(`❌ Error: ${error.message}`);
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
      pending: "PENDING",
      approved: "APPROVED",
      rejected: "REJECTED",
      deducted: "DEDUCTED"
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
              💸 Salary Advance
            </h2>
            <p style={{
              margin: 0,
              color: "#666",
              fontSize: "14px"
            }}>
              Request salary advance and track status
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
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              transition: "all 0.3s ease",
              boxShadow: "0 2px 8px rgba(40, 167, 69, 0.3)"
            }}
          >
            + Create New Request
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
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #A2B9ED 0%, #8BA3E0 100%)",
              padding: "24px 32px",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h3 style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: "700",
                color: "#fff"
              }}>
                💰 Create Salary Advance Request
              </h3>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  borderRadius: "8px",
                  width: "36px",
                  height: "36px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "20px",
                  fontWeight: "600",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(255, 255, 255, 0.3)";
                  e.target.style.transform = "rotate(90deg)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(255, 255, 255, 0.2)";
                  e.target.style.transform = "rotate(0deg)";
                }}
              >
                ×
              </button>
            </div>

            {/* Form Content */}
            <div style={{ padding: "32px" }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "10px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#333"
                }}>
                  <span>📅</span>
                  <span>Month/Year</span>
                  <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "10px", fontStyle: "italic" }}>
                  (Current month or next 2 months only, one request per month)
                </div>
                {availablePeriods.length === 0 ? (
                  <div style={{ 
                    padding: "16px", 
                    background: "linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%)", 
                    borderRadius: "10px", 
                    color: "#856404", 
                    fontSize: "14px",
                    border: "2px solid #ffc107"
                  }}>
                    You already have salary advance requests for all allowed months (current month and next 2 months).
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
                      padding: "14px 16px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "10px",
                      fontSize: "15px",
                      transition: "all 0.3s ease",
                      backgroundColor: "#f8f9fa",
                      color: "#333",
                      cursor: "pointer"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#A2B9ED";
                      e.target.style.backgroundColor = "white";
                      e.target.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e0e0e0";
                      e.target.style.backgroundColor = "#f8f9fa";
                      e.target.style.boxShadow = "none";
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

              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "10px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#333"
                }}>
                  <span>💰</span>
                  <span>Amount (VND)</span>
                  <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  min="0"
                  step="1000"
                  placeholder="Enter amount to advance"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "10px",
                    fontSize: "15px",
                    transition: "all 0.3s ease",
                    backgroundColor: "#f8f9fa"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#A2B9ED";
                    e.target.style.backgroundColor = "white";
                    e.target.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e0e0e0";
                    e.target.style.backgroundColor = "#f8f9fa";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "10px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#333"
                }}>
                  <span>📝</span>
                  <span>Reason (Optional)</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Enter reason for salary advance..."
                  rows="4"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "10px",
                    fontSize: "15px",
                    resize: "vertical",
                    fontFamily: "inherit",
                    lineHeight: "1.6",
                    transition: "all 0.3s ease",
                    backgroundColor: "#f8f9fa"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#A2B9ED";
                    e.target.style.backgroundColor = "white";
                    e.target.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e0e0e0";
                    e.target.style.backgroundColor = "#f8f9fa";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ 
                display: "flex", 
                gap: "16px",
                paddingTop: "8px",
                borderTop: "1px solid #e0e0e0",
                marginTop: "8px"
              }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1,
                    padding: "14px 28px",
                    backgroundColor: "#6c757d",
                    color: "#fff",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "15px",
                    transition: "all 0.3s ease",
                    boxShadow: "0 2px 8px rgba(108, 117, 125, 0.2)"
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#5a6268";
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 4px 12px rgba(108, 117, 125, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#6c757d";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 2px 8px rgba(108, 117, 125, 0.2)";
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || availablePeriods.length === 0}
                  style={{
                    flex: 1,
                    padding: "14px 28px",
                    background: (loading || availablePeriods.length === 0)
                      ? "linear-gradient(135deg, #90caf9 0%, #81b9f0 100%)"
                      : "linear-gradient(135deg, #A2B9ED 0%, #8BA3E0 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "10px",
                    cursor: (loading || availablePeriods.length === 0) ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "15px",
                    transition: "all 0.3s ease",
                    boxShadow: (loading || availablePeriods.length === 0)
                      ? "none"
                      : "0 4px 12px rgba(162, 185, 237, 0.3)"
                  }}
                  onMouseOver={(e) => {
                    if (!loading && availablePeriods.length > 0) {
                      e.target.style.background = "linear-gradient(135deg, #8BA3E0 0%, #7B93D0 100%)";
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 6px 16px rgba(162, 185, 237, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && availablePeriods.length > 0) {
                      e.target.style.background = "linear-gradient(135deg, #A2B9ED 0%, #8BA3E0 100%)";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 4px 12px rgba(162, 185, 237, 0.3)";
                    }
                  }}
                >
                  {loading ? "⏳ Submitting..." : "✅ Submit Request"}
                </button>
              </div>
            </form>
          </div>
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
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "500" }}>Loading...</p>
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
              No salary advance requests yet
            </p>
            <p style={{ margin: 0, fontSize: "14px", color: "#999" }}>
              Click "Create New Request" to start
            </p>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: "0",
              border: "1px solid #868e96",
              borderRadius: "8px",
              overflow: "hidden"
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "700",
                    color: "#333",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    borderBottom: "2px solid #868e96",
                    borderRight: "1px solid #868e96",
                    borderTopLeftRadius: "8px"
                  }}
                >
                  Period
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "right",
                    fontWeight: "700",
                    color: "#333",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    borderBottom: "2px solid #868e96",
                    borderRight: "1px solid #868e96"
                  }}
                >
                  Amount
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "700",
                    color: "#333",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    borderBottom: "2px solid #868e96",
                    borderRight: "1px solid #868e96"
                  }}
                >
                  Reason
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    fontWeight: "700",
                    color: "#333",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    borderBottom: "2px solid #868e96",
                    borderRight: "1px solid #868e96"
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "700",
                    color: "#333",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    borderBottom: "2px solid #868e96",
                    borderRight: "1px solid #868e96"
                  }}
                >
                  Created Date
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "700",
                    color: "#333",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    borderBottom: "2px solid #868e96",
                    borderRight: "1px solid #868e96"
                  }}
                >
                  Approved Date
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "700",
                    color: "#333",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    borderBottom: "2px solid #868e96",
                    borderTopRightRadius: "8px"
                  }}
                >
                  Approver Comments
                </th>
              </tr>
            </thead>
            <tbody>
              {advances.map((advance, index) => {
                const isLastRow = index === advances.length - 1;
                return (
                  <tr key={advance.id} style={{ backgroundColor: "#fff" }}>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: isLastRow ? "none" : "1px solid #868e96",
                        borderRight: "1px solid #868e96",
                        fontSize: "14px",
                        color: "#333",
                        fontWeight: "600",
                        borderBottomLeftRadius: isLastRow ? "8px" : "0"
                      }}
                    >
                      {advance.month}/{advance.year}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: isLastRow ? "none" : "1px solid #868e96",
                        borderRight: "1px solid #868e96",
                        fontSize: "14px",
                        color: "#28a745",
                        fontWeight: "700",
                        textAlign: "right"
                      }}
                    >
                      {formatCurrency(advance.amount)}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: isLastRow ? "none" : "1px solid #868e96",
                        borderRight: "1px solid #868e96",
                        fontSize: "14px",
                        color: "#333",
                        maxWidth: "260px"
                      }}
                    >
                      <div
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {advance.reason || "-"}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: isLastRow ? "none" : "1px solid #868e96",
                        borderRight: "1px solid #868e96",
                        textAlign: "center"
                      }}
                    >
                      {getStatusBadge(advance.approvalStatus)}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: isLastRow ? "none" : "1px solid #868e96",
                        borderRight: "1px solid #868e96",
                        fontSize: "14px",
                        color: "#333"
                      }}
                    >
                      {new Date(advance.createdAt).toLocaleDateString("en-US")}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: isLastRow ? "none" : "1px solid #868e96",
                        borderRight: "1px solid #868e96",
                        fontSize: "14px",
                        color: "#333"
                      }}
                    >
                      {advance.approvedAt
                        ? new Date(advance.approvedAt).toLocaleDateString("en-US")
                        : "-"}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: isLastRow ? "none" : "1px solid #868e96",
                        fontSize: "14px",
                        color: "#333",
                        borderBottomRightRadius: isLastRow ? "8px" : "0"
                      }}
                    >
                      {advance.approverComments || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

