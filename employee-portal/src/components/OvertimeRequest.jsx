import React, { useState, useEffect } from "react";

export default function OvertimeRequest({ userId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: "",
    endTime: "",
    reason: "",
    projectName: ""
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

      const res = await fetch(`${apiBase}/api/overtime-requests?userId=${userId}`, {
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
      console.error("Error fetching overtime requests:", error);
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

      const res = await fetch(`${apiBase}/api/overtime-requests`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Overtime request submitted successfully!");
        setShowForm(false);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          startTime: "",
          endTime: "",
          reason: "",
          projectName: ""
        });
        fetchRequests();
        setTimeout(() => setMessage(""), 5000);
      } else {
        setMessage(`❌ Error: ${data.message || "Unable to create request"}`);
      }
    } catch (error) {
      console.error("Error creating overtime request:", error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = () => {
    if (!formData.startTime || !formData.endTime) return 0;
    const start = new Date(`${formData.date}T${formData.startTime}`);
    const end = new Date(`${formData.date}T${formData.endTime}`);
    const hours = (end - start) / (1000 * 60 * 60);
    return hours > 0 ? hours : 0;
  };

  // Chuyển số giờ thập phân (vd: 12.05) thành định dạng HH:MM (vd: 12:03)
  const formatHoursToHHMM = (value) => {
    if (value == null || Number.isNaN(value)) return "-";
    const hoursNumber = parseFloat(value);
    if (!Number.isFinite(hoursNumber) || hoursNumber <= 0) return "00:00";

    const totalMinutes = Math.round(hoursNumber * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${hh}:${mm}`;
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
      <span
        style={{
          ...style,
          padding: "5px 14px",
          borderRadius: "4px",
          fontSize: "11px",
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}
      >
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
              ⏱️ Overtime Request
            </h2>
            <p style={{
              margin: 0,
              color: "#666",
              fontSize: "14px"
            }}>
              Create and track overtime requests
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: "12px 24px",
              backgroundColor: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "14px",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1565c0"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#1976d2"}
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
                  Create Overtime Request
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.9)",
                  fontWeight: "500"
                }}>
                  Submit a new request for overtime work
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
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#333"
                }}>
                  Overtime Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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

              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#333"
                }}>
                  Time *
                </label>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    style={{
                      flex: 1,
                      padding: "12px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "14px"
                    }}
                  />
                  <span style={{ fontSize: "18px", fontWeight: "600", color: "#666" }}>→</span>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    style={{
                      flex: 1,
                      padding: "12px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "14px"
                    }}
                  />
                  {calculateHours() > 0 && (
                    <div style={{
                      padding: "8px 12px",
                      backgroundColor: "#e3f2fd",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1976d2"
                    }}>
                      {formatHoursToHHMM(calculateHours())}
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
                  Reason / Work Description *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  placeholder="Describe the work that needs to be done during overtime..."
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

              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#333"
                }}>
                  Project Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  placeholder="Project name or related work"
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.startTime || !formData.endTime || calculateHours() <= 0}
                  style={{
                    flex: 1,
                    padding: "14px",
                    backgroundColor: "#1976d2",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "700",
                    fontSize: "14px",
                    opacity: (loading || !formData.startTime || !formData.endTime || calculateHours() <= 0) ? 0.6 : 1
                  }}
                >
                  {loading ? "Submitting..." : "Submit Request"}
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
        ) : requests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
            <div style={{ fontSize: "64px", marginBottom: "16px", opacity: 0.3 }}>⏱️</div>
            <p style={{
              margin: "0 0 8px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "#666"
            }}>
              No overtime requests yet
            </p>
            <p style={{ margin: 0, fontSize: "14px", color: "#999" }}>
              Click "Create New Request" to start
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
                  Date
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
                  Start Time
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
                  End Time
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
                  Total Hours
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
                  Reason
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
                  Project
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
                  borderTopRightRadius: "8px"
                }}>
                  Created Date
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request, index) => {
                const isLastRow = index === requests.length - 1;
                return (
                  <tr key={request.id} style={{ backgroundColor: "#fff" }}>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      color: "#333",
                      borderBottomLeftRadius: isLastRow ? "8px" : "0"
                    }}>
                      {new Date(request.date).toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      color: "#333",
                      fontWeight: "600"
                    }}>
                      {request.startTime}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      color: "#333",
                      fontWeight: "600"
                    }}>
                      {request.endTime}
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      fontWeight: "700",
                      textAlign: "center",
                      color: "#1976d2"
                    }}>
                      {formatHoursToHHMM(request.totalHours || 0)}
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
                        {request.reason || "-"}
                      </div>
                    </td>
                    <td style={{
                      padding: "16px",
                      borderBottom: isLastRow ? "none" : "1px solid #868e96",
                      borderRight: "1px solid #868e96",
                      fontSize: "14px",
                      color: "#333"
                    }}>
                      {request.projectName || "-"}
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
                      fontSize: "14px",
                      color: "#333",
                      borderBottomRightRadius: isLastRow ? "8px" : "0"
                    }}>
                      {new Date(request.createdAt).toLocaleDateString("en-US")}
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

