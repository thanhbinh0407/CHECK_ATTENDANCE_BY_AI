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
    const bonusAdjusted = (salary?.totalBonus || 0) + adjustments.bonusAdjustment;
    return baseAdjusted + bonusAdjusted;
  };

  const calculateNetAdjusted = () => {
    return (
      calculateGrossAdjusted() -
      (salary?.totalDeduction || 0) -
      adjustments.deductionAdjustment
    );
  };

  return (
    <>
      <div style={modalStyle} onClick={onClose}>
        <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>💰 Salary Breakdown</h2>
            <div style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>
              {employee?.name} - {new Date(salary?.month).toLocaleDateString("vi-VN", {
                month: "long",
                year: "numeric"
              })}
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

        {/* Breakdown Table */}
        <div style={sectionStyle}>
          {/* Breakdown content will go here */}
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


