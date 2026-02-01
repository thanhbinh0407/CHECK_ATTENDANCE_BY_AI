import React, { useState, useEffect } from "react";

export default function SalaryApprovalDashboard() {
  const [pendingSalaries, setPendingSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [approvalInProgress, setApprovalInProgress] = useState({});
  const [showRejectReason, setShowRejectReason] = useState({});
  const [rejectReasons, setRejectReasons] = useState({});

  useEffect(() => {
    fetchPendingSalaries();
  }, [selectedMonth, selectedYear]);

  const fetchPendingSalaries = async () => {
    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      if (!token) return;

      const res = await fetch(
        `${apiBase}/api/salary/pending?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const data = await res.json();
      if (res.ok) {
        setPendingSalaries(data.salaries || []);
      }
    } catch (error) {
      console.error("Error fetching pending salaries:", error);
    } finally {
      setLoading(false);
    }
  };

  const approveSalary = async (salaryId) => {
    try {
      setApprovalInProgress(prev => ({ ...prev, [salaryId]: "approving" }));
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      const res = await fetch(`${apiBase}/api/salary/${salaryId}/approve`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (res.ok) {
        await fetchPendingSalaries();
        setApprovalInProgress(prev => ({ ...prev, [salaryId]: "approved" }));
        setTimeout(() => {
          setApprovalInProgress(prev => {
            const newState = { ...prev };
            delete newState[salaryId];
            return newState;
          });
        }, 2000);
      }
    } catch (error) {
      console.error("Error approving salary:", error);
      setApprovalInProgress(prev => ({ ...prev, [salaryId]: "error" }));
    }
  };

  const rejectSalary = async (salaryId) => {
    if (!rejectReasons[salaryId]) {
      alert("Please enter rejection reason");
      return;
    }

    try {
      setApprovalInProgress(prev => ({ ...prev, [salaryId]: "rejecting" }));
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      const res = await fetch(`${apiBase}/api/salary/${salaryId}/reject`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: rejectReasons[salaryId] })
      });

      if (res.ok) {
        await fetchPendingSalaries();
        setShowRejectReason(prev => ({ ...prev, [salaryId]: false }));
        setRejectReasons(prev => {
          const newReasons = { ...prev };
          delete newReasons[salaryId];
          return newReasons;
        });
        setApprovalInProgress(prev => ({ ...prev, [salaryId]: "rejected" }));
        setTimeout(() => {
          setApprovalInProgress(prev => {
            const newState = { ...prev };
            delete newState[salaryId];
            return newState;
          });
        }, 2000);
      }
    } catch (error) {
      console.error("Error rejecting salary:", error);
      setApprovalInProgress(prev => ({ ...prev, [salaryId]: "error" }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount || 0) + " ₫";
  };

  const getStatusBadge = (salaryId) => {
    const status = approvalInProgress[salaryId];
    if (status === "approving")
      return <span style={{ color: "#2196F3" }}>⏳ Approving...</span>;
    if (status === "approved")
      return <span style={{ color: "#4CAF50" }}>✅ Approved</span>;
    if (status === "rejecting")
      return <span style={{ color: "#FF9800" }}>⏳ Rejecting...</span>;
    if (status === "rejected")
      return <span style={{ color: "#f44336" }}>❌ Rejected</span>;
    if (status === "error")
      return <span style={{ color: "#f44336" }}>⚠️ Error</span>;
    return null;
  };

  return (
    <div style={{ padding: "20px", backgroundColor: "#f9fafb", minHeight: "100%" }}>
      <div style={{ backgroundColor: "white", borderRadius: "8px", padding: "24px", boxShadow: "0 2px 4px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb" }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "1.75rem", fontWeight: "700", color: "#1e293b" }}>Approve Salary</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>Approve or reject monthly payroll</p>

      <div style={{ marginTop: "20px", marginBottom: "20px", display: "flex", gap: "15px", alignItems: "center" }}>
        <div>
          <label>Month: </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Month {i + 1}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Year: </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>

        <span style={{ color: "#666" }}>
          {pendingSalaries.length} employee(s) pending approval
        </span>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : pendingSalaries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
          <p>✅ No salaries pending approval</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Employee</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Emp. ID</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Base Salary</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Bonus</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Deduction</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Net Pay</th>
                <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingSalaries.map((salary) => (
                <React.Fragment key={salary.id}>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: "bold" }}>{salary.User?.name || "N/A"}</div>
                      {getStatusBadge(salary.id)}
                    </td>
                    <td style={{ padding: "12px" }}>{salary.User?.employeeCode}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      {formatCurrency(salary.baseSalary)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#16a34a" }}>
                      {formatCurrency(salary.bonus)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#dc2626" }}>
                      {formatCurrency(salary.deduction)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "bold" }}>
                      {formatCurrency(salary.finalSalary)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {!approvalInProgress[salary.id] && (
                        <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
                          <button
                            onClick={() => approveSalary(salary.id)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#28a745",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px"
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              setShowRejectReason(prev => ({
                                ...prev,
                                [salary.id]: !prev[salary.id]
                              }))
                            }
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#f44336",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px"
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {showRejectReason[salary.id] && (
                    <tr style={{ backgroundColor: "#fff3cd", borderBottom: "1px solid #ddd" }}>
                      <td colSpan="7" style={{ padding: "12px" }}>
                        <div style={{ marginBottom: "10px" }}>
                          <label style={{ display: "block", marginBottom: "5px" }}>
                            Rejection reason:
                          </label>
                          <textarea
                            value={rejectReasons[salary.id] || ""}
                            onChange={(e) =>
                              setRejectReasons(prev => ({
                                ...prev,
                                [salary.id]: e.target.value
                              }))
                            }
                            style={{
                              width: "100%",
                              padding: "8px",
                              borderRadius: "4px",
                              border: "1px solid #ddd",
                              minHeight: "60px"
                            }}
                            placeholder="Enter rejection reason..."
                          />
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            onClick={() => rejectSalary(salary.id)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#f44336",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer"
                            }}
                          >
                            Confirm Reject
                          </button>
                          <button
                            onClick={() =>
                              setShowRejectReason(prev => ({
                                ...prev,
                                [salary.id]: false
                              }))
                            }
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#999",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer"
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
