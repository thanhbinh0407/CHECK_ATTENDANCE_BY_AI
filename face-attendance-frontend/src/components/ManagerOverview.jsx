function toDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("vi-VN");
}

function typeLabel(type) {
  if (type === "job") return "Công việc";
  if (type === "role") return "Vai trò";
  return "Lương";
}

function typePillClass(type) {
  if (type === "job") return "mgr-dash__type-pill mgr-dash__type-pill--job";
  if (type === "role") return "mgr-dash__type-pill mgr-dash__type-pill--role";
  return "mgr-dash__type-pill mgr-dash__type-pill--salary";
}

/**
 * Hai panel dưới dashboard: hoạt động gần đây + phân bổ (dữ liệu từ hook cha).
 */
export default function ManagerOverview({
  recentChanges = [],
  loading = false,
  departments = [],
  jobTitles = [],
  summary = { byRole: {} },
}) {
  const roleEntries = Object.entries(summary.byRole || {}).sort((a, b) => b[1] - a[1]);
  const maxRole = Math.max(...roleEntries.map(([, n]) => n), 1);

  return (
    <div className="mgr-dash__lower">
      <div className="mgr-dash__panel">
        <h3 className="mgr-dash__panel-title">Hoạt động gần đây</h3>
        {loading && <div className="mgr-dash__loading">Đang tải luồng nghiệp vụ…</div>}
        {!loading && recentChanges.length === 0 && (
          <div className="mgr-dash__loading">Chưa có sự kiện. Dữ liệu mẫu có thể hiển thị khi hệ thống trống.</div>
        )}
        {!loading && recentChanges.length > 0 && (
          <div className="mgr-dash__feed">
            {recentChanges.map((item) => (
              <div key={item.id} className="mgr-dash__feed-item">
                <div className="mgr-dash__feed-meta">
                  <span className={typePillClass(item.type)}>{typeLabel(item.type)}</span>
                  {toDate(item.effectiveDate)}
                </div>
                <div className="mgr-dash__feed-name">{item.employeeName}</div>
                <div className="mgr-dash__feed-desc">{item.title}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mgr-dash__panel">
        <h3 className="mgr-dash__panel-title">Cơ cấu hệ thống</h3>
        <div className="mgr-dash__stat-rows">
          <div className="mgr-dash__stat-row">
            <span>Phòng ban</span>
            <strong>{departments.length}</strong>
          </div>
          <div className="mgr-dash__stat-row">
            <span>Chức danh</span>
            <strong>{jobTitles.length}</strong>
          </div>
        </div>
        {roleEntries.length > 0 && (
          <>
            <p className="mgr-dash__group-title" style={{ marginTop: 16, marginBottom: 8 }}>
              Theo vai trò đăng nhập
            </p>
            {roleEntries.map(([role, count]) => (
              <div key={role} className="mgr-dash__role-block">
                <div className="mgr-dash__stat-row">
                  <span style={{ textTransform: "capitalize" }}>{role}</span>
                  <strong>{count}</strong>
                </div>
                <div className="mgr-dash__bar">
                  <div className="mgr-dash__bar-fill" style={{ width: `${(count / maxRole) * 100}%` }} />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
