import { useCallback, useEffect, useState } from 'react';

const API = 'http://localhost:5000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function formatError(status, apiMessage) {
  if (status === 401) {
    if (apiMessage === 'No token provided' || !apiMessage) {
      return 'Session expired. Please sign in again.';
    }
    return apiMessage || 'Invalid session.';
  }
  if (status === 403) {
    return apiMessage || 'Only HR or Manager can manage work shifts.';
  }
  return apiMessage || 'Unknown error';
}

/**
 * Manage company-wide work shift configuration (GET/POST /api/shifts).
 */
export default function HrShiftAdmin({ token }) {
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);

  const fetchShift = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API}/shifts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.shifts && data.shifts.length > 0) {
        setShift(data.shifts[0]);
        setMessage('');
      } else if (!res.ok) {
        setShift(null);
        setMessage(formatError(res.status, data.message));
      } else {
        setShift(null);
      }
    } catch (e) {
      setMessage('Cannot load shift configuration: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchShift();
  }, [fetchShift]);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const startTime = form.startTime?.value;
    const endTime = form.endTime?.value;
    const gracePeriodMinutes = parseInt(form.gracePeriodMinutes?.value, 10) || 5;
    const overtimeThresholdMinutes = parseInt(form.overtimeThresholdMinutes?.value, 10) || 15;

    if (!startTime || !endTime) {
      setMessage('Please fill in start and end time.');
      return;
    }

    try {
      setLoading(true);
      const method = shift ? 'PUT' : 'POST';
      const url = shift ? `${API}/shifts/${shift.id}` : `${API}/shifts`;
      const res = await fetch(url, {
        method,
        headers: authHeaders(token),
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
        setMessage('Shift configuration saved.');
        await fetchShift();
        setEditing(false);
        setTimeout(() => setMessage(''), 3500);
      } else {
        setMessage(formatError(res.status, data.message));
      }
    } catch (e) {
      setMessage('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const msgOk = message && (message.includes('saved') || message.toLowerCase().includes('success'));

  return (
    <div className="card">
      <p className="card-title">Company work shift</p>
      <p style={{ color: '#718096', fontSize: 14, marginBottom: 18 }}>
        Configure default work hours for the whole company (late/early attendance and overtime threshold).
      </p>

      {message && (
        <div
          className="error-msg"
          style={{
            background: msgOk ? '#f0fff4' : '#fff5f5',
            color: msgOk ? '#276749' : '#c53030',
            border: `1px solid ${msgOk ? '#9ae6b4' : '#feb2b2'}`,
            marginBottom: 16,
          }}
        >
          {message}
        </div>
      )}

      {loading && !shift && !editing ? (
        <div className="loading">Loading...</div>
      ) : null}

      {shift && !editing && (
        <div
          style={{
            padding: 20,
            background: '#ebf8ff',
            border: '2px solid #2b6cb0',
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #bee3f8' }}>
            <span style={{ fontWeight: 600 }}>Start time</span>
            <strong style={{ color: '#2b6cb0', fontSize: 16 }}>{shift.startTime}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #bee3f8' }}>
            <span style={{ fontWeight: 600 }}>End time</span>
            <strong style={{ color: '#2b6cb0', fontSize: 16 }}>{shift.endTime}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #bee3f8' }}>
            <span style={{ fontWeight: 600 }}>Allowed late time</span>
            <strong style={{ color: '#2b6cb0' }}>{shift.gracePeriodMinutes} min</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
            <span style={{ fontWeight: 600 }}>Overtime threshold (checkout)</span>
            <strong style={{ color: '#2b6cb0' }}>{shift.overtimeThresholdMinutes} min</strong>
          </div>
        </div>
      )}

      {(editing || !shift) && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
          <div className="form-row">
            <div className="form-group">
              <label>Start time *</label>
              <input type="time" name="startTime" defaultValue={shift?.startTime || '08:00'} required />
            </div>
            <div className="form-group">
              <label>End time *</label>
              <input type="time" name="endTime" defaultValue={shift?.endTime || '17:00'} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Allowed late time (minutes)</label>
              <input type="number" name="gracePeriodMinutes" min={0} max={60} defaultValue={shift?.gracePeriodMinutes ?? 5} />
            </div>
            <div className="form-group">
              <label>Overtime threshold (minutes)</label>
              <input type="number" name="overtimeThresholdMinutes" min={0} max={120} defaultValue={shift?.overtimeThresholdMinutes ?? 15} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : shift ? 'Update shift' : 'Create shift config'}
            </button>
            {shift && editing && (
              <button type="button" className="btn btn-secondary" disabled={loading} onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {shift && !editing && (
        <button type="button" className="btn btn-primary" disabled={loading} onClick={() => setEditing(true)} style={{ marginBottom: 20 }}>
          Edit shift configuration
        </button>
      )}

      <div
        style={{
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          color: '#92400e',
          padding: 14,
          borderRadius: 8,
          fontSize: 13,
        }}
      >
        <strong>Notes:</strong>
        <ul style={{ margin: '8px 0 0 18px' }}>
          <li>This configuration applies to all employees.</li>
          <li>Late flag is based on shift start time and allowed late minutes.</li>
          <li>Overtime flag is based on checkout time and overtime threshold.</li>
        </ul>
      </div>
    </div>
  );
}
