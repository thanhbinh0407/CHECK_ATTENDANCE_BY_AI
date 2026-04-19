import { useState } from 'react';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

const REPORTS = [
  { key: 'structure', label: 'Workforce structure', path: '/reports/structure' },
  { key: 'attendance', label: 'Attendance summary', path: '/reports/attendance', needsMonth: true },
  { key: 'leave-status', label: 'Leave status', path: '/reports/leave-status', needsYear: true },
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

  if (selected === 'turnover' && rep) {
    const det = rep.details || {};
    return (
      <div className="card">
        <p className="card-title">Workforce turnover</p>
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
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const meta = REPORTS.find((x) => x.key === selected);

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
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      q.set('startDate', start.toISOString().slice(0, 10));
      q.set('endDate', end.toISOString().slice(0, 10));
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
            onClick={() => { setSelected(r.key); setPayload(null); }}
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
          <button type="button" className="btn btn-primary" onClick={run} disabled={loading}>
            {loading ? 'Loading…' : 'Generate report'}
          </button>
        </div>
        {err && <p className="error-msg" style={{ marginTop: 12 }}>{err}</p>}
      </div>

      <ReportBody selected={selected} payload={payload} />
    </div>
  );
}
