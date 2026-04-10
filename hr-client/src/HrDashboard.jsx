import { useEffect, useState, useMemo } from 'react';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

function extractList(data, keys) {
  for (const k of keys) {
    if (Array.isArray(data[k])) return data[k];
  }
  return [];
}

export default function HrDashboard({ token, onNavigate }) {
  const [dash, setDash] = useState({
    loading: true,
    empTotal: 0,
    empActive: 0,
    departments: 0,
    jobTitles: 0,
    pendingLeave: 0,
    pendingLeaveList: [],
    pendingOt: 0,
    pendingOtList: [],
    pendingTrip: 0,
    pendingTripList: [],
    pendingAdvance: 0,
    pendingAdvanceList: [],
    recentLogs: [],
  });

  useEffect(() => {
    let cancelled = false;
    const h = authHeaders(token);

    const run = async () => {
      try {
        const [
          empRes,
          deptRes,
          jtRes,
          leaveRes,
          otRes,
          tripRes,
          advRes,
          logRes,
        ] = await Promise.all([
          fetch(`${API}/admin/employees`, { headers: h }),
          fetch(`${API}/departments`, { headers: h }),
          fetch(`${API}/job-titles`, { headers: h }),
          fetch(`${API}/leave/requests?status=pending`, { headers: h }),
          fetch(`${API}/overtime-requests?status=pending`, { headers: h }),
          fetch(`${API}/business-trip-requests?status=pending`, { headers: h }),
          fetch(`${API}/salary-advances?status=pending`, { headers: h }),
          fetch(`${API}/admin/logs`, { headers: h }).catch(() => null),
        ]);

        const empData = empRes.ok ? await empRes.json() : {};
        const list = empData.employees || empData.data || [];
        const empTotal = Array.isArray(list) ? list.length : 0;
        const empActive = Array.isArray(list) ? list.filter((e) => e.isActive !== false).length : 0;

        const deptData = deptRes.ok ? await deptRes.json() : {};
        const departments = (deptData.departments || deptData.data || []).length;

        const jtData = jtRes.ok ? await jtRes.json() : {};
        const jobTitles = (jtData.jobTitles || jtData.data || []).length;

        const leaveData = leaveRes.ok ? await leaveRes.json() : {};
        const leaveList = extractList(leaveData, ['leaveRequests', 'data']);
        const pendingLeave = Array.isArray(leaveList) ? leaveList.length : 0;

        const otData = otRes.ok ? await otRes.json() : {};
        const otList = extractList(otData, ['requests', 'overtimeRequests', 'data']);
        const pendingOt = Array.isArray(otList) ? otList.length : 0;

        const tripData = tripRes.ok ? await tripRes.json() : {};
        const tripList = extractList(tripData, ['requests', 'businessTripRequests', 'data']);
        const pendingTrip = Array.isArray(tripList) ? tripList.length : 0;

        const advData = advRes.ok ? await advRes.json() : {};
        const advList = extractList(advData, ['advances', 'salaryAdvances', 'data']);
        const pendingAdvance = Array.isArray(advList) ? advList.length : 0;

        let recentLogs = [];
        if (logRes && logRes.ok) {
          const logJson = await logRes.json();
          recentLogs = (logJson.logs || []).slice(0, 8);
        }

        if (!cancelled) {
          setDash({
            loading: false,
            empTotal,
            empActive,
            departments,
            jobTitles,
            pendingLeave,
            pendingLeaveList: (leaveList || []).slice(0, 4),
            pendingOt,
            pendingOtList: (otList || []).slice(0, 4),
            pendingTrip,
            pendingTripList: (tripList || []).slice(0, 4),
            pendingAdvance,
            pendingAdvanceList: (advList || []).slice(0, 4),
            recentLogs,
          });
        }
      } catch {
        if (!cancelled) setDash((d) => ({ ...d, loading: false }));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const go = (tab) => {
    if (typeof onNavigate === 'function') onNavigate(tab);
  };

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date()),
    []
  );

  const totalPending = dash.pendingLeave + dash.pendingOt + dash.pendingTrip + dash.pendingAdvance;

  if (dash.loading) {
    return (
      <div className="hr-dash-root">
        <div className="loading">Loading overview…</div>
      </div>
    );
  }

  return (
    <div className="hr-dash-root">
      <div className="hr-dash-hero-v2">
        <div className="hr-dash-hero-v2-inner">
          <h1>HR Hub</h1>
          <p>
            Monitor workforce size, pending requests, and recent attendance activity from one place.
          </p>
          <div className="hr-dash-hero-meta">
            <span className="hr-dash-pill">{today}</span>
            <span className="hr-dash-pill">{dash.empActive} active employees</span>
            <span className="hr-dash-pill">{totalPending} pending requests (system-wide)</span>
          </div>
        </div>
      </div>

      <div className="hr-kpi-row hr-kpi-row--4">
        <div className="hr-kpi-card">
          <span className="hr-kpi-deco" aria-hidden>👥</span>
          <div className="hr-kpi-label">Employees</div>
          <div className="hr-kpi-value">{dash.empTotal}</div>
          <div className="hr-kpi-hint">Active: {dash.empActive}</div>
        </div>
        <div className="hr-kpi-card">
          <span className="hr-kpi-deco" aria-hidden>🏢</span>
          <div className="hr-kpi-label">Departments</div>
          <div className="hr-kpi-value">{dash.departments}</div>
          <div className="hr-kpi-hint">Job titles: {dash.jobTitles}</div>
        </div>
        <button
          type="button"
          className="hr-kpi-card"
          onClick={() => go('leave')}
          style={{ cursor: 'pointer', textAlign: 'left', border: '1px solid rgba(148, 163, 184, 0.35)', font: 'inherit' }}
        >
          <span className="hr-kpi-deco" aria-hidden>✅</span>
          <div className="hr-kpi-label">Pending leave</div>
          <div className="hr-kpi-value hr-kpi-value--accent">{dash.pendingLeave}</div>
          <div className="hr-kpi-hint">Open leave approvals →</div>
        </button>
        <div className="hr-kpi-card">
          <span className="hr-kpi-deco" aria-hidden>📬</span>
          <div className="hr-kpi-label">Other pending</div>
          <div className="hr-kpi-value" style={{ fontSize: '1.35rem' }}>
            OT {dash.pendingOt} · CT {dash.pendingTrip} · Ứng {dash.pendingAdvance}
          </div>
          <div className="hr-kpi-hint">Overtime · Business trip · Advance</div>
        </div>
      </div>

      <div className="hr-dash-split">
        <div className="hr-dash-panel">
          <h3>Recent attendance activity</h3>
          {dash.recentLogs.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 14 }}>No attendance log data available.</p>
          ) : (
            dash.recentLogs.map((log) => (
              <div key={log.id} className="hr-dash-log-row">
                <div>
                  <strong>{log.User?.name || '—'}</strong>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{log.User?.employeeCode || log.userId}</div>
                </div>
                <span>{log.timestamp ? new Date(log.timestamp).toLocaleString('en-US') : '—'}</span>
              </div>
            ))
          )}
        </div>
        <div className="hr-dash-panel">
          <h3>Quick summary</h3>
          <div className="hr-mini-kpis">
            <div className="hr-mini-kpi">
              <div className="lbl">Active rate</div>
              <div className="val">
                {dash.empTotal ? Math.round((dash.empActive / dash.empTotal) * 100) : 0}%
              </div>
            </div>
            <div className="hr-mini-kpi">
              <div className="lbl">Job titles</div>
              <div className="val">{dash.jobTitles}</div>
            </div>
            <div className="hr-mini-kpi">
              <div className="lbl">Total pending</div>
              <div className="val">{totalPending}</div>
            </div>
            <div className="hr-mini-kpi">
              <div className="lbl">Departments</div>
              <div className="val">{dash.departments}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="card-title" style={{ marginBottom: 12 }}>Latest pending requests</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
          <div className="hr-dash-mini" style={{ padding: 14, borderRadius: 14, background: "#fff", border: "1px solid rgba(148,163,184,0.35)" }}>
            <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Leave</div>
            {dash.pendingLeaveList.length === 0 ? <div style={{ color: "#94a3b8", fontStyle: "italic" }}>Empty</div> : dash.pendingLeaveList.map((l) => (
              <div key={l.id} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700 }}>{l.User?.name || l.userId || "—"}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{l.startDate} → {l.endDate}</div>
              </div>
            ))}
          </div>

          <div className="hr-dash-mini" style={{ padding: 14, borderRadius: 14, background: "#fff", border: "1px solid rgba(148,163,184,0.35)" }}>
            <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Overtime</div>
            {dash.pendingOtList.length === 0 ? <div style={{ color: "#94a3b8", fontStyle: "italic" }}>Empty</div> : dash.pendingOtList.map((r) => (
              <div key={r.id} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700 }}>{r.User?.name || r.userId || "—"}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{r.date} • {r.totalHours || 0}h</div>
              </div>
            ))}
          </div>

          <div className="hr-dash-mini" style={{ padding: 14, borderRadius: 14, background: "#fff", border: "1px solid rgba(148,163,184,0.35)" }}>
            <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Business trip</div>
            {dash.pendingTripList.length === 0 ? <div style={{ color: "#94a3b8", fontStyle: "italic" }}>Empty</div> : dash.pendingTripList.map((r) => (
              <div key={r.id} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700 }}>{r.User?.name || r.userId || "—"}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{r.destination || r.location || "—"}</div>
              </div>
            ))}
          </div>

          <div className="hr-dash-mini" style={{ padding: 14, borderRadius: 14, background: "#fff", border: "1px solid rgba(148,163,184,0.35)" }}>
            <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Advance</div>
            {dash.pendingAdvanceList.length === 0 ? <div style={{ color: "#94a3b8", fontStyle: "italic" }}>Empty</div> : dash.pendingAdvanceList.map((a) => (
              <div key={a.id} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700 }}>{a.User?.name || a.userId || "—"}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{a.month}/{a.year} • {Number(a.amount || 0).toLocaleString("en-US")} VND</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 0 }}>
        <p className="card-title" style={{ marginBottom: 12 }}>Quick access</p>
        <div className="hr-bento-actions">
          {[
            ['employees', '👥', 'Employee management'],
            ['departments', '🏢', 'Departments'],
            ['job-titles', '📋', 'Job titles'],
            ['attendance', '📅', 'Attendance'],
            ['leave', '🏖️', 'Leave approvals'],
            ['analytics', '📉', 'Analytics'],
            ['reports', '📑', 'HR reports'],
          ].map(([tab, icon, label]) => (
            <button
              key={tab}
              type="button"
              className="hr-action-tile"
              style={{ border: 'none', cursor: 'pointer', font: 'inherit', width: '100%' }}
              onClick={() => go(tab)}
            >
              <span className="hr-action-ico">{icon}</span>
              <span>{label}</span>
              <span className="hr-action-arrow">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
