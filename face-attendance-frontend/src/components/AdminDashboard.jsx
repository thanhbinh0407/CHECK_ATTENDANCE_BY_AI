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
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function contractLabelVi(status) {
  switch (status) {
    case "active":
      return "Đang làm việc";
    case "maternity_leave":
      return "Nghỉ thai sản";
    case "unpaid_leave":
      return "Nghỉ không lương";
    case "suspended":
      return "Tạm ngưng";
    case "terminated":
      return "Đã chấm dứt";
    case "resigned":
      return "Đã nghỉ việc";
    default:
      return status ? String(status) : "Đang làm việc";
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
        setMessage("Lỗi: Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
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
          setMessage("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
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
      setMessage("Lỗi: " + error.message);
      console.error("Fetch employees error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const deactivateEmployee = async (employeeId) => {
    if (!window.confirm("Bạn có chắc muốn vô hiệu hóa (Deactivate) nhân viên này?")) return;

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
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Đã vô hiệu hóa nhân viên: " + (data.user?.name || data.deletedEmployee?.name || ""));
        fetchEmployees();
      } else {
        if (res.status === 401) {
          setMessage("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
          setTimeout(() => {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.reload();
          }, 2000);
        } else {
          setMessage("Lỗi: " + (data.message || "Unknown error"));
          console.error("Delete error:", data);
        }
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
      console.error("Delete exception:", error);
    }
  };

  const restoreEmployee = async (employeeId) => {
    if (!window.confirm("Khôi phục (Activate) nhân viên này?")) return;
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
        setMessage("Đã khôi phục nhân viên: " + (data.user?.name || ""));
        fetchEmployees();
      } else {
        if (res.status === 401) {
          setMessage("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
          setTimeout(() => {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.reload();
          }, 2000);
        } else {
          setMessage("Lỗi: " + (data.message || "Unknown error"));
        }
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    }
  };

  const permanentlyDeleteEmployee = async (employeeId, employeeName) => {
    if (!window.confirm(`Xóa vĩnh viễn "${employeeName}"?\n\nThao tác không thể hoàn tác.`)) return;
    const password = window.prompt("Nhập mật khẩu Manager để xác nhận xóa vĩnh viễn:");
    if (!password) return;
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
        setMessage("✅ Đã xóa vĩnh viễn: " + employeeName);
        fetchEmployees();
      } else {
        if (res.status === 401) {
          setMessage("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
          setTimeout(() => {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.reload();
          }, 2000);
        } else {
          setMessage("Lỗi: " + (data.message || "Unknown error"));
        }
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
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
      message.includes("thành công") ||
      message.startsWith("✅"));

  return (
    <div className="aep-page">
      <div className="aep-hero">
        <h1>👥 Hồ sơ nhân viên</h1>
        <p>
          Xem và quản lý thông tin nhân viên. Tìm nhanh bằng ô tìm kiếm; mở bộ lọc nâng cao khi cần lọc theo tổ chức,
          hợp đồng hoặc điểm danh hôm nay.
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
              Danh sách nhân viên
            </button>
            <button
              type="button"
              className={`aep-btn ${listMode === "inactive" ? "aep-btn--primary" : "aep-btn--ghost"}`}
              onClick={() => setListMode("inactive")}
              style={{ padding: "9px 14px" }}
            >
              Danh sách vô hiệu hóa
            </button>
          </div>
          <input
            type="text"
            className="aep-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, email, mã nhân viên…"
            aria-label="Tìm kiếm nhân viên"
          />
          <button
            type="button"
            className="aep-btn aep-btn--ghost"
            onClick={() => setShowAdvancedFilters((v) => !v)}
          >
            Bộ lọc nâng cao
            {activeAdvancedCount > 0 ? ` (${activeAdvancedCount})` : ""}
            {showAdvancedFilters ? " ▲" : " ▼"}
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="aep-advanced">
            <div className="aep-advanced-grid">
              <div className="aep-field">
                <label>Đăng ký khuôn mặt</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">Tất cả ({employees.length})</option>
                  <option value="withFace">
                    Đã đăng ký (
                    {employees.filter((e) => e.FaceProfiles && e.FaceProfiles.length > 0).length})
                  </option>
                  <option value="withoutFace">
                    Chưa đăng ký (
                    {employees.filter((e) => !e.FaceProfiles || e.FaceProfiles.length === 0).length})
                  </option>
                </select>
              </div>
              <div className="aep-field">
                <label>Phòng ban</label>
                <select
                  value={filterDepartmentId}
                  onChange={(e) => setFilterDepartmentId(e.target.value)}
                >
                  <option value="">Tất cả phòng ban</option>
                  {departmentOptions.map(([id, name]) => (
                    <option key={id} value={String(id)}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="aep-field">
                <label>Chức danh</label>
                <select value={filterJobTitleId} onChange={(e) => setFilterJobTitleId(e.target.value)}>
                  <option value="">Tất cả chức danh</option>
                  {jobTitleOptions.map(([id, name]) => (
                    <option key={id} value={String(id)}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="aep-field">
                <label>Hợp đồng / trạng thái</label>
                <select
                  value={filterEmployment}
                  onChange={(e) => setFilterEmployment(e.target.value)}
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Đang làm việc</option>
                  <option value="maternity_leave">Nghỉ thai sản</option>
                  <option value="unpaid_leave">Nghỉ không lương</option>
                  <option value="suspended">Tạm ngưng</option>
                  <option value="terminated">Đã chấm dứt</option>
                  <option value="resigned">Đã nghỉ việc</option>
                </select>
              </div>
              <div className="aep-field">
                <label>Điểm danh hôm nay</label>
                <select
                  value={filterPresence}
                  onChange={(e) => setFilterPresence(e.target.value)}
                >
                  <option value="all">Tất cả</option>
                  <option value="checkedIn">Đang trong ca (đã vào, chưa ra)</option>
                  <option value="checkedOut">Đã check-out hôm nay</option>
                  <option value="absent">Chưa điểm danh hôm nay</option>
                </select>
              </div>
              <div className="aep-field">
                <label>Ngày vào làm (từ)</label>
                <input
                  type="date"
                  value={startDateFrom}
                  onChange={(e) => setStartDateFrom(e.target.value)}
                />
              </div>
              <div className="aep-field">
                <label>Ngày vào làm (đến)</label>
                <input
                  type="date"
                  value={startDateTo}
                  onChange={(e) => setStartDateTo(e.target.value)}
                />
              </div>
            </div>
            <button type="button" className="aep-btn aep-btn--ghost aep-btn--sm" onClick={resetFilters}>
              Xóa bộ lọc
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
            Xuất Excel
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
            Xuất PDF
          </button>
          <button type="button" className="aep-btn aep-btn--outline" onClick={downloadEmployeeTemplate}>
            Tải mẫu Excel
          </button>
          <label className="aep-btn aep-btn--outline" style={{ cursor: "pointer" }}>
            Nhập từ Excel
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
                  if (!token) throw new Error("Không có token xác thực");
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
                      const moreFailed = failCount > 5 ? `\n... và ${failCount - 5} lỗi khác` : "";
                      alert(
                        `Import hoàn tất!\n\n✅ Thành công: ${successCount}\n❌ Thất bại: ${failCount}\n\n${failedDetails}${moreFailed}`
                      );
                    } else {
                      setMessage(`✅ Import thành công: ${successCount} nhân viên`);
                    }
                    fetchEmployees();
                  } else {
                    throw new Error(data.message || "Lỗi khi import nhân viên");
                  }
                } catch (err) {
                  console.error("Import error:", err);
                  setMessage(`❌ Lỗi import: ${err.message}`);
                  alert(`Lỗi khi import: ${err.message}`);
                } finally {
                  setLoading(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
        </div>

        <p className="aep-meta">
          Hiển thị <strong>{filteredEmployees.length}</strong> / {employees.length} nhân viên · Đang trong ca được ưu
          tiên đầu danh sách
        </p>

        {loading ? (
          <div className="aep-loading">
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <div>Đang tải danh sách…</div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="aep-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <h3 style={{ margin: "0 0 8px", color: "#262626" }}>
              {employees.length === 0 ? "Chưa có nhân viên" : "Không khớp bộ lọc"}
            </h3>
            <p style={{ margin: 0, fontSize: 14 }}>
              {employees.length === 0
                ? "Thêm nhân viên hoặc nhập từ Excel."
                : "Thử điều chỉnh tìm kiếm hoặc bộ lọc nâng cao."}
            </p>
            {employees.length > 0 && (
              <button
                type="button"
                className="aep-btn aep-btn--primary"
                style={{ marginTop: 16 }}
                onClick={resetFilters}
              >
                Xóa bộ lọc
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
              const contractVi = contractLabelVi(empStatus);
              const isActiveContract = empStatus === "active";

              let presenceClass = "aep-presence--none";
              let presenceText = "Chưa điểm danh hôm nay";
              if (presence) {
                if (presence.checkedIn) {
                  presenceClass = "aep-presence--in";
                  presenceText = `Hoạt động · vào ${formatHm(presence.lastInAt || presence.lastAt)}`;
                } else {
                  presenceClass = "aep-presence--out";
                  presenceText = `Đã check-out · ${formatHm(presence.lastAt)}`;
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
                        {hasFace ? "Đã đăng ký" : "Chưa đăng ký"}
                      </div>
                    </div>

                    <div className="aep-info-panel">
                      <div className="aep-info-grid">
                        <div>
                          <div className="aep-info-label">Phòng ban</div>
                          <div className={deptName ? "aep-info-value" : "aep-info-value aep-info-value--muted"}>
                            {deptName || "Chưa cập nhật"}
                          </div>
                        </div>
                        <div>
                          <div className="aep-info-label">Chức danh</div>
                          <div className={jobName ? "aep-info-value" : "aep-info-value aep-info-value--muted"}>
                            {jobName || "Chưa cập nhật"}
                          </div>
                        </div>
                        <div>
                          <div className="aep-info-label">Hợp đồng</div>
                          <div
                            className={
                              isActiveContract ? "aep-info-value aep-info-value--ok" : "aep-info-value"
                            }
                          >
                            {contractVi}
                          </div>
                        </div>
                        <div>
                          <div className="aep-info-label">Vào làm</div>
                          <div
                            className={
                              emp.startDate ? "aep-info-value" : "aep-info-value aep-info-value--muted"
                            }
                          >
                            {emp.startDate
                              ? new Date(emp.startDate).toLocaleDateString("vi-VN")
                              : "Chưa cập nhật"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="aep-footnote">
                      *Các mục trên lấy từ hồ sơ nhân sự. Nếu trống, mở <strong>Chi tiết</strong> để chọn phòng ban,
                      chức danh và ngày vào làm.
                    </p>

                    <div className="aep-card-actions">
                      <button
                        type="button"
                        className="aep-btn aep-btn--primary"
                        onClick={() => setSelectedEmployee(emp)}
                      >
                        Chi tiết
                      </button>
                      {emp.isActive !== false ? (
                        <button
                          type="button"
                          className="aep-btn aep-btn--ghost"
                          onClick={() => deactivateEmployee(emp.id)}
                        >
                          Vô hiệu hóa
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="aep-btn aep-btn--ghost"
                            onClick={() => restoreEmployee(emp.id)}
                          >
                            Khôi phục
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
