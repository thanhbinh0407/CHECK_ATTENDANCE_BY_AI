import { useCallback, useEffect, useState } from 'react';
import { toastConfirm, toastError, toastInfo } from '../lib/notify.jsx';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  managerId: '',
  isActive: true,
};

export default function DepartmentManagement({ token }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/departments`, { headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        toastError(data.message || 'Cannot load departments');
        setItems([]);
        return;
      }
      setItems(Array.isArray(data.departments) ? data.departments : []);
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
      description: item.description || '',
      managerId: item.managerId ?? '',
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
        description: form.description.trim() || null,
        managerId: form.managerId === '' ? null : Number(form.managerId) || null,
        isActive: !!form.isActive,
      };
      const url = modal.mode === 'create'
        ? `${API}/departments`
        : `${API}/departments/${modal.item.id}`;
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
      toastInfo(modal.mode === 'create' ? 'Department created' : 'Department updated');
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
      title: 'Delete department',
      message: (<span>Are you sure you want to delete <strong>{item.name}</strong> ({item.code})?</span>),
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API}/departments/${item.id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        toastError(data.message || 'Delete failed');
        return;
      }
      toastInfo('Department deleted');
      load();
    } catch (err) {
      toastError(err.message);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter((it) => [it.code, it.name, it.description]
        .filter(Boolean).join(' ').toLowerCase().includes(q))
    : items;

  return (
    <div>
      <div className="sup-approval-toolbar card">
        <div className="sup-approval-toolbar-inner">
          <div className="sup-approval-search-wrap sup-approval-search-wrap--grow">
            <label className="sup-approval-label" htmlFor="sup-dept-search">Search</label>
            <input
              id="sup-dept-search"
              className="sup-approval-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Code, name, description…"
              autoComplete="off"
            />
          </div>
          <div className="sup-approval-filter-wrap">
            <label className="sup-approval-label">&nbsp;</label>
            <button className="btn btn-primary" onClick={openCreate}>+ New department</button>
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
                  <th>Code</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Manager ID</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td><strong>{item.code}</strong></td>
                    <td>{item.name}</td>
                    <td style={{ maxWidth: 320, color: '#4a5568' }}>{item.description || '—'}</td>
                    <td>{item.managerId ?? '—'}</td>
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
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#718096', padding: 20 }}>No departments</td></tr>
                )}
                {items.length > 0 && filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#718096', padding: 20 }}>No rows match your search</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => !saving && setModal(null)}>
          <div className="modal" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal.mode === 'create' ? 'New department' : `Edit department · #${modal.item.id}`}</h3>
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
                <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
                  <label>Description</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Manager user ID</label>
                  <input
                    type="number"
                    value={form.managerId}
                    onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))}
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
