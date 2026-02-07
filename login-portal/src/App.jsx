import { useState } from 'react'
import './App.css'

// Cấu hình các port cho từng role
const ROLE_PORTS = {
  admin: 5174,              // face-attendance-frontend
  employee: 5178,           // employee-portal (5176 is for face-attendance-employee)
  accountant: 5175,         // accountant-client
  'payroll-admin': 5177     // payroll-frontend
}

const ROLE_LABELS = {
  admin: 'Quản trị viên',
  employee: 'Nhân viên',
  accountant: 'Kế toán',
  'payroll-admin': 'Quản lý lương'
}

const ROLE_DESCRIPTIONS = {
  admin: 'Quản lý toàn bộ hệ thống, nhân viên và cài đặt (Chỉ dành cho admin@company.com)',
  employee: 'Xem thông tin cá nhân, lịch sử chấm công và lương',
  accountant: 'Quản lý và phê duyệt bảng lương (Dành cho admin@company.com và accountant@company.com)',
  'payroll-admin': 'Quản lý hệ thống tính lương và chính sách'
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
      setError('Vui lòng nhập đầy đủ email và mật khẩu')
      return
    }

    setLoading(true)

    try {
      // Gọi API đăng nhập
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.status === 'success') {
        // Kiểm tra quyền truy cập
        // Admin có thể đăng nhập với cả "admin" và "accountant" role
        // Accountant chỉ có thể đăng nhập với "accountant"
        const userRole = data.user.role;
        const canAccess = 
          (selectedRole === 'admin' && userRole === 'admin') ||
          (selectedRole === 'accountant' && (userRole === 'admin' || userRole === 'accountant')) ||
          (selectedRole === 'employee' && userRole === 'employee') ||
          (selectedRole === 'payroll-admin' && (userRole === 'admin' || userRole === 'accountant'));

        if (!canAccess) {
          setError(`Tài khoản này không có quyền đăng nhập với vai trò ${ROLE_LABELS[selectedRole]}`)
          setLoading(false)
          return
        }

        // Lưu token vào localStorage (dùng 'authToken' để nhất quán với các frontend apps)
        localStorage.setItem('authToken', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))

        // Redirect đến port tương ứng với token trong URL (để share giữa các origin)
        const port = ROLE_PORTS[selectedRole]
        if (port) {
          // Encode token và user data để truyền qua URL
          const tokenParam = encodeURIComponent(data.token)
          const userParam = encodeURIComponent(JSON.stringify(data.user))
          window.location.href = `http://localhost:${port}?token=${tokenParam}&user=${userParam}`
        } else {
          setError('Không tìm thấy ứng dụng cho vai trò này')
        }
      } else {
        setError(data.message || 'Đăng nhập thất bại')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Không thể kết nối đến server. Vui lòng kiểm tra lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Hệ thống Quản lý Nhân sự</h1>
          <p>Project KY-9</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="role">Đăng nhập với vai trò</label>
            <select
              id="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="form-select"
              required
            >
              <option value="">-- Chọn vai trò --</option>
              <option value="admin">Quản trị viên (Quản lý nhân sự)</option>
              <option value="accountant">Kế toán (Quản lý lương)</option>
              <option value="employee">Nhân viên</option>
              <option value="payroll-admin">Quản lý lương</option>
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
          <p>Chọn đúng vai trò để truy cập vào ứng dụng tương ứng</p>
          <p style={{ fontSize: '11px', color: '#a0aec0', marginTop: '8px' }}>
            💡 Lưu ý: admin@company.com có thể đăng nhập với cả "Quản trị viên" và "Kế toán"
          </p>
        </div>
      </div>
    </div>
  )
}

export default App

