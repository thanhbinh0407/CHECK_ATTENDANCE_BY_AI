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

function getThresholdFieldMeta(triggerType) {
  switch (triggerType) {
    case "late":
      return {
        label: "Threshold — minimum late count (optional)",
        placeholder: "Leave empty: applies from 1 late event onward",
        disabled: false,
        short: "Optional minimum number of late events before the rule runs.",
        foot: "Fixed VND: amount × (late count, or floor(count / N) if N is set). Percentage: threshold only gates eligibility; amount = % × base salary once (not multiplied by late count)."
      };
    case "early_leave":
      return {
        label: "Threshold — minimum early-leave count (optional)",
        placeholder: "Leave empty: applies from 1 early leave onward",
        disabled: false,
        short: "Optional minimum early-leave count.",
        foot: "Same formula as late: use early-leave count for the month instead of late count."
      };
    case "absent":
      return {
        label: "Threshold — minimum absence days (optional)",
        placeholder: "Leave empty: 1 absence day is enough to qualify",
        disabled: false,
        short: "Optional minimum absence days.",
        foot: "Absence = weekday in the month with no IN punch and not covered by approved leave."
      };
    case "overtime":
      return {
        label: "Threshold — minimum total OT hours in month (optional)",
        placeholder: "Leave empty: any OT in the month qualifies",
        disabled: false,
        short: "Optional minimum OT hours for the rule to apply.",
        foot: "OT hours come from overtime attendance logs (summed for the month)."
      };
    case "full_attendance":
      return {
        label: "Threshold — minimum working days in calendar month (optional)",
        placeholder: "Leave empty: only the full-attendance condition applies",
        disabled: false,
        short: "Usually leave empty.",
        foot: "Backend checks: scheduled working days in the month ≥ N. Usually leave empty."
      };
    case "custom":
      return {
        label: "Threshold — not used for custom rules",
        placeholder: "—",
        disabled: true,
        short: "Not used for custom rules.",
        foot: "Backend matches rule name (case-insensitive): seniority, performance, technical, management. Threshold is ignored."
      };
    default:
      return {
        label: "Threshold",
        placeholder: "",
        disabled: false,
        short: "",
        foot: ""
      };
  }
}

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
          "Rule name keyword: \"seniority\" (tier 1–4 from tenure years). \"performance\" (monthly %/fixed). \"technical\" (Engineering / KT dept). \"management\" (job title TP or PTP).",
        thresholdMeaning: "Not used.",
        amountFormula: pct
          ? `Seniority: (${base}) × (% / 100) × tier. Performance/Management: (${base}) × (% / 100) once. Technical: fixed VND or % for Engineering only.`
          : "Seniority: fixed × tier. Performance/Management: fixed once where applicable. Technical: fixed VND for Engineering."
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

