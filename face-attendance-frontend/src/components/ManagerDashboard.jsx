import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useManagerDashboardData } from "../hooks/useManagerDashboardData.js";
import ManagerOverview from "./ManagerOverview.jsx";
import "./managerDashboard.css";

function formatMoney(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );
}

const shortcutGroups = [
  {
    title: "People & Organization",
    links: [
      { to: "/employees", label: "Employee Profiles", icon: "👥" },
      { to: "/users", label: "Accounts & Roles", icon: "🔐" },
      { to: "/departments", label: "Departments", icon: "🏢" },
      { to: "/job-titles", label: "Job Titles", icon: "📋" },
      { to: "/shifts", label: "Work Shifts", icon: "🕐" },
      { to: "/enrollment", label: "Face Enrollment", icon: "🪪" },
    ],
  },
  {
    title: "Attendance & Requests",
    links: [
      { to: "/camera", label: "Face Recognition Kiosk", icon: "📷" },
      { to: "/attendance-logs", label: "Attendance Logs", icon: "📅" },
      { to: "/leave", label: "Leave Requests", icon: "🏖️" },
      { to: "/overtime", label: "Overtime", icon: "⏱️" },
      { to: "/business-trips", label: "Business Trips", icon: "✈️" },
      { to: "/salary-advances", label: "Salary Advances", icon: "💵" },
      { to: "/approvals", label: "Approval Flow (HR)", icon: "✅" },
    ],
  },
  {
    title: "Payroll, Insurance & Reports",
    links: [
      { to: "/salary", label: "Payroll Management", icon: "💰" },
      { to: "/salary-calc", label: "Payroll Calculation", icon: "🧮" },
      { to: "/salary-grades", label: "Salary Grades", icon: "📈" },
      { to: "/insurance-config", label: "Insurance Settings", icon: "🏥" },
      { to: "/insurance-d02", label: "D02-LT", icon: "📄" },
      { to: "/insurance-tk1", label: "TK1-TS", icon: "📝" },
      { to: "/reports", label: "Reports", icon: "📊" },
      { to: "/analytics", label: "Analytics", icon: "📉" },
    ],
  },
  {
    title: "Profiles & Documents",
    links: [
      { to: "/documents", label: "Documents", icon: "📎" },
      { to: "/dependents", label: "Dependents", icon: "👨‍👩‍👧" },
      { to: "/qualifications", label: "Qualifications / Certificates", icon: "🎓" },
    ],
  },
];

