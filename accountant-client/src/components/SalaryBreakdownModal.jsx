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
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "20px",
    boxSizing: "border-box"
  };

  const contentStyle = {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "30px",
    maxWidth: "800px",
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
    paddingBottom: "15px",
    borderBottom: `2px solid ${theme.colors.border}`
  };

  const titleStyle = {
    fontSize: "22px",
    fontWeight: "700",
    color: theme.colors.primary,
    margin: 0
  };

  const closeButtonStyle = {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#999",
    transition: "color 0.2s"
  };

  const sectionStyle = {
    marginBottom: "25px",
    paddingBottom: "20px",
    borderBottom: `1px solid ${theme.colors.border}`
  };

  const sectionTitleStyle = {
    fontSize: "16px",
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: "15px",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  };

  const itemRowStyle = {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: "15px",
    padding: "12px",
    backgroundColor: "#f9f9f9",
    marginBottom: "8px",
    borderRadius: "5px",
    alignItems: "center",
    fontSize: "14px"
  };

  const labelStyle = {
    fontWeight: "600",
    color: "#333"
  };

  const amountStyle = {
    textAlign: "right",
    fontWeight: "600",
    color: theme.colors.primary
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
    padding: "20px",
    borderRadius: "8px",
    marginTop: "15px"
  };

  const formGroupStyle = {
    marginBottom: "15px"
  };

  const labelFormStyle = {
    display: "block",
    fontWeight: "600",
    marginBottom: "5px",
    color: theme.colors.primary,
    fontSize: "14px"
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "5px",
    fontSize: "14px",
    boxSizing: "border-box"
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: "80px",
    resize: "vertical"
  };

  const buttonGroupStyle = {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
    justifyContent: "flex-end"
  };

  const buttonStyle = {
    padding: "10px 20px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s"
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: theme.colors.primary,
    color: "white"
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#6c757d",
    color: "white"
  };

  const editButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#ffc107",
    color: "#333",
    marginLeft: "auto"
  };

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
        alert("Cập nhật phiên bản lương thành công");
      } else {
        alert("Lỗi khi cập nhật");
      }
    } catch (error) {
      alert("Lỗi: " + error.message);
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
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>💰 Chi Tiết Tính Lương</h2>
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
            onMouseOver={(e) => (e.target.style.color = "#333")}
            onMouseOut={(e) => (e.target.style.color = "#999")}
          >
            ✕
          </button>
        </div>

        {/* Base Salary */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>📊 Lương Cơ Bản</div>
          <div style={itemRowStyle}>
            <div style={labelStyle}>Lương cơ bản tháng</div>
            <div style={amountStyle}>
              {((salary?.baseSalary || 0) / 1000000).toFixed(2)}M₫
            </div>
            <div style={percentStyle}>100%</div>
          </div>
        </div>

        {/* Bonuses */}
        {salary?.bonuses && salary.bonuses.length > 0 && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>🎁 Các Khoản Thưởng</div>
            {salary.bonuses.map((bonus, idx) => {
              const rule = rules.find((r) => r.id === bonus.ruleId);
              return (
                <div key={idx} style={itemRowStyle}>
                  <div style={labelStyle}>{rule?.name || "Thưởng"}</div>
                  <div style={amountStyle}>+{(bonus.amount / 1000000).toFixed(2)}M₫</div>
                  <div style={percentStyle}>{rule?.description || ""}</div>
                </div>
              );
            })}
            <div style={{ ...itemRowStyle, backgroundColor: "#e8f5e9" }}>
              <div style={labelStyle}>Tổng thưởng</div>
              <div style={{ ...amountStyle, color: "#28a745" }}>
                +{((salary?.totalBonus || 0) / 1000000).toFixed(2)}M₫
              </div>
              <div></div>
            </div>
          </div>
        )}

        {/* Deductions */}
        {salary?.deductions && salary.deductions.length > 0 && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>📉 Các Khoản Khấu Trừ</div>
            {salary.deductions.map((deduction, idx) => {
              const rule = rules.find((r) => r.id === deduction.ruleId);
              return (
                <div key={idx} style={itemRowStyle}>
                  <div style={labelStyle}>{rule?.name || "Khấu trừ"}</div>
                  <div style={{ ...amountStyle, color: "#dc3545" }}>
                    -{(deduction.amount / 1000000).toFixed(2)}M₫
                  </div>
                  <div style={percentStyle}>{rule?.description || ""}</div>
                </div>
              );
            })}
            <div style={{ ...itemRowStyle, backgroundColor: "#ffe5e5" }}>
              <div style={labelStyle}>Tổng khấu trừ</div>
              <div style={{ ...amountStyle, color: "#dc3545" }}>
                -{((salary?.totalDeduction || 0) / 1000000).toFixed(2)}M₫
              </div>
              <div></div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>📈 Tổng Hợp</div>
          <div style={summaryStyle}>
            <div style={{ ...summaryItemStyle, backgroundColor: "#f0f8ff", borderLeft: `4px solid ${theme.colors.primary}` }}>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>Tổng Gross</div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: theme.colors.primary }}>
                {editMode
                  ? (calculateGrossAdjusted() / 1000000).toFixed(2)
                  : ((salary?.baseSalary || 0 + salary?.totalBonus || 0) / 1000000).toFixed(2)}
                M₫
              </div>
            </div>
            <div style={{ ...summaryItemStyle, backgroundColor: "#e8f5e9", borderLeft: "4px solid #28a745" }}>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>Lương Net</div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#28a745" }}>
                {editMode
                  ? (calculateNetAdjusted() / 1000000).toFixed(2)
                  : ((salary?.netSalary || salary?.baseSalary - salary?.totalDeduction || 0) / 1000000).toFixed(2)}
                M₫
              </div>
            </div>
          </div>
        </div>

        {/* Edit Mode */}
        {editMode && (
          <div style={editFormStyle}>
            <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>
              ✏️ Điều Chỉnh Lương
            </h3>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Điều chỉnh lương cơ bản (đơn vị: đồng)</label>
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
                placeholder="Nhập số điều chỉnh (âm để giảm, dương để tăng)"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Điều chỉnh thưởng (đơn vị: đồng)</label>
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
                placeholder="Nhập số điều chỉnh thưởng"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Điều chỉnh khấu trừ (đơn vị: đồng)</label>
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
                placeholder="Nhập số điều chỉnh khấu trừ"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Ghi chú</label>
              <textarea
                style={textareaStyle}
                value={adjustments.notes}
                onChange={(e) =>
                  setAdjustments({
                    ...adjustments,
                    notes: e.target.value
                  })
                }
                placeholder="Ghi chú về điều chỉnh..."
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={buttonGroupStyle}>
          <button
            onClick={onClose}
            style={secondaryButtonStyle}
            onMouseOver={(e) => (e.target.style.opacity = 0.9)}
            onMouseOut={(e) => (e.target.style.opacity = 1)}
          >
            Đóng
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
                style={secondaryButtonStyle}
                onMouseOver={(e) => (e.target.style.opacity = 0.9)}
                onMouseOut={(e) => (e.target.style.opacity = 1)}
              >
                Hủy
              </button>
              <button
                onClick={handleSaveAdjustments}
                style={primaryButtonStyle}
                disabled={saving}
                onMouseOver={(e) => !saving && (e.target.style.opacity = 0.9)}
                onMouseOut={(e) => !saving && (e.target.style.opacity = 1)}
              >
                {saving ? "Đang lưu..." : "Lưu Điều Chỉnh"}
              </button>
            </>
          )}

          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              style={editButtonStyle}
              onMouseOver={(e) => (e.target.style.opacity = 0.9)}
              onMouseOut={(e) => (e.target.style.opacity = 1)}
            >
              ✏️ Điều Chỉnh
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
