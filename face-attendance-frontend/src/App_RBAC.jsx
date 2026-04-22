import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from '../pages/Home.jsx';
import ManagerLayout from './layout/ManagerLayout.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import UserManagement from './components/UserManagement.jsx';
import ManagerDashboard from './components/ManagerDashboard.jsx';
import AttendanceLog from './components/AttendanceLog.jsx';
import SalaryManagement from './components/SalaryManagement.jsx';
import SalaryManagementAdmin from './components/SalaryManagementAdmin.jsx';
import SalaryCalculation from './components/SalaryCalculation.jsx';
import SalaryGradeManagement from './components/SalaryGradeManagement.jsx';
import InsuranceConfigManagement from './components/InsuranceConfigManagement.jsx';
import InsuranceFormD02LT from './components/InsuranceFormD02LT.jsx';
import InsuranceFormTK1TS from './components/InsuranceFormTK1TS.jsx';
import ReportsDashboard from './components/ReportsDashboard.jsx';
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx';
import EnrollmentForm from './components/EnrollmentForm.jsx';
import ApprovalAuditLog from './components/ApprovalAuditLog.jsx';
import { AppToastContainer } from './lib/notify.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

/** Đăng nhập từ login-portal (cổng 3000): token trong URL — lưu vào localStorage của app này (5174). */
function hydrateAuthFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return;
    const decoded = decodeURIComponent(token);
    localStorage.setItem('authToken', decoded);
    window.history.replaceState({}, '', window.location.pathname || '/');
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${decoded}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 'success' && data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          window.dispatchEvent(new Event('storage'));
        }
      })
      .catch(() => {});
  } catch {
    /* ignore */
  }
}

function CameraPage() {
  return (
    <div className="mgr-camera-wrap">
      <Home />
    </div>
  );
}

function AppRBAC() {
  useEffect(() => {
    hydrateAuthFromUrl();
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route element={<ManagerLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ManagerDashboard />} />
            <Route path="/employees" element={<AdminDashboard />} />
            <Route path="/admin" element={<Navigate to="/employees" replace />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/departments" element={<Navigate to="/dashboard" replace />} />
            <Route path="/job-titles" element={<Navigate to="/dashboard" replace />} />
            <Route path="/shifts" element={<Navigate to="/dashboard" replace />} />
            <Route path="/camera" element={<CameraPage />} />
            <Route path="/attendance-logs" element={<AttendanceLog />} />
            <Route path="/leave" element={<Navigate to="/dashboard" replace />} />
            <Route path="/overtime" element={<Navigate to="/dashboard" replace />} />
            <Route path="/business-trips" element={<Navigate to="/dashboard" replace />} />
            <Route path="/salary-advances" element={<Navigate to="/dashboard" replace />} />
            <Route path="/approvals" element={<Navigate to="/dashboard" replace />} />
            <Route path="/salary" element={<SalaryManagement />} />
            <Route path="/salary-admin" element={<SalaryManagementAdmin />} />
            <Route path="/salary-calc" element={<SalaryCalculation />} />
            <Route path="/salary-grades" element={<SalaryGradeManagement />} />
            <Route path="/insurance-config" element={<InsuranceConfigManagement />} />
            <Route path="/insurance-d02" element={<InsuranceFormD02LT />} />
            <Route path="/insurance-tk1" element={<InsuranceFormTK1TS />} />
            <Route path="/reports" element={<ReportsDashboard />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/documents" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dependents" element={<Navigate to="/dashboard" replace />} />
            <Route path="/qualifications" element={<Navigate to="/dashboard" replace />} />
            <Route path="/enrollment" element={<EnrollmentForm />} />
            <Route path="/approval-audit" element={<ApprovalAuditLog />} />
          </Route>
        </Routes>
      </div>
      <AppToastContainer />
    </Router>
  );
}

export default AppRBAC;
