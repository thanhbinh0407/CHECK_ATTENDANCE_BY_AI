import React, { useCallback, useEffect, useMemo, useState } from "react";
import { exportEmployeesToExcel, exportEmployeesToPDF, importEmployeesFromExcel, downloadEmployeeTemplate } from "../utils/exportUtils.js";
import EmployeeProfileModal from "./EmployeeProfileModal.jsx";
import { theme } from "../styles/theme.js";
import socket from "../socket.js";

const EMPLOYMENT_LABELS = {
  active: "Đang làm việc",
  maternity_leave: "Thai sản",
  unpaid_leave: "Nghỉ không lương",
  suspended: "Tạm ngưng",
  terminated: "Chấm dứt HĐ",
  resigned: "Đã nghỉ việc",
};

/** API trả về null/empty khi DB chưa gán phòng ban, chức danh hoặc ngày vào làm. */
const ORG_EMPTY = "Chưa cập nhật";

function orgText(value) {
  const s = value != null ? String(value).trim() : "";
  return s || ORG_EMPTY;
}

export default function AdminDashboard() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, withFace, withoutFace
  const [filterDepartmentId, setFilterDepartmentId] = useState("");
  const [filterEmployment, setFilterEmployment] = useState("all");
  const [sortBy, setSortBy] = useState("name"); // name | startDate | department
  const [startDateFrom, setStartDateFrom] = useState("");
  const [startDateTo, setStartDateTo] = useState("");
  const [savedFilters, setSavedFilters] = useState([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [presenceByUserId, setPresenceByUserId] = useState({});
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const fetchTodayPresence = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token?.trim()) return;
    try {
      const res = await fetch(`${apiBase}/api/admin/attendance/today-presence`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.status === "success" && data.presence) {
        setPresenceByUserId(data.presence);
      }
    } catch (e) {
      console.error("Today presence:", e);
    }
  }, [apiBase]);

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

  useEffect(() => {
    fetchEmployees();
    // Load saved filters from localStorage
    const saved = localStorage.getItem("adminDashboardFilters");
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading saved filters:", e);
      }
    }
  }, []);

  useEffect(() => {
    socket.emit("join-room", { room: "admin" });
    const onAttendance = () => {
      fetchTodayPresence();
    };
    socket.on("attendance-update", onAttendance);
    const poll = setInterval(() => fetchTodayPresence(), 120000);
    return () => {
      socket.off("attendance-update", onAttendance);
      clearInterval(poll);
    };
  }, [fetchTodayPresence]);

  const departmentOptions = useMemo(() => {
    const map = new Map();
    employees.forEach((e) => {
      const id = e.departmentId;
      const name = e.Department?.name;
      if (id != null && name) map.set(id, name);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "vi"));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let filtered = [...employees];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((emp) => {
        const dept = emp.Department?.name?.toLowerCase() || "";
        const job = emp.JobTitle?.name?.toLowerCase() || "";
        const phone = String(emp.phoneNumber || "").toLowerCase();
        return (
          emp.name?.toLowerCase().includes(query) ||
          emp.email?.toLowerCase().includes(query) ||
          emp.employeeCode?.toLowerCase().includes(query) ||
          dept.includes(query) ||
          job.includes(query) ||
          phone.includes(query)
        );
      });
    }

    if (filterDepartmentId) {
      const idNum = Number(filterDepartmentId);
      filtered = filtered.filter((emp) => Number(emp.departmentId) === idNum);
    }

    if (filterEmployment !== "all") {
      filtered = filtered.filter((emp) => (emp.employmentStatus || "active") === filterEmployment);
    }

    if (filterStatus === "withFace") {
      filtered = filtered.filter((emp) => emp.FaceProfiles && emp.FaceProfiles.length > 0);
    } else if (filterStatus === "withoutFace") {
      filtered = filtered.filter((emp) => !emp.FaceProfiles || emp.FaceProfiles.length === 0);
    }

    if (startDateFrom || startDateTo) {
      const from = startDateFrom ? toLocalDateOnly(startDateFrom) : null;
      const to = startDateTo ? toLocalDateOnly(startDateTo) : null;
      filtered = filtered.filter((emp) => {
        const employeeStartDate = toLocalDateOnly(emp.startDate);
        if (!employeeStartDate) return false;
        if (from && employeeStartDate < from) return false;
        if (to && employeeStartDate > to) return false;
        return true;
      });
    }

    const sorted = [...filtered];
    if (sortBy === "name") {
      sorted.sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi", { sensitivity: "base" }));
    } else if (sortBy === "department") {
      sorted.sort((a, b) =>
        (a.Department?.name || "").localeCompare(b.Department?.name || "", "vi", { sensitivity: "base" })
      );
    } else if (sortBy === "startDate") {
      sorted.sort((a, b) => {
        const ta = toLocalDateOnly(a.startDate)?.getTime() ?? 0;
        const tb = toLocalDateOnly(b.startDate)?.getTime() ?? 0;
        return tb - ta;
      });
    }

    return sorted;
  }, [
    employees,
    searchQuery,
    filterDepartmentId,
    filterEmployment,
    filterStatus,
    startDateFrom,
    startDateTo,
    sortBy,
  ]);

  const advancedFilterCount = useMemo(() => {
    let n = 0;
    if (filterDepartmentId) n++;
    if (filterEmployment !== "all") n++;
    if (filterStatus !== "all") n++;
    if (startDateFrom || startDateTo) n++;
    if (sortBy !== "name") n++;
    return n;
  }, [filterDepartmentId, filterEmployment, filterStatus, startDateFrom, startDateTo, sortBy]);

  const resetAllFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterDepartmentId("");
    setFilterEmployment("all");
    setSortBy("name");
    setStartDateFrom("");
    setStartDateTo("");
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      if (!token || !token.trim()) {
        setMessage("Lỗi: Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
        // Redirect to login after 2 seconds
        setTimeout(() => {
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          window.location.reload();
        }, 2000);
        return;
      }

      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok) {
        const empList = data.employees || [];
        setEmployees(empList);
        setMessage(""); // Clear any previous error messages
        fetchTodayPresence();
      } else {
        if (res.status === 401) {
          setMessage("Authentication error: Invalid or expired token. Please log in again.");
          // Clear invalid token and reload
          setTimeout(() => {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.reload();
          }, 2000);
        } else {
          setMessage("Lỗi tải danh sách nhân viên: " + (data.message || "Unknown error"));
        }
      }
    } catch (error) {
      setMessage("Error: " + error.message);
      console.error("Fetch employees error:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteEmployee = async (employeeId) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;

    try {
      const token = localStorage.getItem("authToken");

      if (!token || !token.trim()) {
        setMessage("Lỗi: Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
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
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Xóa nhân viên thành công: " + data.deletedEmployee?.name);
        // Remove from UI immediately
        setEmployees(prev => prev.filter(e => e.id !== employeeId));
      } else {
        if (res.status === 401) {
          setMessage("Authentication error: Invalid or expired token. Please log in again.");
          setTimeout(() => {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.reload();
          }, 2000);
        } else {
          setMessage("Error deleting employee: " + (data.message || "Unknown error"));
          console.error("Delete error:", data);
        }
      }
    } catch (error) {
      setMessage("Error: " + error.message);
      console.error("Delete exception:", error);
    }
  };

  const containerStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: `${theme.spacing.lg} ${theme.spacing.md} ${theme.spacing["2xl"]}`,
    fontFamily: theme.typography.fontFamily,
    background: `linear-gradient(180deg, ${theme.neutral.gray100} 0%, ${theme.neutral.gray50} 35%, ${theme.neutral.gray100} 100%)`,
    minHeight: "100%",
    boxSizing: "border-box",
  };

  const shellStyle = {
    backgroundColor: theme.neutral.white,
    borderRadius: theme.radius["2xl"] || theme.radius.xl,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.06), 0 24px 48px -12px rgba(15,23,42,0.12)",
    border: `1px solid ${theme.neutral.gray200}`,
    overflow: "hidden",
  };

  const contentCardStyle = {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  };

  const fieldLabel = {
    display: "block",
    fontSize: "11px",
    fontWeight: "600",
    color: theme.neutral.gray400,
    marginBottom: "4px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    border: `1px solid ${theme.neutral.gray300}`,
    borderRadius: theme.radius.lg,
    fontSize: theme.typography.small.fontSize,
    backgroundColor: theme.neutral.white,
    color: theme.neutral.gray800,
    outline: "none",
    transition: theme.transitions.normal,
  };

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
    minHeight: "40px",
  };

  return (
    <div style={containerStyle}>
      <div style={shellStyle}>
      <div
        style={{
          background: "linear-gradient(125deg, #0f172a 0%, #1e293b 42%, #334155 100%)",
          color: theme.neutral.white,
          padding: `${theme.spacing.xl} ${theme.spacing.xl} ${theme.spacing.lg}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "-10%",
            top: "-40%",
            width: "55%",
            height: "180%",
            background: "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ margin: "0 0 6px 0", fontSize: "11px", fontWeight: "600", letterSpacing: "0.12em", opacity: 0.65, textTransform: "uppercase" }}>
            Quản lý nguồn nhân lực
          </p>
          <h1 style={{ margin: "0 0 10px 0", fontSize: "1.75rem", fontWeight: "800", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
            Hồ sơ nhân viên
          </h1>
          <p style={{ margin: 0, fontSize: theme.typography.small.fontSize, opacity: 0.82, maxWidth: "34rem", lineHeight: 1.55 }}>
            Tìm kiếm, lọc và xuất danh sách. Trạng thái điểm danh trong ngày được cập nhật tự động.
          </p>
        </div>
      </div>

      <div style={contentCardStyle}>
          {message && (
          <div style={{
            padding: "16px 20px",
            backgroundColor: message.includes("successfully") || message.includes("thành công") ? "#d4edda" : "#f8d7da",
            border: `2px solid ${message.includes("successfully") || message.includes("thành công") ? "#c3e6cb" : "#f5c6cb"}`,
            borderRadius: "12px",
            color: message.includes("successfully") || message.includes("thành công") ? "#155724" : "#721c24",
            marginBottom: "24px",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            {(message.includes("successfully") || message.includes("thành công")) ? "✅" : "❌"} {message}
          </div>
        )}

        <div
          style={{
            backgroundColor: theme.neutral.gray50,
            borderRadius: theme.radius.xl,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.xl,
            border: `1px solid ${theme.neutral.gray200}`,
            boxShadow: theme.shadows.xs,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: theme.spacing.sm,
              marginBottom: theme.spacing.sm,
            }}
          >
            <span style={{ fontSize: theme.typography.small.fontSize, fontWeight: "600", color: theme.neutral.gray700 }}>
              Tìm kiếm
            </span>
            {searchQuery.trim() && (
              <span
                style={{
                  fontSize: theme.typography.tiny.fontSize,
                  fontWeight: "600",
                  color: theme.info.text,
                  backgroundColor: theme.info.bg,
                  padding: "4px 10px",
                  borderRadius: theme.radius.full,
                  border: `1px solid ${theme.info.border}`,
                }}
              >
                Đang tìm
              </span>
            )}
          </div>

          <div style={{ marginBottom: theme.spacing.md }}>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, mã NV, email, SĐT, phòng ban, chức danh…"
              style={{
                ...inputStyle,
                paddingLeft: theme.spacing.lg,
                borderRadius: theme.radius.full,
                backgroundColor: theme.neutral.white,
                border: `1px solid ${theme.neutral.gray200}`,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.primary.main;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.primary.subtle}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = theme.neutral.gray300;
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: theme.spacing.sm,
              marginBottom: filtersExpanded ? theme.spacing.md : 0,
            }}
          >
            <button
              type="button"
              onClick={() => setFiltersExpanded((v) => !v)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: theme.spacing.sm,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: theme.neutral.white,
                color: theme.neutral.gray800,
                border: `1px solid ${theme.neutral.gray300}`,
                borderRadius: theme.radius.lg,
                cursor: "pointer",
                fontWeight: "600",
                fontSize: theme.typography.small.fontSize,
                transition: theme.transitions.normal,
              }}
            >
              <span>{filtersExpanded ? "▲" : "▼"}</span>
              Bộ lọc nâng cao
              {advancedFilterCount > 0 && (
                <span
                  style={{
                    fontSize: theme.typography.tiny.fontSize,
                    fontWeight: "700",
                    backgroundColor: theme.primary.subtle,
                    color: theme.primary.main,
                    padding: "2px 8px",
                    borderRadius: theme.radius.full,
                  }}
                >
                  {advancedFilterCount}
                </span>
              )}
            </button>
            {!filtersExpanded && advancedFilterCount > 0 && (
              <span style={{ fontSize: theme.typography.tiny.fontSize, color: theme.neutral.gray500 }}>
                Đang áp dụng {advancedFilterCount} bộ lọc — mở để chỉnh
              </span>
            )}
          </div>

          {filtersExpanded && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: theme.spacing.md,
                  marginBottom: theme.spacing.md,
                  paddingTop: theme.spacing.md,
                  borderTop: `1px solid ${theme.neutral.gray200}`,
                }}
              >
                <div>
                  <label style={fieldLabel}>Phòng ban</label>
                  <select
                    value={filterDepartmentId}
                    onChange={(e) => setFilterDepartmentId(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">Tất cả phòng ban</option>
                    {departmentOptions.map(([id, name]) => (
                      <option key={id} value={String(id)}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={fieldLabel}>Trạng thái làm việc</label>
                  <select
                    value={filterEmployment}
                    onChange={(e) => setFilterEmployment(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="all">Tất cả</option>
                    {Object.entries(EMPLOYMENT_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={fieldLabel}>Đăng ký khuôn mặt</label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
                    <option value="all">Tất cả ({employees.length})</option>
                    <option value="withFace">
                      Đã đăng ký ({employees.filter((e) => e.FaceProfiles && e.FaceProfiles.length > 0).length})
                    </option>
                    <option value="withoutFace">
                      Chưa đăng ký ({employees.filter((e) => !e.FaceProfiles || e.FaceProfiles.length === 0).length})
                    </option>
                  </select>
                </div>
                <div>
                  <label style={fieldLabel}>Sắp xếp</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selectStyle}>
                    <option value="name">Tên (A–Z)</option>
                    <option value="department">Phòng ban</option>
                    <option value="startDate">Ngày vào làm (mới nhất)</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                  gap: theme.spacing.md,
                  paddingTop: theme.spacing.md,
                  borderTop: `1px solid ${theme.neutral.gray200}`,
                }}
              >
                <div style={{ flex: "1 1 140px", minWidth: "140px" }}>
                  <label style={fieldLabel}>Ngày vào làm từ</label>
                  <input type="date" value={startDateFrom} onChange={(e) => setStartDateFrom(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: "1 1 140px", minWidth: "140px" }}>
                  <label style={fieldLabel}>Đến</label>
                  <input type="date" value={startDateTo} onChange={(e) => setStartDateTo(e.target.value)} style={inputStyle} />
                </div>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                    backgroundColor: theme.neutral.white,
                    color: theme.neutral.gray700,
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.lg,
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: theme.typography.small.fontSize,
                    transition: theme.transitions.normal,
                    marginBottom: "1px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.neutral.gray100;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.neutral.white;
                  }}
                >
                  Xóa bộ lọc
                </button>
              </div>
            </>
          )}

          <div
            style={{
              marginTop: theme.spacing.lg,
              paddingTop: theme.spacing.lg,
              borderTop: `1px solid ${theme.neutral.gray200}`,
              display: "flex",
              gap: theme.spacing.sm,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() =>
                exportEmployeesToExcel(filteredEmployees, `employees-${new Date().toISOString().split("T")[0]}`, {
                  presenceByUserId,
                })
              }
              style={{
                padding: "10px 16px",
                backgroundColor: theme.neutral.white,
                color: theme.success.dark,
                border: `1px solid ${theme.success.border}`,
                borderRadius: theme.radius.lg,
                cursor: "pointer",
                fontWeight: "600",
                fontSize: theme.typography.small.fontSize,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: theme.transitions.normal,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.success.bg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.neutral.white;
              }}
            >
              Xuất Excel
            </button>
            <button
              type="button"
              onClick={() =>
                exportEmployeesToPDF(filteredEmployees, `employees-${new Date().toISOString().split("T")[0]}`, {
                  presenceByUserId,
                })
              }
              style={{
                padding: "10px 16px",
                backgroundColor: theme.neutral.white,
                color: theme.error.dark,
                border: `1px solid ${theme.error.border}`,
                borderRadius: theme.radius.lg,
                cursor: "pointer",
                fontWeight: "600",
                fontSize: theme.typography.small.fontSize,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: theme.transitions.normal,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.error.bg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.neutral.white;
              }}
            >
              Xuất PDF
            </button>
            <button
              type="button"
              onClick={downloadEmployeeTemplate}
              style={{
                padding: "10px 16px",
                backgroundColor: theme.neutral.white,
                color: theme.info.dark,
                border: `1px solid ${theme.info.border}`,
                borderRadius: theme.radius.lg,
                cursor: "pointer",
                fontWeight: "600",
                fontSize: theme.typography.small.fontSize,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: theme.transitions.normal,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.info.bg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.neutral.white;
              }}
            >
              Mẫu Excel
            </button>
            <label
              style={{
                padding: "10px 16px",
                backgroundColor: theme.neutral.white,
                color: theme.warning.text,
                border: `1px solid ${theme.warning.border}`,
                borderRadius: theme.radius.lg,
                cursor: "pointer",
                fontWeight: "600",
                fontSize: theme.typography.small.fontSize,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: theme.transitions.normal,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.warning.bg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.neutral.white;
              }}
            >
              Import Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  try {
                    setLoading(true);
                    const employees = await importEmployeesFromExcel(file);
                    const token = localStorage.getItem("authToken");
                    
                    if (!token) {
                      throw new Error("Không có token xác thực");
                    }

                    // Use bulk endpoint
                        const res = await fetch(`${apiBase}/api/admin/employees/bulk`, {
                          method: "POST",
                          headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                          },
                      body: JSON.stringify({ employees })
                    });

                    const data = await res.json();
                    
                    if (res.ok && data.status === "success") {
                      const { results } = data;
                      const successCount = results.success.length;
                      const failCount = results.failed.length;
                      
                      if (failCount > 0) {
                        const failedDetails = results.failed.slice(0, 5).map(f => 
                          `- ${f.name} (${f.employeeCode}): ${f.reason}`
                        ).join('\n');
                        const moreFailed = failCount > 5 ? `\n... và ${failCount - 5} lỗi khác` : '';
                        alert(`Import hoàn tất!\n\n✅ Thành công: ${successCount} nhân viên\n❌ Thất bại: ${failCount} nhân viên\n\nChi tiết lỗi:\n${failedDetails}${moreFailed}`);
                      } else {
                        setMessage(`✅ Import thành công: ${successCount} nhân viên`);
                      }
                      
                      fetchEmployees();
                    } else {
                      throw new Error(data.message || "Lỗi khi import nhân viên");
                    }
                    
                    e.target.value = "";
                  } catch (error) {
                    console.error("Import error:", error);
                    setMessage(`❌ Lỗi import: ${error.message}`);
                    alert(`Lỗi khi import: ${error.message}`);
                  } finally {
                    setLoading(false);
                    e.target.value = "";
                  }
                }}
                style={{ display: "none" }}
              />
            </label>
          </div>

          <div
            style={{
              marginTop: theme.spacing.md,
              fontSize: theme.typography.small.fontSize,
              color: theme.neutral.gray500,
            }}
          >
            Hiển thị <strong style={{ color: theme.neutral.gray800 }}>{filteredEmployees.length}</strong> / {employees.length}{" "}
            nhân viên
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: theme.spacing["2xl"], color: theme.neutral.gray500 }}>
            <div style={{ fontSize: "2rem", marginBottom: theme.spacing.md }}>⏳</div>
            <div style={{ fontSize: theme.typography.small.fontSize, fontWeight: "600" }}>Đang tải danh sách…</div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`,
              backgroundColor: theme.neutral.gray50,
              borderRadius: theme.radius.xl,
              border: `2px dashed ${theme.neutral.gray300}`,
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: theme.spacing.md }}>📭</div>
            <h3 style={{ fontSize: theme.typography.h5.fontSize, fontWeight: "600", color: theme.neutral.gray800, margin: `0 0 ${theme.spacing.sm} 0` }}>
              {employees.length === 0 ? "Chưa có nhân viên" : "Không có kết quả"}
            </h3>
            <p style={{ fontSize: theme.typography.small.fontSize, color: theme.neutral.gray500, margin: 0, maxWidth: "28rem", marginLeft: "auto", marginRight: "auto" }}>
              {employees.length === 0
                ? "Danh sách trống. Thêm nhân viên từ mục quản lý tài khoản hoặc import Excel."
                : "Không có nhân viên khớp bộ lọc. Thử đổi từ khóa hoặc xóa bộ lọc."}
            </p>
            {employees.length > 0 && (
              <button
                type="button"
                onClick={resetAllFilters}
                style={{
                  marginTop: theme.spacing.lg,
                  padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                  backgroundColor: theme.primary.main,
                  color: theme.neutral.white,
                  border: "none",
                  borderRadius: theme.radius.lg,
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: theme.typography.small.fontSize,
                  transition: theme.transitions.normal,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.primary.dark;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.primary.main;
                }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: theme.spacing.lg,
            }}
          >
            {filteredEmployees.map((emp) => {
              const hasFace = emp.FaceProfiles && emp.FaceProfiles.length > 0;
              const statusStyle = hasFace
                ? { bg: theme.success.bg, color: theme.success.text, text: "Đã đăng ký" }
                : { bg: theme.warning.bg, color: theme.warning.text, text: "Chưa đăng ký" };
              const es = emp.employmentStatus || "active";
              const workColor =
                es === "active"
                  ? theme.success.dark
                  : es === "maternity_leave" || es === "unpaid_leave"
                    ? theme.warning.dark
                    : es === "suspended"
                      ? "#ea580c"
                      : theme.error.dark;
              const workLabel = EMPLOYMENT_LABELS[es] || es;
              const pres = presenceByUserId[String(emp.id)];
              let presLabel = "Chưa điểm danh";
              let presColor = theme.neutral.gray500;
              let presTime = "";
              if (pres?.lastType === "IN") {
                presLabel = "Đang làm việc";
                presColor = theme.success.dark;
                presTime = pres.lastAt
                  ? new Date(pres.lastAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                  : "";
              } else if (pres?.lastType === "OUT") {
                presLabel = "Đã check-out";
                presColor = theme.neutral.gray600;
                presTime = pres.lastAt
                  ? new Date(pres.lastAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                  : "";
              }
              const accent =
                pres?.lastType === "IN"
                  ? theme.success.main
                  : pres?.lastType === "OUT"
                    ? theme.neutral.gray300
                    : theme.neutral.gray100;

              return (
                <div
                  key={emp.id}
                  style={{
                    backgroundColor: theme.neutral.white,
                    borderRadius: "16px",
                    padding: 0,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(15,23,42,0.06)",
                    border: `1px solid ${theme.neutral.gray200}`,
                    borderLeft: `4px solid ${accent}`,
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(15,23,42,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(15,23,42,0.06)";
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: theme.spacing.md,
                      right: theme.spacing.md,
                      padding: "5px 10px",
                      borderRadius: theme.radius.full,
                      fontSize: "10px",
                      fontWeight: "700",
                      letterSpacing: "0.03em",
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.color,
                      border: `1px solid ${statusStyle.color}40`,
                      zIndex: 1,
                    }}
                  >
                    {statusStyle.text}
                  </div>

                  <div
                    style={{ padding: `${theme.spacing.lg} ${theme.spacing.md} ${theme.spacing.md}` }}
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <div style={{ marginBottom: theme.spacing.md, display: "flex", alignItems: "flex-start", gap: theme.spacing.md }}>
                      <div
                        style={{
                          width: "52px",
                          height: "52px",
                          borderRadius: "14px",
                          background: "linear-gradient(145deg, #334155 0%, #0f172a 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.2rem",
                          fontWeight: "800",
                          color: theme.neutral.white,
                          flexShrink: 0,
                          boxShadow: "0 4px 14px rgba(15,23,42,0.25), 0 0 0 3px rgba(255,255,255,0.95)",
                        }}
                      >
                        {emp.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: "76px" }}>
                        <h3
                          style={{
                            margin: "0 0 4px 0",
                            fontSize: "1.05rem",
                            fontWeight: "800",
                            color: theme.neutral.gray900,
                            lineHeight: 1.3,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {emp.name || "—"}
                        </h3>
                        <div
                          style={{
                            fontSize: "12px",
                            color: theme.neutral.gray500,
                            fontWeight: "500",
                            lineHeight: 1.4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span style={{ color: theme.neutral.gray700, fontWeight: "600" }}>{emp.employeeCode || "—"}</span>
                          <span style={{ margin: "0 6px", color: theme.neutral.gray300 }}>|</span>
                          <span>{emp.email || "—"}</span>
                        </div>
                        <div style={{ marginTop: "10px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "5px 12px",
                              borderRadius: theme.radius.full,
                              fontSize: "12px",
                              fontWeight: "700",
                              letterSpacing: "0.01em",
                              backgroundColor:
                                pres?.lastType === "IN"
                                  ? theme.success.bg
                                  : pres?.lastType === "OUT"
                                    ? theme.neutral.gray100
                                    : theme.neutral.gray50,
                              color: presColor,
                              border: `1px solid ${
                                pres?.lastType === "IN"
                                  ? theme.success.border
                                  : pres?.lastType === "OUT"
                                    ? theme.neutral.gray200
                                    : theme.neutral.gray200
                              }`,
                            }}
                          >
                            {pres?.lastType === "IN" && (
                              <span
                                style={{
                                  width: "7px",
                                  height: "7px",
                                  borderRadius: "50%",
                                  backgroundColor: theme.success.main,
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            {presLabel}
                            {presTime ? (
                              <span style={{ fontWeight: "600", opacity: 0.85 }}>· {presTime}</span>
                            ) : null}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        background: `linear-gradient(180deg, ${theme.neutral.gray50} 0%, ${theme.neutral.white} 100%)`,
                        borderRadius: "12px",
                        padding: theme.spacing.md,
                        marginBottom: theme.spacing.md,
                        border: `1px solid ${theme.neutral.gray200}`,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: `${theme.spacing.md} ${theme.spacing.sm}`,
                      }}
                    >
                      <div>
                        <div style={{ ...fieldLabel, marginBottom: "4px" }}>Phòng ban</div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: emp.Department?.name ? theme.neutral.gray800 : theme.neutral.gray400,
                            fontWeight: "600",
                            lineHeight: 1.35,
                            fontStyle: emp.Department?.name ? "normal" : "italic",
                          }}
                        >
                          {orgText(emp.Department?.name)}
                        </div>
                      </div>
                      <div>
                        <div style={{ ...fieldLabel, marginBottom: "4px" }}>Chức danh</div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: emp.JobTitle?.name ? theme.neutral.gray800 : theme.neutral.gray400,
                            fontWeight: "600",
                            lineHeight: 1.35,
                            fontStyle: emp.JobTitle?.name ? "normal" : "italic",
                          }}
                        >
                          {orgText(emp.JobTitle?.name)}
                        </div>
                      </div>
                      <div>
                        <div style={{ ...fieldLabel, marginBottom: "4px" }}>Hợp đồng</div>
                        <div style={{ fontSize: "13px", color: workColor, fontWeight: "700" }}>{workLabel}</div>
                      </div>
                      <div>
                        <div style={{ ...fieldLabel, marginBottom: "4px" }}>Vào làm</div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: emp.startDate ? theme.neutral.gray700 : theme.neutral.gray400,
                            fontWeight: "600",
                            fontStyle: emp.startDate ? "normal" : "italic",
                          }}
                        >
                          {emp.startDate ? new Date(emp.startDate).toLocaleDateString("vi-VN") : ORG_EMPTY}
                        </div>
                      </div>
                    </div>
                    {!emp.Department?.name || !emp.JobTitle?.name || !emp.startDate ? (
                      <p
                        style={{
                          margin: `0 0 ${theme.spacing.md} 0`,
                          fontSize: "11px",
                          lineHeight: 1.45,
                          color: theme.neutral.gray400,
                          padding: `0 ${theme.spacing.xs}`,
                        }}
                      >
                        Các mục trên lấy từ hồ sơ nhân sự. Nếu trống, mở <strong style={{ color: theme.neutral.gray600 }}>Chi tiết</strong> để
                        chọn phòng ban, chức danh và ngày vào làm.
                      </p>
                    ) : null}

                    <div style={{ display: "flex", gap: theme.spacing.sm }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(emp);
                        }}
                        style={{
                          flex: 1,
                          padding: "11px 14px",
                          backgroundColor: theme.primary.main,
                          color: theme.neutral.white,
                          border: "none",
                          borderRadius: "10px",
                          cursor: "pointer",
                          fontWeight: "700",
                          fontSize: "12px",
                          letterSpacing: "0.02em",
                          transition: theme.transitions.normal,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = theme.primary.dark;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = theme.primary.main;
                        }}
                      >
                        Chi tiết
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEmployee(emp.id);
                        }}
                        style={{
                          flex: 1,
                          padding: "11px 14px",
                          backgroundColor: theme.neutral.white,
                          color: theme.neutral.gray600,
                          border: `1px solid ${theme.neutral.gray300}`,
                          borderRadius: "10px",
                          cursor: "pointer",
                          fontWeight: "700",
                          fontSize: "12px",
                          transition: theme.transitions.normal,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = theme.neutral.gray100;
                          e.currentTarget.style.borderColor = theme.neutral.gray400;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = theme.neutral.white;
                          e.currentTarget.style.borderColor = theme.neutral.gray300;
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

        {/* Employee Profile Modal */}
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
    </div>
  );
}
