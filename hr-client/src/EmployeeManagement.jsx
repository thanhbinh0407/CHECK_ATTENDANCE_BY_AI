import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { toastConfirm, toastError, toastSuccess, toastWarning, toastPrompt } from './lib/notify.jsx';

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

const ANNUAL_LEAVE_QUOTA_DAYS = 12;
const ADDITIONAL_ANNUAL_LEAVE_EVERY_5_YEARS = 1;


const API         = 'http://localhost:5000/api';
const SOCKET_URL  = 'http://localhost:5000';

// Change types that should trigger employee list reload
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
    navigator.clipboard.writeText(info.password).then(() => toastSuccess('Copied to clipboard.'));

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

// ─── Create Modal (server generates initial password) ─────────────────────────
function CreateEmployeeModal({ form, setField, onClose, onSave, saving, departments, jobTitles }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add employee</h3>
          <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>
        <p style={{ fontSize: 12, color: '#718096', marginBottom: 14 }}>
          Employee code and email must be unique. Initial login password will be shown after successful creation.
        </p>
        <form onSubmit={onSave}>
          <p className="form-section-label">Basic information</p>
          <div className="form-row">
            <div className="form-group">
              <label>Full name *</label>
              <input required value={form.name} onChange={e => setField('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input required type="email" value={form.email} onChange={e => setField('email', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Employee code *</label>
              <input required value={form.employeeCode} onChange={e => setField('employeeCode', e.target.value)} placeholder="Ex: EMP001" />
            </div>
            <div className="form-group">
              <label>Phone number</label>
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
              <label>Date of birth</label>
              <input type="date" value={form.dateOfBirth} onChange={e => setField('dateOfBirth', e.target.value)} />
            </div>
          </div>
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
              <label>Job title</label>
              <select value={form.jobTitleId} onChange={e => setField('jobTitleId', e.target.value)}>
                <option value="">— Select Job Title —</option>
                {jobTitles.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Contract type</label>
              <select value={form.contractType} onChange={e => setField('contractType', e.target.value)}>
                <option value="">— Select —</option>
                <optgroup label="Probation Contracts">
                  <option value="probation_3_month">Probation (3 months)</option>
                  <option value="probation_6_month">Probation (6 months)</option>
                </optgroup>
                <optgroup label="Formal Contracts">
                  <option value="formal_1_year">Formal (1 year)</option>
                  <option value="formal_2_year">Formal (2 years)</option>
                  <option value="formal_3_year">Formal (3 years)</option>
                </optgroup>
              </select>
            </div>
            <div className="form-group">
              <label>Start date</label>
              <input type="date" value={form.startDate} onChange={e => setField('startDate', e.target.value)} />
              <div style={{ marginTop: 6, color: '#4a5568', fontSize: 12 }}>
                Annual leave defaults to 12 days/year and increases +1 day every 5 years of service.
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Base salary (VND)</label>
              <input type="number" min="0" value={form.baseSalary} onChange={e => setField('baseSalary', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Effective date (history)</label>
              <input type="date" value={form.effectiveDate} onChange={e => setField('effectiveDate', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Salary adjustment reason</label>
              <input value={form.salaryChangeReason} onChange={e => setField('salaryChangeReason', e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 2, minWidth: 280 }}>
              <label>Change notes</label>
              <textarea rows={2} value={form.historyNote} onChange={e => setField('historyNote', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create employee'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Modal (UC-07.2) ─────────────────────────────────────────────────────
function EditModal({ form, setField, onClose, onSave, saving, departments, jobTitles, isManager, isContractEditable = true }) {
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
              <select value={form.contractType} onChange={e => setField('contractType', e.target.value)} disabled={!isContractEditable}>
                <option value="">— Select —</option>
                <optgroup label="Probation Contracts">
                  <option value="probation_3_month">Probation (3 months)</option>
                  <option value="probation_6_month">Probation (6 months)</option>
                </optgroup>
                <optgroup label="Formal Contracts">
                  <option value="formal_1_year">Formal (1 year)</option>
                  <option value="formal_2_year">Formal (2 years)</option>
                  <option value="formal_3_year">Formal (3 years)</option>
                </optgroup>
              </select>
              {!isContractEditable && (
                <div style={{ marginTop: 6, color: '#a0aec0', fontSize: 12 }}>
                  Contract editing disabled while employment is suspended.
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setField('startDate', e.target.value)} disabled={!isContractEditable} />
              <div style={{ marginTop: 6, color: '#4a5568', fontSize: 12 }}>
                Annual leave is 12 days/year, plus +1 day every 5 years of service.
              </div>
            </div>
          </div>
          <div className="form-row">
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

function AnnualLeaveConfigModal({ form, setField, onClose, onSave, saving, baseDays, additionalEvery5Years }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Annual Leave Policy</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={onSave}>
          <p style={{ color: '#4a5568', marginBottom: 16, fontSize: 13 }}>
            This setting updates the maximum annual leave quota shown for all employees.
          </p>

          <div className="form-row">
            <div className="form-group">
              <label>Base annual leave days *</label>
              <input
                required
                type="number"
                min="0"
                value={form.baseDays}
                onChange={e => setField('baseDays', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Extra days every 5 years</label>
              <input
                required
                type="number"
                min="0"
                value={form.additionalEvery5Years}
                onChange={e => setField('additionalEvery5Years', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13, color: '#4a5568' }}>
            <div>Current values:</div>
            <div>{baseDays} + {additionalEvery5Years} every 5 years</div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Maternity Leave Modal ────────────────────────────────────────────────────
function MaternityLeaveModal({ employee, form, setForm, onClose, onConfirm, saving }) {
  if (!employee) return null;

  // Auto-calculate end date when start date changes
  const handleStartDateChange = (value) => {
    setForm({ ...form, startDate: value });
    
    if (value) {
      const startDate = new Date(value);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 6);
      setForm(prev => ({ 
        ...prev, 
        startDate: value,
        endDate: endDate.toISOString().split('T')[0] 
      }));
    } else {
      setForm(prev => ({ ...prev, startDate: value, endDate: '' }));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Maternity Leave Suspension</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <p style={{ color: '#4a5568', marginBottom: 16, fontSize: 13 }}>
          Suspend account for <strong>{employee.name}</strong> ({employee.employeeCode}) due to maternity leave.
          Account will be automatically reactivated after the suspension period ends.
        </p>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>Start date *</label>
          <input
            required
            type="date"
            value={form.startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>End date *</label>
          <input
            required
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            disabled={saving}
          />
          <small style={{ color: '#0c4a6e', display: 'block', marginTop: 4 }}>
            Auto-calculated as 6 months from start date, but can be edited
          </small>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={saving || !form.startDate || !form.endDate}
          >
            {saving ? 'Suspending...' : 'Confirm Suspension'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [filterRole, setFilterRole] = useState('');
  const [filterJobTitle, setFilterJobTitle] = useState('');
  const [filterContract, setFilterContract] = useState('');
  const [listMode, setListMode] = useState('active'); // active | inactive

  // ── modal ──
  const [editing, setEditing]       = useState(null);
  const [creating, setCreating]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [newPwInfo, setNewPwInfo]   = useState(null);
  /** { message: string, tone: 'deny' | 'warn' } — toast tự tắt sau 4s */
  const [actionToast, setActionToast] = useState(null);
  const toastTimerRef = useRef(null);

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
  const [annualLeaveBaseDays, setAnnualLeaveBaseDays] = useState(() => {
    const saved = Number(localStorage.getItem('hrAnnualLeaveBaseDays'));
    return Number.isFinite(saved) && saved > 0 ? saved : ANNUAL_LEAVE_QUOTA_DAYS;
  });
  const [annualLeaveAdditionalEvery5Years, setAnnualLeaveAdditionalEvery5Years] = useState(() => {
    const saved = Number(localStorage.getItem('hrAnnualLeaveAdditionalEvery5Years'));
    return Number.isFinite(saved) && saved >= 0 ? saved : ADDITIONAL_ANNUAL_LEAVE_EVERY_5_YEARS;
  });
  const [leaveConfigOpen, setLeaveConfigOpen] = useState(false);
  const [leaveConfigForm, setLeaveConfigForm] = useState({
    baseDays: annualLeaveBaseDays,
    additionalEvery5Years: annualLeaveAdditionalEvery5Years,
  });

  // ── maternity leave suspension ──
  const [maternityEmployee, setMaternityEmployee] = useState(null);
  const [maternityForm, setMaternityForm] = useState({
    startDate: '',
    endDate: '',
    reason: 'maternity_leave', // mặc định là thai sản
  });
  const [maternitySaving, setMaternitySaving] = useState(false);

  const isManager = user?.role === 'manager';
  const actorId = user?.id ?? user?.userId ?? null;

  const canShowAccountLifecycleActions = (emp) => {
    if (actorId == null || Number(emp.id) === Number(actorId)) return false;
    if (user?.role === 'hr' && emp.role !== 'employee') return false;
    return true;
  };

  const isEmployeeInactive = useCallback((employee) => {
    if (!employee) return false;
    const st = String(employee.employmentStatus || '').toLowerCase();
    // Maternity leave không tính là inactive - tài khoản vẫn hoạt động được
    if (st === 'maternity_leave') return false;
    return employee.isActive === false || st === 'suspended' || st === 'terminated' || st === 'resigned';
  }, []);

  const getEmployeeAnnualLeaveTotal = useCallback((employee) => {
    if (!employee?.startDate) return annualLeaveBaseDays;
    const start = new Date(employee.startDate);
    if (Number.isNaN(start.getTime())) return annualLeaveBaseDays;
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    if (now.getMonth() < start.getMonth() || (now.getMonth() === start.getMonth() && now.getDate() < start.getDate())) {
      years -= 1;
    }
    years = Math.max(0, years);
    return annualLeaveBaseDays + Math.floor(years / 5) * annualLeaveAdditionalEvery5Years;
  }, [annualLeaveBaseDays, annualLeaveAdditionalEvery5Years]);

  const getContractDaysLabel = useCallback((employee) => {
    const contractType = employee?.contractType;
    if (!contractType) return '—';
    if (contractType === 'indefinite') return 'Indefinite';

    const durationByType = {
      probation_3_month: 3,
      probation_6_month: 6,
      formal_1_year: 12,
      formal_2_year: 24,
      formal_3_year: 36,
    };

    const months = durationByType[contractType];
    if (!months || !employee?.startDate) return '—';

    const start = new Date(employee.startDate);
    if (Number.isNaN(start.getTime())) return '—';

    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + months);
    endDate.setHours(23, 59, 59, 999);

    const now = new Date();
    const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Helper to format date as M/D/YYYY
    const formatLocalDate = (d) => {
      if (!d) return '—';
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return '—';
      return `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`;
    };

    // If we're showing the inactive list, prefer explicit suspension/expiration dates
    if (listMode === 'inactive' || isEmployeeInactive(employee)) {
      const status = String(employee?.employmentStatus || '').toLowerCase();
      if (status === 'suspended') {
        const suspDate = employee.deactivatedAt || employee.suspensionDate || employee.updatedAt || null;
        return suspDate ? `Suspension Date: ${formatLocalDate(suspDate)}` : 'Suspended';
      }

      if (endDate) {
        return endDate < now ? `Expired on ${formatLocalDate(endDate)}` : `${diffDays} days`;
      }
    }

    if (diffDays > 0) return `${diffDays} days`;
    if (diffDays === 0) return 'Expires today';
    return `Expired ${Math.abs(diffDays)} days`;
  }, []);

  const getContractDaysRemaining = useCallback((employee) => {
    const contractType = employee?.contractType;
    if (!contractType || contractType === 'indefinite' || !employee?.startDate) return null;

    const durationByType = {
      probation_3_month: 3,
      probation_6_month: 6,
      formal_1_year: 12,
      formal_2_year: 24,
      formal_3_year: 36,
    };

    const months = durationByType[contractType];
    if (!months) return null;

    const start = new Date(employee.startDate);
    if (Number.isNaN(start.getTime())) return null;

    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + months);
    endDate.setHours(23, 59, 59, 999);

    const now = new Date();
    const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  const openLeaveConfig = () => {
    setLeaveConfigForm({ baseDays: annualLeaveBaseDays, additionalEvery5Years: annualLeaveAdditionalEvery5Years });
    setLeaveConfigOpen(true);
  };

  const setLeaveConfigField = (key, value) => {
    setLeaveConfigForm(prev => ({ ...prev, [key]: value }));
  };

  const saveLeaveConfig = (e) => {
    e.preventDefault();
    const baseDays = Number(leaveConfigForm.baseDays);
    const additionalEvery5Years = Number(leaveConfigForm.additionalEvery5Years);
    if (!Number.isFinite(baseDays) || baseDays < 0 || !Number.isFinite(additionalEvery5Years) || additionalEvery5Years < 0) {
      toastError('Please enter valid numbers for annual leave settings.');
      return;
    }
    setAnnualLeaveBaseDays(baseDays);
    setAnnualLeaveAdditionalEvery5Years(additionalEvery5Years);
    localStorage.setItem('hrAnnualLeaveBaseDays', String(baseDays));
    localStorage.setItem('hrAnnualLeaveAdditionalEvery5Years', String(additionalEvery5Years));
    setLeaveConfigOpen(false);
    toastSuccess('Annual leave settings updated for all employees.');
  };

  const pushActionToast = (message, tone = 'warn') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setActionToast({ message, tone });
    toastTimerRef.current = setTimeout(() => {
      setActionToast(null);
      toastTimerRef.current = null;
    }, 4000);
  };

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

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
      const matchRole =
        !filterRole || emp.role === filterRole;
      const matchJt =
        !filterJobTitle || String(emp.jobTitleId) === filterJobTitle;
      const matchContract =
        !filterContract || (filterContract === 'maternity' 
          ? String(emp?.employmentStatus || '').toLowerCase() === 'maternity_leave'
          : emp.contractType === filterContract);
      const matchList =
        listMode === 'active' ? !isEmployeeInactive(emp) : isEmployeeInactive(emp);
      return matchSearch && matchDept && matchRole && matchJt && matchContract && matchList;
    });
  }, [employees, search, filterDept, filterRole, filterJobTitle, filterContract, listMode, isEmployeeInactive]);

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

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setCreating(true);
  };

  const closeCreate = () => { setCreating(false); };

  const saveCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: form.name,
        email: form.email,
        employeeCode: form.employeeCode,
        departmentId: form.departmentId || null,
        jobTitleId: form.jobTitleId || null,
        phoneNumber: form.phoneNumber || null,
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
        contractType: form.contractType || null,
        startDate: form.startDate || null,
        baseSalary: form.baseSalary === '' ? undefined : form.baseSalary,
        effectiveDate: form.effectiveDate || null,
        historyNote: form.historyNote || null,
        salaryChangeReason: form.salaryChangeReason || null,
      };
      const res = await fetch(`${API}/admin/employees`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && (data.status === 'success' || data.employee)) {
        closeCreate();
        if (data.newPassword) {
          setNewPwInfo({
            name: data.employee?.name || form.name,
            employeeCode: data.employee?.employeeCode || form.employeeCode,
            password: data.newPassword,
          });
        }
        load();
      } else {
        toastError(data.message || 'Cannot create employee');
      }
    } catch (err) {
      toastError('Cannot connect to server: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      // HR cannot change role, remove from body to avoid backend rejection
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
        toastError(data.message || 'Error saving');
      }
    } catch (err) {
      toastError('Cannot connect to server: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteEmployee = async (emp) => {
    const ok = await toastConfirm({ message: `Deactivate "${emp.name}" (${emp.employeeCode})?` });
    if (!ok) return;
    const roleLabel = user?.role === 'manager' ? 'Manager' : 'HR';
    const password = await toastPrompt({
      message: `Enter ${roleLabel} password to confirm deactivation:`,
      inputType: 'password',
    });
    if (password === null) return;
    if (!String(password).trim()) {
      toastWarning('Password is required.');
      return;
    }
    try {
      const res  = await fetch(`${API}/admin/employees/${emp.id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        load();
        toastSuccess('Employee deactivated.');
      } else {
        const msg = data.message || 'Error deactivating employee';
        if (data.code === 'NO_PERMISSION_ADMIN') pushActionToast(msg, 'deny');
        else if (data.code === 'HR_EMPLOYEE_ONLY') pushActionToast(msg, 'warn');
        else toastError(msg);
      }
    } catch (err) {
      toastError('Cannot connect to server: ' + err.message);
    }
  };

  const restoreEmployee = async (emp) => {
    const ok = await toastConfirm({ message: `Restore "${emp.name}" (${emp.employeeCode})?` });
    if (!ok) return;
    try {
      const res = await fetch(`${API}/admin/employees/${emp.id}/restore`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.status === 'success') {
        load();
        toastSuccess('Employee restored.');
      } else {
        const msg = data.message || 'Error restoring employee';
        if (data.code === 'NO_PERMISSION_ADMIN') pushActionToast(msg, 'deny');
        else if (data.code === 'HR_EMPLOYEE_ONLY') pushActionToast(msg, 'warn');
        else toastError(msg);
      }
    } catch (err) {
      toastError('Cannot connect to server: ' + err.message);
    }
  };

  const permanentlyDeleteEmployee = async (emp) => {
    const ok = await toastConfirm({
      message: `Permanently delete "${emp.name}" (${emp.employeeCode})?\n\nThis cannot be undone.`,
    });
    if (!ok) return;
    const roleLabel = user?.role === 'manager' ? 'Manager' : 'HR';
    const password = await toastPrompt({
      message: `Enter ${roleLabel} password to confirm permanent delete:`,
      inputType: 'password',
    });
    if (password === null) return;
    if (!String(password).trim()) {
      toastWarning('Password is required.');
      return;
    }
    try {
      const res = await fetch(`${API}/admin/employees/${emp.id}/permanent`, {
        method: 'DELETE',
        headers: authHeaders(token),
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        load();
        toastSuccess('Employee permanently deleted.');
      } else {
        const msg = data.message || 'Error permanently deleting employee';
        if (data.code === 'NO_PERMISSION_ADMIN') pushActionToast(msg, 'deny');
        else if (data.code === 'HR_EMPLOYEE_ONLY') pushActionToast(msg, 'warn');
        else toastError(msg);
      }
    } catch (err) {
      toastError('Cannot connect to server: ' + err.message);
    }
  };

  const handleMaternityLeave = async () => {
    if (!maternityEmployee || !maternityForm.startDate || !maternityForm.endDate) {
      toastError('Please select both start date and end date');
      return;
    }

    setMaternitySaving(true);
    try {
      const res = await fetch(`${API}/admin/employees/${maternityEmployee.id}`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({
          employmentStatus: 'maternity_leave',
          maternityStartDate: maternityForm.startDate,
          maternityEndDate: maternityForm.endDate,
          lastUpdatedBy: actorId,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMaternityEmployee(null);
        const empToUpdate = maternityEmployee;
        setMaternityForm({ startDate: '', endDate: '', reason: 'maternity_leave' });
        
        // Update detail view if employee details modal is open
        if (detailUser && detailUser.id === empToUpdate.id) {
          setDetailUser(prev => ({
            ...prev,
            employmentStatus: 'maternity_leave',
            maternityStartDate: maternityForm.startDate,
            maternityEndDate: maternityForm.endDate
          }));
        }
        
        load();
        const endDate = new Date(maternityForm.endDate);
        toastSuccess(`Maternity leave activated for ${empToUpdate.name} (${empToUpdate.employeeCode}). Suspended until ${endDate.toLocaleDateString()}`);
      } else {
        toastError(data.message || 'Error applying maternity leave');
      }
    } catch (err) {
      toastError('Cannot connect to server: ' + err.message);
    } finally {
      setMaternitySaving(false);
    }
  };

  const resetPassword = async (emp) => {
    const ok = await toastConfirm({ message: `Reset password for "${emp.name}" (${emp.employeeCode})?` });
    if (!ok) return;
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
        toastSuccess('Password reset. New password shown in the dialog.');
      } else {
        toastError(data.message || 'Error resetting password');
      }
    } catch (err) {
      toastError('Cannot connect to server: ' + err.message);
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
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            className={`btn ${listMode === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 13, padding: '8px 14px' }}
            onClick={() => setListMode('active')}
            type="button"
          >
            Employee list
          </button>
          <button
            className={`btn ${listMode === 'inactive' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 13, padding: '8px 14px' }}
            onClick={() => setListMode('inactive')}
            type="button"
          >
            Inactive list
          </button>
        </div>
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
        {/* '+ Add employee' is intentionally hidden in HR Portal. Employee creation is handled by Manager only. */}
        <button className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 14px', flexShrink: 0 }} onClick={load} title="Reload">
          ↻ Reload
        </button>
      </div>

      <div className="emp-toolbar" style={{ marginTop: 0, marginBottom: 8 }}>
        <select className="emp-filter-select" value={filterRole} onChange={e => setFilterRole(e.target.value)} aria-label="Filter by role">
          <option value="">All roles</option>
          <option value="employee">Employee</option>
          <option value="hr">HR Staff</option>
          <option value="accountant">Accountant</option>
          <option value="supervisor">Supervisor</option>
          <option value="manager">Manager</option>
        </select>
        <select className="emp-filter-select" value={filterJobTitle} onChange={e => setFilterJobTitle(e.target.value)} aria-label="Filter by job title">
          <option value="">All job titles</option>
          {jobTitles.map(j => <option key={j.id} value={String(j.id)}>{j.name}</option>)}
        </select>
        <select className="emp-filter-select" value={filterContract} onChange={e => setFilterContract(e.target.value)} aria-label="Filter by contract type">
          <option value="">All contract types</option>
          <option value="maternity">Maternity</option>
          <option value="probation_3_month">Probation (3 months)</option>
          <option value="probation_6_month">Probation (6 months)</option>
          <option value="formal_1_year">Formal (1 year)</option>
          <option value="formal_2_year">Formal (2 years)</option>
          <option value="formal_3_year">Formal (3 years)</option>
        </select>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ padding: 0 }}>
        {/* Summary bar */}
        <div className="emp-summary-bar">
          <span>
            {listMode === 'active' ? 'Active' : 'Inactive'}: <strong>{filtered.length}</strong> /
            {' '}
            {employees.length} employees
          </span>
          {(search || filterDept || filterRole || filterJobTitle || filterContract) && (
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '3px 10px' }}
              onClick={() => {
                setSearch('');
                setFilterDept('');
                setFilterRole('');
                setFilterJobTitle('');
                setFilterContract('');
              }}
            >
              Clear filters
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
                  <th>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span>Annual Leave</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openLeaveConfig(); }}
                        title="Edit annual leave policy"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#334155',
                          cursor: 'pointer',
                          fontSize: 14,
                          padding: 0,
                        }}
                      >
                        ✏️
                      </button>
                    </div>
                  </th>
                  <th>Role</th>
                  <th>{user?.role === 'hr' ? 'Contract Days' : 'Status'}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr
                    key={emp.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => viewDetails(emp)}
                    title="Click to view details"
                  >
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2b6cb0', fontSize: 13 }}>
                        {emp.employeeCode || '—'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: '#1a202c' }}>{emp.name}</td>
                    <td style={{ color: '#718096', fontSize: 13 }}>{emp.email}</td>
                    <td style={{ color: '#4a5568' }}>{emp.Department?.name || '—'}</td>
                    <td style={{ color: '#2b6cb0', fontWeight: 700 }}>
                      <span>{Number(emp.leaveBalance?.remaining ?? getEmployeeAnnualLeaveTotal(emp))}/{getEmployeeAnnualLeaveTotal(emp)}</span>
                    </td>
                    <td><RoleBadge role={emp.role} /></td>
                    <td>
                      {String(emp?.employmentStatus || '').toLowerCase() === 'maternity_leave' ? (
                        <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontWeight: 600 }}>
                          🤰 Maternity
                        </span>
                      ) : user?.role === 'hr' ? (
                        (() => {
                          const daysRemaining = getContractDaysRemaining(emp);
                          const isWarning = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;
                          const isExpired = daysRemaining !== null && daysRemaining <= 0;
                          return (
                            <span style={{
                              fontWeight: 600,
                              color: isExpired ? '#dc2626' : isWarning ? '#dc2626' : '#334155',
                              backgroundColor: isWarning || isExpired ? '#fee2e2' : 'transparent',
                              padding: isWarning || isExpired ? '4px 8px' : '0',
                              borderRadius: isWarning || isExpired ? '4px' : '0',
                            }}>
                              {getContractDaysLabel(emp)}
                            </span>
                          );
                        })()
                      ) : (
                        <span className={`badge ${isEmployeeInactive(emp) ? 'badge-inactive' : 'badge-active'}`}>
                          {isEmployeeInactive(emp) ? 'Inactive' : 'Active'}
                        </span>
                      )}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="emp-actions">
                        <button
                          type="button"
                          className="btn-tbl btn-tbl-details"
                          onClick={() => viewDetails(emp)}
                          title="View details and history"
                        >
                          Details
                        </button>
                        {listMode !== 'inactive' && user?.role !== 'hr' && (
                          <button
                            type="button"
                            className="btn-tbl btn-tbl-edit"
                            onClick={() => openEdit(emp)}
                            title="Edit employee information (UC-07.2)"
                          >
                            Edit
                          </button>
                        )}
                        {listMode !== 'inactive' && (
                          <button
                            type="button"
                            className="btn-tbl btn-tbl-reset"
                            onClick={() => resetPassword(emp)}
                            title="Reset password (UC-07.4)"
                          >
                            Reset PW
                          </button>
                        )}
                        {canShowAccountLifecycleActions(emp) && !isEmployeeInactive(emp) && (
                          <button
                            type="button"
                            className="btn-tbl btn-tbl-edit"
                            onClick={() => { setMaternityEmployee(emp); setMaternityForm({ startDate: '', endDate: '', reason: 'maternity_leave' }); }}
                            title="Suspend for maternity leave (6 months)"
                            style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
                          >
                            Maternity
                          </button>
                        )}
                        {canShowAccountLifecycleActions(emp) && !isEmployeeInactive(emp) && (
                          <button
                            type="button"
                            className="btn-tbl btn-tbl-delete"
                            onClick={() => deleteEmployee(emp)}
                            title="Deactivate account"
                          >
                            Deactivate
                          </button>
                        )}
                        {canShowAccountLifecycleActions(emp) && isEmployeeInactive(emp) && listMode !== 'inactive' && (
                          <button
                            type="button"
                            className="btn-tbl btn-tbl-restore"
                            onClick={() => restoreEmployee(emp)}
                            title="Restore account"
                          >
                            Restore
                          </button>
                        )}
                        {canShowAccountLifecycleActions(emp) && isEmployeeInactive(emp) && (
                          <button
                            type="button"
                            className="btn-tbl-delete-forever"
                            onClick={() => permanentlyDeleteEmployee(emp)}
                            title="Permanently delete (password required)"
                          >
                            <span className="btn-tbl-delete-forever-icon" aria-hidden="true">🗑</span>
                            <span>Delete Forever</span>
                          </button>
                        )}
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

      {creating && (
        <CreateEmployeeModal
          form={form}
          setField={setField}
          onClose={closeCreate}
          onSave={saveCreate}
          saving={saving}
          departments={departments}
          jobTitles={jobTitles}
        />
      )}

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
          isContractEditable={String(editing?.employmentStatus || '').toLowerCase() !== 'suspended'}
        />
      )}

      {leaveConfigOpen && (
        <AnnualLeaveConfigModal
          form={leaveConfigForm}
          setField={setLeaveConfigField}
          onClose={() => setLeaveConfigOpen(false)}
          onSave={saveLeaveConfig}
          saving={false}
          baseDays={annualLeaveBaseDays}
          additionalEvery5Years={annualLeaveAdditionalEvery5Years}
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
                <div style={{ marginBottom: 6 }}>
                  <span style={{ color: '#718096' }}>Annual Leave:</span> {Number(detailUser.leaveStats?.totalDaysUsed || 0)}/{getEmployeeAnnualLeaveTotal(detailUser)}
                </div>
                <div style={{ color: '#4a5568', fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
                  Note: Annual leave increases by +1 day every 5 years of service.
                </div>
                <div><span style={{ color: '#718096' }}>Role:</span> <RoleBadge role={detailUser.role} /></div>
                <div><span style={{ color: '#718096' }}>Status:</span>{' '}
                  {detailUser.employmentStatus === 'maternity_leave' ? (
                    <span style={{ color: '#dc2626', fontSize: 13 }}>
                      Maternity: {detailUser.maternityStartDate?.slice(0, 10) || '—'} to {detailUser.maternityEndDate?.slice(0, 10) || '—'}
                    </span>
                  ) : (
                    (() => {
                      const daysRemaining = getContractDaysRemaining(detailUser);
                      const isWarning = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;
                      const isExpired = daysRemaining !== null && daysRemaining <= 0;
                      return (
                        <span style={{
                          fontSize: 13,
                          color: isExpired ? '#dc2626' : isWarning ? '#dc2626' : '#2563eb',
                          backgroundColor: isWarning || isExpired ? '#fee2e2' : 'transparent',
                          padding: isWarning || isExpired ? '2px 6px' : '0',
                          borderRadius: isWarning || isExpired ? '3px' : '0',
                          fontWeight: isWarning || isExpired ? 600 : 400,
                        }}>
                          {getContractDaysLabel(detailUser)}
                        </span>
                      );
                    })()
                  )}
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

            {/* Salary Change History — Hidden */}

          </div>
        </div>
      )}

      {actionToast && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 10000,
            maxWidth: 380,
            padding: '14px 18px',
            borderRadius: 12,
            boxShadow: '0 10px 40px rgba(15, 23, 42, 0.18)',
            borderLeft: `4px solid ${actionToast.tone === 'deny' ? '#dc2626' : '#ca8a04'}`,
            background: actionToast.tone === 'deny'
              ? 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)'
              : 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)',
            color: '#1e293b',
            fontSize: 14,
            lineHeight: 1.45,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden>{actionToast.tone === 'deny' ? '⛔' : '⚠️'}</span>
          <div>
            <div style={{
              fontWeight: 700,
              marginBottom: 4,
              color: actionToast.tone === 'deny' ? '#991b1b' : '#854d0e',
            }}>
              {actionToast.tone === 'deny' ? 'Không đủ quyền' : 'Lưu ý'}
            </div>
            <div>{actionToast.message}</div>
          </div>
        </div>
      )}

      {/* UC-07.4 — Password reveal */}
      {newPwInfo && (
        <PasswordRevealModal info={newPwInfo} onClose={() => setNewPwInfo(null)} />
      )}

      {/* Maternity Leave Modal */}
      {maternityEmployee && (
        <MaternityLeaveModal
          employee={maternityEmployee}
          form={maternityForm}
          setForm={setMaternityForm}
          onClose={() => setMaternityEmployee(null)}
          onConfirm={handleMaternityLeave}
          saving={maternitySaving}
        />
      )}
    </div>
  );
}
