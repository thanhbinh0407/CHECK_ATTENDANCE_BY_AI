import { useCallback, useEffect, useState } from 'react';
import { toastError, toastInfo, toastWarning } from '../lib/notify.jsx';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB');
  } catch {
    return '—';
  }
}

function relationshipLabel(r) {
  return ({
    spouse: 'Spouse',
    child: 'Child',
    parent: 'Parent',
    grandparent: 'Grandparent',
    sibling: 'Sibling',
    other: 'Other',
  })[r] || r || '—';
}

function genderLabel(g) {
  return ({ male: 'Male', female: 'Female', other: 'Other' })[g] || g || '—';
}

export default function DependentApprovals({ token }) {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `${API}/dependents?approvalStatus=${statusFilter}`
        : `${API}/dependents`;
      const res = await fetch(url, { headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        toastError(data.message || 'Cannot load dependents');
        setItems([]);
        return;
      }
      setItems(Array.isArray(data.dependents) ? data.dependents : []);
    } catch (err) {
      toastError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const approve = async () => {
    const { item } = actionModal;
    try {
      const res = await fetch(`${API}/dependents/${item.id}/approve`, {
        method: 'PUT',
        headers: authHeaders(token),
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        toastError(data.message || 'Approve failed');
        return;
      }
      toastInfo('Dependent approved');
      setActionModal(null);
      setReason('');
      load();
    } catch (err) {
      toastError(err.message);
    }
  };

  const reject = async () => {
    const { item } = actionModal;
    if (!reason.trim()) {
      toastWarning('Please enter a rejection reason.');
      return;
    }
    try {
      const res = await fetch(`${API}/dependents/${item.id}/reject`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        toastError(data.message || 'Reject failed');
        return;
      }
      toastInfo('Dependent rejected');
      setActionModal(null);
      setReason('');
      load();
    } catch (err) {
      toastError(err.message);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter((it) => {
        const hay = [
          it.fullName,
          relationshipLabel(it.relationship),
          it.idNumber,
          it.phoneNumber,
          it.User?.name,
          it.User?.employeeCode,
          it.User?.email,
          String(it.id ?? ''),
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      })
    : items;

  return (
    <div>
      <div className="sup-approval-toolbar card">
        <div className="sup-approval-toolbar-inner">
          <div className="sup-approval-search-wrap sup-approval-search-wrap--grow">
            <label className="sup-approval-label" htmlFor="sup-dep-search">Search</label>
            <input
              id="sup-dep-search"
              className="sup-approval-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, employee code, ID number…"
              autoComplete="off"
            />
          </div>
          <div className="sup-approval-filter-wrap">
            <label className="sup-approval-label" htmlFor="sup-dep-status">Status</label>
            <select
              id="sup-dep-status"
              className="sup-approval-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="sup-approval-meta">
            {loading ? 'Loading…' : `${filtered.length} of ${items.length} shown`}
          </div>
        </div>
      </div>

      <div className="card sup-approval-table-card">
        {loading ? <div className="loading">Loading...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Employee</th>
                  <th>Full name</th>
                  <th>Relationship</th>
                  <th>DoB</th>
                  <th>ID number</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const status = item.approvalStatus || 'pending';
                  return (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>
                        {item.User?.name || item.userId}
                        {item.User?.employeeCode && (
                          <div style={{ fontSize: 12, color: '#718096' }}>{item.User.employeeCode}</div>
                        )}
                      </td>
                      <td>{item.fullName || '—'}</td>
                      <td>{relationshipLabel(item.relationship)}</td>
                      <td>{formatDate(item.dateOfBirth)}</td>
                      <td>{item.idNumber || '—'}</td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>
                        <span className={`badge badge-${status}`}>
                          {{ pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[status] || status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: 12, padding: '4px 10px' }}
                            onClick={() => setDetail(item)}
                          >View</button>
                          {status === 'pending' && (
                            <>
                              <button
                                className="btn btn-approve"
                                style={{ fontSize: 12, padding: '4px 10px' }}
                                onClick={() => { setActionModal({ item, action: 'approve' }); setReason(''); }}
                              >✓ Approve</button>
                              <button
                                className="btn btn-reject"
                                style={{ fontSize: 12, padding: '4px 10px' }}
                                onClick={() => { setActionModal({ item, action: 'reject' }); setReason(''); }}
                              >✗ Reject</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: '#718096', padding: 20 }}>No dependents</td></tr>
                )}
                {items.length > 0 && filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: '#718096', padding: 20 }}>No rows match your search</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detail && (
        <DependentDetailModal detail={detail} onClose={() => setDetail(null)} />
      )}

      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{actionModal.action === 'approve' ? '✓ Confirm approval' : '✗ Confirm rejection'}</h3>
              <button className="close-btn" onClick={() => setActionModal(null)}>×</button>
            </div>
            <p style={{ color: '#4a5568', marginBottom: 12, fontSize: 13 }}>
              <strong>{actionModal.item.User?.name || '—'}</strong>
              {' · '}
              {actionModal.item.fullName} ({relationshipLabel(actionModal.item.relationship)})
            </p>
            <div className="form-group">
              <label>{actionModal.action === 'approve' ? 'Comment (optional)' : 'Rejection reason *'}</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={actionModal.action === 'approve' ? 'Optional note…' : 'Explain the rejection…'}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
              {actionModal.action === 'approve'
                ? <button className="btn btn-approve" onClick={approve}>Confirm approval</button>
                : <button className="btn btn-reject" onClick={reject}>Confirm rejection</button>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_META = {
  pending: { label: 'Pending review', bg: '#fef3c7', fg: '#92400e', dot: '#f59e0b' },
  approved: { label: 'Approved', bg: '#dcfce7', fg: '#166534', dot: '#22c55e' },
  rejected: { label: 'Rejected', bg: '#fee2e2', fg: '#991b1b', dot: '#ef4444' },
};

const RELATIONSHIP_ICONS = {
  spouse: '💍',
  child: '🧒',
  parent: '👨‍👩‍👧',
  grandparent: '👵',
  sibling: '🧑‍🤝‍🧑',
  other: '👤',
};

function initialsOf(name) {
  if (!name) return '—';
  const parts = String(name).trim().split(/\s+/);
  const a = parts[0]?.[0] || '';
  const b = parts[parts.length - 1]?.[0] || '';
  return (a + b).toUpperCase() || name[0].toUpperCase();
}

function ageFromDob(dob) {
  if (!dob) return null;
  try {
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

function DependentDetailModal({ detail, onClose }) {
  const status = detail.approvalStatus || 'pending';
  const meta = STATUS_META[status] || STATUS_META.pending;
  const relLabel = relationshipLabel(detail.relationship);
  const relIcon = RELATIONSHIP_ICONS[detail.relationship] || RELATIONSHIP_ICONS.other;
  const age = ageFromDob(detail.dateOfBirth);
  const isMinor = age !== null && age < 18;

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
            background: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 55%, #8b5cf6 100%)',
            color: '#fff',
            position: 'relative',
          }}
        >
          <button
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
              lineHeight: 1,
            }}
            aria-label="Close"
          >×</button>

          <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85 }}>
            Dependent · #{detail.id}
          </div>
          <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700, lineHeight: 1.3, paddingRight: 40 }}>
            {detail.fullName || 'Unnamed dependent'}
          </div>
          <div style={{ marginTop: 4, fontSize: 13, opacity: 0.9 }}>
            <span aria-hidden>{relIcon}</span> {relLabel}
            {age !== null ? <> · {age} yrs old</> : null}
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 999,
                background: meta.bg,
                color: meta.fg,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot }} />
              {meta.label}
            </span>
            {isMinor && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.18)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >Minor</span>
            )}
          </div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, background: '#f9fafb' }}>
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
                fontSize: 15,
                flexShrink: 0,
              }}
            >
              {initialsOf(detail.User?.name)}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.06em' }}>
                Registered by
              </div>
              <div style={{ marginTop: 2, fontSize: 15, fontWeight: 600, color: '#111827' }}>
                {detail.User?.name || `User #${detail.userId}`}
              </div>
              <div style={{ marginTop: 2, fontSize: 13, color: '#6b7280', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {detail.User?.employeeCode && <span>{detail.User.employeeCode}</span>}
                {detail.User?.email && (
                  <>
                    {detail.User?.employeeCode && <span style={{ color: '#d1d5db' }}>·</span>}
                    <span style={{ wordBreak: 'break-all' }}>{detail.User.email}</span>
                  </>
                )}
              </div>
            </div>
          </section>

          <section
            style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '16px 18px',
            }}
          >
            <SectionTitle>Personal information</SectionTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                columnGap: 18,
                rowGap: 14,
                marginTop: 12,
              }}
            >
              <DetailRow label="Relationship" value={relLabel} />
              <DetailRow label="Gender" value={genderLabel(detail.gender)} />
              <DetailRow
                label="Date of birth"
                value={
                  detail.dateOfBirth
                    ? `${formatDate(detail.dateOfBirth)}${age !== null ? ` · ${age} yrs` : ''}`
                    : null
                }
              />
              <DetailRow label="Occupation" value={detail.occupation} />
              <DetailRow label="ID number" value={detail.idNumber} mono />
            </div>
          </section>

          <section
            style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '16px 18px',
            }}
          >
            <SectionTitle>Contact</SectionTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                columnGap: 18,
                rowGap: 14,
                marginTop: 12,
              }}
            >
              <DetailRow
                label="Phone"
                value={
                  detail.phoneNumber
                    ? <a href={`tel:${detail.phoneNumber}`} style={{ color: '#6d28d9', textDecoration: 'none' }}>{detail.phoneNumber}</a>
                    : null
                }
              />
              <DetailRow
                label="Email"
                value={
                  detail.email
                    ? <a href={`mailto:${detail.email}`} style={{ color: '#6d28d9', textDecoration: 'none', wordBreak: 'break-all' }}>{detail.email}</a>
                    : null
                }
              />
              {detail.address && <DetailRow label="Address" value={detail.address} full />}
            </div>
          </section>

          <section
            style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '16px 18px',
            }}
          >
            <SectionTitle>Review</SectionTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                columnGap: 18,
                rowGap: 14,
                marginTop: 12,
              }}
            >
              <DetailRow label="Status" value={meta.label} />
              <DetailRow label="Submitted" value={formatDate(detail.createdAt)} />
              {detail.notes && <DetailRow label="Notes" value={detail.notes} full />}
              {detail.rejectionReason && (
                <DetailRow label="Rejection reason" value={detail.rejectionReason} full />
              )}
            </div>
          </section>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '14px 24px',
            background: '#fff',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        color: '#7c3aed',
        letterSpacing: '0.08em',
      }}
    >
      {children}
    </div>
  );
}

function DetailRow({ label, value, full, mono }) {
  return (
    <div style={{ gridColumn: full ? '1 / span 2' : 'auto', minWidth: 0 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          color: '#6b7280',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 4,
          color: '#111827',
          fontSize: 14,
          lineHeight: 1.5,
          wordBreak: 'break-word',
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
        }}
      >
        {value || <span style={{ color: '#9ca3af' }}>—</span>}
      </div>
    </div>
  );
}
