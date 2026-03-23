import { useEffect, useState } from "react";

function badgeColor(changeType) {
  const map = {
    hire: { bg: "#d1fae5", color: "#065f46" },
    initial_assignment: { bg: "#e0f2fe", color: "#0c4a6e" },
    transfer: { bg: "#ede9fe", color: "#5b21b6" },
    promotion: { bg: "#fef3c7", color: "#92400e" },
    demotion: { bg: "#fee2e2", color: "#991b1b" },
    increase: { bg: "#dcfce7", color: "#166534" },
    decrease: { bg: "#fee2e2", color: "#991b1b" },
    correction: { bg: "#e5e7eb", color: "#374151" },
    other: { bg: "#e5e7eb", color: "#374151" }
  };
  return map[changeType] || map.other;
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("vi-VN");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value || 0));
}

export default function JobHistoryTimeline() {
  const [jobHistory, setJobHistory] = useState([]);
  const [salaryChangeHistory, setSalaryChangeHistory] = useState([]);
  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingSalary, setLoadingSalary] = useState(true);
  const [error, setError] = useState("");
  const [jobFilter, setJobFilter] = useState({ fromDate: "", toDate: "", changeType: "" });
  const [salaryFilter, setSalaryFilter] = useState({ fromDate: "", toDate: "", changeType: "" });
  const [jobPagination, setJobPagination] = useState({ page: 1, pageSize: 10, totalPages: 1, total: 0 });
  const [salaryPagination, setSalaryPagination] = useState({ page: 1, pageSize: 10, totalPages: 1, total: 0 });
  const [jobTypes, setJobTypes] = useState([]);
  const [salaryTypes, setSalaryTypes] = useState([]);

  useEffect(() => {
    const fetchJobHistory = async () => {
      try {
        setLoadingJob(true);
        const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
        const token = localStorage.getItem("authToken");
        if (!token) {
          setError("Không tìm thấy phiên đăng nhập");
          return;
        }

        const params = new URLSearchParams({
          historyType: "job",
          page: String(jobPagination.page),
          pageSize: String(jobPagination.pageSize),
        });
        if (jobFilter.fromDate) params.set("fromDate", jobFilter.fromDate);
        if (jobFilter.toDate) params.set("toDate", jobFilter.toDate);
        if (jobFilter.changeType) params.set("changeType", jobFilter.changeType);

        const res = await fetch(`${apiBase}/api/employee/profile/history?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Không thể tải lịch sử công việc");
          return;
        }

        setJobHistory(data.jobHistory || []);
        setJobPagination((prev) => ({ ...prev, ...(data.jobPagination || prev) }));
      } catch (err) {
        setError(err.message || "Lỗi tải lịch sử công việc");
      } finally {
        setLoadingJob(false);
      }
    };

    fetchJobHistory();
  }, [jobFilter.fromDate, jobFilter.toDate, jobFilter.changeType, jobPagination.page, jobPagination.pageSize]);

  useEffect(() => {
    const fetchSalaryHistory = async () => {
      try {
        setLoadingSalary(true);
        const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
        const token = localStorage.getItem("authToken");
        if (!token) {
          setError("Không tìm thấy phiên đăng nhập");
          return;
        }

        const params = new URLSearchParams({
          historyType: "salary",
          page: String(salaryPagination.page),
          pageSize: String(salaryPagination.pageSize),
        });
        if (salaryFilter.fromDate) params.set("fromDate", salaryFilter.fromDate);
        if (salaryFilter.toDate) params.set("toDate", salaryFilter.toDate);
        if (salaryFilter.changeType) params.set("changeType", salaryFilter.changeType);

        const res = await fetch(`${apiBase}/api/employee/profile/history?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Không thể tải lịch sử lương");
          return;
        }

        setSalaryChangeHistory(data.salaryChangeHistory || []);
        setSalaryPagination((prev) => ({ ...prev, ...(data.salaryPagination || prev) }));
      } catch (err) {
        setError(err.message || "Lỗi tải lịch sử lương");
      } finally {
        setLoadingSalary(false);
      }
    };

    fetchSalaryHistory();
  }, [salaryFilter.fromDate, salaryFilter.toDate, salaryFilter.changeType, salaryPagination.page, salaryPagination.pageSize]);

  useEffect(() => {
    const loadTypes = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const [jobRes, salaryRes] = await Promise.all([
          fetch(`${apiBase}/api/employee/profile/history?historyType=job&page=1&pageSize=100`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBase}/api/employee/profile/history?historyType=salary&page=1&pageSize=100`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [jobData, salaryData] = await Promise.all([jobRes.json(), salaryRes.json()]);
        const jt = Array.from(new Set((jobData.jobHistory || []).map((x) => x.changeType).filter(Boolean)));
        const st = Array.from(new Set((salaryData.salaryChangeHistory || []).map((x) => x.changeType).filter(Boolean)));
        setJobTypes(jt);
        setSalaryTypes(st);
      } catch {
        // ignore type preload failure
      }
    };
    loadTypes();
  }, []);

  const historyCardStyle = {
    background: "#fff",
    borderRadius: 12,
    padding: 16,
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.08)",
  };

  const tableHeaderStyle = {
    textAlign: "left",
    padding: "10px 8px",
    fontSize: 13,
    fontWeight: 700,
    color: "#1f2937",
    borderBottom: "1px solid #e5e7eb",
  };

  const inputStyle = {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 13,
    backgroundColor: "#fff",
  };

  const resetJobFilter = () => {
    setJobFilter({ fromDate: "", toDate: "", changeType: "" });
    setJobPagination((prev) => ({ ...prev, page: 1 }));
  };

  const resetSalaryFilter = () => {
    setSalaryFilter({ fromDate: "", toDate: "", changeType: "" });
    setSalaryPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={historyCardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>Lịch sử công việc</h3>
        {loadingJob && <p>Đang tải...</p>}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        {!loadingJob && !error && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <input type="date" value={jobFilter.fromDate} onChange={(e) => { setJobFilter({ ...jobFilter, fromDate: e.target.value }); setJobPagination((p) => ({ ...p, page: 1 })); }} style={inputStyle} />
            <input type="date" value={jobFilter.toDate} onChange={(e) => { setJobFilter({ ...jobFilter, toDate: e.target.value }); setJobPagination((p) => ({ ...p, page: 1 })); }} style={inputStyle} />
            <select value={jobFilter.changeType} onChange={(e) => { setJobFilter({ ...jobFilter, changeType: e.target.value }); setJobPagination((p) => ({ ...p, page: 1 })); }} style={inputStyle}>
              <option value="">Tất cả loại</option>
              {jobTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <button onClick={resetJobFilter} style={{ ...inputStyle, cursor: "pointer", backgroundColor: "#eef2ff" }}>Reset filter</button>
          </div>
        )}
        {!loadingJob && !error && jobHistory.length === 0 && <p>Không có dữ liệu phù hợp bộ lọc.</p>}
        {!loadingJob && !error && jobHistory.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Ngày hiệu lực</th>
                  <th style={tableHeaderStyle}>Loại thay đổi</th>
                  <th style={tableHeaderStyle}>Phòng ban</th>
                  <th style={tableHeaderStyle}>Chức danh</th>
                  <th style={tableHeaderStyle}>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {jobHistory.map((item) => {
                  const color = badgeColor(item.changeType);
                  return (
                    <tr key={item.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: 8 }}>{formatDate(item.effectiveDate)}</td>
                      <td style={{ padding: 8 }}>
                        <span style={{ background: color.bg, color: color.color, borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                          {item.changeType}
                        </span>
                      </td>
                      <td style={{ padding: 8 }}>{item.fromDepartmentName || "-"} → {item.toDepartmentName || "-"}</td>
                      <td style={{ padding: 8 }}>{item.fromJobTitleName || "-"} → {item.toJobTitleName || "-"}</td>
                      <td style={{ padding: 8 }}>{item.notes || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loadingJob && !error && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10, alignItems: "center" }}>
            <button disabled={jobPagination.page <= 1} onClick={() => setJobPagination((p) => ({ ...p, page: p.page - 1 }))} style={{ ...inputStyle, cursor: jobPagination.page <= 1 ? "not-allowed" : "pointer" }}>Prev</button>
            <span style={{ fontSize: 13, color: "#475569" }}>Page {jobPagination.page} / {jobPagination.totalPages || 1}</span>
            <button disabled={jobPagination.page >= (jobPagination.totalPages || 1)} onClick={() => setJobPagination((p) => ({ ...p, page: p.page + 1 }))} style={{ ...inputStyle, cursor: jobPagination.page >= (jobPagination.totalPages || 1) ? "not-allowed" : "pointer" }}>Next</button>
          </div>
        )}
      </div>

      <div style={historyCardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>Lịch sử thay đổi lương</h3>
        {loadingSalary && <p>Đang tải...</p>}
        {!loadingSalary && !error && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <input type="date" value={salaryFilter.fromDate} onChange={(e) => { setSalaryFilter({ ...salaryFilter, fromDate: e.target.value }); setSalaryPagination((p) => ({ ...p, page: 1 })); }} style={inputStyle} />
            <input type="date" value={salaryFilter.toDate} onChange={(e) => { setSalaryFilter({ ...salaryFilter, toDate: e.target.value }); setSalaryPagination((p) => ({ ...p, page: 1 })); }} style={inputStyle} />
            <select value={salaryFilter.changeType} onChange={(e) => { setSalaryFilter({ ...salaryFilter, changeType: e.target.value }); setSalaryPagination((p) => ({ ...p, page: 1 })); }} style={inputStyle}>
              <option value="">Tất cả loại</option>
              {salaryTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <button onClick={resetSalaryFilter} style={{ ...inputStyle, cursor: "pointer", backgroundColor: "#eef2ff" }}>Reset filter</button>
          </div>
        )}
        {!loadingSalary && !error && salaryChangeHistory.length === 0 && <p>Không có dữ liệu phù hợp bộ lọc.</p>}
        {!loadingSalary && !error && salaryChangeHistory.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Ngày hiệu lực</th>
                  <th style={tableHeaderStyle}>Loại thay đổi</th>
                  <th style={tableHeaderStyle}>Lương cơ bản</th>
                  <th style={tableHeaderStyle}>Tổng phụ cấp</th>
                  <th style={tableHeaderStyle}>Lý do</th>
                </tr>
              </thead>
              <tbody>
                {salaryChangeHistory.map((item) => {
                  const color = badgeColor(item.changeType);
                  return (
                    <tr key={item.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: 8 }}>{formatDate(item.effectiveDate)}</td>
                      <td style={{ padding: 8 }}>
                        <span style={{ background: color.bg, color: color.color, borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                          {item.changeType}
                        </span>
                      </td>
                      <td style={{ padding: 8 }}>{formatCurrency(item.previousBaseSalary)} → {formatCurrency(item.newBaseSalary)}</td>
                      <td style={{ padding: 8 }}>{formatCurrency(item.previousTotalAllowance)} → {formatCurrency(item.newTotalAllowance)}</td>
                      <td style={{ padding: 8 }}>{item.reason || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loadingSalary && !error && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10, alignItems: "center" }}>
            <button disabled={salaryPagination.page <= 1} onClick={() => setSalaryPagination((p) => ({ ...p, page: p.page - 1 }))} style={{ ...inputStyle, cursor: salaryPagination.page <= 1 ? "not-allowed" : "pointer" }}>Prev</button>
            <span style={{ fontSize: 13, color: "#475569" }}>Page {salaryPagination.page} / {salaryPagination.totalPages || 1}</span>
            <button disabled={salaryPagination.page >= (salaryPagination.totalPages || 1)} onClick={() => setSalaryPagination((p) => ({ ...p, page: p.page + 1 }))} style={{ ...inputStyle, cursor: salaryPagination.page >= (salaryPagination.totalPages || 1) ? "not-allowed" : "pointer" }}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
