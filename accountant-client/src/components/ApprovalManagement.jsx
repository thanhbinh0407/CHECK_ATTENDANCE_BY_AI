import React, { useState, useEffect } from "react";
import { toastWarning } from "../lib/notify.jsx";

export default function ApprovalManagement() {
  const [activeTab, setActiveTab] = useState("dependents");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReason, setShowReason] = useState({});
  const [rejectReasons, setRejectReasons] = useState({});
  const [viewItem, setViewItem] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [existingDocs, setExistingDocs] = useState([]);
  const [existingCccdDocs, setExistingCccdDocs] = useState([]);

  useEffect(() => {
    fetchPendingItems();
  }, [activeTab]);

  const fetchPendingItems = async () => {
    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      if (!token) return;

      const endpoint = activeTab === "dependents" ? "dependents" : "qualifications";
      const res = await fetch(`${apiBase}/api/${endpoint}?approvalStatus=pending`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok) {
        setItems(data[activeTab === "dependents" ? "dependents" : "qualifications"] || []);
      }
    } catch (error) {
      console.error("Error fetching pending items:", error);
    } finally {
      setLoading(false);
    }
  };

  const approveItem = async (id) => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");
      const endpoint = activeTab === "dependents" ? "dependents" : "qualifications";

      const res = await fetch(`${apiBase}/api/${endpoint}/${id}/approve`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (res.ok) {
        await fetchPendingItems();
      }
    } catch (error) {
      console.error("Error approving item:", error);
    }
  };

  const fetchDependentDocuments = async (dependentId) => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");
      if (!token) return;
      const res = await fetch(`${apiBase}/api/dependents/${dependentId}/documents`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        setExistingDocs([]);
        setExistingCccdDocs([]);
        return;
      }
      const data = await res.json().catch(() => null);
      const docs = data?.documents || data || [];
      const norm = (docs || []).map(d => {
        if (typeof d === 'string') return { url: d, name: d.split('/').pop() };
        const url = d.documentPath || d.url || d.path || d.file || '';
        const name = d.fileName || d.name || d.filename || (url || '').split('/').pop();
        return { url, name, type: d.mimeType || d.type || '' };
      });
      const cccd = data?.cccdFiles || [];
      const normCccd = (cccd || []).map(d => {
        if (typeof d === 'string') return { url: d, name: d.split('/').pop() };
        const url = d.documentPath || d.url || d.path || '';
        const name = d.fileName || d.name || d.filename || (url||'').split('/').pop();
        return { url, name, type: d.mimeType || d.type || '' };
      });
      setExistingDocs(norm);
      setExistingCccdDocs(normCccd);
    } catch (err) {
      console.error('Error fetching dependent documents', err);
      setExistingDocs([]);
      setExistingCccdDocs([]);
    }
  };

  const rejectItem = async (id) => {
    if (!rejectReasons[id]) {
      toastWarning("Please enter a rejection reason.");
      return;
    }

    try {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");
      const endpoint = activeTab === "dependents" ? "dependents" : "qualifications";

      const res = await fetch(`${apiBase}/api/${endpoint}/${id}/reject`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: rejectReasons[id] })
      });

      if (res.ok) {
        await fetchPendingItems();
        setShowReason(prev => ({ ...prev, [id]: false }));
        setRejectReasons(prev => {
          const newReasons = { ...prev };
          delete newReasons[id];
          return newReasons;
        });
      }
    } catch (error) {
      console.error("Error rejecting item:", error);
    }
  };

  const tabStyle = (active) => ({
    padding: "12px 24px",
    backgroundColor: active ? "#2196F3" : "#f0f0f0",
    color: active ? "white" : "#333",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    marginRight: "10px",
    borderRadius: "4px 4px 0 0",
    fontSize: "14px"
  });

  const getDisplayName = (item) => {
    if (item.fullName) return item.fullName;
    if (item.name) return item.name;
    return "Unknown";
  };

  const getDisplayDetail = (item) => {
    if (activeTab === "dependents") {
      return item.relationship ? `Relationship: ${item.relationship}` : "";
    } else {
      return item.type ? `Type: ${item.type}` : "";
    }
  };

  return (
    <div style={{ padding: "20px", backgroundColor: "#f9fafb", minHeight: "100%" }}>
      <div style={{ backgroundColor: "white", borderRadius: "8px", padding: "24px", boxShadow: "0 2px 4px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb" }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "1.75rem", fontWeight: "700", color: "#1e293b" }}>Approval Management</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>Approve dependents and qualifications</p>

      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <button
          onClick={() => setActiveTab("dependents")}
          style={tabStyle(activeTab === "dependents")}
        >
          Dependents
        </button>
        <button
          onClick={() => setActiveTab("qualifications")}
          style={tabStyle(activeTab === "qualifications")}
        >
          Qualifications
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
          <p>No items pending approval</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
            <thead>
              <tr style={{ backgroundColor: "#1e293b", color: "white" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "2px solid rgba(255,255,255,0.2)" }}>Name</th>
                <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "2px solid rgba(255,255,255,0.2)" }}>Details</th>
                <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "2px solid rgba(255,255,255,0.2)" }}>Employee</th>
                <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "2px solid rgba(255,255,255,0.2)" }}>Submitted</th>
                <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: "2px solid rgba(255,255,255,0.2)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <React.Fragment key={item.id}>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px 16px" }}>{getDisplayName(item)}</td>
                    <td style={{ padding: "12px 16px" }}>{getDisplayDetail(item)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {item.User?.name || "N/A"}
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        <strong>{item.User?.employeeCode}</strong>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {new Date(item.createdAt).toLocaleDateString("en-US")}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <button
                        onClick={() => approveItem(item.id)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          marginRight: "5px",
                          fontSize: "12px"
                        }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => { setViewItem(item); setShowViewModal(true); fetchDependentDocuments(item.id); }}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#17a2b8",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          marginLeft: 6
                        }}
                      >
                        View
                      </button>
                      <button
                        onClick={() =>
                          setShowReason(prev => ({
                            ...prev,
                            [item.id]: !prev[item.id]
                          }))
                        }
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#dc2626",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          marginLeft: 6
                        }}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>

                  {showReason[item.id] && (
                    <tr style={{ backgroundColor: "#fff3cd" }}>
                      <td colSpan="5" style={{ padding: "12px" }}>
                        <label style={{ display: "block", marginBottom: "8px" }}>
                          Rejection reason:
                        </label>
                        <textarea
                          value={rejectReasons[item.id] || ""}
                          onChange={(e) =>
                            setRejectReasons(prev => ({
                              ...prev,
                              [item.id]: e.target.value
                            }))
                          }
                          style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "4px",
                            border: "1px solid #ddd",
                            minHeight: "60px",
                            marginBottom: "10px"
                          }}
                          placeholder="Enter rejection reason..."
                        />
                        <button
                          onClick={() => rejectItem(item.id)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#f44336",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            marginRight: "5px"
                          }}
                        >
                          Confirm Reject
                        </button>
                        <button
                          onClick={() =>
                            setShowReason(prev => ({
                              ...prev,
                              [item.id]: false
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
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* View Modal for approvals */}
      {showViewModal && viewItem && (
        <div style={{ position: 'fixed', top:0,left:0,right:0,bottom:0, backgroundColor:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1200 }}>
          <div style={{ width: 820, maxWidth: '95%', background: 'white', borderRadius: 8, padding: 20, maxHeight: '90%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin:0 }}>{viewItem.fullName || viewItem.name}</h3>
              <button onClick={() => { setShowViewModal(false); setViewItem(null); setExistingDocs([]); setExistingCccdDocs([]); }} style={{ border: 'none', background:'transparent', fontSize:20 }}>×</button>
            </div>
            <div style={{ marginTop: 12 }}>
              <p><strong>Date of birth:</strong> {viewItem.dateOfBirth ? new Date(viewItem.dateOfBirth).toLocaleDateString() : '—'}</p>
              <p><strong>Employee:</strong> {viewItem.User?.name || viewItem.userName || '—'}</p>
              <p><strong>Details:</strong> {getDisplayDetail(viewItem)}</p>

              {existingDocs && existingDocs.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong>Dependent Documents</strong>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {existingDocs.map((d, i) => (
                      <div key={i} style={{ width: 140, textAlign: 'center' }}>
                        {/(jpg|jpeg|png|gif)$/i.test(d.name || d.url || '') ? (
                          <a href={d.url} target="_blank" rel="noreferrer"><img src={d.url} alt={d.name} style={{ width: 130, height: 90, objectFit: 'cover', borderRadius: 6 }} /></a>
                        ) : (
                          <a href={d.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', width: 130, height: 90, borderRadius: 6, padding: 8, background: '#fff', textDecoration: 'none', color: '#333' }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>Open</div>
                            <div style={{ fontSize: 11 }}>{d.name}</div>
                          </a>
                        )}
                        <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{d.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {existingCccdDocs && existingCccdDocs.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong>CCCD / ID Documents</strong>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {existingCccdDocs.map((d, i) => (
                      <div key={i} style={{ width: 140, textAlign: 'center' }}>
                        {/(jpg|jpeg|png|gif)$/i.test(d.name || d.url || '') ? (
                          <a href={d.url} target="_blank" rel="noreferrer"><img src={d.url} alt={d.name} style={{ width: 130, height: 90, objectFit: 'cover', borderRadius: 6 }} /></a>
                        ) : (
                          <a href={d.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', width: 130, height: 90, borderRadius: 6, padding: 8, background: '#fff', textDecoration: 'none', color: '#333' }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>Open</div>
                            <div style={{ fontSize: 11 }}>{d.name}</div>
                          </a>
                        )}
                        <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{d.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
