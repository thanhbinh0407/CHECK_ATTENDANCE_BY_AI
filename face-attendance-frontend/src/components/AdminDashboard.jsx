import React, { useEffect, useState } from "react";
import { exportEmployeesToExcel, exportEmployeesToPDF, importEmployeesFromExcel, downloadEmployeeTemplate } from "../utils/exportUtils.js";
import EmployeeProfileModal from "./EmployeeProfileModal.jsx";

export default function AdminDashboard() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, withFace, withoutFace
  const [savedFilters, setSavedFilters] = useState([]);
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchEmployees();
    // Load saved filters from localStorage
    const saved = localStorage.getItem("adminDashboardFilters");
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading saved filters:", e);
      }
    }
  }, []);

  // Apply search and filters
  useEffect(() => {
    let filtered = [...employees];

    // Apply search query (full-text search)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.name?.toLowerCase().includes(query) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.employeeCode?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus === "withFace") {
      filtered = filtered.filter(emp => emp.FaceProfiles && emp.FaceProfiles.length > 0);
    } else if (filterStatus === "withoutFace") {
      filtered = filtered.filter(emp => !emp.FaceProfiles || emp.FaceProfiles.length === 0);
    }

    setFilteredEmployees(filtered);
  }, [searchQuery, filterStatus, employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      if (!token || !token.trim()) {
        setMessage("Lỗi: Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
        // Redirect to login after 2 seconds
        setTimeout(() => {
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          window.location.reload();
        }, 2000);
        return;
      }

      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok) {
        const empList = data.employees || [];
        setEmployees(empList);
        setFilteredEmployees(empList);
        setMessage(""); // Clear any previous error messages
      } else {
        if (res.status === 401) {
          setMessage("Authentication error: Invalid or expired token. Please log in again.");
          // Clear invalid token and reload
          setTimeout(() => {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.reload();
          }, 2000);
        } else {
          setMessage("Lỗi tải danh sách nhân viên: " + (data.message || "Unknown error"));
        }
      }
    } catch (error) {
      setMessage("Error: " + error.message);
      console.error("Fetch employees error:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteEmployee = async (employeeId) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;

    try {
      const token = localStorage.getItem("authToken");

      if (!token || !token.trim()) {
        setMessage("Lỗi: Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
        setTimeout(() => {
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          window.location.reload();
        }, 2000);
        return;
      }

      const res = await fetch(`${apiBase}/api/admin/employees/${employeeId}`, {
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Xóa nhân viên thành công: " + data.deletedEmployee?.name);
        // Remove from UI immediately
        setEmployees(prev => prev.filter(e => e.id !== employeeId));
      } else {
        if (res.status === 401) {
          setMessage("Authentication error: Invalid or expired token. Please log in again.");
          setTimeout(() => {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.reload();
          }, 2000);
        } else {
          setMessage("Error deleting employee: " + (data.message || "Unknown error"));
          console.error("Delete error:", data);
        }
      }
    } catch (error) {
      setMessage("Error: " + error.message);
      console.error("Delete exception:", error);
    }
  };

  const containerStyle = {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "0"
  };

  const contentCardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "0 0 16px 16px",
    padding: "40px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.1)"
  };

  return (
    <div style={containerStyle}>
      {/* Welcome Header */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#fff",
        padding: "48px 40px",
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)"
      }}>
        <h1 style={{ margin: "0 0 12px 0", fontSize: "36px", fontWeight: "700" }}>
          👥 Employee Management
        </h1>
        <p style={{ margin: 0, fontSize: "16px", opacity: 0.95 }}>
          View, manage, and update information for all employees. Search, filter, and export employee data.
        </p>
      </div>

      {/* Main Content */}
      <div style={contentCardStyle}>
        {message && (
          <div style={{
            padding: "16px 20px",
            backgroundColor: message.includes("successfully") || message.includes("thành công") ? "#d4edda" : "#f8d7da",
            border: `2px solid ${message.includes("successfully") || message.includes("thành công") ? "#c3e6cb" : "#f5c6cb"}`,
            borderRadius: "12px",
            color: message.includes("successfully") || message.includes("thành công") ? "#155724" : "#721c24",
            marginBottom: "24px",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            {(message.includes("successfully") || message.includes("thành công")) ? "✅" : "❌"} {message}
          </div>
        )}

        {/* Filters - Leave Management style */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "16px",
          padding: "20px 24px",
          marginBottom: "32px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          border: "1px solid #e8e8e8",
          display: "inline-block",
          width: "100%"
        }}>
          <div style={{ 
            display: "flex", 
            gap: "20px", 
            alignItems: "center",
            flexWrap: "wrap"
          }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "12px",
              flex: "1",
              minWidth: "200px"
            }}>
              <label style={{ 
                fontWeight: "700", 
                fontSize: "15px", 
                color: "#495057",
                whiteSpace: "nowrap"
              }}>
                Search:
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, employee code..."
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "500",
                  transition: "all 0.2s",
                  outline: "none",
                  minWidth: "200px"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#667eea";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "12px"
            }}>
              <label style={{ 
                fontWeight: "700", 
                fontSize: "15px", 
                color: "#495057",
                whiteSpace: "nowrap"
              }}>
                Filter by Status:
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: "12px 20px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "500",
                  cursor: "pointer",
                  backgroundColor: "#fff",
                  transition: "all 0.2s",
                  outline: "none",
                  width: "auto",
                  minWidth: "180px"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#667eea";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <option value="all">All ({employees.length})</option>
                <option value="withFace">Face Registered ({employees.filter(e => e.FaceProfiles && e.FaceProfiles.length > 0).length})</option>
                <option value="withoutFace">Not Registered ({employees.filter(e => !e.FaceProfiles || e.FaceProfiles.length === 0).length})</option>
              </select>
            </div>
            <button
              onClick={() => { setSearchQuery(""); setFilterStatus("all"); }}
              style={{
                padding: "12px 20px",
                backgroundColor: "#6c757d",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "14px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#5a6268"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#6c757d"}
            >
              Reset
            </button>
          </div>

          {/* Export/Import Buttons */}
          <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #e8e8e8", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => exportEmployeesToExcel(filteredEmployees, `employees-${new Date().toISOString().split('T')[0]}`)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#218838"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#28a745"}
            >
              Export Excel
            </button>
            <button
              onClick={() => exportEmployeesToPDF(filteredEmployees, `employees-${new Date().toISOString().split('T')[0]}`)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#dc3545",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#c82333"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#dc3545"}
            >
              Export PDF
            </button>
            <button
              onClick={downloadEmployeeTemplate}
              style={{
                padding: "10px 20px",
                backgroundColor: "#17a2b8",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#138496"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#17a2b8"}
            >
              Download Template
            </button>
            <label
              style={{
                padding: "10px 20px",
                backgroundColor: "#ffc107",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e0a800"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#ffc107"}
            >
              Import from Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  try {
                    const employees = await importEmployeesFromExcel(file);
                    const token = localStorage.getItem("authToken");
                    
                    let successCount = 0;
                    let failCount = 0;
                    for (const emp of employees) {
                      try {
                        const res = await fetch(`${apiBase}/api/admin/employees/bulk`, {
                          method: "POST",
                          headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                          },
                          body: JSON.stringify(emp)
                        });
                        if (res.ok) successCount++;
                        else failCount++;
                      } catch (err) {
                        failCount++;
                      }
                    }
                    setMessage(`Import successful: ${successCount}/${employees.length} employees${failCount > 0 ? ` (${failCount} errors)` : ''}`);
                    fetchEmployees();
                    e.target.value = "";
                  } catch (error) {
                    setMessage("Import error: " + error.message);
                    e.target.value = "";
                  }
                }}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* Results Count */}
          <div style={{ marginTop: "16px", fontSize: "14px", color: "#666" }}>
            Showing <strong>{filteredEmployees.length}</strong> / {employees.length} employees
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#666" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
            <div style={{ fontSize: "16px", fontWeight: "500" }}>Loading employees...</div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "60px 40px",
            backgroundColor: "#f8f9fa",
            borderRadius: "16px",
            border: "2px dashed #dee2e6"
          }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>📭</div>
            <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
              {employees.length === 0 ? "No Employees" : "No Results"}
            </h3>
            <p style={{ fontSize: "14px", color: "#666" }}>
              {employees.length === 0 
                ? "No employees found. Start by registering new employees."
                : `No employees match the current filters. Try adjusting your search or filters.`
              }
            </p>
            {employees.length > 0 && (
              <button
                onClick={() => { setSearchQuery(""); setFilterStatus("all"); }}
                style={{
                  marginTop: "16px",
                  padding: "12px 24px",
                  backgroundColor: "#667eea",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#5a67d8"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#667eea"}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
        <>
          {/* Employee Cards Grid - Leave Management style */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
            gap: "28px"
          }}>
            {filteredEmployees.map((emp, index) => {
              const hasFace = emp.FaceProfiles && emp.FaceProfiles.length > 0;
              const statusStyle = hasFace
                ? { bg: "#d4edda", color: "#155724", text: "✅ Registered" }
                : { bg: "#fff3cd", color: "#856404", text: "⏳ Not Registered" };
              return (
                <div
                  key={emp.id}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "20px",
                    padding: "0",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                    border: "1px solid #e8e8e8",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative",
                    overflow: "hidden"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.15)";
                    e.currentTarget.style.borderColor = "#667eea";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)";
                    e.currentTarget.style.borderColor = "#e8e8e8";
                  }}
                >
                  <style>{`
                    @keyframes fadeInUp {
                      from { opacity: 0; transform: translateY(20px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                  `}</style>

                  {/* Status Badge */}
                  <div style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    padding: "8px 16px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    backgroundColor: statusStyle.bg,
                    color: statusStyle.color,
                    border: `2px solid ${statusStyle.color}20`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    zIndex: 10
                  }}>
                    {statusStyle.text}
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: "28px" }} onClick={() => setSelectedEmployee(emp)}>
                    {/* Employee Info */}
                    <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "16px",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "28px",
                        fontWeight: "700",
                        color: "#fff",
                        boxShadow: "0 6px 16px rgba(102, 126, 234, 0.4)",
                        flexShrink: 0
                      }}>
                        {emp.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: "0 0 6px 0", fontSize: "20px", fontWeight: "700", color: "#1a1a1a", lineHeight: "1.3" }}>
                          {emp.name || "N/A"}
                        </h3>
                        <div style={{ fontSize: "14px", color: "#667eea", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>👤</span> {emp.employeeCode || "N/A"}
                        </div>
                      </div>
                    </div>

                    {/* Details Box - Leave Management style */}
                    <div style={{
                      backgroundColor: "#f8f9fa",
                      borderRadius: "16px",
                      padding: "20px",
                      marginBottom: "24px",
                      border: "1px solid #e8e8e8"
                    }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div style={{ padding: "12px", backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e8e8e8" }}>
                          <div style={{ fontSize: "11px", color: "#999", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Email</div>
                          <div style={{ fontSize: "13px", color: "#1a1a1a", fontWeight: "600", wordBreak: "break-all" }}>{emp.email || "N/A"}</div>
                        </div>
                        <div style={{ padding: "12px", backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e8e8e8" }}>
                          <div style={{ fontSize: "11px", color: "#999", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Role</div>
                          <div style={{ fontSize: "14px", color: "#1a1a1a", fontWeight: "700" }}>{emp.role || "Employee"}</div>
                        </div>
                        <div style={{ gridColumn: "1 / -1", padding: "12px", backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e8e8e8" }}>
                          <div style={{ fontSize: "11px", color: "#999", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Created</div>
                          <div style={{ fontSize: "14px", color: "#667eea", fontWeight: "700" }}>
                            {new Date(emp.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedEmployee(emp); }}
                        style={{
                          flex: 1,
                          padding: "14px 24px",
                          backgroundColor: "#28a745",
                          color: "#fff",
                          border: "none",
                          borderRadius: "12px",
                          cursor: "pointer",
                          fontWeight: "700",
                          fontSize: "14px",
                          transition: "all 0.3s",
                          boxShadow: "0 4px 12px rgba(40, 167, 69, 0.3)"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#218838";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#28a745";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        Details
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteEmployee(emp.id); }}
                        style={{
                          flex: 1,
                          padding: "14px 24px",
                          backgroundColor: "#dc3545",
                          color: "#fff",
                          border: "none",
                          borderRadius: "12px",
                          cursor: "pointer",
                          fontWeight: "700",
                          fontSize: "14px",
                          transition: "all 0.3s",
                          boxShadow: "0 4px 12px rgba(220, 53, 69, 0.3)"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#c82333";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#dc3545";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

        {selectedEmployee && (
          <div style={{
            marginTop: "32px",
            padding: "32px",
            backgroundColor: "#fff",
            borderRadius: "12px",
            border: "2px solid #007bff",
            boxShadow: "0 4px 12px rgba(0,123,255,0.15)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "2px solid #e0e0e0" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "24px", fontWeight: "700", color: "#1a1a1a" }}>
                  Chi tiết nhân viên
                </h3>
                <p style={{ margin: 0, fontSize: "16px", color: "#666", fontWeight: "600" }}>
                  {selectedEmployee.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#6c757d",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#5a6268"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#6c757d"}
              >
                Đóng
              </button>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "24px",
              fontSize: "14px"
            }}>
              <div style={{ padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                <label style={{ display: "block", fontWeight: "700", color: "#495057", marginBottom: "8px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Tên đầy đủ
                </label>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1a1a1a" }}>{selectedEmployee.name}</p>
              </div>
              <div style={{ padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                <label style={{ display: "block", fontWeight: "700", color: "#495057", marginBottom: "8px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Email
                </label>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1a1a1a" }}>{selectedEmployee.email}</p>
              </div>
              <div style={{ padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                <label style={{ display: "block", fontWeight: "700", color: "#495057", marginBottom: "8px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Mã nhân viên
                </label>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#007bff" }}>{selectedEmployee.employeeCode}</p>
              </div>
              <div style={{ padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                <label style={{ display: "block", fontWeight: "700", color: "#495057", marginBottom: "8px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Vai trò
                </label>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1a1a1a" }}>
                  {selectedEmployee.role === "admin" ? "Quản lý" : "Nhân viên"}
                </p>
              </div>
              <div style={{ padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                <label style={{ display: "block", fontWeight: "700", color: "#495057", marginBottom: "8px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Ngày tạo
                </label>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1a1a1a" }}>
                  {new Date(selectedEmployee.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
              <div style={{ padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                <label style={{ display: "block", fontWeight: "700", color: "#495057", marginBottom: "8px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Trạng thái khuôn mặt
                </label>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
                  {selectedEmployee.FaceProfiles?.length > 0 ? (
                    <span style={{ color: "#28a745" }}>
                      Đã đăng ký ({selectedEmployee.FaceProfiles.length} profile)
                    </span>
                  ) : (
                    <span style={{ color: "#ffc107" }}>Chưa đăng ký</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
