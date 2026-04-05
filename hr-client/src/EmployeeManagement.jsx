import { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';

const CHANGE_TYPE_BADGE = {
  hire:               { bg: '#dcfce7', color: '#166534' },
  initial_assignment: { bg: '#e0f2fe', color: '#0c4a6e' },
  transfer:           { bg: '#ede9fe', color: '#5b21b6' },
  promotion:          { bg: '#fef3c7', color: '#92400e' },
  demotion:           { bg: '#fee2e2', color: '#991b1b' },
  initial_salary:     { bg: '#dbeafe', color: '#1e40af' },
  increase:           { bg: '#dcfce7', color: '#166534' },
  decrease:           { bg: '#fee2e2', color: '#991b1b' },
  correction:         { bg: '#e5e7eb', color: '#374151' },
  other:              { bg: '#e5e7eb', color: '#374151' },
};

const JOB_CHANGE_TYPES    = ['hire','initial_assignment','transfer','promotion','demotion','correction','other'];
const SALARY_CHANGE_TYPES = ['initial_salary','increase','decrease','correction','other'];

const API         = 'http://localhost:5000/api';
const SOCKET_URL  = 'http://localhost:5000';

// Các changeType khi nhận được sẽ trigger reload danh sách NV
const RELOAD_CHANGE_TYPES = new Set(['role', 'job', 'salary']);

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const EMPTY_FORM = {
  name: '', email: '', employeeCode: '', role: 'employee',
  departmentId: '', jobTitleId: '', phoneNumber: '', gender: '',
  dateOfBirth: '', contractType: '', startDate: '', baseSalary: '',
  effectiveDate: '', historyNote: '', salaryChangeReason: '',
};

// ─── Password Reveal Modal (UC-07.4) ──────────────────────────────────────────
function PasswordRevealModal({ info, onClose }) {
  const copy = () =>
    navigator.clipboard.writeText(info.password).then(() => alert('Đã sao chép!'));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Password Reset</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <p style={{ color: '#4a5568', marginBottom: 14 }}>
          Password for <strong>{info.name}</strong>{' '}
          <span style={{ color: '#718096' }}>({info.employeeCode})</span>{' '}
          has been reset. Copy and share with the employee:
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#f7fafc', border: '1px solid #e2e8f0',
          borderRadius: 8, padding: '12px 16px', marginBottom: 12,
        }}>
          <code style={{ flex: 1, fontSize: 22, fontWeight: 700, letterSpacing: 3, color: '#1a365d' }}>
            {info.password}
          </code>
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 12px', flexShrink: 0 }} onClick={copy}>
            Copy
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#a0aec0', marginBottom: 20 }}>
          Employee should change their password after the first login.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal (UC-07.2) ─────────────────────────────────────────────────────
