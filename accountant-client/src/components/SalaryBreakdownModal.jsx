import React, { useState } from "react";
import { theme } from "../theme.js";

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
  const [showDeductionDetails, setShowDeductionDetails] = useState(false);
  const [saving, setSaving] = useState(false);

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

      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const res = await fetch(`${apiBase}/api/salary/${salary.id}/adjust`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(adjustments)
      });

      if (res.ok) {
        const updatedSalary = await res.json();
        if (onUpdate) onUpdate(updatedSalary);
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

  const calculateGrossAdjusted = () => {
    const baseAdjusted = (salary?.baseSalary || 0) + adjustments.baseAdjustment;
    const bonusBase = (salary?.totalBonus != null ? salary.totalBonus : (salary?.bonus || 0));
    const bonusAdjusted = bonusBase + adjustments.bonusAdjustment;
    return baseAdjusted + bonusAdjusted;
  };

  const calculateNetAdjusted = () => {
    const deductionBase = (salary?.totalDeduction != null ? salary.totalDeduction : (salary?.deduction || 0));
    return (
      calculateGrossAdjusted() -
      deductionBase -
      adjustments.deductionAdjustment
    );
  };

  const formatCurrency = (value) => {
    return (value || 0).toLocaleString('vi-VN', { 
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  };

  return (
    <>
      <div style={modalStyle} onClick={onClose}>
        <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>💰 Chi Tiết Lương Tháng</h2>
            <div style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>
              <strong>{employee?.name}</strong> - Tháng {salary?.month}/{salary?.year}
            </div>
            <div style={{ fontSize: "12px", color: "#999", marginTop: "3px" }}>
              Mã nhân viên: <strong>{employee?.employeeId}</strong>
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
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#333" }}>{employee?.department || "N/A"}</div>
          </div>
          <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>Chức Vụ</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#333" }}>{employee?.jobTitle || "N/A"}</div>
          </div>
          <div style={{ padding: theme.spacing.md, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>Cấp Bậc Lương</div>
            <div style={{ fontSize: "15px", fontWeight: "600", color: "#333" }}>{employee?.salaryGrade || "N/A"}</div>
          </div>
        </div>

        {/* Breakdown Table */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>📊 Chi Tiết Thành Phần Lương</h3>
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
                <div style={{ fontSize: "12px", color: "#666" }}>Mức lương hàng tháng cơ bản</div>
                {showBaseDetails && (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#555" }}>
                    <div>Gốc: ₫{formatCurrency(salary?.baseSalary || 0)}</div>
                    {adjustments.baseAdjustment !== 0 && (
                      <div>Điều chỉnh: ₫{formatCurrency(adjustments.baseAdjustment)}</div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", fontWeight: "700", fontSize: "16px", color: "#1976d2" }}>
                ₫{formatCurrency((salary?.baseSalary || 0) + adjustments.baseAdjustment)}
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
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#388e3c", marginBottom: "4px" }}>Thưởng</div>
                <div style={{ fontSize: "12px", color: "#666" }}>Thưởng hiệu suất, khác</div>
                {showBonusDetails && (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#555" }}>
                    <div>Thưởng gốc: ₫{formatCurrency(salary?.bonus || 0)}</div>
                    {adjustments.bonusAdjustment !== 0 && (
                      <div>Điều chỉnh: ₫{formatCurrency(adjustments.bonusAdjustment)}</div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", fontWeight: "700", fontSize: "16px", color: "#388e3c" }}>
                +₫{formatCurrency((salary?.bonus || 0) + adjustments.bonusAdjustment)}
              </div>
            </div>

            {/* Gross Salary */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: theme.spacing.lg,
              padding: theme.spacing.lg,
              backgroundColor: "#fff3e0",
              borderRadius: theme.radius.md,
              borderLeft: `4px solid #f57c00`
            }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#f57c00", marginBottom: "4px" }}>Tổng Lương Brutto</div>
                <div style={{ fontSize: "12px", color: "#666" }}>Lương cơ bản + Thưởng</div>
              </div>
              <div style={{ textAlign: "right", fontWeight: "700", fontSize: "16px", color: "#f57c00" }}>
                ₫{formatCurrency(calculateGrossAdjusted())}
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
                <div style={{ fontSize: "12px", color: "#666" }}>Thuế, BHXH, BHYT, ứng lương, v.v.</div>
                {showDeductionDetails && (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#555" }}>
                    {salary?.advanceDeduction > 0 && (
                      <div>Ứng lương: ₫{formatCurrency(salary.advanceDeduction)}</div>
                    )}
                    <div>
                      Các khoản khác (thuế, BHXH, BHYT...): ₫
                      {formatCurrency((salary?.deduction || salary?.totalDeduction || 0) - (salary?.advanceDeduction || 0))}
                    </div>
                    {adjustments.deductionAdjustment !== 0 && (
                      <div>Điều chỉnh khấu trừ: ₫{formatCurrency(adjustments.deductionAdjustment)}</div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", fontWeight: "700", fontSize: "16px", color: "#d32f2f" }}>
                -₫{formatCurrency((salary?.deduction || salary?.totalDeduction || 0) + adjustments.deductionAdjustment)}
              </div>
            </div>

            {/* Net Salary */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: theme.spacing.lg,
              padding: theme.spacing.xl,
              backgroundColor: "#2196f3",
              borderRadius: theme.radius.md,
              borderLeft: `4px solid #1565c0`,
              marginTop: theme.spacing.md
            }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff", marginBottom: "4px" }}>LƯƠNG NHẬN (NETTO)</div>
                <div style={{ fontSize: "12px", color: "#e3f2fd" }}>Số tiền lương thực tế nhận được</div>
              </div>
              <div style={{ textAlign: "right", fontWeight: "700", fontSize: "20px", color: "#fff" }}>
                ₫{formatCurrency(calculateNetAdjusted())}
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
                backgroundColor: salary?.status === "paid" ? "#c8e6c9" : salary?.status === "approved" ? "#fff9c4" : "#ffccbc",
                color: salary?.status === "paid" ? "#2e7d32" : salary?.status === "approved" ? "#f57f17" : "#d84315"
              }}>
                {salary?.status === "pending" ? "Chờ Duyệt" : salary?.status === "approved" ? "Đã Duyệt" : "Đã Chi"}
              </div>
            </div>
            <div style={{ padding: theme.spacing.lg, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md }}>
              <div style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", marginBottom: "8px", fontWeight: "600" }}>Thời Gian Tính Lương</div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                {salary?.calculatedAt ? new Date(salary.calculatedAt).toLocaleDateString("vi-VN") : "N/A"}
              </div>
            </div>
            {salary?.notes && (
              <div style={{ padding: theme.spacing.lg, backgroundColor: theme.neutral.gray50, borderRadius: theme.radius.md, gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", marginBottom: "8px", fontWeight: "600" }}>Ghi Chú</div>
                <div style={{ fontSize: "14px", color: "#333", whiteSpace: "pre-wrap" }}>{salary.notes}</div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Mode */}
        {editMode && (
          <div style={editFormStyle}>
            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Base Salary Adjustment</label>
              <input
                type="number"
                style={inputStyle}
                value={adjustments.baseAdjustment}
                onChange={(e) =>
                  setAdjustments({
                    ...adjustments,
                    baseAdjustment: parseFloat(e.target.value) || 0
                  })
                }
                placeholder="Enter adjustment (negative to decrease, positive to increase)"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Bonus Adjustment</label>
              <input
                type="number"
                style={inputStyle}
                value={adjustments.bonusAdjustment}
                onChange={(e) =>
                  setAdjustments({
                    ...adjustments,
                    bonusAdjustment: parseFloat(e.target.value) || 0
                  })
                }
                placeholder="Enter bonus adjustment amount"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Deduction Adjustment</label>
              <input
                type="number"
                style={inputStyle}
                value={adjustments.deductionAdjustment}
                onChange={(e) =>
                  setAdjustments({
                    ...adjustments,
                    deductionAdjustment: parseFloat(e.target.value) || 0
                  })
                }
                placeholder="Enter deduction adjustment amount"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Notes</label>
              <textarea
                style={textareaStyle}
                value={adjustments.notes}
                onChange={(e) =>
                  setAdjustments({
                    ...adjustments,
                    notes: e.target.value
                  })
                }
                placeholder="Notes about adjustment..."
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
              onClick={() => setEditMode(true)}
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


