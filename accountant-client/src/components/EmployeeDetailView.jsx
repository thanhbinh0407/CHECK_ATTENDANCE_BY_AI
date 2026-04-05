import React, { useState, useEffect, useMemo } from "react";
import { theme } from "../theme.js";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';

export default function EmployeeDetailView() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("info");
  const [jobFilter, setJobFilter] = useState({ fromDate: "", toDate: "", changeType: "" });
  const [salaryChangeFilter, setSalaryChangeFilter] = useState({ fromDate: "", toDate: "", changeType: "" });
  const [jobHistoryData, setJobHistoryData] = useState([]);
  const [salaryChangeData, setSalaryChangeData] = useState([]);
  const [jobPagination, setJobPagination] = useState({ page: 1, pageSize: 8, totalPages: 1 });
  const [salaryPagination, setSalaryPagination] = useState({ page: 1, pageSize: 8, totalPages: 1 });
  const [historyLoading, setHistoryLoading] = useState(false);

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || data.data || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setMessage("Error loading employee list");
    } finally {
      setLoading(false);
    }
  };

  const viewEmployeeDetails = async (employeeId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/admin/employees/${employeeId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEmployeeDetails(data.employee || {});
        setSelectedEmployee(employeeId);
        setActiveTab("info");
        setJobFilter({ fromDate: "", toDate: "", changeType: "" });
        setSalaryChangeFilter({ fromDate: "", toDate: "", changeType: "" });
        setJobPagination({ page: 1, pageSize: 8, totalPages: 1 });
        setSalaryPagination({ page: 1, pageSize: 8, totalPages: 1 });
        setJobHistoryData([]);
        setSalaryChangeData([]);
        setMessage("");
      } else {
        setMessage(data?.message || `Could not load profile (${res.status})`);
      }
    } catch (error) {
      console.error("Error fetching employee details:", error);
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabButtonStyle = (tab) => ({
    flex: 1,
    minWidth: 130,
    padding: "12px 10px",
    border: "none",
    borderBottom: activeTab === tab ? `3px solid ${theme.colors.secondary}` : "3px solid transparent",
    backgroundColor: activeTab === tab ? "#eff6ff" : "white",
    color: activeTab === tab ? theme.colors.primary : "#334155",
    cursor: "pointer",
    fontWeight: activeTab === tab ? 700 : 500,
    transition: "all 0.2s ease",
  });

  const historyInputStyle = {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 13,
    backgroundColor: "#fff",
  };

  const historyCardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#f8fafc",
  };

  const historyTypes = {
    job: ["hire", "initial_assignment", "transfer", "promotion", "demotion", "correction", "other"],
    salary: ["initial_salary", "increase", "decrease", "correction", "other"]
  };

  const changeBadge = (type) => {
    const map = {
      hire: { bg: "#d1fae5", color: "#065f46" },
      initial_assignment: { bg: "#e0f2fe", color: "#0c4a6e" },
      transfer: { bg: "#ede9fe", color: "#5b21b6" },
      promotion: { bg: "#fef3c7", color: "#92400e" },
      demotion: { bg: "#fee2e2", color: "#991b1b" },
      initial_salary: { bg: "#dbeafe", color: "#1e40af" },
      increase: { bg: "#dcfce7", color: "#166534" },
      decrease: { bg: "#fee2e2", color: "#991b1b" },
      correction: { bg: "#e5e7eb", color: "#374151" },
      other: { bg: "#e5e7eb", color: "#374151" }
    };
    return map[type] || map.other;
  };

  const fetchHistory = async (historyType) => {
    if (!selectedEmployee) return;
    try {
      setHistoryLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const filter = historyType === "job" ? jobFilter : salaryChangeFilter;
      const pagination = historyType === "job" ? jobPagination : salaryPagination;
      const params = new URLSearchParams({
        historyType,
        page: String(pagination.page),
        pageSize: String(pagination.pageSize)
      });
      if (filter.fromDate) params.set("fromDate", filter.fromDate);
      if (filter.toDate) params.set("toDate", filter.toDate);
      if (filter.changeType) params.set("changeType", filter.changeType);

      const res = await fetch(`${apiBase}/api/admin/employees/${selectedEmployee}/history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "Cannot load history");
        return;
      }

      if (historyType === "job") {
        setJobHistoryData(data.jobHistory || []);
        setJobPagination((prev) => ({ ...prev, ...(data.jobPagination || prev) }));
      } else {
        setSalaryChangeData(data.salaryChangeHistory || []);
        setSalaryPagination((prev) => ({ ...prev, ...(data.salaryPagination || prev) }));
      }
    } catch (error) {
      setMessage(`Error loading ${historyType} history: ${error.message}`);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "job-history") {
      fetchHistory("job");
    }
  }, [activeTab, selectedEmployee, jobFilter.fromDate, jobFilter.toDate, jobFilter.changeType, jobPagination.page]);

  useEffect(() => {
    if (activeTab === "salary-change") {
      fetchHistory("salary");
    }
  }, [activeTab, selectedEmployee, salaryChangeFilter.fromDate, salaryChangeFilter.toDate, salaryChangeFilter.changeType, salaryPagination.page]);

  return (
    <div style={{ padding: "20px", backgroundColor: theme.colors.light, minHeight: "100vh" }}>
      <h1 style={{ color: theme.colors.primary, marginBottom: "20px" }}>👤 Employee Details</h1>

      {message && (
        <div
          style={{
            padding: "10px",
            marginBottom: "15px",
            backgroundColor: message.includes("Error") ? "#f8d7da" : "#d4edda",
            color: message.includes("Error") ? "#721c24" : "#155724",
            borderRadius: "5px"
          }}
        >
          {message}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "20px" }}>
        {/* Employee List */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "15px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            height: "fit-content"
          }}
        >
          <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>📋 Employee List</h3>

          <input
            type="text"
            placeholder="Search by name or employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "15px",
              borderRadius: "5px",
              border: `1px solid ${theme.colors.border}`
            }}
          />

          <div style={{ maxHeight: "600px", overflowY: "auto" }}>
            {filteredEmployees.length === 0 ? (
              <p style={{ color: "#999", textAlign: "center", padding: "20px 0" }}>
                No employees found
              </p>
            ) : (
              filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => viewEmployeeDetails(emp.id)}
                  style={{
                    padding: "12px",
                    marginBottom: "8px",
                    backgroundColor: selectedEmployee === emp.id ? (theme.colors?.primary || "#1e3a5f") : "#f9f9f9",
                    color: selectedEmployee === emp.id ? "white" : "black",
                    fontWeight: selectedEmployee === emp.id ? 700 : "normal",
                    borderRadius: "5px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    borderLeft: selectedEmployee === emp.id ? "4px solid rgba(255,255,255,0.8)" : "none"
                  }}
                >
                  <div style={{ fontWeight: "bold", fontSize: "0.95em" }}>{emp.name}</div>
                  <div style={{ fontSize: "0.85em", opacity: 0.8 }}>
                    {emp.employeeCode} | {emp.Department?.name || "N/A"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Employee details displayed on the right (no popup) */}
        <div style={{ minHeight: "400px" }}>
          {!employeeDetails && (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "40px",
                textAlign: "center",
                color: "#999"
              }}
            >
              <div style={{ fontSize: "3em", marginBottom: "10px" }}>👈</div>
              <p>Select an employee from the list to view details</p>
            </div>
          )}
          {employeeDetails && (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                border: "1px solid #e5e7eb",
                maxHeight: "85vh",
                overflowY: "auto"
              }}
            >
              {/* Header */}
              <div
                style={{
                  backgroundColor: theme.colors?.primary || "#1e3a5f",
                  color: "white",
                  padding: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <h2 style={{ margin: "0 0 10px 0" }}>{employeeDetails.name}</h2>
                  <div style={{ display: "flex", gap: "20px", fontSize: "0.95em" }}>
                    <span><strong>Emp. ID:</strong> {employeeDetails.employeeCode}</span>
                    <span><strong>Job Title:</strong> {employeeDetails.jobTitle || "N/A"}</span>
                    <span><strong>Department:</strong> {employeeDetails.department || "N/A"}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEmployeeDetails(null);
                    setSelectedEmployee(null);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "white",
                    fontSize: "24px",
                    cursor: "pointer",
                    padding: "5px 10px"
                  }}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: `1px solid ${theme.colors.border}`, overflowX: "auto" }}>
                {["info", "attendance", "leave", "salary", "job-history", "salary-change"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={tabButtonStyle(tab)}
                  >
                    {tab === "info" && "ℹ️ Info"}
                    {tab === "attendance" && "📍 Attendance"}
                    {tab === "leave" && "📅 Leave"}
                    {tab === "salary" && "💰 Salary"}
                    {tab === "job-history" && "👔 Job History"}
                    {tab === "salary-change" && "📈 Salary Changes"}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div style={{ padding: "20px" }}>
                {/* Info Tab */}
                {activeTab === "info" && employeeDetails && (
                  <div>
                    <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>Personal Info</h3>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Email:</label>
                        <p style={{ margin: 0, color: "#666" }}>{employeeDetails.email}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Phone:</label>
                        <p style={{ margin: 0, color: "#666" }}>{employeeDetails.phoneNumber || "Not set"}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Date of Birth:</label>
                        <p style={{ margin: 0, color: "#666" }}>{employeeDetails.dateOfBirth ? new Date(employeeDetails.dateOfBirth).toLocaleDateString('en') : "Not set"}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Gender:</label>
                        <p style={{ margin: 0, color: "#666" }}>{employeeDetails.gender || "Not set"}</p>
                      </div>
                    </div>

                    <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: "20px", marginTop: "20px" }}>
                      <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>👨‍👩‍👧‍👦 Dependents</h3>

                      {employeeDetails.dependents && employeeDetails.dependents.length > 0 ? (
                        <div>
                          <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#f0f8ff", borderRadius: "5px" }}>
                            <strong>Total: {employeeDetails.dependents.length} dependent(s)</strong>
                          </div>
                          
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                            {employeeDetails.dependents.map((dep, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: "12px",
                                  backgroundColor: "#f9f9f9",
                                  borderLeft: `3px solid ${theme.colors.secondary}`,
                                  borderRadius: "4px"
                                }}
                              >
                                <div style={{ fontWeight: "bold", marginBottom: "5px" }}>{dep.fullName}</div>
                                <div style={{ fontSize: "0.9em", color: "#666" }}>
                                  <div>Relationship: {dep.relationship}</div>
                                  <div>DOB: {dep.dateOfBirth ? new Date(dep.dateOfBirth).toLocaleDateString('en') : 'Not set'}</div>
                                  {dep.gender && <div>Gender: {dep.gender}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: "#999", fontStyle: "italic" }}>No dependents</p>
                      )}
                    </div>

                    <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: "20px", marginTop: "20px" }}>
                      <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>📜 Qualifications & Certificates</h3>

                      {employeeDetails.qualifications && employeeDetails.qualifications.length > 0 ? (
                        <div>
                          <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#f0f8ff", borderRadius: "5px" }}>
                            <strong>Total: {employeeDetails.qualifications.length} qualification(s)</strong>
                          </div>
                          
                          {/* Qualifications by type */}
                          {(() => {
                            const grouped = {};
                            employeeDetails.qualifications.forEach(q => {
                              if (!grouped[q.type]) grouped[q.type] = [];
                              grouped[q.type].push(q);
                            });
                            return Object.entries(grouped).map(([type, quals]) => (
                              <div key={type} style={{ marginBottom: "15px" }}>
                                <div style={{ 
                                  fontWeight: "bold", 
                                  color: theme.colors.primary,
                                  padding: "10px",
                                  backgroundColor: "#e7f3ff",
                                  borderRadius: "4px",
                                  marginBottom: "10px"
                                }}>
                                  {type === 'degree' && '🎓 Degree'}
                                  {type === 'certificate' && '🏅 Certificate'}
                                  {type === 'license' && '📋 License'}
                                  {type === 'training' && '📚 Training'}
                                  <span style={{ marginLeft: "10px", color: "#666", fontWeight: "normal" }}>({quals.length})</span>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                  {quals.map((qual, idx) => (
                                    <div
                                      key={idx}
                                      style={{
                                        padding: "12px",
                                        backgroundColor: "#f9f9f9",
                                        borderLeft: `3px solid ${theme.colors.secondary}`,
                                        borderRadius: "4px",
                                        fontSize: "0.95em"
                                      }}
                                    >
                                      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>{qual.name}</div>
                                      {qual.issuedBy && (
                                        <div style={{ color: "#666", fontSize: "0.9em" }}>Issued by: {qual.issuedBy}</div>
                                      )}
                                      {qual.issuedDate && (
                                        <div style={{ color: "#666", fontSize: "0.9em" }}>
                                          Issue date: {new Date(qual.issuedDate).toLocaleDateString('en')}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      ) : (
                        <p style={{ color: "#999", fontStyle: "italic" }}>No qualifications or certificates</p>
                      )}

                      {/* Qualifications Chart */}
                      {employeeDetails.qualifications && employeeDetails.qualifications.length > 0 && (
                        <div style={{ marginTop: "30px" }}>
                          <h4 style={{ marginBottom: "15px", color: theme.colors.primary }}>Qualifications by Type</h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                              data={(() => {
                                const typeCount = {};
                                employeeDetails.qualifications.forEach(q => {
                                  const type = q.type || 'Other';
                                  typeCount[type] = (typeCount[type] || 0) + 1;
                                });
                                return Object.entries(typeCount).map(([type, count]) => ({
                                  type: type === 'degree' ? 'Degree' : type === 'certificate' ? 'Certificate' : type === 'license' ? 'License' : type === 'training' ? 'Training' : type,
                                  count
                                }));
                              })()}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="type" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill="#8884d8" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px" }}>
                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Department:</label>
                        <p style={{ margin: 0, color: "#666" }}>{employeeDetails.department || "N/A"}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Job title:</label>
                        <p style={{ margin: 0, color: "#666" }}>{employeeDetails.jobTitle || "N/A"}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Salary Grade:</label>
                        <p style={{ margin: 0, color: "#666" }}>{employeeDetails.salaryGrade || "Not set"}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Base salary:</label>
                        <p style={{ margin: 0, color: "#666", fontWeight: "bold" }}>
                          ₫{employeeDetails.baseSalary?.toLocaleString("en-US") || "0"}
                        </p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Join Date:</label>
                        <p style={{ margin: 0, color: "#666" }}>{employeeDetails.joiningDate ? new Date(employeeDetails.joiningDate).toLocaleDateString("en-US") : "Not set"}</p>
                      </div>

                      <div>
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Status:</label>
                        <p
                          style={{
                            margin: 0,
                            display: "inline-block",
                            padding: "4px 12px",
                            borderRadius: "20px",
                            backgroundColor: employeeDetails.isActive ? "#d4edda" : "#f8d7da",
                            color: employeeDetails.isActive ? "#155724" : "#721c24"
                          }}
                        >
                          {employeeDetails.isActive ? "Active" : "Left"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === "attendance" && employeeDetails && (
                  <div>
                    <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>Attendance Stats</h3>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", marginBottom: "20px" }}>
                      <div
                        style={{
                          padding: "15px",
                          backgroundColor: "#e7f3ff",
                          borderRadius: "8px",
                          textAlign: "center",
                          borderLeft: `4px solid ${theme.colors.primary}`
                        }}
                      >
                        <div style={{ fontSize: "1.2em", fontWeight: "bold", color: theme.colors.primary }}>
                          {employeeDetails.attendanceStats?.totalDaysWorked || 0}
                        </div>
                        <div style={{ fontSize: "0.9em", color: "#666" }}>Days worked</div>
                      </div>

                      <div
                        style={{
                          padding: "15px",
                          backgroundColor: "#ffe7e7",
                          borderRadius: "8px",
                          textAlign: "center",
                          borderLeft: "4px solid #dc3545"
                        }}
                      >
                        <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#dc3545" }}>
                          {employeeDetails.attendanceStats?.totalLate || 0}
                        </div>
                        <div style={{ fontSize: "0.9em", color: "#666" }}>Late</div>
                      </div>

                      <div
                        style={{
                          padding: "15px",
                          backgroundColor: "#fff7e7",
                          borderRadius: "8px",
                          textAlign: "center",
                          borderLeft: "4px solid #ffc107"
                        }}
                      >
                        <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#ffc107" }}>
                          {employeeDetails.attendanceStats?.totalAbsent || 0}
                        </div>
                        <div style={{ fontSize: "0.9em", color: "#666" }}>Absent</div>
                      </div>

                      <div
                        style={{
                          padding: "15px",
                          backgroundColor: "#e7ffe7",
                          borderRadius: "8px",
                          textAlign: "center",
                          borderLeft: "4px solid #28a745"
                        }}
                      >
                        <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#28a745" }}>
                          {employeeDetails.attendanceStats?.totalEarlyLeave || 0}
                        </div>
                        <div style={{ fontSize: "0.9em", color: "#666" }}>Early leave</div>
                      </div>
                    </div>

                    {/* Attendance Status Chart */}
                    {employeeDetails.recentAttendance && employeeDetails.recentAttendance.length > 0 && (() => {
                      const statusCount = {};
                      employeeDetails.recentAttendance.forEach(record => {
                        const status = record.status || 'Unknown';
                        statusCount[status] = (statusCount[status] || 0) + 1;
                      });
                      const chartData = Object.entries(statusCount).map(([status, count]) => ({
                        name: status,
                        value: count
                      }));
                      const colors = ['#28a745', '#ffc107', '#dc3545', '#6c757d'];

                      return (
                        <div style={{ marginTop: "30px" }}>
                          <h4 style={{ marginBottom: "15px", color: theme.colors.primary }}>Attendance Status Distribution</h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}

                    {employeeDetails.recentAttendance && employeeDetails.recentAttendance.length > 0 && (
                      <div>
                        <h4 style={{ marginBottom: "10px" }}>Recent attendance:</h4>
                        <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead style={{ backgroundColor: "#f5f5f5" }}>
                              <tr>
                                <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>Date</th>
                                <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>Check-in</th>
                                <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>Check-out</th>
                                <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {employeeDetails.recentAttendance.map((record, idx) => (
                                <tr key={idx} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                  <td style={{ padding: "8px" }}>{record.date}</td>
                                  <td style={{ padding: "8px" }}>{record.checkIn || "-"}</td>
                                  <td style={{ padding: "8px" }}>{record.checkOut || "-"}</td>
                                  <td style={{ padding: "8px" }}>{record.status || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Leave Tab */}
                {activeTab === "leave" && employeeDetails && (
                  <div>
                    <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>Leave History</h3>

                    {(employeeDetails.leaveHistory && employeeDetails.leaveHistory.length > 0) ? (
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
                          <div
                            style={{
                              padding: "15px",
                              backgroundColor: "#e7f3ff",
                              borderRadius: "8px",
                              textAlign: "center"
                            }}
                          >
                            <div style={{ fontSize: "1.2em", fontWeight: "bold", color: theme.colors.primary }}>
                              {employeeDetails.leaveStats?.totalDaysUsed || 0}
                            </div>
                            <div style={{ fontSize: "0.9em", color: "#666" }}>Days used</div>
                          </div>

                          <div
                            style={{
                              padding: "15px",
                              backgroundColor: "#e7ffe7",
                              borderRadius: "8px",
                              textAlign: "center"
                            }}
                          >
                            <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#28a745" }}>
                              {employeeDetails.leaveStats?.totalDaysRemaining || 0}
                            </div>
                            <div style={{ fontSize: "0.9em", color: "#666" }}>Days remaining</div>
                          </div>
                        </div>

                        {/* Leave Types Chart */}
                        {(() => {
                          const typeCount = {};
                          employeeDetails.leaveHistory.forEach(leave => {
                            const type = leave.type || 'Other';
                            typeCount[type] = (typeCount[type] || 0) + 1;
                          });
                          const chartData = Object.entries(typeCount).map(([type, count]) => ({
                            name: type,
                            value: count
                          }));
                          const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

                          return (
                            <div style={{ marginTop: "30px" }}>
                              <h4 style={{ marginBottom: "15px", color: theme.colors.primary }}>Leave Types Distribution</h4>
                              <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                  <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                  >
                                    {chartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          );
                        })()}

                        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead style={{ backgroundColor: "#f5f5f5" }}>
                              <tr>
                                <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>Type</th>
                                <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>From</th>
                                <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>To</th>
                                <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {employeeDetails.leaveHistory.map((leave, idx) => (
                                <tr key={idx} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                  <td style={{ padding: "8px" }}>{leave.type}</td>
                                  <td style={{ padding: "8px" }}>{leave.startDate}</td>
                                  <td style={{ padding: "8px" }}>{leave.endDate}</td>
                                  <td style={{ padding: "8px" }}>
                                    <span
                                      style={{
                                        display: "inline-block",
                                        padding: "4px 8px",
                                        borderRadius: "4px",
                                        fontSize: "0.85em",
                                        backgroundColor:
                                          leave.status === "approved" ? "#d4edda" : leave.status === "rejected" ? "#f8d7da" : "#fff3cd",
                                        color:
                                          leave.status === "approved" ? "#155724" : leave.status === "rejected" ? "#721c24" : "#997404"
                                      }}
                                    >
                                      {leave.status === "approved"
                                        ? "Approved"
                                        : leave.status === "rejected"
                                        ? "Rejected"
                                        : "Pending"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: "#999", textAlign: "center", padding: "20px" }}>
                        No leave history
                      </p>
                    )}
                  </div>
                )}

            {/* Salary Tab */}
            {activeTab === "salary" && employeeDetails && (
              <div>
                <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>Salary History</h3>

                {employeeDetails.salaryHistory && employeeDetails.salaryHistory.length > 0 ? (
                  <div>
                    {/* Salary Trend Chart */}
                    <div style={{ marginBottom: "30px" }}>
                      <h4 style={{ marginBottom: "15px", color: theme.colors.primary }}>Salary Trend Over Time</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={employeeDetails.salaryHistory.map(salary => ({
                            period: `${salary.month}/${salary.year}`,
                            netPay: salary.finalSalary || 0,
                            baseSalary: salary.baseSalary || 0,
                            bonus: salary.bonus || 0
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`₫${value.toLocaleString("en-US")}`, '']} />
                          <Legend />
                          <Line type="monotone" dataKey="netPay" stroke="#8884d8" strokeWidth={2} name="Net Pay" />
                          <Line type="monotone" dataKey="baseSalary" stroke="#82ca9d" strokeWidth={2} name="Base Salary" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead style={{ backgroundColor: "#f5f5f5" }}>
                          <tr>
                            <th style={{ padding: "8px", textAlign: "left", borderBottom: `1px solid ${theme.colors.border}` }}>Month/Year</th>
                            <th style={{ padding: "8px", textAlign: "right", borderBottom: `1px solid ${theme.colors.border}` }}>Base Salary</th>
                            <th style={{ padding: "8px", textAlign: "right", borderBottom: `1px solid ${theme.colors.border}` }}>Bonus</th>
                            <th style={{ padding: "8px", textAlign: "right", borderBottom: `1px solid ${theme.colors.border}` }}>Advance Deduction</th>
                            <th style={{ padding: "8px", textAlign: "right", borderBottom: `1px solid ${theme.colors.border}` }}>Other Deductions</th>
                            <th style={{ padding: "8px", textAlign: "right", borderBottom: `1px solid ${theme.colors.border}` }}>Net Pay</th>
                            <th style={{ padding: "8px", textAlign: "center", borderBottom: `1px solid ${theme.colors.border}` }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeDetails.salaryHistory.map((salary, idx) => (
                            <tr key={idx} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                              <td style={{ padding: "8px" }}>{salary.month}/{salary.year}</td>
                              <td style={{ padding: "8px", textAlign: "right" }}>
                                ₫{salary.baseSalary?.toLocaleString("en-US") || "0"}
                              </td>
                              <td style={{ padding: "8px", textAlign: "right", color: "#28a745" }}>
                                +₫{(salary.bonus || 0).toLocaleString("en-US")}
                              </td>
                              <td style={{ padding: "8px", textAlign: "right", color: "#dc3545" }}>
                                -₫{(salary.advanceDeduction || 0).toLocaleString("en-US")}
                              </td>
                              <td style={{ padding: "8px", textAlign: "right", color: "#dc3545" }}>
                                -₫{((salary.deduction || 0) - (salary.advanceDeduction || 0)).toLocaleString("en-US")}
                              </td>
                              <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: theme.colors.primary }}>
                                ₫{salary.finalSalary?.toLocaleString("en-US") || "0"}
                              </td>
                              <td style={{ padding: "8px", textAlign: "center" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    fontSize: "0.85em",
                                    backgroundColor:
                                      salary.status === "paid" ? "#d4edda" : salary.status === "approved" ? "#cfe2ff" : "#fff3cd",
                                    color:
                                      salary.status === "paid" ? "#155724" : salary.status === "approved" ? "#084298" : "#997404"
                                  }}
                                >
                                  {salary.status === "paid"
                                    ? "Paid"
                                    : salary.status === "approved"
                                    ? "Approved"
                                    : "Pending"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: "#999", textAlign: "center", padding: "20px" }}>
                    No salary history
                  </p>
                )}
              </div>
            )}

            {activeTab === "job-history" && employeeDetails && (
              <div>
                <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>Job History</h3>
                <div style={historyCardStyle}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                    <input type="date" value={jobFilter.fromDate} onChange={(e) => { setJobFilter({ ...jobFilter, fromDate: e.target.value }); setJobPagination((p) => ({ ...p, page: 1 })); }} style={historyInputStyle} />
                    <input type="date" value={jobFilter.toDate} onChange={(e) => { setJobFilter({ ...jobFilter, toDate: e.target.value }); setJobPagination((p) => ({ ...p, page: 1 })); }} style={historyInputStyle} />
                    <select value={jobFilter.changeType} onChange={(e) => { setJobFilter({ ...jobFilter, changeType: e.target.value }); setJobPagination((p) => ({ ...p, page: 1 })); }} style={historyInputStyle}>
                      <option value="">All change types</option>
                      {historyTypes.job.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <button onClick={() => { setJobFilter({ fromDate: "", toDate: "", changeType: "" }); setJobPagination((p) => ({ ...p, page: 1 })); }} style={{ ...historyInputStyle, cursor: "pointer", backgroundColor: "#eef2ff" }}>Reset filter</button>
                  </div>
                {historyLoading && <p style={{ color: "#64748b" }}>Loading history...</p>}
                {!historyLoading && jobHistoryData.length > 0 ? (
                  <div style={{ maxHeight: "420px", overflowY: "auto", backgroundColor: "#fff", borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead style={{ backgroundColor: "#f5f5f5" }}>
                        <tr>
                          <th style={{ padding: "8px", textAlign: "left" }}>Effective Date</th>
                          <th style={{ padding: "8px", textAlign: "left" }}>Change Type</th>
                          <th style={{ padding: "8px", textAlign: "left" }}>Department</th>
                          <th style={{ padding: "8px", textAlign: "left" }}>Job Title</th>
                          <th style={{ padding: "8px", textAlign: "left" }}>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobHistoryData.map((item) => {
                          const badge = changeBadge(item.changeType);
                          return (
                          <tr key={item.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                            <td style={{ padding: "8px" }}>{item.effectiveDate || "-"}</td>
                            <td style={{ padding: "8px" }}><span style={{ background: badge.bg, color: badge.color, borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 600 }}>{item.changeType || "-"}</span></td>
                            <td style={{ padding: "8px" }}>{item.fromDepartmentName || "-"} → {item.toDepartmentName || "-"}</td>
                            <td style={{ padding: "8px" }}>{item.fromJobTitleName || "-"} → {item.toJobTitleName || "-"}</td>
                            <td style={{ padding: "8px" }}>{item.notes || "-"}</td>
                          </tr>
                        );})}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: "#999", textAlign: "center", padding: "20px" }}>No job history matching filters</p>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <button disabled={jobPagination.page <= 1} onClick={() => setJobPagination((p) => ({ ...p, page: p.page - 1 }))} style={{ ...historyInputStyle, cursor: jobPagination.page <= 1 ? "not-allowed" : "pointer" }}>Prev</button>
                  <span style={{ fontSize: 13, color: "#475569" }}>Page {jobPagination.page} / {jobPagination.totalPages || 1}</span>
                  <button disabled={jobPagination.page >= (jobPagination.totalPages || 1)} onClick={() => setJobPagination((p) => ({ ...p, page: p.page + 1 }))} style={{ ...historyInputStyle, cursor: jobPagination.page >= (jobPagination.totalPages || 1) ? "not-allowed" : "pointer" }}>Next</button>
                </div>
                </div>
              </div>
            )}

            {activeTab === "salary-change" && employeeDetails && (
              <div>
                <h3 style={{ color: theme.colors.primary, marginBottom: "15px" }}>Salary Change History</h3>
                <div style={historyCardStyle}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                    <input type="date" value={salaryChangeFilter.fromDate} onChange={(e) => { setSalaryChangeFilter({ ...salaryChangeFilter, fromDate: e.target.value }); setSalaryPagination((p) => ({ ...p, page: 1 })); }} style={historyInputStyle} />
                    <input type="date" value={salaryChangeFilter.toDate} onChange={(e) => { setSalaryChangeFilter({ ...salaryChangeFilter, toDate: e.target.value }); setSalaryPagination((p) => ({ ...p, page: 1 })); }} style={historyInputStyle} />
                    <select value={salaryChangeFilter.changeType} onChange={(e) => { setSalaryChangeFilter({ ...salaryChangeFilter, changeType: e.target.value }); setSalaryPagination((p) => ({ ...p, page: 1 })); }} style={historyInputStyle}>
                      <option value="">All change types</option>
                      {historyTypes.salary.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <button onClick={() => { setSalaryChangeFilter({ fromDate: "", toDate: "", changeType: "" }); setSalaryPagination((p) => ({ ...p, page: 1 })); }} style={{ ...historyInputStyle, cursor: "pointer", backgroundColor: "#eef2ff" }}>Reset filter</button>
                  </div>
                {historyLoading && <p style={{ color: "#64748b" }}>Loading history...</p>}
                {!historyLoading && salaryChangeData.length > 0 ? (
                  <div style={{ maxHeight: "420px", overflowY: "auto", backgroundColor: "#fff", borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead style={{ backgroundColor: "#f5f5f5" }}>
                        <tr>
                          <th style={{ padding: "8px", textAlign: "left" }}>Effective Date</th>
                          <th style={{ padding: "8px", textAlign: "left" }}>Change Type</th>
                          <th style={{ padding: "8px", textAlign: "left" }}>Base Salary</th>
                          <th style={{ padding: "8px", textAlign: "left" }}>Allowance</th>
                          <th style={{ padding: "8px", textAlign: "left" }}>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salaryChangeData.map((item) => {
                          const badge = changeBadge(item.changeType);
                          return (
                          <tr key={item.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                            <td style={{ padding: "8px" }}>{item.effectiveDate || "-"}</td>
                            <td style={{ padding: "8px" }}><span style={{ background: badge.bg, color: badge.color, borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 600 }}>{item.changeType || "-"}</span></td>
                            <td style={{ padding: "8px" }}>{Number(item.previousBaseSalary || 0).toLocaleString("en-US")} → {Number(item.newBaseSalary || 0).toLocaleString("en-US")}</td>
                            <td style={{ padding: "8px" }}>{Number(item.previousTotalAllowance || 0).toLocaleString("en-US")} → {Number(item.newTotalAllowance || 0).toLocaleString("en-US")}</td>
                            <td style={{ padding: "8px" }}>{item.reason || "-"}</td>
                          </tr>
                        );})}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: "#999", textAlign: "center", padding: "20px" }}>No salary change history matching filters</p>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <button disabled={salaryPagination.page <= 1} onClick={() => setSalaryPagination((p) => ({ ...p, page: p.page - 1 }))} style={{ ...historyInputStyle, cursor: salaryPagination.page <= 1 ? "not-allowed" : "pointer" }}>Prev</button>
                  <span style={{ fontSize: 13, color: "#475569" }}>Page {salaryPagination.page} / {salaryPagination.totalPages || 1}</span>
                  <button disabled={salaryPagination.page >= (salaryPagination.totalPages || 1)} onClick={() => setSalaryPagination((p) => ({ ...p, page: p.page + 1 }))} style={{ ...historyInputStyle, cursor: salaryPagination.page >= (salaryPagination.totalPages || 1) ? "not-allowed" : "pointer" }}>Next</button>
                </div>
                </div>
              </div>
            )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
