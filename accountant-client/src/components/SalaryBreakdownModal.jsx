import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";

/** Sequelize DECIMAL / JSON can arrive as string — avoid string concatenation in + */
function num(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Map User từ API (có Department, JobTitle, SalaryGrade) sang field modal đang dùng */
function mapUserToEmployeeView(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    employeeCode: user.employeeCode,
    employeeId: user.employeeCode,
    department: user.Department?.name,
    jobTitle: user.JobTitle?.name,
    salaryGrade: user.SalaryGrade?.name || user.SalaryGrade?.code
  };
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

  /** Luôn tải đủ bản ghi lương + User theo từng salary.id (đúng nhân viên) */
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
        if (!res.ok) throw new Error(data.message || "Không tải được bản ghi lương");
        if (cancelled) return;
        setSalaryRecord(data.salary);
        setEmployeeResolved(mapUserToEmployeeView(data.salary?.User));
      } catch (e) {
        if (!cancelled) {
          setSalaryFetchError(e.message || "Lỗi tải lương");
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
          throw new Error(data.message || "Không tải được chi tiết");
        }
        if (!cancelled) setBreakdown(data.breakdown || null);
      } catch (e) {
        if (!cancelled) setBreakdownError(e.message || "Lỗi tải chi tiết");
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

  /** Ưu tiên số từ DB khi chưa chỉnh tay (tránh lệch hiển thị) */
  const displayGross = () => {
    if (hasAdjustments) return calculateGrossAdjusted();
    const g = num(record?.grossSalary);
    return g || calculateGrossAdjusted();
  };

  const displayNet = () => {
    if (hasAdjustments) return calculateNetAdjusted();
    return num(record?.finalSalary);
  };

  const formatCurrency = (value) => {
    const n = num(value);
    return n.toLocaleString("vi-VN", {
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

  return (
    <>
      <div style={modalStyle} onClick={onClose}>
        <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>💰 Chi Tiết Lương Tháng</h2>
            {salaryLoading && (
              <div style={{ fontSize: "12px", color: "#1976d2", marginTop: "4px" }}>Đang tải dữ liệu lương theo nhân viên…</div>
            )}
            {salaryFetchError && (
              <div style={{ fontSize: "12px", color: "#c62828", marginTop: "4px" }}>{salaryFetchError}</div>
            )}
            <div style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>
              <strong>{emp?.name || "—"}</strong> — Tháng {record?.month}/{record?.year}
            </div>
            <div style={{ fontSize: "12px", color: "#999", marginTop: "3px" }}>
              Mã NV: <strong>{emp?.employeeCode || emp?.employeeId || "—"}</strong>
            </div>
          </div>
          <button
            style={closeButtonStyle}
            onClick={onClose}
            title="Đóng"
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
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>Bộ Phận</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#333" }}>{emp?.department || "N/A"}</div>
          </div>
          <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>Chức Vụ</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#333" }}>{emp?.jobTitle || "N/A"}</div>
          </div>
          <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>Cấp Bậc Lương</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#333" }}>{emp?.salaryGrade || "N/A"}</div>
          </div>
        </div>

        {/* Breakdown Table */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>📊 Chi Tiết Thành Phần Lương</h3>
          {breakdownLoading && (
            <div style={{ fontSize: "12px", color: "#666", marginBottom: theme.spacing.sm }}>Đang tải chi tiết các khoản…</div>
          )}
          {breakdownError && (
            <div style={{ fontSize: "12px", color: "#c62828", marginBottom: theme.spacing.sm }}>{breakdownError}</div>
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
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#1976d2", marginBottom: "4px" }}>Lương Cơ Bản</div>
                <div style={{ fontSize: "12px", color: "#666" }}>Mức lương hàng tháng cơ bản — bấm để xem chi tiết</div>
                {showBaseDetails && (
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "#555" }}>
                    <div style={detailLineStyle}>
                      <span>Lương gốc (theo bản ghi lương)</span>
                      <span>₫{formatCurrency(num(record?.baseSalary))}</span>
                    </div>
                    {breakdown && Math.abs(num(breakdown.baseSalary) - num(record?.baseSalary)) > 0.01 && (
                      <div style={{ ...detailLineStyle, fontSize: "11px", color: "#888" }}>
                        <span>Tham chiếu từ hồ sơ (tính lại)</span>
                        <span>₫{formatCurrency(breakdown.baseSalary)}</span>
                      </div>
                    )}
                    {num(adjustments.baseAdjustment) !== 0 && (
                      <div style={detailLineStyle}>
                        <span>Điều chỉnh thủ công</span>
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
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#388e3c", marginBottom: "4px" }}>Thưởng và phụ cấp</div>
                <div style={{ fontSize: "12px", color: "#666" }}>Phụ cấp, quy tắc thưởng, làm thêm… — bấm để xem từng dòng</div>
                {showBonusDetails && (
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "#555" }}>
                    {breakdown?.bonusBreakdown?.length > 0 ? (
                      breakdown.bonusBreakdown.map((row, idx) => (
                        <div key={idx} style={detailLineStyle}>
                          <span title={row.reason || row.ruleDescription}>{row.ruleName || "Khoản thưởng"}</span>
                          <span>+₫{formatCurrency(row.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: "12px", color: "#777" }}>Chưa có phân tích chi tiết — hiển thị tổng theo bản ghi.</div>
                    )}
                    <div style={{ ...detailLineStyle, fontWeight: "600", marginTop: "6px", borderBottom: "none" }}>
                      <span>Tổng (theo hệ thống chi tiết)</span>
                      <span>₫{formatCurrency(breakdown?.totalBonus ?? num(record?.bonus))}</span>
                    </div>
                    <div style={detailLineStyle}>
                      <span>Thưởng trên bản ghi lương</span>
                      <span>₫{formatCurrency(record?.bonus)}</span>
                    </div>
                    {num(adjustments.bonusAdjustment) !== 0 && (
                      <div style={detailLineStyle}>
                        <span>Điều chỉnh thủ công</span>
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
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#f57c00", marginBottom: "4px" }}>Tổng Lương Brutto</div>
                <div style={{ fontSize: "12px", color: "#666" }}>Lương cơ bản + Thưởng (đã cộng số)</div>
                {showGrossDetails && (
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "#555" }}>
                    <div style={detailLineStyle}>
                      <span>Lương cơ bản (sau điều chỉnh)</span>
                      <span>₫{formatCurrency(num(record?.baseSalary) + num(adjustments.baseAdjustment))}</span>
                    </div>
                    <div style={detailLineStyle}>
                      <span>Thưởng (sau điều chỉnh)</span>
                      <span>₫{formatCurrency(num(record?.bonus) + num(adjustments.bonusAdjustment))}</span>
                    </div>
                    <div style={{ ...detailLineStyle, fontWeight: "600", borderBottom: "none", marginTop: "4px" }}>
                      <span>Cộng (Brutto)</span>
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
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#d32f2f", marginBottom: "4px" }}>Các Khoản Giảm Trừ</div>
                <div style={{ fontSize: "12px", color: "#666" }}>Thuế, BHXH, phạt, ứng lương… — bấm để xem từng dòng</div>
                {showDeductionDetails && (
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "#555" }}>
                    {breakdown?.deductionBreakdown?.length > 0 ? (
                      breakdown.deductionBreakdown.map((row, idx) => (
                        <div key={idx} style={detailLineStyle}>
                          <span title={row.reason || row.ruleDescription}>{row.ruleName || "Khấu trừ"}</span>
                          <span>−₫{formatCurrency(row.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        {num(record?.advanceDeduction) > 0 && (
                          <div style={detailLineStyle}>
                            <span>Ứng lương</span>
                            <span>−₫{formatCurrency(record.advanceDeduction)}</span>
                          </div>
                        )}
                        <div style={detailLineStyle}>
                          <span>Các khoản khác (tổng trừ − ứng lương)</span>
                          <span>−₫{formatCurrency(num(record?.deduction) - num(record?.advanceDeduction))}</span>
                        </div>
                      </>
                    )}
                    <div style={{ ...detailLineStyle, fontWeight: "600", marginTop: "6px", borderBottom: "none" }}>
                      <span>Tổng khấu trừ (bản ghi)</span>
                      <span>−₫{formatCurrency(num(record?.deduction) + num(adjustments.deductionAdjustment))}</span>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", fontWeight: "700", fontSize: "16px", color: "#d32f2f" }}>
                −₫{formatCurrency(num(record?.deduction) + num(adjustments.deductionAdjustment))}
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
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff", marginBottom: "4px" }}>LƯƠNG NHẬN (NETTO)</div>
                <div style={{ fontSize: "12px", color: "#e3f2fd" }}>Số tiền thực nhận — bấm để xem công thức</div>
                {showNetDetails && (
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "#e3f2fd" }}>
                    <div style={{ ...detailLineStyle, borderColor: "rgba(255,255,255,0.25)" }}>
                      <span>Brutto</span>
                      <span>₫{formatCurrency(displayGross())}</span>
                    </div>
                    <div style={{ ...detailLineStyle, borderColor: "rgba(255,255,255,0.25)" }}>
                      <span>Trừ các khoản giảm trừ</span>
                      <span>−₫{formatCurrency(num(record?.deduction) + num(adjustments.deductionAdjustment))}</span>
                    </div>
                    <div style={{ ...detailLineStyle, fontWeight: "700", borderBottom: "none" }}>
                      <span>= Netto (theo bản ghi / điều chỉnh)</span>
                      <span>₫{formatCurrency(displayNet())}</span>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", fontWeight: "700", fontSize: "20px", color: "#fff" }}>
                ₫{formatCurrency(displayNet())}
              </div>
            </div>
          </div>
        </div>

        {/* Status & Additional Info */}
        <div style={{
          ...sectionStyle,
          marginTop: theme.spacing.xl
        }}>
          <h3 style={sectionTitleStyle}>📋 Trạng Thái & Thông Tin Khác</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: theme.spacing.lg
          }}>
            <div style={{ padding: theme.spacing.lg, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", marginBottom: "8px", fontWeight: "600" }}>Trạng Thái</div>
              <div style={{
                display: "inline-block",
                padding: "6px 16px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "600",
                backgroundColor: record?.status === "paid" ? "#c8e6c9" : record?.status === "approved" ? "#fff9c4" : "#ffccbc",
                color: record?.status === "paid" ? "#2e7d32" : record?.status === "approved" ? "#f57f17" : "#d84315"
              }}>
                {record?.status === "pending" ? "Chờ Duyệt" : record?.status === "approved" ? "Đã Duyệt" : "Đã Chi"}
              </div>
            </div>
            <div style={{ padding: theme.spacing.lg, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", marginBottom: "8px", fontWeight: "600" }}>Thời Gian Tính Lương</div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                {record?.calculatedAt ? new Date(record.calculatedAt).toLocaleDateString("vi-VN") : "N/A"}
              </div>
            </div>
            {record?.notes && (
              <div style={{ padding: theme.spacing.lg, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md, gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", marginBottom: "8px", fontWeight: "600" }}>Ghi Chú</div>
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
                Giá trị hiện tại (theo bản ghi lương)
              </div>
              <div style={{ fontSize: "13px", color: "#444", marginBottom: theme.spacing.md }}>
                <strong>{emp?.name || "—"}</strong>
                {emp?.employeeCode ? ` · Mã ${emp.employeeCode}` : ""}
                {record?.id != null ? ` · Bản ghi #${record.id}` : ""}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: theme.spacing.md, fontSize: "14px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Lương cơ bản</div>
                  <div style={{ fontWeight: "700", color: "#1976d2" }}>₫{formatCurrency(num(record?.baseSalary))}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Thưởng</div>
                  <div style={{ fontWeight: "700", color: "#2e7d32" }}>₫{formatCurrency(num(record?.bonus))}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Tổng khấu trừ</div>
                  <div style={{ fontWeight: "700", color: "#c62828" }}>₫{formatCurrency(num(record?.deduction))}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Brutto</div>
                  <div style={{ fontWeight: "700", color: "#e65100" }}>₫{formatCurrency(num(record?.grossSalary) || num(record?.baseSalary) + num(record?.bonus))}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Net (thực nhận)</div>
                  <div style={{ fontWeight: "700", color: "#1565c0" }}>₫{formatCurrency(num(record?.finalSalary))}</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: theme.spacing.md, fontSize: "13px", color: "#555", lineHeight: 1.5 }}>
              Các ô bên dưới là <strong>phần cộng thêm hoặc trừ bớt</strong> so với giá trị hiện tại (VD: tăng lương cơ bản 500.000 thì nhập <code style={{ fontSize: "12px" }}>500000</code>; giảm thưởng 200.000 thì nhập <code style={{ fontSize: "12px" }}>-200000</code>).
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Điều chỉnh lương cơ bản (±)</label>
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
                placeholder="0 — số dương tăng, âm giảm"
              />
              <div style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
                → Sau điều chỉnh: ₫{formatCurrency(num(record?.baseSalary) + num(adjustments.baseAdjustment))}
              </div>
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Điều chỉnh thưởng (±)</label>
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
                placeholder="0 — số dương tăng, âm giảm"
              />
              <div style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
                → Sau điều chỉnh: ₫{formatCurrency(num(record?.bonus) + num(adjustments.bonusAdjustment))}
              </div>
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Điều chỉnh tổng khấu trừ (±)</label>
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
                placeholder="0 — tăng khấu trừ: số dương; giảm khấu trừ: số âm"
              />
              <div style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
                → Sau điều chỉnh: ₫{formatCurrency(num(record?.deduction) + num(adjustments.deductionAdjustment))}
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
              <strong style={{ color: "#2e7d32" }}>Xem trước net sau khi lưu:</strong>{" "}
              ₫{formatCurrency(
                num(record?.baseSalary) +
                  num(adjustments.baseAdjustment) +
                  num(record?.bonus) +
                  num(adjustments.bonusAdjustment) -
                  (num(record?.deduction) + num(adjustments.deductionAdjustment))
              )}
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Ghi chú điều chỉnh</label>
              <textarea
                style={textareaStyle}
                value={adjustments.notes}
                onChange={(e) =>
                  setAdjustments({
                    ...adjustments,
                    notes: e.target.value
                  })
                }
                placeholder="Ghi chú lý do điều chỉnh (nếu có)…"
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={buttonGroupStyle}>
          <button
            onClick={onClose}
            style={iconButtonStyle(theme.neutral.gray600)}
            title="Đóng"
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
                title="Hủy"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdjustments}
                style={iconButtonStyle(theme.primary.main)}
                disabled={saving}
                title="Lưu điều chỉnh"
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
              title="Điều chỉnh lương"
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


