import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";

/** Sequelize DECIMAL / JSON can arrive as string — avoid string concatenation in + */
function num(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** When DB finalSalary = 0 (legacy clamp) but gross − deduction is negative → show correct negative net. */
function effectiveNetFromRecord(rec) {
  const stored = num(rec?.finalSalary);
  const g = num(rec?.grossSalary);
  const d = num(rec?.deduction);
  const fromParts = parseFloat((g - d).toFixed(2));
  if (Math.abs(stored) < 0.005) return fromParts;
  return stored;
}

/** Map API User (Department, JobTitle, SalaryGrade) to modal fields */
function mapUserToEmployeeView(user) {
  if (!user) return null;
  const sg = user.SalaryGrade;
  const gradeCombined =
    sg && (sg.code || sg.name) ? [sg.code, sg.name].filter(Boolean).join(" — ") : undefined;
  return {
    id: user.id,
    name: user.name,
    employeeCode: user.employeeCode,
    employeeId: user.employeeCode,
    department: user.Department?.name,
    jobTitle: user.JobTitle?.name,
    salaryGrade: gradeCombined || sg?.name || sg?.code,
    salaryGradeLevel: sg?.level,
    gradeScaleBase: sg?.baseSalary,
  };
}

/** Optional display aliases when DB stores short keys */
const RULE_LABEL_EN = {
  "Absence penalty": "Absence penalty",
  Absent: "Absence penalty",
  Late: "Late arrival",
  "Early leave": "Early leave",
  Overtime: "Overtime (rule)",
  "Full attendance": "Full attendance bonus",
  "Salary advance deduction": "Salary advance deduction",
  "Khấu trừ ứng lương": "Salary advance deduction"
};

function labelForBonusRule(name) {
  if (!name || typeof name !== "string") return "Bonus";
  const t = name.trim();
  return RULE_LABEL_EN[t] || t;
}

function labelForDeductionRule(name) {
  if (!name || typeof name !== "string") return "Deduction";
  const t = name.trim();
  return RULE_LABEL_EN[t] || t;
}

/** Statutory: insurance + PIT — matches API breakdown triggerType */
function isStatutoryDeductionRow(row) {
  const t = row?.triggerType || "";
  return (
    t === "insurance_social" ||
    t === "insurance_health" ||
    t === "insurance_unemployment" ||
    t === "personal_income_tax"
  );
}

export default function SalaryBreakdownModal({ salary, employee, rules, onClose, onUpdate }) {
  const [editMode, setEditMode] = useState(false);
  const [adjustments, setAdjustments] = useState({
    baseAdjustment: 0,
    bonusAdjustment: 0,
    deductionAdjustment: 0,
    notes: ""
  });
  const [showBaseDetails, setShowBaseDetails] = useState(false);
  const [showBonusDetails, setShowBonusDetails] = useState(false);
  const [showGrossDetails, setShowGrossDetails] = useState(false);
  const [showDeductionDetails, setShowDeductionDetails] = useState(false);
  const [showNetDetails, setShowNetDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [breakdown, setBreakdown] = useState(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState(null);
  const [salaryRecord, setSalaryRecord] = useState(null);
  const [employeeResolved, setEmployeeResolved] = useState(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryFetchError, setSalaryFetchError] = useState(null);

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const record = salaryRecord ?? salary;
  const emp = employeeResolved ?? employee;

  /** Load salary record + User by salary.id */
  useEffect(() => {
    if (!salary?.id) return;
    let cancelled = false;
    setSalaryLoading(true);
    setSalaryFetchError(null);
    setSalaryRecord(null);
    setEmployeeResolved(null);
    (async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          if (!cancelled) {
            setSalaryLoading(false);
            setSalaryRecord(salary);
          }
          return;
        }
        const res = await fetch(`${apiBase}/api/salary/${salary.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Could not load salary record");
        if (cancelled) return;
        setSalaryRecord(data.salary);
        setEmployeeResolved(mapUserToEmployeeView(data.salary?.User));
      } catch (e) {
        if (!cancelled) {
          setSalaryFetchError(e.message || "Error loading salary");
          setSalaryRecord(salary);
          setEmployeeResolved(null);
        }
      } finally {
        if (!cancelled) setSalaryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [salary?.id, apiBase]);

  useEffect(() => {
    if (!salary?.id) return;
    let cancelled = false;
    (async () => {
      setBreakdownLoading(true);
      setBreakdownError(null);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          setBreakdownLoading(false);
          return;
        }
        const res = await fetch(`${apiBase}/api/salary/${salary.id}/breakdown`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || "Could not load breakdown");
        }
        if (!cancelled) setBreakdown(data.breakdown || null);
      } catch (e) {
        if (!cancelled) setBreakdownError(e.message || "Error loading breakdown");
      } finally {
        if (!cancelled) setBreakdownLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [salary?.id, apiBase]);

  const modalStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "20px",
    boxSizing: "border-box"
  };

  const contentStyle = {
    backgroundColor: theme.neutral.white,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    maxWidth: "900px",
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: theme.shadows.lg,
    border: `1px solid ${theme.neutral.gray200}`
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    borderBottom: `2px solid ${theme.neutral.gray200}`
  };

  const titleStyle = {
    fontSize: "26px",
    fontWeight: "700",
    color: theme.primary.main,
    margin: 0,
    marginBottom: theme.spacing.xs,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.sm
  };

  const closeButtonStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: theme.neutral.gray500,
    transition: "all 0.2s",
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px"
  };

  const sectionStyle = {
    marginBottom: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    borderBottom: `1px solid ${theme.neutral.gray200}`
  };

  const sectionTitleStyle = {
    fontSize: "18px",
    fontWeight: "700",
    color: theme.primary.main,
    marginBottom: theme.spacing.lg,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.neutral.gray50,
    borderRadius: theme.radius.md
  };

  const itemRowStyle = {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.neutral.gray50,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    alignItems: "center",
    fontSize: "14px",
    transition: "all 0.2s",
    border: `1px solid ${theme.neutral.gray200}`
  };

  const labelStyle = {
    fontWeight: "600",
    color: "#333"
  };

  const amountStyle = {
    textAlign: "right",
    fontWeight: "600",
    color: theme.primary.main
  };

  const percentStyle = {
    textAlign: "center",
    color: "#666",
    fontSize: "12px"
  };

  const summaryStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "15px",
    marginTop: "15px"
  };

  const summaryItemStyle = {
    padding: "15px",
    borderRadius: "5px",
    textAlign: "center"
  };

  const editFormStyle = {
    backgroundColor: "#f0f8ff",
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing.lg,
    border: `2px solid #b3d9ff`,
    boxShadow: theme.shadows.sm
  };

  const formGroupStyle = {
    marginBottom: theme.spacing.lg
  };

  const labelFormStyle = {
    display: "block",
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
    color: theme.primary.main,
    fontSize: "14px",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  };

  const inputStyle = {
    width: "100%",
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    border: `2px solid ${theme.neutral.gray300}`,
    borderRadius: theme.radius.md,
    fontSize: "15px",
    boxSizing: "border-box",
    transition: "all 0.2s",
    outline: "none",
    fontFamily: "inherit"
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: "100px",
    resize: "vertical",
    fontFamily: "inherit"
  };

  const buttonGroupStyle = {
    display: "flex",
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
    justifyContent: "flex-end",
    alignItems: "center"
  };

  const iconButtonStyle = (bgColor) => ({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    border: "none",
    borderRadius: theme.radius.md,
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s",
    backgroundColor: bgColor,
    color: theme.neutral.white,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.sm,
    boxShadow: theme.shadows.sm,
    minWidth: "120px",
    justifyContent: "center"
  });

  const handleSaveAdjustments = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/salary/${record.id}/adjust`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(adjustments)
      });

      if (res.ok) {
        const data = await res.json();
        const updatedSalary = data.salary ?? data;
        if (onUpdate) onUpdate(updatedSalary);
        try {
          const r2 = await fetch(`${apiBase}/api/salary/${updatedSalary.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const d2 = await r2.json();
          if (r2.ok && d2.salary) {
            setSalaryRecord(d2.salary);
            setEmployeeResolved(mapUserToEmployeeView(d2.salary.User));
          } else {
            setSalaryRecord(updatedSalary);
          }
        } catch {
          setSalaryRecord(updatedSalary);
        }
        setEditMode(false);
        alert("Payroll version updated successfully");
      } else {
        alert("Error updating");
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const hasAdjustments =
    num(adjustments.baseAdjustment) !== 0 ||
    num(adjustments.bonusAdjustment) !== 0 ||
    num(adjustments.deductionAdjustment) !== 0;

  const deductionRows = breakdown?.deductionBreakdown || [];
  const deductionOtherRows = deductionRows.filter((r) => !isStatutoryDeductionRow(r));
  const deductionStatutoryRows = deductionRows.filter(isStatutoryDeductionRow);
  const sumStatutoryDetail = deductionStatutoryRows.reduce((s, r) => s + num(r.amount), 0);
  const sumDeductionDetail = deductionRows.reduce((s, r) => s + num(r.amount), 0);
  const storedDeduction = num(record?.deduction);
  const deductionMismatch =
    Boolean(breakdown) &&
    deductionRows.length > 0 &&
    Math.abs(sumDeductionDetail - storedDeduction) > 1;
  const totalDeductionApplied = hasAdjustments
    ? storedDeduction + num(adjustments.deductionAdjustment)
    : deductionMismatch
      ? sumDeductionDetail
      : storedDeduction + num(adjustments.deductionAdjustment);
  const detailMatchesRecord =
    deductionRows.length > 0 && Math.abs(sumDeductionDetail - storedDeduction) < 1;

  /** Edit summary: align with breakdown when DB is stale (recalc not run). */
  const editSummaryDeduction =
    !hasAdjustments && deductionMismatch ? sumDeductionDetail : storedDeduction;
  const editSummaryNet =
    !hasAdjustments && deductionMismatch
      ? num(record?.grossSalary) - sumDeductionDetail
      : effectiveNetFromRecord(record);

  /** API: deduction = DB + adjustment. No edits + mismatch → preview from breakdown; with edits → save formula. */
  const previewNetAfterSave = () => {
    const baseAdj = num(adjustments.baseAdjustment);
    const bonusAdj = num(adjustments.bonusAdjustment);
    const dedAdj = num(adjustments.deductionAdjustment);
    const anyAdj = baseAdj !== 0 || bonusAdj !== 0 || dedAdj !== 0;
    if (!anyAdj && deductionMismatch && deductionRows.length > 0) {
      return num(record?.grossSalary) - sumDeductionDetail;
    }
    return (
      num(record?.baseSalary) +
      baseAdj +
      num(record?.bonus) +
      bonusAdj -
      storedDeduction -
      dedAdj
    );
  };

  const calculateGrossAdjusted = () => {
    const baseAdjusted = num(record?.baseSalary) + num(adjustments.baseAdjustment);
    const bonusBase = record?.totalBonus != null ? num(record.totalBonus) : num(record?.bonus);
    const bonusAdjusted = bonusBase + num(adjustments.bonusAdjustment);
    return baseAdjusted + bonusAdjusted;
  };

  const calculateNetAdjusted = () => {
    const deductionBase = record?.totalDeduction != null ? num(record.totalDeduction) : num(record?.deduction);
    return calculateGrossAdjusted() - deductionBase - num(adjustments.deductionAdjustment);
  };

  /** Prefer DB figures when not manually adjusting */
  const displayGross = () => {
    if (hasAdjustments) return calculateGrossAdjusted();
    const g = num(record?.grossSalary);
    return g || calculateGrossAdjusted();
  };

  const displayNet = () => {
    if (hasAdjustments) return calculateNetAdjusted();
    if (deductionMismatch && deductionRows.length > 0) {
      return num(record?.grossSalary) - sumDeductionDetail;
    }
    return effectiveNetFromRecord(record);
  };

  const netPayShown = displayNet();

  const formatCurrency = (value) => {
    const n = num(value);
    return n.toLocaleString("en-US", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const detailLineStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "4px 0",
    fontSize: "12px",
    borderBottom: "1px solid rgba(0,0,0,0.06)"
  };

  const formatPct = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  const renderDeductionLine = (row, idx, borderBottom) => {
    const pctStr = formatPct(row.appliedRatePercent);
    const isPit = row.triggerType === "personal_income_tax";
    return (
      <div
        key={`${row.triggerType || "row"}-${idx}`}
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          padding: "8px 0",
          borderBottom: borderBottom ? "1px solid rgba(0,0,0,0.08)" : "none",
          alignItems: "flex-start"
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: "600", color: "#c62828" }}>{labelForDeductionRule(row.ruleName)}</span>
          {pctStr != null && (
            <span
              style={{
                fontWeight: "700",
                color: "#6a1b9a",
                marginLeft: "8px",
                whiteSpace: "nowrap"
              }}
              title={
                isPit
                  ? "Effective average rate on taxable income after reliefs (progressive 5%–35%)"
                  : "Statutory employee rate × insurance salary base (min/max caps may apply)"
              }
            >
              {pctStr}%
            </span>
          )}
          {!pctStr && isPit && !row.rateCaption && (
            <span
              style={{
                display: "inline-block",
                marginLeft: "8px",
                fontSize: "11px",
                fontWeight: "600",
                color: "#6a1b9a"
              }}
            >
              (progressive 5%–35%)
            </span>
          )}
          {(row.reason || row.ruleDescription) && (
            <span
              style={{
                display: "block",
                fontSize: "11px",
                color: "#666",
                fontWeight: "400",
                marginTop: "4px",
                lineHeight: 1.35
              }}
            >
              {row.reason || row.ruleDescription}
            </span>
          )}
          {row.rateCaption && isPit && (
            <span
              style={{
                display: "block",
                fontSize: "11px",
                color: "#7e57c2",
                marginTop: "4px",
                lineHeight: 1.35
              }}
            >
              {row.rateCaption}
            </span>
          )}
        </span>
        <span style={{ fontWeight: "600", color: "#b71c1c", whiteSpace: "nowrap" }}>−₫{formatCurrency(row.amount)}</span>
      </div>
    );
  };

  return (
    <>
      <div style={modalStyle} onClick={onClose}>
        <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>💰 Monthly salary details</h2>
            {salaryLoading && (
              <div style={{ fontSize: "12px", color: "#1976d2", marginTop: "4px" }}>Loading salary data…</div>
            )}
            {salaryFetchError && (
              <div style={{ fontSize: "12px", color: "#c62828", marginTop: "4px" }}>{salaryFetchError}</div>
            )}
            <div style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>
              <strong>{emp?.name || "—"}</strong> — {record?.month}/{record?.year}
            </div>
            <div style={{ fontSize: "12px", color: "#999", marginTop: "3px" }}>
              Employee ID: <strong>{emp?.employeeCode || emp?.employeeId || "—"}</strong>
            </div>
          </div>
          <button
            style={closeButtonStyle}
            onClick={onClose}
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Employee Info */}
        <div style={{
          ...sectionStyle,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: theme.spacing.lg,
          marginBottom: theme.spacing.xl
        }}>
          <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>Department</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#333" }}>{emp?.department || "N/A"}</div>
          </div>
          <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>Job title</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#333" }}>{emp?.jobTitle || "N/A"}</div>
          </div>
          <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>Salary grade</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#333" }}>{emp?.salaryGrade || "N/A"}</div>
          </div>
        </div>

        {/* Breakdown Table */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>📊 Salary breakdown</h3>
          {breakdownLoading && (
            <div style={{ fontSize: "12px", color: "#666", marginBottom: theme.spacing.sm }}>Loading line items…</div>
          )}
          {breakdownError && (
            <div style={{ fontSize: "12px", color: "#c62828", marginBottom: theme.spacing.sm }}>{breakdownError}</div>
          )}
          {deductionMismatch && !hasAdjustments && (
            <div
              style={{
                marginBottom: theme.spacing.md,
                padding: "10px 12px",
                backgroundColor: "#fff3e0",
                borderRadius: theme.radius.md,
                border: "1px solid #ffb74d",
                fontSize: "12px",
                color: "#e65100",
                lineHeight: 1.45
              }}
            >
                <strong>Total deductions on the salary record</strong> do not match the detailed breakdown (often because payroll was not recalculated after insurance/tax). Figures below follow the{" "}
                <strong>recalculated detail</strong> — run <strong>Recalculate payroll</strong> for this month to update the database.
            </div>
          )}
          <div style={{ display: "grid", gap: theme.spacing.md }}>
            {/* Base Salary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: theme.spacing.lg,
                padding: theme.spacing.lg,
                backgroundColor: "#e3f2fd",
                borderRadius: theme.radius.md,
                borderLeft: `4px solid #1976d2`,
                cursor: "pointer"
              }}
              onClick={() => setShowBaseDetails(!showBaseDetails)}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#1976d2", marginBottom: "4px" }}>Base salary</div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  Monthly base pay, job title &amp; grade — click to expand
                </div>
                {showBaseDetails && (
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "#555" }}>
                    {(emp?.jobTitle ||
                      emp?.salaryGrade ||
                      emp?.salaryGradeLevel != null ||
                      num(emp?.gradeScaleBase) > 0) && (
                      <div
                        style={{
                          marginBottom: "10px",
                          paddingBottom: "8px",
                          borderBottom: "1px solid rgba(0,0,0,0.08)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: "600",
                            color: "#1976d2",
                            marginBottom: "6px",
                          }}
                        >
                          Employee profile (position &amp; grade)
                        </div>
                        {emp?.jobTitle && (
                          <div style={detailLineStyle}>
                            <span>Job title</span>
                            <span style={{ textAlign: "right" }}>{emp.jobTitle}</span>
                          </div>
                        )}
                        {emp?.salaryGrade && (
                          <div style={detailLineStyle}>
                            <span>Salary grade</span>
                            <span style={{ textAlign: "right" }}>{emp.salaryGrade}</span>
                          </div>
                        )}
                        {emp?.salaryGradeLevel != null && emp.salaryGradeLevel !== "" && (
                          <div style={detailLineStyle}>
                            <span>Grade level</span>
                            <span>{emp.salaryGradeLevel}</span>
                          </div>
                        )}
                        {num(emp?.gradeScaleBase) > 0 && (
                          <div style={detailLineStyle}>
                            <span>Grade scale base (monthly)</span>
                            <span>₫{formatCurrency(emp.gradeScaleBase)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "#444", marginBottom: "4px" }}>
                      Payroll record
                    </div>
                    <div style={detailLineStyle}>
                      <span>Recorded base salary</span>
                      <span>₫{formatCurrency(num(record?.baseSalary))}</span>
                    </div>
                    {breakdown && Math.abs(num(breakdown.baseSalary) - num(record?.baseSalary)) > 0.01 && (
                      <div style={{ ...detailLineStyle, fontSize: "11px", color: "#888" }}>
                        <span>Profile reference (recalculated)</span>
                        <span>₫{formatCurrency(breakdown.baseSalary)}</span>
                      </div>
                    )}
                    {num(adjustments.baseAdjustment) !== 0 && (
                      <div style={detailLineStyle}>
                        <span>Manual adjustment</span>
                        <span>₫{formatCurrency(adjustments.baseAdjustment)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", fontWeight: "700", fontSize: "16px", color: "#1976d2" }}>
                ₫{formatCurrency(num(record?.baseSalary) + num(adjustments.baseAdjustment))}
              </div>
            </div>

            {/* Bonus */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: theme.spacing.lg,
                padding: theme.spacing.lg,
                backgroundColor: "#c8e6c9",
                borderRadius: theme.radius.md,
                borderLeft: `4px solid #388e3c`,
                cursor: "pointer"
              }}
              onClick={() => setShowBonusDetails(!showBonusDetails)}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#388e3c", marginBottom: "4px" }}>Bonuses &amp; allowances</div>
                <div style={{ fontSize: "12px", color: "#666" }}>Allowances, bonus rules, overtime… — click for lines</div>
                {showBonusDetails && (
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "#555" }}>
                    {breakdown?.bonusBreakdown?.length > 0 ? (
                      breakdown.bonusBreakdown.map((row, idx) => (
                        <div key={idx} style={{ ...detailLineStyle, alignItems: "flex-start" }}>
                          <span>
                            <span style={{ fontWeight: "600" }}>{labelForBonusRule(row.ruleName)}</span>
                            {(row.reason || row.ruleDescription) && (
                              <span style={{ display: "block", fontSize: "11px", color: "#777", fontWeight: "400", marginTop: "2px" }}>
                                {row.reason || row.ruleDescription}
                              </span>
                            )}
                          </span>
                          <span style={{ whiteSpace: "nowrap" }}>+₫{formatCurrency(row.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: "12px", color: "#777" }}>No detailed breakdown — showing total from record.</div>
                    )}
                    <div style={{ ...detailLineStyle, fontWeight: "600", marginTop: "6px", borderBottom: "none" }}>
                      <span>Total (system breakdown)</span>
                      <span>₫{formatCurrency(breakdown?.totalBonus ?? num(record?.bonus))}</span>
                    </div>
                    <div style={detailLineStyle}>
                      <span>Bonus on salary record</span>
                      <span>₫{formatCurrency(record?.bonus)}</span>
                    </div>
                    {num(adjustments.bonusAdjustment) !== 0 && (
                      <div style={detailLineStyle}>
                        <span>Manual adjustment</span>
                        <span>₫{formatCurrency(adjustments.bonusAdjustment)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", fontWeight: "700", fontSize: "16px", color: "#388e3c" }}>
                +₫{formatCurrency(num(record?.bonus) + num(adjustments.bonusAdjustment))}
              </div>
            </div>

            {/* Gross Salary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: theme.spacing.lg,
                padding: theme.spacing.lg,
                backgroundColor: "#fff3e0",
                borderRadius: theme.radius.md,
                borderLeft: `4px solid #f57c00`,
                cursor: "pointer"
              }}
              onClick={() => setShowGrossDetails(!showGrossDetails)}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#f57c00", marginBottom: "4px" }}>Gross salary</div>
                <div style={{ fontSize: "12px", color: "#666" }}>Base salary + bonus (totals)</div>
                {showGrossDetails && (
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "#555" }}>
                    <div style={detailLineStyle}>
                      <span>Base salary (after adjustment)</span>
                      <span>₫{formatCurrency(num(record?.baseSalary) + num(adjustments.baseAdjustment))}</span>
                    </div>
                    <div style={detailLineStyle}>
                      <span>Bonus (after adjustment)</span>
                      <span>₫{formatCurrency(num(record?.bonus) + num(adjustments.bonusAdjustment))}</span>
                    </div>
                    <div style={{ ...detailLineStyle, fontWeight: "600", borderBottom: "none", marginTop: "4px" }}>
                      <span>Total (gross)</span>
                      <span>₫{formatCurrency(displayGross())}</span>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", fontWeight: "700", fontSize: "16px", color: "#f57c00" }}>
                ₫{formatCurrency(displayGross())}
              </div>
            </div>

            {/* Deduction */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: theme.spacing.lg,
                padding: theme.spacing.lg,
                backgroundColor: "#ffcdd2",
                borderRadius: theme.radius.md,
                borderLeft: `4px solid #d32f2f`,
                cursor: "pointer"
              }}
              onClick={() => setShowDeductionDetails(!showDeductionDetails)}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#d32f2f", marginBottom: "4px" }}>Deductions</div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  Attendance penalties, salary advance,{" "}
                  <strong>PIT (personal income tax)</strong> and <strong>SI / HI / UI (employee share)</strong> — click for lines
                </div>
                {showDeductionDetails && (
                  <div style={{ marginTop: "12px", fontSize: "12px", color: "#555" }}>
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        letterSpacing: "0.06em",
                        color: "#b71c1c",
                        marginBottom: "8px"
                      }}
                    >
                      DEDUCTION LINE ITEMS
                    </div>
                    <div
                      style={{
                        backgroundColor: "rgba(255,255,255,0.85)",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        border: "1px solid rgba(211,47,47,0.2)"
                      }}
                    >
                      {deductionRows.length > 0 ? (
                        <>
                          {deductionOtherRows.length > 0 && (
                            <>
                              <div
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  letterSpacing: "0.04em",
                                  color: "#c62828",
                                  marginBottom: "6px"
                                }}
                              >
                                PENALTIES / ADVANCE / ATTENDANCE RULES
                              </div>
                              {deductionOtherRows.map((row, idx) =>
                                renderDeductionLine(row, idx, idx < deductionOtherRows.length - 1)
                              )}
                            </>
                          )}

                          {deductionStatutoryRows.length > 0 && (
                            <div style={{ marginTop: deductionOtherRows.length > 0 ? "14px" : 0 }}>
                              <div
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  letterSpacing: "0.04em",
                                  color: "#4a148c",
                                  marginBottom: "6px",
                                  lineHeight: 1.35
                                }}
                              >
                                PERSONAL INCOME TAX (PIT / TNCN)
                                <br />
                                <span style={{ fontWeight: "600", color: "#6a1b9a" }}>
                                  AND SOCIAL INSURANCE (SI · HI · UI — EMPLOYEE)
                                </span>
                              </div>
                              {deductionStatutoryRows.map((row, idx) =>
                                renderDeductionLine(
                                  row,
                                  idx,
                                  idx < deductionStatutoryRows.length - 1
                                )
                              )}
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginTop: "8px",
                                  paddingTop: "8px",
                                  borderTop: "1px dashed rgba(106,27,154,0.35)",
                                  fontSize: "12px",
                                  color: "#4a148c",
                                  fontWeight: "600"
                                }}
                              >
                                <span>Subtotal PIT + insurance (employee)</span>
                                <span>−₫{formatCurrency(sumStatutoryDetail)}</span>
                              </div>
                            </div>
                          )}

                          {(deductionOtherRows.length > 0 || deductionStatutoryRows.length > 0) &&
                            deductionRows.length > 1 && (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginTop: "10px",
                                paddingTop: "10px",
                                borderTop: "2px solid rgba(198,40,40,0.25)",
                                fontSize: "13px",
                                color: "#3e2723",
                                fontWeight: "700"
                              }}
                            >
                              <span>Total deductions</span>
                              <span>−₫{formatCurrency(sumDeductionDetail)}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {num(record?.advanceDeduction) > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                              <span>
                                <span style={{ fontWeight: "600" }}>Salary advance</span>
                                <span style={{ display: "block", fontSize: "11px", color: "#666", marginTop: "2px" }}>
                                  Deduct approved advance (per record)
                                </span>
                              </span>
                              <span style={{ fontWeight: "600" }}>−₫{formatCurrency(record.advanceDeduction)}</span>
                            </div>
                          )}
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                            <span>
                              <span style={{ fontWeight: "600" }}>Other deductions</span>
                              <span style={{ display: "block", fontSize: "11px", color: "#666", marginTop: "2px" }}>
                                Tax, SI, penalties… (total less advance portion)
                              </span>
                            </span>
                            <span style={{ fontWeight: "600" }}>−₫{formatCurrency(num(record?.deduction) - num(record?.advanceDeduction))}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: "12px",
                        padding: "10px 12px",
                        backgroundColor: "rgba(183,28,28,0.08)",
                        borderRadius: "8px",
                        border: "1px solid rgba(183,28,28,0.25)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
                        <span style={{ fontWeight: "700", color: "#3e2723" }}>Total deduction applied</span>
                        <span style={{ fontWeight: "700", fontSize: "15px", color: "#b71c1c", whiteSpace: "nowrap" }}>
                          −₫{formatCurrency(totalDeductionApplied)}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#616161", marginTop: "6px", lineHeight: 1.4 }}>
                        Includes penalties/advance, SI/HI/UI (employee) and PIT —{" "}
                        {deductionMismatch && !hasAdjustments
                          ? "using recalculated detail total (record mismatch); "
                          : "total stored on salary record "}
                        {num(adjustments.deductionAdjustment) !== 0 ? "(includes manual adjustment) " : ""}
                        used for net pay.
                      </div>
                      {deductionRows.length > 0 && (
                        <div style={{ fontSize: "11px", marginTop: "6px", color: detailMatchesRecord ? "#2e7d32" : "#e65100" }}>
                          {detailMatchesRecord
                            ? "✓ Detail total matches salary record."
                            : deductionMismatch
                              ? "Record out of sync — showing deductions and net from recalculated detail; run Recalculate payroll to update the DB."
                              : "Note: line totals may differ slightly from the record due to rounding or attendance recalculation."}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", fontWeight: "700", fontSize: "16px", color: "#d32f2f" }}>
                −₫{formatCurrency(totalDeductionApplied)}
              </div>
            </div>

            {/* Net Salary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: theme.spacing.lg,
                padding: theme.spacing.xl,
                backgroundColor: "#2196f3",
                borderRadius: theme.radius.md,
                borderLeft: `4px solid #1565c0`,
                marginTop: theme.spacing.md,
                cursor: "pointer"
              }}
              onClick={() => setShowNetDetails(!showNetDetails)}
            >
              <div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff", marginBottom: "4px" }}>NET PAY</div>
                <div style={{ fontSize: "12px", color: "#e3f2fd" }}>Take-home amount — click for formula</div>
                {showNetDetails && (
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "#e3f2fd" }}>
                    <div style={{ ...detailLineStyle, borderColor: "rgba(255,255,255,0.25)" }}>
                      <span>Gross</span>
                      <span>₫{formatCurrency(displayGross())}</span>
                    </div>
                    <div style={{ ...detailLineStyle, borderColor: "rgba(255,255,255,0.25)" }}>
                      <span>Less deductions</span>
                      <span>−₫{formatCurrency(totalDeductionApplied)}</span>
                    </div>
                    <div style={{ ...detailLineStyle, fontWeight: "700", borderBottom: "none" }}>
                      <span>= Total</span>
                      <span>
                        {netPayShown < 0 ? "−" : ""}₫{formatCurrency(Math.abs(netPayShown))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontWeight: "700",
                  fontSize: "20px",
                  color: netPayShown < 0 ? "#ffecb3" : "#fff",
                }}
              >
                {netPayShown < 0 ? "−" : ""}₫{formatCurrency(Math.abs(netPayShown))}
              </div>
            </div>
          </div>
        </div>

        {/* Status & Additional Info */}
        <div style={{
          ...sectionStyle,
          marginTop: theme.spacing.xl
        }}>
          <h3 style={sectionTitleStyle}>📋 Status &amp; other info</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: theme.spacing.lg
          }}>
            <div style={{ padding: theme.spacing.lg, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", marginBottom: "8px", fontWeight: "600" }}>Status</div>
              <div style={{
                display: "inline-block",
                padding: "6px 16px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "600",
                backgroundColor: record?.status === "paid" ? "#c8e6c9" : record?.status === "approved" ? "#fff9c4" : "#ffccbc",
                color: record?.status === "paid" ? "#2e7d32" : record?.status === "approved" ? "#f57f17" : "#d84315"
              }}>
                {record?.status === "pending" ? "Pending" : record?.status === "approved" ? "Approved" : "Paid"}
              </div>
            </div>
            <div style={{ padding: theme.spacing.lg, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", marginBottom: "8px", fontWeight: "600" }}>Calculated at</div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                {record?.calculatedAt ? new Date(record.calculatedAt).toLocaleDateString("en-US") : "N/A"}
              </div>
            </div>
            {record?.notes && (
              <div style={{ padding: theme.spacing.lg, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md, gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", marginBottom: "8px", fontWeight: "600" }}>Notes</div>
                <div style={{ fontSize: "14px", color: "#333", whiteSpace: "pre-wrap" }}>{record.notes}</div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Mode */}
        {editMode && (
          <div style={editFormStyle}>
            <div
              style={{
                marginBottom: theme.spacing.lg,
                padding: theme.spacing.lg,
                backgroundColor: "#fff",
                borderRadius: theme.radius.md,
                border: `1px solid ${theme.neutral.gray200}`
              }}
            >
              <div style={{ ...labelFormStyle, marginBottom: theme.spacing.md, color: "#1565c0" }}>
                Current values (salary record)
              </div>
              <div style={{ fontSize: "13px", color: "#444", marginBottom: theme.spacing.md }}>
                <strong>{emp?.name || "—"}</strong>
                {emp?.employeeCode ? ` · ID ${emp.employeeCode}` : ""}
                {record?.id != null ? ` · Record #${record.id}` : ""}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: theme.spacing.md, fontSize: "14px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Base salary</div>
                  <div style={{ fontWeight: "700", color: "#1976d2" }}>₫{formatCurrency(num(record?.baseSalary))}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Bonus</div>
                  <div style={{ fontWeight: "700", color: "#2e7d32" }}>₫{formatCurrency(num(record?.bonus))}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Total deductions</div>
                  <div style={{ fontWeight: "700", color: "#c62828" }}>₫{formatCurrency(editSummaryDeduction)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Gross</div>
                  <div style={{ fontWeight: "700", color: "#e65100" }}>₫{formatCurrency(num(record?.grossSalary) || num(record?.baseSalary) + num(record?.bonus))}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Net (take-home)</div>
                  <div
                    style={{
                      fontWeight: "700",
                      color: editSummaryNet < 0 ? "#b91c1c" : "#1565c0",
                    }}
                  >
                    {editSummaryNet < 0 ? "−" : ""}₫{formatCurrency(Math.abs(editSummaryNet))}
                  </div>
                </div>
              </div>
              {deductionMismatch && !hasAdjustments && (
                <div
                  style={{
                    marginTop: theme.spacing.md,
                    padding: "8px 10px",
                    fontSize: "11px",
                    color: "#6d4c41",
                    backgroundColor: "#fff3e0",
                    borderRadius: theme.radius.sm,
                    border: "1px solid #ffcc80",
                    lineHeight: 1.45
                  }}
                >
                  <strong>Currently stored in DB:</strong> deductions ₫{formatCurrency(storedDeduction)}, net ₫{formatCurrency(num(record?.finalSalary))}. Manual adjustments apply to{" "}
                  <strong>DB deduction</strong> — <strong>Recalculate payroll</strong> first to sync if needed.
                </div>
              )}
              {deductionMismatch && hasAdjustments && (
                <div style={{ marginTop: theme.spacing.md, fontSize: "11px", color: "#6d4c41", lineHeight: 1.45 }}>
                  The « Total deduction adjustment » field adds to the <strong>DB value (₫{formatCurrency(storedDeduction)})</strong>, not the detailed breakdown total.
                </div>
              )}
            </div>

            <div style={{ marginBottom: theme.spacing.md, fontSize: "13px", color: "#555", lineHeight: 1.5 }}>
              Fields below are <strong>additions or subtractions</strong> to current values (e.g. +500,000 base salary: <code style={{ fontSize: "12px" }}>500000</code>; −200,000 bonus: <code style={{ fontSize: "12px" }}>-200000</code>).
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Base salary adjustment (±)</label>
              <input
                type="number"
                style={inputStyle}
                value={adjustments.baseAdjustment}
                onChange={(e) =>
                  setAdjustments({
                    ...adjustments,
                    baseAdjustment: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0
                  })
                }
                placeholder="0 — positive increases, negative decreases"
              />
              <div style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
                → After adjustment: ₫{formatCurrency(num(record?.baseSalary) + num(adjustments.baseAdjustment))}
              </div>
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Bonus adjustment (±)</label>
              <input
                type="number"
                style={inputStyle}
                value={adjustments.bonusAdjustment}
                onChange={(e) =>
                  setAdjustments({
                    ...adjustments,
                    bonusAdjustment: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0
                  })
                }
                placeholder="0 — positive increases, negative decreases"
              />
              <div style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
                → After adjustment: ₫{formatCurrency(num(record?.bonus) + num(adjustments.bonusAdjustment))}
              </div>
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Total deduction adjustment (±)</label>
              <input
                type="number"
                style={inputStyle}
                value={adjustments.deductionAdjustment}
                onChange={(e) =>
                  setAdjustments({
                    ...adjustments,
                    deductionAdjustment: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0
                  })
                }
                placeholder="0 — positive increases deductions; negative decreases"
              />
              <div style={{ fontSize: "12px", color: "#666", marginTop: "6px", lineHeight: 1.5 }}>
                <div>
                  → <strong>Deduction stored in DB</strong> = current value (₫{formatCurrency(storedDeduction)}) + this field ={" "}
                  <strong>₫{formatCurrency(storedDeduction + num(adjustments.deductionAdjustment))}</strong>{" "}
                  <span style={{ color: "#888" }}>(<code style={{ fontSize: "11px" }}>deduction</code> column)</span>
                </div>
                {deductionMismatch && deductionRows.length > 0 && (
                  <div style={{ marginTop: "6px", color: "#5d4037" }}>
                    → <strong>Breakdown detail</strong> (Deductions section): ₫{formatCurrency(sumDeductionDetail)} — differs from DB if payroll not recalculated; ± field{" "}
                    <strong>does not</strong> add to this line, only to the DB amount above.
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                marginBottom: theme.spacing.lg,
                padding: theme.spacing.md,
                backgroundColor: "#e8f5e9",
                borderRadius: theme.radius.md,
                fontSize: "13px",
                border: "1px solid #c8e6c9"
              }}
            >
              <strong style={{ color: "#2e7d32" }}>Net preview:</strong>{" "}
              <span style={{ fontWeight: "700", color: "#1b5e20" }}>₫{formatCurrency(previewNetAfterSave())}</span>
              {deductionMismatch && !hasAdjustments ? (
                <div style={{ marginTop: "8px", fontSize: "11px", color: "#5d4037", lineHeight: 1.45, fontWeight: "400" }}>
                  Per breakdown (matches table above). Net <strong>stored in DB</strong>: ₫
                  {formatCurrency(num(record?.finalSalary))} — Save without changes if you enter no adjustments; use{" "}
                  <strong>Recalculate payroll</strong> to persist insurance/tax correctly.
                </div>
              ) : (
                <div style={{ marginTop: "6px", fontSize: "11px", color: "#558b2f", fontWeight: "400" }}>
                  Gross − (DB deduction + deduction adjustment) — matches API save behavior.
                </div>
              )}
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Adjustment notes</label>
              <textarea
                style={textareaStyle}
                value={adjustments.notes}
                onChange={(e) =>
                  setAdjustments({
                    ...adjustments,
                    notes: e.target.value
                  })
                }
                placeholder="Reason for adjustment (optional)…"
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={buttonGroupStyle}>
          <button
            onClick={onClose}
            style={iconButtonStyle(theme.neutral.gray600)}
            title="Close"
          >
            Close
          </button>

          {editMode && (
            <>
              <button
                onClick={() => {
                  setEditMode(false);
                  setAdjustments({
                    baseAdjustment: 0,
                    bonusAdjustment: 0,
                    deductionAdjustment: 0,
                    notes: ""
                  });
                }}
                style={iconButtonStyle(theme.neutral.gray600)}
                title="Cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdjustments}
                style={iconButtonStyle(theme.primary.main)}
                disabled={saving}
                title="Save adjustments"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}

          {!editMode && (
            <button
              onClick={() => {
                setAdjustments({
                  baseAdjustment: 0,
                  bonusAdjustment: 0,
                  deductionAdjustment: 0,
                  notes: record?.notes ?? ""
                });
                setEditMode(true);
              }}
              style={iconButtonStyle("#ffc107")}
              title="Edit salary"
            >
              Edit
            </button>
          )}
        </div>
        </div>
      </div>
    </>
  );
}


