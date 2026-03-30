import { useEffect, useMemo, useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function authHeaders() {
  const token = localStorage.getItem("authToken");
  return { Authorization: `Bearer ${token}` };
}

function currency(v) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(v || 0));
}

function extractList(data, keys) {
  for (const k of keys) {
    const v = data[k];
    if (Array.isArray(v)) return v;
  }
  return [];
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [empRes, deptRes, jtRes, auditRes, leaveRes, otRes, tripRes, advRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/employees`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/departments`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/job-titles`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/admin/audits/role-changes?page=1&pageSize=15`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/leave/requests?status=pending`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/overtime-requests?status=pending`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/business-trip-requests?status=pending`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/salary-advances?status=pending`, { headers: authHeaders() }),
      ]);

      const empData = await empRes.json();
      const deptData = await deptRes.json();
      const jtData = await jtRes.json();
      const list = empData.employees || empData.data || [];
      setEmployees(list);
      setDepartments(deptData.departments || deptData.data || []);
      setJobTitles(jtData.jobTitles || jtData.data || []);

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
          title: `Vai trò: ${log.oldRole} → ${log.newRole}${log.reason ? ` — ${log.reason}` : ""}`,
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
            employeeName: "Nguyễn Văn A",
            type: "job",
            effectiveDate: new Date().toISOString(),
            title: "Thăng chức: Junior Dev → Senior Dev",
          },
          {
            id: "sample-2",
            employeeName: "Trần Thị B",
            type: "salary",
            effectiveDate: new Date().toISOString(),
            title: "Điều chỉnh lương cơ bản",
          },
        ]);
      } else {
        setRecentChanges(finalFeed);
      }
    } catch (e) {
      setError(e.message || "Không tải được dữ liệu dashboard");
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
    loading,
    error,
    summary,
    reload: load,
  };
}