const C = {
  page: {
    padding: "24px",
    maxWidth: "1100px",
    margin: "0 auto"
  },
  title: {
    fontSize: "1.35rem",
    fontWeight: "700",
    color: theme.colors.primary,
    margin: "0 0 8px 0",
    letterSpacing: "-0.02em"
  },
  subtitle: {
    fontSize: "0.875rem",
    color: theme.neutral?.gray600 || "#4b5563",
    marginBottom: "20px",
    lineHeight: 1.5
  },
  card: {
    backgroundColor: theme.colors.card || theme.neutral?.white || "#fff",
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "12px",
    marginBottom: "20px",
    overflow: "hidden"
  },
  cardHeader: {
    padding: "14px 18px",
    borderBottom: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.neutral?.gray50 || "#f9fafb",
    fontWeight: "600",
    fontSize: "0.95rem",
    color: theme.colors.primary
  },
  cardBody: {
    padding: "18px"
  },
  sectionLabel: {
    fontSize: "0.7rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: theme.neutral?.gray500 || "#6b7280",
    marginBottom: "10px"
  },
  input: {
    padding: "10px 12px",
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box"
  },
  btnPrimary: {
    padding: "10px 20px",
    backgroundColor: theme.colors.secondary || theme.accent?.main || "#0d9488",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px"
  },
  btnGhost: {
    padding: "10px 18px",
    backgroundColor: "transparent",
    color: theme.colors.primary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px"
  },
  btnDanger: {
    padding: "6px 12px",
    backgroundColor: theme.error?.main || "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600"
  },
  btnSm: {
    padding: "6px 12px",
    backgroundColor: theme.colors.primary,
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600"
  }
};

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
        headers: { Authorization: `Bearer ${token}` }
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
          Authorization: `Bearer ${token}`,
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
        headers: { Authorization: `Bearer ${token}` }
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

  const thresholdMeta = getThresholdFieldMeta(formData.triggerType);
  const ruleHelp = getRuleHelp(formData.triggerType, formData.amountType);

  const messageStyle = {
    padding: "12px 16px",
    marginBottom: "16px",
    borderRadius: "8px",
    backgroundColor: message.includes("Error")
      ? theme.error?.light || "#fee2e2"
      : theme.success?.light || "#d1fae5",
    color: message.includes("Error") ? theme.error?.dark || "#dc2626" : theme.success?.dark || "#059669",
    fontWeight: "600",
    fontSize: "14px"
  };

  return (
    <div style={C.page}>
      <h2 style={C.title}>Salary rules</h2>
      <p style={C.subtitle}>
        Define when a bonus or deduction applies. After changes, run salary calculation again so payslips pick up new rules.
      </p>

      {message ? <div style={messageStyle}>{message}</div> : null}

      <details
        style={{
          marginBottom: "16px",
          padding: "12px 16px",
          backgroundColor: theme.neutral?.gray50 || "#f9fafb",
          border: `1px solid ${theme.colors.border}`,
          borderRadius: "10px",
          fontSize: "13px"
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            fontWeight: "600",
            color: theme.colors.primary,
            listStyle: "none"
          }}
        >
          Quick tips
        </summary>
        <ul
          style={{
            margin: "12px 0 0 0",
            paddingLeft: "20px",
            color: theme.neutral?.gray700 || "#374151",
            lineHeight: 1.55
          }}
        >
          <li>
            <strong>Trigger</strong> = when the rule is checked. <strong>Type</strong> = add (bonus) or subtract (deduction).
          </li>
          <li>
            <strong>Custom</strong> rules use keywords in the <strong>rule name</strong>: seniority, performance, technical
            (Engineering), management (TP/PTP).
          </li>
          <li>Open <strong>How calculation works</strong> below the form fields for full formulas.</li>
        </ul>
      </details>

      <form
        onSubmit={handleSubmit}
        style={{
          ...C.card,
          borderLeft: `4px solid ${theme.colors.secondary || theme.accent?.main || "#0d9488"}`
        }}
      >
        <div style={C.cardHeader}>{editingRule ? "Edit rule" : "New rule"}</div>
        <div style={C.cardBody}>
          <div style={{ marginBottom: "22px" }}>
            <div style={C.sectionLabel}>Step 1 — When &amp; what kind</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px"
              }}
            >
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "13px" }}>
                  Trigger
                </label>
                <select
                  value={formData.triggerType}
                  onChange={(e) => onTriggerChange(e.target.value)}
                  style={C.input}
                >
                  {TRIGGER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "13px" }}>
                  Rule type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={C.input}
                >
                  <option value="bonus">Bonus / allowance</option>
                  <option value="deduction">Deduction</option>
                </select>
                <div style={{ fontSize: "12px", color: theme.neutral?.gray500 || "#6b7280", marginTop: "6px" }}>
                  Trigger may suggest a type; you can override.
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "22px" }}>
            <div style={C.sectionLabel}>Step 2 — Amount</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "16px",
                alignItems: "end"
              }}
            >
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "13px" }}>
                  Amount type
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
                  style={C.input}
                >
                  <option value="fixed">Fixed (VND)</option>
                  <option value="percentage">Percentage (% of base salary)</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "13px" }}>
                  {formData.amountType === "percentage" ? "Percent (%)" : "Amount (VND)"}
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder={formData.amountType === "percentage" ? "0.00" : "0"}
                  style={C.input}
                  step={formData.amountType === "percentage" ? "0.01" : "1000"}
                  min="0"
                  required
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "4px" }}>
                <input
                  id="rule-active"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <label htmlFor="rule-active" style={{ fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>
                  Active
                </label>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "22px" }}>
            <div style={C.sectionLabel}>Step 3 — Name &amp; options</div>
            <div style={{ display: "grid", gap: "14px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "13px" }}>
                  Rule name <span style={{ color: theme.error?.main || "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Late arrival penalty"
                  style={C.input}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "13px" }}>
                  Description <span style={{ fontWeight: "400", color: theme.neutral?.gray500 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Shown in reports if you add one"
                  style={C.input}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px"
                }}
              >
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "13px" }}>
                    {thresholdMeta.label}
                  </label>
                  <input
                    type="number"
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                    placeholder={thresholdMeta.placeholder}
                    style={{ ...C.input, opacity: thresholdMeta.disabled ? 0.55 : 1 }}
                    min="1"
                    step="1"
                    disabled={thresholdMeta.disabled}
                  />
                  {thresholdMeta.short ? (
                    <div style={{ fontSize: "12px", color: theme.neutral?.gray500 || "#6b7280", marginTop: "6px" }}>
                      {thresholdMeta.short}
                    </div>
                  ) : null}
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "13px" }}>
                    Priority
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value, 10) || 0 })
                    }
                    placeholder="0"
                    style={C.input}
                  />
                  <div style={{ fontSize: "12px", color: theme.neutral?.gray500 || "#6b7280", marginTop: "6px" }}>
                    Higher runs first (when equal, order is stable).
                  </div>
                </div>
              </div>
            </div>
          </div>

          <details
            style={{
              marginBottom: "18px",
              padding: "12px 14px",
              backgroundColor: theme.neutral?.gray50 || "#f9fafb",
              borderRadius: "8px",
              border: `1px solid ${theme.colors.border}`
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "13px",
                color: theme.colors.primary
              }}
            >
              How calculation works (trigger: {labelForTrigger(formData.triggerType)})
            </summary>
            <p style={{ fontSize: "12px", color: theme.neutral?.gray600, margin: "10px 0 8px" }}>
              {thresholdMeta.foot}
            </p>
            <dl
              style={{
                margin: 0,
                display: "grid",
                gap: "10px",
                fontSize: "13px",
                lineHeight: 1.5
              }}
            >
              <div>
                <dt style={{ fontWeight: "700", color: theme.neutral?.gray700 || "#374151" }}>When it applies</dt>
                <dd style={{ margin: "4px 0 0 0", color: theme.neutral?.gray600 || "#4b5563" }}>
                  {ruleHelp.whenApply}
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: "700", color: theme.neutral?.gray700 || "#374151" }}>Threshold</dt>
                <dd style={{ margin: "4px 0 0 0", color: theme.neutral?.gray600 || "#4b5563" }}>
                  {ruleHelp.thresholdMeaning}
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: "700", color: theme.neutral?.gray700 || "#374151" }}>Amount formula</dt>
                <dd style={{ margin: "4px 0 0 0", color: theme.neutral?.gray600 || "#4b5563" }}>
                  {ruleHelp.amountFormula}
                </dd>
              </div>
            </dl>
          </details>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <button
              type="submit"
              disabled={loading || !formData.name}
              style={{
                ...C.btnPrimary,
                opacity: loading || !formData.name ? 0.55 : 1,
                cursor: loading || !formData.name ? "not-allowed" : "pointer"
              }}
            >
              {editingRule ? "Save changes" : "Create rule"}
            </button>
            {editingRule ? (
              <button type="button" onClick={handleCancel} style={C.btnGhost}>
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      </form>

      <div style={{ ...C.card, marginTop: "8px" }}>
        <div
          style={{
            ...C.cardHeader,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <span>All rules ({rules.length})</span>
          {loading ? (
            <span style={{ fontSize: "12px", fontWeight: "400", color: theme.neutral?.gray500 }}>Loading…</span>
          ) : null}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px"
            }}
          >
            <thead>
              <tr style={{ backgroundColor: theme.neutral?.gray50 || "#f9fafb" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    fontWeight: "600",
                    color: theme.neutral?.gray700 || "#374151",
                    borderBottom: `1px solid ${theme.colors.border}`
                  }}
                >
                  Rule
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    fontWeight: "600",
                    color: theme.neutral?.gray700 || "#374151",
                    borderBottom: `1px solid ${theme.colors.border}`,
                    whiteSpace: "nowrap"
                  }}
                >
                  Amount
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    fontWeight: "600",
                    color: theme.neutral?.gray700 || "#374151",
                    borderBottom: `1px solid ${theme.colors.border}`
                  }}
                >
                  Options
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "12px 12px",
                    fontWeight: "600",
                    color: theme.neutral?.gray700 || "#374151",
                    borderBottom: `1px solid ${theme.colors.border}`,
                    width: "72px"
                  }}
                >
                  On
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    fontWeight: "600",
                    color: theme.neutral?.gray700 || "#374151",
                    borderBottom: `1px solid ${theme.colors.border}`,
                    width: "120px"
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      padding: "28px 16px",
                      textAlign: "center",
                      color: theme.neutral?.gray500 || "#6b7280",
                      borderBottom: `1px solid ${theme.colors.border}`
                    }}
                  >
                    No rules yet. Create one above.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => {
                  const amountType = rule.amountType || "fixed";
                  const amountValue = parseFloat(rule.amount) || 0;
                  let amountDisplay = "—";
                  if (amountValue > 0) {
                    if (amountType === "percentage") {
                      amountDisplay = `${amountValue.toFixed(2)}%`;
                    } else {
                      amountDisplay = `${amountValue.toLocaleString("en-US")} ₫`;
                    }
                  }
                  const isBonus = rule.type === "bonus";
                  return (
                    <tr
                      key={rule.id}
                      style={{ borderBottom: `1px solid ${theme.colors.border}` }}
                    >
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: "600", color: theme.colors.primary, marginBottom: "6px" }}>
                          {rule.name}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: "11px",
                              fontWeight: "700",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              backgroundColor: isBonus
                                ? theme.success?.light || "#d1fae5"
                                : theme.error?.light || "#fee2e2",
                              color: isBonus
                                ? theme.success?.dark || "#059669"
                                : theme.error?.dark || "#dc2626"
                            }}
                          >
                            {isBonus ? "BONUS" : "DEDUCT"}
                          </span>
                          <span style={{ fontSize: "12px", color: theme.neutral?.gray600 || "#4b5563" }}>
                            {labelForTrigger(rule.triggerType)}
                          </span>
                        </div>
                        {rule.description ? (
                          <div
                            style={{
                              fontSize: "12px",
                              color: theme.neutral?.gray500 || "#6b7280",
                              marginTop: "8px",
                              maxWidth: "420px",
                              lineHeight: 1.4
                            }}
                          >
                            {rule.description}
                          </div>
                        ) : null}
                      </td>
                      <td
                        style={{
                          padding: "14px 14px",
                          verticalAlign: "top",
                          fontWeight: "600",
                          whiteSpace: "nowrap",
                          color: amountDisplay.includes("%")
                            ? theme.colors.secondary || theme.accent?.main || "#0d9488"
                            : theme.neutral?.gray800 || "#1f2937"
                        }}
                      >
                        {amountDisplay}
                      </td>
                      <td style={{ padding: "14px 14px", verticalAlign: "top", fontSize: "12px", color: theme.neutral?.gray600 || "#4b5563", lineHeight: 1.5 }}>
                        <div>
                          Threshold:{" "}
                          <strong>{rule.threshold != null ? rule.threshold : "—"}</strong>
                        </div>
                        <div style={{ marginTop: "4px" }}>
                          Priority: <strong>{rule.priority ?? 0}</strong>
                        </div>
                      </td>
                      <td style={{ padding: "14px 12px", textAlign: "center", verticalAlign: "top" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            backgroundColor:
                              rule.isActive !== false
                                ? theme.success?.light || "#d1fae5"
                                : theme.neutral?.gray200 || "#e5e7eb",
                            color:
                              rule.isActive !== false
                                ? theme.success?.dark || "#059669"
                                : theme.neutral?.gray600 || "#4b5563"
                          }}
                        >
                          {rule.isActive !== false ? "Yes" : "No"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        <button type="button" onClick={() => handleEdit(rule)} style={C.btnSm}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rule.id)}
                          style={{ ...C.btnDanger, marginLeft: "8px" }}
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
    </div>
  );
}
