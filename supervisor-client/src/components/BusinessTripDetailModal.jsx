function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB');
  } catch {
    return '—';
  }
}

function transportLabel(t) {
  return ({ plane: 'Plane', train: 'Train', bus: 'Bus', car: 'Car', other: 'Other' })[t] || t || '—';
}

function initialsOf(name) {
  if (!name) return '—';
  const parts = String(name).trim().split(/\s+/);
  const a = parts[0]?.[0] || '';
  const b = parts[parts.length - 1]?.[0] || '';
  return (a + b).toUpperCase() || name[0].toUpperCase();
}

export default function BusinessTripDetailModal({ item, onClose }) {
  const status = item.approvalStatus || item.status || 'pending';
  const pendingMultilevel = status === 'pending' && Number(item.approvalLevel) > 1;

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
            Business trip · #{item.id}
          </div>
          <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700 }}>{item.destination || '—'}</div>
          <div style={{ marginTop: 4, fontSize: 13, opacity: 0.9 }}>
            {formatDate(item.startDate)} → {formatDate(item.endDate)}
          </div>
          <div style={{ marginTop: 10 }}>
            <span
              className={pendingMultilevel ? 'badge badge-in-progress' : `badge badge-${status}`}
              title={pendingMultilevel ? 'Waiting for the next approver in the chain.' : undefined}
            >
              {pendingMultilevel
                ? 'In progress'
                : ({ pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[status] || status)}
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
            <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#374151' }}>Purpose</h4>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#111827', lineHeight: 1.5 }}>{item.purpose || '—'}</p>
          </section>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            <Field label="Estimated cost (VND)" value={item.estimatedCost != null ? Number(item.estimatedCost).toLocaleString('en-US') : '—'} />
            <Field label="Transport" value={transportLabel(item.transportType)} />
            <Field label="Accommodation" value={item.accommodation || '—'} />
            <Field label="Approval level" value={item.approvalLevel != null ? String(item.approvalLevel) : '—'} />
            {status === 'approved' && (
              <Field label="Approved at" value={item.approvedAt ? formatDate(item.approvedAt) : '—'} />
            )}
            {status === 'rejected' && (
              <Field
                label="Rejected at"
                value={item.updatedAt ? formatDate(item.updatedAt) : '—'}
              />
            )}
            {status === 'rejected' && (
              <Field label="Rejection reason" value={item.rejectionReason?.trim() ? item.rejectionReason : '—'} />
            )}
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
