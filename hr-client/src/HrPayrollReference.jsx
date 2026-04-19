import { useEffect, useState } from 'react';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/** Read-only salary grades & insurance configs (HR has GET via canViewReports). */
export default function HrPayrollReference({ token }) {
  const [tab, setTab] = useState('grades');
  const [grades, setGrades] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr('');
    const h = authHeaders(token);
    Promise.all([
      fetch(`${API}/salary-grades`, { headers: h }).then((r) => r.json()),
      fetch(`${API}/insurance-configs`, { headers: h }).then((r) => r.json()),
    ])
      .then(([g, c]) => {
        if (cancelled) return;
        if (g.status === 'error' || !Array.isArray(g.grades)) throw new Error(g.message || 'Failed to load grades');
        if (c.status === 'error' || !Array.isArray(c.configs)) throw new Error(c.message || 'Failed to load insurance');
        setGrades(g.grades || g.data || []);
        setConfigs(c.configs || c.data || []);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || 'Load error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="hr-att-root">
      <div className="hr-att-hero">
        <div>
          <h2 className="hr-att-title">Payroll reference</h2>
          <p className="hr-att-sub">Read-only view of salary grades and insurance configuration. Changes are made by Accountant or Manager.</p>
        </div>
      </div>
      {err && (
        <div className="card" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b', marginBottom: 14 }}>{err}</div>
      )}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className={tab === 'grades' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab('grades')}>Salary grades</button>
          <button type="button" className={tab === 'insurance' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab('insurance')}>Insurance configs</button>
        </div>
      </div>
      {loading ? (
        <div className="loading">Loading…</div>
      ) : tab === 'grades' ? (
        <div className="card">
          <p className="card-title">Salary grades</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Code</th><th>Name</th><th>Level</th><th>Base salary</th><th>Active</th></tr>
              </thead>
              <tbody>
                {grades.map((r) => (
                  <tr key={r.id}>
                    <td>{r.code}</td>
                    <td>{r.name}</td>
                    <td>{r.level}</td>
                    <td>{Number(r.baseSalary || 0).toLocaleString('vi-VN')}</td>
                    <td>{r.isActive ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
                {grades.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>No grades</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="card-title">Insurance configurations</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Effective</th><th>Active</th><th>Employee SI %</th><th>Max base</th></tr>
              </thead>
              <tbody>
                {configs.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.effectiveDate || '—'}</td>
                    <td>{r.isActive ? 'Yes' : 'No'}</td>
                    <td>{r.employeeSocialInsuranceRate ?? '—'}</td>
                    <td>{r.maxInsuranceSalary != null ? Number(r.maxInsuranceSalary).toLocaleString('vi-VN') : '—'}</td>
                  </tr>
                ))}
                {configs.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>No configs</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
