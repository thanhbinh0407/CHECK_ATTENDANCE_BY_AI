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

function addMinutesToTime(timeStr, minutesToAdd) {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return '--:--';
  const [hh, mm] = timeStr.split(':').map(Number);
  const total = (hh * 60 + mm + (Number(minutesToAdd) || 0)) % (24 * 60);
  const normalized = total < 0 ? total + 24 * 60 : total;
  const outH = String(Math.floor(normalized / 60)).padStart(2, '0');
  const outM = String(normalized % 60).padStart(2, '0');
  return `${outH}:${outM}`;
}

function timeToMinutes(timeStr) {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return NaN;
  const [hh, mm] = timeStr.split(':').map(Number);
  return hh * 60 + mm;
}

function diffMinutes(baseTime, targetTime) {
  const base = timeToMinutes(baseTime);
  const target = timeToMinutes(targetTime);
  if (!Number.isFinite(base) || !Number.isFinite(target)) return 0;
  let delta = target - base;
  if (delta < 0) delta += 24 * 60;
  return delta;
}

function parseMainShiftConfig(shift) {
  const fallback = {
    shift1Start: shift?.startTime || '08:00',
    shift1End: '12:00',
    shift2Start: '13:00',
    shift2End: shift?.endTime || '17:00',
  };

  if (!shift?.note) return fallback;
  try {
    const parsed = JSON.parse(shift.note);
    const list = parsed?.mainShifts;
    if (!Array.isArray(list) || list.length < 2) return fallback;
    const one = list[0] || {};
    const two = list[1] || {};
    return {
      shift1Start: one.startTime || fallback.shift1Start,
      shift1End: one.endTime || fallback.shift1End,
      shift2Start: two.startTime || fallback.shift2Start,
      shift2End: two.endTime || fallback.shift2End,
    };
  } catch {
    return fallback;
  }
}

function parseOvertimeConfig(shift, mainShiftEnd) {
  const fallbackStart = addMinutesToTime(mainShiftEnd || shift?.endTime || '17:00', Number(shift?.overtimeThresholdMinutes ?? 15));
  const fallbackEnd = addMinutesToTime(fallbackStart, 120);
  if (!shift?.note) {
    return { startTime: fallbackStart, endTime: fallbackEnd };
  }
  try {
    const parsed = JSON.parse(shift.note);
    const overtime = parsed?.overtime || {};
    return {
      startTime: /^\d{2}:\d{2}$/.test(overtime.startTime || '') ? overtime.startTime : fallbackStart,
      endTime: /^\d{2}:\d{2}$/.test(overtime.endTime || '') ? overtime.endTime : fallbackEnd,
    };
  } catch {
    return { startTime: fallbackStart, endTime: fallbackEnd };
  }
}

/**
 * Manage company-wide work shift configuration (GET/POST /api/shifts).
 */
