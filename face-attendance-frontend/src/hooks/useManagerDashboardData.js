import { useEffect, useMemo, useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function authHeaders() {
  const token = localStorage.getItem("authToken");
  return { Authorization: `Bearer ${token}` };
}

function currency(v) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "VND" }).format(Number(v || 0));
}

function extractList(data, keys) {
  for (const k of keys) {
    const v = data[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

function formatDuration(ms) {
  const safeMs = Math.max(0, Number(ms) || 0);
  const totalMinutes = Math.floor(safeMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function useManagerDashboardData() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [recentChanges, setRecentChanges] = useState([]);
  const [pending, setPending] = useState({
    leave: 0,
    overtime: 0,
    trip: 0,
    advance: 0,
  });
  const [workDurations, setWorkDurations] = useState([]);
  const [workSummary, setWorkSummary] = useState({ active: 0, finished: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [empRes, deptRes, jtRes, auditRes, leaveRes, otRes, tripRes, advRes, attendanceRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/employees`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/departments`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/job-titles`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/admin/audits/role-changes?page=1&pageSize=15`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/leave/requests?status=pending`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/overtime-requests?status=pending`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/business-trip-requests?status=pending`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/salary-advances?status=pending`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/attendance/today`, { headers: authHeaders() }).catch(() => null),
      ]);

      const empData = await empRes.json();
      const deptData = await deptRes.json();
      const jtData = await jtRes.json();
      const list = empData.employees || empData.data || [];
      setEmployees(list);
      setDepartments(deptData.departments || deptData.data || []);
      setJobTitles(jtData.jobTitles || jtData.data || []);

      let attendanceJson = {};
      if (attendanceRes && attendanceRes.ok) {
        attendanceJson = await attendanceRes.json();
      }
      const todayLogs = attendanceJson.logs || attendanceJson.data || [];

      const userNameMap = new Map();
      list.forEach((u) => {
        userNameMap.set(String(u.id), u.name || u.employeeCode || `#${u.id}`);
      });

      const byUser = new Map();
      todayLogs.forEach((log) => {
        if (!log?.userId) return;
        const uid = String(log.userId);
        const ts = new Date(log.timestamp);
        if (!byUser.has(uid)) {
          byUser.set(uid, {
            userId: log.userId,
            name: userNameMap.get(uid) || log.detectedName || `Employee #${log.userId}`,
            firstIn: null,
            lastOut: null,
            lastType: null,
            lastAt: null,
          });
        }
        const row = byUser.get(uid);
        if (log.type === "IN" && (!row.firstIn || ts < row.firstIn)) {
          row.firstIn = ts;
        }
        if (log.type === "OUT" && (!row.lastOut || ts > row.lastOut)) {
          row.lastOut = ts;
        }
        if (!row.lastAt || ts > row.lastAt) {
          row.lastAt = ts;
          row.lastType = log.type;
        }
      });

      const now = Date.now();
      const workRows = Array.from(byUser.values())
        .filter((u) => !!u.firstIn)
        .map((u) => {
          const endTime = u.lastType === "IN" ? now : u.lastOut ? u.lastOut.getTime() : now;
          const durationMs = Math.max(0, endTime - u.firstIn.getTime());
          const status = u.lastType === "IN" ? "Working" : "Checked Out";
          return {
            userId: u.userId,
            name: u.name,
            status,
            durationMs,
            durationText: formatDuration(durationMs),
            firstInText: u.firstIn.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            lastActionText: u.lastAt
              ? u.lastAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
              : "—",
          };
        })
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "Working" ? -1 : 1;
          return b.durationMs - a.durationMs;
        });

      setWorkDurations(workRows);
      setWorkSummary({
        active: workRows.filter((r) => r.status === "Working").length,
        finished: workRows.filter((r) => r.status === "Checked Out").length,
      });

      const leaveJson = await leaveRes.json();
      const otJson = await otRes.json();
      const tripJson = await tripRes.json();
      const advJson = await advRes.json();

      setPending({
        leave: extractList(leaveJson, ["leaveRequests", "data"]).length,
        overtime: extractList(otJson, ["requests", "overtimeRequests", "data"]).length,
        trip: extractList(tripJson, ["requests", "businessTripRequests", "data"]).length,
        advance: extractList(advJson, ["advances", "salaryAdvances", "data"]).length,
      });

      const auditData = auditRes.ok ? await auditRes.json() : {};
      const roleLogs = auditData.status === "success" ? auditData.logs || [] : [];

      const sample = list.slice(0, 8);
      const detailResponses = await Promise.all(
        sample.map(async (emp) => {
          try {
            const res = await fetch(`${API_BASE}/api/admin/employees/${emp.id}/details`, { headers: authHeaders() });
            if (!res.ok) return null;
            const data = await res.json();
            return data.employee || null;
          } catch {
            return null;
          }
        })
      );

      const feed = [];
      roleLogs.forEach((log) => {
        const target = log.TargetUser || {};
        const when = log.createdAt || log.updatedAt;
        feed.push({
          id: `role-${log.id}`,
          employeeName: target.name || `User #${log.userId}`,
          type: "role",
          effectiveDate: when,
          title: `Role: ${log.oldRole} -> ${log.newRole}${log.reason ? ` - ${log.reason}` : ""}`,
        });
      });
      detailResponses.filter(Boolean).forEach((d) => {
        (d.jobHistory || []).slice(0, 2).forEach((item) => {
          feed.push({
            id: `job-${item.id}`,
            employeeName: d.name,
            type: "job",
            effectiveDate: item.effectiveDate,
            title: `${item.changeType}: ${item.fromJobTitleName || "-"} → ${item.toJobTitleName || "-"}`,
          });
        });
        (d.salaryChangeHistory || []).slice(0, 2).forEach((item) => {
          feed.push({
            id: `salary-${item.id}`,
            employeeName: d.name,
            type: "salary",
            effectiveDate: item.effectiveDate,
            title: `${item.changeType}: ${currency(item.previousBaseSalary)} → ${currency(item.newBaseSalary)}`,
          });
        });
      });

      feed.sort((a, b) => String(b.effectiveDate || "").localeCompare(String(a.effectiveDate || "")));
      const finalFeed = feed.slice(0, 12);
      if (finalFeed.length === 0) {
        setRecentChanges([
          {
            id: "sample-1",
            employeeName: "Nguyen Van A",
            type: "job",
            effectiveDate: new Date().toISOString(),
            title: "Promotion: Junior Dev -> Senior Dev",
          },
          {
            id: "sample-2",
            employeeName: "Tran Thi B",
            type: "salary",
            effectiveDate: new Date().toISOString(),
            title: "Base salary adjustment",
          },
        ]);
      } else {
        setRecentChanges(finalFeed);
      }
    } catch (e) {
      setError(e.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener("hrms-admin-refresh", onRefresh);
    return () => window.removeEventListener("hrms-admin-refresh", onRefresh);
  }, [load]);

  const summary = useMemo(() => {
    const active = employees.filter((e) => e.isActive !== false).length;
    const inactive = employees.length - active;
    const totalPayrollBase = employees.reduce((sum, e) => sum + Number(e.baseSalary || 0), 0);
    const byRole = employees.reduce((acc, e) => {
      const key = e.role || "employee";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const pendingTotal = pending.leave + pending.overtime + pending.trip + pending.advance;
    return { active, inactive, totalPayrollBase, byRole, pendingTotal };
  }, [employees, pending]);

  return {
    employees,
    departments,
    jobTitles,
    recentChanges,
    pending,
    workDurations,
    workSummary,
    loading,
    error,
    summary,
    reload: load,
  };
}
