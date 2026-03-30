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
    if (h < 12) return "Chào buổi sáng";
    if (h < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  }, []);

  const go = (tab) => {
    if (typeof onNavigate === "function") onNavigate(tab);
  };

  if (dash.loading) {
    return (
      <div className="emp-dash">
        <div style={{ padding: 40, textAlign: "center", color: "#718096" }}>Đang tải tổng quan…</div>
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
            Đây là trang chủ cá nhân: đơn chờ duyệt, hoạt động chấm công trong tháng và đơn nghỉ gần đây — chọn thẻ hoặc menu phía trên để thao tác.
          </p>
          <div className="emp-dash-pills">
            <span className="emp-dash-pill">Tháng {now.getMonth() + 1}/{now.getFullYear()}</span>
            <span className="emp-dash-pill">{totalPending} đơn đang chờ phê duyệt</span>
            <span className="emp-dash-pill">{dash.attendanceLogsThisMonth} bản ghi chấm công (tháng này)</span>
          </div>
        </div>
      </div>

      <div className="emp-dash-kpis">
        <div className="emp-dash-kpi">
          <span className="emp-dash-kpi-deco" aria-hidden>🏖️</span>
          <div className="lbl">Nghỉ phép chờ</div>
          <div className="val">{dash.pendingLeave}</div>
          <div className="hint">Theo dõi tại Leave Request</div>
        </div>
        <div className="emp-dash-kpi">
          <span className="emp-dash-kpi-deco" aria-hidden>⏱️</span>
          <div className="lbl">Tăng ca chờ</div>
          <div className="val">{dash.pendingOt}</div>
          <div className="hint">Duyệt bởi quản lý</div>
        </div>
        <div className="emp-dash-kpi">
          <span className="emp-dash-kpi-deco" aria-hidden>✈️</span>
          <div className="lbl">Công tác chờ</div>
          <div className="val">{dash.pendingTrip}</div>
          <div className="hint">Lịch &amp; chi phí</div>
        </div>
        <div className="emp-dash-kpi">
          <span className="emp-dash-kpi-deco" aria-hidden>💵</span>
          <div className="lbl">Tạm ứng chờ</div>
          <div className="val">{dash.pendingAdvance}</div>
          <div className="hint">Ứng lương</div>
        </div>
      </div>

      <div className="emp-dash-split">
        <div className="emp-dash-panel">
          <h3>Đơn nghỉ phép chờ duyệt (gần đây)</h3>
          {dash.pendingLeaveList.length === 0 ? (
            <p style={{ color: "#a0aec0", fontSize: 14 }}>Chưa có đơn nghỉ chờ duyệt.</p>
          ) : (
            dash.pendingLeaveList.map((lv) => (
              <div key={lv.id} className="emp-dash-row">
                <div>
                  <strong>{lv.type || "Nghỉ"}</strong>
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
          <h3>Chấm công tháng hiện tại</h3>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "#718096", lineHeight: 1.5 }}>
            Hệ thống ghi nhận <strong>{dash.attendanceLogsThisMonth}</strong> bản ghi log trong tháng (theo API employee/attendance).
            Xem chi tiết từng ngày tại mục Attendance.
          </p>
          <button type="button" className="emp-dash-act" style={{ width: "100%" }} onClick={() => go("attendance")}>
            Mở lịch sử chấm công →
          </button>
        </div>
      </div>

      <div className="emp-dash-panel">
        <h3>Đơn chờ khác của bạn</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
          <div style={{ border: "1px solid rgba(148,163,184,0.35)", borderRadius: 14, padding: 12, background: "#fff" }}>
            <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Tăng ca</div>
            {dash.pendingOtList.length === 0 ? (
              <div style={{ color: "#a0aec0", fontSize: 13 }}>Trống</div>
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
            <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Công tác / Ứng lương</div>
            {dash.pendingTripList.length === 0 && dash.pendingAdvanceList.length === 0 ? (
              <div style={{ color: "#a0aec0", fontSize: 13 }}>Trống</div>
            ) : (
              <>
                {dash.pendingTripList.map((r) => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>CT: {r.destination || r.location || "—"}</div>
                      <div style={{ fontSize: 12, color: "#a0aec0" }}>{r.date || r.startDate || "—"}</div>
                    </div>
                    <span style={{ fontWeight: 900 }}>{r.approvalStatus}</span>
                  </div>
                ))}
                {dash.pendingAdvanceList.map((a) => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>Ứng: {a.month}/{a.year}</div>
                      <div style={{ fontSize: 12, color: "#a0aec0" }}>{Number(a.amount || 0).toLocaleString("vi-VN")} VND</div>
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
        <h3>Lối tắt</h3>
        <div className="emp-dash-actions" style={{ marginTop: 12 }}>
          <button type="button" className="emp-dash-act" onClick={() => go("leave")}>
            Đơn nghỉ phép
          </button>
          <button type="button" className="emp-dash-act" onClick={() => go("overtime")}>
            Đăng ký tăng ca
          </button>
          <button type="button" className="emp-dash-act" onClick={() => go("salary")}>
            Lương &amp; payslip
          </button>
          <button type="button" className="emp-dash-act" onClick={() => go("account")}>
            Tài khoản &amp; mật khẩu
          </button>
        </div>
      </div>
    </div>
  );
}
