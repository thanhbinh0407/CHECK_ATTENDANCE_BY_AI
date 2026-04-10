/**
 * UserManagement.jsx
 * Quản lý tài khoản người dùng và phân quyền - dành riêng cho Manager (Giám đốc)
 */
import { useState, useEffect, useCallback, useRef } from "react";
import * as faceapi from "face-api.js";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const ROLE_OPTIONS = [
  { value: "employee",   label: "👤 Employee" },
  { value: "hr",         label: "👥 HR Staff" },
  { value: "accountant", label: "💰 Accountant" },
  { value: "supervisor", label: "✅ Supervisor" },
  { value: "manager",    label: "🏢 Manager" },
];

const ROLE_COLORS = {
  manager:    { bg: "#e9d8fd", color: "#553c9a" },
  supervisor: { bg: "#bee3f8", color: "#2c5282" },
  hr:         { bg: "#c6f6d5", color: "#276749" },
  accountant: { bg: "#fefcbf", color: "#744210" },
  employee:   { bg: "#e2e8f0", color: "#4a5568" },
};

const CHANGE_TYPE_BADGE_STYLE = {
  hire: { background: "#dcfce7", color: "#166534", borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 600 },
  initial_assignment: { background: "#e0f2fe", color: "#0c4a6e", borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 600 },
  transfer: { background: "#ede9fe", color: "#5b21b6", borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 600 },
  promotion: { background: "#fef3c7", color: "#92400e", borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 600 },
  demotion: { background: "#fee2e2", color: "#991b1b", borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 600 },
  initial_salary: { background: "#dbeafe", color: "#1e40af", borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 600 },
  increase: { background: "#dcfce7", color: "#166534", borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 600 },
  decrease: { background: "#fee2e2", color: "#991b1b", borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 600 },
  correction: { background: "#e5e7eb", color: "#374151", borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 600 },
  other: { background: "#e5e7eb", color: "#374151", borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 600 },
  default: { background: "#e5e7eb", color: "#374151", borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 600 },
};

