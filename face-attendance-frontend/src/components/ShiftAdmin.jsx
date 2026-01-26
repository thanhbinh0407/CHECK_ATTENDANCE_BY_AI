import React, { useCallback, useState } from 'react';
import { theme, commonStyles } from "../styles/theme.js";

export default function ShiftAdmin() {
  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);

  const fetchShift = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/shifts`);
      const data = await res.json();
      if (res.ok && data.shifts && data.shifts.length > 0) {
        setShift(data.shifts[0]);
      } else {
        setShift(null);
      }
    } catch (e) { 
      setMessage('Lỗi tải cấu hình: '+e.message); 
    } finally { 
      setLoading(false); 
    }
  }, [apiBase]);

  React.useEffect(() => { fetchShift(); }, [fetchShift]);

  const handleCreate = async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const startTime = form.startTime?.value;
    const endTime = form.endTime?.value;
    const gracePeriodMinutes = parseInt(form.gracePeriodMinutes?.value) || 5;
    const overtimeThresholdMinutes = parseInt(form.overtimeThresholdMinutes?.value) || 15;
    
    if (!startTime || !endTime) {
      setMessage('Vui lòng điền Giờ bắt đầu và Giờ kết thúc');
      return;
    }

    try {
      setLoading(true);
      const method = shift ? 'PUT' : 'POST';
      const endpoint = shift ? `${apiBase}/api/shifts/${shift.id}` : `${apiBase}/api/shifts`;
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          startTime, 
          endTime, 
          gracePeriodMinutes, 
          overtimeThresholdMinutes,
          note: 'Company-wide working hours'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Lưu cấu hình thời gian làm việc thành công');
        await fetchShift();
        setEditing(false);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Lỗi: ' + (data.message || 'Không rõ'));
      }
    } catch (e) {
      setMessage('❌ Lỗi: ' + e.message);
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
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
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
        <h2 style={{ marginBottom: '8px', color: '#333' }}>Quản Lý Thời Gian Làm Việc</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>Cấu hình thời gian bắt đầu và kết thúc làm việc cho toàn công ty</p>
      </div>

      {message && <div style={message.includes('thành công') ? messageSuccess : messageError}>{message}</div>}

      {/* Display Current Settings */}
      {shift && !editing && (
        <div style={displayBox}>
          <div style={displayItem}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>Giờ bắt đầu</span>
            <span style={valueStyle}>{shift.startTime}</span>
          </div>
          <div style={displayItem}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>Giờ kết thúc</span>
            <span style={valueStyle}>{shift.endTime}</span>
          </div>
          <div style={displayItem}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>Thời gian cho phép muộn</span>
            <span style={valueStyle}>{shift.gracePeriodMinutes} phút</span>
          </div>
          <div style={displayItemLast}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>Ngưỡng tính OT</span>
            <span style={valueStyle}>{shift.overtimeThresholdMinutes} phút</span>
          </div>
        </div>
      )}

      {/* Edit/Create Form */}
      {editing || !shift ? (
        <form onSubmit={handleCreate} style={formStyle}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Giờ bắt đầu làm việc *</label>
            <input type="time" name="startTime" defaultValue={shift?.startTime || '08:00'} style={inputStyle} required />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Giờ kết thúc làm việc *</label>
            <input type="time" name="endTime" defaultValue={shift?.endTime || '17:00'} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Thời gian cho phép muộn (phút)</label>
            <input type="number" name="gracePeriodMinutes" defaultValue={shift?.gracePeriodMinutes || 5} min="0" max="60" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Ngưỡng tính tăng ca (phút)</label>
            <input type="number" name="overtimeThresholdMinutes" defaultValue={shift?.overtimeThresholdMinutes || 15} min="0" max="120" style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" style={buttonStyle} disabled={loading}>
              {loading ? 'Đang lưu...' : (shift ? 'Cập nhật' : 'Tạo cấu hình')}
            </button>
            {shift && editing && (
              <button type="button" style={buttonSecondary} onClick={() => setEditing(false)} disabled={loading}>
                Hủy
              </button>
            )}
          </div>
        </form>
      ) : null}

      {/* Action Buttons */}
      {shift && !editing && (
        <div style={{ marginBottom: '24px' }}>
          <button style={buttonStyle} onClick={() => setEditing(true)} disabled={loading}>
            Sửa cấu hình
          </button>
        </div>
      )}

      {/* Info Box */}
      <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', color: '#856404', padding: '16px', borderRadius: '6px', fontSize: '13px' }}>
        <div style={{ fontWeight: '600', marginBottom: '8px' }}>Ghi chú:</div>
        <ul style={{ margin: '0', paddingLeft: '20px' }}>
          <li>Cấu hình thời gian này áp dụng cho tất cả nhân viên</li>
          <li>Thời gian "cho phép muộn" dùng để đánh dấu "muộn" khi check-in</li>
          <li>Thời gian "ngưỡng tính OT" dùng để đánh dấu "tăng ca" khi check-out</li>
          <li>Sau này sẽ hỗ trợ cấu hình theo từng bộ phận/người</li>
        </ul>
      </div>
    </div>
  );
}
