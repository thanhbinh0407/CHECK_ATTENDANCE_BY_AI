import { useCallback, useEffect, useMemo, useState } from 'react';
import { toastConfirm, toastError, toastInfo } from '../lib/notify.jsx';
import { theme } from '../theme.js';

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

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount || 0);
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
  const apiRoot = useMemo(
    () => (import.meta.env.VITE_API_BASE || 'http://localhost:5000').replace(/\/$/, ''),
    []
  );
  const apiUrl = `${apiRoot}/api/insurance-configs`;

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl, { headers: authHeaders(token) });
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
  }, [token, apiUrl]);

  useEffect(() => {
    load();
  }, [load]);

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
      const url = modal.mode === 'create' ? apiUrl : `${apiUrl}/${modal.item.id}`;
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
      message: (
        <span>
          Delete configuration <strong>{item.name}</strong>?
        </span>
      ),
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (!ok) return;
    try {
      const res = await fetch(`${apiUrl}/${item.id}`, {
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
    ? items.filter((it) =>
        [it.name, it.description].filter(Boolean).join(' ').toLowerCase().includes(q)
      )
    : items;

  const numInput = (field, step = '0.01') => (
    <input
      type="number"
      step={step}
      value={form[field]}
      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
    />
  );

  const cardShell = {
    backgroundColor: theme.neutral.white,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.neutral.gray200}`,
    boxShadow: theme.shadows.sm,
    padding: theme.spacing.xl,
  };

  return (
    <div className="sup-mgmt-page" style={{ display: 'grid', gap: theme.spacing.xl }}>
      <div className="sup-mgmt-hero">
        <h2>🛡️ Insurance &amp; cost configuration</h2>
        <p>Manage insurance rates (BHXH, BHYT, BHTN) and other cost configurations for salary calculations.</p>
      </div>

      <div className="sup-approval-toolbar card sup-approval-toolbar--filters">
        <div className="sup-approval-toolbar-inner sup-approval-toolbar-inner--search-status">
          <div className="sup-approval-search-wrap sup-approval-search-wrap--grow">
            <label className="sup-approval-label" htmlFor="sup-ic-search">
              Search
            </label>
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
            <button type="button" className="sup-mgmt-btn-add" onClick={openCreate}>
              + Add configuration
            </button>
          </div>
          <div className="sup-approval-meta">
            {loading ? 'Loading…' : `${filtered.length} of ${items.length} shown`}
          </div>
        </div>
      </div>

      <div style={cardShell}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.lg,
            flexWrap: 'wrap',
            gap: theme.spacing.md,
          }}
        >
          <h3 style={{ fontSize: 20, fontWeight: 800, color: theme.primary.main, margin: 0 }}>
            Insurance Configurations
          </h3>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : filtered.length === 0 && items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: theme.neutral.gray500 }}>
            <p>No insurance configurations found. Create your first configuration.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: theme.spacing.lg, color: theme.neutral.gray500 }}>
            No rows match your search.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: theme.spacing.md }}>
            {filtered.map((config) => (
              <div
                key={config.id}
                style={{
                  border: `2px solid ${config.isActive ? theme.success.main : theme.neutral.gray300}`,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.lg,
                  backgroundColor: config.isActive ? theme.success.light : theme.neutral.white,
                  transition: 'all 0.2s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: theme.spacing.md,
                    flexWrap: 'wrap',
                    gap: theme.spacing.sm,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs, flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: 18, fontWeight: 700, color: theme.neutral.gray900, margin: 0 }}>
                        {config.name}
                      </h4>
                      {config.isActive && (
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: theme.radius.sm,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: theme.success.main,
                            color: theme.neutral.white,
                            textTransform: 'uppercase',
                          }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                      Effective: {formatDate(config.effectiveDate)}
                      {config.expiryDate && ` – ${formatDate(config.expiryDate)}`}
                    </div>
                    {config.description && (
                      <div style={{ fontSize: 13, color: theme.neutral.gray700, marginTop: theme.spacing.xs }}>
                        {config.description}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                    <button
                      type="button"
                      onClick={() => openEdit(config)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: theme.primary.main,
                        color: theme.neutral.white,
                        border: 'none',
                        borderRadius: theme.radius.sm,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(config)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: theme.error.main,
                        color: theme.neutral.white,
                        border: 'none',
                        borderRadius: theme.radius.sm,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: theme.spacing.md,
                    padding: theme.spacing.md,
                    backgroundColor: theme.neutral.gray50,
                    borderRadius: theme.radius.md,
                    marginTop: theme.spacing.md,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: theme.neutral.gray700,
                        marginBottom: theme.spacing.xs,
                        textTransform: 'uppercase',
                      }}
                    >
                      Employee Rates (%)
                    </div>
                    <div style={{ fontSize: 13, color: theme.neutral.gray700, lineHeight: 1.8 }}>
                      <div>
                        BHXH: <strong>{config.employeeSocialInsuranceRate}%</strong>
                      </div>
                      <div>
                        BHYT: <strong>{config.employeeHealthInsuranceRate}%</strong>
                      </div>
                      <div>
                        BHTN: <strong>{config.employeeUnemploymentInsuranceRate}%</strong>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: theme.neutral.gray600 }}>
                        Total:{' '}
                        <strong>
                          {(
                            parseFloat(config.employeeSocialInsuranceRate) +
                            parseFloat(config.employeeHealthInsuranceRate) +
                            parseFloat(config.employeeUnemploymentInsuranceRate)
                          ).toFixed(2)}
                          %
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: theme.neutral.gray700,
                        marginBottom: theme.spacing.xs,
                        textTransform: 'uppercase',
                      }}
                    >
                      Employer Rates (%)
                    </div>
                    <div style={{ fontSize: 13, color: theme.neutral.gray700, lineHeight: 1.8 }}>
                      <div>
                        BHXH: <strong>{config.employerSocialInsuranceRate}%</strong>
                      </div>
                      <div>
                        BHYT: <strong>{config.employerHealthInsuranceRate}%</strong>
                      </div>
                      <div>
                        BHTN: <strong>{config.employerUnemploymentInsuranceRate}%</strong>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: theme.neutral.gray600 }}>
                        Total:{' '}
                        <strong>
                          {(
                            parseFloat(config.employerSocialInsuranceRate) +
                            parseFloat(config.employerHealthInsuranceRate) +
                            parseFloat(config.employerUnemploymentInsuranceRate)
                          ).toFixed(2)}
                          %
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {(config.maxInsuranceSalary || config.minInsuranceSalary) && (
                  <div
                    style={{
                      marginTop: theme.spacing.md,
                      padding: theme.spacing.md,
                      backgroundColor: theme.neutral.gray50,
                      borderRadius: theme.radius.md,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: theme.neutral.gray700,
                        marginBottom: theme.spacing.xs,
                        textTransform: 'uppercase',
                      }}
                    >
                      Salary Limits
                    </div>
                    <div style={{ fontSize: 13, color: theme.neutral.gray700 }}>
                      {config.minInsuranceSalary != null && config.minInsuranceSalary !== '' && (
                        <div>
                          Min: <strong>{formatCurrency(config.minInsuranceSalary)}</strong>
                        </div>
                      )}
                      {config.maxInsuranceSalary != null && config.maxInsuranceSalary !== '' && (
                        <div>
                          Max: <strong>{formatCurrency(config.maxInsuranceSalary)}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => !saving && setModal(null)}>
          <div className="modal sup-modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal.mode === 'create' ? 'New insurance configuration' : `Edit configuration · #${modal.item.id}`}</h3>
              <button type="button" className="close-btn" onClick={() => !saving && setModal(null)}>
                ×
              </button>
            </div>
            <form onSubmit={save}>
              <div className="sup-modal-form-grid">
                <div className="form-group sup-modal-span-2">
                  <label>Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Effective date *</label>
                  <input
                    type="date"
                    value={form.effectiveDate}
                    onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Expiry date</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Emp. social (%)</label>
                  {numInput('employeeSocialInsuranceRate')}
                </div>
                <div className="form-group">
                  <label>Empl. social (%)</label>
                  {numInput('employerSocialInsuranceRate')}
                </div>
                <div className="form-group">
                  <label>Emp. health (%)</label>
                  {numInput('employeeHealthInsuranceRate')}
                </div>
                <div className="form-group">
                  <label>Empl. health (%)</label>
                  {numInput('employerHealthInsuranceRate')}
                </div>
                <div className="form-group">
                  <label>Emp. unemployment (%)</label>
                  {numInput('employeeUnemploymentInsuranceRate')}
                </div>
                <div className="form-group">
                  <label>Empl. unemployment (%)</label>
                  {numInput('employerUnemploymentInsuranceRate')}
                </div>

                <div className="sup-modal-row-3">
                  <div className="form-group">
                    <label>Min salary (VND)</label>
                    <input
                      type="number"
                      value={form.minInsuranceSalary}
                      onChange={(e) => setForm((f) => ({ ...f, minInsuranceSalary: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Max salary (VND)</label>
                    <input
                      type="number"
                      value={form.maxInsuranceSalary}
                      onChange={(e) => setForm((f) => ({ ...f, maxInsuranceSalary: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={form.isActive ? '1' : '0'}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === '1' }))}
                    >
                      <option value="1">Active (deactivates others)</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-group sup-modal-span-2">
                  <label>Description (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Short note…"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <div className="sup-modal-form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)} disabled={saving}>
                  Cancel
                </button>
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
