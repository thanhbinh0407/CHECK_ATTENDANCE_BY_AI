import { useState, useEffect, useMemo } from 'react';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

function formatVnd(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(n || 0));
}

function BarList({ items, valueKey = 'value', labelKey = 'name', max }) {
  const m = max || Math.max(1, ...items.map((x) => Number(x[valueKey]) || 0));
  return (
    <div>
      {items.map((row, i) => {
        const v = Number(row[valueKey]) || 0;
        const pct = Math.min(100, (v / m) * 100);
        return (
          <div key={i} className="hr-bar-row">
            <div className="hr-bar-row-top">
              <span title={row[labelKey]}>{row[labelKey]}</span>
              <strong>{v}</strong>
            </div>
            <div className="hr-bar-track">
              <div className="hr-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendBars({ points, valueKey, labelKey }) {
  if (!points?.length) return <div className="hr-empty">Không có dữ liệu xu hướng</div>;
  const m = Math.max(1, ...points.map((p) => Math.abs(Number(p[valueKey]) || 0)));
  return (
    <div>
      {points.map((p, i) => {
        const v = Number(p[valueKey]) || 0;
        const pct = (Math.abs(v) / m) * 100;
        return (
          <div key={i} className="hr-bar-row">
            <div className="hr-bar-row-top">
              <span>{p[labelKey]}</span>
              <strong>{typeof v === 'number' && v > 1e6 ? formatVnd(v) : v.toFixed ? v.toFixed(1) : v}</strong>
            </div>
            <div className="hr-bar-track">
              <div className="hr-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function HrAnalytics({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    setLoading(true);
    setErr('');
    fetch(`${API}/analytics/dashboard?month=${month}&year=${year}`, { headers: authHeaders(token) })
      .then((r) => r.json())
      .then((j) => {
        if (j.status === 'success' && j.analytics) setData(j.analytics);
        else setErr(j.message || 'Không tải được dữ liệu phân tích');
        setLoading(false);
      })
      .catch((e) => {
        setErr(e.message);
        setLoading(false);
      });
  }, [token, month, year]);

  const summary = data?.summary;
  const charts = data?.charts;

  const deptMax = useMemo(() => {
    const arr = charts?.structureByDepartment || [];
    return Math.max(1, ...arr.map((x) => Number(x.value) || 0));
  }, [charts]);

  if (loading) {
    return (
      <div className="hr-dash-root">
        <div className="loading">Đang tải phân tích…</div>
      </div>
    );
  }

  return (
    <div className="hr-dash-root">
      <div className="hr-panel-head">
        <h2>Phân tích HR</h2>
        <div className="hr-filters">
          <label>
            Tháng
            <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} />
          </label>
          <label>
            Năm
            <input type="number" min={2020} max={2040} value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </label>
        </div>
      </div>

      {err && <div className="hr-alert-err">{err}</div>}

      {data && !err && (
        <>
          <div className="hr-stat-grid">
            <div className="hr-stat-box">
              <div className="lbl">Tổng nhân viên (active)</div>
              <div className="val">{summary?.totalEmployees ?? '—'}</div>
            </div>
            <div className="hr-stat-box">
              <div className="lbl">Phòng ban</div>
              <div className="val">{summary?.totalDepartments ?? '—'}</div>
            </div>
            <div className="hr-stat-box">
              <div className="lbl">Chức danh</div>
              <div className="val">{summary?.totalJobTitles ?? '—'}</div>
            </div>
            <div className="hr-stat-box">
              <div className="lbl">Tỷ lệ chấm công TB (tháng)</div>
              <div className="val">{summary?.currentMonthAttendance?.averageAttendanceRate ?? '—'}%</div>
            </div>
            <div className="hr-stat-box">
              <div className="lbl">Chi phí lương (tháng)</div>
              <div className="val" style={{ fontSize: '1rem' }}>{formatVnd(summary?.currentMonthPayroll?.totalCost)}</div>
            </div>
            <div className="hr-stat-box">
              <div className="lbl">Giờ tăng ca (tháng)</div>
              <div className="val">{summary?.currentMonthOvertime?.totalHours ?? '—'}</div>
            </div>
          </div>

          <div className="card">
            <p className="card-title">Cơ cấu theo phòng ban</p>
            <BarList items={charts?.structureByDepartment || []} max={deptMax} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <div className="card">
              <p className="card-title">Loại hợp đồng</p>
              <BarList items={charts?.structureByContractType || []} />
            </div>
            <div className="card">
              <p className="card-title">Trình độ / học vấn</p>
              <BarList items={charts?.educationLevel || []} />
            </div>
          </div>

          <div className="hr-mini-title">Xu hướng 6 tháng</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
            <div className="card">
              <p className="card-title">Tỷ lệ chấm công TB</p>
              <TrendBars points={charts?.attendanceTrend || []} valueKey="averageAttendanceRate" labelKey="label" />
            </div>
            <div className="card">
              <p className="card-title">Tỷ lệ biến động nhân sự (%)</p>
              <TrendBars points={charts?.turnoverTrend || []} valueKey="turnoverRate" labelKey="label" />
            </div>
            <div className="card">
              <p className="card-title">Tổng chi phí lương</p>
              <TrendBars points={charts?.payrollTrend || []} valueKey="totalCost" labelKey="label" />
            </div>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <p className="card-title">Tăng ca theo phòng ban (giờ)</p>
            <BarList
              items={(charts?.overtimeByDepartment || []).map((d) => ({ name: d.name, value: d.hours }))}
              valueKey="value"
              labelKey="name"
            />
          </div>
        </>
      )}
    </div>
  );
}
