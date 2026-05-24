import { Fragment, useCallback, useEffect, useState } from 'react';
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

  const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

  const fetchDepartments = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setMessage('');
      const res = await fetch(`${API}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setDepartments(data.departments || []);
      } else {
        setMessage(data.message || 'Error loading departments list');
      }

      try {
        const employeeRes = await fetch(`${API}/api/admin/employees`, {
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
  }, [API, token]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    try {
      const url = editingDept
        ? `${API}/api/departments/${editingDept.id}`
        : `${API}/api/departments`;
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
      const res = await fetch(`${API}/api/departments/${id}`, {
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
      const res = await fetch(`${API}/api/admin/employees/${employee.id}/history?historyType=job&pageSize=100`, {
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
        @keyframes deptFadeInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes deptFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes deptSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes deptTableRowFadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div style={{ padding: '0' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0', color: '#0f172a' }}>Department Management</h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Manage and organize company departments</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <button
            type="button"
            style={{
              padding: '10px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)',
              transition: 'all 0.3s',
            }}
            onClick={() => {
              setShowForm(true);
              setEditingDept(null);
              setFormData({ code: '', name: '', description: '', managerId: null, isActive: true });
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#059669';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#10b981';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.2)';
            }}
          >
            <PlusIcon size={18} />
            Add Department
          </button>
        </div>

        {message && (
          <div
            style={{
              padding: '12px 16px',
              marginBottom: '16px',
              backgroundColor: message.includes('successfully') ? '#d4edda' : '#f8d7da',
              color: message.includes('successfully') ? '#155724' : '#721c24',
              borderRadius: '6px',
              display: 'inline-block',
              border: `1px solid ${message.includes('successfully') ? '#c3e6cb' : '#f5c6cb'}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              fontSize: '14px',
              fontWeight: '500',
              animation: 'deptFadeIn 0.3s ease-out',
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
              animation: 'deptFadeIn 0.3s ease-out',
            }}
            onClick={() => {
              setShowForm(false);
              setEditingDept(null);
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflowY: 'auto',
                animation: 'deptSlideUp 0.3s ease-out',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  background: editingDept
                    ? 'linear-gradient(90deg, #7029d1 0%, #8b46ff 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  padding: '24px',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  margin: '-24px -24px 24px -24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'white' }}>
                    {editingDept ? '✏️ Edit Department' : '➕ Add New Department'}
                  </h3>
                  <p style={{ margin: '8px 0 0 0', color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>
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
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                        padding: '10px 12px',
                        border: '2px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '15px',
                        transition: 'all 0.2s',
                        outline: 'none',
                        backgroundColor: '#f1f5f9',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = accentFocus;
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 70, 255, 0.1)';
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                        padding: '10px 12px',
                        border: '2px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '15px',
                        transition: 'all 0.2s',
                        outline: 'none',
                        backgroundColor: '#f1f5f9',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = accentFocus;
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 70, 255, 0.1)';
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Enter department description..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '15px',
                      resize: 'vertical',
                      transition: 'all 0.2s',
                      outline: 'none',
                      backgroundColor: '#f1f5f9',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = accentFocus;
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 70, 255, 0.1)';
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '2px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingDept(null);
                    }}
                    title="Cancel"
                    style={{
                      padding: '12px',
                      backgroundColor: '#e2e8f0',
                      color: '#475569',
                      border: 'none',
                      borderRadius: '6px',
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
                      e.currentTarget.style.backgroundColor = '#cbd5e1';
                      e.currentTarget.style.transform = 'scale(1.1) rotate(-5deg)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#e2e8f0';
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
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '48px',
                      height: '48px',
                      boxShadow: editingDept
                        ? '0 4px 12px rgba(139, 70, 255, 0.3)'
                        : '0 4px 12px rgba(16, 185, 129, 0.3)',
                      transition: 'all 0.3s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
                      e.currentTarget.style.boxShadow = editingDept
                        ? '0 6px 20px rgba(139, 70, 255, 0.4)'
                        : '0 6px 20px rgba(16, 185, 129, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                      e.currentTarget.style.boxShadow = editingDept
                        ? '0 4px 12px rgba(139, 70, 255, 0.3)'
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
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '16px' }}>
            Loading...
          </div>
        ) : departments.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '16px', backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            No departments found
          </div>
        ) : (
          <div style={{ animation: 'deptFadeInUp 0.5s ease-out' }}>
            <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    {['Code', 'Name', 'Description', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '12px 16px',
                          textAlign: h === 'Actions' ? 'right' : 'left',
                          fontWeight: '700',
                          fontSize: '13px',
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
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
                            borderBottom: '1px solid #e2e8f0',
                            animation: `deptTableRowFadeIn 0.4s ease-out ${index * 0.05}s both`,
                            backgroundColor: isExpanded ? '#f8fafc' : 'white',
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>
                            {dept.code}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>
                            {dept.name}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b', lineHeight: 1.5, fontSize: '13px' }}>
                            {dept.description?.trim() ? dept.description : '—'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '4px',
                                backgroundColor: dept.isActive ? '#d4edda' : '#f8d7da',
                                color: dept.isActive ? '#155724' : '#721c24',
                                fontSize: '11px',
                                fontWeight: '700',
                                border: `1px solid ${dept.isActive ? '#c3e6cb' : '#f5c6cb'}`,
                              }}
                            >
                              {dept.isActive ? '✓ Active' : '✗ Inactive'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => toggleDepartmentEmployees(dept.id)}
                              title="View employees"
                              style={{
                                padding: '7px 12px',
                                marginRight: '8px',
                                backgroundColor: isExpanded ? '#7c3aed' : '#eef2ff',
                                color: isExpanded ? 'white' : '#4338ca',
                                border: '1px solid rgba(99, 102, 241, 0.18)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: '700',
                                fontSize: '12px',
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
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '34px',
                                height: '34px',
                                transition: 'all 0.3s',
                                boxShadow: '0 2px 8px rgba(139, 70, 255, 0.2)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 70, 255, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 70, 255, 0.2)';
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
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '34px',
                                height: '34px',
                                transition: 'all 0.3s',
                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)',
                                marginLeft: '8px',
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
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <td colSpan={5} style={{ padding: '0', borderBottom: '1px solid #e2e8f0' }}>
                              <div style={{ padding: '14px 18px 18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                                  <div>
                                    <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                                      Employees in {dept.name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
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
                                      fontWeight: '700',
                                    }}
                                  >
                                    Hide list
                                  </button>
                                </div>
                                {departmentEmployees.length === 0 ? (
                                  <div style={{ padding: '14px 16px', borderRadius: '6px', backgroundColor: 'white', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                                    No employees assigned to this department yet.
                                  </div>
                                ) : (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
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
                                          borderRadius: '8px',
                                          backgroundColor: 'white',
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
                                        <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                                          {employee.name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                                          {employee.employeeCode || 'No code'} · {employee.JobTitle?.name || employee.role || 'Employee'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {employee.email}
                                        </div>
                                      </div>
                                    ))}
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
              padding: '20px',
            }}
            onClick={closeEmployeeHistory}
          >
            <div
              style={{
                width: 'min(920px, 100%)',
                maxHeight: '86vh',
                overflow: 'auto',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: '18px 22px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #8b46ff 100%)',
                  color: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '800' }}>Transfer History</div>
                  <div style={{ fontSize: '13px', opacity: 0.92, marginTop: '4px' }}>
                    {selectedEmployee.name} · {selectedEmployee.employeeCode || 'No code'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeEmployeeHistory}
                  style={{
                    border: 'none',
                    background: 'rgba(255,255,255,0.18)',
                    color: 'white',
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: '800',
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: '22px' }}>
                {employeeHistoryLoading ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    Loading history...
                  </div>
                ) : employeeTransferHistory.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    No department transfer history found for this employee.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                        <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                            <div>
                              <div style={{ fontWeight: '800', color: '#0f172a' }}>{dateStr}</div>
                              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{changeTypeLabel}</div>
                            </div>
                            {item.changedBy && (
                              <div style={{ fontSize: '12px', color: '#64748b', alignSelf: 'center' }}>
                                Changed by: <strong>{item.changedBy.name}</strong>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                              <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>From Department</div>
                              <div style={{ marginTop: '6px', fontWeight: '700', color: '#0f172a' }}>{item.fromDepartmentName || '—'}</div>
                            </div>
                            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: isDepartmentChanged ? '#f3e8ff' : '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '900', color: '#7c3aed' }}>
                              →
                            </div>
                            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}>
                              <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>To Department</div>
                              <div style={{ marginTop: '6px', fontWeight: '700', color: '#0f172a' }}>{item.toDepartmentName || '—'}</div>
                            </div>
                          </div>

                          {item.notes && (
                            <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
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
    </>
  );
}
