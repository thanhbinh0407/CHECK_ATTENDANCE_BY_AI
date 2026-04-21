import React, { useCallback, useEffect, useMemo, useState } from "react";
import EmployeeProfileModal from "./EmployeeProfileModal.jsx";
import socket from "../socket.js";
import "./adminEmployeeProfiles.css";

function buildPresenceMap(logs) {
  const byUser = {};
  for (const log of logs || []) {
    const uid = log.userId;
    if (uid == null) continue;
    if (!byUser[uid]) byUser[uid] = [];
    byUser[uid].push(log);
  }
  const map = {};
  for (const uid of Object.keys(byUser)) {
    const sorted = byUser[uid].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    const last = sorted[sorted.length - 1];
    const checkedIn = last.type === "IN";
    const lastIn = [...sorted].reverse().find((l) => l.type === "IN");
    map[Number(uid)] = {
      checkedIn,
      lastType: last.type,
      lastAt: last.timestamp,
      lastInAt: lastIn?.timestamp || null,
    };
  }
  return map;
}

function formatHm(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function contractLabel(status) {
  switch (status) {
    case "active":
      return "Active";
    case "maternity_leave":
      return "Maternity Leave";
    case "unpaid_leave":
      return "Unpaid Leave";
    case "suspended":
      return "Suspended";
    case "terminated":
      return "Terminated";
    case "resigned":
      return "Resigned";
    default:
      return status ? String(status) : "Active";
  }
}

function truncateMiddle(str, max = 22) {
  if (!str || str.length <= max) return str || "";
  const keep = max - 3;
  const head = Math.ceil(keep / 2);
  const tail = Math.floor(keep / 2);
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

export default function AdminDashboard() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [presenceByUserId, setPresenceByUserId] = useState({});

  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDepartmentId, setFilterDepartmentId] = useState("");
  const [filterJobTitleId, setFilterJobTitleId] = useState("");
  const [filterPresence, setFilterPresence] = useState("all");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [startDateTo, setStartDateTo] = useState("");

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const toLocalDateOnly = (value) => {
    if (!value) return null;
    if (typeof value === "string") {
      const datePart = value.slice(0, 10);
      const parts = datePart.split("-");
      if (parts.length === 3) {
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
          return new Date(year, month - 1, day);
        }
      }
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  };

  const fetchTodayPresence = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/attendance/today`);
      const data = await res.json();
      if (res.ok && data.status === "success" && Array.isArray(data.logs)) {
        setPresenceByUserId(buildPresenceMap(data.logs));
      }
    } catch (e) {
      console.warn("fetchTodayPresence:", e);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchTodayPresence();
    const t = setInterval(fetchTodayPresence, 45000);
    return () => clearInterval(t);
  }, [fetchTodayPresence]);

  useEffect(() => {
    socket.connect();
    socket.emit("join-room", { room: "admin" });
    const onUpdate = () => fetchTodayPresence();
    socket.on("attendance-update", onUpdate);
    return () => {
      socket.off("attendance-update", onUpdate);
    };
  }, [fetchTodayPresence]);

  const departmentOptions = useMemo(() => {
    const m = new Map();
    employees.forEach((e) => {
      if (e.Department?.id != null) m.set(e.Department.id, e.Department.name);
    });
    return [...m.entries()].sort((a, b) =>
      String(a[1]).localeCompare(String(b[1]), "vi")
    );
  }, [employees]);

  const jobTitleOptions = useMemo(() => {
    const m = new Map();
    employees.forEach((e) => {
      if (e.JobTitle?.id != null) m.set(e.JobTitle.id, e.JobTitle.name);
    });
    return [...m.entries()].sort((a, b) =>
      String(a[1]).localeCompare(String(b[1]), "vi")
    );
  }, [employees]);

  const activeAdvancedCount = useMemo(() => {
    let n = 0;
    if (filterStatus !== "all") n++;
    if (filterDepartmentId) n++;
    if (filterJobTitleId) n++;
    if (filterPresence !== "all") n++;
    if (startDateFrom || startDateTo) n++;
    return n;
  }, [
    filterStatus,
    filterDepartmentId,
    filterJobTitleId,
    filterPresence,
    startDateFrom,
    startDateTo,
  ]);

  const filteredEmployees = useMemo(() => {
    let filtered = [...employees];

    filtered = filtered.filter((e) => e.isActive !== false);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(q) ||
          emp.email?.toLowerCase().includes(q) ||
          emp.employeeCode?.toLowerCase().includes(q)
      );
    }

    if (filterStatus === "withFace") {
      filtered = filtered.filter((e) => e.FaceProfiles && e.FaceProfiles.length > 0);
    } else if (filterStatus === "withoutFace") {
      filtered = filtered.filter((e) => !e.FaceProfiles || e.FaceProfiles.length === 0);
    }

    if (filterDepartmentId) {
      const id = Number(filterDepartmentId);
      filtered = filtered.filter((e) => e.Department?.id === id);
    }

    if (filterJobTitleId) {
      const id = Number(filterJobTitleId);
      filtered = filtered.filter((e) => e.JobTitle?.id === id);
    }

    if (filterPresence === "checkedOut") {
      filtered = filtered.filter(
        (e) => presenceByUserId[e.id] && !presenceByUserId[e.id].checkedIn
      );
    } else if (filterPresence === "absent") {
      filtered = filtered.filter((e) => !presenceByUserId[e.id]);
    }

    if (startDateFrom || startDateTo) {
      const from = startDateFrom ? toLocalDateOnly(startDateFrom) : null;
      const to = startDateTo ? toLocalDateOnly(startDateTo) : null;
      filtered = filtered.filter((emp) => {
        const sd = toLocalDateOnly(emp.startDate);
        if (!sd) return false;
        if (from && sd < from) return false;
        if (to && sd > to) return false;
        return true;
      });
    }

    filtered.sort((a, b) => {
      const aIn = presenceByUserId[a.id]?.checkedIn ? 1 : 0;
      const bIn = presenceByUserId[b.id]?.checkedIn ? 1 : 0;
      if (bIn !== aIn) return bIn - aIn;
      return (a.name || "").localeCompare(b.name || "", "vi");
    });

    return filtered;
  }, [
    employees,
    searchQuery,
    filterStatus,
    filterDepartmentId,
    filterJobTitleId,
    filterPresence,
    startDateFrom,
    startDateTo,
    presenceByUserId,
  ]);

  const fetchEmployees = async (options = {}) => {
    const background = options.background === true;
    try {
      if (!background) setLoading(true);
      const token = localStorage.getItem("authToken");

      if (!token || !token.trim()) {
        setMessage("Error: Authentication token not found. Please sign in again.");
        setTimeout(() => {
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          window.location.reload();
        }, 2000);
        return;
      }

      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (res.ok) {
        const empList = data.employees || [];
        setEmployees(empList);
        setMessage("");
        fetchTodayPresence();
      } else {
        if (res.status === 401) {
          setMessage("Session expired. Please sign in again.");
          setTimeout(() => {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.reload();
          }, 2000);
        } else {
          setMessage("Failed to load employee list: " + (data.message || "Unknown error"));
        }
      }
    } catch (error) {
      setMessage("Error: " + error.message);
      console.error("Fetch employees error:", error);
    } finally {
      if (!background) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (filterPresence === "checkedIn") setFilterPresence("all");
  }, [filterPresence]);

  const resetFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterDepartmentId("");
    setFilterJobTitleId("");
    setFilterPresence("all");
    setStartDateFrom("");
    setStartDateTo("");
  };

  const msgOk =
    message &&
    (message.includes("successfully") ||
      message.includes("success") ||
      message.startsWith("✅"));

  return (
    <div className="aep-page">
      <div className="aep-hero">
        <h1>👥 Employee Profiles</h1>
        <p>
          View and manage employee information. Use search for quick lookup; open advanced filters to refine by
          organization, contract status, or today attendance.
        </p>
      </div>

      <div className="aep-main">
        {message && (
          <div className={`aep-msg ${msgOk ? "aep-msg--ok" : "aep-msg--err"}`}>
            {msgOk ? "✓ " : "✕ "}
            {message}
          </div>
        )}

        <div className="aep-toolbar">
          <input
            type="text"
            className="aep-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, employee code..."
            aria-label="Search employees"
          />
          <button
            type="button"
            className="aep-btn aep-btn--ghost"
            onClick={() => setShowAdvancedFilters((v) => !v)}
          >
            Advanced Filters
            {activeAdvancedCount > 0 ? ` (${activeAdvancedCount})` : ""}
            {showAdvancedFilters ? " ▲" : " ▼"}
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="aep-advanced">
            <div className="aep-advanced-grid">
              <div className="aep-field">
                <label>Face Enrollment</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">All ({employees.length})</option>
                  <option value="withFace">
                    Enrolled (
                    {employees.filter((e) => e.FaceProfiles && e.FaceProfiles.length > 0).length})
                  </option>
                  <option value="withoutFace">
                    Not enrolled (
                    {employees.filter((e) => !e.FaceProfiles || e.FaceProfiles.length === 0).length})
                  </option>
                </select>
              </div>
              <div className="aep-field">
                <label>Department</label>
                <select
                  value={filterDepartmentId}
                  onChange={(e) => setFilterDepartmentId(e.target.value)}
                >
                  <option value="">All departments</option>
                  {departmentOptions.map(([id, name]) => (
                    <option key={id} value={String(id)}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="aep-field">
                <label>Job Title</label>
                <select value={filterJobTitleId} onChange={(e) => setFilterJobTitleId(e.target.value)}>
                  <option value="">All job titles</option>
                  {jobTitleOptions.map(([id, name]) => (
                    <option key={id} value={String(id)}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="aep-field">
                <label>Today's Attendance</label>
                <select
                  value={filterPresence}
                  onChange={(e) => setFilterPresence(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="checkedOut">Checked out today</option>
                  <option value="absent">No attendance record today</option>
                </select>
              </div>
              <div className="aep-field">
                <label>Start date (from)</label>
                <input
                  type="date"
                  value={startDateFrom}
                  onChange={(e) => setStartDateFrom(e.target.value)}
                />
              </div>
              <div className="aep-field">
                <label>Start date (to)</label>
                <input
                  type="date"
                  value={startDateTo}
                  onChange={(e) => setStartDateTo(e.target.value)}
                />
              </div>
            </div>
            <button type="button" className="aep-btn aep-btn--ghost aep-btn--sm" onClick={resetFilters}>
              Clear Filters
            </button>
          </div>
        )}

        <p className="aep-meta">
          Showing <strong>{filteredEmployees.length}</strong> / {employees.length} employees · Checked-in today listed
          first
        </p>

        {loading ? (
          <div className="aep-loading">
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <div>Loading list...</div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="aep-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <h3 style={{ margin: "0 0 8px", color: "#262626" }}>
              {employees.length === 0 ? "No employees yet" : "No matches for current filters"}
            </h3>
            <p style={{ margin: 0, fontSize: 14 }}>
              {employees.length === 0
                ? "Add employees."
                : "Try adjusting search or advanced filters."}
            </p>
            {employees.length > 0 && (
              <button
                type="button"
                className="aep-btn aep-btn--primary"
                style={{ marginTop: 16 }}
                onClick={resetFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="aep-grid">
            {filteredEmployees.map((emp) => {
              const hasFace = emp.FaceProfiles && emp.FaceProfiles.length > 0;
              const presence = presenceByUserId[emp.id];
              const deptName = emp.Department?.name;
              const jobName = emp.JobTitle?.name;
              const empStatus = emp.employmentStatus || "active";
              const contractText = contractLabel(empStatus);
              const isActiveContract = empStatus === "active";

              let presenceClass = "aep-presence--none";
              let presenceText = "No attendance record today";
              if (presence) {
                if (presence.checkedIn) {
                  presenceClass = "aep-presence--in";
                  presenceText = `Active · check-in ${formatHm(presence.lastInAt || presence.lastAt)}`;
                } else {
                  presenceClass = "aep-presence--out";
                  presenceText = `Checked out · ${formatHm(presence.lastAt)}`;
                }
              }

              return (
                <div key={emp.id} className="aep-card">
                  <div className="aep-card-inner">
                    <div className="aep-card-head">
                      <div className="aep-avatar">{emp.name?.charAt(0)?.toUpperCase() || "?"}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 className="aep-name">{emp.name || "—"}</h3>
                        <div className="aep-sub">
                          {emp.employeeCode || "—"} | {truncateMiddle(emp.email || "", 26)}
                        </div>
                        <div className={`aep-presence ${presenceClass}`}>{presenceText}</div>
                      </div>
                      <div
                        className={`aep-badge-reg ${hasFace ? "aep-badge-reg--ok" : "aep-badge-reg--no"}`}
                      >
                        {hasFace ? "Enrolled" : "Not enrolled"}
                      </div>
                    </div>

                    <div className="aep-info-panel">
                      <div className="aep-info-grid">
                        <div>
                          <div className="aep-info-label">Department</div>
                          <div className={deptName ? "aep-info-value" : "aep-info-value aep-info-value--muted"}>
                            {deptName || "Not updated"}
                          </div>
                        </div>
                        <div>
                          <div className="aep-info-label">Job Title</div>
                          <div className={jobName ? "aep-info-value" : "aep-info-value aep-info-value--muted"}>
                            {jobName || "Not updated"}
                          </div>
                        </div>
                        <div>
                          <div className="aep-info-label">Contract</div>
                          <div
                            className={
                              isActiveContract ? "aep-info-value aep-info-value--ok" : "aep-info-value"
                            }
                          >
                            {contractText}
                          </div>
                        </div>
                        <div>
                          <div className="aep-info-label">Start Date</div>
                          <div
                            className={
                              emp.startDate ? "aep-info-value" : "aep-info-value aep-info-value--muted"
                            }
                          >
                            {emp.startDate
                              ? new Date(emp.startDate).toLocaleDateString("en-US")
                              : "Not updated"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="aep-card-footer">
                      <p className="aep-footnote">
                        *These fields are pulled from HR profile data. If empty, open <strong>Details</strong> to set
                        department, job title, and start date.
                      </p>

                      <div className="aep-card-actions">
                        <button
                          type="button"
                          className="aep-btn aep-btn--primary"
                          onClick={() => setSelectedEmployee(emp)}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedEmployee && (
          <EmployeeProfileModal
            employee={selectedEmployee}
            onClose={() => setSelectedEmployee(null)}
            onUpdate={() => {
              // Giữ modal mở ở chế độ xem chi tiết; chỉ đồng bộ danh sách thẻ phía sau
              fetchEmployees({ background: true });
            }}
          />
        )}
      </div>
    </div>
  );
}
