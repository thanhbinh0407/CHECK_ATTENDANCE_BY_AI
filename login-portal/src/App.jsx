import { useState } from 'react'
import './App.css'

/**
 * Mỗi vai trò → client riêng (đúng cổng Vite trong repo).
 * Ghi đè bằng biến môi trường nếu deploy khác (vd. VITE_HR_CLIENT_URL).
 */
const ROLE_CLIENT_CONFIG = {
  manager: {
    origin: (import.meta.env.VITE_MANAGER_CLIENT_URL || 'http://localhost:5174').replace(/\/$/, ''),
    path: '/dashboard',
  },
  hr: {
    origin: (import.meta.env.VITE_HR_CLIENT_URL || 'http://localhost:5172').replace(/\/$/, ''),
    path: '/',
  },
  accountant: {
    origin: (import.meta.env.VITE_ACCOUNTANT_CLIENT_URL || 'http://localhost:5175').replace(/\/$/, ''),
    path: '/',
  },
  supervisor: {
    origin: (import.meta.env.VITE_SUPERVISOR_CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
    path: '/',
  },
  employee: {
    origin: (import.meta.env.VITE_EMPLOYEE_CLIENT_URL || 'http://localhost:5178').replace(/\/$/, ''),
    path: '/',
  },
}

const ROLE_DESCRIPTIONS = {
  manager:    'Manage user accounts, permissions, and system settings',
  hr:         'Manage employee profiles, departments, job titles, and attendance',
  accountant: 'Handle payroll, payslips, taxes, and social insurance',
  supervisor: 'Approve requests, review payroll, and view reports',
  employee:   'View personal information, attendance history, and submit requests',
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
      setError('Please enter your email and password')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, expectedRole: selectedRole }),
      })

      const data = await response.json()

      if (data.status === 'success') {
        const cfg = ROLE_CLIENT_CONFIG[selectedRole]
        if (!cfg) {
          setError('Client configuration for this role is not available yet.')
          setLoading(false)
          return
        }
        const tokenParam = encodeURIComponent(data.token)
        const dest = `${cfg.origin}${cfg.path}?token=${tokenParam}`
        window.location.href = dest
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Unable to connect to the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Human Resource Management System</h1>
          <p style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>
            Unified access portal for role-based HR operations
          </p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="role">Login role</label>
            <select
              id="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="form-select"
              required
            >
              <option value="">-- Select a role --</option>
              <option value="manager">🏢 Director (Manager)</option>
              <option value="hr">👥 HR Staff</option>
              <option value="accountant">💰 Accountant</option>
              <option value="supervisor">✅ Supervisor</option>
              <option value="employee">👤 Employee</option>
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
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="login-footer">
          <p>Select the correct role to access the corresponding app</p>
          <p style={{ fontSize: '11px', color: '#a0aec0', marginTop: '8px' }}>
            💡 Manager accounts can access all portals
          </p>
        </div>
      </div>
    </div>
  )
}

export default App

