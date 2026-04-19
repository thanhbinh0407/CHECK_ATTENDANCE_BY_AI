import { useState } from 'react';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

function monthBoundsISO(y, m) {
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

async function downloadHrExport(token, key, month, year, turnoverFrom, turnoverTo) {
  const q = new URLSearchParams();
  if (key === 'structure' || key === 'education-skills' || key === 'seniority-age') {
    /* no query */
  } else if (key === 'leave-status') {
    q.set('year', String(year));
  } else if (key === 'turnover') {
    const fb = monthBoundsISO(year, month);
    q.set('startDate', turnoverFrom?.trim() || fb.startDate);
    q.set('endDate', turnoverTo?.trim() || fb.endDate);
  } else {
    q.set('month', String(month));
    q.set('year', String(year));
  }
  const path = `/export/${key}`;
  const qs = q.toString();
  const url = `${API}${path}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    if (ct.includes('application/json')) {
      try {
        const j = await res.json();
        msg = j.message || msg;
      } catch {
        /* ignore */
      }
    }
    throw new Error(msg);
  }
  if (ct.includes('application/json')) {
    const j = await res.json();
    throw new Error(j.message || 'Export failed');
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = `hr_export_${key}_${year}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

const REPORTS = [
  { key: 'structure', label: 'Workforce structure', path: '/reports/structure' },
  { key: 'attendance', label: 'Attendance summary', path: '/reports/attendance', needsMonth: true },
  { key: 'leave-status', label: 'Leave status', path: '/reports/leave-status', needsYear: true },
  { key: 'overtime', label: 'Overtime detail', path: '/reports/overtime', needsMonth: true },
  { key: 'turnover', label: 'Turnover / resignation', path: '/reports/turnover', needsRange: true },
  { key: 'education-skills', label: 'Education & skills', path: '/reports/education-skills' },
  { key: 'seniority-age', label: 'Seniority & age', path: '/reports/seniority-age' },
];

function ReportBody({ selected, payload }) {
  if (!payload) return null;

  if (payload.status === 'error') {
    return <div className="hr-alert-err">{payload.message || 'Server error'}</div>;
  }

  const rep = payload.report;

  if (selected === 'structure' && rep) {
    return (
      <div className="card">
        <p className="card-title">Total active employees: <strong>{rep.total ?? '—'}</strong></p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div>
            <div className="hr-mini-title" style={{ marginTop: 0 }}>By department</div>
            <div className="hr-table-wrap">
              <table>
                <thead>
                  <tr><th>Department</th><th>Count</th></tr>
                </thead>
                <tbody>
                  {(rep.byDepartment || []).map((row, i) => (
                    <tr key={i}>
                      <td>{row.departmentName || '—'}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="hr-mini-title" style={{ marginTop: 0 }}>By job title</div>
            <div className="hr-table-wrap">
              <table>
                <thead>
                  <tr><th>Job title</th><th>Count</th></tr>
                </thead>
                <tbody>
                  {(rep.byJobTitle || []).map((row, i) => (
                    <tr key={i}>
                      <td>{row.jobTitleName || '—'}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selected === 'attendance' && rep?.report) {
    const rows = rep.report;
    return (
      <div className="card">
        <p className="card-title">Attendance — {rep.month}/{rep.year} · {rep.totalEmployees} employees</p>
        <div className="hr-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Emp code</th>
                <th>Full name</th>
                <th>Department</th>
                <th>Present</th>
                <th>Leave</th>
                <th>Absent</th>
                <th>Late</th>
                <th>OT hours</th>
                <th>Rate %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employeeId}>
                  <td>{r.employeeCode}</td>
                  <td>{r.employeeName}</td>
                  <td>{r.department}</td>
                  <td>{r.presentDays}</td>
                  <td>{r.leaveDays}</td>
                  <td>{r.absentDays}</td>
                  <td>{r.lateCount}</td>
                  <td>{r.overtimeHours}</td>
                  <td>{r.attendanceRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (selected === 'leave-status' && rep) {
    const rows = rep.report || [];
    const sum = rep.summary;
    return (
      <div className="card">
        <p className="card-title">Leave status — year {rep.year}</p>
        {sum && (
          <div className="hr-stat-grid" style={{ marginBottom: 16 }}>
            <div className="hr-stat-box"><div className="lbl">Total leave used</div><div className="val">{sum.totalLeaveDaysUsed}</div></div>
            <div className="hr-stat-box"><div className="lbl">Remaining leave (est.)</div><div className="val">{sum.totalRemainingLeaveDays}</div></div>
            <div className="hr-stat-box"><div className="lbl">Avg utilization %</div><div className="val">{sum.averageUtilizationRate}</div></div>
          </div>
        )}
        <div className="hr-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Emp code</th>
                <th>Full name</th>
                <th>Department</th>
                <th>Days used</th>
                <th>Remaining</th>
                <th>Quota</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employeeId}>
                  <td>{r.employeeCode}</td>
                  <td>{r.employeeName}</td>
                  <td>{r.department}</td>
                  <td>{r.totalLeaveDaysUsed}</td>
                  <td>{r.remainingLeaveDays}</td>
                  <td>{r.standardLeaveDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (selected === 'overtime' && rep) {
    const sum = rep.summary;
    const byEmp = rep.byEmployee || [];
    const lines = byEmp.flatMap((emp) =>
      (emp.requests || []).map((req, idx) => ({
        key: `${emp.employeeId}-${idx}`,
        code: emp.employeeCode,
        name: emp.employeeName,
        dept: emp.department,
        date: typeof req.date === 'string' ? req.date.slice(0, 10) : String(req.date || '').slice(0, 10),
        hours: req.hours,
        reason: req.reason,
        project: req.projectName,
      }))
    );
    return (
      <div className="card">
        <p className="card-title">Overtime — {rep.month}/{rep.year}</p>
        {sum && (
          <div className="hr-stat-grid" style={{ marginBottom: 16 }}>
            <div className="hr-stat-box"><div className="lbl">Total hours</div><div className="val">{sum.totalHours}</div></div>
            <div className="hr-stat-box"><div className="lbl">Requests</div><div className="val">{sum.totalRequests}</div></div>
            <div className="hr-stat-box"><div className="lbl">Employees</div><div className="val">{sum.totalEmployees}</div></div>
          </div>
        )}
        <div className="hr-mini-title">Summary by employee</div>
        <div className="hr-table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Dept</th><th>Hours</th><th>Count</th></tr></thead>
            <tbody>
              {byEmp.map((r) => (
                <tr key={r.employeeId}>
                  <td>{r.employeeCode}</td>
                  <td>{r.employeeName}</td>
                  <td>{r.department}</td>
                  <td>{r.totalHours}</td>
                  <td>{r.requestCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="hr-mini-title">Detail (approved lines)</div>
        <div className="hr-table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Dept</th><th>Date</th><th>Hrs</th><th>Project</th><th>Reason</th></tr></thead>
            <tbody>
              {lines.map((row) => (
                <tr key={row.key}>
                  <td>{row.code}</td>
                  <td>{row.name}</td>
                  <td>{row.dept}</td>
                  <td>{row.date || '—'}</td>
                  <td>{row.hours}</td>
                  <td>{row.project || '—'}</td>
                  <td>{row.reason || '—'}</td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#64748b' }}>No approved overtime in this month</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (selected === 'turnover' && rep) {
    const det = rep.details || {};
    return (
      <div className="card">
        <p className="card-title">Workforce turnover</p>
        <p style={{ marginBottom: 12, fontSize: 13, color: '#64748b' }}>Date range comes from the parameters panel (custom or month preset).</p>
        <div className="hr-stat-grid" style={{ marginBottom: 16 }}>
          <div className="hr-stat-box"><div className="lbl">New hires</div><div className="val">{rep.newEmployees}</div></div>
          <div className="hr-stat-box"><div className="lbl">Terminated</div><div className="val">{rep.terminatedEmployees}</div></div>
          <div className="hr-stat-box"><div className="lbl">Turnover %</div><div className="val">{rep.turnoverRate}</div></div>
        </div>
        <div className="hr-mini-title">New hires (details)</div>
        <div className="hr-table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead><tr><th>Code</th><th>Full name</th><th>Start date</th></tr></thead>
            <tbody>
              {(det.newEmployees || []).map((e) => (
                <tr key={e.id}><td>{e.employeeCode}</td><td>{e.name}</td><td>{e.startDate}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="hr-mini-title">Terminated employees</div>
        <div className="hr-table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Full name</th><th>Status</th><th>Updated</th></tr></thead>
            <tbody>
              {(det.terminatedEmployees || []).map((e) => (
                <tr key={e.id}><td>{e.employeeCode}</td><td>{e.name}</td><td>{e.employmentStatus}</td><td>{e.updatedAt}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (selected === 'education-skills' && rep) {
    return (
      <div className="card">
        <p className="card-title">
          Education &amp; skills · {rep.total} employees · with qualifications: {rep.employeesWithQualifications ?? '—'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div>
            <div className="hr-mini-title" style={{ marginTop: 0 }}>Education levels</div>
            <div className="hr-table-wrap">
              <table>
                <thead><tr><th>Level</th><th>Count</th><th>%</th></tr></thead>
                <tbody>
                  {(rep.byEducationLevel || []).map((row, i) => (
                    <tr key={i}><td>{row.level}</td><td>{row.count}</td><td>{row.percentage}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="hr-mini-title" style={{ marginTop: 0 }}>Qualification types</div>
            <div className="hr-table-wrap">
              <table>
                <thead><tr><th>Type</th><th>Count</th><th>%</th></tr></thead>
                <tbody>
                  {(rep.byQualificationType || []).map((row, i) => (
                    <tr key={i}><td>{row.type}</td><td>{row.count}</td><td>{row.percentage}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selected === 'seniority-age' && rep) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <div className="card">
          <p className="card-title">Age distribution</p>
          <div className="hr-table-wrap">
            <table>
              <thead><tr><th>Age group</th><th>Count</th></tr></thead>
              <tbody>
                {(rep.ageDistribution || []).map((row, i) => (
                  <tr key={i}><td>{row.ageGroup}</td><td>{row.count}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <p className="card-title">Seniority</p>
          <div className="hr-table-wrap">
            <table>
              <thead><tr><th>Group</th><th>Count</th></tr></thead>
              <tbody>
                {(rep.seniorityDistribution || []).map((row, i) => (
                  <tr key={i}><td>{row.seniorityGroup}</td><td>{row.count}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="card-title">Raw data (no custom table for this report type)</p>
      <div className="hr-table-wrap" style={{ padding: 12, fontSize: 12, fontFamily: 'ui-monospace, monospace', overflow: 'auto', maxHeight: 400 }}>
        <pre style={{ margin: 0 }}>{JSON.stringify(payload, null, 2)}</pre>
      </div>
    </div>
  );
}

export default function HrReports({ token }) {
  const now = new Date();
  const [selected, setSelected] = useState(REPORTS[0].key);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { startDate: initT0, endDate: initT1 } = monthBoundsISO(now.getFullYear(), now.getMonth() + 1);
  const [turnoverFrom, setTurnoverFrom] = useState(initT0);
  const [turnoverTo, setTurnoverTo] = useState(initT1);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState('');
  const [err, setErr] = useState('');

  const meta = REPORTS.find((x) => x.key === selected);

  const syncTurnoverFromMonth = () => {
    const { startDate, endDate } = monthBoundsISO(year, month);
    setTurnoverFrom(startDate);
    setTurnoverTo(endDate);
  };

  const run = () => {
    if (!meta) return;
    setLoading(true);
    setErr('');
    setPayload(null);
    let url = `${API}${meta.path}`;
    const q = new URLSearchParams();
    if (meta.needsMonth) {
      q.set('month', String(month));
      q.set('year', String(year));
    }
    if (meta.needsYear) {
      q.set('year', String(year));
    }
    if (meta.needsRange) {
      const fb = monthBoundsISO(year, month);
      q.set('startDate', turnoverFrom?.trim() || fb.startDate);
      q.set('endDate', turnoverTo?.trim() || fb.endDate);
    }
    if (q.toString()) url += `?${q.toString()}`;

    fetch(url, { headers: authHeaders(token) })
      .then((res) => res.json())
      .then((j) => {
        setPayload(j);
        setLoading(false);
      })
      .catch((e) => {
        setErr(e.message);
        setLoading(false);
      });
  };

  const runExport = async () => {
    setExportErr('');
    setExporting(true);
    try {
      await downloadHrExport(token, selected, month, year, turnoverFrom, turnoverTo);
    } catch (e) {
      setExportErr(e.message || 'Export failed');
    }
    setExporting(false);
  };

  return (
    <div className="hr-dash-root">
      <div className="hr-panel-head">
        <h2>HR Reports</h2>
      </div>

      <div className="hr-report-pills">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            type="button"
            className={`hr-report-pill${selected === r.key ? ' hr-report-pill--on' : ''}`}
            onClick={() => {
              setSelected(r.key);
              setPayload(null);
              if (r.key === 'turnover') {
                const { startDate, endDate } = monthBoundsISO(year, month);
                setTurnoverFrom(startDate);
                setTurnoverTo(endDate);
              }
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <p className="card-title">Parameters</p>
        <div className="hr-filters">
          {(meta?.needsMonth || meta?.needsRange) && (
            <label>
              Month
              <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} />
            </label>
          )}
          {(meta?.needsMonth || meta?.needsYear || meta?.needsRange) && (
            <label>
              Year
              <input type="number" min={2020} max={2040} value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </label>
          )}
          {selected === 'turnover' && (
            <>
              <label>
                From (optional)
                <input type="date" value={turnoverFrom} onChange={(e) => setTurnoverFrom(e.target.value)} />
              </label>
              <label>
                To (optional)
                <input type="date" value={turnoverTo} onChange={(e) => setTurnoverTo(e.target.value)} />
              </label>
              <button type="button" className="btn btn-secondary" onClick={syncTurnoverFromMonth}>
                Reset range to month
              </button>
            </>
          )}
          <button type="button" className="btn btn-primary" onClick={run} disabled={loading}>
            {loading ? 'Loading…' : 'Generate report'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={runExport} disabled={loading || exporting}>
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
        {err && <p className="error-msg" style={{ marginTop: 12 }}>{err}</p>}
        {exportErr && <p className="error-msg" style={{ marginTop: 8 }}>{exportErr}</p>}
      </div>

      <ReportBody selected={selected} payload={payload} />
    </div>
  );
}