function EditModal({ form, setField, onClose, onSave, saving, departments, jobTitles, isManager }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Update Employee Information</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={onSave}>
          {/* ── Basic Info ── */}
          <p className="form-section-label">Basic Information</p>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input required value={form.name} onChange={e => setField('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input required type="email" value={form.email} onChange={e => setField('email', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Employee Code</label>
              <input value={form.employeeCode} onChange={e => setField('employeeCode', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input value={form.phoneNumber} onChange={e => setField('phoneNumber', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Gender</label>
              <select value={form.gender} onChange={e => setField('gender', e.target.value)}>
                <option value="">— Select —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" value={form.dateOfBirth} onChange={e => setField('dateOfBirth', e.target.value)} />
            </div>
          </div>

          {/* ── Organization ── */}
          <p className="form-section-label" style={{ marginTop: 8 }}>Organization</p>
          <div className="form-row">
            <div className="form-group">
              <label>Department</label>
              <select value={form.departmentId} onChange={e => setField('departmentId', e.target.value)}>
                <option value="">— Select Department —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Job Title</label>
              <select value={form.jobTitleId} onChange={e => setField('jobTitleId', e.target.value)}>
                <option value="">— Select Job Title —</option>
                {jobTitles.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>
                Role
                {!isManager && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: '#a0aec0', fontWeight: 400 }}>
                    (Manager only)
                  </span>
                )}
              </label>
              {isManager ? (
                <select value={form.role} onChange={e => setField('role', e.target.value)}>
                  <option value="employee">Employee</option>
                  <option value="hr">HR Staff</option>
                  <option value="accountant">Accountant</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="manager">Manager</option>
                </select>
              ) : (
                <div style={{
                  padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6,
                  background: '#f7fafc', color: '#4a5568', fontSize: 14,
                }}>
                  {ROLE_LABEL[form.role] || form.role}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Contract Type</label>
              <select value={form.contractType} onChange={e => setField('contractType', e.target.value)}>
                <option value="">— Select —</option>
                <option value="probation">Probation</option>
                <option value="1_year">1 Year</option>
                <option value="3_year">3 Years</option>
                <option value="indefinite">Indefinite</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setField('startDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Base Salary (VND)</label>
              <input type="number" min="0" value={form.baseSalary} onChange={e => setField('baseSalary', e.target.value)} />
            </div>
          </div>

          {/* ── Change Notes ── */}
          <p className="form-section-label" style={{ marginTop: 8 }}>Change Notes</p>
          <div className="form-row">
            <div className="form-group">
              <label>Effective Date</label>
              <input type="date" value={form.effectiveDate} onChange={e => setField('effectiveDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Salary Change Reason</label>
              <input value={form.salaryChangeReason} onChange={e => setField('salaryChangeReason', e.target.value)} placeholder="E.g. Adjustment based on performance review" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ width: '100%' }}>
              <label>Notes</label>
              <textarea rows={3} value={form.historyNote} onChange={e => setField('historyNote', e.target.value)} placeholder="Describe job title / department / salary changes" style={{ resize: 'vertical' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────
const ROLE_META = {
  employee:   { label: 'Employee',   icon: '👤', bg: '#e2e8f0', color: '#4a5568' },
  hr:         { label: 'HR Staff',   icon: '👥', bg: '#c6f6d5', color: '#276749' },
  accountant: { label: 'Accountant', icon: '💰', bg: '#fefcbf', color: '#744210' },
  supervisor: { label: 'Supervisor', icon: '✅', bg: '#bee3f8', color: '#2c5282' },
  manager:    { label: 'Manager',    icon: '🏢', bg: '#e9d8fd', color: '#553c9a' },
};

const ROLE_LABEL = Object.fromEntries(
  Object.entries(ROLE_META).map(([k, v]) => [k, v.label])
);

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || ROLE_META.employee;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 12, background: meta.bg, color: meta.color,
      padding: '3px 10px', borderRadius: 999, fontWeight: 600,
    }}>
      <span style={{ fontSize: 13 }}>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

// ─── Main Component (UC-07) ───────────────────────────────────────────────────
export default function EmployeeManagement({ token, user }) {
  // ── data ──
  const [employees, setEmployees]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles]   = useState([]);

  // ── UI / filter ──
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ── modal ──
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [newPwInfo, setNewPwInfo]   = useState(null);

  // ── detail panel ──
  const [detailUser, setDetailUser]         = useState(null);
  const [detailLoading, setDetailLoading]   = useState(false);
  const [detailJobRows, setDetailJobRows]   = useState([]);
  const [detailSalaryRows, setDetailSalaryRows] = useState([]);
  const [detailJobMeta, setDetailJobMeta]   = useState({ page: 1, pageSize: 8, totalPages: 1, totalItems: 0 });
  const [detailSalaryMeta, setDetailSalaryMeta] = useState({ page: 1, pageSize: 8, totalPages: 1, totalItems: 0 });
  const [detailJobFilter, setDetailJobFilter]       = useState({ fromDate: '', toDate: '', changeType: '' });
  const [detailSalaryFilter, setDetailSalaryFilter] = useState({ fromDate: '', toDate: '', changeType: '' });
  const [detailJobPage, setDetailJobPage]     = useState(1);
  const [detailSalaryPage, setDetailSalaryPage] = useState(1);

  const isManager = user?.role === 'manager';
  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // ── load ──
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [empRes, deptRes, jtRes] = await Promise.all([
        fetch(`${API}/admin/employees`, { headers: authHeaders(token) }),
        fetch(`${API}/departments`,     { headers: authHeaders(token) }),
        fetch(`${API}/job-titles`,      { headers: authHeaders(token) }),
      ]);
      const [empData, deptData, jtData] = await Promise.all([
        empRes.json(), deptRes.json(), jtRes.json(),
      ]);
      setEmployees(empData.employees   || empData.data   || []);
      setDepartments(deptData.departments || deptData.data || []);
      setJobTitles(jtData.jobTitles   || jtData.data   || []);
    } catch (e) {
      setError('Failed to load data: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // ── real-time sync via Socket.io ──
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });

    socket.on('connect', () => {
      console.log('[Socket] HR client connected:', socket.id);
    });

    socket.on('new-notification', (payload) => {
      const changeType = payload?.metadata?.changeType;
      if (RELOAD_CHANGE_TYPES.has(changeType)) {
        load();
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    return () => { socket.disconnect(); };
  }, [load]);

  // ── filter (memoized) ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(emp => {
      const matchSearch =
        !q ||
        emp.name?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.employeeCode?.toLowerCase().includes(q);
      const matchDept =
        !filterDept || String(emp.departmentId) === filterDept;
      const matchStatus =
        filterStatus === ''     ? true :
        filterStatus === 'active'   ? emp.isActive :
        /* inactive */              !emp.isActive;
      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, search, filterDept, filterStatus]);

  // ── actions ──
  const openEdit = (emp) => {
    setEditing(emp);
    setForm({
      name:               emp.name        || '',
      email:              emp.email       || '',
      employeeCode:       emp.employeeCode || '',
      role:               emp.role        || 'employee',
      departmentId:       emp.departmentId || '',
      jobTitleId:         emp.jobTitleId  || '',
      phoneNumber:        emp.phoneNumber || '',
      gender:             emp.gender      || '',
      dateOfBirth:        emp.dateOfBirth  ? emp.dateOfBirth.slice(0, 10)  : '',
      contractType:       emp.contractType || '',
      startDate:          emp.startDate    ? emp.startDate.slice(0, 10)    : '',
      baseSalary:         emp.baseSalary   || '',
      effectiveDate:      '',
      historyNote:        '',
      salaryChangeReason: '',
    });
  };

  const closeEdit = () => { setEditing(null); };

  const save = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      // HR không được đổi role — loại khỏi body để backend không block
      const body = { ...form };
      if (!isManager) delete body.role;

      const res = await fetch(`${API}/admin/employees/${editing.id}`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status === 'success' || data.employee || data.data) {
        closeEdit();
        load();
      } else {
        alert(data.message || 'Error saving');
      }
    } catch (err) {
      alert('Cannot connect to server: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteEmployee = async (emp) => {
    if (!confirm(`Confirm delete employee "${emp.name}" (${emp.employeeCode})?`)) return;
    try {
      const res  = await fetch(`${API}/admin/employees/${emp.id}`, { method: 'DELETE', headers: authHeaders(token) });
      const data = await res.json();
      if (data.status === 'success') {
        load();
      } else {
        alert(data.message || 'Error deleting employee');
      }
    } catch (err) {
      alert('Cannot connect to server: ' + err.message);
    }
  };

  const resetPassword = async (emp) => {
    if (!confirm(`Reset password for "${emp.name}" (${emp.employeeCode})?`)) return;
    try {
      const res  = await fetch(`${API}/admin/employees/${emp.id}/reset-password`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNewPwInfo({
          name:         data.employeeName  || emp.name,
          employeeCode: data.employeeCode  || emp.employeeCode,
          password:     data.newPassword,
        });
      } else {
        alert(data.message || 'Error resetting password');
      }
    } catch (err) {
      alert('Cannot connect to server: ' + err.message);
    }
  };

  // ── detail panel logic ──
  const viewDetails = async (emp) => {
    setDetailJobFilter({ fromDate: '', toDate: '', changeType: '' });
    setDetailSalaryFilter({ fromDate: '', toDate: '', changeType: '' });
    setDetailJobPage(1);
    setDetailSalaryPage(1);
    setDetailJobRows([]);
    setDetailSalaryRows([]);
    setDetailJobMeta({ page: 1, pageSize: 8, totalPages: 1, totalItems: 0 });
    setDetailSalaryMeta({ page: 1, pageSize: 8, totalPages: 1, totalItems: 0 });
    setDetailUser({ ...emp, _loading: true });
    setDetailLoading(true);
    try {
      const res  = await fetch(`${API}/admin/employees/${emp.id}/details`, { headers: authHeaders(token) });
      const data = await res.json();
      setDetailUser(res.ok && data.employee ? data.employee : { ...emp, jobHistory: [], salaryChangeHistory: [] });
    } catch {
      setDetailUser({ ...emp, jobHistory: [], salaryChangeHistory: [] });
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchHistoryForDetail = useCallback(async (historyType) => {
    if (!detailUser?.id) return;
    const filter = historyType === 'job' ? detailJobFilter : detailSalaryFilter;
    const page   = historyType === 'job' ? detailJobPage   : detailSalaryPage;
    const params = new URLSearchParams({ historyType, page: String(page), pageSize: '8' });
    if (filter.fromDate)   params.set('fromDate',   filter.fromDate);
    if (filter.toDate)     params.set('toDate',     filter.toDate);
    if (filter.changeType) params.set('changeType', filter.changeType);
    try {
      setDetailLoading(true);
      const res  = await fetch(`${API}/admin/employees/${detailUser.id}/history?${params}`, { headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok) return;
      if (historyType === 'job') {
        setDetailJobRows(data.jobHistory || []);
        setDetailJobMeta(prev => ({ ...prev, ...(data.jobPagination || {}) }));
      } else {
        setDetailSalaryRows(data.salaryChangeHistory || []);
        setDetailSalaryMeta(prev => ({ ...prev, ...(data.salaryPagination || {}) }));
      }
    } finally {
      setDetailLoading(false);
    }
  }, [detailUser?.id, detailJobFilter, detailSalaryFilter, detailJobPage, detailSalaryPage, token]);

  useEffect(() => {
    if (detailUser?.id) fetchHistoryForDetail('job');
  }, [detailUser?.id, detailJobFilter.fromDate, detailJobFilter.toDate, detailJobFilter.changeType, detailJobPage]); // eslint-disable-line

  useEffect(() => {
    if (detailUser?.id) fetchHistoryForDetail('salary');
  }, [detailUser?.id, detailSalaryFilter.fromDate, detailSalaryFilter.toDate, detailSalaryFilter.changeType, detailSalaryPage]); // eslint-disable-line

  // ── render ──
  return (
    <div>
      {/* Toolbar */}
      <div className="emp-toolbar">
        <input
          className="emp-search"
          placeholder="Search by name, email, employee code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="emp-filter-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
        </select>
        <select className="emp-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 14px', flexShrink: 0 }} onClick={load} title="Reload">
          ↻ Reload
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ padding: 0 }}>
        {/* Summary bar */}
        <div className="emp-summary-bar">
          <span>
            Showing <strong>{filtered.length}</strong> / {employees.length} employees
          </span>
          {(search || filterDept || filterStatus) && (
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '3px 10px' }}
              onClick={() => { setSearch(''); setFilterDept(''); setFilterStatus(''); }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading">Loading employees...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Emp. Code</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Job Title</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2b6cb0', fontSize: 13 }}>
                        {emp.employeeCode || '—'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: '#1a202c' }}>{emp.name}</td>
                    <td style={{ color: '#718096', fontSize: 13 }}>{emp.email}</td>
                    <td style={{ color: '#4a5568' }}>{emp.Department?.name || '—'}</td>
                    <td style={{ color: '#4a5568' }}>{emp.JobTitle?.name || '—'}</td>
                    <td><RoleBadge role={emp.role} /></td>
                    <td>
                      <span className={`badge ${emp.isActive ? 'badge-active' : 'badge-inactive'}`}>
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="emp-actions">
                        <button
                          className="btn-tbl btn-tbl-details"
                          onClick={() => viewDetails(emp)}
                          title="Xem chi tiết lịch sử"
                        >
                          Details
                        </button>
                        <button
                          className="btn-tbl btn-tbl-edit"
                          onClick={() => openEdit(emp)}
                          title="Chỉnh sửa thông tin (UC-07.2)"
                        >
                          Edit /<br />Info
                        </button>
                        <button
                          className="btn-tbl btn-tbl-reset"
                          onClick={() => resetPassword(emp)}
                          title="Đặt lại mật khẩu (UC-07.4)"
                        >
                          Reset<br />Password
                        </button>
                        <button
                          className="btn-tbl btn-tbl-delete"
                          onClick={() => deleteEmployee(emp)}
                          title="Xóa nhân viên (UC-07.3)"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="loading">
                {employees.length === 0 ? 'No employees found.' : 'No employees match the current filters.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* UC-07.2 — Edit modal */}
      {editing && (
        <EditModal
          form={form}
          setField={setField}
          onClose={closeEdit}
          onSave={save}
          saving={saving}
          departments={departments}
          jobTitles={jobTitles}
          isManager={isManager}
        />
      )}

      {/* UC-07 — Details Modal */}
      {detailUser && (
        <div className="modal-overlay" onClick={() => setDetailUser(null)}>
          <div className="detail-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-header">
              <h3>Employee Details: {detailUser.name}</h3>
              <button className="close-btn" onClick={() => setDetailUser(null)}>×</button>
            </div>

            {detailLoading && detailUser._loading && (
              <div className="loading">Loading...</div>
            )}

            {/* General Info */}
            <div className="detail-section" style={{ marginBottom: 16 }}>
              <div className="detail-section-title">General Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 24px', fontSize: 13 }}>
                <div><span style={{ color: '#718096' }}>Emp. Code:</span> <strong style={{ fontFamily: 'monospace', color: '#2b6cb0' }}>{detailUser.employeeCode || '—'}</strong></div>
                <div><span style={{ color: '#718096' }}>Email:</span> {detailUser.email || '—'}</div>
                <div><span style={{ color: '#718096' }}>Phone:</span> {detailUser.phoneNumber || '—'}</div>
                <div><span style={{ color: '#718096' }}>Department:</span> {detailUser.Department?.name || detailUser.department?.name || '—'}</div>
                <div><span style={{ color: '#718096' }}>Job Title:</span> {detailUser.JobTitle?.name || detailUser.jobTitle?.name || '—'}</div>
                <div><span style={{ color: '#718096' }}>Role:</span> <RoleBadge role={detailUser.role} /></div>
                <div><span style={{ color: '#718096' }}>Status:</span>{' '}
                  <span className={`badge ${detailUser.isActive ? 'badge-active' : 'badge-inactive'}`}>
                    {detailUser.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div><span style={{ color: '#718096' }}>Start Date:</span> {detailUser.startDate ? detailUser.startDate.slice(0,10) : '—'}</div>
                <div><span style={{ color: '#718096' }}>Base Salary:</span> {detailUser.baseSalary ? Number(detailUser.baseSalary).toLocaleString('vi-VN') + ' ₫' : '—'}</div>
              </div>
            </div>

            {/* Job History */}
            <div className="detail-section" style={{ marginBottom: 16 }}>
              <div className="detail-section-title">Job History</div>
              <div className="detail-filter-row">
                <input className="detail-filter-input" type="date" value={detailJobFilter.fromDate}
                  onChange={e => { setDetailJobFilter(f => ({ ...f, fromDate: e.target.value })); setDetailJobPage(1); }} />
                <input className="detail-filter-input" type="date" value={detailJobFilter.toDate}
                  onChange={e => { setDetailJobFilter(f => ({ ...f, toDate: e.target.value })); setDetailJobPage(1); }} />
                <select className="detail-filter-input" value={detailJobFilter.changeType}
                  onChange={e => { setDetailJobFilter(f => ({ ...f, changeType: e.target.value })); setDetailJobPage(1); }}>
                  <option value="">All Types</option>
                  {JOB_CHANGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button className="detail-filter-input" style={{ cursor: 'pointer', background: '#f1f5f9' }}
                  onClick={() => { setDetailJobFilter({ fromDate: '', toDate: '', changeType: '' }); setDetailJobPage(1); }}>
                  Clear
                </button>
              </div>
              {detailJobRows.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13, padding: '8px 0' }}>No job history available.</div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="detail-history-table">
                      <thead>
                        <tr><th>Effective Date</th><th>Type</th><th>Department</th><th>Job Title</th></tr>
                      </thead>
                      <tbody>
                        {detailJobRows.map(h => (
                          <tr key={h.id}>
                            <td>{h.effectiveDate || '—'}</td>
                            <td>
                              <span className="change-badge" style={CHANGE_TYPE_BADGE[h.changeType] || CHANGE_TYPE_BADGE.other}>
                                {h.changeType || 'other'}
                              </span>
                            </td>
                            <td>{h.fromDepartmentName || '—'} → {h.toDepartmentName || '—'}</td>
                            <td>{h.fromJobTitleName || '—'} → {h.toJobTitleName || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {detailJobMeta.totalItems > 0 && (
                    <div className="detail-pagination">
                      <button className="detail-filter-input" style={{ cursor: detailJobPage <= 1 ? 'not-allowed' : 'pointer' }}
                        disabled={detailJobPage <= 1} onClick={() => setDetailJobPage(p => Math.max(1, p - 1))}>← Prev</button>
                      <span>Page {detailJobMeta.currentPage || detailJobPage} / {detailJobMeta.totalPages || 1}</span>
                      <button className="detail-filter-input" style={{ cursor: detailJobPage >= (detailJobMeta.totalPages || 1) ? 'not-allowed' : 'pointer' }}
                        disabled={detailJobPage >= (detailJobMeta.totalPages || 1)} onClick={() => setDetailJobPage(p => p + 1)}>Next →</button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Salary History */}
            <div className="detail-section">
              <div className="detail-section-title">Salary Change History</div>
              <div className="detail-filter-row">
                <input className="detail-filter-input" type="date" value={detailSalaryFilter.fromDate}
                  onChange={e => { setDetailSalaryFilter(f => ({ ...f, fromDate: e.target.value })); setDetailSalaryPage(1); }} />
                <input className="detail-filter-input" type="date" value={detailSalaryFilter.toDate}
                  onChange={e => { setDetailSalaryFilter(f => ({ ...f, toDate: e.target.value })); setDetailSalaryPage(1); }} />
                <select className="detail-filter-input" value={detailSalaryFilter.changeType}
                  onChange={e => { setDetailSalaryFilter(f => ({ ...f, changeType: e.target.value })); setDetailSalaryPage(1); }}>
                  <option value="">All Types</option>
                  {SALARY_CHANGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button className="detail-filter-input" style={{ cursor: 'pointer', background: '#f1f5f9' }}
                  onClick={() => { setDetailSalaryFilter({ fromDate: '', toDate: '', changeType: '' }); setDetailSalaryPage(1); }}>
                  Clear
                </button>
              </div>
              {detailSalaryRows.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13, padding: '8px 0' }}>No salary changes available.</div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="detail-history-table">
                      <thead>
                        <tr><th>Effective Date</th><th>Type</th><th>Old → New Salary</th><th>Reason</th></tr>
                      </thead>
                      <tbody>
                        {detailSalaryRows.map(h => (
                          <tr key={h.id}>
                            <td>{h.effectiveDate || '—'}</td>
                            <td>
                              <span className="change-badge" style={CHANGE_TYPE_BADGE[h.changeType] || CHANGE_TYPE_BADGE.other}>
                                {h.changeType || 'other'}
                              </span>
                            </td>
                            <td>
                              {Number(h.previousBaseSalary || 0).toLocaleString('vi-VN')} ₫
                              {' → '}
                              {Number(h.newBaseSalary || 0).toLocaleString('vi-VN')} ₫
                            </td>
                            <td>{h.reason || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {detailSalaryMeta.totalItems > 0 && (
                    <div className="detail-pagination">
                      <button className="detail-filter-input" style={{ cursor: detailSalaryPage <= 1 ? 'not-allowed' : 'pointer' }}
                        disabled={detailSalaryPage <= 1} onClick={() => setDetailSalaryPage(p => Math.max(1, p - 1))}>← Prev</button>
                      <span>Page {detailSalaryMeta.currentPage || detailSalaryPage} / {detailSalaryMeta.totalPages || 1}</span>
                      <button className="detail-filter-input" style={{ cursor: detailSalaryPage >= (detailSalaryMeta.totalPages || 1) ? 'not-allowed' : 'pointer' }}
                        disabled={detailSalaryPage >= (detailSalaryMeta.totalPages || 1)} onClick={() => setDetailSalaryPage(p => p + 1)}>Next →</button>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* UC-07.4 — Password reveal */}
      {newPwInfo && (
        <PasswordRevealModal info={newPwInfo} onClose={() => setNewPwInfo(null)} />
      )}
    </div>
  );
}
