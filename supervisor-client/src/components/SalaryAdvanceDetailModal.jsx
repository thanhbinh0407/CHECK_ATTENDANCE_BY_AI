import { useState, useEffect, useCallback } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:5000').replace(/\/$/, '');

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB');
  } catch {
    return '—';
  }
}

function initialsOf(name) {
  if (!name) return '—';
  const parts = String(name).trim().split(/\s+/);
  const a = parts[0]?.[0] || '';
  const b = parts[parts.length - 1]?.[0] || '';
  return (a + b).toUpperCase() || name[0].toUpperCase();
}

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('en-US');
}

export default function SalaryAdvanceDetailModal({ item, onClose, token: tokenProp }) {
  const token = tokenProp || localStorage.getItem('authToken');
  const status = item.approvalStatus || 'pending';
  const amt = Number(item.amount || 0).toLocaleString('en-US');

  const [previewPayload, setPreviewPayload] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState(null);

  const loadPreview = useCallback(async () => {
    if (!item?.id || !token) return;
    setPreviewLoading(true);
    setPreviewErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/salary-advances/${item.id}/salary-preview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Could not load salary preview');
      setPreviewPayload(data);
    } catch (e) {
      setPreviewErr(e.message || 'Preview failed');
      setPreviewPayload(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [item?.id, token]);

  useEffect(() => {
    setPreviewPayload(null);
    setPreviewErr(null);
    if (item?.id && token) loadPreview();
  }, [item?.id, token, loadPreview]);

  const pv = previewPayload?.preview;
  const att = previewPayload?.attendance;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 720, maxWidth: '94vw', padding: 0, overflow: 'hidden' }}
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
            Salary advance · #{item.id}
          </div>
          <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700 }}>
            {item.month}/{item.year} · {amt} VND
          </div>
          <div style={{ marginTop: 10 }}>
            <span className={`badge badge-${status}`}>
              {{ pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[status] || status}
            </span>
          </div>
        </div>

        <div style={{ padding: 24, background: '#f9fafb', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section
            style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
                color: '#6d28d9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initialsOf(item.User?.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{item.User?.name || `User #${item.userId}`}</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                {[item.User?.employeeCode, item.User?.email].filter(Boolean).join(' · ')}
              </div>
            </div>
          </section>

          <section style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 14, color: '#374151' }}>Salary preview (this request amount)</h4>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '6px 12px' }}
                onClick={loadPreview}
                disabled={previewLoading}
              >
                {previewLoading ? 'Loading…' : 'Refresh'}
              </button>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280', lineHeight: 1.45 }}>
              Estimated payroll for {item.month}/{item.year} including this advance as a deduction. Does not save changes.
            </p>
            {previewErr && (
              <div style={{ padding: 12, background: '#fef2f2', borderRadius: 8, color: '#b91c1c', fontSize: 13 }}>
                {previewErr}
              </div>
            )}
            {pv && !previewErr && (
              <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Base + allowances (in gross)</span>
                  <span style={{ fontWeight: 600 }}>{formatMoney(pv.baseSalary)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Bonus / add-ons</span>
                  <span style={{ fontWeight: 600 }}>{formatMoney(pv.bonus)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Gross</span>
                  <span style={{ fontWeight: 700 }}>{formatMoney(pv.grossSalary)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309' }}>
                  <span>Salary advance (deduct)</span>
                  <span style={{ fontWeight: 600 }}>−{formatMoney(pv.advanceDeduction)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>Total deductions (incl. tax &amp; insurance)</span>
                  <span style={{ fontWeight: 600 }}>{formatMoney(pv.deduction)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: 8,
                    marginTop: 4,
                    borderTop: '1px solid #e5e7eb',
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  <span>Net (preview)</span>
                  <span>{formatMoney(pv.finalSalary)}</span>
                </div>
                {att && (
                  <div style={{ marginTop: 8, padding: 10, background: '#f3f4f6', borderRadius: 8, fontSize: 12, color: '#4b5563' }}>
                    Attendance: late {att.lateCount}, early leave {att.earlyLeaveCount}, absent days {att.absentDays}, OT{' '}
                    {typeof att.overtimeHours === 'number' ? att.overtimeHours.toFixed(2) : att.overtimeHours}h
                  </div>
                )}
              </div>
            )}
          </section>

          <section style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#374151' }}>Reason</h4>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#111827', lineHeight: 1.5 }}>{item.reason || '—'}</p>
          </section>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            <Field label="Requested date" value={item.requestDate ? formatDate(item.requestDate) : formatDate(item.createdAt)} />
            <Field label="Approval level" value={item.approvalLevel != null ? String(item.approvalLevel) : '—'} />
            <Field label="Deducted from payroll" value={item.isDeducted ? 'Yes' : 'No'} />
            {status === 'approved' && (
              <Field label="Approved at" value={item.approvedAt ? formatDate(item.approvedAt) : '—'} />
            )}
            {status === 'rejected' && (
              <Field label="Rejected at" value={item.updatedAt ? formatDate(item.updatedAt) : '—'} />
            )}
            <Field label="Rejection reason" value={item.rejectionReason?.trim() ? item.rejectionReason : '—'} />
            <Field label="Salary record ID" value={item.salaryId != null ? String(item.salaryId) : '—'} />
            <Field
              label="Payout date (config)"
              value={item.payoutDueDate || previewPayload?.payoutDueDate || '—'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 12 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600, color: '#111827', wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}
