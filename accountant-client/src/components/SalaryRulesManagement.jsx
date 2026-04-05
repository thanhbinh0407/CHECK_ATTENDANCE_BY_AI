import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";

export default function SalaryRulesManagement() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    type: "bonus",
    name: "",
    description: "",
    amountType: "fixed", // "fixed" or "percentage"
    amount: 0,
    triggerType: "custom" // default trigger type
  });

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/salary/rules`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error("Error fetching rules:", error);
      setMessage("Error loading rules");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const url = editingRule 
        ? `${apiBase}/api/salary/rules/${editingRule.id}`
        : `${apiBase}/api/salary/rules`;

      const method = editingRule ? "PUT" : "POST";

      // Prepare data for backend: convert percentage/amount to amount based on amountType
      const requestData = {
        type: formData.type,
        name: formData.name,
        description: formData.description,
        triggerType: formData.triggerType || "custom",
        amountType: formData.amountType,
        amount: formData.amountType === "percentage" 
          ? parseFloat(formData.amount) || 0  // If percentage, use amount field for percentage value
          : parseFloat(formData.amount) || 0, // If fixed, use amount field for VND value
        isActive: true
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestData)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(editingRule ? "Rule updated successfully!" : "Rule created successfully!");
        setEditingRule(null);
        setFormData({ type: "bonus", name: "", description: "", amountType: "fixed", amount: 0, triggerType: "custom" });
        fetchRules();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Could not save rule"));
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ruleId) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/salary/rules/${ruleId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Rule deleted successfully!");
        fetchRules();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Could not delete rule"));
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      type: rule.type,
      name: rule.name,
      description: rule.description || "",
      amountType: rule.amountType || "fixed",
      amount: rule.amount || 0,
      triggerType: rule.triggerType || "custom"
    });
  };

  const handleCancel = () => {
    setEditingRule(null);
    setFormData({ type: "bonus", name: "", description: "", amountType: "fixed", amount: 0, triggerType: "custom" });
  };

  const containerStyle = {
    padding: "20px",
    backgroundColor: theme.colors.background,
    borderRadius: "8px",
    marginBottom: "20px"
  };

  const formStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "15px",
    padding: "20px",
    backgroundColor: theme.colors.card,
    borderRadius: "8px",
    marginBottom: "20px",
    border: `1px solid ${theme.colors.border}`
  };

  const inputStyle = {
    padding: "10px",
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "5px",
    fontSize: "14px",
    fontFamily: "inherit"
  };

  const buttonStyle = {
    padding: "10px 20px",
    backgroundColor: theme.colors.primary,
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "600"
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px"
  };

  const thStyle = {
    backgroundColor: theme.colors.primary,
    color: "white",
    padding: "12px",
    textAlign: "left",
    fontWeight: "600"
  };

  const tdStyle = {
    padding: "12px",
    borderBottom: `1px solid ${theme.colors.border}`
  };

  const messageStyle = {
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "5px",
    backgroundColor: message.includes("Error") ? "#fee" : "#efe",
    color: message.includes("Error") ? "#c33" : "#3c3",
    fontWeight: "600"
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ color: theme.colors.primary, marginBottom: "20px" }}>
        ⚙️ Salary Rules Management
      </h2>

      {message && <div style={messageStyle}>{message}</div>}

      <div style={formStyle}>
        <div style={{ gridColumn: "1 / -1" }}>
          <h3 style={{ marginTop: 0, color: theme.colors.primary }}>
            {editingRule ? "Edit Rule" : "Create New Rule"}
          </h3>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>
            Rule Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            style={inputStyle}
          >
            <option value="bonus">Bonus / Allowance</option>
            <option value="deduction">Deduction</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>
            Rule Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Lunch allowance"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>
            Description
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Rule description"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>
            Amount Type
          </label>
          <select
            value={formData.amountType}
            onChange={(e) => {
              setFormData({ 
                ...formData, 
                amountType: e.target.value,
                amount: 0 // Reset amount when switching type
              });
            }}
            style={inputStyle}
          >
            <option value="fixed">Fixed Amount (VND)</option>
            <option value="percentage">Percentage (%)</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>
            {formData.amountType === "percentage" ? "Percentage (%)" : "Fixed Amount (VND)"}
          </label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            placeholder={formData.amountType === "percentage" ? "0.00" : "0"}
            style={inputStyle}
            step={formData.amountType === "percentage" ? "0.01" : "1000"}
            min="0"
            required
          />
        </div>

        <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px" }}>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.name}
            style={{ ...buttonStyle, opacity: loading || !formData.name ? 0.6 : 1 }}
          >
            {editingRule ? "Update" : "Create"}
          </button>
          {editingRule && (
            <button
              onClick={handleCancel}
              style={{ ...buttonStyle, backgroundColor: "#999" }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Rule Name</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ ...tdStyle, textAlign: "center", color: "#999" }}>
                  No rules yet
                </td>
              </tr>
            ) : (
              rules.map((rule) => {
                // Use amountType from backend to determine display
                const amountType = rule.amountType || 'fixed';
                const amountValue = parseFloat(rule.amount) || 0;
                
                let amountDisplay = "-";
                if (amountValue > 0) {
                  if (amountType === 'percentage') {
                    amountDisplay = `${amountValue.toFixed(2)}%`;
                  } else {
                    amountDisplay = `${amountValue.toLocaleString("vi-VN")} VND`;
                  }
                }
                
                return (
                  <tr key={rule.id}>
                    <td style={tdStyle}>
                      {rule.type === "bonus" ? "↑ Bonus" : "↘ Deduction"}
                    </td>
                    <td style={tdStyle}>{rule.name}</td>
                    <td style={tdStyle}>{rule.description || "-"}</td>
                    <td style={{ ...tdStyle, fontWeight: "600", color: amountDisplay.includes("%") ? theme.colors.primary : "#333" }}>
                      {amountDisplay}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleEdit(rule)}
                        style={{
                          padding: "5px 10px",
                          marginRight: "5px",
                          backgroundColor: theme.colors.primary,
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        style={{
                          padding: "5px 10px",
                          backgroundColor: "#c33",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
