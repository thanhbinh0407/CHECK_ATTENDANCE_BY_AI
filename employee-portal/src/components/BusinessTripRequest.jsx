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
        setMessage("✅ Business trip request submitted successfully!");
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
        setMessage(`❌ Error: ${data.message || "Unable to create request"}`);
      }
    } catch (error) {
      console.error("Error creating business trip request:", error);
      setMessage(`❌ Error: ${error.message}`);
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
      pending: "PENDING",
      approved: "APPROVED",
      rejected: "REJECTED"
    };
    const style = styles[status] || styles.pending;
    const label = labels[status] || status.toUpperCase();
    
    return (
      <span style={{
        backgroundColor: style.backgroundColor,
        color: style.color,
        padding: "5px 14px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: "600",
        letterSpacing: "0.5px",
        display: "inline-block"
      }}>
        {label}
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
              🧳 Business Trip Request
            </h2>
            <p style={{
              margin: 0,
              color: "#666",
              fontSize: "14px"
            }}>
              Create and track business trip requests
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
            + Create New Request
          </button>
        </div>
      </div>

      {message && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
          <div style={{
            display: "inline-block",
            padding: "10px 16px",
            backgroundColor: message.includes("✅") ? "#d4edda" : "#f8d7da",
            border: `2px solid ${message.includes("✅") ? "#c3e6cb" : "#f5c6cb"}`,
            borderRadius: "999px",
            color: message.includes("✅") ? "#155724" : "#721c24",
            fontSize: "14px",
            fontWeight: "500",
            textAlign: "center"
          }}>
            {message}
          </div>
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
              maxWidth: "700px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{
              padding: "24px 32px",
              background: "linear-gradient(135deg, #A2B9ED 0%, #8BA3E0 100%)",
              color: "#fff",
              borderBottom: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "16px 16px 0 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 4px 15px rgba(162, 185, 237, 0.3)"
            }}>
              <div>
                <h3 style={{
                  margin: "0 0 4px 0",
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "#fff",
                  letterSpacing: "-0.5px"
                }}>
                  Create Business Trip Request
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.9)",
                  fontWeight: "500"
                }}>
                  Submit a new request for business travel
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  borderRadius: "8px",
                  width: "40px",
                  height: "40px",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  transform: "rotate(0deg)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)";
                  e.currentTarget.style.transform = "rotate(90deg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)";
                  e.currentTarget.style.transform = "rotate(0deg)";
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: "32px" }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "10px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#333"
                }}>
                  📅 Trip Duration *
                </label>
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "6px", fontWeight: "500" }}>Start Date</div>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                      style={{
                        width: "100%",
                        padding: "14px",
                        border: "2px solid #e0e0e0",
                        borderRadius: "10px",
                        fontSize: "15px",
                        background: "#f8f9fa",
                        transition: "all 0.3s",
                        outline: "none"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.border = "2px solid #A2B9ED";
                        e.currentTarget.style.background = "#fff";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.border = "2px solid #e0e0e0";
                        e.currentTarget.style.background = "#f8f9fa";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "6px", fontWeight: "500" }}>End Date</div>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                      min={formData.startDate}
                      style={{
                        width: "100%",
                        padding: "14px",
                        border: "2px solid #e0e0e0",
                        borderRadius: "10px",
                        fontSize: "15px",
                        background: "#f8f9fa",
                        transition: "all 0.3s",
                        outline: "none"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.border = "2px solid #A2B9ED";
                        e.currentTarget.style.background = "#fff";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.border = "2px solid #e0e0e0";
                        e.currentTarget.style.background = "#f8f9fa";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                  {calculateDays() > 0 && (
                    <div style={{
                      padding: "14px 16px",
                      backgroundColor: "#e3f2fd",
                      borderRadius: "10px",
                      fontSize: "15px",
                      fontWeight: "700",
                      color: "#17a2b8",
                      whiteSpace: "nowrap",
                      minWidth: "80px",
                      textAlign: "center"
                    }}>
                      {calculateDays()} {calculateDays() === 1 ? "day" : "days"}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "10px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#333"
                }}>
                  📍 Destination *
                </label>
                <select
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    padding: "14px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "10px",
                    fontSize: "15px",
                    background: "#f8f9fa",
                    transition: "all 0.3s",
                    outline: "none",
                    cursor: "pointer"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "2px solid #A2B9ED";
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "2px solid #e0e0e0";
                    e.currentTarget.style.background = "#f8f9fa";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="">Select destination (province/city)</option>
                  {vietnamProvinces.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "10px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#333"
                }}>
                  📝 Purpose *
                </label>
                <textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  required
                  placeholder="Describe the purpose and work to be performed..."
                  rows="4"
                  style={{
                    width: "100%",
                    padding: "14px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "10px",
                    fontSize: "15px",
                    resize: "vertical",
                    background: "#f8f9fa",
                    transition: "all 0.3s",
                    outline: "none",
                    fontFamily: "inherit"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "2px solid #A2B9ED";
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "2px solid #e0e0e0";
                    e.currentTarget.style.background = "#f8f9fa";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "10px",
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#333"
                  }}>
                    🚗 Transport Type
                  </label>
                  <select
                    value={formData.transportType}
                    onChange={(e) => setFormData({ ...formData, transportType: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "14px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "10px",
                      fontSize: "15px",
                      background: "#f8f9fa",
                      transition: "all 0.3s",
                      outline: "none",
                      cursor: "pointer"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.border = "2px solid #A2B9ED";
                      e.currentTarget.style.background = "#fff";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.border = "2px solid #e0e0e0";
                      e.currentTarget.style.background = "#f8f9fa";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <option value="">Select transport</option>
                    <option value="plane">✈️ Plane</option>
                    <option value="train">🚂 Train</option>
                    <option value="bus">🚌 Bus</option>
                    <option value="car">🚗 Car</option>
                    <option value="other">🚲 Other</option>
                  </select>
                </div>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "10px",
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#333"
                  }}>
                    💰 Estimated Cost (VND)
                  </label>
                  <input
                    type="number"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                    min="0"
                    step="1000"
                    placeholder="Enter estimated cost"
                    style={{
                      width: "100%",
                      padding: "14px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "10px",
                      fontSize: "15px",
                      background: "#f8f9fa",
                      transition: "all 0.3s",
                      outline: "none"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.border = "2px solid #A2B9ED";
                      e.currentTarget.style.background = "#fff";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.border = "2px solid #e0e0e0";
                      e.currentTarget.style.background = "#f8f9fa";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "10px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#333"
                }}>
                  🏨 Accommodation (Optional)
                </label>
                <input
                  type="text"
                  value={formData.accommodation}
                  onChange={(e) => setFormData({ ...formData, accommodation: e.target.value })}
                  placeholder="Hotel name or accommodation"
                  style={{
                    width: "100%",
                    padding: "14px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "10px",
                    fontSize: "15px",
                    background: "#f8f9fa",
                    transition: "all 0.3s",
                    outline: "none"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "2px solid #A2B9ED";
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "2px solid #e0e0e0";
                    e.currentTarget.style.background = "#f8f9fa";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div style={{ 
                display: "flex", 
                gap: "16px", 
                paddingTop: "24px",
                borderTop: "2px solid #f0f0f0",
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
                    fontWeight: "700",
                    fontSize: "15px",
                    transition: "all 0.3s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#5a6268";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(108, 117, 125, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#6c757d";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  ✏️ Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || calculateDays() <= 0}
                  style={{
                    flex: 1,
                    padding: "14px 32px",
                    background: loading || calculateDays() <= 0 
                      ? "linear-gradient(135deg, #ccc 0%, #aaa 100%)" 
                      : "linear-gradient(135deg, #A2B9ED 0%, #8BA3E0 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "10px",
                    cursor: loading || calculateDays() <= 0 ? "not-allowed" : "pointer",
                    fontWeight: "700",
                    fontSize: "15px",
                    transition: "all 0.3s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: loading || calculateDays() <= 0 
                      ? "none" 
                      : "0 4px 15px rgba(162, 185, 237, 0.3)"
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && calculateDays() > 0) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 20px rgba(162, 185, 237, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && calculateDays() > 0) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 15px rgba(162, 185, 237, 0.3)";
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
              borderTop: "4px solid #17a2b8",
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
        ) : requests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
            <div style={{ fontSize: "64px", marginBottom: "16px", opacity: 0.3 }}>🧳</div>
            <p style={{
              margin: "0 0 8px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "#666"
            }}>
              No business trip requests yet
            </p>
            <p style={{ margin: 0, fontSize: "14px", color: "#999" }}>
              Click "Create New Request" to get started
            </p>
          </div>
        ) : (
          <table style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "0",
            border: "1px solid #868e96",
            borderRadius: "8px",
            overflow: "hidden"
          }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                <th style={{
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
                }}>
                  Destination
                </th>
                <th style={{
                  padding: "16px",
                  textAlign: "left",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderRight: "1px solid #868e96"
                }}>
                  Start Date
                </th>
                <th style={{
                  padding: "16px",
                  textAlign: "left",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderRight: "1px solid #868e96"
                }}>
                  End Date
                </th>
                <th style={{
                  padding: "16px",
                  textAlign: "center",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderRight: "1px solid #868e96"
                }}>
                  Duration (Days)
                </th>
                <th style={{
                  padding: "16px",
                  textAlign: "left",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderRight: "1px solid #868e96"
                }}>
                  Purpose
                </th>
                <th style={{
                  padding: "16px",
                  textAlign: "left",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderRight: "1px solid #868e96"
                }}>
                  Transport
                </th>
                <th style={{
                  padding: "16px",
                  textAlign: "right",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderRight: "1px solid #868e96"
                }}>
                  Est. Cost
                </th>
                <th style={{
                  padding: "16px",
                  textAlign: "left",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderRight: "1px solid #868e96"
                }}>
                  Accommodation
                </th>
                <th style={{
                  padding: "16px",
                  textAlign: "center",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderRight: "1px solid #868e96"
                }}>
                  Status
                </th>
                <th style={{
                  padding: "16px",
                  textAlign: "left",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderRight: "1px solid #868e96"
                }}>
                  Created Date
                </th>
                <th style={{
                  padding: "16px",
                  textAlign: "left",
                  fontWeight: "700",
                  color: "#333",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  borderBottom: "2px solid #868e96",
                  borderTopRightRadius: "8px"
                }}>
                  Approved Date
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request, index) => {
                const startDate = new Date(request.startDate);
                const endDate = new Date(request.endDate);
                const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                const isLastRow = index === requests.length - 1;

                const renderTransport = () => {
                  if (!request.transportType) return "-";
                  switch (request.transportType) {
                    case "plane":
                      return "Plane";
                    case "train":
                      return "Train";
                    case "bus":
                      return "Bus";
                    case "car":
                      return "Car";
                    default:
                      return request.transportType;
                  }
                };

                return (
                  <tr key={request.id} style={{ backgroundColor: "#fff" }}>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      color: "#333",
                      fontWeight: "600",
                      borderBottomLeftRadius: isLastRow ? "8px" : "0"
                    }}>
                      {request.destination}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      color: "#333"
                    }}>
                      {new Date(request.startDate).toLocaleDateString("en-US")}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      color: "#333"
                    }}>
                      {new Date(request.endDate).toLocaleDateString("en-US")}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      fontWeight: "700",
                      textAlign: "center",
                      color: "#17a2b8"
                    }}>
                      {days} days
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      color: "#333",
                      maxWidth: "260px"
                    }}>
                      <div style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {request.purpose || "-"}
                      </div>
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      color: "#333"
                    }}>
                      {renderTransport()}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      color: "#f57c00",
                      fontWeight: "600",
                      textAlign: "right"
                    }}>
                      {request.estimatedCost ? formatCurrency(request.estimatedCost) : "-"}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      color: "#333"
                    }}>
                      {request.accommodation || "-"}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      textAlign: "center"
                    }}>
                      {getStatusBadge(request.approvalStatus)}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      color: "#333"
                    }}>
                      {new Date(request.createdAt).toLocaleDateString("en-US")}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      fontSize: "14px",
                      color: "#333",
                      borderBottomRightRadius: isLastRow ? "8px" : "0"
                    }}>
                      {request.approvedAt
                        ? new Date(request.approvedAt).toLocaleDateString("en-US")
                        : "-"}
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

