import { useCallback, useEffect, useState, useRef } from 'react';
import { toastError, toastSuccess, toastWarning } from '../lib/notify.jsx';
import { sortApprovalsByRecency } from '../utils/approvalSort.js';
import socket from '../socket.js';

const API = 'http://localhost:5000/api';
const API_BASE = 'http://localhost:5000';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

function extensionOf(path) {
  if (!path) return '';
  const clean = String(path).split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  return dot === -1 ? '' : clean.slice(dot + 1).toLowerCase();
}

function absoluteDocumentUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

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

function qualificationTypeLabel(t) {
  return ({
    certificate: 'Certificate',
    degree: 'Degree',
    license: 'License',
    training: 'Training',
  })[t] || t || '—';
}

export default function QualificationApprovals({ token }) {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null); // qualification for detail modal
  const [actionModal, setActionModal] = useState(null); // { item, action }
  const [reason, setReason] = useState('');
  const decisionLockRef = useRef(false);

  const load = useCallback(async (opts = {}) => {
    const silent = Boolean(opts.silent);
    if (!silent) setLoading(true);
    try {
      const url = statusFilter
        ? `${API}/qualifications?approvalStatus=${statusFilter}`
        : `${API}/qualifications`;
      const res = await fetch(url, { headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        toastError(data.message || 'Cannot load qualifications');
        setItems([]);
        return;
      }
      setItems(sortApprovalsByRecency(Array.isArray(data.qualifications) ? data.qualifications : []));
    } catch (err) {
      toastError(err.message || 'Network error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onAudit = (payload) => {
      if (payload?.kind !== 'action_audit') return;
      const a = String(payload.action || '');
      if (a.startsWith('qualification.')) load({ silent: true });
    };
    socket.on('audit:new', onAudit);
    return () => socket.off('audit:new', onAudit);
  }, [load]);

  const patchListFromQual = (qual) => {
    if (!qual?.id) return;
    setItems((prev) => {
      if (statusFilter === 'pending' && qual.approvalStatus !== 'pending') {
        return sortApprovalsByRecency(prev.filter((x) => x.id !== qual.id));
      }
      const idx = prev.findIndex((x) => x.id === qual.id);
      if (idx === -1) return prev;
      const row = { ...prev[idx], ...qual, User: qual.User ?? prev[idx].User };
      const next = [...prev];
      next[idx] = row;
      return sortApprovalsByRecency(next);
    });
    setDetail((d) => (d && d.id === qual.id ? { ...d, ...qual } : d));
  };

  const approve = async () => {
    const { item } = actionModal;
    if (!item || decisionLockRef.current) return;
    decisionLockRef.current = true;
    try {
      const res = await fetch(`${API}/qualifications/${item.id}/approve`, {
        method: 'PUT',
        headers: authHeaders(token),
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        toastError(data.message || 'Approve failed');
        return;
      }
      toastSuccess('Qualification approved.');
      patchListFromQual(data.qualification);
      setActionModal(null);
      setReason('');
      await load({ silent: true });
    } catch (err) {
      toastError(err.message);
    } finally {
      decisionLockRef.current = false;
    }
  };

  const reject = async () => {
    const { item } = actionModal;
    if (!reason.trim()) {
      toastWarning('Please enter a rejection reason.');
      return;
    }
    if (!item || decisionLockRef.current) return;
    decisionLockRef.current = true;
    try {
      const res = await fetch(`${API}/qualifications/${item.id}/reject`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        toastError(data.message || 'Reject failed');
        return;
      }
      toastSuccess('Qualification rejected.');
      patchListFromQual(data.qualification);
      setActionModal(null);
      setReason('');
      await load({ silent: true });
    } catch (err) {
      toastError(err.message);
    } finally {
      decisionLockRef.current = false;
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter((it) => {
        const hay = [
          it.name,
          qualificationTypeLabel(it.type),
          it.issuedBy,
          it.certificateNumber,
          it.User?.name,
          it.User?.employeeCode,
          it.User?.email,
          String(it.id ?? ''),
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      })
    : items;

  return (
    <div className="sup-mgmt-page">
      <div className="sup-mgmt-hero">
        <h2>Qualification approvals</h2>
        <p>Review certificates and qualifications submitted by employees. Open attachments when provided.</p>
      </div>
      <div className="sup-approval-toolbar card sup-approval-toolbar--filters">
        <div className="sup-approval-toolbar-inner sup-approval-toolbar-inner--search-status">
          <div className="sup-approval-search-wrap">
            <label className="sup-approval-label" htmlFor="sup-qual-search">Search</label>
            <input
              id="sup-qual-search"
              className="sup-approval-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, employee code, certificate number…"
              autoComplete="off"
            />
          </div>
          <div className="sup-approval-filter-wrap">
            <label className="sup-approval-label" htmlFor="sup-qual-status">Status</label>
            <select
              id="sup-qual-status"
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

      <div className="card sup-approval-table-card sup-mgmt-table-shell">
        {loading ? <div className="loading">Loading...</div> : (
          <div className="table-wrap">
            <table className="sup-mgmt-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Issued by</th>
                  <th>Issued</th>
                  <th>Expiry</th>
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
                      <td>{qualificationTypeLabel(item.type)}</td>
                      <td>{item.name || '—'}</td>
                      <td>{item.issuedBy || '—'}</td>
                      <td>{formatDate(item.issuedDate)}</td>
                      <td>{formatDate(item.expiryDate)}</td>
                      <td>
                        <span className={`badge badge-${status}`}>
                          {{ pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[status] || status}
                        </span>
                      </td>
                      <td>
                        <div className="sup-mgmt-action-row">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setDetail(item)}
                          >View</button>
                          {status === 'pending' && (
                            <>
                              <button
                                type="button"
                                className="btn btn-approve"
                                onClick={() => { setActionModal({ item, action: 'approve' }); setReason(''); }}
                              >✓ Approve</button>
                              <button
                                type="button"
                                className="btn btn-reject"
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
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: '#718096', padding: 20 }}>No qualifications</td></tr>
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
        <QualificationDetailModal
          detail={detail}
          onClose={() => setDetail(null)}
          showActions={(detail.approvalStatus || 'pending') === 'pending'}
          onApprove={() => {
            setActionModal({ item: detail, action: 'approve' });
            setReason('');
            setDetail(null);
          }}
          onReject={() => {
            setActionModal({ item: detail, action: 'reject' });
            setReason('');
            setDetail(null);
          }}
        />
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
              {qualificationTypeLabel(actionModal.item.type)}: {actionModal.item.name}
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

function isExpired(expiryDate) {
  if (!expiryDate) return false;
  try {
    return new Date(expiryDate).getTime() < Date.now();
  } catch {
    return false;
  }
}

function initialsOf(name) {
  if (!name) return '—';
  const parts = String(name).trim().split(/\s+/);
  const a = parts[0]?.[0] || '';
  const b = parts[parts.length - 1]?.[0] || '';
  return (a + b).toUpperCase() || name[0].toUpperCase();
}

function QualificationDetailModal({ detail, onClose, showActions, onApprove, onReject }) {
  const status = detail.approvalStatus || 'pending';
  const meta = STATUS_META[status] || STATUS_META.pending;
  const typeLabel = qualificationTypeLabel(detail.type);
  const expired = isExpired(detail.expiryDate);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{
          width: 800,
          maxWidth: '96vw',
          padding: 0,
          overflow: 'hidden',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '14px 18px 12px',
            background: 'linear-gradient(90deg, #7029d1 0%, #8b46ff 100%)',
            color: '#fff',
            position: 'relative',
            flexShrink: 0,
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

          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85 }}>
            Qualification · #{detail.id}
          </div>
          <div style={{ marginTop: 4, fontSize: 17, fontWeight: 700, lineHeight: 1.25, paddingRight: 40 }}>
            {detail.name || 'Untitled qualification'}
          </div>
          <div style={{ marginTop: 3, fontSize: 12, opacity: 0.9 }}>
            {typeLabel}
            {detail.certificateNumber ? <> · <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{detail.certificateNumber}</span></> : null}
          </div>

          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 999,
                background: meta.bg,
                color: meta.fg,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dot }} />
              {meta.label}
            </span>
            {expired && status !== 'rejected' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: '#fee2e2',
                  color: '#991b1b',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >Expired</span>
            )}
          </div>
        </div>

        <div
          style={{
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: '#f9fafb',
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
          }}
        >
          <section
            style={{
              background: '#fff',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
                color: '#7029d1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {initialsOf(detail.User?.name)}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                {detail.User?.name || `User #${detail.userId}`}
              </div>
              <div style={{ marginTop: 2, fontSize: 12, color: '#6b7280', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              padding: '12px 14px',
            }}
          >
            <SectionTitle>Qualification</SectionTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                columnGap: 14,
                rowGap: 10,
                marginTop: 8,
              }}
            >
              <DetailRow label="Type" value={typeLabel} />
              <DetailRow label="Issued by" value={detail.issuedBy} />
              <DetailRow label="Issued date" value={formatDate(detail.issuedDate)} />
              <DetailRow
                label="Expiry date"
                value={
                  detail.expiryDate ? (
                    <span style={{ color: expired ? '#b91c1c' : undefined, fontWeight: expired ? 600 : undefined }}>
                      {formatDate(detail.expiryDate)}
                    </span>
                  ) : 'No expiry'
                }
              />
              {detail.description && (
                <DetailRow label="Description" value={detail.description} full />
              )}
            </div>
          </section>

          <DocumentScanSection documentPath={detail.documentPath} />

          <section
            style={{
              background: '#fff',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              padding: '12px 14px',
            }}
          >
            <SectionTitle>Review</SectionTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                columnGap: 14,
                rowGap: 10,
                marginTop: 8,
              }}
            >
              <DetailRow label="Status" value={meta.label} />
              <DetailRow label="Submitted" value={formatDate(detail.createdAt)} />
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
            gap: 8,
            flexWrap: 'wrap',
            padding: '10px 16px',
            background: '#fff',
            borderTop: '1px solid #e5e7eb',
            flexShrink: 0,
          }}
        >
          {showActions && onApprove && onReject && (
            <>
              <button type="button" className="btn btn-reject" onClick={onReject}>✗ Reject</button>
              <button type="button" className="btn btn-approve" onClick={onApprove}>✓ Approve</button>
            </>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function DocumentScanSection({ documentPath }) {
  const [preview, setPreview] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!documentPath) {
    return (
      <section
        style={{
          background: '#fff',
          borderRadius: 10,
          border: '1px dashed #e5e7eb',
          padding: '12px 14px',
          color: '#6b7280',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 16 }} aria-hidden>📄</span>
        <span>No document scan was attached with this qualification.</span>
      </section>
    );
  }

  const url = absoluteDocumentUrl(documentPath);
  const ext = extensionOf(documentPath);
  const isImage = IMAGE_EXTENSIONS.includes(ext);
  const isPdf = ext === 'pdf';
  const filename = documentPath.split('/').pop();

  return (
    <section
      style={{
        background: '#fff',
        borderRadius: 10,
        border: '1px solid #e5e7eb',
        padding: '12px 14px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <SectionTitle>Document scan</SectionTitle>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ fontSize: 11, padding: '4px 8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            ↗ Open in new tab
          </a>
          <a
            href={url}
            download={filename}
            className="btn btn-secondary"
            style={{ fontSize: 11, padding: '4px 8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            ⬇ Download
          </a>
        </div>
      </div>

      <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280', wordBreak: 'break-all' }}>
        {filename}
      </div>

      <div
        style={{
          marginTop: 8,
          background: '#f3f4f6',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {isImage && !imgError && (
          <button
            type="button"
            onClick={() => setPreview(true)}
            style={{
              display: 'block',
              width: '100%',
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'zoom-in',
            }}
            title="Click to enlarge"
          >
            <img
              src={url}
              alt="Qualification scan"
              onError={() => setImgError(true)}
              style={{
                display: 'block',
                width: '100%',
                maxHeight: 200,
                objectFit: 'contain',
                background: '#fff',
              }}
            />
          </button>
        )}

        {isImage && imgError && (
          <FallbackTile icon="🖼️" text="Image failed to load. Use the buttons above to open the file." />
        )}

        {isPdf && (
          <div style={{ background: '#fff' }}>
            <iframe
              src={url}
              title="Qualification PDF"
              style={{ width: '100%', height: 260, border: 'none', display: 'block' }}
            />
          </div>
        )}

        {!isImage && !isPdf && (
          <FallbackTile
            icon="📎"
            text={`Preview is not available for .${ext || 'unknown'} files. Open or download the file to review it.`}
          />
        )}
      </div>

      {preview && isImage && !imgError && (
        <ImageLightbox url={url} onClose={() => setPreview(false)} />
      )}
    </section>
  );
}

function FallbackTile({ icon, text }) {
  return (
    <div
      style={{
        padding: '14px 12px',
        background: '#fff',
        color: '#4b5563',
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ fontSize: 22 }} aria-hidden>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function ImageLightbox({ url, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        cursor: 'zoom-out',
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close preview"
        style={{
          position: 'absolute',
          top: 18,
          right: 18,
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          border: 'none',
          fontSize: 20,
          cursor: 'pointer',
        }}
      >×</button>
      <img
        src={url}
        alt="Qualification scan (enlarged)"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '95vw',
          maxHeight: '90vh',
          boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
          borderRadius: 8,
          background: '#fff',
          cursor: 'default',
        }}
      />
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        color: '#7029d1',
        letterSpacing: '0.08em',
      }}
    >
      {children}
    </div>
  );
}

function DetailRow({ label, value, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / span 2' : 'auto', minWidth: 0 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          color: '#6b7280',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 2, color: '#111827', fontSize: 13, lineHeight: 1.4, wordBreak: 'break-word' }}>
        {value || <span style={{ color: '#9ca3af' }}>—</span>}
      </div>
    </div>
  );
}
