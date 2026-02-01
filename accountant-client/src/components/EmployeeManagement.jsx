import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

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
        setEmployees(data.employees || []);
        setMessage("");
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setMessage("Lỗi khi tải danh sách nhân viên");
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = async (employee) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/admin/employees/${employee.id}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedEmployee(data.employee || {});
      }
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee({ ...employee });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/admin/employees/${editingEmployee.id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: editingEmployee.name,
          email: editingEmployee.email,
          phone: editingEmployee.phone,
          baseSalary: editingEmployee.baseSalary,
          startDate: editingEmployee.startDate
        })
      });

      if (res.ok) {
        setMessage("Cập nhật thông tin nhân viên thành công");
        setShowEditModal(false);
        fetchEmployees();
      } else {
        setMessage("Lỗi khi cập nhật");
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const containerStyle = {
    padding: "20px",
    backgroundColor: theme.colors.light,
    minHeight: "100vh"
  };

  const headerStyle = {
    color: theme.colors.primary,
    marginBottom: "20px",
    fontSize: "24px",
    fontWeight: "700"
  };

  const searchBoxStyle = {
    marginBottom: "20px",
    display: "flex",
    gap: "10px"
  };

  const searchInputStyle = {
    flex: 1,
    padding: "10px 15px",
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "5px",
    fontSize: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  };

  const tableContainerStyle = {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    overflow: "hidden"
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse"
  };

  const headerCellStyle = {
    padding: "15px",
    backgroundColor: theme.colors.primary,
    color: "white",
    fontWeight: "600",
    textAlign: "left",
    borderBottom: `2px solid ${theme.colors.border}`
  };

  const cellStyle = {
    padding: "12px 15px",
    borderBottom: `1px solid ${theme.colors.border}`,
    fontSize: "14px"
  };

  const rowStyle = {
    transition: "background-color 0.2s",
    cursor: "pointer"
  };

  const actionButtonStyle = {
    padding: "6px 12px",
    marginRight: "5px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    transition: "all 0.2s"
  };

  const editButtonStyle = {
    ...actionButtonStyle,
    backgroundColor: theme.colors.primary,
    color: "white"
  };

  const detailsButtonStyle = {
    ...actionButtonStyle,
    backgroundColor: "#17a2b8",
    color: "white"
  };

  const modalOverlayStyle = {
    display: showEditModal ? "flex" : "none",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  };

  const modalStyle = {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "30px",
    maxWidth: "500px",
    width: "90%",
    maxHeight: "80vh",
    overflowY: "auto",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
  };

  const formGroupStyle = {
    marginBottom: "15px"
  };

  const labelStyle = {
    display: "block",
    fontWeight: "600",
    marginBottom: "5px",
    color: theme.colors.primary
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "4px",
    fontSize: "14px",
    boxSizing: "border-box"
  };

  const buttonGroupStyle = {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
    justifyContent: "flex-end"
  };

  const cancelButtonStyle = {
    padding: "10px 20px",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "600"
  };

  const saveButtonStyle = {
    padding: "10px 20px",
    backgroundColor: theme.colors.primary,
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "600"
  };

  const detailsModalStyle = {
    ...modalStyle,
    maxWidth: "700px"
  };

  const detailSectionStyle = {
    marginBottom: "20px",
    paddingBottom: "15px",
    borderBottom: `1px solid ${theme.colors.border}`
  };

  const detailTitleStyle = {
    color: theme.colors.primary,
    fontWeight: "700",
    marginBottom: "10px",
    fontSize: "16px"
  };

  const detailItemStyle = {
    display: "grid",
    gridTemplateColumns: "150px 1fr",
    gap: "10px",
    marginBottom: "8px",
    fontSize: "14px"
  };

  const detailLabelStyle = {
    fontWeight: "600",
    color: "#666"
  };

  return (
    <div style={containerStyle}>
      <h1 style={headerStyle}>🏢 Quản Lý Nhân Viên</h1>

      {message && (
        <div
          style={{
            padding: "12px",
            marginBottom: "15px",
            backgroundColor: message.includes("Lỗi") ? "#f8d7da" : "#d4edda",
            color: message.includes("Lỗi") ? "#721c24" : "#155724",
            borderRadius: "5px",
            fontSize: "14px"
          }}
        >
          {message}
        </div>
      )}

      <div style={searchBoxStyle}>
        <input
          type="text"
          placeholder="Tìm kiếm theo tên hoặc mã nhân viên..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={searchInputStyle}
        />
        <button
          onClick={fetchEmployees}
          style={{
            padding: "10px 20px",
            backgroundColor: theme.colors.primary,
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          🔄 Làm Mới
        </button>
      </div>

      {loading && <div style={{ textAlign: "center", padding: "20px" }}>Đang tải...</div>}

      {!loading && filteredEmployees.length > 0 && (
        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={headerCellStyle}>Mã NV</th>
                <th style={headerCellStyle}>Họ Tên</th>
                <th style={headerCellStyle}>Phòng Ban</th>
                <th style={headerCellStyle}>Chức Vụ</th>
                <th style={headerCellStyle}>Ngày Vào</th>
                <th style={headerCellStyle}>Cấp Lương</th>
                <th style={headerCellStyle}>Lương CB</th>
                <th style={headerCellStyle}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} style={rowStyle}>
                  <td style={{...cellStyle, fontWeight: "bold"}}>{employee.employeeCode}</td>
                  <td style={{...cellStyle, fontWeight: "bold"}}>{employee.name}</td>
                  <td style={cellStyle}>{employee.Department?.name || "N/A"}</td>
                  <td style={cellStyle}>{employee.JobTitle?.name || "N/A"}</td>
                  <td style={cellStyle}>
                    {employee.startDate
                      ? new Date(employee.startDate).toLocaleDateString("vi-VN")
                      : "N/A"}
                  </td>
                  <td style={cellStyle}>{employee.SalaryGrade?.code || "N/A"}</td>
                  <td style={cellStyle}>
                    {employee.baseSalary
                      ? (employee.baseSalary / 1000000).toFixed(1) + "M₫"
                      : "N/A"}
                  </td>
                  <td style={cellStyle}>
                    <button
                      onClick={() => viewDetails(employee)}
                      style={detailsButtonStyle}
                      onMouseOver={(e) =>
                        (e.target.style.backgroundColor = "#138496")
                      }
                      onMouseOut={(e) =>
                        (e.target.style.backgroundColor = "#17a2b8")
                      }
                    >
                      Chi Tiết
                    </button>
                    <button
                      onClick={() => handleEdit(employee)}
                      style={editButtonStyle}
                      onMouseOver={(e) =>
                        (e.target.style.backgroundColor = "rgba(63, 82, 227, 0.9)")
                      }
                      onMouseOut={(e) =>
                        (e.target.style.backgroundColor = theme.colors.primary)
                      }
                    >
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filteredEmployees.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            backgroundColor: "white",
            borderRadius: "8px",
            color: "#999"
          }}
        >
          Không tìm thấy nhân viên nào
        </div>
      )}

      {/* Edit Modal */}
      <div style={modalOverlayStyle} onClick={() => setShowEditModal(false)}>
        <div
          style={modalStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 style={{ color: theme.colors.primary, marginBottom: "20px" }}>
            ✏️ Cập Nhật Thông Tin Nhân Viên
          </h2>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Họ Tên</label>
            <input
              type="text"
              style={inputStyle}
              value={editingEmployee?.name || ""}
              onChange={(e) =>
                setEditingEmployee({ ...editingEmployee, name: e.target.value })
              }
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              style={inputStyle}
              value={editingEmployee?.email || ""}
              onChange={(e) =>
                setEditingEmployee({ ...editingEmployee, email: e.target.value })
              }
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Số Điện Thoại</label>
            <input
              type="text"
              style={inputStyle}
              value={editingEmployee?.phone || ""}
              onChange={(e) =>
                setEditingEmployee({ ...editingEmployee, phone: e.target.value })
              }
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Lương Cơ Bản</label>
            <input
              type="number"
              style={inputStyle}
              value={editingEmployee?.baseSalary || 0}
              onChange={(e) =>
                setEditingEmployee({
                  ...editingEmployee,
                  baseSalary: parseFloat(e.target.value)
                })
              }
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Ngày Vào Làm</label>
            <input
              type="date"
              style={inputStyle}
              value={editingEmployee?.startDate
                ? editingEmployee.startDate.split("T")[0]
                : ""}
              onChange={(e) =>
                setEditingEmployee({
                  ...editingEmployee,
                  startDate: e.target.value
                })
              }
            />
          </div>

          <div style={buttonGroupStyle}>
            <button
              onClick={() => setShowEditModal(false)}
              style={cancelButtonStyle}
            >
              Hủy
            </button>
            <button
              onClick={handleSaveEdit}
              style={saveButtonStyle}
            >
              Lưu
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <div
        style={{
          ...modalOverlayStyle,
          display: selectedEmployee ? "flex" : "none"
        }}
        onClick={() => setSelectedEmployee(null)}
      >
        <div
          style={detailsModalStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 style={{ color: theme.colors.primary, marginBottom: "20px" }}>
            👤 Chi Tiết Nhân Viên: {selectedEmployee?.name}
          </h2>

          {/* Personal Info */}
          <div style={detailSectionStyle}>
            <div style={detailTitleStyle}>📋 Thông Tin Cá Nhân</div>
            <div style={detailItemStyle}>
              <div style={detailLabelStyle}>Mã NV:</div>
              <div>{selectedEmployee?.employeeCode}</div>
            </div>
            <div style={detailItemStyle}>
              <div style={detailLabelStyle}>Email:</div>
              <div>{selectedEmployee?.email}</div>
            </div>
            <div style={detailItemStyle}>
              <div style={detailLabelStyle}>Số điện thoại:</div>
              <div>{selectedEmployee?.phone || "N/A"}</div>
            </div>
            <div style={detailItemStyle}>
              <div style={detailLabelStyle}>Ngày sinh:</div>
              <div>
                {selectedEmployee?.dateOfBirth
                  ? new Date(selectedEmployee.dateOfBirth).toLocaleDateString(
                      "vi-VN"
                    )
                  : "N/A"}
              </div>
            </div>
            <div style={detailItemStyle}>
              <div style={detailLabelStyle}>Giới tính:</div>
              <div>{selectedEmployee?.gender || "N/A"}</div>
            </div>
          </div>

          {/* Job Info */}
          <div style={detailSectionStyle}>
            <div style={detailTitleStyle}>💼 Thông Tin Công Việc</div>
            <div style={detailItemStyle}>
              <div style={detailLabelStyle}>Phòng ban:</div>
              <div>{selectedEmployee?.Department?.name || "N/A"}</div>
            </div>
            <div style={detailItemStyle}>
              <div style={detailLabelStyle}>Chức vụ:</div>
              <div>{selectedEmployee?.JobTitle?.name || "N/A"}</div>
            </div>
            <div style={detailItemStyle}>
              <div style={detailLabelStyle}>Ngày vào:</div>
              <div>
                {selectedEmployee?.startDate
                  ? new Date(selectedEmployee.startDate).toLocaleDateString(
                      "vi-VN"
                    )
                  : "N/A"}
              </div>
            </div>
            <div style={detailItemStyle}>
              <div style={detailLabelStyle}>Cấp lương:</div>
              <div>{selectedEmployee?.SalaryGrade?.code || "N/A"}</div>
            </div>
            <div style={detailItemStyle}>
              <div style={detailLabelStyle}>Lương cơ bản:</div>
              <div>
                {selectedEmployee?.baseSalary
                  ? (selectedEmployee.baseSalary / 1000000).toFixed(1) + "M₫"
                  : "N/A"}
              </div>
            </div>
          </div>

          {/* Dependents */}
          {selectedEmployee?.dependents &&
            selectedEmployee.dependents.length > 0 && (
              <div style={detailSectionStyle}>
                <div style={detailTitleStyle}>👨‍👩‍👧‍👦 Người Phụ Thuộc ({selectedEmployee.dependents.length})</div>
                {selectedEmployee.dependents.map((dep, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "10px",
                      backgroundColor: "#f9f9f9",
                      borderLeft: `3px solid ${theme.colors.secondary}`,
                      borderRadius: "4px",
                      marginBottom: "8px"
                    }}
                  >
                    <div style={{ fontWeight: "600" }}>{dep.fullName}</div>
                    <div style={{ fontSize: "13px", color: "#666" }}>
                      Quan hệ: {dep.relationship}
                    </div>
                    <div style={{ fontSize: "13px", color: "#666" }}>
                      Ngày sinh:{" "}
                      {new Date(dep.dateOfBirth).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                ))}
              </div>
            )}

          {/* Qualifications */}
          {selectedEmployee?.qualifications &&
            selectedEmployee.qualifications.length > 0 && (
              <div style={detailSectionStyle}>
                <div style={detailTitleStyle}>📜 Bằng Cấp & Chứng Chỉ ({selectedEmployee.qualifications.length})</div>
                {selectedEmployee.qualifications.map((qual, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "10px",
                      backgroundColor: "#f9f9f9",
                      borderLeft: `3px solid ${theme.colors.secondary}`,
                      borderRadius: "4px",
                      marginBottom: "8px"
                    }}
                  >
                    <div style={{ fontWeight: "600" }}>{qual.name}</div>
                    <div style={{ fontSize: "13px", color: "#666" }}>
                      Loại: {qual.type}
                    </div>
                    <div style={{ fontSize: "13px", color: "#666" }}>
                      Cơ quan cấp: {qual.issuedBy}
                    </div>
                    <div style={{ fontSize: "13px", color: "#666" }}>
                      Ngày cấp:{" "}
                      {new Date(qual.issuedDate).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                ))}
              </div>
            )}

          <button
            onClick={() => setSelectedEmployee(null)}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "600",
              marginTop: "20px"
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