function getHeaders() {
  const token = localStorage.getItem("authToken");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [listMode, setListMode] = useState("active"); // active | inactive
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [detailJobFilter, setDetailJobFilter] = useState({ fromDate: "", toDate: "", changeType: "" });
  const [detailSalaryFilter, setDetailSalaryFilter] = useState({ fromDate: "", toDate: "", changeType: "" });
  const [detailJobPage, setDetailJobPage] = useState(1);
  const [detailSalaryPage, setDetailSalaryPage] = useState(1);
  const [detailJobRows, setDetailJobRows] = useState([]);
  const [detailSalaryRows, setDetailSalaryRows] = useState([]);
  const [detailJobMeta, setDetailJobMeta] = useState({ page: 1, pageSize: 8, totalPages: 1, totalItems: 0, currentPage: 1 });
  const [detailSalaryMeta, setDetailSalaryMeta] = useState({ page: 1, pageSize: 8, totalPages: 1, totalItems: 0, currentPage: 1 });
  const [form, setForm] = useState({
    name: "", email: "", employeeCode: "",
    role: "employee", isActive: true,
  });
  const [newPwModal, setNewPwModal] = useState(null); // { name, employeeCode, password }
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleTarget, setRoleTarget] = useState(null);
  const [roleForm, setRoleForm] = useState({ role: "employee", reason: "" });
  const [updatingRole, setUpdatingRole] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilterUserId, setAuditFilterUserId] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditMeta, setAuditMeta] = useState({ page: 1, pageSize: 10, totalPages: 1, total: 0 });
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceTargetUser, setFaceTargetUser] = useState(null);
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const [faceCameraActive, setFaceCameraActive] = useState(false);
  const [capturedDescriptor, setCapturedDescriptor] = useState(null);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceMessage, setFaceMessage] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/employees`, { headers: getHeaders() });
      const data = await res.json();
      setUsers(data.employees || data.data || []);
    } catch (e) {
      setError("Unable to load user list: " + e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const modelUrls = [
          "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model/",
          "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/models/"
        ];
        for (const modelUrl of modelUrls) {
          try {
            await Promise.all([
              faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
              faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
              faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
            ]);
            setFaceModelsLoaded(true);
            return;
          } catch {
            // try fallback URL
          }
        }
      } catch {
        // keep false, handled in UI
      }
    };
    loadModels();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", email: "", employeeCode: "", role: "employee", isActive: true });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      employeeCode: user.employeeCode || "",
      role: user.role || "employee",
      isActive: user.isActive !== false,
    });
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const isCreate = !editing;
    const url = isCreate
      ? `${API_BASE}/api/admin/employees`
      : `${API_BASE}/api/admin/employees/${editing.id}`;
    const method = isCreate ? "POST" : "PUT";
    const body = { ...form };

    const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
    const data = await res.json();
    if (data.status === "success" || data.employee || data.data) {
      const saved = data.employee || data.data;
      if (saved?.id && detailUser?.id === saved.id) {
        setDetailUser((prev) => (prev ? { ...prev, ...saved } : prev));
      }
      setShowModal(false);
      load();
      window.dispatchEvent(new CustomEvent("hrms-admin-refresh"));
      if (isCreate && data.newPassword) {
        setNewPwModal({
          name: saved?.name || form.name,
          employeeCode: saved?.employeeCode || form.employeeCode || "—",
          password: data.newPassword,
        });
      }
    } else {
      alert(data.message || "Failed to save account");
    }
  };

  const resetPassword = async (userId, userName) => {
    if (!confirm(`Reset random password for "${userName}"?`)) return;
    const res = await fetch(`${API_BASE}/api/admin/employees/${userId}/reset-password`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data.status === "success" && data.newPassword) {
      setNewPwModal({
        name: data.employeeName || userName,
        employeeCode: data.employeeCode || "—",
        password: data.newPassword,
      });
    } else {
      alert(data.message || "Failed to reset password");
    }
  };

  const deactivate = async (user) => {
    if (!confirm(`Deactivate account "${user.name}"?`)) return;
    const res = await fetch(`${API_BASE}/api/admin/employees/${user.id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    const data = await res.json();
    if (res.ok && data.status === "success") load();
    else alert(data.message || "Error");
  };

  const restore = async (user) => {
    if (!confirm(`Restore account "${user.name}"?`)) return;
    const res = await fetch(`${API_BASE}/api/admin/employees/${user.id}/restore`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (res.ok && data.status === "success") load();
    else alert(data.message || "Error");
  };

  const openFaceModal = (user) => {
    setFaceTargetUser(user);
    setCapturedDescriptor(null);
    setFaceMessage("");
    setShowFaceModal(true);
  };

  const closeFaceModal = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    }
    setFaceCameraActive(false);
    setShowFaceModal(false);
    setFaceTargetUser(null);
    setCapturedDescriptor(null);
  };

  const startFaceCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play();
        setFaceCameraActive(true);
        setFaceMessage("Camera is on. Please look straight at the camera.");
      };
    } catch (err) {
      setFaceMessage("Cannot start camera: " + err.message);
    }
  };

  const captureFace = async () => {
    if (!faceCameraActive || !faceModelsLoaded || !videoRef.current) return;
    try {
      setFaceLoading(true);
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setFaceMessage("No face detected. Please try again.");
        return;
      }

      setCapturedDescriptor(Array.from(detection.descriptor));
      setFaceMessage("Face captured. Ready to update.");
    } catch (err) {
      setFaceMessage("Error while capturing face: " + err.message);
    } finally {
      setFaceLoading(false);
    }
  };

  const updateFaceForUser = async () => {
    if (!faceTargetUser?.employeeCode) {
      setFaceMessage("Employee code not found.");
      return;
    }
    if (!capturedDescriptor) {
      setFaceMessage("Please capture a face before updating.");
      return;
    }

    try {
      setFaceLoading(true);
      const res = await fetch(`${API_BASE}/api/enroll/face`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          employeeCode: faceTargetUser.employeeCode,
          descriptor: capturedDescriptor
        }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        setFaceMessage(data.message || "Failed to update face");
        return;
      }
      setFaceMessage("Face updated successfully");
      setTimeout(() => closeFaceModal(), 500);
    } catch (err) {
      setFaceMessage("Failed to update face: " + err.message);
    } finally {
      setFaceLoading(false);
    }
  };

  const permanentlyDeleteUser = async (user) => {
    if (!confirm(`Permanently delete "${user.name}"?\n\nThis cannot be undone.`)) return;
    const password = window.prompt("Enter Manager password to confirm permanent deletion:");
    if (!password) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/employees/${user.id}/permanent`, {
        method: "DELETE",
        headers: getHeaders(),
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        load();
        window.dispatchEvent(new CustomEvent("hrms-admin-refresh"));
      } else {
        alert(data.message || "Failed to permanently delete");
      }
    } catch (e) {
      alert(e.message || "Connection error");
    }
  };

  const filtered = users.filter(u => {
    const matchSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.employeeCode?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter ? u.role === roleFilter : true;
    const matchList = listMode === "active" ? u.isActive !== false : u.isActive === false;
    return matchSearch && matchRole && matchList;
  });

  const exportCsv = () => {
    const rows = [
      ["employeeCode", "name", "email", "role", "isActive", "createdAt"],
      ...filtered.map((u) => [
        u.employeeCode || "",
        u.name || "",
        u.email || "",
        u.role || "",
        u.isActive ? "active" : "inactive",
        u.createdAt || ""
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openRoleChange = (user) => {
    setRoleTarget(user);
    setRoleForm({ role: user.role || "employee", reason: "" });
    setShowRoleModal(true);
  };

  const submitRoleChange = async (e) => {
    e.preventDefault();
    if (!roleTarget?.id) return;
    if (!roleForm.role) {
      alert("Please select a new role.");
      return;
    }
    setUpdatingRole(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${roleTarget.id}/role`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ role: roleForm.role, reason: roleForm.reason || null }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        let msg = data.message || "Failed to change role";
        if (Array.isArray(data.missingFields) && data.missingFields.length) {
          msg += `\nMissing fields: ${data.missingFields.join(", ")}`;
        }
        alert(msg);
        return;
      }
      setShowRoleModal(false);
      await load();
      await loadRoleAudits(1, String(roleTarget.id));
      if (detailUser?.id === roleTarget.id) {
        setDetailUser((prev) => (prev ? { ...prev, role: roleForm.role } : prev));
      }
      window.dispatchEvent(new CustomEvent("hrms-admin-refresh"));
      alert("Role changed successfully");
    } catch (err) {
      alert(`Failed to change role: ${err.message}`);
    } finally {
      setUpdatingRole(false);
    }
  };

  const viewDetails = async (user) => {
    setDetailLoading(true);
    setDetailJobFilter({ fromDate: "", toDate: "", changeType: "" });
    setDetailSalaryFilter({ fromDate: "", toDate: "", changeType: "" });
    setDetailJobPage(1);
    setDetailSalaryPage(1);
    setDetailJobRows([]);
    setDetailSalaryRows([]);
    setDetailJobMeta({ page: 1, pageSize: 8, totalPages: 1, totalItems: 0, currentPage: 1 });
    setDetailSalaryMeta({ page: 1, pageSize: 8, totalPages: 1, totalItems: 0, currentPage: 1 });
    setDetailUser({ id: user.id, name: user.name, role: user.role, loading: true });
    try {
      const res = await fetch(`${API_BASE}/api/admin/employees/${user.id}/details`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.employee) {
        setDetailUser(data.employee);
      } else {
        setDetailUser({ ...user, jobHistory: [], salaryChangeHistory: [] });
      }
    } catch {
      setDetailUser({ ...user, jobHistory: [], salaryChangeHistory: [] });
    } finally {
      setDetailLoading(false);
    }
  };

  // Count by role
  const roleCounts = ROLE_OPTIONS.reduce((acc, r) => {
    acc[r.value] = users.filter(u => u.role === r.value).length;
    return acc;
  }, {});

  const detailJobTypes = ["hire", "initial_assignment", "transfer", "promotion", "demotion", "correction", "other"];
  const detailSalaryTypes = ["initial_salary", "increase", "decrease", "correction", "other"];

  const loadRoleAudits = useCallback(async (page = auditPage, userId = auditFilterUserId) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(auditMeta.pageSize || 10) });
    if (userId) params.set("userId", userId);

    setAuditLoading(true);
    setAuditError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/audits/role-changes?${params.toString()}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        setAuditError(data.message || "Cannot load audit logs");
        return;
      }
      setAuditLogs(data.logs || []);
      setAuditMeta(data.pagination || { page, pageSize: 10, totalPages: 1, total: 0 });
      setAuditPage((data.pagination?.page) || page);
    } catch (err) {
      setAuditError(`Cannot load audit logs: ${err.message}`);
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage, auditFilterUserId, auditMeta.pageSize]);

  const fetchHistoryForDetail = useCallback(async (historyType) => {
    if (!detailUser?.id) return;
    const filter = historyType === "job" ? detailJobFilter : detailSalaryFilter;
    const page = historyType === "job" ? detailJobPage : detailSalaryPage;
    const pageSize = historyType === "job" ? detailJobMeta.pageSize : detailSalaryMeta.pageSize;

    const params = new URLSearchParams({ historyType, page: String(page), pageSize: String(pageSize) });
    if (filter.fromDate) params.set("fromDate", filter.fromDate);
    if (filter.toDate) params.set("toDate", filter.toDate);
    if (filter.changeType) params.set("changeType", filter.changeType);

    try {
      setDetailLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/employees/${detailUser.id}/history?${params.toString()}`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) return;
      if (historyType === "job") {
        setDetailJobRows(data.jobHistory || []);
        setDetailJobMeta((prev) => ({ ...prev, ...(data.jobPagination || prev) }));
      } else {
        setDetailSalaryRows(data.salaryChangeHistory || []);
        setDetailSalaryMeta((prev) => ({ ...prev, ...(data.salaryPagination || prev) }));
      }
    } finally {
      setDetailLoading(false);
    }
  }, [detailUser?.id, detailJobFilter, detailSalaryFilter, detailJobPage, detailSalaryPage, detailJobMeta.pageSize, detailSalaryMeta.pageSize]);

  useEffect(() => {
    if (detailUser?.id) fetchHistoryForDetail("job");
  }, [detailUser?.id, detailJobFilter.fromDate, detailJobFilter.toDate, detailJobFilter.changeType, detailJobPage, fetchHistoryForDetail]);

  useEffect(() => {
    if (detailUser?.id) fetchHistoryForDetail("salary");
  }, [detailUser?.id, detailSalaryFilter.fromDate, detailSalaryFilter.toDate, detailSalaryFilter.changeType, detailSalaryPage, fetchHistoryForDetail]);

  useEffect(() => {
    loadRoleAudits(auditPage, auditFilterUserId);
  }, [auditPage, auditFilterUserId, loadRoleAudits]);

  const cardStyle = {
    background: "#fff", borderRadius: 10, padding: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,.08)", marginBottom: 20,
  };

  const historyInputStyle = {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 13,
    backgroundColor: "#fff",
  };

  const historySectionStyle = {
    background: "#f8fafc",
    borderRadius: 8,
    padding: 12,
    border: "1px solid #e2e8f0",
  };

  const hasJobFilter = Boolean(
    detailJobFilter.fromDate || detailJobFilter.toDate || detailJobFilter.changeType
  );
  const hasSalaryFilter = Boolean(
    detailSalaryFilter.fromDate || detailSalaryFilter.toDate || detailSalaryFilter.changeType
  );

  return (
    <div>
      {/* Role Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
        {ROLE_OPTIONS.map(r => (
          <div
            key={r.value}
            onClick={() => setRoleFilter(roleFilter === r.value ? "" : r.value)}
            style={{
              ...cardStyle, marginBottom: 0, textAlign: "center", cursor: "pointer",
              border: roleFilter === r.value ? "2px solid #667eea" : "2px solid transparent",
              padding: "14px 10px",
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 4 }}>{r.label.split(" ")[0]}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: ROLE_COLORS[r.value]?.color || "#4a5568" }}>
              {roleCounts[r.value]}
            </div>
            <div style={{ fontSize: 11, color: "#718096", marginTop: 2 }}>
              {r.label.replace(/^.\s/, "")}
            </div>
          </div>
        ))}
      </div>

      {/* Search & Create */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setListMode("active")}
            style={{
              padding: "9px 14px",
              background: listMode === "active" ? "#667eea" : "#e2e8f0",
              color: listMode === "active" ? "#fff" : "#111827",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            Account List
          </button>
          <button
            onClick={() => setListMode("inactive")}
            style={{
              padding: "9px 14px",
              background: listMode === "inactive" ? "#667eea" : "#e2e8f0",
              color: listMode === "inactive" ? "#fff" : "#111827",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            Disabled List
          </button>
        </div>
        <input
          style={{ flex: 1, padding: "9px 14px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14 }}
          placeholder="Search by name, email, employee code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{ padding: "9px 14px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14 }}
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button
          onClick={openCreate}
          style={{ padding: "9px 18px", background: "#667eea", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 14 }}
        >
          + Add User
        </button>
        <button
          onClick={exportCsv}
          style={{ padding: "9px 18px", background: "#0f766e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 14 }}
        >
          Export CSV
        </button>
      </div>

      {error && <div style={{ color: "#e53e3e", background: "#fff5f5", padding: 12, borderRadius: 6, marginBottom: 16 }}>{error}</div>}

      {/* Table */}
      <div style={cardStyle}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#718096" }}>Loading...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  {['Employee Code', 'Name', 'Email', 'Role', 'Status', 'Deactivated At', 'Created At', 'Actions'].map(h => (
                    <th key={h} style={{ background: "#f0f9ff", padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => {
                  const roleColor = ROLE_COLORS[user.role] || ROLE_COLORS.employee;
                  return (
                    <tr key={user.id}>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f0f4f8", fontFamily: "monospace" }}>
                        {user.employeeCode}
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f0f4f8", fontWeight: 500 }}>
                        {user.name}
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f0f4f8", color: "#718096" }}>
                        {user.email}
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f0f4f8" }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                          background: roleColor.bg, color: roleColor.color,
                        }}>
                          {ROLE_OPTIONS.find(r => r.value === user.role)?.label?.replace(/^.\s/, "") || user.role}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f0f4f8" }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                          background: user.isActive ? "#c6f6d5" : "#fed7d7",
                          color: user.isActive ? "#276749" : "#9b2c2c",
                        }}>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f0f4f8", color: "#64748b" }}>
                        {user.deactivatedAt ? new Date(user.deactivatedAt).toLocaleString("vi-VN") : "-"}
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f0f4f8", color: "#64748b" }}>
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "-"}
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #f0f4f8" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => viewDetails(user)}
                            style={{ padding: "4px 10px", background: "#dbeafe", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12, color: "#1d4ed8" }}
                          >
                            Details
                          </button>
                          <button
                            onClick={() => openEdit(user)}
                            style={{ padding: "4px 10px", background: "#e2e8f0", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12 }}
                          >
                            Edit / Role
                          </button>
                          <button
                            onClick={() => openRoleChange(user)}
                            style={{ padding: "4px 10px", background: "#ede9fe", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12, color: "#5b21b6" }}
                          >
                            Change Role
                          </button>
                          <button
                            onClick={() => resetPassword(user.id, user.name)}
                            style={{ padding: "4px 10px", background: "#fefcbf", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12, color: "#744210" }}
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => openFaceModal(user)}
                            style={{ padding: "4px 10px", background: "#dcfce7", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12, color: "#166534" }}
                          >
                            Update Face
                          </button>
                          {listMode === "active" ? (
                            <button
                              onClick={() => deactivate(user)}
                              style={{
                                padding: "4px 10px", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12,
                                background: "#fed7d7",
                                color: "#9b2c2c",
                              }}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => restore(user)}
                                style={{
                                  padding: "4px 10px", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12,
                                  background: "#c6f6d5",
                                  color: "#276749",
                                  fontWeight: 600,
                                }}
                              >
                                Restore
                              </button>
                              <button
                                onClick={() => permanentlyDeleteUser(user)}
                                style={{
                                  padding: "4px 10px", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12,
                                  background: "#7f1d1d",
                                  color: "#fff",
                                  fontWeight: 700,
                                }}
                                title="Permanent delete (requires Manager password)"
                              >
                                Delete Forever
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: 20, color: "#718096" }}>
                      No records found. The user management section is ready for data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Change Audit Logs */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: "#1a365d" }}>Role Change Audit Log</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Filter by User ID..."
              value={auditFilterUserId}
              onChange={(e) => { setAuditFilterUserId(e.target.value.trim()); setAuditPage(1); }}
              style={{ ...historyInputStyle, width: 160 }}
            />
            <button
              onClick={() => loadRoleAudits(1, auditFilterUserId)}
              style={{ ...historyInputStyle, background: "#e0f2fe", cursor: "pointer" }}
            >
              Refresh
            </button>
            <button
              onClick={() => { setAuditFilterUserId(""); setAuditPage(1); }}
              style={{ ...historyInputStyle, background: "#f1f5f9", cursor: "pointer" }}
            >
              Reset
            </button>
          </div>
        </div>
        {auditError && <div style={{ color: "#b91c1c", marginBottom: 8 }}>{auditError}</div>}
        {auditLoading ? (
          <div style={{ color: "#64748b" }}>Loading audit logs...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {[
                    "Time", "Target User", "Old Role", "New Role", "Changed By", "Reason"
                  ].map((h) => (
                    <th key={h} style={{ background: "#f8fafc", textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 10px" }}>{log.createdAt ? new Date(log.createdAt).toLocaleString("vi-VN") : "-"}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ fontWeight: 600 }}>{log.TargetUser?.name || "-"}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{log.TargetUser?.employeeCode || ""}</div>
                    </td>
                    <td style={{ padding: "8px 10px" }}><span style={ROLE_COLORS[log.oldRole] || ROLE_COLORS.employee}>{log.oldRole}</span></td>
                    <td style={{ padding: "8px 10px" }}><span style={ROLE_COLORS[log.newRole] || ROLE_COLORS.employee}>{log.newRole}</span></td>
                    <td style={{ padding: "8px 10px" }}>{log.ChangedByUser?.name || "-"}</td>
                    <td style={{ padding: "8px 10px" }}>{log.reason || "-"}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 12, textAlign: "center", color: "#64748b" }}>No audit records yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 10 }}>
          <button
            disabled={auditPage <= 1}
            onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
            style={{ ...historyInputStyle, cursor: auditPage <= 1 ? "not-allowed" : "pointer" }}
          >
            Prev
          </button>
          <span style={{ fontSize: 13, color: "#475569" }}>
            Page {auditMeta.page || 1} / {auditMeta.totalPages || 1}
          </span>
          <button
            disabled={auditPage >= (auditMeta.totalPages || 1)}
            onClick={() => setAuditPage((p) => Math.min(auditMeta.totalPages || 1, p + 1))}
            style={{ ...historyInputStyle, cursor: auditPage >= (auditMeta.totalPages || 1) ? "not-allowed" : "pointer" }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: 12, padding: 28, width: 520, maxWidth: "96vw", maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, color: "#1a365d" }}>
                {editing ? "✏️ Update User" : "➕ Create New User"}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#718096" }}>×</button>
            </div>
            <form onSubmit={save}>
              {!editing && (
                <div style={{ marginBottom: 14, padding: "10px 14px", background: "#ebf8ff", border: "1px solid #bee3f8", borderRadius: 8, fontSize: 13, color: "#2c5282" }}>
                  🔐 A random password will be auto-generated (e.g. <strong>HMA#9940</strong>) and shown after account creation.
                </div>
              )}
              {[
                { label: "Full Name *", key: "name", type: "text", required: true },
                { label: "Email *", key: "email", type: "email", required: true },
                { label: "Employee Code", key: "employeeCode", type: "text" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4a5568", marginBottom: 5 }}>{f.label}</label>
                  <input
                    type={f.type}
                    required={f.required}
                    value={form[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14 }}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4a5568", marginBottom: 5 }}>
                  🔑 Role (Permissions) *
                </label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14 }}
                >
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <div style={{ fontSize: 12, color: "#718096", marginTop: 4 }}>
                  {{
                    manager:    "Full system access; manage users and permissions",
                    supervisor: "Approve applications, payroll oversight, reports",
                    hr:         "Manage employee records, departments, and attendance",
                    accountant: "Payroll, tax, social insurance calculations",
                    employee:   "Self-service: view info, submit requests",
                  }[form.role]}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm({ ...form, isActive: e.target.checked })}
                    style={{ width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 14 }}>Account is active</span>
                </label>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: "9px 18px", background: "#e2e8f0", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "9px 18px", background: "#667eea", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailUser && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setDetailUser(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 12, padding: 20, width: 900, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>User Detail: {detailUser.name}</h3>
              <button onClick={() => setDetailUser(null)} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            {detailLoading && <p>Loading details...</p>}
            {!detailLoading && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12 }}>
                  <strong>General Info</strong>
                  <div style={{ marginTop: 8 }}>Employee Code: {detailUser.employeeCode || "-"}</div>
                  <div>Email: {detailUser.email || "-"}</div>
                  <div>Role: {detailUser.role || "-"}</div>
                </div>

                <div style={historySectionStyle}>
                  <strong>Job History</strong>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, marginBottom: 10 }}>
                    <input type="date" value={detailJobFilter.fromDate} onChange={(e) => { setDetailJobFilter({ ...detailJobFilter, fromDate: e.target.value }); setDetailJobPage(1); }} style={historyInputStyle} />
                    <input type="date" value={detailJobFilter.toDate} onChange={(e) => { setDetailJobFilter({ ...detailJobFilter, toDate: e.target.value }); setDetailJobPage(1); }} style={historyInputStyle} />
                    <select value={detailJobFilter.changeType} onChange={(e) => { setDetailJobFilter({ ...detailJobFilter, changeType: e.target.value }); setDetailJobPage(1); }} style={historyInputStyle}>
                      <option value="">All types</option>
                      {detailJobTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailJobFilter({ fromDate: "", toDate: "", changeType: "" });
                        setDetailJobPage(1);
                      }}
                      style={{ ...historyInputStyle, background: "#f1f5f9", cursor: "pointer" }}
                    >
                      Reset filter
                    </button>
                  </div>
                  {detailJobRows.length === 0 && (
                    <div style={{ marginTop: 8, color: '#64748b' }}>
                      {hasJobFilter ? "No job history for selected filters." : "No job history available."}
                    </div>
                  )}
                  {detailJobRows.length > 0 && (
                    <div style={{ overflowX: "auto", marginTop: 8 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr><th style={{ textAlign: "left", padding: 6 }}>Date</th><th style={{ textAlign: "left", padding: 6 }}>Type</th><th style={{ textAlign: "left", padding: 6 }}>Department</th><th style={{ textAlign: "left", padding: 6 }}>Job Title</th></tr></thead>
                        <tbody>
                          {detailJobRows.map((h) => (
                            <tr key={h.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                              <td style={{ padding: 6 }}>{h.effectiveDate || "-"}</td>
                              <td style={{ padding: 6 }}>
                                <span style={CHANGE_TYPE_BADGE_STYLE[h.changeType] || CHANGE_TYPE_BADGE_STYLE.default}>
                                  {h.changeType || "unknown"}
                                </span>
                              </td>
                                <td style={{ padding: 6 }}>
                                    {h.changeType === "other" ? (
                                      <>
                                        <span style={{ color: "#dc2626", fontWeight: 500 }}>{h.fromDepartmentName || "-"}</span>
                                        <span style={{ color: "#64748b" }}>{" -> "}</span>
                                        <span style={{ color: "#16a34a", fontWeight: 500 }}>{h.toDepartmentName || "-"}</span>
                                      </>
                                    ) : (
                                      <span style={{ color: "#16a34a", fontWeight: 500 }}>
                                        {h.toDepartmentName || h.fromDepartmentName || "-"}
                                      </span>
                                    )}
                                </td>
                                <td style={{ padding: 6 }}>
                                    {h.changeType === "other" ? (
                                      <>
                                        <span style={{ color: "#dc2626", fontWeight: 500 }}>{h.fromJobTitleName || "-"}</span>
                                        <span style={{ color: "#64748b" }}>{" -> "}</span>
                                        <span style={{ color: "#16a34a", fontWeight: 500 }}>{h.toJobTitleName || "-"}</span>
                                      </>
                                    ) : (
                                      <span style={{ color: "#dc2626", fontWeight: 500 }}>
                                        {h.toJobTitleName || h.fromJobTitleName || "-"}
                                      </span>
                                    )}
                                </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {detailJobMeta.totalItems > 0 && (
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 10 }}>
                      <button disabled={detailJobPage <= 1} onClick={() => setDetailJobPage((p) => Math.max(1, p - 1))} style={{ ...historyInputStyle, cursor: detailJobPage <= 1 ? "not-allowed" : "pointer" }}>Prev</button>
                      <span style={{ fontSize: 13, color: "#475569" }}>Page {detailJobMeta.currentPage} / {detailJobMeta.totalPages}</span>
                      <button disabled={detailJobPage >= detailJobMeta.totalPages} onClick={() => setDetailJobPage((p) => Math.min(detailJobMeta.totalPages, p + 1))} style={{ ...historyInputStyle, cursor: detailJobPage >= detailJobMeta.totalPages ? "not-allowed" : "pointer" }}>Next</button>
                    </div>
                  )}
                </div>

                <div style={historySectionStyle}>
                  <strong>Salary Change History</strong>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, marginBottom: 10 }}>
                    <input type="date" value={detailSalaryFilter.fromDate} onChange={(e) => { setDetailSalaryFilter({ ...detailSalaryFilter, fromDate: e.target.value }); setDetailSalaryPage(1); }} style={historyInputStyle} />
                    <input type="date" value={detailSalaryFilter.toDate} onChange={(e) => { setDetailSalaryFilter({ ...detailSalaryFilter, toDate: e.target.value }); setDetailSalaryPage(1); }} style={historyInputStyle} />
                    <select value={detailSalaryFilter.changeType} onChange={(e) => { setDetailSalaryFilter({ ...detailSalaryFilter, changeType: e.target.value }); setDetailSalaryPage(1); }} style={historyInputStyle}>
                      <option value="">All types</option>
                      {detailSalaryTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailSalaryFilter({ fromDate: "", toDate: "", changeType: "" });
                        setDetailSalaryPage(1);
                      }}
                      style={{ ...historyInputStyle, background: "#f1f5f9", cursor: "pointer" }}
                    >
                      Reset filter
                    </button>
                  </div>
                  {detailSalaryRows.length === 0 && (
                    <div style={{ marginTop: 8, color: '#64748b' }}>
                      {hasSalaryFilter ? "No salary changes for selected filters." : "No salary change history available."}
                    </div>
                  )}
                  {detailSalaryRows.length > 0 && (
                    <div style={{ overflowX: "auto", marginTop: 8 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr><th style={{ textAlign: "left", padding: 6 }}>Date</th><th style={{ textAlign: "left", padding: 6 }}>Type</th><th style={{ textAlign: "left", padding: 6 }}>Old to New Salary</th><th style={{ textAlign: "left", padding: 6 }}>Reason</th></tr></thead>
                        <tbody>
                          {detailSalaryRows.map((h) => (
                            <tr key={h.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                              <td style={{ padding: 6 }}>{h.effectiveDate || "-"}</td>
                              <td style={{ padding: 6 }}>
                                <span style={CHANGE_TYPE_BADGE_STYLE[h.changeType] || CHANGE_TYPE_BADGE_STYLE.default}>
                                  {h.changeType || "unknown"}
                                </span>
                              </td>
                              <td style={{ padding: 6 }}>{Number(h.previousBaseSalary || 0).toLocaleString("vi-VN")} → {Number(h.newBaseSalary || 0).toLocaleString("vi-VN")}</td>
                              <td style={{ padding: 6 }}>{h.reason || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {detailSalaryMeta.totalItems > 0 && (
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 10 }}>
                      <button disabled={detailSalaryPage <= 1} onClick={() => setDetailSalaryPage((p) => Math.max(1, p - 1))} style={{ ...historyInputStyle, cursor: detailSalaryPage <= 1 ? "not-allowed" : "pointer" }}>Prev</button>
                      <span style={{ fontSize: 13, color: "#475569" }}>Page {detailSalaryMeta.currentPage} / {detailSalaryMeta.totalPages}</span>
                      <button disabled={detailSalaryPage >= detailSalaryMeta.totalPages} onClick={() => setDetailSalaryPage((p) => Math.min(detailSalaryMeta.totalPages, p + 1))} style={{ ...historyInputStyle, cursor: detailSalaryPage >= detailSalaryMeta.totalPages ? "not-allowed" : "pointer" }}>Next</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showRoleModal && roleTarget && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowRoleModal(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: 12, padding: 22, width: 520, maxWidth: "95vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 17, color: "#1a365d" }}>Change User Role</h3>
              <button onClick={() => setShowRoleModal(false)} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ ...historySectionStyle, marginBottom: 12 }}>
              <div><strong>{roleTarget.name}</strong> ({roleTarget.employeeCode || "-"})</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{roleTarget.email}</div>
              <div style={{ marginTop: 4, fontSize: 13 }}>
                Current role: <strong>{roleTarget.role || "employee"}</strong>
              </div>
            </div>

            <form onSubmit={submitRoleChange}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>New role</label>
                <select
                  value={roleForm.role}
                  onChange={(e) => setRoleForm((prev) => ({ ...prev, role: e.target.value }))}
                  style={{ width: "100%", ...historyInputStyle }}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Reason for role change</label>
                <textarea
                  value={roleForm.reason}
                  onChange={(e) => setRoleForm((prev) => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  placeholder="Example: internal transfer, temporary assignment..."
                  style={{ width: "100%", ...historyInputStyle, resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  style={{ ...historyInputStyle, background: "#f1f5f9", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingRole}
                  style={{ ...historyInputStyle, background: "#ede9fe", color: "#5b21b6", fontWeight: 700, cursor: updatingRole ? "not-allowed" : "pointer" }}
                >
                  {updatingRole ? "Updating..." : "Confirm role change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {newPwModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setNewPwModal(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 12, padding: 28, width: 420, maxWidth: "94vw", textAlign: "center" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
            <h3 style={{ fontSize: 17, color: "#1a365d", marginBottom: 4 }}>New Password</h3>
            <p style={{ fontSize: 13, color: "#718096", marginBottom: 18 }}>
              <strong>{newPwModal.name}</strong> ({newPwModal.employeeCode})
            </p>
            <div
              style={{
                background: "#f0fff4", border: "2px solid #9ae6b4", borderRadius: 8,
                padding: "14px 20px", fontSize: 26, fontWeight: 800, letterSpacing: 3,
                color: "#276749", marginBottom: 18, fontFamily: "monospace",
              }}
            >
              {newPwModal.password}
            </div>
            <p style={{ fontSize: 12, color: "#e53e3e", marginBottom: 20 }}>
              ⚠️ Save this password now - it will not be shown again after closing.
            </p>
            <button
              onClick={() => { navigator.clipboard?.writeText(newPwModal.password); }}
              style={{ padding: "8px 18px", background: "#ebf8ff", border: "1px solid #90cdf4", borderRadius: 6, cursor: "pointer", fontSize: 13, marginRight: 8 }}
            >
              📋 Copy
            </button>
            <button
              onClick={() => setNewPwModal(null)}
              style={{ padding: "8px 18px", background: "#667eea", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              Saved ✓
            </button>
          </div>
        </div>
      )}

      {showFaceModal && faceTargetUser && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 2200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={closeFaceModal}
        >
          <div
            style={{ background: "#fff", borderRadius: 12, padding: 20, width: 760, maxWidth: "96vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: "#1a365d" }}>
                Update Face: {faceTargetUser.name} ({faceTargetUser.employeeCode})
              </h3>
              <button onClick={closeFaceModal} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            {!faceModelsLoaded && (
              <div style={{ marginBottom: 12, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: 10 }}>
                Loading face models, please wait...
              </div>
            )}
            {faceMessage && (
              <div style={{ marginBottom: 12, color: "#334155", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
                {faceMessage}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 14 }}>
              <div style={{ background: "#000", borderRadius: 8, overflow: "hidden", aspectRatio: "4/3", position: "relative" }}>
                <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} autoPlay muted playsInline />
                <canvas ref={canvasRef} style={{ display: "none" }} width={640} height={480} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  onClick={startFaceCamera}
                  disabled={!faceModelsLoaded || faceCameraActive || faceLoading}
                  style={{ padding: "10px 12px", border: "none", borderRadius: 8, background: "#2563eb", color: "#fff", cursor: "pointer" }}
                >
                  Start Camera
                </button>
                <button
                  type="button"
                  onClick={captureFace}
                  disabled={!faceCameraActive || !faceModelsLoaded || faceLoading}
                  style={{ padding: "10px 12px", border: "none", borderRadius: 8, background: "#059669", color: "#fff", cursor: "pointer" }}
                >
                  {faceLoading ? "Processing..." : "Capture Face"}
                </button>
                <button
                  type="button"
                  onClick={updateFaceForUser}
                  disabled={!capturedDescriptor || faceLoading}
                  style={{ padding: "10px 12px", border: "none", borderRadius: 8, background: "#7c3aed", color: "#fff", cursor: "pointer", fontWeight: 700 }}
                >
                  Update Face
                </button>
                <div style={{ fontSize: 13, color: capturedDescriptor ? "#166534" : "#92400e", marginTop: 4 }}>
                  {capturedDescriptor ? "Face data captured." : "Face not captured yet."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
