import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { toastError } from '../lib/notify.jsx';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const COLORS = ['#5b21b6', '#7c3aed', '#a855f7', '#c084fc', '#818cf8', '#6366f1', '#4f46e5', '#ec4899', '#f97316', '#f59e0b'];

function formatVND(n) {
  return `${Number(n || 0).toLocaleString('en-US')}`;
}

export default function AnalyticsDashboard({ token }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/analytics/dashboard?month=${month}&year=${year}`, {
        headers: authHeaders(token),
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') {
        toastError(json.message || 'Cannot load analytics');
        setData(null);
        return;
      }
      setData(json.analytics);
    } catch (err) {
      toastError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [token, month, year]);

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary;
  const charts = data?.charts;

  const years = useMemo(() => {
    const current = now.getFullYear();
    return [current - 2, current - 1, current, current + 1];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="sup-approval-toolbar card">
        <div className="sup-approval-toolbar-inner">
          <div className="sup-approval-filter-wrap">
            <label className="sup-approval-label" htmlFor="sup-an-month">Month</label>
            <select
              id="sup-an-month"
              className="sup-approval-select"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="sup-approval-filter-wrap">
            <label className="sup-approval-label" htmlFor="sup-an-year">Year</label>
            <select
              id="sup-an-year"
              className="sup-approval-select"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="sup-approval-filter-wrap">
            <label className="sup-approval-label">&nbsp;</label>
            <button className="btn btn-primary" onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          <div className="sup-approval-meta">
            {loading ? 'Loading analytics…' : `Period ${month}/${year}`}
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="loading">Loading analytics…</div>
      ) : !data ? (
        <div className="card"><p>No analytics data.</p></div>
      ) : (
        <>
          <div className="stats-grid">
            <Kpi label="Total employees" value={summary?.totalEmployees ?? 0} />
            <Kpi label="Departments" value={summary?.totalDepartments ?? 0} />
            <Kpi label="Job titles" value={summary?.totalJobTitles ?? 0} />
            <Kpi label="Avg attendance %" value={summary?.currentMonthAttendance?.averageAttendanceRate ?? 0} />
            <Kpi label="Payroll cost (VND)" value={formatVND(summary?.currentMonthPayroll?.totalCost)} />
            <Kpi label="Overtime hours" value={summary?.currentMonthOvertime?.totalHours ?? 0} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 16 }}>
            <PieCard title="Structure by department" data={charts?.structureByDepartment} />
            <PieCard title="Contract type distribution" data={charts?.structureByContractType} />
            <PieCard title="Age distribution" data={charts?.ageDistribution} />
            <PieCard title="Seniority distribution" data={charts?.seniorityDistribution} />
            <PieCard title="Education level" data={charts?.educationLevel} />
          </div>

          <div className="card">
            <p className="card-title">Turnover trend (last 6 months)</p>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={charts?.turnoverTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="turnoverRate" name="Turnover %" stroke="#5b21b6" strokeWidth={2} />
                  <Line type="monotone" dataKey="newEmployees" name="New hires" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="terminatedEmployees" name="Terminated" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <p className="card-title">Payroll cost trend (last 6 months)</p>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={charts?.payrollTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
                  <Tooltip formatter={(v) => formatVND(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="totalCost" name="Total cost" stroke="#4f46e5" strokeWidth={2} />
                  <Line type="monotone" dataKey="totalGrossSalary" name="Gross salary" stroke="#7c3aed" strokeWidth={2} />
                  <Line type="monotone" dataKey="totalInsurance" name="Insurance" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="totalTax" name="Tax" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <p className="card-title">Attendance trend (last 6 months)</p>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={charts?.attendanceTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="averageAttendanceRate" name="Avg attendance %" stroke="#5b21b6" strokeWidth={2} />
                  <Line type="monotone" dataKey="totalLate" name="Total late" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="totalAbsent" name="Total absent" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
            <div className="card">
              <p className="card-title">Overtime by department</p>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={charts?.overtimeByDepartment || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" name="Hours" fill="#5b21b6" />
                    <Bar dataKey="employees" name="Employees" fill="#a855f7" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <p className="card-title">Top 10 overtime employees</p>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={charts?.topOvertimeEmployees || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="hours" name="Hours" fill="#7c3aed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-number">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function PieCard({ title, data }) {
  const rows = Array.isArray(data) ? data.filter((d) => (d.value ?? 0) > 0) : [];
  return (
    <div className="card">
      <p className="card-title">{title}</p>
      {rows.length === 0 ? (
        <p style={{ color: '#718096', textAlign: 'center', padding: 24 }}>No data</p>
      ) : (
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={rows} dataKey="value" nameKey="name" outerRadius={90} label>
                {rows.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
