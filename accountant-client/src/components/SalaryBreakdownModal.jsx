import React, { useState } from "react";
import { theme } from "../theme.js";

export default function SalaryBreakdownModal({ salary, employee, rules, onClose, onUpdate }) {
  // Icon Components
  const EditIcon = ({ size = 18 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );

  const SaveIcon = ({ size = 18 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );

  const CancelIcon = ({ size = 18 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const CloseIcon = ({ size = 18 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
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
    boxSizing: "border-box",
    backdropFilter: "blur(4px)",
    animation: "fadeIn 0.2s ease-in"
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
    border: `1px solid ${theme.neutral.gray200}`,
    animation: "slideUp 0.3s ease-out"
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
    <>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
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
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.neutral.gray200;
              e.currentTarget.style.color = theme.neutral.gray900;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = theme.neutral.gray500;
            }}
            title="Đóng"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Breakdown Table */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>📊 Bảng Chi Tiết Lương</div>
          <div style={{
            backgroundColor: theme.neutral.white,
            borderRadius: theme.radius.md,
            overflow: "hidden",
            boxShadow: theme.shadows.sm,
            border: `1px solid ${theme.neutral.gray200}`
          }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse"
            }}>
              <thead style={{
                backgroundColor: theme.primary.main,
                color: theme.neutral.white
              }}>
                <tr>
                  <th style={{
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    textAlign: "left",
                    fontSize: "13px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Khoản Mục
                  </th>
                  <th style={{
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    textAlign: "right",
                    fontSize: "13px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Số Tiền
                  </th>
                  <th style={{
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    textAlign: "center",
                    fontSize: "13px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Ghi Chú
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Base Salary */}
                <tr style={{
                  borderBottom: `1px solid ${theme.neutral.gray200}`,
                  backgroundColor: theme.neutral.white
                }}>
                  <td style={{
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    fontWeight: "600",
                    color: theme.neutral.gray900
                  }}>
                    Lương cơ bản
                  </td>
                  <td style={{
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    textAlign: "right",
                    fontWeight: "600",
                    color: theme.primary.main
                  }}>
                    {((salary?.baseSalary || 0) / 1000000).toFixed(2)}M₫
                  </td>
                  <td style={{
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    textAlign: "center",
                    color: theme.neutral.gray600,
                    fontSize: "12px"
                  }}>
                    100%
                  </td>
                </tr>

                {/* Bonuses */}
                {salary?.bonuses && salary.bonuses.map((bonus, idx) => {
                  const rule = rules.find((r) => r.id === bonus.ruleId);
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: `1px solid ${theme.neutral.gray200}`,
                        backgroundColor: "#f0fdf4"
                      }}
                    >
                      <td style={{
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                        fontWeight: "500",
                        color: theme.neutral.gray900
                      }}>
                        {rule?.name || "Thưởng"}
                      </td>
                      <td style={{
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                        textAlign: "right",
                        fontWeight: "600",
                        color: "#28a745"
                      }}>
                        +{(bonus.amount / 1000000).toFixed(2)}M₫
                      </td>
                      <td style={{
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                        textAlign: "center",
                        color: theme.neutral.gray600,
                        fontSize: "12px"
                      }}>
                        {rule?.description || ""}
                      </td>
                    </tr>
                  );
                })}

                {/* Total Bonus */}
                {salary?.bonuses && salary.bonuses.length > 0 && (
                  <tr style={{
                    borderBottom: `2px solid ${theme.neutral.gray300}`,
                    backgroundColor: "#e8f5e9",
                    fontWeight: "700"
                  }}>
                    <td style={{
                      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                      fontWeight: "700",
                      color: theme.neutral.gray900
                    }}>
                      Tổng thưởng
                    </td>
                    <td style={{
                      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                      textAlign: "right",
                      fontWeight: "700",
                      color: "#28a745"
                    }}>
                      +{((salary?.totalBonus || 0) / 1000000).toFixed(2)}M₫
                    </td>
                    <td style={{
                      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                      textAlign: "center"
                    }}></td>
                  </tr>
                )}

                {/* Deductions */}
                {salary?.deductions && salary.deductions.map((deduction, idx) => {
                  const rule = rules.find((r) => r.id === deduction.ruleId);
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: `1px solid ${theme.neutral.gray200}`,
                        backgroundColor: "#fff5f5"
                      }}
                    >
                      <td style={{
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                        fontWeight: "500",
                        color: theme.neutral.gray900
                      }}>
                        {rule?.name || "Khấu trừ"}
                      </td>
                      <td style={{
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                        textAlign: "right",
                        fontWeight: "600",
                        color: "#dc3545"
                      }}>
                        -{(deduction.amount / 1000000).toFixed(2)}M₫
                      </td>
                      <td style={{
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                        textAlign: "center",
                        color: theme.neutral.gray600,
                        fontSize: "12px"
                      }}>
                        {rule?.description || ""}
                      </td>
                    </tr>
                  );
                })}

                {/* Total Deduction */}
                {salary?.deductions && salary.deductions.length > 0 && (
                  <tr style={{
                    borderBottom: `2px solid ${theme.neutral.gray300}`,
                    backgroundColor: "#ffe5e5",
                    fontWeight: "700"
                  }}>
                    <td style={{
                      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                      fontWeight: "700",
                      color: theme.neutral.gray900
                    }}>
                      Tổng khấu trừ
                    </td>
                    <td style={{
                      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                      textAlign: "right",
                      fontWeight: "700",
                      color: "#dc3545"
                    }}>
                      -{((salary?.totalDeduction || 0) / 1000000).toFixed(2)}M₫
                    </td>
                    <td style={{
                      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                      textAlign: "center"
                    }}></td>
                  </tr>
                )}

                {/* Summary Row */}
                <tr style={{
                  borderTop: `3px solid ${theme.primary.main}`,
                  backgroundColor: theme.neutral.gray50,
                  fontWeight: "700"
                }}>
                  <td style={{
                    padding: `${theme.spacing.lg} ${theme.spacing.lg}`,
                    fontWeight: "700",
                    fontSize: "16px",
                    color: theme.neutral.gray900
                  }}>
                    Lương thực nhận (Net)
                  </td>
                  <td style={{
                    padding: `${theme.spacing.lg} ${theme.spacing.lg}`,
                    textAlign: "right",
                    fontWeight: "700",
                    fontSize: "18px",
                    color: theme.primary.main
                  }}>
                    {editMode
                      ? (calculateNetAdjusted() / 1000000).toFixed(2)
                      : ((salary?.netSalary || (salary?.baseSalary || 0) + (salary?.totalBonus || 0) - (salary?.totalDeduction || 0)) / 1000000).toFixed(2)}
                    M₫
                  </td>
                  <td style={{
                    padding: `${theme.spacing.lg} ${theme.spacing.lg}`,
                    textAlign: "center"
                  }}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Mode */}
        {editMode && (
          <div style={editFormStyle}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: theme.spacing.sm,
              marginBottom: theme.spacing.lg,
              paddingBottom: theme.spacing.md,
              borderBottom: `2px solid #b3d9ff`
            }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#b3d9ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px"
              }}>
                ✏️
              </div>
              <h3 style={{ 
                color: theme.primary.main, 
                margin: 0,
                fontSize: "20px",
                fontWeight: "700"
              }}>
                Điều Chỉnh Lương
              </h3>
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Điều chỉnh lương cơ bản (₫)</label>
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
                onFocus={(e) => e.target.style.borderColor = theme.primary.main}
                onBlur={(e) => e.target.style.borderColor = theme.neutral.gray300}
                placeholder="Nhập số điều chỉnh (âm để giảm, dương để tăng)"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Điều chỉnh thưởng (₫)</label>
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
                onFocus={(e) => e.target.style.borderColor = theme.primary.main}
                onBlur={(e) => e.target.style.borderColor = theme.neutral.gray300}
                placeholder="Nhập số điều chỉnh thưởng"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelFormStyle}>Điều chỉnh khấu trừ (₫)</label>
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
                onFocus={(e) => e.target.style.borderColor = theme.primary.main}
                onBlur={(e) => e.target.style.borderColor = theme.neutral.gray300}
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
                onFocus={(e) => e.target.style.borderColor = theme.primary.main}
                onBlur={(e) => e.target.style.borderColor = theme.neutral.gray300}
                placeholder="Ghi chú về điều chỉnh..."
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={buttonGroupStyle}>
          <button
            onClick={onClose}
            style={iconButtonStyle(theme.neutral.gray600, theme.neutral.gray700)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.neutral.gray700;
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = theme.shadows.md;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.neutral.gray600;
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = theme.shadows.sm;
            }}
            title="Đóng"
          >
            <CloseIcon size={16} />
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
                style={iconButtonStyle(theme.neutral.gray600, theme.neutral.gray700)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.neutral.gray700;
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = theme.shadows.md;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.neutral.gray600;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = theme.shadows.sm;
                }}
                title="Hủy"
              >
                <CancelIcon size={16} />
                Hủy
              </button>
              <button
                onClick={handleSaveAdjustments}
                style={iconButtonStyle(theme.primary.main, theme.primary.dark)}
                disabled={saving}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.currentTarget.style.backgroundColor = theme.primary.dark;
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = theme.shadows.md;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) {
                    e.currentTarget.style.backgroundColor = theme.primary.main;
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = theme.shadows.sm;
                  }
                }}
                title="Lưu điều chỉnh"
              >
                <SaveIcon size={16} />
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </>
          )}

          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              style={iconButtonStyle("#ffc107", "#ffb300")}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#ffb300";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = theme.shadows.md;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffc107";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = theme.shadows.sm;
              }}
              title="Điều chỉnh lương"
            >
              <EditIcon size={16} />
              Điều Chỉnh
            </button>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
