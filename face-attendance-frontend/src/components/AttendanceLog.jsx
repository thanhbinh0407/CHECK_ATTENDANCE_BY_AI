import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { exportAttendanceToExcel, exportAttendanceToPDF, exportAttendanceMonthlyWorkHoursSummaryToExcel, exportAttendanceMonthlyWorkHoursSummaryToDocx } from "../utils/exportUtils.js";
import { toastWarning } from "../lib/notify.jsx";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const PAGE_SIZE = 100;
const EXPORT_MAX_ROWS = 25000;
const ATTENDANCE_TIMEZONE = "Asia/Ho_Chi_Minh";

function getAttendanceDateKey(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("sv-SE", { timeZone: ATTENDANCE_TIMEZONE });
}

function formatWorkHoursLabel(hours, otHours) {
  if (!hours) return "—";
  const baseLabel = `${hours.toFixed(1)}h`;
  return otHours ? `${baseLabel} · OT ${otHours.toFixed(1)}h` : baseLabel;
}

function computeWorkHourSummary(logs = []) {
  const groups = new Map();

  logs.forEach((log) => {
    const dateKey = getAttendanceDateKey(log.timestamp);
    const employeeId = String(log.userId || "unknown");
    const groupKey = `${employeeId}||${dateKey}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        dateKey,
        employeeId,
        checkIns: [],
        checkOuts: [],
        hasOvertime: false,
        hasAbsent: false,
        hasLate: false,
        hasEarlyLeave: false,
      });
    }

    const group = groups.get(groupKey);
    const type = String(log.type || "").toUpperCase();
    if (type === "IN" || type === "LATE_IN" || type === "OT_IN") {
      group.checkIns.push(log);
    }
    if (type === "OUT" || type === "EARLY_OUT" || type === "OT_OUT") {
      group.checkOuts.push(log);
    }
    if (log.isOvertime) group.hasOvertime = true;
    if (log.isAbsent) group.hasAbsent = true;
    if (log.isLate) group.hasLate = true;
    if (log.isEarlyLeave) group.hasEarlyLeave = true;
  });

  const map = new Map();
  const totals = {
    totalHours: 0,
    totalOtHours: 0,
    daysWorked: 0,
    absentRows: 0,
    lateRows: 0,
    earlyLeaveRows: 0,
  };

  groups.forEach((group, key) => {
    const checkIn = group.checkIns.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];
    const checkOut = group.checkOuts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).slice(-1)[0];
    let totalHours = 0;
    let otHours = 0;
    let label = "—";
    let status = "No hours";

    if (checkIn && checkOut) {
      totalHours = Math.max(0, (new Date(checkOut.timestamp) - new Date(checkIn.timestamp)) / 3600000);
      const localOut = new Date(checkOut.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: ATTENDANCE_TIMEZONE,
      });
      const [outHour, outMin] = localOut.split(":").map(Number);
      const outDecimal = outHour + outMin / 60;
      otHours = group.hasOvertime ? Math.max(0, totalHours - 9) : Math.max(0, outDecimal - 17);
      otHours = Number(otHours.toFixed(1));
      label = formatWorkHoursLabel(totalHours, otHours);
      status = group.hasAbsent
        ? group.hasLate || group.hasEarlyLeave
          ? "Absent Half Day"
          : "Absent"
        : group.hasLate
        ? "Late"
        : group.hasEarlyLeave
        ? "Early Leave"
        : group.hasOvertime
        ? "OT"
        : "Normal";
      totals.totalHours += totalHours;
      totals.totalOtHours += otHours;
      totals.daysWorked += 1;
      totals.lateRows += group.hasLate ? 1 : 0;
      totals.earlyLeaveRows += group.hasEarlyLeave ? 1 : 0;
    } else if (group.hasAbsent) {
      label = "Absent";
      status = "Absent";
      totals.absentRows += 1;
    } else if (checkIn || checkOut) {
      label = "Partial";
      status = "Partial";
    }

    map.set(key, {
      totalHours,
      otHours,
      label,
      status,
      checkIn,
      checkOut,
    });
  });

  return { map, totals };
}

export default function AttendanceLog() {
  const [allLogs, setAllLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState(() => ({
    start: daysAgoISO(31),
    end: todayISO(),
  }));
  const [selectedMonth, setSelectedMonth] = useState("");
  const [monthlyExportLanguage, setMonthlyExportLanguage] = useState('en');
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsHasMore, setLogsHasMore] = useState(false);
  const [listOffset, setListOffset] = useState(0);
  const [exportingKind, setExportingKind] = useState("");

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const filterKey = `${dateRange.start}|${dateRange.end}|${searchQuery}|${selectedEmployeeId}|${filterType}|${filterStatus}`;
  const prevFilterKey = useRef(filterKey);

  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      setListOffset(0);
    }
  }, [filterKey]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Please sign in to load attendance logs.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const empRes = await fetch(`${apiBase}/api/admin/employees`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const empData = await empRes.json();
        if (!cancelled && empData.employees) setEmployees(empData.employees);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    let cancelled = false;
    const tid = setTimeout(async () => {
      try {
        setLogsLoading(true);
        setError("");
        const from = dateRange.start || daysAgoISO(31);
        const to = dateRange.end || todayISO();
        const qs = new URLSearchParams({
          from,
          to,
          limit: String(PAGE_SIZE),
          offset: String(listOffset),
        });
        if (searchQuery.trim()) qs.set("search", searchQuery.trim());
        if (selectedEmployeeId) qs.set("userId", String(selectedEmployeeId));
        if (filterType !== "all") qs.set("type", filterType);
        if (filterStatus === "matched") qs.set("matchStatus", "matched");
        if (filterStatus === "unmatched") qs.set("matchStatus", "unmatched");

        const logsRes = await fetch(`${apiBase}/api/admin/attendance-logs?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const logsData = await logsRes.json();
        if (!logsRes.ok) {
          throw new Error(logsData?.message || `Failed to load logs (${logsRes.status})`);
        }
        if (cancelled) return;
        setAllLogs(logsData.logs || []);
        const pg = logsData.pagination || {};
        setLogsTotal(typeof pg.total === "number" ? pg.total : (logsData.logs || []).length);
        setLogsHasMore(Boolean(pg.hasMore));
      } catch (err) {
        if (!cancelled) {
          setError("Error loading data: " + err.message);
          console.error("Fetch error:", err);
        }
      } finally {
        if (!cancelled) setLogsLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(tid);
    };
  }, [dateRange.start, dateRange.end, listOffset, searchQuery, selectedEmployeeId, filterType, filterStatus, apiBase]);

  const buildExportQuery = useCallback(() => {
    const from = dateRange.start || daysAgoISO(31);
    const to = dateRange.end || todayISO();
    const qs = new URLSearchParams({
      from,
      to,
      // use limit=0 to request all matching rows from server for exports
      limit: String(0),
      offset: "0",
    });
    if (searchQuery.trim()) qs.set("search", searchQuery.trim());
    if (selectedEmployeeId) qs.set("userId", String(selectedEmployeeId));
    if (filterType !== "all") qs.set("type", filterType);
    if (filterStatus === "matched") qs.set("matchStatus", "matched");
    if (filterStatus === "unmatched") qs.set("matchStatus", "unmatched");
    return qs;
  }, [dateRange.start, dateRange.end, searchQuery, selectedEmployeeId, filterType, filterStatus]);

  const runExport = useCallback(
    async (kind) => {
      const token = localStorage.getItem("authToken");
      if (!token) return;
      const from = dateRange.start || daysAgoISO(31);
      const to = dateRange.end || todayISO();
      try {
        setExportingKind(kind);
        setError("");
        // For monthly export request all matching rows (no server-side limit)
        const qs = buildExportQuery();
        const res = await fetch(`${apiBase}/api/admin/attendance-logs?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Export fetch failed");
        const rows = data.logs || [];
        if (data.pagination?.hasMore) {
          toastWarning(`Export includes first ${rows.length} rows only. Narrow the date range for a full export.`);
        }
        const name = `attendance-history-${from}-${to}`;
        if (kind === "excel") {
          exportAttendanceToExcel(rows, employees, name);
        } else if (kind === "monthly-work-hours") {
          exportAttendanceMonthlyWorkHoursSummaryToExcel(
            rows,
            employees,
            `attendance-monthly-${from}-${to}`,
            monthlyExportLanguage
          );
        } else {
          await exportAttendanceToPDF(rows, employees, name);
        }
      } catch (e) {
        setError("Export failed: " + e.message);
      } finally {
        setExportingKind("");
      }
    },
    [apiBase, buildExportQuery, employees, dateRange.start, dateRange.end, monthlyExportLanguage]
  );

  const getEmployeeName = (userId) => {
    const emp = employees.find(e => e.id === userId);
    return emp?.name || `User ${userId}`;
  };

  const workHoursSummary = useMemo(() => computeWorkHourSummary(allLogs), [allLogs]);

  const handleSelectMonth = useCallback(() => {
    if (!selectedMonth) return;
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr); // 1-12
    if (!year || !month) return;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).toISOString().split('T')[0];
    setDateRange({ start, end: lastDay });
  }, [selectedMonth, setDateRange]);

  const selectedStats = useMemo(() => {
    if (!selectedEmployeeId) return null;
    const keyPrefix = `${String(selectedEmployeeId)}||`;
    const entries = [...workHoursSummary.map.entries()].filter(([key]) => key.startsWith(keyPrefix));
    const totalHours = entries.reduce((sum, [, value]) => sum + (value.totalHours || 0), 0);
    const totalOtHours = entries.reduce((sum, [, value]) => sum + (value.otHours || 0), 0);
    const daysWorked = entries.filter(([, value]) => value.totalHours > 0).length;
    const absentDays = entries.filter(([, value]) => value.status === "Absent").length;
    const lateDays = entries.filter(([, value]) => value.status === "Late").length;
    const earlyLeaveDays = entries.filter(([, value]) => value.status === "Early Leave").length;
    return {
      totalHours,
      totalOtHours,
      daysWorked,
      absentDays,
      lateDays,
      earlyLeaveDays,
    };
  }, [selectedEmployeeId, workHoursSummary]);

  const containerStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px"
  };

  const headerStyle = {
    marginBottom: "24px"
  };

  const selectStyle = {
    padding: "10px 15px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "14px",
    marginBottom: "16px"
  };

  const statsStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "24px"
  };

  const statBoxStyle = {
    backgroundColor: "#f8f9fa",
    padding: "16px",
    borderRadius: "8px",
    textAlign: "center"
  };

  const logsTableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#fff",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
  };

  const thStyle = {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    padding: "12px",
    textAlign: "left",
    fontWeight: "600",
    fontSize: "13px"
  };

  const tdStyle = {
    padding: "12px",
    borderBottom: "1px solid #eee",
    fontSize: "13px"
  };

  const sortedLogs = [...allLogs].sort((a, b) => {
    const ta = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tb - ta;
  });

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0" }}>
      {/* Welcome Header — compact */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#fff",
        padding: "18px 24px",
        borderRadius: "12px 12px 0 0",
        boxShadow: "0 2px 12px rgba(102, 126, 234, 0.22)"
      }}>
        <h1 style={{ margin: "0 0 6px 0", fontSize: "22px", fontWeight: "700", lineHeight: 1.25 }}>
          📊 Attendance History
        </h1>
        <p style={{ margin: 0, fontSize: "13px", opacity: 0.92, lineHeight: 1.45, maxWidth: "52rem" }}>
          View detailed attendance history for all employees. Track check-in/out times, accuracy, and attendance status.
        </p>
      </div>

      {/* Main Content */}
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "0 0 12px 12px",
        padding: "20px 22px 24px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
      }}>

        {error && (
          <div style={{
            padding: "16px 20px",
            backgroundColor: "#f8d7da",
            border: "2px solid #f5c6cb",
            borderRadius: "8px",
            color: "#721c24",
            marginBottom: "24px",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            ❌ {error}
          </div>
        )}

        {/* Search & Filters — single compact grid (incl. date range) */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "16px 18px",
          marginBottom: "20px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          border: "1px solid #e8e8e8"
        }}>
          <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1a1a1a" }}>
              🔍 Search & Advanced Filter
            </h3>
            <button
              onClick={() => {
                setSearchQuery("");
                setDateRange({ start: daysAgoISO(31), end: todayISO() });
                setFilterType("all");
                setFilterStatus("all");
                setSelectedEmployeeId(null);
              }}
              style={{
                padding: "6px 12px",
                backgroundColor: "#6c757d",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "12px"
              }}
            >
              🔄 Reset
            </button>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "10px 14px",
            marginBottom: "12px"
          }}>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "11px", color: "#495057" }}>
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, employee code, device..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  border: "1px solid #d0d7de",
                  borderRadius: "6px",
                  fontSize: "13px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "11px", color: "#495057" }}>
                Employee
              </label>
              <select
                value={selectedEmployeeId || ""}
                onChange={(e) => setSelectedEmployeeId(e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  border: "1px solid #d0d7de",
                  borderRadius: "6px",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                <option value="">All</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "11px", color: "#495057" }}>
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  border: "1px solid #d0d7de",
                  borderRadius: "6px",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                <option value="all">All</option>
                <option value="IN">Check-in</option>
                <option value="OUT">Check-out</option>
                <option value="OT_IN">Overtime Check-in</option>
                <option value="OT_OUT">Overtime Check-out</option>
                <option value="LATE_IN">Late Check-in</option>
                <option value="EARLY_OUT">Early Check-out</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "11px", color: "#495057" }}>
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  border: "1px solid #d0d7de",
                  borderRadius: "6px",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                <option value="all">All</option>
                <option value="matched">Matched</option>
                <option value="unmatched">Unmatched</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "11px", color: "#495057" }}>
                From Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  border: "1px solid #d0d7de",
                  borderRadius: "6px",
                  fontSize: "13px"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "11px", color: "#495057" }}>
                To Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  border: "1px solid #d0d7de",
                  borderRadius: "6px",
                  fontSize: "13px"
                }}
              />
            </div>
          </div>

          {/* Quick Filters & Export */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", borderTop: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setDateRange({ start: today, end: today });
                }}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #e0e0e0",
                  borderRadius: "6px",
                  cursor: exportingKind !== "" ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  fontWeight: "500"
                }}
              >
                Today
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const weekStart = new Date(today);
                  weekStart.setDate(today.getDate() - today.getDay());
                  setDateRange({ 
                    start: weekStart.toISOString().split('T')[0], 
                    end: today.toISOString().split('T')[0] 
                  });
                }}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #e0e0e0",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "500"
                }}
              >
                This Week
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                  setDateRange({ 
                    start: monthStart.toISOString().split('T')[0], 
                    end: today.toISOString().split('T')[0] 
                  });
                }}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #e0e0e0",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "500"
                }}
              >
                This Month
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d0d7de', fontSize: 12 }}
                />
                <button
                  onClick={handleSelectMonth}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e0e0e0',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500
                  }}
                >
                  Select Month
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #dee2e6', borderRadius: 10, padding: '10px 14px', backgroundColor: '#f8f9fa' }}>
                <span style={{ fontSize: 13, color: '#495057', fontWeight: 600 }}>Export language</span>
                <select
                  value={monthlyExportLanguage}
                  onChange={(e) => setMonthlyExportLanguage(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ced4da', fontSize: 13, minWidth: 140, backgroundColor: '#ffffff', color: '#212529' }}
                >
                  <option value="en">English</option>
                  <option value="vi">Vietnamese</option>
                </select>
                <span style={{ fontSize: 12, color: '#6c757d' }}>Monthly Work Hours export</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => runExport("excel")}
                disabled={exportingKind !== ""}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#28a745",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: exportingKind !== "" ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: exportingKind !== "" ? 0.7 : 1
                }}
              >
                📥 Export Excel
              </button>
              {/* Export Work Hours removed per request */}
              <button
                type="button"
                onClick={() => runExport("monthly-work-hours")}
                disabled={exportingKind !== ""}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#6610f2",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: exportingKind !== "" ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: exportingKind !== "" ? 0.7 : 1
                }}
              >
                📆 Export Monthly Work Hours
              </button>
              <button
                type="button"
                onClick={() => runExport("pdf")}
                disabled={exportingKind !== ""}
                style={{
                padding: "10px 20px",
                backgroundColor: "#dc3545",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: exportingKind !== "" ? "not-allowed" : "pointer",
                fontWeight: "600",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: exportingKind !== "" ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (exportingKind !== "") return;
                e.currentTarget.style.backgroundColor = "#c82333";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                if (exportingKind !== "") return;
                e.currentTarget.style.backgroundColor = "#dc3545";
                e.currentTarget.style.transform = "translateY(0)";
              }}
              >
                📄 Export PDF
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div style={{ marginTop: "10px", fontSize: "13px", color: "#666", paddingTop: "10px", borderTop: "1px solid #f0f0f0" }}>
            {logsLoading ? (
              <span style={{ color: "#64748b" }}>Loading page…</span>
            ) : (
              <>
                Rows <strong>{listOffset + (allLogs.length ? 1 : 0)}</strong>
                {allLogs.length ? <>–<strong>{listOffset + allLogs.length}</strong></> : ""} of <strong>{logsTotal}</strong>
                {logsTotal > 0 ? (
                  <> · period {dateRange.start || "…"} → {dateRange.end || "…"}</>
                ) : null}
                {logsHasMore ? " · use Next for more" : ""}
              </>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {selectedEmployeeId && selectedStats && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "24px",
            marginBottom: "32px"
          }}>
            <div style={{
              backgroundColor: "#fff",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              border: "1px solid #e0e0e0",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#1d4ed8", marginBottom: "8px" }}>
                {selectedStats.totalHours.toFixed(1)}h
              </div>
              <div style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>
                Total work hours
              </div>
            </div>
            <div style={{
              backgroundColor: "#fff",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              border: "1px solid #e0e0e0",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#9333ea", marginBottom: "8px" }}>
                {selectedStats.totalOtHours.toFixed(1)}h
              </div>
              <div style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>
                Total OT hours
              </div>
            </div>
            <div style={{
              backgroundColor: "#fff",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              border: "1px solid #e0e0e0",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#f59e0b", marginBottom: "8px" }}>
                {selectedStats.daysWorked}
              </div>
              <div style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>
                Days worked
              </div>
            </div>
            <div style={{
              backgroundColor: "#fff",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              border: "1px solid #e0e0e0",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#dc3545", marginBottom: "8px" }}>
                {selectedStats.absentDays}
              </div>
              <div style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>
                Absent days
              </div>
            </div>
          </div>
        )}

        {/* Logs Display */}
        {logsLoading && allLogs.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "28px 20px",
            backgroundColor: "#f8fafc",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            color: "#64748b",
            fontSize: "14px",
          }}>
            Loading…
          </div>
        ) : !logsLoading && allLogs.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "40px 24px",
            backgroundColor: "#f8f9fa",
            borderRadius: "12px",
            border: "2px dashed #dee2e6"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
              {selectedEmployeeId ? "No attendance history" : "No data"}
            </h3>
            <p style={{ fontSize: "13px", color: "#666" }}>
              {selectedEmployeeId
                ? "This employee has no attendance records in this period."
                : "No attendance rows for the selected filters and date range."
              }
            </p>
          </div>
        ) : (
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            <div style={{ overflowX: "auto", opacity: logsLoading ? 0.55 : 1, transition: "opacity 0.15s ease" }}>
              <table style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: "0"
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: "#f8f9fa",
                    borderBottom: "2px solid #e0e0e0"
                  }}>
                    <th style={{
                      padding: "8px 10px",
                      textAlign: "left",
                      fontWeight: "700",
                      fontSize: "11px",
                      color: "#495057",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em"
                    }}>Time</th>
                    <th style={{
                      padding: "8px 10px",
                      textAlign: "left",
                      fontWeight: "700",
                      fontSize: "11px",
                      color: "#495057",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em"
                    }}>Employee</th>
                    <th style={{
                      padding: "8px 10px",
                      textAlign: "left",
                      fontWeight: "700",
                      fontSize: "11px",
                      color: "#495057",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em"
                    }}>Code</th>
                    <th style={{
                      padding: "8px 10px",
                      textAlign: "left",
                      fontWeight: "700",
                      fontSize: "11px",
                      color: "#495057",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em"
                    }}>Type</th>
                    <th style={{
                      padding: "8px 10px",
                      textAlign: "center",
                      fontWeight: "700",
                      fontSize: "11px",
                      color: "#495057",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em"
                    }}>Conf.</th>
                    <th style={{
                      padding: "8px 10px",
                      textAlign: "center",
                      fontWeight: "700",
                      fontSize: "11px",
                      color: "#495057",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em"
                    }}>Auto checkout</th>
                    <th style={{
                      padding: "8px 10px",
                      textAlign: "left",
                      fontWeight: "700",
                      fontSize: "11px",
                      color: "#495057",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em"
                    }}>Work Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLogs.map((log) => {
                    const empName = getEmployeeName(log.userId);
                    const emp = employees.find(e => e.id === log.userId);
                    
                    // Determine type colors based on type
                    let typeColor, typeBgColor, typeTextColor, typeLabel;
                    switch(log.type) {
                      case 'OT_IN':
                      case 'OT_OUT':
                        typeColor = "#6f42c1";
                        typeBgColor = "#e2d9f3";
                        typeTextColor = "#4a2c73";
                        typeLabel = log.type === 'OT_IN' ? "OT IN" : "OT OUT";
                        break;
                      case 'LATE_IN':
                        typeColor = "#dc3545";
                        typeBgColor = "#f8d7da";
                        typeTextColor = "#721c24";
                        typeLabel = "LATE IN";
                        break;
                      case 'EARLY_OUT':
                        typeColor = "#fd7e14";
                        typeBgColor = "#fff3cd";
                        typeTextColor = "#856404";
                        typeLabel = "EARLY OUT";
                        break;
                      case 'ABSENT':
                        typeColor = "#e74c3c";
                        typeBgColor = "#fadbd8";
                        typeTextColor = "#922b21";
                        typeLabel = "ABSENT";
                        break;
                      case 'IN':
                        typeColor = "#28a745";
                        typeBgColor = "#d4edda";
                        typeTextColor = "#155724";
                        typeLabel = "IN";
                        break;
                      case 'OUT':
                      default:
                        typeColor = "#ff9800";
                        typeBgColor = "#fff3cd";
                        typeTextColor = "#856404";
                        typeLabel = "OUT";
                        break;
                    }
                    
                    return (
                      <tr
                        key={log.id}
                        style={{
                          borderBottom: "1px solid #f0f0f0",
                          transition: "background-color 0.2s",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <td style={{
                          padding: "8px 10px",
                          fontSize: "12px",
                          color: "#1a1a1a",
                          whiteSpace: "nowrap",
                        }}>
                          <span style={{ fontWeight: "600" }}>
                            {new Date(log.timestamp).toLocaleDateString("en-US")}
                          </span>
                          <span style={{ color: "#64748b", marginLeft: "6px" }}>
                            {new Date(log.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{
                            backgroundColor: log.userId ? "#d4edda" : "#fff3cd",
                            color: log.userId ? "#155724" : "#856404",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "600",
                            display: "inline-block",
                            maxWidth: "160px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}>
                            {log.detectedName || empName}
                          </span>
                        </td>
                        <td style={{
                          padding: "8px 10px",
                          fontSize: "12px",
                          color: "#666",
                          fontWeight: "500",
                          fontFamily: "ui-monospace, monospace",
                        }}>
                          {emp?.employeeCode || "—"}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{
                            backgroundColor: typeBgColor,
                            color: typeTextColor,
                            padding: "3px 8px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: "700",
                            display: "inline-block",
                            border: `1px solid ${typeColor}`
                          }}>
                            {typeLabel}
                          </span>
                          {log.isAuto && (
                            <span style={{
                              backgroundColor: "#dc3545",
                              color: "#fff",
                              padding: "3px 8px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: "700",
                              display: "inline-block",
                              marginLeft: "6px",
                              border: "1px solid #c82333"
                            }}>
                              AUTO
                            </span>
                          )}
                        </td>
                        <td style={{
                          padding: "8px 10px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: log.confidence > 0.8 ? "#28a745" : log.confidence > 0.6 ? "#ffc107" : "#dc3545"
                        }}>
                          {log.confidence ? `${(log.confidence * 100).toFixed(0)}%` : "—"}
                        </td>
                        <td style={{
                          padding: "8px 10px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: log.isAuto ? "#155724" : "#495057",
                        }}>
                          {log.isAuto ? "AUTO" : "MANUAL"}
                        </td>
                        <td style={{
                          padding: "8px 10px",
                          fontSize: "12px",
                          color: "#666",
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {workHoursSummary.map.get(`${String(log.userId || "unknown")}||${getAttendanceDateKey(log.timestamp)}`)?.label || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderTop: "1px solid #eee",
                background: "#fafafa",
                fontSize: "13px",
              }}
            >
              <button
                type="button"
                disabled={listOffset <= 0 || logsLoading}
                onClick={() => setListOffset((o) => Math.max(0, o - PAGE_SIZE))}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: listOffset <= 0 || logsLoading ? "#f1f5f9" : "#fff",
                  cursor: listOffset <= 0 || logsLoading ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                ← Previous
              </button>
              <span style={{ color: "#475569" }}>
                Page <strong>{Math.floor(listOffset / PAGE_SIZE) + 1}</strong>
                {" / "}
                <strong>{Math.max(1, Math.ceil((logsTotal || 0) / PAGE_SIZE))}</strong>
                <span style={{ marginLeft: "8px", opacity: 0.85 }}>({PAGE_SIZE} / page)</span>
              </span>
              <button
                type="button"
                disabled={!logsHasMore || logsLoading}
                onClick={() => setListOffset((o) => o + PAGE_SIZE)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: !logsHasMore || logsLoading ? "#f1f5f9" : "#fff",
                  cursor: !logsHasMore || logsLoading ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
