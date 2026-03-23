import { useState } from 'react'
import './App.css'

// Cấu hình port cho từng role
const ROLE_PORTS = {
  manager:    5174,   // manager-client  (Giám đốc / Quản trị hệ thống)
  hr:         5172,   // hr-client       (Nhân sự)
  accountant: 5175,   // accountant-client
  supervisor: 5173,   // supervisor-client (Quản lý)
  employee:   5178,   // employee-portal
}

const ROLE_LABELS = {
  manager:    'Giám đốc (Manager)',
  hr:         'Nhân sự (HR Staff)',
  accountant: 'Kế toán (Accountant)',
  supervisor: 'Quản lý (Supervisor)',
  employee:   'Nhân viên (Employee)',
}

const ROLE_DESCRIPTIONS = {
  manager:    'Quản lý tài khoản người dùng, phân quyền và cấu hình hệ thống',
  hr:         'Quản lý hồ sơ nhân viên, phòng ban, chức danh và chấm công',
  accountant: 'Tính lương, bảng lương, thuế và bảo hiểm xã hội',
  supervisor: 'Duyệt đơn từ, phê duyệt lương và xem báo cáo',
  employee:   'Xem thông tin cá nhân, lịch sử chấm công và gửi đơn từ',
}

function App() {
  const [selectedRole, setSelectedRole] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!selectedRole) {
      setError('Vui lòng chọn vai trò đăng nhập')
      return
    }

    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.status === 'success') {
        const userRole = data.user.role

        // Kiểm tra role tài khoản có khớp với role được chọn không
        // Manager (giám đốc) có thể truy cập tất cả các portal
        const canAccess =
          userRole === 'manager' ||
          userRole === selectedRole

        if (!canAccess) {
          setError(`Tài khoản này không có quyền truy cập "${ROLE_LABELS[selectedRole]}"`)
          setLoading(false)
          return
        }

        // Nếu user chọn role khác với role thực tế → redirect đến portal của role thực
        const targetRole = userRole === 'manager' ? selectedRole : userRole
        const port = ROLE_PORTS[targetRole] || ROLE_PORTS[userRole]

        if (!port) {
          setError('Không tìm thấy ứng dụng cho vai trò này')
          setLoading(false)
          return
        }

        // Lưu vào localStorage và truyền qua URL
        localStorage.setItem('authToken', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))

        const tokenParam = encodeURIComponent(data.token)
        const userParam  = encodeURIComponent(JSON.stringify(data.user))
        window.location.href = `http://localhost:${port}?token=${tokenParam}&user=${userParam}`
      } else {
        setError(data.message || 'Đăng nhập thất bại')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Không thể kết nối đến máy chủ. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Hệ thống Quản lý Nhân sự</h1>
          <p style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>
            Human Resource Management System
          </p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="role">Vai trò đăng nhập</label>
            <select
              id="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="form-select"
              required
            >
              <option value="">-- Chọn vai trò --</option>
              <option value="manager">🏢 Giám đốc (Manager)</option>
              <option value="hr">👥 Nhân sự (HR Staff)</option>
              <option value="accountant">💰 Kế toán (Accountant)</option>
              <option value="supervisor">✅ Quản lý (Supervisor)</option>
              <option value="employee">👤 Nhân viên (Employee)</option>
            </select>
            {selectedRole && (
              <p className="role-description">
                {ROLE_DESCRIPTIONS[selectedRole]}
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="Nhập email của bạn"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="login-footer">
          <p>Chọn đúng vai trò để truy cập ứng dụng tương ứng</p>
          <p style={{ fontSize: '11px', color: '#a0aec0', marginTop: '8px' }}>
            💡 Tài khoản Manager có thể truy cập tất cả portal
          </p>
        </div>
      </div>
    </div>
  )
}

export default App

