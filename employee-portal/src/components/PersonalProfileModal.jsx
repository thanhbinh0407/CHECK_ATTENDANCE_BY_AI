import React, { useCallback, useEffect, useState } from "react";
import "./personalProfileModal.css";

const ROLE_LABEL_VI = {
  manager: "Giám đốc / Quản trị",
  hr: "Nhân sự",
  accountant: "Kế toán",
  supervisor: "Quản lý",
  employee: "Nhân viên",
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
        setMessage({ type: "err", text: data.message || "Không tải được hồ sơ" });
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
      setMessage({ type: "err", text: e.message || "Lỗi mạng" });
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
        setMessage({ type: "err", text: data.message || "Lưu thất bại" });
        return;
      }
      setUser(data.user);
      setMessage({ type: "ok", text: "Đã lưu hồ sơ." });
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
      setMessage({ type: "err", text: "Mật khẩu mới tối thiểu 8 ký tự." });
      return;
    }
    if (pwd.next !== pwd.confirm) {
      setMessage({ type: "err", text: "Mật khẩu mới và xác nhận không khớp." });
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
        setMessage({ type: "err", text: data.message || "Đổi mật khẩu thất bại" });
        return;
      }
      setPwd({ current: "", next: "", confirm: "" });
      setMessage({ type: "ok", text: "Đã đổi mật khẩu thành công." });
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
        setMessage({ type: "err", text: data.message || "Tải ảnh thất bại" });
        return;
      }
      if (data.user) setUser(data.user);
      setMessage({ type: "ok", text: "Đã cập nhật ảnh đại diện." });
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
          <h2 id="ppm-title">Hồ sơ cá nhân</h2>
          <button type="button" className="ppm-close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        <div className="ppm-tabs">
          <button
            type="button"
            className={tab === "profile" ? "ppm-tab active" : "ppm-tab"}
            onClick={() => setTab("profile")}
          >
            Thông tin & ảnh
          </button>
          <button
            type="button"
            className={tab === "password" ? "ppm-tab active" : "ppm-tab"}
            onClick={() => setTab("password")}
          >
            Đổi mật khẩu
          </button>
        </div>

        {message.text ? (
          <div className={`ppm-msg ${message.type === "ok" ? "ppm-msg--ok" : "ppm-msg--err"}`}>{message.text}</div>
        ) : null}

        {loading ? (
          <div className="ppm-loading">Đang tải…</div>
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
                  {avatarUploading ? "Đang tải lên…" : "Chọn ảnh đại diện"}
                </label>
                <p className="ppm-hint">JPEG, PNG hoặc WebP · tối đa 2MB</p>
              </div>
            </div>

            <div className="ppm-readonly-grid">
              <div>
                <span className="ppm-label">Email đăng nhập</span>
                <div className="ppm-ro">{user?.email || "—"}</div>
              </div>
              <div>
                <span className="ppm-label">Mã nhân viên</span>
                <div className="ppm-ro">{user?.employeeCode || "—"}</div>
              </div>
              <div>
                <span className="ppm-label">Vai trò</span>
                <div className="ppm-ro">{ROLE_LABEL_VI[user?.role] || user?.role || "—"}</div>
              </div>
              <div>
                <span className="ppm-label">Phòng ban</span>
                <div className="ppm-ro">{user?.Department?.name || "—"}</div>
              </div>
              <div>
                <span className="ppm-label">Chức danh</span>
                <div className="ppm-ro">{user?.JobTitle?.name || "—"}</div>
              </div>
            </div>

            <h3 className="ppm-section-title">Chỉnh sửa thông tin</h3>
            <div className="ppm-grid">
              <label className="ppm-field">
                <span>Họ tên *</span>
                <input value={form.name} onChange={(e) => onField("name", e.target.value)} required />
              </label>
              <label className="ppm-field">
                <span>Số điện thoại</span>
                <input value={form.phoneNumber} onChange={(e) => onField("phoneNumber", e.target.value)} />
              </label>
              <label className="ppm-field ppm-field--full">
                <span>Địa chỉ</span>
                <input value={form.address} onChange={(e) => onField("address", e.target.value)} />
              </label>
              <label className="ppm-field ppm-field--full">
                <span>Địa chỉ thường trú</span>
                <input value={form.permanentAddress} onChange={(e) => onField("permanentAddress", e.target.value)} />
              </label>
              <label className="ppm-field ppm-field--full">
                <span>Địa chỉ tạm trú</span>
                <input value={form.temporaryAddress} onChange={(e) => onField("temporaryAddress", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Email cá nhân</span>
                <input type="email" value={form.personalEmail} onChange={(e) => onField("personalEmail", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Email công ty</span>
                <input type="email" value={form.companyEmail} onChange={(e) => onField("companyEmail", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Ngày sinh</span>
                <input type="date" value={form.dateOfBirth} onChange={(e) => onField("dateOfBirth", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Giới tính</span>
                <select value={form.gender} onChange={(e) => onField("gender", e.target.value)}>
                  <option value="">—</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </label>
              <label className="ppm-field">
                <span>CMND / CCCD</span>
                <input value={form.idNumber} onChange={(e) => onField("idNumber", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Ngày cấp</span>
                <input type="date" value={form.idIssueDate} onChange={(e) => onField("idIssueDate", e.target.value)} />
              </label>
              <label className="ppm-field ppm-field--full">
                <span>Nơi cấp</span>
                <input value={form.idIssuePlace} onChange={(e) => onField("idIssuePlace", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Trình độ</span>
                <select value={form.educationLevel} onChange={(e) => onField("educationLevel", e.target.value)}>
                  <option value="">—</option>
                  <option value="high_school">THPT</option>
                  <option value="vocational">Trung cấp nghề</option>
                  <option value="college">Cao đẳng</option>
                  <option value="university">Đại học</option>
                  <option value="master">Thạc sĩ</option>
                  <option value="phd">Tiến sĩ</option>
                  <option value="other">Khác</option>
                </select>
              </label>
              <label className="ppm-field">
                <span>Chuyên ngành</span>
                <input value={form.major} onChange={(e) => onField("major", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Liên hệ khẩn cấp — tên</span>
                <input value={form.emergencyContactName} onChange={(e) => onField("emergencyContactName", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>Quan hệ</span>
                <input value={form.emergencyContactRelationship} onChange={(e) => onField("emergencyContactRelationship", e.target.value)} />
              </label>
              <label className="ppm-field">
                <span>SĐT liên hệ khẩn cấp</span>
                <input value={form.emergencyContactPhone} onChange={(e) => onField("emergencyContactPhone", e.target.value)} />
              </label>
            </div>

            <div className="ppm-actions">
              <button type="button" className="ppm-btn secondary" onClick={onClose}>
                Đóng
              </button>
              <button type="submit" className="ppm-btn primary" disabled={saving}>
                {saving ? "Đang lưu…" : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        ) : (
          <form className="ppm-body" onSubmit={changePassword}>
            <p className="ppm-hint">Mật khẩu mới tối thiểu 8 ký tự.</p>
            <label className="ppm-field ppm-field--full">
              <span>Mật khẩu hiện tại</span>
              <input type="password" autoComplete="current-password" value={pwd.current} onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} required />
            </label>
            <label className="ppm-field ppm-field--full">
              <span>Mật khẩu mới</span>
              <input type="password" autoComplete="new-password" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} required minLength={8} />
            </label>
            <label className="ppm-field ppm-field--full">
              <span>Xác nhận mật khẩu mới</span>
              <input type="password" autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} required minLength={8} />
            </label>
            <div className="ppm-actions">
              <button type="button" className="ppm-btn secondary" onClick={onClose}>
                Đóng
              </button>
              <button type="submit" className="ppm-btn primary" disabled={pwdSaving}>
                {pwdSaving ? "Đang xử lý…" : "Đổi mật khẩu"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
