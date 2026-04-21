import React, { useCallback, useState } from 'react';

function authJsonHeaders() {
  const token = localStorage.getItem('authToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function formatShiftError(status, apiMessage) {
  if (status === 401) {
    if (apiMessage === 'No token provided' || !localStorage.getItem('authToken')) {
      return 'You are not signed in or your session expired. Please log in again (via the login portal).';
    }
    return apiMessage || 'Session invalid. Please log in again.';
  }
  if (status === 403) {
    return apiMessage || 'Only HR or Manager can create or update the work schedule.';
  }
  return apiMessage || 'Unknown error';
}

/** Company-wide work schedule — same UI/logic as Manager Console ShiftAdmin. */
export default function HrShiftAdmin() {
  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);

  const fetchShift = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setShift(null);
        setMessage(formatShiftError(401, 'No token provided'));
        return;
      }
      const res = await fetch(`${apiBase}/api/shifts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.shifts && data.shifts.length > 0) {
        setShift(data.shifts[0]);
        setMessage('');
      } else if (!res.ok) {
        setShift(null);
        setMessage('Error loading configuration: ' + formatShiftError(res.status, data.message));
      } else {
        setShift(null);
      }
    } catch (e) {
      setMessage('Error loading configuration: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  React.useEffect(() => {
    fetchShift();
  }, [fetchShift]);

  const handleCreate = async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const startTime = form.startTime?.value;
    const endTime = form.endTime?.value;
    const gracePeriodMinutes = parseInt(form.gracePeriodMinutes?.value, 10) || 5;
    const overtimeThresholdMinutes = parseInt(form.overtimeThresholdMinutes?.value, 10) || 15;

    if (!startTime || !endTime) {
      setMessage('Please fill in Start time and End time');
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      setMessage(formatShiftError(401, 'No token provided'));
      return;
    }

    try {
      setLoading(true);
      const method = shift ? 'PUT' : 'POST';
      const endpoint = shift ? `${apiBase}/api/shifts/${shift.id}` : `${apiBase}/api/shifts`;
      const res = await fetch(endpoint, {
        method,
        headers: authJsonHeaders(),
        body: JSON.stringify({
          startTime,
          endTime,
          gracePeriodMinutes,
          overtimeThresholdMinutes,
          note: 'Company-wide working hours',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Work schedule saved successfully');
        await fetchShift();
        setEditing(false);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Error: ' + formatShiftError(res.status, data.message));
      }
    } catch (e) {
      setMessage('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    maxWidth: '900px',
    margin: '0 auto',
    background: '#fff',
    padding: '32px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  };

  const headerStyle = { marginBottom: '24px' };
  const messageStyle = { padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', fontWeight: '600' };
  const messageSuccess = { ...messageStyle, backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' };
  const messageError = { ...messageStyle, backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' };
  const formStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '24px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '24px' };
  const inputStyle = { padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: '600', color: '#333', fontSize: '13px' };
  const buttonStyle = { padding: '10px 20px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', marginRight: '8px' };
  const buttonSecondary = { ...buttonStyle, backgroundColor: '#6c757d' };
  const displayBox = { padding: '20px', backgroundColor: '#e7f3ff', border: '2px solid #0066cc', borderRadius: '8px', marginBottom: '24px' };
  const displayItem = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #cce5ff' };
  const displayItemLast = { ...displayItem, borderBottom: 'none' };
  const valueStyle = { fontSize: '16px', fontWeight: '700', color: '#0066cc' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={{ marginBottom: '8px', color: '#333' }}>Work Schedule Management</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>Configure start and end work times for the entire company</p>
      </div>

      {message && (
        <div style={message.includes('successfully') || message.toLowerCase().includes('success') ? messageSuccess : messageError}>
          {message}
        </div>
      )}

      {shift && !editing && (
        <div style={displayBox}>
          <div style={displayItem}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>Start Time</span>
            <span style={valueStyle}>{shift.startTime}</span>
          </div>
          <div style={displayItem}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>End Time</span>
            <span style={valueStyle}>{shift.endTime}</span>
          </div>
          <div style={displayItem}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>Allowed Late Time</span>
            <span style={valueStyle}>{shift.gracePeriodMinutes} min</span>
          </div>
          <div style={displayItemLast}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>OT Threshold</span>
            <span style={valueStyle}>{shift.overtimeThresholdMinutes} min</span>
          </div>
        </div>
      )}

      {editing || !shift ? (
        <form onSubmit={handleCreate} style={formStyle}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Start Time *</label>
            <input type="time" name="startTime" defaultValue={shift?.startTime || '08:00'} style={inputStyle} required />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>End Time *</label>
            <input type="time" name="endTime" defaultValue={shift?.endTime || '17:00'} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Allowed Late Time (minutes)</label>
            <input type="number" name="gracePeriodMinutes" defaultValue={shift?.gracePeriodMinutes ?? 5} min="0" max="60" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>OT Threshold (minutes)</label>
            <input type="number" name="overtimeThresholdMinutes" defaultValue={shift?.overtimeThresholdMinutes ?? 15} min="0" max="120" style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" style={buttonStyle} disabled={loading}>
              {loading ? 'Saving...' : shift ? 'Update' : 'Create Configuration'}
            </button>
            {shift && editing && (
              <button type="button" style={buttonSecondary} onClick={() => setEditing(false)} disabled={loading}>
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : null}

      {shift && !editing && (
        <div style={{ marginBottom: '24px' }}>
          <button type="button" style={buttonStyle} onClick={() => setEditing(true)} disabled={loading}>
            Edit Configuration
          </button>
        </div>
      )}

      <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', color: '#856404', padding: '16px', borderRadius: '6px', fontSize: '13px' }}>
        <div style={{ fontWeight: '600', marginBottom: '8px' }}>Notes:</div>
        <ul style={{ margin: '0', paddingLeft: '20px' }}>
          <li>This time configuration applies to all employees</li>
          <li>&quot;Allowed late time&quot; is used to mark &quot;late&quot; when checking in</li>
          <li>&quot;OT threshold&quot; is used to mark &quot;overtime&quot; when checking out</li>
          <li>Configuration by department/person will be supported in the future</li>
        </ul>
      </div>
    </div>
  );
}
