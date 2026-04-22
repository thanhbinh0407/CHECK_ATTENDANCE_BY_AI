import { useCallback, useEffect, useState } from 'react';
import { toastConfirm, toastError, toastInfo } from '../lib/notify.jsx';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB');
  } catch {
    return '—';
  }
}

function toDateInput(d) {
  if (!d) return '';
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

const EMPTY_FORM = {
  name: '',
  effectiveDate: '',
  expiryDate: '',
  employeeSocialInsuranceRate: 8,
  employerSocialInsuranceRate: 21.5,
  employeeHealthInsuranceRate: 1.5,
  employerHealthInsuranceRate: 3.0,
  employeeUnemploymentInsuranceRate: 1.0,
  employerUnemploymentInsuranceRate: 1.0,
  maxInsuranceSalary: '',
  minInsuranceSalary: '',
  isActive: true,
  description: '',
};

export default function InsuranceConfigManagement({ token }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/insurance-configs`, { headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        toastError(data.message || 'Cannot load insurance configs');
        setItems([]);
        return;
      }
      setItems(Array.isArray(data.configs) ? data.configs : []);
    } catch (err) {
      toastError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ mode: 'create' });
  };

  const openEdit = (item) => {
    setForm({
      name: item.name || '',
      effectiveDate: toDateInput(item.effectiveDate),
      expiryDate: toDateInput(item.expiryDate),
      employeeSocialInsuranceRate: item.employeeSocialInsuranceRate ?? 8,
      employerSocialInsuranceRate: item.employerSocialInsuranceRate ?? 21.5,
      employeeHealthInsuranceRate: item.employeeHealthInsuranceRate ?? 1.5,
      employerHealthInsuranceRate: item.employerHealthInsuranceRate ?? 3.0,
      employeeUnemploymentInsuranceRate: item.employeeUnemploymentInsuranceRate ?? 1.0,
      employerUnemploymentInsuranceRate: item.employerUnemploymentInsuranceRate ?? 1.0,
      maxInsuranceSalary: item.maxInsuranceSalary ?? '',
      minInsuranceSalary: item.minInsuranceSalary ?? '',
      isActive: item.isActive !== false,
      description: item.description || '',
    });
    setModal({ mode: 'edit', item });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.effectiveDate) {
      toastError('Name and effective date are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        effectiveDate: form.effectiveDate,
        expiryDate: form.expiryDate || null,
        employeeSocialInsuranceRate: Number(form.employeeSocialInsuranceRate) || 0,
        employerSocialInsuranceRate: Number(form.employerSocialInsuranceRate) || 0,
        employeeHealthInsuranceRate: Number(form.employeeHealthInsuranceRate) || 0,
        employerHealthInsuranceRate: Number(form.employerHealthInsuranceRate) || 0,
        employeeUnemploymentInsuranceRate: Number(form.employeeUnemploymentInsuranceRate) || 0,
        employerUnemploymentInsuranceRate: Number(form.employerUnemploymentInsuranceRate) || 0,
        maxInsuranceSalary: form.maxInsuranceSalary === '' ? null : Number(form.maxInsuranceSalary),
        minInsuranceSalary: form.minInsuranceSalary === '' ? null : Number(form.minInsuranceSalary),
        isActive: !!form.isActive,
        description: form.description.trim() || null,
      };
      const url = modal.mode === 'create'
        ? `${API}/insurance-configs`
        : `${API}/insurance-configs/${modal.item.id}`;
      const method = modal.mode === 'create' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        toastError(data.message || 'Save failed');
        return;
      }
      toastInfo(modal.mode === 'create' ? 'Config created' : 'Config updated');
      setModal(null);
      load();
    } catch (err) {
      toastError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    const ok = await toastConfirm({
      title: 'Delete insurance config',
      message: (<span>Delete configuration <strong>{item.name}</strong>?</span>),
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API}/insurance-configs/${item.id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        toastError(data.message || 'Delete failed');
        return;
      }
      toastInfo('Insurance config deleted');
      load();
    } catch (err) {
      toastError(err.message);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter((it) => [it.name, it.description]
        .filter(Boolean).join(' ').toLowerCase().includes(q))
    : items;

  const numInput = (field, step = '0.01') => (
    <input
      type="number"
      step={step}
      value={form[field]}
      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
      style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6 }}
    />
  );

  return (
    <div>
      <div className="sup-approval-toolbar card">
        <div className="sup-approval-toolbar-inner">
          <div className="sup-approval-search-wrap sup-approval-search-wrap--grow">
            <label className="sup-approval-label" htmlFor="sup-ic-search">Search</label>
            <input
              id="sup-ic-search"
              className="sup-approval-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, description…"
              autoComplete="off"
            />
          </div>
          <div className="sup-approval-filter-wrap">
            <label className="sup-approval-label">&nbsp;</label>
            <button className="btn btn-primary" onClick={openCreate}>+ New configuration</button>
          </div>
          <div className="sup-approval-meta">
            {loading ? 'Loading…' : `${filtered.length} of ${items.length} shown`}
          </div>
        </div>
      </div>

      <div className="card sup-approval-table-card">
        {loading ? <div className="loading">Loading...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Effective</th>
                  <th>Expiry</th>
                  <th>Employee SI/HI/UI (%)</th>
                  <th>Employer SI/HI/UI (%)</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>
                      {item.name}
                      {item.description && (
                        <div style={{ fontSize: 12, color: '#718096' }}>{item.description}</div>
                      )}
                    </td>
                    <td>{formatDate(item.effectiveDate)}</td>
                    <td>{formatDate(item.expiryDate)}</td>
                    <td>
                      {Number(item.employeeSocialInsuranceRate || 0)}/
                      {Number(item.employeeHealthInsuranceRate || 0)}/
                      {Number(item.employeeUnemploymentInsuranceRate || 0)}
                    </td>
                    <td>
                      {Number(item.employerSocialInsuranceRate || 0)}/
                      {Number(item.employerHealthInsuranceRate || 0)}/
                      {Number(item.employerUnemploymentInsuranceRate || 0)}
                    </td>
                    <td>
                      <span className={`badge ${item.isActive ? 'badge-approved' : 'badge-rejected'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => openEdit(item)}>Edit</button>
                        <button className="btn btn-reject" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => remove(item)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#718096', padding: 20 }}>No configurations</td></tr>
                )}
                {items.length > 0 && filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#718096', padding: 20 }}>No rows match your search</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => !saving && setModal(null)}>
          <div className="modal" style={{ width: 720 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal.mode === 'create' ? 'New insurance configuration' : `Edit configuration · #${modal.item.id}`}</h3>
              <button className="close-btn" onClick={() => !saving && setModal(null)}>×</button>
            </div>
            <form onSubmit={save}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
                  <label>Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6 }}
                  />
                </div>
                <div className="form-group">
                  <label>Effective date *</label>
                  <input
                    type="date"
                    value={form.effectiveDate}
                    onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                    required
                    style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6 }}
                  />
                </div>
                <div className="form-group">
                  <label>Expiry date</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                    style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6 }}
                  />
                </div>

                <div className="form-group"><label>Employee social insurance (%)</label>{numInput('employeeSocialInsuranceRate')}</div>
                <div className="form-group"><label>Employer social insurance (%)</label>{numInput('employerSocialInsuranceRate')}</div>
                <div className="form-group"><label>Employee health insurance (%)</label>{numInput('employeeHealthInsuranceRate')}</div>
                <div className="form-group"><label>Employer health insurance (%)</label>{numInput('employerHealthInsuranceRate')}</div>
                <div className="form-group"><label>Employee unemployment insurance (%)</label>{numInput('employeeUnemploymentInsuranceRate')}</div>
                <div className="form-group"><label>Employer unemployment insurance (%)</label>{numInput('employerUnemploymentInsuranceRate')}</div>

                <div className="form-group">
                  <label>Min insurance salary (VND)</label>
                  <input
                    type="number"
                    value={form.minInsuranceSalary}
                    onChange={(e) => setForm((f) => ({ ...f, minInsuranceSalary: e.target.value }))}
                    style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6 }}
                  />
                </div>
                <div className="form-group">
                  <label>Max insurance salary (VND)</label>
                  <input
                    type="number"
                    value={form.maxInsuranceSalary}
                    onChange={(e) => setForm((f) => ({ ...f, maxInsuranceSalary: e.target.value }))}
                    style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6 }}
                  />
                </div>

                <div className="form-group">
                  <label>Active</label>
                  <select
                    value={form.isActive ? '1' : '0'}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === '1' }))}
                    style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6 }}
                  >
                    <option value="1">Active (will deactivate others)</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
                  <label>Description</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : modal.mode === 'create' ? 'Create' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
