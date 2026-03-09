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
  admin: 'Administrator',
  employee: 'Employee',
  accountant: 'Accountant',
  'payroll-admin': 'Payroll Manager'
}

const ROLE_DESCRIPTIONS = {
  admin: 'Manage entire system, employees & settings (For admin@company.com)',
  employee: 'View personal info, attendance history & salary',
  accountant: 'Manage & approve payroll (For admin@company.com & accountant@company.com)',
  'payroll-admin': 'Manage payroll system & policies'
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
      setError('Please select a login role')
      return
    }

    if (!email || !password) {
      setError('Please enter email and password')
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
          setError(`This account does not have access to ${ROLE_LABELS[selectedRole]}`)
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
          setError('Application not found for this role')
        }
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Cannot connect to server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Human Resource Management System</h1>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="role">Login Role</label>
            <select
              id="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="form-select"
              required
            >
              <option value="">-- Select a role --</option>
              <option value="admin">Administrator (HR Management)</option>
              <option value="accountant">Accountant (Payroll Management)</option>
              <option value="employee">Employee</option>
              <option value="payroll-admin">Payroll Manager</option>
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
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Enter your password"
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
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>Select the correct role to access the corresponding application</p>
          <p style={{ fontSize: '11px', color: '#a0aec0', marginTop: '8px' }}>
            💡 Note: admin@company.com can login as both "Administrator" and "Accountant"
          </p>
        </div>
      </div>
    </div>
  )
}

export default App

