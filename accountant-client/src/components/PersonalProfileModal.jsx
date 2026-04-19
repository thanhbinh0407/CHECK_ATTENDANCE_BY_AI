import React, { useCallback, useEffect, useState } from "react";
import "./personalProfileModal.css";

const ROLE_LABEL = {
  manager: "Director / Admin",
  hr: "HR Staff",
  accountant: "Accountant",
  supervisor: "Supervisor",
  employee: "Employee",
};

function resolveAvatarUrl(apiBase, avatarUrl) {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  const base = (apiBase || "").replace(/\/$/, "");
  const path = avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`;
  return `${base}${path}`;
}

export default function PersonalProfileModal({ open, onClose, apiBase, onSessionUserPatch }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [tab, setTab] = useState("profile");
  const [form, setForm] = useState({});
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  const loadProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch(`${apiBase}/api/employee/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        setMessage({ type: "err", text: data.message || "Cannot load profile" });
        setUser(null);
        return;
      }
      const u = data.user;
      setUser(u);
      setForm({
        name: u.name || "",
        phoneNumber: u.phoneNumber || "",
        address: u.address || "",
        permanentAddress: u.permanentAddress || "",
        temporaryAddress: u.temporaryAddress || "",
        personalEmail: u.personalEmail || "",
        companyEmail: u.companyEmail || "",
        dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toISOString().slice(0, 10) : "",
        gender: u.gender || "",
        idNumber: u.idNumber || "",
        idIssueDate: u.idIssueDate ? new Date(u.idIssueDate).toISOString().slice(0, 10) : "",
        idIssuePlace: u.idIssuePlace || "",
        emergencyContactName: u.emergencyContactName || "",
        emergencyContactRelationship: u.emergencyContactRelationship || "",
        emergencyContactPhone: u.emergencyContactPhone || "",
        educationLevel: u.educationLevel || "",
        major: u.major || "",
      });
    } catch (e) {
      setMessage({ type: "err", text: e.message || "Network error" });
    } finally {
      setLoading(false);
    }
  }, [apiBase, token]);

  useEffect(() => {
    if (open) {
      setTab("profile");
      loadProfile();
    }
  }, [open, loadProfile]);

  const onField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch(`${apiBase}/api/employee/profile`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        setMessage({ type: "err", text: data.message || "Save failed" });
        return;
      }
      setUser(data.user);
      setMessage({ type: "ok", text: "Profile saved." });
      if (onSessionUserPatch && data.user) {
        onSessionUserPatch({
          name: data.user.name,
          avatarUrl: data.user.avatarUrl ?? undefined,
        });
      }
    } catch (err) {
      setMessage({ type: "err", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (pwd.next.length < 8) {
      setMessage({ type: "err", text: "New password must be at least 8 characters." });
      return;
    }
    if (pwd.next !== pwd.confirm) {
      setMessage({ type: "err", text: "New password and confirmation do not match." });
      return;
    }
    setPwdSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch(`${apiBase}/api/auth/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword: pwd.current, newPassword: pwd.next }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        setMessage({ type: "err", text: data.message || "Failed to change password" });
        return;
      }
      setPwd({ current: "", next: "", confirm: "" });
      setMessage({ type: "ok", text: "Password changed successfully." });
    } catch (err) {
      setMessage({ type: "err", text: err.message });
    } finally {
      setPwdSaving(false);
    }
  };

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    setAvatarUploading(true);
    setMessage({ type: "", text: "" });
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch(`${apiBase}/api/employee/profile/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        setMessage({ type: "err", text: data.message || "Avatar upload failed" });
        return;
      }
      if (data.user) setUser(data.user);
      setMessage({ type: "ok", text: "Avatar updated." });
      if (onSessionUserPatch) {
        onSessionUserPatch({ avatarUrl: data.avatarUrl || data.user?.avatarUrl });
      }
    } catch (err) {
      setMessage({ type: "err", text: err.message });
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!open) return null;

  const avatarSrc = resolveAvatarUrl(apiBase, user?.avatarUrl);

  return (
    <div className="ppm-overlay" role="dialog" aria-modal="true" aria-labelledby="ppm-title">
      <div className="ppm-backdrop" onClick={onClose} />
      <div className="ppm-panel">
        <div className="ppm-head">
          <h2 id="ppm-title">Personal profile</h2>
          <button type="button" className="ppm-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ppm-tabs">
          <button
            type="button"
            className={tab === "profile" ? "ppm-tab active" : "ppm-tab"}
            onClick={() => setTab("profile")}
          >
            Profile & avatar
          </button>
          <button
            type="button"
            className={tab === "password" ? "ppm-tab active" : "ppm-tab"}
            onClick={() => setTab("password")}
          >
            Change password
          </button>
        </div>

        {message.text ? (
          <div className={`ppm-msg ${message.type === "ok" ? "ppm-msg--ok" : "ppm-msg--err"}`}>{message.text}</div>
        ) : null}

        {loading ? (
          <div className="ppm-loading">Loading…</div>
        ) : tab === "profile" ? (
          <form className="ppm-body" onSubmit={saveProfile}>
            <div className="ppm-avatar-row">
              <div className="ppm-avatar-preview">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" />
                ) : (
                  <span>{(user?.name || "?").charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <label className="ppm-file-label">
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickAvatar} disabled={avatarUploading} />
                  {avatarUploading ? "Uploading…" : "Choose avatar"}
                </label>
                <p className="ppm-hint">JPEG, PNG, or WebP · up to 2MB</p>
              </div>
            </div>

            <div className="ppm-readonly-grid">
              <div>
                <span className="ppm-label">Login email</span>
                <div className="ppm-ro">{user?.email || "—"}</div>
              </div>
              <div>
                <span className="ppm-label">Employee code</span>
                <div className="ppm-ro">{user?.employeeCode || "—"}</div>
              </div>
              <div>
                <span className="ppm-label">Role</span>
                <div className="ppm-ro">{ROLE_LABEL[user?.role] || user?.role || "—"}</div>
              </div>
              <div>
                <span className="ppm-label">Department</span>
                <div className="ppm-ro">{user?.Department?.name || "—"}</div>
              </div>
              <div>
                <span className="ppm-label">Job title</span>
                <div className="ppm-ro">{user?.JobTitle?.name || "—"}</div>
              </div>
            </div>

            <h3 className="ppm-section-title">Edit information</h3>
            <div className="ppm-grid">
              <label className="ppm-field">
                <span>Full name *</span>
                <input value={form.name} onChange={(e) => onField("name", e.target.value)} required />
              </label>
              <label className="ppm-field">
                <span>Phone number</span>
                <input value={form.phoneNumber} onChange={(e) => onField("phoneNumber", e.target.value)} />
              </label>
              <label className="ppm-field ppm-field--full">
                <span>Address</span>
                <input value={form.address} onChange={(e) => onField("address", e.target.value)} />
              </label>
              <label className="ppm-field ppm-field--full">
                <span>Permanent address</span>
                <input value={form.permanentAddress} onChange={(e) => onField("permanentAddress", e.target.value)} />
              </label>
              <label className="ppm-field ppm-field--full">
                <span>Temporary address</span>
                <input value={form.temporaryAddress} onChange={(e) => onField("temporaryAddress", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Personal email</span>
                <input type="email" value={form.personalEmail} onChange={(e) => onField("personalEmail", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Company email</span>
                <input type="email" value={form.companyEmail} onChange={(e) => onField("companyEmail", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Date of birth</span>
                <input type="date" value={form.dateOfBirth} onChange={(e) => onField("dateOfBirth", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Gender</span>
                <select value={form.gender} onChange={(e) => onField("gender", e.target.value)}>
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="ppm-field">
                <span>ID number</span>
                <input value={form.idNumber} onChange={(e) => onField("idNumber", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Issue date</span>
                <input type="date" value={form.idIssueDate} onChange={(e) => onField("idIssueDate", e.target.value)} />
              </label>
              <label className="ppm-field ppm-field--full">
                <span>Issue place</span>
                <input value={form.idIssuePlace} onChange={(e) => onField("idIssuePlace", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Education level</span>
                <select value={form.educationLevel} onChange={(e) => onField("educationLevel", e.target.value)}>
                  <option value="">—</option>
                  <option value="high_school">High school</option>
                  <option value="vocational">Vocational</option>
                  <option value="college">College</option>
                  <option value="university">University</option>
                  <option value="master">Master</option>
                  <option value="phd">PhD</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="ppm-field">
                <span>Major</span>
                <input value={form.major} onChange={(e) => onField("major", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Emergency contact — name</span>
                <input value={form.emergencyContactName} onChange={(e) => onField("emergencyContactName", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Relationship</span>
                <input value={form.emergencyContactRelationship} onChange={(e) => onField("emergencyContactRelationship", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Emergency contact phone</span>
                <input value={form.emergencyContactPhone} onChange={(e) => onField("emergencyContactPhone", e.target.value)} />
              </label>
            </div>

            <div className="ppm-actions">
              <button type="button" className="ppm-btn secondary" onClick={onClose}>
                Close
              </button>
              <button type="submit" className="ppm-btn primary" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <form className="ppm-body" onSubmit={changePassword}>
            <p className="ppm-hint">New password must be at least 8 characters.</p>
            <label className="ppm-field ppm-field--full">
              <span>Current password</span>
              <input type="password" autoComplete="current-password" value={pwd.current} onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} required />
            </label>
            <label className="ppm-field ppm-field--full">
              <span>New password</span>
              <input type="password" autoComplete="new-password" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} required minLength={8} />
            </label>
            <label className="ppm-field ppm-field--full">
              <span>Confirm new password</span>
              <input type="password" autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} required minLength={8} />
            </label>
            <div className="ppm-actions">
              <button type="button" className="ppm-btn secondary" onClick={onClose}>
                Close
              </button>
              <button type="submit" className="ppm-btn primary" disabled={pwdSaving}>
                {pwdSaving ? "Processing…" : "Change password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
