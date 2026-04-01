import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useManagerDashboardData } from "../hooks/useManagerDashboardData.js";
import ManagerOverview from "./ManagerOverview.jsx";
import "./managerDashboard.css";

function formatMoney(n) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );
}

const shortcutGroups = [
  {
    title: "Nhân sự & tổ chức",
    links: [
      { to: "/employees", label: "Hồ sơ nhân viên", icon: "👥" },
      { to: "/users", label: "Tài khoản & role", icon: "🔐" },
      { to: "/departments", label: "Phòng ban", icon: "🏢" },
      { to: "/job-titles", label: "Chức danh", icon: "📋" },
      { to: "/shifts", label: "Ca làm việc", icon: "🕐" },
      { to: "/enrollment", label: "Đăng ký khuôn mặt", icon: "🪪" },
    ],
  },
  {
    title: "Chấm công & đơn từ",
    links: [
      { to: "/camera", label: "Kiosk nhận diện", icon: "📷" },
      { to: "/attendance-logs", label: "Nhật ký chấm công", icon: "📅" },
      { to: "/leave", label: "Nghỉ phép", icon: "🏖️" },
      { to: "/overtime", label: "Tăng ca", icon: "⏱️" },
      { to: "/business-trips", label: "Công tác", icon: "✈️" },
      { to: "/salary-advances", label: "Tạm ứng lương", icon: "💵" },
      { to: "/approvals", label: "Luồng duyệt (HR)", icon: "✅" },
    ],
  },
  {
    title: "Lương, BH & báo cáo",
    links: [
      { to: "/salary", label: "Quản lý lương", icon: "💰" },
      { to: "/salary-calc", label: "Tính lương", icon: "🧮" },
      { to: "/salary-grades", label: "Cấp bậc lương", icon: "📈" },
      { to: "/insurance-config", label: "Cấu hình BH", icon: "🏥" },
      { to: "/insurance-d02", label: "D02-LT", icon: "📄" },
      { to: "/insurance-tk1", label: "TK1-TS", icon: "📝" },
      { to: "/reports", label: "Báo cáo", icon: "📊" },
      { to: "/analytics", label: "Phân tích", icon: "📉" },
    ],
  },
  {
    title: "Hồ sơ & tài liệu",
    links: [
      { to: "/documents", label: "Tài liệu", icon: "📎" },
      { to: "/dependents", label: "Người phụ thuộc", icon: "👨‍👩‍👧" },
      { to: "/qualifications", label: "Bằng cấp / CC", icon: "🎓" },
    ],
  },
];

export default function ManagerDashboard() {
  const { employees, departments, jobTitles, recentChanges, pending, loading, error, summary } = useManagerDashboardData();

  const headDate = useMemo(() => {
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }, []);

  const totalEmp = employees.length;

  return (
    <div className="mgr-dash">
      <header className="mgr-dash__head">
        <div>
          <h1 className="mgr-dash__title">Tổng quan</h1>
          <p className="mgr-dash__sub">
            Ảnh chụp nhanh nhân sự, đơn chờ xử lý và luồng nghiệp vụ — truy cập module qua lưới bên dưới hoặc menu trái.
          </p>
        </div>
        <div className="mgr-dash__meta">{headDate}</div>
      </header>

      {error ? <div className="mgr-dash__error">{error}</div> : null}

      <section className="mgr-dash__kpis" aria-label="Chỉ số nhanh">
        <div className="mgr-dash__kpi">
          <span className="mgr-dash__kpi-deco" aria-hidden>
            ◎
          </span>
          <div className="mgr-dash__kpi-label">Tổng nhân viên</div>
          <div className="mgr-dash__kpi-value">{loading ? "…" : totalEmp}</div>
        </div>
        <div className="mgr-dash__kpi mgr-dash__kpi--ok">
          <span className="mgr-dash__kpi-deco" aria-hidden>
            ✓
          </span>
          <div className="mgr-dash__kpi-label">Đang làm việc</div>
          <div className="mgr-dash__kpi-value">{loading ? "…" : summary.active}</div>
        </div>
        <div className="mgr-dash__kpi mgr-dash__kpi--danger">
          <span className="mgr-dash__kpi-deco" aria-hidden>
            ◌
          </span>
          <div className="mgr-dash__kpi-label">Nghỉ / không hoạt động</div>
          <div className="mgr-dash__kpi-value">{loading ? "…" : summary.inactive}</div>
        </div>
        <Link to="/approvals" className="mgr-dash__kpi mgr-dash__kpi--accent mgr-dash__kpi--link">
          <span className="mgr-dash__kpi-deco" aria-hidden>
            ⏳
          </span>
          <div className="mgr-dash__kpi-label">Đơn chờ duyệt</div>
          <div className="mgr-dash__kpi-value">{loading ? "…" : summary.pendingTotal}</div>
          {!loading && (
            <div className="mgr-dash__kpi-chips">
              <span className="mgr-dash__chip">Nghỉ {pending.leave}</span>
              <span className="mgr-dash__chip">OT {pending.overtime}</span>
              <span className="mgr-dash__chip">CT {pending.trip}</span>
              <span className="mgr-dash__chip">Ứng {pending.advance}</span>
            </div>
          )}
        </Link>
        <div className="mgr-dash__kpi">
          <span className="mgr-dash__kpi-deco" aria-hidden>
            ₫
          </span>
          <div className="mgr-dash__kpi-label">Quỹ lương cơ bản</div>
          <div className="mgr-dash__kpi-value mgr-dash__kpi-value--sm">{loading ? "…" : formatMoney(summary.totalPayrollBase)}</div>
        </div>
        <div className="mgr-dash__kpi">
          <span className="mgr-dash__kpi-deco" aria-hidden>
            ⧉
          </span>
          <div className="mgr-dash__kpi-label">Phòng ban · chức danh</div>
          <div className="mgr-dash__kpi-value mgr-dash__kpi-value--sm">
            {loading ? "…" : `${departments.length} · ${jobTitles.length}`}
          </div>
        </div>
      </section>

      <section className="mgr-dash__quick" aria-label="Truy cập nhanh">
        <div className="mgr-dash__quick-head">
          <h2 className="mgr-dash__quick-title">Truy cập nhanh</h2>
          <span className="mgr-dash__quick-hint">Bento 4 cột · hover để làm nổi module</span>
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
