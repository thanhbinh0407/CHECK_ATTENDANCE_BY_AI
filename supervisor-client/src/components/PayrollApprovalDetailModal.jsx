import { useCallback, useEffect, useState } from 'react';
import { toastError } from '../lib/notify.jsx';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function initialsOf(name) {
  if (!name) return '—';
  const parts = String(name).trim().split(/\s+/);
  const a = parts[0]?.[0] || '';
  const b = parts[parts.length - 1]?.[0] || '';
  return (a + b).toUpperCase() || name[0].toUpperCase();
}

function money(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${Number(n).toLocaleString('en-US')} VND`;
}

export default function PayrollApprovalDetailModal({ apiBase, token, salaryId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [salary, setSalary] = useState(null);
  const [breakdown, setBreakdown] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${apiBase}/salary/${salaryId}`, { headers: authHeaders(token) }),
        fetch(`${apiBase}/salary/${salaryId}/breakdown`, { headers: authHeaders(token) }),
      ]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      if (!r1.ok || d1.status !== 'success') {
        toastError(d1.message || 'Cannot load salary');
        setSalary(null);
      } else {
        setSalary(d1.salary);
      }
      if (!r2.ok || d2.status !== 'success') {
        setBreakdown(null);
      } else {
        setBreakdown(d2.breakdown);
      }
    } catch (e) {
      toastError(e.message || 'Network error');
      setSalary(null);
      setBreakdown(null);
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, salaryId]);

  useEffect(() => {
    load();
  }, [load]);

  const u = salary?.User;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 800, maxWidth: '96vw', padding: 0, overflow: 'hidden', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '20px 24px 18px',
            background: 'linear-gradient(90deg, #7029d1 0%, #8b46ff 100%)',
            color: '#fff',
            position: 'relative',
          }}
        >
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              color: '#fff',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              width: 30,
              height: 30,
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 18,
            }}
            aria-label="Close"
          >
            ×
          </button>
          <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85 }}>
            Payroll · #{salaryId}
          </div>
          <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700 }}>
            {salary ? `${salary.month}/${salary.year}` : '—'}
            {salary && (
              <span style={{ fontWeight: 600, fontSize: 16, marginLeft: 10, opacity: 0.95 }}>
                · {money(salary.finalSalary ?? salary.netSalary ?? salary.totalSalary)}
              </span>
            )}
          </div>
          {salary && (
            <div style={{ marginTop: 10 }}>
              <span
                className={`badge badge-${
                  salary.status === 'pending'
                    ? 'pending'
                    : salary.status === 'approved' || salary.status === 'paid'
                      ? 'approved'
                      : 'rejected'
                }`}
              >
                {salary.status}
              </span>
            </div>
          )}
        </div>

        <div style={{ padding: 24, background: '#f9fafb' }}>
          {loading ? (
            <div className="loading">Loading…</div>
          ) : !salary ? (
            <p style={{ color: '#6b7280' }}>No data</p>
          ) : (
            <>
              <section
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
                    color: '#7029d1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {initialsOf(u?.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{u?.name || `User #${salary.userId}`}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {[u?.employeeCode, u?.email, u?.Department?.name, u?.JobTitle?.name].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </section>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <MiniField label="Base salary" value={money(salary.baseSalary)} />
                <MiniField label="Bonus" value={money(salary.bonus)} />
                <MiniField label="Gross" value={money(salary.grossSalary)} />
                <MiniField label="Deduction" value={money(salary.deduction)} />
                <MiniField label="Final / Net" value={money(salary.finalSalary)} />
                {salary.notes && <MiniField label="Notes" value={salary.notes} wide />}
              </div>

              {breakdown && (
                <>
                  <h4 style={{ margin: '0 0 10px', fontSize: 15, color: '#111827' }}>Calculation breakdown</h4>
                  {breakdown.attendance && (
                    <div
                      style={{
                        background: '#fff',
                        borderRadius: 10,
                        border: '1px solid #e5e7eb',
                        padding: 12,
                        marginBottom: 12,
                        fontSize: 13,
                        color: '#374151',
                      }}
                    >
                      Working days: {breakdown.attendance.totalDays} · Present: {breakdown.attendance.presentDays} ·
                      Absent: {breakdown.attendance.absentDays} · Late: {breakdown.attendance.lateCount} · OT hours:{' '}
                      {breakdown.attendance.overtimeHours}
                    </div>
                  )}
                  {Array.isArray(breakdown.bonusBreakdown) && breakdown.bonusBreakdown.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Bonuses</div>
                      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                            <th style={{ padding: 8 }}>Item</th>
                            <th style={{ padding: 8, textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {breakdown.bonusBreakdown.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: 8 }}>{row.ruleName || row.reason || '—'}</td>
                              <td style={{ padding: 8, textAlign: 'right' }}>{money(row.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {Array.isArray(breakdown.deductionBreakdown) && breakdown.deductionBreakdown.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Deductions</div>
                      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                            <th style={{ padding: 8 }}>Item</th>
                            <th style={{ padding: 8, textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {breakdown.deductionBreakdown.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: 8 }}>{row.ruleName || row.reason || '—'}</td>
                              <td style={{ padding: 8, textAlign: 'right' }}>{money(row.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniField({ label, value, wide }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 10,
        border: '1px solid #e5e7eb',
        padding: 10,
        gridColumn: wide ? '1 / -1' : undefined,
      }}
    >
      <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{value}</div>
    </div>
  );
}
