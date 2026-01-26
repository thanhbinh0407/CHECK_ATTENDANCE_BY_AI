import React from "react";

export default function EmployeeManagement() {
  return (
    <div style={{ padding: "20px" }}>
      <h2>🏢 Quản Lý Nhân Viên</h2>
      <p>Redirect sang AccountantClient</p>
      <a href="http://localhost:5174" target="_blank" rel="noopener noreferrer">
        <button style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
          Mở Hệ thống Quản lý Lương
        </button>
      </a>
    </div>
  );
}
