import { useCallback, useEffect, useMemo, useState } from 'react';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function monthYearDefaults() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

function getTypeLabel(type) {
  const typeLabels = {
    'IN': 'Check-in',
    'OUT': 'Check-out',
    'OT_IN': 'OT Check-in',
    'OT_OUT': 'OT Check-out',
    'LATE_IN': 'Late Check-in',
    'EARLY_OUT': 'Early Check-out',
    'ABSENT': 'Absent'
  };
  return typeLabels[type] || type || '—';
}

export default function HrAttendance({ token }) {
  const defaults = useMemo(() => monthYearDefaults(), []);

  /** Draft inputs (not applied until “Apply filters”). */
  const [fMonth, setFMonth] = useState(String(defaults.month));
  const [fYear, setFYear] = useState(String(defaults.year));
  const [fUseRange, setFUseRange] = useState(false);
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [fDept, setFDept] = useState('');
  const [fType, setFType] = useState('');
  const [fSearch, setFSearch] = useState('');

  /** Applied filters (drives API). */
  const [applied, setApplied] = useState(() => ({
    useDateRange: false,
    month: String(defaults.month),
    year: String(defaults.year),
    from: '',
    to: '',
    departmentId: '',
    type: '',
    search: '',
  }));

  const [departments, setDepartments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(40);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/departments`, { headers: authHeaders(token) })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setDepartments(d.departments || d.data || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  const buildQueryString = useCallback(
    (a, off) => {
      const p = new URLSearchParams();
      p.set('limit', String(limit));
      p.set('offset', String(off));
      if (a.useDateRange && a.from && a.to) {
        p.set('from', a.from);
        p.set('to', a.to);
      } else {
        p.set('month', a.month);
        p.set('year', a.year);
      }
      if (a.departmentId) p.set('departmentId', a.departmentId);
      if (a.type && ['IN', 'OUT', 'OT_IN', 'OT_OUT', 'LATE_IN', 'EARLY_OUT', 'ABSENT'].includes(a.type)) {
        p.set('type', a.type);
      }
      if (a.search.trim()) p.set('search', a.search.trim());
      return p.toString();
    },
    [limit]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = buildQueryString(applied, offset);
      const res = await fetch(`${API}/admin/attendance-logs?${qs}`, {
        headers: authHeaders(token),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
      setLogs(data.logs || []);
      setTotal(data.pagination?.total ?? (data.logs || []).length);
    } catch (e) {
      setError(e.message || 'Failed to load attendance');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, applied, offset, buildQueryString]);

  useEffect(() => {
    load();
  }, [load]);

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const applyFilters = (e) => {
    e.preventDefault();
    setApplied({
      useDateRange: fUseRange,
      month: fMonth,
      year: fYear,
      from: fFrom,
      to: fTo,
      departmentId: fDept,
      type: fType,
      search: fSearch,
    });
    setOffset(0);
  };

  const resetDraft = () => {
    const d = monthYearDefaults();
    setFUseRange(false);
    setFMonth(String(d.month));
    setFYear(String(d.year));
    setFFrom('');
    setFTo('');
    setFDept('');
    setFType('');
    setFSearch('');
    setApplied({
      useDateRange: false,
      month: String(d.month),
      year: String(d.year),
      from: '',
      to: '',
      departmentId: '',
      type: '',
      search: '',
    });
    setOffset(0);
  };

  return (
    <div className="hr-att-root">
      <div className="hr-att-hero">
        <div>
          <h2 className="hr-att-title">Attendance</h2>
          <p className="hr-att-sub">
            Review check-in/out events with filters by period, department, direction, and employee search.
          </p>
        </div>
        <span className="hr-att-pill">{total} records (this query)</span>
      </div>

      <form className="hr-att-filters card" onSubmit={applyFilters}>
        <p className="card-title" style={{ marginBottom: 12 }}>Filters</p>
        <div className="hr-att-filter-grid">
          <label className="hr-att-field">
            <span>Period mode</span>
            <select value={fUseRange ? 'range' : 'month'} onChange={(e) => setFUseRange(e.target.value === 'range')}>
              <option value="month">Month / year</option>
              <option value="range">Date range</option>
            </select>
          </label>
          {!fUseRange ? (
            <>
              <label className="hr-att-field">
                <span>Month</span>
                <select value={fMonth} onChange={(e) => setFMonth(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                  ))}
                </select>
              </label>
              <label className="hr-att-field">
                <span>Year</span>
                <input type="number" min={2000} max={2100} value={fYear} onChange={(e) => setFYear(e.target.value)} />
              </label>
            </>
          ) : (
            <>
              <label className="hr-att-field">
                <span>From</span>
                <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
              </label>
              <label className="hr-att-field">
                <span>To</span>
                <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />
              </label>
            </>
          )}
          <label className="hr-att-field">
            <span>Department</span>
            <select value={fDept} onChange={(e) => setFDept(e.target.value)}>
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d.id} value={String(d.id)}>{d.name}</option>
              ))}
            </select>
          </label>
          <label className="hr-att-field">
            <span>Type</span>
            <select value={fType} onChange={(e) => setFType(e.target.value)}>
              <option value="">All</option>
              <option value="IN">Check-in</option>
              <option value="OUT">Check-out</option>
              <option value="OT_IN">Overtime Check-in</option>
              <option value="OT_OUT">Overtime Check-out</option>
              <option value="LATE_IN">Late Check-in</option>
              <option value="EARLY_OUT">Early Check-out</option>
              <option value="ABSENT">Absent</option>
            </select>
          </label>
          <label className="hr-att-field hr-att-field--span2">
            <span>Search (name or employee code)</span>
            <input
              type="search"
              value={fSearch}
              onChange={(e) => setFSearch(e.target.value)}
              placeholder="e.g. NV001 or Nguyen"
            />
          </label>
        </div>
        <div className="hr-att-actions">
          <button type="submit" className="btn btn-primary">Apply filters</button>
          <button type="button" className="btn btn-secondary" onClick={resetDraft}>
            Reset
          </button>
        </div>
      </form>

      {error && (
        <div className="card" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b', marginBottom: 14 }}>
          {error}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
          <p className="card-title" style={{ margin: 0 }}>Log entries</p>
          <span style={{ fontSize: 13, color: '#64748b' }}>Page {page} / {totalPages}</span>
        </div>
        {loading ? (
          <div className="loading">Loading…</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>Late</th>
                  <th>Device</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : '—'}</td>
                    <td>{log.User?.employeeCode || log.userId}</td>
                    <td>{log.User?.name || log.detectedName || '—'}</td>
                    <td>{log.User?.Department?.name || '—'}</td>
                    <td><span className={`badge badge-${(log.type || '').toLowerCase()}`}>{getTypeLabel(log.type)}</span></td>
                    <td>{log.isLate ? 'Yes' : '—'}</td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{log.deviceId || '—'}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>No rows for this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && total > limit && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={offset <= 0}
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={offset + limit >= total}
              onClick={() => setOffset((o) => o + limit)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
