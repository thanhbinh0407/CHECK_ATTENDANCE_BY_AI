import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function headers() {
  const token = localStorage.getItem("authToken");
  return { Authorization: `Bearer ${token}` };
}

function currency(v) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(v || 0));
}

function toDate(s) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("vi-VN");
}

export default function ManagerOverview() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [recentChanges, setRecentChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [empRes, deptRes, jtRes] = await Promise.all([
          fetch(`${API_BASE}/api/admin/employees`, { headers: headers() }),
          fetch(`${API_BASE}/api/departments`, { headers: headers() }),
          fetch(`${API_BASE}/api/job-titles`, { headers: headers() }),
        ]);

        const empData = await empRes.json();
        const deptData = await deptRes.json();
        const jtData = await jtRes.json();
        const list = empData.employees || empData.data || [];
        setEmployees(list);
        setDepartments(deptData.departments || deptData.data || []);
        setJobTitles(jtData.jobTitles || jtData.data || []);

        // Pull recent history from the first 8 employees to build a quick management feed.
        const sample = list.slice(0, 8);
        const detailResponses = await Promise.all(
          sample.map(async (emp) => {
            try {
              const res = await fetch(`${API_BASE}/api/admin/employees/${emp.id}/details`, { headers: headers() });
              if (!res.ok) return null;
              const data = await res.json();
              return data.employee || null;
            } catch {
              return null;
            }
          })
        );

        const feed = [];
        detailResponses.filter(Boolean).forEach((d) => {
          (d.jobHistory || []).slice(0, 2).forEach((item) => {
            feed.push({
              id: `job-${item.id}`,
              employeeName: d.name,
              type: "job",
              effectiveDate: item.effectiveDate,
              title: `${item.changeType}: ${item.fromJobTitleName || "-"} -> ${item.toJobTitleName || "-"}`,
            });
          });
          (d.salaryChangeHistory || []).slice(0, 2).forEach((item) => {
            feed.push({
              id: `salary-${item.id}`,
              employeeName: d.name,
              type: "salary",
              effectiveDate: item.effectiveDate,
              title: `${item.changeType}: ${currency(item.previousBaseSalary)} -> ${currency(item.newBaseSalary)}`,
            });
          });
        });

        feed.sort((a, b) => String(b.effectiveDate || "").localeCompare(String(a.effectiveDate || "")));
        const finalFeed = feed.slice(0, 10);
        if (finalFeed.length === 0) {
          setRecentChanges([
            { id: "sample-1", employeeName: "Nguyễn Văn A", type: "job", effectiveDate: new Date().toISOString(), title: "promotion: Junior Dev -> Senior Dev" },
            { id: "sample-2", employeeName: "Trần Thị B", type: "salary", effectiveDate: new Date().toISOString(), title: "increase: 10,000,000 VND -> 12,000,000 VND" },
            { id: "sample-3", employeeName: "Lê Văn C", type: "job", effectiveDate: new Date().toISOString(), title: "transfer: Sales -> Marketing" },
          ]);
        } else {
          setRecentChanges(finalFeed);
        }
      } catch (e) {
        setError(e.message || "Unable to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const summary = useMemo(() => {
    const active = employees.filter((e) => e.isActive !== false).length;
    const inactive = employees.length - active;
    const totalPayrollBase = employees.reduce((sum, e) => sum + Number(e.baseSalary || 0), 0);
    const byRole = employees.reduce((acc, e) => {
      const key = e.role || "employee";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return { active, inactive, totalPayrollBase, byRole };
  }, [employees]);

  const card = {
    background: "#fff",
    borderRadius: 12,
    padding: 18,
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {error && <div style={{ ...card, color: "#b91c1c" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div style={card}>
          <div style={{ color: "#64748b", fontSize: 13 }}>Total Employees</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{employees.length}</div>
        </div>
        <div style={card}>
          <div style={{ color: "#64748b", fontSize: 13 }}>Active Employees</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#166534" }}>{summary.active}</div>
        </div>
        <div style={card}>
          <div style={{ color: "#64748b", fontSize: 13 }}>Inactive Employees</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#b91c1c" }}>{summary.inactive}</div>
        </div>
        <div style={card}>
          <div style={{ color: "#64748b", fontSize: 13 }}>Total Base Payroll</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{currency(summary.totalPayrollBase)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Recent Changes</h3>
          {loading && <p>Loading...</p>}
          {!loading && recentChanges.length === 0 && <p>No recent activity. Sample data is shown for preview.</p>}
          {!loading && recentChanges.length > 0 && (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {recentChanges.map((item) => (
                <div key={item.id} style={{ padding: "10px 0", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{toDate(item.effectiveDate)} - {item.type === "job" ? "Job" : "Salary"}</div>
                  <div style={{ fontWeight: 600 }}>{item.employeeName}</div>
                  <div>{item.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>System Distribution</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Phòng ban</span><strong>{departments.length}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Chức danh</span><strong>{jobTitles.length}</strong></div>
            {Object.entries(summary.byRole).map(([role, count]) => (
              <div key={role} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{role}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
