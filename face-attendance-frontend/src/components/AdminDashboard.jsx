import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  exportEmployeesToExcel,
  exportEmployeesToPDF,
  importEmployeesFromExcel,
  downloadEmployeeTemplate,
} from "../utils/exportUtils.js";
import EmployeeProfileModal from "./EmployeeProfileModal.jsx";
import socket from "../socket.js";
import "./adminEmployeeProfiles.css";
import {
  toastConfirm,
  toastError,
  toastSuccess,
  toastWarning,
  toastPrompt,
} from "../lib/notify.jsx";

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
  const [listMode, setListMode] = useState("active"); // active | inactive
  const [filterDepartmentId, setFilterDepartmentId] = useState("");
  const [filterJobTitleId, setFilterJobTitleId] = useState("");
  const [filterEmployment, setFilterEmployment] = useState("all");
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
    if (filterEmployment !== "all") n++;
    if (filterPresence !== "all") n++;
    if (startDateFrom || startDateTo) n++;
    return n;
  }, [
    filterStatus,
    filterDepartmentId,
    filterJobTitleId,
    filterEmployment,
    filterPresence,
    startDateFrom,
    startDateTo,
  ]);

  const filteredEmployees = useMemo(() => {
    let filtered = [...employees];

    // List mode: active list shows only active; disabled list shows only inactive
    filtered =
      listMode === "active"
        ? filtered.filter((e) => e.isActive !== false)
        : filtered.filter((e) => e.isActive === false);

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

    if (filterEmployment !== "all") {
      filtered = filtered.filter((e) => (e.employmentStatus || "active") === filterEmployment);
    }

    if (filterPresence === "checkedIn") {
      filtered = filtered.filter((e) => presenceByUserId[e.id]?.checkedIn);
    } else if (filterPresence === "checkedOut") {
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
    listMode,
    searchQuery,
    filterStatus,
    filterDepartmentId,
    filterJobTitleId,
    filterEmployment,
    filterPresence,
    startDateFrom,
    startDateTo,
    presenceByUserId,
  ]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const deactivateEmployee = async (employeeId) => {
    const ok = await toastConfirm({ message: "Are you sure you want to deactivate this employee?" });
    if (!ok) return;

    try {
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

      const res = await fetch(`${apiBase}/api/admin/employees/${employeeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Employee deactivated: " + (data.user?.name || data.deletedEmployee?.name || ""));
        fetchEmployees();
        toastSuccess("Employee deactivated.");
      } else {
        if (res.status === 401) {
          setMessage("Session expired. Please sign in again.");
          setTimeout(() => {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.reload();
          }, 2000);
        } else {
          setMessage("Error: " + (data.message || "Unknown error"));
          console.error("Delete error:", data);
        }
      }
    } catch (error) {
      setMessage("Error: " + error.message);
      console.error("Delete exception:", error);
    }
  };

  const restoreEmployee = async (employeeId) => {
    const ok = await toastConfirm({ message: "Restore this employee account?" });
    if (!ok) return;
    try {
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

      const res = await fetch(`${apiBase}/api/admin/employees/${employeeId}/restore`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setMessage("Employee restored: " + (data.user?.name || ""));
        fetchEmployees();
        toastSuccess("Employee restored.");
      } else {
        if (res.status === 401) {
          setMessage("Session expired. Please sign in again.");
          setTimeout(() => {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.reload();
          }, 2000);
        } else {
          setMessage("Error: " + (data.message || "Unknown error"));
        }
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    }
  };

  const permanentlyDeleteEmployee = async (employeeId, employeeName) => {
    const ok = await toastConfirm({
      message: `Permanently delete "${employeeName}"?\n\nThis action cannot be undone.`,
    });
    if (!ok) return;
    const password = await toastPrompt({
      message: "Enter Manager password to confirm permanent deletion:",
      inputType: "password",
    });
    if (password === null) return;
    if (!String(password).trim()) {
      toastWarning("Password is required.");
      return;
    }
    try {
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

      const res = await fetch(`${apiBase}/api/admin/employees/${employeeId}/permanent`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setMessage("✅ Permanently deleted: " + employeeName);
        fetchEmployees();
        toastSuccess("Employee permanently deleted.");
      } else {
        if (res.status === 401) {
          setMessage("Session expired. Please sign in again.");
          setTimeout(() => {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.reload();
          }, 2000);
        } else {
          setMessage("Error: " + (data.message || "Unknown error"));
        }
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterDepartmentId("");
    setFilterJobTitleId("");
    setFilterEmployment("all");
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
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className={`aep-btn ${listMode === "active" ? "aep-btn--primary" : "aep-btn--ghost"}`}
              onClick={() => setListMode("active")}
              style={{ padding: "9px 14px" }}
            >
              Employee List
            </button>
            <button
              type="button"
              className={`aep-btn ${listMode === "inactive" ? "aep-btn--primary" : "aep-btn--ghost"}`}
              onClick={() => setListMode("inactive")}
              style={{ padding: "9px 14px" }}
            >
              Disabled List
            </button>
          </div>
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
                <label>Employment / Status</label>
                <select
                  value={filterEmployment}
                  onChange={(e) => setFilterEmployment(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="maternity_leave">Maternity Leave</option>
                  <option value="unpaid_leave">Unpaid Leave</option>
                  <option value="suspended">Suspended</option>
                  <option value="terminated">Terminated</option>
                  <option value="resigned">Resigned</option>
                </select>
              </div>
              <div className="aep-field">
                <label>Today's Attendance</label>
                <select
                  value={filterPresence}
                  onChange={(e) => setFilterPresence(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="checkedIn">On shift (checked in, not checked out)</option>
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

        <div className="aep-actions-row">
          <button
            type="button"
            className="aep-btn aep-btn--outline"
            onClick={() =>
              exportEmployeesToExcel(
                filteredEmployees,
                `employees-${new Date().toISOString().split("T")[0]}`
              )
            }
          >
            Export Excel
          </button>
          <button
            type="button"
            className="aep-btn aep-btn--outline"
            onClick={() =>
              exportEmployeesToPDF(
                filteredEmployees,
                `employees-${new Date().toISOString().split("T")[0]}`
              )
            }
          >
            Export PDF
          </button>
          <button type="button" className="aep-btn aep-btn--outline" onClick={downloadEmployeeTemplate}>
            Download Excel Template
          </button>
          <label className="aep-btn aep-btn--outline" style={{ cursor: "pointer" }}>
            Import from Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                  setLoading(true);
                  const imported = await importEmployeesFromExcel(file);
                  const token = localStorage.getItem("authToken");
                  if (!token) throw new Error("Authentication token missing");
                  const res = await fetch(`${apiBase}/api/admin/employees/bulk`, {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ employees: imported }),
                  });
                  const data = await res.json();
                  if (res.ok && data.status === "success") {
                    const { results } = data;
                    const successCount = results.success.length;
                    const failCount = results.failed.length;
                    if (failCount > 0) {
                      const failedDetails = results.failed
                        .slice(0, 5)
                        .map((f) => `- ${f.name} (${f.employeeCode}): ${f.reason}`)
                        .join("\n");
                      const moreFailed = failCount > 5 ? `\n... and ${failCount - 5} more errors` : "";
                      toastWarning(
                        `Import completed.\nSuccess: ${successCount}\nFailed: ${failCount}\n\n${failedDetails}${moreFailed}`
                      );
                    } else {
                      setMessage(`✅ Import success: ${successCount} employees`);
                      toastSuccess(`Import success: ${successCount} employees.`);
                    }
                    fetchEmployees();
                  } else {
                    throw new Error(data.message || "Failed to import employees");
                  }
                } catch (err) {
                  console.error("Import error:", err);
                  setMessage(`❌ Import error: ${err.message}`);
                  toastError(`Import error: ${err.message}`);
                } finally {
                  setLoading(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
        </div>

        <p className="aep-meta">
          Showing <strong>{filteredEmployees.length}</strong> / {employees.length} employees · On-shift employees are
          prioritized at the top
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
                ? "Add employees or import from Excel."
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
                      {emp.isActive !== false ? (
                        <button
                          type="button"
                          className="aep-btn aep-btn--ghost"
                          onClick={() => deactivateEmployee(emp.id)}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="aep-btn aep-btn--ghost"
                            onClick={() => restoreEmployee(emp.id)}
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            className="aep-btn"
                            style={{
                              background: "#7f1d1d",
                              color: "#fff",
                              border: "1px solid #450a0a",
                              fontWeight: 700,
                            }}
                            onClick={() => permanentlyDeleteEmployee(emp.id, emp.name)}
                          >
                            Delete Forever
                          </button>
                        </>
                      )}
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
              fetchEmployees();
              setSelectedEmployee(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
