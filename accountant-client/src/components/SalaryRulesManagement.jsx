import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";
import { toastConfirm } from "../lib/notify.jsx";

const TRIGGER_OPTIONS = [
  { value: "late", label: "Late arrival" },
  { value: "early_leave", label: "Early departure" },
  { value: "absent", label: "Absence (missing workdays)" },
  { value: "overtime", label: "Overtime (hours)" },
  { value: "full_attendance", label: "Full attendance bonus" },
  { value: "custom", label: "Other (custom — e.g. \"seniority\" in rule name)" }
];

function suggestedTypeForTrigger(triggerType) {
  if (triggerType === "late" || triggerType === "early_leave" || triggerType === "absent") {
    return "deduction";
  }
  if (triggerType === "overtime" || triggerType === "full_attendance") {
    return "bonus";
  }
  return null;
}

/** Threshold field label / placeholder / note (matches salaryCalculationService). */
function getThresholdFieldMeta(triggerType) {
  switch (triggerType) {
    case "late":
      return {
        label: "Threshold — minimum late count (optional)",
        placeholder: "Leave empty: applies from 1 late event onward",
        disabled: false,
        foot: "Fixed VND: amount × (late count, or floor(count / N) if N is set). Percentage: threshold only gates eligibility; amount = % × base salary once (not multiplied by late count)."
      };
    case "early_leave":
      return {
        label: "Threshold — minimum early-leave count (optional)",
        placeholder: "Leave empty: applies from 1 early leave onward",
        disabled: false,
        foot: "Same formula as late: use early-leave count for the month instead of late count."
      };
    case "absent":
      return {
        label: "Threshold — minimum absence days (optional)",
        placeholder: "Leave empty: 1 absence day is enough to qualify",
        disabled: false,
        foot: "Absence = weekday in the month with no IN punch and not covered by approved leave."
      };
    case "overtime":
      return {
        label: "Threshold — minimum total OT hours in month (optional)",
        placeholder: "Leave empty: any OT in the month qualifies",
        disabled: false,
        foot: "OT hours come from overtime attendance logs (summed for the month)."
      };
    case "full_attendance":
      return {
        label: "Threshold — minimum working days in calendar month (optional)",
        placeholder: "Leave empty: only the full-attendance condition applies",
        disabled: false,
        foot: "Backend checks: scheduled working days in the month ≥ N. Usually leave empty."
      };
    case "custom":
      return {
        label: "Threshold — not used for custom (seniority)",
        placeholder: "—",
        disabled: true,
        foot: "Custom rules only run when the rule name contains \"seniority\"; threshold is ignored."
      };
    default:
      return {
        label: "Threshold",
        placeholder: "",
        disabled: false,
        foot: ""
      };
  }
}

/** Copy matches face-attendance-backend/src/services/salaryCalculationService.js */
function getRuleHelp(triggerType, amountType) {
  const pct = amountType === "percentage";
  const base = "employee base salary (baseSalary)";

  const lateEarlyWhen =
    "Matching attendance logs exist in the month. If threshold N is set: runs only when event count ≥ N.";
  const lateEarlyThreshold =
    "Unit: occurrences. Empty = applies from at least 1 occurrence. Fixed VND with N: multiplier = floor(count / N); without N: multiply by count.";
  const lateEarlyAmountPct =
    `Single charge: (${base}) × (% / 100). Not multiplied by late/early count.`;
  const lateEarlyAmountFix =
    "VND × (count) with no threshold; VND × floor(count / N) when threshold N is set.";

  switch (triggerType) {
    case "late":
      return {
        whenApply: `Late: ${lateEarlyWhen}`,
        thresholdMeaning: lateEarlyThreshold,
        amountFormula: pct ? lateEarlyAmountPct : lateEarlyAmountFix
      };
    case "early_leave":
      return {
        whenApply: `Early leave: ${lateEarlyWhen}`,
        thresholdMeaning: lateEarlyThreshold,
        amountFormula: pct ? lateEarlyAmountPct : lateEarlyAmountFix
      };
    case "absent":
      return {
        whenApply:
          "Absence days in the month > 0 (weekday without IN, excluding days covered by approved leave). If threshold N: only when absence days ≥ N.",
        thresholdMeaning: "Unit: absence days. Empty = from 1 absence day.",
        amountFormula: pct
          ? `(${base}) × (% / 100) × (absence days).`
          : "VND × (absence days)."
      };
    case "overtime":
      return {
        whenApply:
          "Total overtime hours in the month > 0. If threshold N: only when total OT hours ≥ N.",
        thresholdMeaning: "Unit: hours (decimal). Empty = any OT qualifies.",
        amountFormula: pct
          ? `(${base}) × (% / 100) × (total OT hours).`
          : "VND × (total OT hours) — per hour."
      };
    case "full_attendance":
      return {
        whenApply:
          "Full coverage (present or approved leave) on all working weekdays, no late, no early leave, no absence. If threshold N: also require scheduled working days in the month ≥ N.",
        thresholdMeaning:
          "Unit: working days in the calendar month. Usually leave empty.",
        amountFormula: pct ? `(${base}) × (% / 100), once.` : "One fixed VND amount, once."
      };
    case "custom":
      return {
        whenApply:
          "Only when rule name contains \"seniority\" (case-insensitive) and tenure is at least 1 year from hire date.",
        thresholdMeaning: "Not used by the current backend logic.",
        amountFormula: pct
          ? `(${base}) × (% / 100) × (tier 1–4 from tenure years).`
          : "VND × (tier 1–4 from tenure years)."
      };
    default:
      return { whenApply: "", thresholdMeaning: "", amountFormula: "" };
  }
}

