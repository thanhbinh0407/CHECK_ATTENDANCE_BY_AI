import { useEffect, useState, useMemo } from "react";
import "../accountantDashboard.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function extractList(d, keys) {
  for (const k of keys) {
    if (Array.isArray(d[k])) return d[k];
  }
  return [];
}

function formatMoneyVND(amount) {
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
  } catch {
    return `${n.toLocaleString("vi-VN")} VND`;
  }
}

/** Gọi từ App kế toán — không có router; dùng callback để đổi view sidebar */
export default function AccountantDashboard({ onNavigate } = {}) {
  const [dash, setDash] = useState({
    loading: true,
    pendingSalaries: 0,
    pendingSalariesList: [],
    employees: 0,
    empActive: 0,
    pendingAdvances: 0,
    pendingAdvancesList: []
  });

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setDash((d) => ({ ...d, loading: false }));
      return;
    }

    const h = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/api/salary/pending`, { headers: h })
        .then((r) => r.json())
        .then((d) => {
          const list = extractList(d, ["salaries", "data", "pending"]);
          return { n: Array.isArray(list) ? list.length : 0, list: (list || []).slice(0, 4) };
        })
        .catch(() => ({ n: 0, list: [] })),
      fetch(`${API_BASE}/api/admin/employees`, { headers: h })
        .then((r) => r.json())
        .then((d) => {
          const list = d.employees || d.data || [];
          if (!Array.isArray(list)) return { n: 0, active: 0 };
          return {
            n: list.length,
            active: list.filter((e) => e.isActive !== false).length,
          };
        })
        .catch(() => ({ n: 0, active: 0 })),
      fetch(`${API_BASE}/api/salary-advances?status=pending`, { headers: h })
        .then((r) => r.json())
        .then((d) => {
          const list = extractList(d, ["advances", "salaryAdvances", "data"]);
          return { n: Array.isArray(list) ? list.length : 0, list: (list || []).slice(0, 4) };
        })
        .catch(() => ({ n: 0, list: [] })),
    ]).then(([pendingSalaries, emp, pendingAdvances]) => {
      setDash({
        loading: false,
        pendingSalaries: pendingSalaries?.n || 0,
        pendingSalariesList: pendingSalaries?.list || [],
        employees: typeof emp === "object" ? emp.n : 0,
        empActive: typeof emp === "object" ? emp.active : 0,
        pendingAdvances: pendingAdvances?.n || 0,
        pendingAdvancesList: pendingAdvances?.list || [],
      });
    });
  }, []);

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    []
  );

  const go = (id) => {
    if (typeof onNavigate === "function") onNavigate(id);
  };

  if (dash.loading) {
    return (
      <div className="acc-dash">
        <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>Đang tải tổng quan…</div>
      </div>
    );
  }

  return (
    <div className="acc-dash">
      <div className="acc-dash-hero">
        <div className="acc-dash-hero-inner">
          <h1>Bảng điều khiển Kế toán</h1>
          <p>
            Tập trung vào payroll, tạm ứng và hồ sơ phục vụ lương — số liệu dưới đây cập nhật theo quyền API của tài khoản của bạn.
          </p>
          <div className="acc-dash-pills">
            <span className="acc-dash-pill">{today}</span>
            <span className="acc-dash-pill">{dash.employees} hồ sơ nhân viên (hệ thống)</span>
            <span className="acc-dash-pill">{dash.pendingSalaries + dash.pendingAdvances} hạng mục chờ xử lý</span>
          </div>
        </div>
      </div>

      <div className="acc-dash-kpis">
        <div className="acc-dash-kpi acc-dash-kpi--accent">
          <span className="acc-dash-kpi-deco" aria-hidden>📋</span>
          <div className="lbl">Bảng lương chờ</div>
          <div className="val">{dash.pendingSalaries}</div>
          <div className="hint">Duyệt / xử lý tại mục Duyệt payroll</div>
        </div>
        <div className="acc-dash-kpi">
          <span className="acc-dash-kpi-deco" aria-hidden>💵</span>
          <div className="lbl">Tạm ứng chờ</div>
          <div className="val">{dash.pendingAdvances}</div>
          <div className="hint">Theo dõi tại Approve Records (nếu có quyền)</div>
        </div>
        <div className="acc-dash-kpi">
          <span className="acc-dash-kpi-deco" aria-hidden>👥</span>
          <div className="lbl">Nhân viên</div>
          <div className="val">{dash.employees}</div>
          <div className="hint">Đang làm: {dash.empActive}</div>
        </div>
        <div className="acc-dash-kpi">
          <span className="acc-dash-kpi-deco" aria-hidden>✨</span>
          <div className="lbl">Tỷ lệ hoạt động</div>
          <div className="val">
            {dash.employees ? Math.round((dash.empActive / dash.employees) * 100) : 0}%
          </div>
          <div className="hint">Ước tính trên danh sách admin</div>
        </div>
      </div>

      <div className="acc-dash-split">
        <div className="acc-dash-card">
          <h3>Luồng việc gợi ý</h3>
          <p>
            Ưu tiên xử lý <strong>bảng lương chờ duyệt</strong>, sau đó đối soát <strong>tạm ứng</strong> và tra cứu{" "}
            <strong>chi tiết nhân viên</strong> khi cần kiểm tra phụ cấp, BHXH hoặc tài khoản ngân hàng.
          </p>
        </div>
        <div className="acc-dash-card">
          <h3>Tuân thủ &amp; báo cáo</h3>
          <p>
            Hoàn tất kỳ lương rồi xuất / kiểm tra <strong>D02-LT</strong> và biểu mẫu <strong>TK1-TS</strong> từ menu bên trái để đồng bộ với BHXH.
          </p>
        </div>
      </div>

      <div className="acc-dash-card" style={{ marginTop: 16 }}>
        <h3>Hàng đợi chờ xử lý</h3>
        <p style={{ marginTop: 6, color: "#64748b" }}>
          Danh sách rút gọn theo quyền API của tài khoản bạn (tự động cập nhật khi mở dashboard).
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
          <div style={{ border: "1px solid rgba(148,163,184,0.35)", borderRadius: 14, padding: 14, background: "#fff" }}>
            <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Bảng lương chờ duyệt</div>
            {dash.pendingSalariesList.length === 0 ? (
              <div style={{ color: "#94a3b8", fontStyle: "italic" }}>Không có dữ liệu</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {dash.pendingSalariesList.map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.User?.name || s.User?.employeeCode || "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {s.month}/{s.year} • {s.status}
                      </div>
                    </div>
                    <div style={{ fontWeight: 900, color: "#0ea5e9" }}>{formatMoneyVND(s.finalSalary)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ border: "1px solid rgba(148,163,184,0.35)", borderRadius: 14, padding: 14, background: "#fff" }}>
            <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Tạm ứng chờ</div>
            {dash.pendingAdvancesList.length === 0 ? (
              <div style={{ color: "#94a3b8", fontStyle: "italic" }}>Không có dữ liệu</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {dash.pendingAdvancesList.map((a) => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.User?.name || a.userId || "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {a.month}/{a.year} • {a.approvalStatus || "pending"}
                      </div>
                    </div>
                    <div style={{ fontWeight: 900, color: "#22c55e" }}>{formatMoneyVND(a.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="acc-dash-card">
        <h3>Đi tới nhanh</h3>
        <div className="acc-dash-links" style={{ marginTop: 14 }}>
          <button type="button" className="acc-dash-link" onClick={() => go("salary-calculation")}>
            <span>💰</span>
            <span>Salary calculation</span>
          </button>
          <button type="button" className="acc-dash-link" onClick={() => go("salary-management")}>
            <span>📊</span>
            <span>Quản lý lương</span>
          </button>
          <button type="button" className="acc-dash-link" onClick={() => go("salary-approval")}>
            <span>✅</span>
            <span>Duyệt payroll</span>
          </button>
          <button type="button" className="acc-dash-link" onClick={() => go("employee-details")}>
            <span>👤</span>
            <span>Chi tiết nhân viên</span>
          </button>
          <button type="button" className="acc-dash-link" onClick={() => go("d02-lt-report")}>
            <span>📄</span>
            <span>Báo cáo D02-LT</span>
          </button>
          <button type="button" className="acc-dash-link" onClick={() => go("tk1-ts-form")}>
            <span>🏥</span>
            <span>Mẫu TK1-TS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