export default function HrShiftAdmin({ token }) {
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [draftEndTime, setDraftEndTime] = useState('17:00');
  const [draftOvertimeStart, setDraftOvertimeStart] = useState('17:15');
  const [draftOvertimeEnd, setDraftOvertimeEnd] = useState('19:15');
  const [mainShiftDraft, setMainShiftDraft] = useState({
    shift1Start: '08:00',
    shift1End: '12:00',
    shift2Start: '13:00',
    shift2End: '17:00',
  });

  const fetchShift = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API}/shifts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.shifts && data.shifts.length > 0) {
        const current = data.shifts[0];
        const parsedMain = parseMainShiftConfig(current);
        const parsedOvertime = parseOvertimeConfig(current, parsedMain.shift2End);
        setShift(current);
        setMainShiftDraft(parsedMain);
        setDraftEndTime(parsedMain.shift2End || current.endTime || '17:00');
        setDraftOvertimeStart(parsedOvertime.startTime);
        setDraftOvertimeEnd(parsedOvertime.endTime);
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
    const shift1Start = form.shift1Start?.value;
    const shift1End = form.shift1End?.value;
    const shift2Start = form.shift2Start?.value;
    const shift2End = form.shift2End?.value;
    const gracePeriodMinutes = parseInt(form.gracePeriodMinutes?.value, 10) || 5;
    const overtimeThresholdMinutes = diffMinutes(shift2End, draftOvertimeStart);

    const startTime = shift1Start;
    const endTime = shift2End;

    if (!shift1Start || !shift1End || !shift2Start || !shift2End) {
      setMessage('Please fill in all main shift times (Shift 1 and Shift 2).');
      return;
    }

    const s1s = timeToMinutes(shift1Start);
    const s1e = timeToMinutes(shift1End);
    const s2s = timeToMinutes(shift2Start);
    const s2e = timeToMinutes(shift2End);
    if (!(s1s < s1e && s1e <= s2s && s2s < s2e)) {
      setMessage('Invalid main shift timeline. Required: Shift 1 start < Shift 1 end <= Shift 2 start < Shift 2 end.');
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(draftOvertimeStart || '') || !/^\d{2}:\d{2}$/.test(draftOvertimeEnd || '')) {
      setMessage('Please set overtime start and overtime end time.');
      return;
    }
    if (draftOvertimeStart === draftOvertimeEnd) {
      setMessage('Overtime end time must be different from overtime start time.');
      return;
    }

    const notePayload = JSON.stringify({
      schema: 'main-shift-v2',
      mainShifts: [
        { name: 'Shift 1', startTime: shift1Start, endTime: shift1End },
        { name: 'Shift 2', startTime: shift2Start, endTime: shift2End },
      ],
      overtime: {
        thresholdMinutes: overtimeThresholdMinutes,
        startTime: draftOvertimeStart,
        endTime: draftOvertimeEnd,
      },
    });

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
          note: notePayload,
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
        Configure company schedule as 2 parts: Main shift and Overtime shift.
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
        <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
          <div
            style={{
              padding: 20,
              background: '#ebf8ff',
              border: '2px solid #2b6cb0',
              borderRadius: 10,
            }}
          >
            <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: 8 }}>Main shift</div>
            {(() => {
              const main = parseMainShiftConfig(shift);
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #bee3f8' }}>
                    <span style={{ fontWeight: 600 }}>Shift 1</span>
                    <strong style={{ color: '#2b6cb0', fontSize: 16 }}>{main.shift1Start} - {main.shift1End}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #bee3f8' }}>
                    <span style={{ fontWeight: 600 }}>Shift 2</span>
                    <strong style={{ color: '#2b6cb0', fontSize: 16 }}>{main.shift2Start} - {main.shift2End}</strong>
                  </div>
                </>
              );
            })()}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={{ fontWeight: 600 }}>Allowed late time</span>
              <strong style={{ color: '#2b6cb0' }}>{shift.gracePeriodMinutes} min</strong>
            </div>
          </div>

          <div
            style={{
              padding: 20,
              background: '#f0f9ff',
              border: '2px solid #0ea5e9',
              borderRadius: 10,
            }}
          >
            <div style={{ fontWeight: 700, color: '#075985', marginBottom: 8 }}>Overtime shift</div>
            {(() => {
              const main = parseMainShiftConfig(shift);
              const overtime = parseOvertimeConfig(shift, main.shift2End);
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #bae6fd' }}>
                    <span style={{ fontWeight: 600 }}>Overtime start</span>
                    <strong style={{ color: '#0369a1', fontSize: 16 }}>{overtime.startTime}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #bae6fd' }}>
                    <span style={{ fontWeight: 600 }}>Overtime end</span>
                    <strong style={{ color: '#0369a1', fontSize: 16 }}>{overtime.endTime}</strong>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {(editing || !shift) && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
          <div
            style={{
              padding: 14,
              border: '1px solid #bfdbfe',
              borderRadius: 8,
              marginBottom: 12,
              background: '#eff6ff'
            }}
          >
            <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: 10 }}>Main shift</div>
          <div className="form-row">
            <div className="form-group">
              <label>Shift 1 start *</label>
              <input
                type="time"
                name="shift1Start"
                value={mainShiftDraft.shift1Start}
                required
                onChange={(e) => setMainShiftDraft((prev) => ({ ...prev, shift1Start: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Shift 1 end *</label>
              <input
                type="time"
                name="shift1End"
                value={mainShiftDraft.shift1End}
                required
                onChange={(e) => setMainShiftDraft((prev) => ({ ...prev, shift1End: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Shift 2 start *</label>
              <input
                type="time"
                name="shift2Start"
                value={mainShiftDraft.shift2Start}
                required
                onChange={(e) => setMainShiftDraft((prev) => ({ ...prev, shift2Start: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Shift 2 end *</label>
              <input
                type="time"
                name="shift2End"
                value={mainShiftDraft.shift2End}
                required
                onChange={(e) => {
                  const nextEnd = e.target.value;
                  setMainShiftDraft((prev) => ({ ...prev, shift2End: nextEnd }));
                  setDraftEndTime(nextEnd);
                }}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Allowed late time (minutes)</label>
              <input type="number" name="gracePeriodMinutes" min={0} max={60} defaultValue={shift?.gracePeriodMinutes ?? 5} />
            </div>
          </div>
          </div>

          <div
            style={{
              padding: 14,
              border: '1px solid #bae6fd',
              borderRadius: 8,
              marginBottom: 12,
              background: '#f0f9ff'
            }}
          >
            <div style={{ fontWeight: 700, color: '#075985', marginBottom: 10 }}>Overtime shift</div>
            <div className="form-row">
            <div className="form-group">
                <label>Overtime start *</label>
                <input
                  type="time"
                  value={draftOvertimeStart}
                  onChange={(e) => setDraftOvertimeStart(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Overtime end *</label>
                <input
                  type="time"
                  value={draftOvertimeEnd}
                  onChange={(e) => setDraftOvertimeEnd(e.target.value)}
                />
              </div>
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
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading}
          onClick={() => {
            const parsedMain = parseMainShiftConfig(shift);
            const parsedOvertime = parseOvertimeConfig(shift, parsedMain.shift2End);
            setMainShiftDraft(parsedMain);
            setDraftEndTime(parsedMain.shift2End || shift.endTime || '17:00');
            setDraftOvertimeStart(parsedOvertime.startTime);
            setDraftOvertimeEnd(parsedOvertime.endTime);
            setEditing(true);
          }}
          style={{ marginBottom: 20 }}
        >
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
          <li>Main shift is split into 2 working sessions: Shift 1 and Shift 2.</li>
          <li>Overtime shift is configured by start time and end time.</li>
        </ul>
      </div>
    </div>
  );
}
