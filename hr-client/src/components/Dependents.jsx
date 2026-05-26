import React, { useState, useEffect } from 'react';

export default function Dependents({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [existingDocs, setExistingDocs] = useState([]);
  const [existingCccdDocs, setExistingCccdDocs] = useState([]);
  const [searchEmployee, setSearchEmployee] = useState('');
  const [ageFilter, setAgeFilter] = useState('all');

  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

  useEffect(() => { fetchList(); }, []);

  const fetchList = async () => {
    try {
      setLoading(true);
      const t = token || localStorage.getItem('authToken');
      const res = await fetch(`${apiBase}/api/dependents`, {
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        const list = data.dependents || data.data || [];
        setItems(list);
        // resolve employee names for dependents that reference a user id
        resolveEmployeeNames(list, t);
      }
      else setItems([]);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally { setLoading(false); }
  };

  // Fetch employee names by id for dependents missing user name
  const resolveEmployeeNames = async (list, tkn) => {
    if (!Array.isArray(list) || list.length === 0) return;
    const t = tkn || token || localStorage.getItem('authToken');
    const ids = Array.from(new Set(list.map(it => it.userId || it.user_id || (it.user && it.user.id)).filter(Boolean)));
    if (ids.length === 0) return;

    const mapping = {};
    await Promise.all(ids.map(async id => {
      try {
        const r = await fetch(`${apiBase}/api/admin/employees/${id}`, {
          headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
        });
        if (r.ok) {
          const d = await r.json();
          mapping[id] = (d.employee && d.employee.name) || d.user?.name || d.name || null;
        }
      } catch (err) {
        // ignore per-id failures
      }
    }));

    if (Object.keys(mapping).length === 0) return;
    setItems(prev => prev.map(it => {
      const id = it.userId || it.user_id || (it.user && it.user.id);
      if (id && mapping[id]) return { ...it, user: { ...(it.user || {}), name: mapping[id] } };
      return it;
    }));
  };

  const fetchDependentDocuments = async (dependentId) => {
    try {
      const t = token || localStorage.getItem('authToken');
      if (!t) return;
      const res = await fetch(`${apiBase}/api/dependents/${dependentId}/documents`, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) {
        setExistingDocs([]);
        setExistingCccdDocs([]);
        return;
      }
        const data = await res.json().catch(() => null);
        const docs = data?.documents || data || [];
        const norm = (docs || []).map(d => {
          if (typeof d === 'string') return { url: d, name: d.split('/').pop() };
          const url = d.documentPath || d.url || d.path || d.file || '';
          const name = d.fileName || d.name || d.filename || (url || '').split('/').pop();
          return { url, name, type: d.mimeType || d.type || '' };
        });
        const cccd = data?.cccdFiles || [];
        const normCccd = (cccd || []).map(d => {
          if (typeof d === 'string') return { url: d, name: d.split('/').pop() };
          const url = d.documentPath || d.url || d.path || '';
          const name = d.fileName || d.name || d.filename || (url || '').split('/').pop();
          return { url, name, type: d.mimeType || d.type || '' };
        });
      setExistingDocs(norm);
      setExistingCccdDocs(normCccd);
    } catch (err) {
      console.error('Error fetching dependent documents', err);
      setExistingDocs([]);
      setExistingCccdDocs([]);
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ color: '#2b6cb0' }}>Dependents</h2>

      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
          <input
            placeholder="Search by employee name"
            value={searchEmployee}
            onChange={(e) => setSearchEmployee(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', flex: '1 1 320px' }}
          />
          <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}>
            <option value="all">All ages</option>
            <option value="0-5">0 – 5 years</option>
            <option value="6-10">6 – 10 years</option>
            <option value="11-14">11 – 14 years</option>
            <option value="15-17">15 – 17 years</option>
          </select>
        </div>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Full name</th>
                    <th>Date of birth</th>
                    <th>Employee</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const toAge = (dob) => {
                      if (!dob) return null;
                      const b = new Date(dob);
                      const today = new Date();
                      let age = today.getFullYear() - b.getFullYear();
                      const m = today.getMonth() - b.getMonth();
                      if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
                      return age;
                    };

                    const matchesEmployee = (d) => {
                      if (!searchEmployee) return true;
                      const name = (d.user?.name || d.userName || '').toLowerCase();
                      return name.includes(searchEmployee.toLowerCase());
                    };

                    const matchesAge = (d) => {
                      if (!ageFilter || ageFilter === 'all') return true;
                      const age = toAge(d.dateOfBirth);
                      if (age === null || age === undefined) return false;
                      if (ageFilter === '0-5') return age >= 0 && age <= 5;
                      if (ageFilter === '6-10') return age >= 6 && age <= 10;
                      if (ageFilter === '11-14') return age >= 11 && age <= 14;
                      if (ageFilter === '15-17') return age >= 15 && age <= 17;
                      return true;
                    };

                    return items.filter(d => matchesEmployee(d) && matchesAge(d)).map(d => (
                      <tr key={d.id}>
                        <td>{d.id}</td>
                        <td>{d.fullName}</td>
                        <td>{d.dateOfBirth ? new Date(d.dateOfBirth).toLocaleDateString() : '—'}</td>
                        <td>{d.user?.name || d.userName || '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-secondary" onClick={() => { setSelected(d); fetchDependentDocuments(d.id); }}>View</button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setExistingDocs([]); setExistingCccdDocs([]); }}>
          <div className="modal" style={{ width: 700 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Dependent details</h3>
              <button className="close-btn" onClick={() => { setSelected(null); setExistingDocs([]); setExistingCccdDocs([]); }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              <p><strong>Full name:</strong> {selected.fullName}</p>
              <p><strong>Date of birth:</strong> {selected.dateOfBirth ? new Date(selected.dateOfBirth).toLocaleDateString() : '—'}</p>
              <p><strong>Gender:</strong> {selected.gender || '—'}</p>
              <p><strong>ID / CCCD:</strong> {selected.idNumber || '—'}</p>
              <p><strong>Address:</strong> {selected.address || '—'}</p>
              <p><strong>Phone:</strong> {selected.phoneNumber || '—'}</p>
              <p><strong>Email:</strong> {selected.email || '—'}</p>

              {existingDocs && existingDocs.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong>Dependent Documents</strong>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {existingDocs.map((d, i) => (
                      <div key={i} style={{ width: 140, textAlign: 'center' }}>
                        {/(jpg|jpeg|png|gif)$/i.test(d.name || d.url || '') ? (
                          <a href={d.url} target="_blank" rel="noreferrer"><img src={d.url} alt={d.name} style={{ width: 130, height: 90, objectFit: 'cover', borderRadius: 6 }} /></a>
                        ) : (
                          <a href={d.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', width: 130, height: 90, borderRadius: 6, padding: 8, background: '#fff', textDecoration: 'none', color: '#333' }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>Open</div>
                            <div style={{ fontSize: 11 }}>{d.name}</div>
                          </a>
                        )}
                        <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{d.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {existingCccdDocs && existingCccdDocs.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong>CCCD / ID Documents</strong>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {existingCccdDocs.map((d, i) => (
                      <div key={i} style={{ width: 140, textAlign: 'center' }}>
                        {/(jpg|jpeg|png|gif)$/i.test(d.name || d.url || '') ? (
                          <a href={d.url} target="_blank" rel="noreferrer"><img src={d.url} alt={d.name} style={{ width: 130, height: 90, objectFit: 'cover', borderRadius: 6 }} /></a>
                        ) : (
                          <a href={d.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', width: 130, height: 90, borderRadius: 6, padding: 8, background: '#fff', textDecoration: 'none', color: '#333' }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>Open</div>
                            <div style={{ fontSize: 11 }}>{d.name}</div>
                          </a>
                        )}
                        <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{d.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
