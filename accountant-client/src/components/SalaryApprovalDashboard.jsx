import React, { useState, useEffect, useCallback, useMemo } from "react";
import { theme } from "../theme.js";

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes salaryApprovalToast {
    from { transform: translateX(120%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
if (!document.head.querySelector("style[data-salary-approval-toast]")) {
  styleSheet.setAttribute("data-salary-approval-toast", "true");
  document.head.appendChild(styleSheet);
}

function currentUserRole() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw)?.role || null;
  } catch {
    return null;
  }
}

function parseRejectionReason(notes) {
  if (typeof notes !== "string") return "";
  return notes.replace(/^\[REJECTED\]\s*/i, "").trim();
}

async function readApiError(res) {
  try {
    const d = await res.json();
    return d.message || d.error || `Lỗi ${res.status}`;
  } catch {
    return res.statusText || `Lỗi ${res.status}`;
  }
}

/**
 * Luồng: pending → (Supervisor/Manager duyệt) → approved → (Kế toán mark paid) → paid
 * Trang này nằm trên accountant-client nhưng nút Duyệt/Từ chối chỉ cho supervisor/manager (theo API).
 * Kế toán: theo dõi hàng chờ + bản ghi bị trả về để tính lại lương.
 */
export default function SalaryApprovalDashboard({ onNavigate } = {}) {
  const [pendingSalaries, setPendingSalaries] = useState([]);
  const [awaitingRecalc, setAwaitingRecalc] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [approvalInProgress, setApprovalInProgress] = useState({});
  const [showRejectReason, setShowRejectReason] = useState({});
  const [rejectReasons, setRejectReasons] = useState({});
  const [message, setMessage] = useState("");

  const role = useMemo(() => currentUserRole(), []);
  const canApprove = role === "manager" || role === "supervisor";
  const isAccountant = role === "accountant";

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(t);
  }, [message]);

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  }, [now]);

  const fetchPendingSalaries = useCallback(async () => {
    const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
    const token = localStorage.getItem("authToken");
    if (!token) {
      setFetchError("Chưa đăng nhập.");
      setLoading(false);
      return;
    }
    setFetchError("");
    try {
      setLoading(true);
      const res = await fetch(
        `${apiBase}/api/salary/pending?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.message || "Không tải được danh sách.");
        setPendingSalaries([]);
        setAwaitingRecalc([]);
        return;
      }
      setPendingSalaries(data.salaries || []);
      setAwaitingRecalc(data.awaitingRecalc || []);
    } catch (e) {
      console.error(e);
      setFetchError(e.message || "Lỗi mạng.");
      setPendingSalaries([]);
      setAwaitingRecalc([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchPendingSalaries();
  }, [fetchPendingSalaries]);

  const clearProgress = (salaryId) => {
    setApprovalInProgress((prev) => {
      const next = { ...prev };
      delete next[salaryId];
      return next;
    });
  };

  const approveSalary = async (salaryId) => {
    const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
    const token = localStorage.getItem("authToken");
    setApprovalInProgress((p) => ({ ...p, [salaryId]: "approving" }));
    try {
      const res = await fetch(`${apiBase}/api/salary/${salaryId}/approve`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const msg = await readApiError(res);
        setMessage(`❌ ${msg}`);
        clearProgress(salaryId);
        return;
      }
      await fetchPendingSalaries();
      setMessage("✅ Đã duyệt bảng lương. Kế toán có thể ghi nhận chi trả (mark paid) khi sẵn sàng.");
      clearProgress(salaryId);
    } catch (e) {
      console.error(e);
      setMessage("❌ Lỗi khi duyệt.");
      clearProgress(salaryId);
    }
  };

  const rejectSalary = async (salaryId) => {
    const reason = (rejectReasons[salaryId] || "").trim();
    if (!reason) {
      setMessage("❌ Vui lòng nhập lý do từ chối.");
      return;
    }
    const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
    const token = localStorage.getItem("authToken");
    setApprovalInProgress((p) => ({ ...p, [salaryId]: "rejecting" }));
    try {
      const res = await fetch(`${apiBase}/api/salary/${salaryId}/reject`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const msg = await readApiError(res);
        setMessage(`❌ ${msg}`);
        clearProgress(salaryId);
        return;
      }
      await fetchPendingSalaries();
      setShowRejectReason((p) => ({ ...p, [salaryId]: false }));
      setRejectReasons((p) => {
        const n = { ...p };
        delete n[salaryId];
        return n;
      });
      setMessage("✅ Đã ghi nhận từ chối. Bản ghi chuyển sang mục “Chờ tính lại lương” — kế toán cần chạy lại tính lương.");
      clearProgress(salaryId);
    } catch (e) {
      console.error(e);
      setMessage("❌ Lỗi khi từ chối.");
      clearProgress(salaryId);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN").format(Number(amount) || 0) + " ₫";

  const thStyle = {
    padding: "12px 14px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: theme.neutral.white,
    borderBottom: "none",
  };

  const cell = { padding: "12px 14px", fontSize: "14px", color: theme.primary.main };

  return (
    <div style={{ padding: "0", maxWidth: "1200px" }}>
      {message && (
        <div
          style={{
            position: "fixed",
            top: "88px",
            right: "24px",
            padding: "14px 18px",
            backgroundColor: message.includes("✅") ? "#ecfdf5" : "#fef2f2",
            color: message.includes("✅") ? "#065f46" : "#991b1b",
            borderRadius: "12px",
            boxShadow: "0 10px 40px rgba(15,23,42,0.12)",
            zIndex: 9999,
            maxWidth: "380px",
            animation: "salaryApprovalToast 0.35s ease-out",
            border: `1px solid ${message.includes("✅") ? "#6ee7b7" : "#fecaca"}`,
            fontSize: "14px",
            lineHeight: 1.45,
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          background: `linear-gradient(135deg, ${theme.primary.dark} 0%, ${theme.primary.main} 100%)`,
          color: "#fff",
          borderRadius: "14px",
          padding: "22px 24px",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: "0 0 8px 0", fontSize: "1.35rem", fontWeight: "800" }}>
          Duyệt bảng lương (payroll)
        </h2>
        <p style={{ margin: 0, opacity: 0.88, fontSize: "14px", maxWidth: "640px", lineHeight: 1.5 }}>
          {canApprove && (
            <>
              Bạn có quyền <strong>duyệt / từ chối</strong> các bản ghi trạng thái <em>chờ duyệt</em>. Từ chối sẽ đưa bản ghi về
              luồng <strong>tính lại lương</strong> (kế toán xử lý), không xóa dữ liệu.
            </>
          )}
          {isAccountant && (
            <>
              Với vai trò <strong>kế toán</strong>, bạn <strong>không duyệt</strong> bảng lương (theo quy định hệ thống).
              Hãy dùng trang này để <strong>theo dõi hàng chờ</strong> và các bản ghi bị trả về; sau khi Giám đốc/Supervisor duyệt,
              dùng <strong>Quản lý lương</strong> để ghi nhận chi trả.
            </>
          )}
          {!canApprove && !isAccountant && (
            <>
              Xem danh sách bảng lương chờ duyệt theo tháng/năm. Thao tác duyệt chỉ dành cho <strong>Supervisor</strong> hoặc{" "}
              <strong>Manager</strong>.
            </>
          )}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "flex-end",
          marginBottom: "20px",
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: theme.neutral.gray500, marginBottom: "6px" }}>
            Tháng
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: `1px solid ${theme.colors.border}`,
              minWidth: "120px",
              fontSize: "14px",
              background: "#fff",
            }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: theme.neutral.gray500, marginBottom: "6px" }}>
            Năm
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: `1px solid ${theme.colors.border}`,
              minWidth: "100px",
              fontSize: "14px",
              background: "#fff",
            }}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => fetchPendingSalaries()}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            border: `1px solid ${theme.accent.main}`,
            background: theme.neutral.white,
            color: theme.accent.dark,
            fontWeight: "700",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Làm mới
        </button>
        <span style={{ fontSize: "14px", color: theme.neutral.gray600, fontWeight: "600" }}>
          {pendingSalaries.length} chờ duyệt
          {awaitingRecalc.length > 0 ? ` · ${awaitingRecalc.length} chờ tính lại` : ""}
        </span>
      </div>

      {isAccountant && onNavigate && awaitingRecalc.length > 0 && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: "12px",
            fontSize: "13px",
            color: "#92400e",
          }}
        >
          Có bản ghi cần <strong>tính lại lương</strong>. Mở{" "}
          <button
            type="button"
            onClick={() => onNavigate("salary-calculation")}
            style={{
              border: "none",
              background: "none",
              color: theme.accent.hover,
              fontWeight: "800",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Tính lương
          </button>{" "}
          cho đúng tháng/năm, sau đó bản ghi sẽ quay lại hàng chờ duyệt (sạch ghi chú từ chối).
        </div>
      )}

      {fetchError && (
        <div style={{ padding: "14px", background: "#fef2f2", color: "#991b1b", borderRadius: "10px", marginBottom: "16px" }}>
          {fetchError}
        </div>
      )}

      {loading ? (
        <p style={{ color: theme.neutral.gray500 }}>Đang tải…</p>
      ) : (
        <>
          <div
            style={{
              background: theme.neutral.white,
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              border: `1px solid ${theme.colors.border}`,
              marginBottom: "24px",
            }}
          >
            <div style={{ padding: "12px 16px", background: theme.neutral.gray50, borderBottom: `1px solid ${theme.colors.border}` }}>
              <strong style={{ color: theme.primary.main }}>Chờ duyệt (Supervisor / Manager)</strong>
            </div>
            {pendingSalaries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: theme.neutral.gray500 }}>
                Không có bảng lương chờ duyệt cho {selectedMonth}/{selectedYear}.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: theme.primary.main }}>
                    <tr>
                      <th style={thStyle}>Nhân viên</th>
                      <th style={thStyle}>Mã NV</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Lương cơ bản</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Thưởng</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Khấu trừ</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Thực lĩnh</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingSalaries.map((salary) => (
                      <React.Fragment key={salary.id}>
                        <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                          <td style={cell}>
                            <div style={{ fontWeight: "700" }}>{salary.User?.name || "—"}</div>
                            <div style={{ fontSize: "12px", color: theme.neutral.gray500 }}>
                              Kỳ {salary.month}/{salary.year}
                            </div>
                            {approvalInProgress[salary.id] === "approving" && (
                              <div style={{ fontSize: "12px", color: theme.accent.main }}>Đang duyệt…</div>
                            )}
                            {approvalInProgress[salary.id] === "rejecting" && (
                              <div style={{ fontSize: "12px", color: "#ea580c" }}>Đang từ chối…</div>
                            )}
                          </td>
                          <td style={{ ...cell, fontWeight: "600" }}>{salary.User?.employeeCode || "—"}</td>
                          <td style={{ ...cell, textAlign: "right" }}>{formatCurrency(salary.baseSalary)}</td>
                          <td style={{ ...cell, textAlign: "right", color: "#059669" }}>+{formatCurrency(salary.bonus)}</td>
                          <td style={{ ...cell, textAlign: "right", color: "#dc2626" }}>-{formatCurrency(salary.deduction)}</td>
                          <td style={{ ...cell, textAlign: "right", fontWeight: "800", color: theme.accent.dark }}>
                            {formatCurrency(salary.finalSalary)}
                          </td>
                          <td style={{ ...cell, textAlign: "center" }}>
                            {!approvalInProgress[salary.id] && canApprove && (
                              <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  onClick={() => approveSalary(salary.id)}
                                  style={{
                                    padding: "8px 14px",
                                    backgroundColor: theme.accent.main,
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                  }}
                                >
                                  Duyệt
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowRejectReason((p) => ({
                                      ...p,
                                      [salary.id]: !p[salary.id],
                                    }))
                                  }
                                  style={{
                                    padding: "8px 14px",
                                    backgroundColor: "#fff",
                                    color: "#b91c1c",
                                    border: "1px solid #fecaca",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                  }}
                                >
                                  Từ chối
                                </button>
                              </div>
                            )}
                            {!canApprove && (
                              <span style={{ fontSize: "12px", color: theme.neutral.gray400 }}>Chỉ xem</span>
                            )}
                          </td>
                        </tr>
                        {showRejectReason[salary.id] && canApprove && (
                          <tr style={{ background: "#fffbeb" }}>
                            <td colSpan={7} style={{ padding: "16px" }}>
                              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "13px" }}>
                                Lý do từ chối (gửi kế toán để điều chỉnh / tính lại)
                              </label>
                              <textarea
                                value={rejectReasons[salary.id] || ""}
                                onChange={(e) =>
                                  setRejectReasons((p) => ({
                                    ...p,
                                    [salary.id]: e.target.value,
                                  }))
                                }
                                style={{
                                  width: "100%",
                                  maxWidth: "560px",
                                  padding: "10px",
                                  borderRadius: "8px",
                                  border: `1px solid ${theme.colors.border}`,
                                  minHeight: "72px",
                                  fontSize: "14px",
                                }}
                                placeholder="Ví dụ: Sai công chuẩn, thiếu phụ cấp…"
                              />
                              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                                <button
                                  type="button"
                                  onClick={() => rejectSalary(salary.id)}
                                  style={{
                                    padding: "8px 16px",
                                    background: "#dc2626",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontWeight: "700",
                                  }}
                                >
                                  Xác nhận từ chối
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowRejectReason((p) => ({
                                      ...p,
                                      [salary.id]: false,
                                    }))
                                  }
                                  style={{
                                    padding: "8px 16px",
                                    background: theme.neutral.gray200,
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontWeight: "600",
                                  }}
                                >
                                  Hủy
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {awaitingRecalc.length > 0 && (
            <div
              style={{
                background: theme.neutral.white,
                borderRadius: "14px",
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                border: `1px solid ${theme.colors.border}`,
              }}
            >
              <div style={{ padding: "12px 16px", background: "#fff7ed", borderBottom: "1px solid #fed7aa" }}>
                <strong style={{ color: "#9a3412" }}>Chờ tính lại lương (đã bị từ chối duyệt)</strong>
                <div style={{ fontSize: "12px", color: "#c2410c", marginTop: "4px" }}>
                  Không hiển thị trong hàng chờ duyệt. Sau khi kế toán tính lại, bản ghi quay về chờ duyệt bình thường.
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: theme.neutral.gray700 }}>
                    <tr>
                      <th style={thStyle}>Nhân viên</th>
                      <th style={thStyle}>Kỳ</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Thực lĩnh (hiện tại)</th>
                      <th style={thStyle}>Lý do từ chối</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awaitingRecalc.map((s) => (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                        <td style={cell}>
                          <strong>{s.User?.name || "—"}</strong>
                          <div style={{ fontSize: "12px", color: theme.neutral.gray500 }}>{s.User?.employeeCode}</div>
                        </td>
                        <td style={cell}>
                          {s.month}/{s.year}
                        </td>
                        <td style={{ ...cell, textAlign: "right", fontWeight: "700" }}>{formatCurrency(s.finalSalary)}</td>
                        <td style={{ ...cell, fontSize: "13px", color: theme.neutral.gray700 }}>
                          {parseRejectionReason(s.notes) || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
