/**
 * UserManagement.jsx
 * Quản lý tài khoản người dùng và phân quyền - dành riêng cho Manager (Giám đốc)
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import * as faceapi from "face-api.js";
import {
  toastConfirm,
  toastError,
  toastSuccess,
  toastWarning,
  toastPrompt,
} from "../lib/notify.jsx";
import "./userManagement.css";

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

function getHeaders() {
  const token = localStorage.getItem("authToken");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function getActorIdFromToken() {
  try {
    const t = localStorage.getItem("authToken");
    if (!t) return null;
    const part = t.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return payload.userId ?? payload.id ?? null;
  } catch {
    return null;
  }
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
  const [form, setForm] = useState({
    name: "", email: "", employeeCode: "",
    role: "employee", isActive: true,
  });
  const [newPwModal, setNewPwModal] = useState(null); // { name, employeeCode, password }
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleTarget, setRoleTarget] = useState(null);
  const [roleForm, setRoleForm] = useState({ role: "employee", reason: "" });
  const [updatingRole, setUpdatingRole] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceTargetUser, setFaceTargetUser] = useState(null);
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const [faceCameraActive, setFaceCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturedDescriptor, setCapturedDescriptor] = useState(null);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceMessage, setFaceMessage] = useState("");
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  /** Viewport coords for portaled actions menu (escapes overflow-x on table wrapper). */
  const [actionMenuPos, setActionMenuPos] = useState(null);

  const actorUserId = getActorIdFromToken();
  const managerMayLifecycleMutate = (u) =>
    u && actorUserId != null && Number(u.id) !== Number(actorUserId);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceDetectionIntervalRef = useRef(null);

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
      toastError(data.message || "Failed to save account");
    }
  };

  const resetPassword = async (userId, userName) => {
    const ok = await toastConfirm({ message: `Reset random password for "${userName}"?` });
    if (!ok) return;
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
      toastSuccess("Password reset. Check the dialog for the new password.");
    } else {
      toastError(data.message || "Failed to reset password");
    }
  };

  const deactivate = async (userRow) => {
    const ok = await toastConfirm({ message: `Deactivate account "${userRow.name}"?` });
    if (!ok) return;
    const password = await toastPrompt({
      message: "Enter your password to confirm deactivation:",
      inputType: "password",
    });
    if (password === null) return;
    if (!String(password).trim()) {
      toastWarning("Password is required.");
      return;
    }
    const res = await fetch(`${API_BASE}/api/admin/employees/${userRow.id}`, {
      method: "DELETE",
      headers: getHeaders(),
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok && data.status === "success") {
      load();
      toastSuccess("Account deactivated.");
    } else toastError(data.message || "Error");
  };

  const restore = async (user) => {
    const ok = await toastConfirm({ message: `Restore account "${user.name}"?` });
    if (!ok) return;
    const res = await fetch(`${API_BASE}/api/admin/employees/${user.id}/restore`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (res.ok && data.status === "success") {
      load();
      toastSuccess("Account restored.");
    } else toastError(data.message || "Error");
  };

  const openFaceModal = (user) => {
    setFaceTargetUser(user);
    setCapturedDescriptor(null);
    setFaceMessage("");
    setShowFaceModal(true);
  };

  const closeFaceModal = () => {
    if (faceDetectionIntervalRef.current) {
      clearInterval(faceDetectionIntervalRef.current);
      faceDetectionIntervalRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    }
    setFaceCameraActive(false);
    setFaceDetected(false);
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

  useEffect(() => {
    if (!showFaceModal || !faceCameraActive || !faceModelsLoaded || !videoRef.current || !canvasRef.current) {
      if (faceDetectionIntervalRef.current) {
        clearInterval(faceDetectionIntervalRef.current);
        faceDetectionIntervalRef.current = null;
      }
      return;
    }

    faceDetectionIntervalRef.current = setInterval(async () => {
      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
          .withFaceLandmarks();

        setFaceDetected(detections.length > 0);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        detections.forEach((detection) => {
          const box = detection.detection.box;
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 2;
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          if (detection.landmarks) {
            ctx.strokeStyle = "#22c55e";
            ctx.lineWidth = 1.5;
            const drawPath = (points, closePath = false) => {
              ctx.beginPath();
              points.forEach((point, idx) => {
                if (idx === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
              });
              if (closePath) ctx.closePath();
              ctx.stroke();
            };

            drawPath(detection.landmarks.getJawOutline());
            drawPath(detection.landmarks.getLeftEye(), true);
            drawPath(detection.landmarks.getRightEye(), true);
            drawPath(detection.landmarks.getNose());
            drawPath(detection.landmarks.getMouth(), true);
          }
        });
      } catch {
        // keep silent to avoid noisy UI while camera feed is initializing
      }
    }, 120);

    return () => {
      if (faceDetectionIntervalRef.current) {
        clearInterval(faceDetectionIntervalRef.current);
        faceDetectionIntervalRef.current = null;
      }
    };
  }, [showFaceModal, faceCameraActive, faceModelsLoaded]);

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
    const ok = await toastConfirm({
      message: `Permanently delete "${user.name}"?\n\nThis cannot be undone.`,
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
      const res = await fetch(`${API_BASE}/api/admin/employees/${user.id}/permanent`, {
        method: "DELETE",
        headers: getHeaders(),
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        load();
        window.dispatchEvent(new CustomEvent("hrms-admin-refresh"));
        toastSuccess("Account permanently deleted.");
      } else {
        toastError(data.message || "Failed to permanently delete");
      }
    } catch (e) {
      toastError(e.message || "Connection error");
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
      toastWarning("Please select a new role.");
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
        toastError(msg);
        return;
      }
      setShowRoleModal(false);
      await load();
      window.dispatchEvent(new CustomEvent("hrms-admin-refresh"));
      toastSuccess("Role changed successfully.");
    } catch (err) {
      toastError(`Failed to change role: ${err.message}`);
    } finally {
      setUpdatingRole(false);
    }
  };

  // Count by role
  const roleCounts = ROLE_OPTIONS.reduce((acc, r) => {
    acc[r.value] = users.filter(u => u.role === r.value).length;
    return acc;
  }, {});

  const closeActionMenu = useCallback(() => {
    setOpenActionMenuId(null);
    setActionMenuPos(null);
  }, []);

  useEffect(() => {
    if (openActionMenuId == null) return;
    const onDoc = () => closeActionMenu();
    const tid = setTimeout(() => document.addEventListener("click", onDoc), 0);
    return () => {
      clearTimeout(tid);
      document.removeEventListener("click", onDoc);
    };
  }, [openActionMenuId, closeActionMenu]);

  useEffect(() => {
    if (openActionMenuId == null) return;
    const onScrollOrResize = () => closeActionMenu();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [openActionMenuId, closeActionMenu]);

  useEffect(() => {
    if (openActionMenuId != null && !filtered.some((u) => u.id === openActionMenuId)) closeActionMenu();
  }, [filtered, openActionMenuId, closeActionMenu]);

  const rolePlainLabel = (roleValue) => {
    const r = ROLE_OPTIONS.find((x) => x.value === roleValue);
    if (!r) return roleValue || "—";
    const sp = r.label.indexOf(" ");
    return sp === -1 ? r.label : r.label.slice(sp + 1);
  };

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

  const actionMenuUser =
    openActionMenuId != null ? filtered.find((u) => u.id === openActionMenuId) ?? null : null;

  return (
    <div className="user-management">
      {/* Role Summary Cards */}
      <div className="um-role-cards">
        {ROLE_OPTIONS.map((r) => (
          <button
            key={r.value}
            type="button"
            className={`um-role-card${roleFilter === r.value ? " um-role-card--active" : ""}`}
            onClick={() => setRoleFilter(roleFilter === r.value ? "" : r.value)}
          >
            <span className="um-role-card__icon" aria-hidden>
              {r.label.split(" ")[0]}
            </span>
            <span
              className="um-role-card__count"
              style={{ color: ROLE_COLORS[r.value]?.color || "#4a5568" }}
            >
              {roleCounts[r.value]}
            </span>
            <span className="um-role-card__label">{rolePlainLabel(r.value)}</span>
          </button>
        ))}
      </div>

      {/* Search & Create */}
      <div className="um-toolbar">
        <div className="um-toolbar__tabs">
          <button
            type="button"
            className={`um-tab${listMode === "active" ? " um-tab--active" : ""}`}
            onClick={() => setListMode("active")}
          >
            Account List
          </button>
          <button
            type="button"
            className={`um-tab${listMode === "inactive" ? " um-tab--active" : ""}`}
            onClick={() => setListMode("inactive")}
          >
            Disabled List
          </button>
        </div>
        <input
          className="um-toolbar__search"
          placeholder="Search by name, email, employee code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="um-toolbar__select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <div className="um-toolbar__actions">
          <button type="button" className="um-btn um-btn--secondary" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      {error && <div style={{ color: "#e53e3e", background: "#fff5f5", padding: 12, borderRadius: 6, marginBottom: 16 }}>{error}</div>}

      {/* Table */}
      <div className="um-panel">
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#718096" }}>Loading...</div>
        ) : (
          <div className="um-table-wrap">
            <table className="um-table">
              <thead>
                <tr>
                  {["Employee Code", "Name", "Email", "Role", "Status", "Deactivated At", "Created At", "Actions"].map(
                    (h) => (
                      <th key={h}>{h}</th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const roleColor = ROLE_COLORS[user.role] || ROLE_COLORS.employee;
                  const menuOpen = openActionMenuId === user.id;
                  return (
                    <tr key={user.id}>
                      <td className="um-td um-td--code">{user.employeeCode}</td>
                      <td className="um-td um-td--name" title={user.name || ""}>
                        {user.name}
                      </td>
                      <td className="um-td um-td--email" title={user.email || ""}>
                        {user.email}
                      </td>
                      <td className="um-td">
                        <span
                          className="um-badge um-badge--role"
                          style={{ background: roleColor.bg, color: roleColor.color }}
                        >
                          {rolePlainLabel(user.role)}
                        </span>
                      </td>
                      <td className="um-td">
                        <span
                          className={`um-badge um-badge--status${user.isActive ? " um-badge--status-active" : " um-badge--status-inactive"}`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="um-td um-td--muted">
                        {user.deactivatedAt ? new Date(user.deactivatedAt).toLocaleString("vi-VN") : "—"}
                      </td>
                      <td className="um-td um-td--muted">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="um-td um-td--actions">
                        <div className="um-actions">
                          <button
                            type="button"
                            className={`um-actions-trigger${menuOpen ? " um-actions-trigger--open" : ""}`}
                            aria-expanded={menuOpen}
                            aria-haspopup="true"
                            aria-label={`Actions for ${user.name || user.employeeCode}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (menuOpen) {
                                closeActionMenu();
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActionMenuPos({
                                  top: rect.bottom + 4,
                                  right: window.innerWidth - rect.right,
                                });
                                setOpenActionMenuId(user.id);
                              }
                            }}
                          >
                            ···
                          </button>
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
        {!loading &&
          actionMenuUser &&
          actionMenuPos &&
          createPortal(
            <div
              className="um-actions-menu um-actions-menu--portal"
              style={{ top: actionMenuPos.top, right: actionMenuPos.right }}
              role="menu"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                className="um-actions-item"
                onClick={() => {
                  closeActionMenu();
                  openEdit(actionMenuUser);
                }}
              >
                Edit / Role
              </button>
              <button
                type="button"
                role="menuitem"
                className="um-actions-item"
                onClick={() => {
                  closeActionMenu();
                  openRoleChange(actionMenuUser);
                }}
              >
                Change Role
              </button>
              <button
                type="button"
                role="menuitem"
                className="um-actions-item"
                onClick={() => {
                  closeActionMenu();
                  resetPassword(actionMenuUser.id, actionMenuUser.name);
                }}
              >
                Reset Password
              </button>
              <button
                type="button"
                role="menuitem"
                className="um-actions-item"
                onClick={() => {
                  closeActionMenu();
                  openFaceModal(actionMenuUser);
                }}
              >
                Update Face
              </button>
              {listMode === "active" ? (
                managerMayLifecycleMutate(actionMenuUser) && (
                  <button
                    type="button"
                    role="menuitem"
                    className="um-actions-item um-actions-item--danger"
                    onClick={() => {
                      closeActionMenu();
                      deactivate(actionMenuUser);
                    }}
                  >
                    Deactivate
                  </button>
                )
              ) : (
                managerMayLifecycleMutate(actionMenuUser) && (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      className="um-actions-item um-actions-item--ok"
                      onClick={() => {
                        closeActionMenu();
                        restore(actionMenuUser);
                      }}
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="um-actions-item um-actions-item--danger"
                      title="Permanent delete (requires Manager password)"
                      onClick={() => {
                        closeActionMenu();
                        permanentlyDeleteUser(actionMenuUser);
                      }}
                    >
                      Delete forever
                    </button>
                  </>
                )
              )}
            </div>,
            document.body
          )}
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
                <canvas
                  ref={canvasRef}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    zIndex: 4,
                  }}
                  width={640}
                  height={480}
                />
                {faceCameraActive && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: "62%",
                      height: "78%",
                      transform: "translate(-50%, -50%)",
                      border: "2px dashed rgba(255,255,255,0.85)",
                      borderRadius: "50%",
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.2)",
                      zIndex: 3,
                      pointerEvents: "none",
                    }}
                  />
                )}
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
                <div style={{ fontSize: 12, color: faceDetected ? "#166534" : "#b45309" }}>
                  {faceDetected ? "Live face detected in frame." : "Align one face inside the guide frame."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