export default function ManagerDashboard() {
  const { employees, departments, jobTitles, recentChanges, pending, loading, error, summary, workDurations, workSummary } = useManagerDashboardData();
  const [showAllWorkers, setShowAllWorkers] = useState(false);

  const headDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }, []);

  const totalEmp = employees.length;
  const visibleWorkers = showAllWorkers ? workDurations : workDurations.slice(0, 10);
  const hasMoreWorkers = workDurations.length > 10;

  return (
    <div className="mgr-dash">
      <header className="mgr-dash__head">
        <div>
          <h1 className="mgr-dash__title">Overview</h1>
          <p className="mgr-dash__sub">
            Quick snapshot of workforce, pending requests, and core workflows. Use the grid below or the left menu to open modules.
          </p>
        </div>
        <div className="mgr-dash__meta">{headDate}</div>
      </header>

      {error ? <div className="mgr-dash__error">{error}</div> : null}

      <section className="mgr-dash__kpis" aria-label="Quick metrics">
        <div className="mgr-dash__kpi">
          <span className="mgr-dash__kpi-deco" aria-hidden>
            ◎
          </span>
          <div className="mgr-dash__kpi-label">Total Employees</div>
          <div className="mgr-dash__kpi-value">{loading ? "…" : totalEmp}</div>
        </div>
        <div className="mgr-dash__kpi mgr-dash__kpi--ok">
          <span className="mgr-dash__kpi-deco" aria-hidden>
            ✓
          </span>
          <div className="mgr-dash__kpi-label">Currently Active</div>
          <div className="mgr-dash__kpi-value">{loading ? "…" : summary.active}</div>
        </div>
        <div className="mgr-dash__kpi mgr-dash__kpi--danger">
          <span className="mgr-dash__kpi-deco" aria-hidden>
            ◌
          </span>
          <div className="mgr-dash__kpi-label">Inactive / On Leave</div>
          <div className="mgr-dash__kpi-value">{loading ? "…" : summary.inactive}</div>
        </div>
        <Link to="/approvals" className="mgr-dash__kpi mgr-dash__kpi--accent mgr-dash__kpi--link">
          <span className="mgr-dash__kpi-deco" aria-hidden>
            ⏳
          </span>
          <div className="mgr-dash__kpi-label">Pending Approvals</div>
          <div className="mgr-dash__kpi-value">{loading ? "…" : summary.pendingTotal}</div>
          {!loading && (
            <div className="mgr-dash__kpi-chips">
              <span className="mgr-dash__chip">Leave {pending.leave}</span>
              <span className="mgr-dash__chip">OT {pending.overtime}</span>
              <span className="mgr-dash__chip">Trip {pending.trip}</span>
              <span className="mgr-dash__chip">Advance {pending.advance}</span>
            </div>
          )}
        </Link>
        <div className="mgr-dash__kpi">
          <span className="mgr-dash__kpi-deco" aria-hidden>
            ₫
          </span>
          <div className="mgr-dash__kpi-label">Base Payroll Fund</div>
          <div className="mgr-dash__kpi-value mgr-dash__kpi-value--sm">{loading ? "…" : formatMoney(summary.totalPayrollBase)}</div>
        </div>
        <div className="mgr-dash__kpi">
          <span className="mgr-dash__kpi-deco" aria-hidden>
            ⧉
          </span>
          <div className="mgr-dash__kpi-label">Departments · Job Titles</div>
          <div className="mgr-dash__kpi-value mgr-dash__kpi-value--sm">
            {loading ? "…" : `${departments.length} · ${jobTitles.length}`}
          </div>
        </div>
      </section>

      <section className="mgr-dash__quick" aria-label="Quick access">
        <div className="mgr-dash__quick-head">
          <h2 className="mgr-dash__quick-title">Quick Access</h2>
          <span className="mgr-dash__quick-hint">4-column bento · hover to highlight modules</span>
        </div>
        <div className="mgr-dash__groups">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mgr-dash__group-title">{group.title}</h3>
              <div className="mgr-dash__links">
                {group.links.map((item) => (
                  <Link key={item.to} to={item.to} className="mgr-dash__link">
                    <span className="mgr-dash__link-ico">{item.icon}</span>
                    <span>{item.label}</span>
                    <span className="mgr-dash__link-arrow">→</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mgr-work" aria-label="Today's work status">
        <div className="mgr-work__head">
          <h2 className="mgr-work__title">Today's Work Status</h2>
          <div className="mgr-work__chips">
            <span className="mgr-work__chip mgr-work__chip--active">Active: {loading ? "…" : workSummary.active}</span>
            <span className="mgr-work__chip mgr-work__chip--done">Checked Out: {loading ? "…" : workSummary.finished}</span>
          </div>
        </div>

        {loading && <div className="mgr-work__empty">Loading attendance data...</div>}
        {!loading && visibleWorkers.length === 0 && (
          <div className="mgr-work__empty">No attendance data available today to calculate working time.</div>
        )}

        {!loading && visibleWorkers.length > 0 && (
          <>
            <div className="mgr-work__list">
              {visibleWorkers.map((row) => (
                <div key={row.userId} className="mgr-work__row">
                  <div className="mgr-work__main">
                    <div className="mgr-work__name">{row.name}</div>
                    <div className="mgr-work__meta">Clock-in: {row.firstInText} • Last update: {row.lastActionText}</div>
                  </div>
                  <div className="mgr-work__side">
                    <span className={`mgr-work__status ${row.status === "Working" || row.status === "Đang làm việc" ? "is-active" : "is-done"}`}>
                      {row.status === "Đang làm việc" ? "Working" : row.status === "Đã checkout" ? "Checked Out" : row.status}
                    </span>
                    <strong className="mgr-work__duration">{row.durationText}</strong>
                  </div>
                </div>
              ))}
            </div>

            {hasMoreWorkers && (
              <div className="mgr-work__actions">
                <button
                  type="button"
                  className="mgr-work__toggle"
                  onClick={() => setShowAllWorkers((prev) => !prev)}
                >
                  {showAllWorkers ? "Show Top 10" : "Show All"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <ManagerOverview
        recentChanges={recentChanges}
        loading={loading}
        departments={departments}
        jobTitles={jobTitles}
        summary={summary}
      />
    </div>
  );
}
