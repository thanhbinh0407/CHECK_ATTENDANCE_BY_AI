import { useEffect, useState, useMemo } from "react";
import "../employeeDashboard.css";

export default function EmployeeDashboard({ userId, userName, onNavigate }) {
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const now = new Date();
  const [dash, setDash] = useState({
    loading: true,
    pendingLeave: 0,
    pendingLeaveList: [],
    pendingOt: 0,
    pendingOtList: [],
    pendingTrip: 0,
    pendingTripList: [],
    pendingAdvance: 0,
    pendingAdvanceList: [],
    attendanceLogsThisMonth: 0,
    recentLeaves: [],
  });

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token || !userId) {
      setDash((d) => ({ ...d, loading: false }));
      return;
    }

    const h = { Authorization: `Bearer ${token}` };
    const m = now.getMonth() + 1;
    const y = now.getFullYear();

    const filterMine = (list) => {
      if (!Array.isArray(list)) return [];
      return list.filter((x) => Number(x.userId) === Number(userId));
    };

    Promise.all([
      fetch(`${apiBase}/api/leave/requests`, { headers: h })
        .then((r) => r.json())
        .then((d) => {
          const rows = d.leaveRequests || d.data || [];
          const mine = filterMine(rows);
          return {
            pending: mine.filter((x) => x.status === "pending").length,
            recent: mine.filter((x) => x.status === "pending").slice(0, 4),
          };
        })
        .catch(() => ({ pending: 0, recent: [] })),
      fetch(`${apiBase}/api/overtime-requests`, { headers: h })
        .then((r) => r.json())
        .then((d) => {
          const rows = d.overtimeRequests || d.data || [];
          const mine = filterMine(rows).filter((x) => x.approvalStatus === "pending");
          return { pending: mine.length, recent: mine.slice(0, 3) };
        })
        .catch(() => ({ pending: 0, recent: [] })),
      fetch(`${apiBase}/api/business-trip-requests`, { headers: h })
        .then((r) => r.json())
        .then((d) => {
          const rows = d.businessTripRequests || d.data || [];
          const mine = filterMine(rows).filter((x) => x.approvalStatus === "pending");
          return { pending: mine.length, recent: mine.slice(0, 3) };
        })
        .catch(() => ({ pending: 0, recent: [] })),
      fetch(`${apiBase}/api/salary-advances`, { headers: h })
        .then((r) => r.json())
        .then((d) => {
          const rows = d.salaryAdvances || d.data || [];
          const mine = filterMine(rows).filter((x) => x.approvalStatus === "pending");
          return { pending: mine.length, recent: mine.slice(0, 3) };
        })
        .catch(() => ({ pending: 0, recent: [] })),
      fetch(`${apiBase}/api/employee/attendance?month=${m}&year=${y}`, { headers: h })
        .then((r) => r.json())
        .then((d) => (Array.isArray(d.logs) ? d.logs.length : 0))
        .catch(() => 0),
    ]).then(([leaveBlock, pot, ptrip, padv, logCount]) => {
      setDash({
        loading: false,
        pendingLeave: leaveBlock.pending,
        pendingLeaveList: leaveBlock.recent || [],
        pendingOt: pot?.pending || 0,
        pendingOtList: pot?.recent || [],
        pendingTrip: ptrip?.pending || 0,
        pendingTripList: ptrip?.recent || [],
        pendingAdvance: padv?.pending || 0,
        pendingAdvanceList: padv?.recent || [],
        attendanceLogsThisMonth: logCount,
        recentLeaves: leaveBlock.recent || [],
      });
    });
  }, [userId]);

  const totalPending = dash.pendingLeave + dash.pendingOt + dash.pendingTrip + dash.pendingAdvance;

  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const go = (tab) => {
    if (typeof onNavigate === "function") onNavigate(tab);
  };

  if (dash.loading) {
    return (
      <div className="emp-dash">
        <div style={{ padding: 40, textAlign: "center", color: "#718096" }}>Loading overview…</div>
      </div>
    );
  }

  return (
    <div className="emp-dash">
      <div className="emp-dash-hero">
        <div className="emp-dash-hero-inner">
          <h2>
            {greeting}
            {userName ? `, ${userName}` : ""}
          </h2>
          <p>
            This is your personal dashboard: pending requests, monthly attendance activity, and recent leave requests.
          </p>
          <div className="emp-dash-pills">
            <span className="emp-dash-pill">Month {now.getMonth() + 1}/{now.getFullYear()}</span>
            <span className="emp-dash-pill">{totalPending} requests pending approval</span>
            <span className="emp-dash-pill">{dash.attendanceLogsThisMonth} attendance logs this month</span>
          </div>
        </div>
      </div>

      <div className="emp-dash-kpis">
        <div className="emp-dash-kpi">
          <span className="emp-dash-kpi-deco" aria-hidden>🏖️</span>
          <div className="lbl">Pending leave</div>
          <div className="val">{dash.pendingLeave}</div>
          <div className="hint">Track in Leave Request</div>
        </div>
        <div className="emp-dash-kpi">
          <span className="emp-dash-kpi-deco" aria-hidden>⏱️</span>
          <div className="lbl">Pending overtime</div>
          <div className="val">{dash.pendingOt}</div>
          <div className="hint">Awaiting manager approval</div>
        </div>
        <div className="emp-dash-kpi">
          <span className="emp-dash-kpi-deco" aria-hidden>✈️</span>
          <div className="lbl">Pending business trips</div>
          <div className="val">{dash.pendingTrip}</div>
          <div className="hint">Schedule &amp; expenses</div>
        </div>
        <div className="emp-dash-kpi">
          <span className="emp-dash-kpi-deco" aria-hidden>💵</span>
          <div className="lbl">Pending advances</div>
          <div className="val">{dash.pendingAdvance}</div>
          <div className="hint">Salary advances</div>
        </div>
      </div>

      <div className="emp-dash-split">
        <div className="emp-dash-panel">
          <h3>Recent pending leave requests</h3>
          {dash.pendingLeaveList.length === 0 ? (
            <p style={{ color: "#a0aec0", fontSize: 14 }}>No pending leave requests.</p>
          ) : (
            dash.pendingLeaveList.map((lv) => (
              <div key={lv.id} className="emp-dash-row">
                <div>
                  <strong>{lv.type || "Leave"}</strong>
                  <div style={{ fontSize: 12, color: "#a0aec0" }}>
                    {lv.startDate} → {lv.endDate}
                  </div>
                </div>
                <span>{lv.status}</span>
              </div>
            ))
          )}
        </div>
        <div className="emp-dash-panel">
          <h3>Current month attendance</h3>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "#718096", lineHeight: 1.5 }}>
            The system recorded <strong>{dash.attendanceLogsThisMonth}</strong> logs this month (via employee/attendance API).
            View daily details in the Attendance section.
          </p>
          <button type="button" className="emp-dash-act" style={{ width: "100%" }} onClick={() => go("attendance")}>
            Open attendance history →
          </button>
        </div>
      </div>

      <div className="emp-dash-panel">
        <h3>Your other pending requests</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
          <div style={{ border: "1px solid rgba(148,163,184,0.35)", borderRadius: 14, padding: 12, background: "#fff" }}>
            <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Overtime</div>
            {dash.pendingOtList.length === 0 ? (
              <div style={{ color: "#a0aec0", fontSize: 13 }}>Empty</div>
            ) : (
              dash.pendingOtList.map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{r.date}</div>
                    <div style={{ fontSize: 12, color: "#a0aec0" }}>{r.startTime} → {r.endTime}</div>
                  </div>
                  <span style={{ fontWeight: 900 }}>{r.approvalStatus}</span>
                </div>
              ))
            )}
          </div>

          <div style={{ border: "1px solid rgba(148,163,184,0.35)", borderRadius: 14, padding: 12, background: "#fff" }}>
            <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Business trips / Advances</div>
            {dash.pendingTripList.length === 0 && dash.pendingAdvanceList.length === 0 ? (
              <div style={{ color: "#a0aec0", fontSize: 13 }}>Empty</div>
            ) : (
              <>
                {dash.pendingTripList.map((r) => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>Trip: {r.destination || r.location || "—"}</div>
                      <div style={{ fontSize: 12, color: "#a0aec0" }}>{r.date || r.startDate || "—"}</div>
                    </div>
                    <span style={{ fontWeight: 900 }}>{r.approvalStatus}</span>
                  </div>
                ))}
                {dash.pendingAdvanceList.map((a) => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>Advance: {a.month}/{a.year}</div>
                      <div style={{ fontSize: 12, color: "#a0aec0" }}>{Number(a.amount || 0).toLocaleString("en-US")} VND</div>
                    </div>
                    <span style={{ fontWeight: 900 }}>{a.approvalStatus}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="emp-dash-panel">
        <h3>Shortcuts</h3>
        <div className="emp-dash-actions" style={{ marginTop: 12 }}>
          <button type="button" className="emp-dash-act" onClick={() => go("leave")}>
            Leave requests
          </button>
          <button type="button" className="emp-dash-act" onClick={() => go("overtime")}>
            Overtime request
          </button>
          <button type="button" className="emp-dash-act" onClick={() => go("salary")}>
            Salary &amp; payslip
          </button>
          <button type="button" className="emp-dash-act" onClick={() => go("account")}>
            Account &amp; password
          </button>
        </div>
      </div>
    </div>
  );
}
