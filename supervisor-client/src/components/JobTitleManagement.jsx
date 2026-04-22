import { useCallback, useEffect, useState } from 'react';
import { toastConfirm, toastError, toastInfo } from '../lib/notify.jsx';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const EMPTY_FORM = {
  code: '',
  name: '',
  level: '',
  baseSalaryMin: '',
  baseSalaryMax: '',
  isActive: true,
};

export default function JobTitleManagement({ token }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', item? }
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/job-titles`, { headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        toastError(data.message || 'Cannot load job titles');
        setItems([]);
        return;
      }
      setItems(Array.isArray(data.jobTitles) ? data.jobTitles : []);
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
      code: item.code || '',
      name: item.name || '',
      level: item.level != null && item.level !== '' ? String(item.level) : '',
      baseSalaryMin: item.baseSalaryMin ?? '',
      baseSalaryMax: item.baseSalaryMax ?? '',
      isActive: item.isActive !== false,
    });
    setModal({ mode: 'edit', item });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toastError('Code and name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: null,
        level: form.level.trim() === '' ? null : form.level.trim(),
        baseSalaryMin: form.baseSalaryMin === '' ? 0 : Number(form.baseSalaryMin),
        baseSalaryMax: form.baseSalaryMax === '' ? 0 : Number(form.baseSalaryMax),
        isActive: !!form.isActive,
      };
      const url = modal.mode === 'create'
        ? `${API}/job-titles`
        : `${API}/job-titles/${modal.item.id}`;
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
      toastInfo(modal.mode === 'create' ? 'Job title created' : 'Job title updated');
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
      title: 'Delete job title',
      message: (<span>Are you sure you want to delete <strong>{item.name}</strong> ({item.code})?</span>),
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API}/job-titles/${item.id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        toastError(data.message || 'Delete failed');
        return;
      }
      toastInfo('Job title deleted');
      load();
    } catch (err) {
      toastError(err.message);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter((it) => [it.code, it.name]
        .filter(Boolean).join(' ').toLowerCase().includes(q))
    : items;

  return (
    <div className="sup-mgmt-page">
      <div className="sup-mgmt-hero sup-mgmt-hero--compact">
        <h2>Job title management</h2>
        <p>Manage job titles, salary ranges, levels, and active status.</p>
      </div>
      <div className="sup-approval-toolbar card sup-approval-toolbar--filters sup-jt-toolbar-compact">
        <div className="sup-approval-toolbar-inner sup-approval-toolbar-inner--search-status">
          <div className="sup-approval-search-wrap sup-approval-search-wrap--grow">
            <label className="sup-approval-label" htmlFor="sup-jt-search">Search</label>
            <input
              id="sup-jt-search"
              className="sup-approval-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Code, name…"
              autoComplete="off"
            />
          </div>
          <div className="sup-approval-filter-wrap">
            <label className="sup-approval-label">&nbsp;</label>
            <button type="button" className="sup-mgmt-btn-add" onClick={openCreate}>
              + New job title
            </button>
          </div>
          <div className="sup-approval-meta">
            {loading ? 'Loading…' : `${filtered.length} of ${items.length} shown`}
          </div>
        </div>
      </div>

      <div className="card sup-approval-table-card sup-mgmt-table-shell">
        {loading ? <div className="loading">Loading...</div> : (
          <div className="table-wrap">
            <table className="sup-mgmt-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Level</th>
                  <th>Salary range</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td className="sup-mgmt-code">{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.level ?? '—'}</td>
                    <td>
                      {Number(item.baseSalaryMin || 0).toLocaleString('en-US')}
                      {' – '}
                      {Number(item.baseSalaryMax || 0).toLocaleString('en-US')}
                    </td>
                    <td>
                      <span className={`badge ${item.isActive ? 'badge-approved' : 'badge-rejected'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="sup-mgmt-action-row">
                        <button type="button" className="btn btn-secondary" onClick={() => openEdit(item)}>Edit</button>
                        <button type="button" className="btn btn-reject" onClick={() => remove(item)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#718096', padding: '12px 14px' }}>No job titles</td></tr>
                )}
                {items.length > 0 && filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#718096', padding: '12px 14px' }}>No rows match your search</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => !saving && setModal(null)}>
          <div className="modal" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal.mode === 'create' ? 'New job title' : `Edit job title · #${modal.item.id}`}</h3>
              <button className="close-btn" onClick={() => !saving && setModal(null)}>×</button>
            </div>
            <form onSubmit={save}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <div className="form-group">
                  <label>Code *</label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    required
                    style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6 }}
                  />
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6 }}
                  />
                </div>
                <div className="form-group">
                  <label>Level</label>
                  <input
                    type="text"
                    value={form.level}
                    onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                    placeholder="e.g. Manager, Senior, Trainee"
                    autoComplete="off"
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
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Base salary min (VND)</label>
                  <input
                    type="number"
                    value={form.baseSalaryMin}
                    onChange={(e) => setForm((f) => ({ ...f, baseSalaryMin: e.target.value }))}
                    style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6 }}
                  />
                </div>
                <div className="form-group">
                  <label>Base salary max (VND)</label>
                  <input
                    type="number"
                    value={form.baseSalaryMax}
                    onChange={(e) => setForm((f) => ({ ...f, baseSalaryMax: e.target.value }))}
                    style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6 }}
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
