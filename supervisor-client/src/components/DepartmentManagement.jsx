import { Fragment, useCallback, useEffect, useState } from 'react';
import { theme } from '../theme.js';
import { toastConfirm } from '../lib/notify.jsx';

const PlusIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EditIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const DeleteIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const CloseIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SaveIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const CancelIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

/** Department Management — aligned with Manager Console (face-attendance-frontend) UI and CRUD behavior. */
export default function DepartmentManagement({ token }) {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [expandedDepartmentId, setExpandedDepartmentId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeHistoryLoading, setEmployeeHistoryLoading] = useState(false);
  const [employeeTransferHistory, setEmployeeTransferHistory] = useState([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    managerId: null,
    isActive: true,
  });

  const apiBase = (import.meta.env.VITE_API_BASE || 'http://localhost:5000').replace(/\/$/, '');

  const fetchDepartments = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setMessage('');
      const res = await fetch(`${apiBase}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setDepartments(data.departments || []);
      } else {
        setMessage(data.message || 'Error loading departments list');
      }

      try {
        const employeeRes = await fetch(`${apiBase}/api/admin/employees`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const employeeData = await employeeRes.json();
        if (employeeRes.ok) {
          setEmployees(Array.isArray(employeeData.employees) ? employeeData.employees : []);
        } else if (res.ok) {
          setEmployees([]);
          setMessage(employeeData.message || 'Error loading employees list');
        }
      } catch {
        if (res.ok) {
          setEmployees([]);
          setMessage('Error connecting to server while loading employees');
        }
      }
    } catch {
      setMessage('Error connecting to server');
    } finally {
      setLoading(false);
    }
  }, [apiBase, token]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    try {
      const url = editingDept
        ? `${apiBase}/api/departments/${editingDept.id}`
        : `${apiBase}/api/departments`;
      const method = editingDept ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(editingDept ? 'Department updated successfully' : 'Department created successfully');
        setShowForm(false);
        setEditingDept(null);
        setFormData({ code: '', name: '', description: '', managerId: null, isActive: true });
        fetchDepartments();
      } else {
        setMessage(data.message || 'An error occurred');
      }
    } catch {
      setMessage('Error connecting to server');
    }
  };

  const handleEdit = (dept) => {
    setEditingDept(dept);
    setFormData({
      code: dept.code,
      name: dept.name,
      description: dept.description || '',
      managerId: dept.managerId,
      isActive: dept.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const ok = await toastConfirm({ message: 'Are you sure you want to delete this department?' });
    if (!ok) return;
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/api/departments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Department deleted successfully');
        fetchDepartments();
      } else {
        setMessage(data.message || 'An error occurred');
      }
    } catch {
      setMessage('Error connecting to server');
    }
  };

  const toggleDepartmentEmployees = (departmentId) => {
    setExpandedDepartmentId((current) => (current === departmentId ? null : departmentId));
  };

  const openEmployeeTransferHistory = async (employee) => {
    if (!employee?.id || !token) return;

    setSelectedEmployee(employee);
    setEmployeeHistoryLoading(true);
    setEmployeeTransferHistory([]);

    try {
      const res = await fetch(`${apiBase}/api/admin/employees/${employee.id}/history?historyType=job&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setEmployeeTransferHistory(Array.isArray(data.jobHistory) ? data.jobHistory : []);
      } else {
        setMessage(data.message || 'Unable to load employee history');
      }
    } catch {
      setMessage('Error connecting to server while loading employee history');
    } finally {
      setEmployeeHistoryLoading(false);
    }
  };

  const closeEmployeeHistory = () => {
    setSelectedEmployee(null);
    setEmployeeTransferHistory([]);
    setEmployeeHistoryLoading(false);
  };

  const accentFocus = '#8b46ff';

  return (
    <>
      <style>{`
        @keyframes supDeptFadeInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes supDeptFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes supDeptSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes supDeptTableRowFadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div className="sup-mgmt-page">
        <div className="sup-mgmt-hero">
          <h2>Department Management</h2>
          <p>Manage and organize company departments</p>
        </div>

        <div className="sup-mgmt-toolbar">
          <button
            type="button"
            className="sup-mgmt-btn-add"
            onClick={() => {
              setShowForm(true);
              setEditingDept(null);
              setFormData({ code: '', name: '', description: '', managerId: null, isActive: true });
            }}
          >
            <PlusIcon size={18} />
            Add Department
          </button>
        </div>

        {message && (
          <div
            style={{
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              marginBottom: theme.spacing.md,
              backgroundColor: message.includes('successfully') ? '#d4edda' : '#f8d7da',
              color: message.includes('successfully') ? '#155724' : '#721c24',
              borderRadius: theme.radius.md,
              display: 'inline-block',
              width: 'fit-content',
              border: `1px solid ${message.includes('successfully') ? '#c3e6cb' : '#f5c6cb'}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              fontSize: '14px',
              fontWeight: '500',
              animation: 'supDeptFadeIn 0.3s ease-out',
              fontFamily: theme.typography.fontFamily,
            }}
          >
            {message.includes('successfully') ? '✅' : '❌'} {message}
          </div>
        )}

        {showForm && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              animation: 'supDeptFadeIn 0.3s ease-out',
            }}
            onClick={() => {
              setShowForm(false);
              setEditingDept(null);
            }}
          >
            <div
              style={{
                backgroundColor: theme.neutral.white,
                padding: theme.spacing.xl,
                borderRadius: theme.radius.lg,
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflowY: 'auto',
                animation: 'supDeptSlideUp 0.3s ease-out',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  background: editingDept
                    ? 'linear-gradient(90deg, #7029d1 0%, #8b46ff 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  padding: theme.spacing.xl,
                  borderRadius: theme.radius.lg,
                  marginBottom: theme.spacing.xl,
                  margin: `-${theme.spacing.xl} -${theme.spacing.xl} ${theme.spacing.xl} -${theme.spacing.xl}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '24px',
                      fontWeight: '700',
                      color: theme.neutral.white,
                      fontFamily: theme.typography.fontFamily,
                    }}
                  >
                    {editingDept ? '✏️ Edit Department' : '➕ Add New Department'}
                  </h3>
                  <p
                    style={{
                      margin: '8px 0 0 0',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '14px',
                      fontFamily: theme.typography.fontFamily,
                    }}
                  >
                    {editingDept ? 'Update department information' : 'Create a new department'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingDept(null);
                  }}
                  style={{
                    padding: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    cursor: 'pointer',
                    color: theme.neutral.white,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: theme.radius.md,
                    transition: 'all 0.2s',
                    width: '40px',
                    height: '40px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.transform = 'rotate(90deg) scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
                  }}
                >
                  <CloseIcon size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: theme.spacing.lg,
                    marginBottom: theme.spacing.lg,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: theme.spacing.sm,
                        fontWeight: '700',
                        fontSize: '13px',
                        color: theme.neutral.gray700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontFamily: theme.typography.fontFamily,
                      }}
                    >
                      Department Code *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      required
                      placeholder="e.g., IT, HR, FIN"
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                        border: `2px solid ${theme.neutral.gray300}`,
                        borderRadius: theme.radius.md,
                        fontSize: '15px',
                        transition: 'all 0.2s',
                        outline: 'none',
                        backgroundColor: theme.neutral.gray50,
                        fontFamily: theme.typography.fontFamily,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = accentFocus;
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                        e.currentTarget.style.backgroundColor = theme.neutral.white;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = theme.neutral.gray300;
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.backgroundColor = theme.neutral.gray50;
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: theme.spacing.sm,
                        fontWeight: '700',
                        fontSize: '13px',
                        color: theme.neutral.gray700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontFamily: theme.typography.fontFamily,
                      }}
                    >
                      Department Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g., Information Technology"
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                        border: `2px solid ${theme.neutral.gray300}`,
                        borderRadius: theme.radius.md,
                        fontSize: '15px',
                        transition: 'all 0.2s',
                        outline: 'none',
                        backgroundColor: theme.neutral.gray50,
                        fontFamily: theme.typography.fontFamily,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = accentFocus;
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                        e.currentTarget.style.backgroundColor = theme.neutral.white;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = theme.neutral.gray300;
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.backgroundColor = theme.neutral.gray50;
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: theme.spacing.xl }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: theme.spacing.sm,
                      fontWeight: '700',
                      fontSize: '13px',
                      color: theme.neutral.gray700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontFamily: theme.typography.fontFamily,
                    }}
                  >
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Enter department description..."
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                      border: `2px solid ${theme.neutral.gray300}`,
                      borderRadius: theme.radius.md,
                      fontSize: '15px',
                      fontFamily: theme.typography.fontFamily,
                      resize: 'vertical',
                      transition: 'all 0.2s',
                      outline: 'none',
                      backgroundColor: theme.neutral.gray50,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = accentFocus;
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                      e.currentTarget.style.backgroundColor = theme.neutral.white;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = theme.neutral.gray300;
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.backgroundColor = theme.neutral.gray50;
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: theme.spacing.md,
                    justifyContent: 'flex-end',
                    paddingTop: theme.spacing.lg,
                    borderTop: `2px solid ${theme.neutral.gray200}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingDept(null);
                    }}
                    title="Cancel"
                    style={{
                      padding: '12px',
                      backgroundColor: theme.neutral.gray200,
                      color: theme.neutral.gray700,
                      border: 'none',
                      borderRadius: theme.radius.md,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '48px',
                      height: '48px',
                      transition: 'all 0.3s',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.neutral.gray300;
                      e.currentTarget.style.transform = 'scale(1.1) rotate(-5deg)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme.neutral.gray200;
                      e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    }}
                  >
                    <CancelIcon size={20} />
                  </button>
                  <button
                    type="submit"
                    title={editingDept ? 'Update Department' : 'Create Department'}
                    style={{
                      padding: '12px',
                      backgroundColor: editingDept ? accentFocus : '#10b981',
                      color: theme.neutral.white,
                      border: 'none',
                      borderRadius: theme.radius.md,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '48px',
                      height: '48px',
                      boxShadow: editingDept
                        ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                        : '0 4px 12px rgba(16, 185, 129, 0.3)',
                      transition: 'all 0.3s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
                      e.currentTarget.style.boxShadow = editingDept
                        ? '0 6px 20px rgba(102, 126, 234, 0.4)'
                        : '0 6px 20px rgba(16, 185, 129, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                      e.currentTarget.style.boxShadow = editingDept
                        ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                        : '0 4px 12px rgba(16, 185, 129, 0.3)';
                    }}
                  >
                    <SaveIcon size={20} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div
            style={{
              padding: theme.spacing.xl,
              textAlign: 'center',
              color: theme.neutral.gray600,
              fontSize: '16px',
              fontFamily: theme.typography.fontFamily,
            }}
          >
            Loading...
          </div>
        ) : departments.length === 0 ? (
          <div
            style={{
              padding: theme.spacing.xl,
              textAlign: 'center',
              color: theme.neutral.gray600,
              fontSize: '16px',
              backgroundColor: theme.neutral.white,
              borderRadius: theme.radius.lg,
              boxShadow: theme.shadows.md,
              fontFamily: theme.typography.fontFamily,
            }}
          >
            No departments found
          </div>
        ) : (
          <div
            className="card sup-mgmt-table-shell"
            style={{
              animation: 'supDeptFadeInUp 0.5s ease-out',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table className="sup-mgmt-table">
                <thead>
                  <tr>
                    {['Code', 'Name', 'Description', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: h === 'Actions' ? 'right' : 'left',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept, index) => {
                    const departmentEmployees = employees.filter((employee) => Number(employee.departmentId) === Number(dept.id));
                    const isExpanded = expandedDepartmentId === dept.id;

                    return (
                      <Fragment key={dept.id}>
                        <tr
                          style={{
                            animation: `supDeptTableRowFadeIn 0.4s ease-out ${index * 0.05}s both`,
                          }}
                        >
                          <td className="sup-mgmt-code">
                            {dept.code}
                          </td>
                          <td style={{ fontWeight: 600, color: theme.neutral.gray900 }}>
                            {dept.name}
                          </td>
                          <td
                            className="sup-mgmt-desc-cell"
                            style={{
                              color: theme.neutral.gray600,
                              lineHeight: 1.5,
                              fontSize: 13,
                            }}
                          >
                            {dept.description?.trim() ? dept.description : '—'}
                          </td>
                          <td>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: theme.radius.md,
                                backgroundColor: dept.isActive ? '#d4edda' : '#f8d7da',
                                color: dept.isActive ? '#155724' : '#721c24',
                                fontSize: '11px',
                                fontWeight: '700',
                                border: `1px solid ${dept.isActive ? '#c3e6cb' : '#f5c6cb'}`,
                                fontFamily: theme.typography.fontFamily,
                              }}
                            >
                              {dept.isActive ? '✓ Active' : '✗ Inactive'}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => toggleDepartmentEmployees(dept.id)}
                              title="View employees"
                              style={{
                                padding: '7px 12px',
                                marginRight: theme.spacing.sm,
                                backgroundColor: isExpanded ? '#7c3aed' : '#eef2ff',
                                color: isExpanded ? theme.neutral.white : '#4338ca',
                                border: '1px solid rgba(99, 102, 241, 0.18)',
                                borderRadius: theme.radius.md,
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: 12,
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.1)',
                              }}
                            >
                              {departmentEmployees.length} staff
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEdit(dept)}
                              title="Edit"
                              style={{
                                padding: '7px',
                                backgroundColor: accentFocus,
                                color: theme.neutral.white,
                                border: 'none',
                                borderRadius: theme.radius.md,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '34px',
                                height: '34px',
                                transition: 'all 0.3s',
                                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.2)';
                              }}
                            >
                              <EditIcon size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(dept.id)}
                              title="Delete"
                              style={{
                                padding: '7px',
                                backgroundColor: theme.error.main,
                                color: theme.neutral.white,
                                border: 'none',
                                borderRadius: theme.radius.md,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '34px',
                                height: '34px',
                                transition: 'all 0.3s',
                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)',
                                marginLeft: theme.spacing.sm,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.1) rotate(-5deg)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.2)';
                              }}
                            >
                              <DeleteIcon size={16} />
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} style={{ padding: 0, backgroundColor: '#f8fafc' }}>
                              <div style={{ padding: '14px 18px 18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                                  <div>
                                    <div style={{ fontWeight: 700, color: theme.neutral.gray900, marginBottom: 4 }}>
                                      Employees in {dept.name}
                                    </div>
                                    <div style={{ fontSize: 12, color: theme.neutral.gray600 }}>
                                      {departmentEmployees.length} people assigned to this department
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleDepartmentEmployees(dept.id)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      color: '#4f46e5',
                                      cursor: 'pointer',
                                      fontWeight: 700,
                                    }}
                                  >
                                    Hide list
                                  </button>
                                </div>
                                {departmentEmployees.length === 0 ? (
                                  <div style={{ padding: '14px 16px', borderRadius: 12, backgroundColor: theme.neutral.white, border: '1px dashed #cbd5e1', color: theme.neutral.gray600 }}>
                                    No employees assigned to this department yet.
                                  </div>
                                ) : (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                                    {departmentEmployees.map((employee) => (
                                      <div
                                        key={employee.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => openEmployeeTransferHistory(employee)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            openEmployeeTransferHistory(employee);
                                          }
                                        }}
                                        style={{
                                          padding: '12px 14px',
                                          borderRadius: 14,
                                          backgroundColor: theme.neutral.white,
                                          border: '1px solid #e2e8f0',
                                          boxShadow: '0 6px 18px rgba(15, 23, 42, 0.05)',
                                          cursor: 'pointer',
                                          transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform = 'translateY(-2px)';
                                          e.currentTarget.style.boxShadow = '0 10px 22px rgba(15, 23, 42, 0.10)';
                                          e.currentTarget.style.borderColor = '#8b46ff';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'translateY(0)';
                                          e.currentTarget.style.boxShadow = '0 6px 18px rgba(15, 23, 42, 0.05)';
                                          e.currentTarget.style.borderColor = '#e2e8f0';
                                        }}
                                      >
                                        <div style={{ fontWeight: 700, color: theme.neutral.gray900, marginBottom: 4 }}>
                                          {employee.name}
                                        </div>
                                        <div style={{ fontSize: 12, color: theme.neutral.gray600, marginBottom: 6 }}>
                                          {employee.employeeCode || 'No code'} · {employee.JobTitle?.name || employee.role || 'Employee'}
                                        </div>
                                        <div style={{ fontSize: 12, color: theme.neutral.gray500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {employee.email}
                                        </div>
                                      </div>
                                    ))}

                                  {selectedEmployee && (
                                    <div
                                      style={{
                                        position: 'fixed',
                                        inset: 0,
                                        backgroundColor: 'rgba(15, 23, 42, 0.55)',
                                        zIndex: 2000,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 20,
                                      }}
                                      onClick={closeEmployeeHistory}
                                    >
                                      <div
                                        style={{
                                          width: 'min(920px, 100%)',
                                          maxHeight: '86vh',
                                          overflow: 'auto',
                                          backgroundColor: theme.neutral.white,
                                          borderRadius: 18,
                                          boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div
                                          style={{
                                            padding: '18px 22px',
                                            background: 'linear-gradient(135deg, #7c3aed 0%, #8b46ff 100%)',
                                            color: theme.neutral.white,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: 12,
                                          }}
                                        >
                                          <div>
                                            <div style={{ fontSize: 20, fontWeight: 800 }}>Transfer History</div>
                                            <div style={{ fontSize: 13, opacity: 0.92, marginTop: 4 }}>
                                              {selectedEmployee.name} · {selectedEmployee.employeeCode || 'No code'}
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={closeEmployeeHistory}
                                            style={{
                                              border: 'none',
                                              background: 'rgba(255,255,255,0.18)',
                                              color: theme.neutral.white,
                                              width: 38,
                                              height: 38,
                                              borderRadius: 12,
                                              cursor: 'pointer',
                                              fontSize: 18,
                                              fontWeight: 800,
                                            }}
                                          >
                                            ×
                                          </button>
                                        </div>

                                        <div style={{ padding: 22 }}>
                                          {employeeHistoryLoading ? (
                                            <div style={{ padding: 24, textAlign: 'center', color: theme.neutral.gray600 }}>
                                              Loading history...
                                            </div>
                                          ) : employeeTransferHistory.length === 0 ? (
                                            <div style={{ padding: 24, textAlign: 'center', color: theme.neutral.gray600, backgroundColor: '#f8fafc', borderRadius: 14, border: '1px dashed #cbd5e1' }}>
                                              No department transfer history found for this employee.
                                            </div>
                                          ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                              {employeeTransferHistory.map((item) => {
                                                const isDepartmentChanged = item.fromDepartmentId !== item.toDepartmentId;
                                                const dateStr = item.effectiveDate
                                                  ? new Date(item.effectiveDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                                                  : '—';
                                                const changeTypeLabel = {
                                                  hire: 'Hire',
                                                  initial_assignment: 'Initial assignment',
                                                  transfer: 'Department transfer',
                                                  promotion: 'Promotion',
                                                  demotion: 'Demotion',
                                                  correction: 'Correction',
                                                  other: 'Change',
                                                }[item.changeType] || item.changeType || 'Change';

                                                return (
                                                  <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 16, backgroundColor: '#fff' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                                                      <div>
                                                        <div style={{ fontWeight: 800, color: theme.neutral.gray900 }}>{dateStr}</div>
                                                        <div style={{ fontSize: 12, color: theme.neutral.gray500, marginTop: 4 }}>{changeTypeLabel}</div>
                                                      </div>
                                                      {item.changedBy && (
                                                        <div style={{ fontSize: 12, color: theme.neutral.gray600, alignSelf: 'center' }}>
                                                          Changed by: <strong>{item.changedBy.name}</strong>
                                                        </div>
                                                      )}
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                                                      <div style={{ padding: 12, borderRadius: 12, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                                        <div style={{ fontSize: 11, fontWeight: 800, color: theme.neutral.gray500, textTransform: 'uppercase' }}>From Department</div>
                                                        <div style={{ marginTop: 6, fontWeight: 700, color: theme.neutral.gray800 }}>{item.fromDepartmentName || '—'}</div>
                                                      </div>
                                                      <div style={{ padding: 12, borderRadius: 12, backgroundColor: isDepartmentChanged ? '#f3e8ff' : '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#7c3aed' }}>
                                                        →
                                                      </div>
                                                      <div style={{ padding: 12, borderRadius: 12, backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}>
                                                        <div style={{ fontSize: 11, fontWeight: 800, color: theme.neutral.gray500, textTransform: 'uppercase' }}>To Department</div>
                                                        <div style={{ marginTop: 6, fontWeight: 700, color: theme.neutral.gray800 }}>{item.toDepartmentName || '—'}</div>
                                                      </div>
                                                    </div>

                                                    {item.notes && (
                                                      <div style={{ marginTop: 12, fontSize: 13, color: theme.neutral.gray600, lineHeight: 1.6 }}>
                                                        <strong>Notes:</strong> {item.notes}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
