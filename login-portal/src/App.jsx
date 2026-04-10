import { useState } from 'react'
import './App.css'

/**
 * Each role maps to its own client app (matching Vite ports).
 * Override via env vars when deploying (e.g. VITE_HR_CLIENT_URL).
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
  manager:    'Manage user accounts, roles, and system configuration',
  hr:         'Manage employee profiles, departments, job titles, and attendance',
  accountant: 'Handle payroll, tax, and social insurance operations',
  supervisor: 'Review requests, approve payroll, and monitor reports',
  employee:   'View personal profile, attendance history, and submit requests',
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
      setError('Please select a role to sign in')
      return
    }

    if (!email || !password) {
      setError('Please enter email and password')
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
          setError('Client configuration for this role is missing.')
          setLoading(false)
          return
        }
        const tokenParam = encodeURIComponent(data.token)
        const dest = `${cfg.origin}${cfg.path}?token=${tokenParam}`
        window.location.href = dest
      } else {
        setError(data.message || 'Sign in failed')
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
          <p style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>
            Human Resource Management System
          </p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="role">Sign-in role</label>
            <select
              id="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="form-select"
              required
            >
              <option value="">-- Select role --</option>
              <option value="manager">🏢 Manager</option>
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
              placeholder="Enter password"
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
          <p>Select the correct role to access the corresponding portal</p>
          <p style={{ fontSize: '11px', color: '#a0aec0', marginTop: '8px' }}>
            💡 Manager accounts can access all portals
          </p>
        </div>
      </div>
    </div>
  )
}

export default App