function labelForTrigger(value) {
  const o = TRIGGER_OPTIONS.find((t) => t.value === value);
  return o ? o.label : value;
}

function emptyForm() {
  return {
    type: "deduction",
    name: "",
    description: "",
    amountType: "fixed",
    amount: 0,
    triggerType: "late",
    threshold: "",
    priority: 0,
    isActive: true
  };
}

export default function SalaryRulesManagement() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState(() => emptyForm());

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

      const thresholdRaw = formData.threshold;
      let threshold = null;
      if (thresholdRaw !== "" && thresholdRaw !== undefined && thresholdRaw !== null) {
        const n = parseInt(String(thresholdRaw), 10);
        threshold = Number.isFinite(n) && n > 0 ? n : null;
      }

      const priority = parseInt(String(formData.priority), 10);
      const priorityVal = Number.isFinite(priority) ? priority : 0;

      const requestData = {
        type: formData.type,
        name: formData.name,
        description: formData.description,
        triggerType: formData.triggerType || "custom",
        amountType: formData.amountType,
        amount:
          formData.amountType === "percentage"
            ? parseFloat(formData.amount) || 0
            : parseFloat(formData.amount) || 0,
        threshold,
        priority: priorityVal,
        isActive: Boolean(formData.isActive)
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
        setFormData(emptyForm());
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
    const ok = await toastConfirm({ message: "Are you sure you want to delete this rule?" });
    if (!ok) return;

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
      amount: rule.amount != null ? Number(rule.amount) : 0,
      triggerType: rule.triggerType || "custom",
      threshold: rule.threshold != null && rule.threshold !== "" ? String(rule.threshold) : "",
      priority: rule.priority != null ? Number(rule.priority) : 0,
      isActive: rule.isActive !== false
    });
  };

  const handleCancel = () => {
    setEditingRule(null);
    setFormData(emptyForm());
  };

  const onTriggerChange = (triggerType) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        triggerType,
        threshold: triggerType === "custom" ? "" : prev.threshold
      };
      const suggested = suggestedTypeForTrigger(triggerType);
      if (suggested) next.type = suggested;
      return next;
    });
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

  const explainBoxStyle = {
    gridColumn: "1 / -1",
    fontSize: "13px",
    color: "#333",
    lineHeight: 1.55,
    padding: "12px 14px",
    backgroundColor: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "6px",
    marginTop: "4px"
  };

  const explainListStyle = { margin: "6px 0 0 0", paddingLeft: "18px" };

  const thresholdMeta = getThresholdFieldMeta(formData.triggerType);
  const ruleHelp = getRuleHelp(formData.triggerType, formData.amountType);

  return (
    <div style={containerStyle}>
      <h2 style={{ color: theme.colors.primary, marginBottom: "20px" }}>
        ⚙️ Salary Rules Management
      </h2>

      {message && <div style={messageStyle}>{message}</div>}

      <details
        style={{
          marginBottom: "16px",
          padding: "12px 14px",
          backgroundColor: theme.colors.card,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: "8px",
          fontSize: "14px"
        }}
      >
        <summary style={{ cursor: "pointer", fontWeight: "600", color: theme.colors.primary }}>
          Quick guide — how rules affect payroll
        </summary>
        <ul style={{ margin: "10px 0 0 0", paddingLeft: "20px", color: "#444", lineHeight: 1.55 }}>
          <li>
            <strong>Trigger</strong> decides <em>when</em> the rule is evaluated (attendance / OT / absence…).
            <strong> Rule type</strong> decides whether the amount is added as <em>bonus</em> or <em>deduction</em>.
          </li>
          <li>
            After saving a rule, run <strong>salary calculation again</strong> for the month/employee so salary records reflect it.
          </li>
          <li>
            <strong>Custom</strong>: only special handling when the <strong>rule name contains &quot;seniority&quot;</strong> (tenure allowance).
          </li>
          <li>
            The <strong>&quot;Notes for selected trigger + amount type&quot;</strong> block matches the backend formulas—read it before entering amounts.
          </li>
        </ul>
      </details>

      <form style={formStyle} onSubmit={handleSubmit}>
        <div style={{ gridColumn: "1 / -1" }}>
          <h3 style={{ marginTop: 0, color: theme.colors.primary }}>
            {editingRule ? "Edit Rule" : "Create New Rule"}
          </h3>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>
            Condition (trigger)
          </label>
          <select
            value={formData.triggerType}
            onChange={(e) => onTriggerChange(e.target.value)}
            style={inputStyle}
          >
            {TRIGGER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>
            Rule type (bonus / deduction)
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            style={inputStyle}
          >
            <option value="bonus">Bonus / Allowance</option>
            <option value="deduction">Deduction</option>
          </select>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
            Changing trigger suggests a matching rule type; you can still override manually.
          </div>
        </div>

        <div style={explainBoxStyle}>
          <strong style={{ color: theme.colors.primary }}>Notes for selected trigger + amount type</strong>
          <ul style={explainListStyle}>
            <li>
              <strong>When it applies:</strong> {ruleHelp.whenApply}
            </li>
            <li>
              <strong>Threshold:</strong> {ruleHelp.thresholdMeaning}
            </li>
            <li>
              <strong>Rule amount:</strong> {ruleHelp.amountFormula}
            </li>
          </ul>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>
            Rule Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Late arrival penalty"
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
            {thresholdMeta.label}
          </label>
          <input
            type="number"
            value={formData.threshold}
            onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
            placeholder={thresholdMeta.placeholder}
            style={{ ...inputStyle, opacity: thresholdMeta.disabled ? 0.55 : 1 }}
            min="1"
            step="1"
            disabled={thresholdMeta.disabled}
          />
          {thresholdMeta.foot && (
            <div style={{ fontSize: "12px", color: "#666", marginTop: "6px", lineHeight: 1.45 }}>
              {thresholdMeta.foot}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>
            Priority
          </label>
          <input
            type="number"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value, 10) || 0 })}
            placeholder="0"
            style={inputStyle}
          />
          <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
            Higher numbers sort first when rules are loaded and applied.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            id="rule-active"
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          />
          <label htmlFor="rule-active" style={{ fontWeight: "600", cursor: "pointer" }}>
            Rule is active
          </label>
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
                amount: 0
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

        <div
          style={{
            gridColumn: "1 / -1",
            fontSize: "12px",
            color: "#444",
            lineHeight: 1.5,
            padding: "8px 10px",
            backgroundColor: theme.colors.background,
            borderRadius: "5px",
            border: `1px dashed ${theme.colors.border}`
          }}
        >
          <strong>Amount summary ({formData.amountType === "percentage" ? "% of base salary" : "VND"}):</strong>{" "}
          {ruleHelp.amountFormula}
        </div>

        <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px" }}>
          <button
            type="submit"
            disabled={loading || !formData.name}
            style={{ ...buttonStyle, opacity: loading || !formData.name ? 0.6 : 1 }}
          >
            {editingRule ? "Update" : "Create"}
          </button>
          {editingRule && (
            <button
              type="button"
              onClick={handleCancel}
              style={{ ...buttonStyle, backgroundColor: "#999" }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Trigger</th>
              <th style={thStyle}>Rule Name</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Threshold</th>
              <th style={thStyle}>Priority</th>
              <th style={thStyle}>Active</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ ...tdStyle, textAlign: "center", color: "#999" }}>
                  No rules yet
                </td>
              </tr>
            ) : (
              rules.map((rule) => {
                const amountType = rule.amountType || "fixed";
                const amountValue = parseFloat(rule.amount) || 0;

                let amountDisplay = "-";
                if (amountValue > 0) {
                  if (amountType === "percentage") {
                    amountDisplay = `${amountValue.toFixed(2)}%`;
                  } else {
                    amountDisplay = `${amountValue.toLocaleString("en-US")} VND`;
                  }
                }

                return (
                  <tr key={rule.id}>
                    <td style={tdStyle}>
                      {rule.type === "bonus" ? "↑ Bonus" : "↘ Deduction"}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "13px", maxWidth: "220px" }}>
                      {labelForTrigger(rule.triggerType)}
                    </td>
                    <td style={tdStyle}>{rule.name}</td>
                    <td style={tdStyle}>{rule.description || "-"}</td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: "600",
                        color: amountDisplay.includes("%") ? theme.colors.primary : "#333"
                      }}
                    >
                      {amountDisplay}
                    </td>
                    <td style={tdStyle}>{rule.threshold != null ? rule.threshold : "—"}</td>
                    <td style={tdStyle}>{rule.priority ?? 0}</td>
                    <td style={tdStyle}>{rule.isActive !== false ? "Yes" : "No"}</td>
                    <td style={tdStyle}>
                      <button
                        type="button"
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
                        type="button"
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
