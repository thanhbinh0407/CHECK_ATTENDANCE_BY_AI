import { useState } from 'react';
import './SupervisorReports.css';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

function formatVnd(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(n || 0));
}

function buildReportUrl(type, month, year) {
  const m = Number(month);
  const y = Number(year);
  if (type === 'turnover') {
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    const qs = new URLSearchParams({
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    });
    return `${API}/reports/turnover?${qs}`;
  }
  if (type === 'leave-status') {
    return `${API}/reports/leave-status?year=${y}`;
  }
  const qs = new URLSearchParams({ month: String(m), year: String(y) });
  return `${API}/reports/${type}?${qs}`;
}

function ReportRenderer({ type, data }) {
  if (!data) return null;

  if (data.status === 'error') {
    return (
      <div className="sup-rep-alert sup-rep-alert--err">
        <strong>Could not load report</strong>
        <p>{data.message || 'Unknown error'}</p>
      </div>
    );
  }

  const rep = data.report;
  if (!rep && data.status !== 'success') {
    return (
      <div className="sup-rep-alert sup-rep-alert--err">
        <p>Unexpected response format.</p>
      </div>
    );
  }

  if (type === 'attendance' && rep?.report) {
    const rows = rep.report;
    return (
      <div className="sup-rep-card">
        <h3 className="sup-rep-card-title">Attendance — {rep.month}/{rep.year}</h3>
        <p className="sup-rep-muted">{rep.totalEmployees} employees</p>
        <div className="sup-rep-table-wrap">
          <table className="sup-rep-table">
            <thead>
              <tr>
                <th>Emp Code</th>
                <th>Full name</th>
                <th>Dept</th>
                <th>Present</th>
                <th>Leave</th>
                <th>Absent</th>
                <th>Late</th>
                <th>OT (hours)</th>
                <th>%</th>
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

  if (type === 'leave-status' && rep) {
    const rows = rep.report || [];
    const sum = rep.summary;
    return (
      <div className="sup-rep-card">
        <h3 className="sup-rep-card-title">Leave status — year {rep.year}</h3>
        {sum && (
          <div className="sup-rep-kpis">
            <div className="sup-rep-kpi"><span>Total leave used</span><strong>{sum.totalLeaveDaysUsed}</strong></div>
            <div className="sup-rep-kpi"><span>Remaining leave (est.)</span><strong>{sum.totalRemainingLeaveDays}</strong></div>
            <div className="sup-rep-kpi"><span>Avg utilization %</span><strong>{sum.averageUtilizationRate}</strong></div>
          </div>
        )}
        <div className="sup-rep-table-wrap">
          <table className="sup-rep-table">
            <thead>
              <tr><th>Code</th><th>Full name</th><th>Dept</th><th>Used</th><th>Remaining</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employeeId}>
                  <td>{r.employeeCode}</td>
                  <td>{r.employeeName}</td>
                  <td>{r.department}</td>
                  <td>{r.totalLeaveDaysUsed}</td>
                  <td>{r.remainingLeaveDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (type === 'overtime' && rep) {
    const sum = rep.summary;
    const byEmp = rep.byEmployee || [];
    return (
      <div className="sup-rep-card">
        <h3 className="sup-rep-card-title">Overtime — {rep.month}/{rep.year}</h3>
        {sum && (
          <div className="sup-rep-kpis">
            <div className="sup-rep-kpi"><span>Total hours</span><strong>{sum.totalHours}</strong></div>
            <div className="sup-rep-kpi"><span>Total requests</span><strong>{sum.totalRequests}</strong></div>
            <div className="sup-rep-kpi"><span>Employees</span><strong>{sum.totalEmployees}</strong></div>
          </div>
        )}
        <div className="sup-rep-table-wrap">
          <table className="sup-rep-table">
            <thead>
              <tr><th>Code</th><th>Full name</th><th>Dept</th><th>Hours</th><th>Requests</th></tr>
            </thead>
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
      </div>
    );
  }

  if (type === 'payroll-cost' && rep) {
    const sum = rep.summary;
    const rows = rep.breakdown || [];
    return (
      <div className="sup-rep-card">
        <h3 className="sup-rep-card-title">Payroll cost — {rep.month}/{rep.year}</h3>
        {sum && (
          <div className="sup-rep-kpis sup-rep-kpis--wrap">
            <div className="sup-rep-kpi"><span>Total gross</span><strong>{formatVnd(sum.totalGrossSalary)}</strong></div>
            <div className="sup-rep-kpi"><span>Total net</span><strong>{formatVnd(sum.totalNetSalary)}</strong></div>
            <div className="sup-rep-kpi"><span>Employee insurance</span><strong>{formatVnd(sum.totalEmployeeInsurance)}</strong></div>
            <div className="sup-rep-kpi"><span>Employer insurance</span><strong>{formatVnd(sum.totalEmployerInsurance)}</strong></div>
            <div className="sup-rep-kpi"><span>Tax</span><strong>{formatVnd(sum.totalTax)}</strong></div>
            <div className="sup-rep-kpi"><span>Total cost</span><strong>{formatVnd(sum.totalCost)}</strong></div>
          </div>
        )}
        <div className="sup-rep-table-wrap">
          <table className="sup-rep-table">
            <thead>
              <tr>
                <th>Employee</th><th>Dept</th><th>Gross</th><th>Net</th><th>Employee Ins.</th><th>Tax</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employeeId}>
                  <td>{r.employeeName}</td>
                  <td>{r.department}</td>
                  <td>{formatVnd(r.grossSalary)}</td>
                  <td>{formatVnd(r.netSalary)}</td>
                  <td>{formatVnd(r.employeeInsurance)}</td>
                  <td>{formatVnd(r.tax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (type === 'average-income' && rep) {
    return (
      <div className="sup-rep-card">
        <h3 className="sup-rep-card-title">Average income — {rep.month}/{rep.year}</h3>
        {rep.overall && (
          <div className="sup-rep-kpis">
            <div className="sup-rep-kpi"><span>Company average</span><strong>{formatVnd(rep.overall.averageSalary)}</strong></div>
            <div className="sup-rep-kpi"><span>Min</span><strong>{formatVnd(rep.overall.minSalary)}</strong></div>
            <div className="sup-rep-kpi"><span>Max</span><strong>{formatVnd(rep.overall.maxSalary)}</strong></div>
          </div>
        )}
        <h4 className="sup-rep-subtitle">By department</h4>
        <div className="sup-rep-table-wrap">
          <table className="sup-rep-table">
            <thead>
              <tr><th>Department</th><th>Headcount</th><th>Average</th><th>Min</th><th>Max</th></tr>
            </thead>
            <tbody>
              {(rep.byDepartment || []).map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td>{r.count}</td>
                  <td>{formatVnd(r.average)}</td>
                  <td>{formatVnd(r.min)}</td>
                  <td>{formatVnd(r.max)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (type === 'turnover' && rep) {
    const det = rep.details || {};
    return (
      <div className="sup-rep-card">
        <h3 className="sup-rep-card-title">Workforce turnover</h3>
        <div className="sup-rep-kpis">
          <div className="sup-rep-kpi"><span>New hires</span><strong>{rep.newEmployees}</strong></div>
          <div className="sup-rep-kpi"><span>Terminated</span><strong>{rep.terminatedEmployees}</strong></div>
          <div className="sup-rep-kpi"><span>Turnover %</span><strong>{rep.turnoverRate}</strong></div>
        </div>
        <h4 className="sup-rep-subtitle">New hires</h4>
        <div className="sup-rep-table-wrap sup-rep-mb">
          <table className="sup-rep-table">
            <thead><tr><th>Code</th><th>Full name</th><th>Start date</th></tr></thead>
            <tbody>
              {(det.newEmployees || []).map((e) => (
                <tr key={e.id}><td>{e.employeeCode}</td><td>{e.name}</td><td>{String(e.startDate || '').slice(0, 10)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <h4 className="sup-rep-subtitle">Terminated</h4>
        <div className="sup-rep-table-wrap">
          <table className="sup-rep-table">
            <thead><tr><th>Code</th><th>Full name</th><th>Status</th></tr></thead>
            <tbody>
              {(det.terminatedEmployees || []).map((e) => (
                <tr key={e.id}><td>{e.employeeCode}</td><td>{e.name}</td><td>{e.employmentStatus}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="sup-rep-card">
      <h3 className="sup-rep-card-title">Data</h3>
      <pre className="sup-rep-raw">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export default function SupervisorReports({ token }) {
  const [reportType, setReportType] = useState('attendance');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const url = buildReportUrl(reportType, month, year);
      const res = await fetch(url, { headers: authHeaders(token) });
      const data = await res.json();
      setReport(data);
    } catch (e) {
      setReport({ status: 'error', message: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="sup-rep-root">
      <div className="sup-rep-toolbar card">
        <div className="sup-rep-filters">
          <select value={reportType} onChange={(e) => { setReportType(e.target.value); setReport(null); }}>
            <option value="attendance">Attendance</option>
            <option value="leave-status">Leave status (yearly)</option>
            <option value="overtime">Overtime</option>
            <option value="payroll-cost">Payroll cost</option>
            <option value="average-income">Average income</option>
            <option value="turnover">Workforce turnover (monthly)</option>
          </select>
          {(reportType !== 'leave-status') && (
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Month {i + 1}</option>
              ))}
            </select>
          )}
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={loadReport} disabled={loading}>
            {loading ? 'Loading…' : 'View report'}
          </button>
        </div>
        <p className="sup-rep-hint">
          {reportType === 'leave-status' && 'Leave status uses only the selected year.'}
          {reportType === 'turnover' && 'Turnover range is from start to end of selected month.'}
        </p>
      </div>

      {loading && <div className="loading">Loading report…</div>}
      {!loading && report && <ReportRenderer type={reportType} data={report} />}
    </div>
  );
}
