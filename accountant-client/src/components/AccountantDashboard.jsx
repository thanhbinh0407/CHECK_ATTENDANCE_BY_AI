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
      new Intl.DateTimeFormat("en-US", {
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
        <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>Loading overview…</div>
      </div>
    );
  }

  return (
    <div className="acc-dash">
      <div className="acc-dash-hero">
        <div className="acc-dash-hero-inner">
          <h1>Accountant overview</h1>
          <p>
            Focus on payroll, salary advances, and employee records — figures below reflect your account&apos;s API permissions.
          </p>
          <div className="acc-dash-pills">
            <span className="acc-dash-pill">{today}</span>
            <span className="acc-dash-pill">{dash.employees} employee records (system)</span>
            <span className="acc-dash-pill">{dash.pendingSalaries + dash.pendingAdvances} items pending action</span>
          </div>
        </div>
      </div>

      <div className="acc-dash-kpis">
        <div className="acc-dash-kpi acc-dash-kpi--accent">
          <span className="acc-dash-kpi-deco" aria-hidden>📋</span>
          <div className="lbl">Payroll pending</div>
          <div className="val">{dash.pendingSalaries}</div>
          <div className="hint">Approve or process under Payroll approval</div>
        </div>
        <div className="acc-dash-kpi">
          <span className="acc-dash-kpi-deco" aria-hidden>💵</span>
          <div className="lbl">Advances pending</div>
          <div className="val">{dash.pendingAdvances}</div>
          <div className="hint">Track under Approve Records (if permitted)</div>
        </div>
        <div className="acc-dash-kpi">
          <span className="acc-dash-kpi-deco" aria-hidden>👥</span>
          <div className="lbl">Employees</div>
          <div className="val">{dash.employees}</div>
          <div className="hint">Active: {dash.empActive}</div>
        </div>
        <div className="acc-dash-kpi">
          <span className="acc-dash-kpi-deco" aria-hidden>✨</span>
          <div className="lbl">Active rate</div>
          <div className="val">
            {dash.employees ? Math.round((dash.empActive / dash.employees) * 100) : 0}%
          </div>
          <div className="hint">Based on admin employee list</div>
        </div>
      </div>

      <div className="acc-dash-split">
        <div className="acc-dash-card">
          <h3>Suggested workflow</h3>
          <p>
            Prioritize <strong>payroll pending approval</strong>, then reconcile <strong>advances</strong> and open{" "}
            <strong>employee details</strong> when you need to verify allowances, social insurance, or bank details.
          </p>
        </div>
        <div className="acc-dash-card">
          <h3>Compliance &amp; reports</h3>
          <p>
            After closing payroll, export or review <strong>D02-LT</strong> and <strong>TK1-TS</strong> from the left menu to align with social insurance filings.
          </p>
        </div>
      </div>

      <div className="acc-dash-card" style={{ marginTop: 16 }}>
        <h3>Queues</h3>
        <p style={{ marginTop: 6, color: "#64748b" }}>
          Short lists based on your API permissions (refreshed when you open the overview).
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
          <div style={{ border: "1px solid rgba(148,163,184,0.35)", borderRadius: 14, padding: 14, background: "#fff" }}>
            <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Payroll pending approval</div>
            {dash.pendingSalariesList.length === 0 ? (
              <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No data</div>
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
            <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Advances pending</div>
            {dash.pendingAdvancesList.length === 0 ? (
              <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No data</div>
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
        <h3>Quick links</h3>
        <div className="acc-dash-links" style={{ marginTop: 14 }}>
          <button type="button" className="acc-dash-link" onClick={() => go("salary-calculation")}>
            <span>💰</span>
            <span>Salary calculation</span>
          </button>
          <button type="button" className="acc-dash-link" onClick={() => go("salary-management")}>
            <span>📊</span>
            <span>Salary management</span>
          </button>
          <button type="button" className="acc-dash-link" onClick={() => go("salary-approval")}>
            <span>✅</span>
            <span>Payroll approval</span>
          </button>
          <button type="button" className="acc-dash-link" onClick={() => go("employee-details")}>
            <span>👤</span>
            <span>Employee details</span>
          </button>
          <button type="button" className="acc-dash-link" onClick={() => go("d02-lt-report")}>
            <span>📄</span>
            <span>D02-LT report</span>
          </button>
          <button type="button" className="acc-dash-link" onClick={() => go("tk1-ts-form")}>
            <span>🏥</span>
            <span>TK1-TS form</span>
          </button>
        </div>
      </div>
    </div>
  );
}
