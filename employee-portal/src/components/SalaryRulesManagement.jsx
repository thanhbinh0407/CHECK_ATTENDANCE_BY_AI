import React, { useState, useEffect } from "react";

export default function SalaryRulesManagement() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    type: "bonus",
    name: "",
    description: "",
    percentage: 0,
    amount: 0
  });

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/salary/rules`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error("Error fetching rules:", error);
      setMessage("Lỗi khi tải quy tắc");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const url = editingRule 
        ? `${apiBase}/api/salary/rules/${editingRule.id}`
        : `${apiBase}/api/salary/rules`;

      const method = editingRule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(editingRule ? "Cập nhật quy tắc thành công!" : "Tạo quy tắc thành công!");
        setEditingRule(null);
        setFormData({ type: "bonus", name: "", description: "", percentage: 0, amount: 0 });
        fetchRules();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Lỗi: " + (data.message || "Không thể lưu quy tắc"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ruleId) => {
    if (!confirm("Bạn chắc chắn muốn xóa quy tắc này?")) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/salary/rules/${ruleId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Xóa quy tắc thành công!");
        fetchRules();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Lỗi: " + (data.message || "Không thể xóa quy tắc"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      type: rule.type,
      name: rule.name,
      description: rule.description || "",
      percentage: rule.percentage || 0,
      amount: rule.amount || 0
    });
  };

  const handleCancel = () => {
    setEditingRule(null);
    setFormData({ type: "bonus", name: "", description: "", percentage: 0, amount: 0 });
  };

  const containerStyle = {
    padding: "20px",
    backgroundColor: "#f5f5f5",
    borderRadius: "8px",
    marginBottom: "20px"
  };

  const formStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "15px",
    padding: "20px",
    backgroundColor: "white",
    borderRadius: "8px",
    marginBottom: "20px",
    border: "1px solid #ddd"
  };

  const inputStyle = {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "5px",
    fontSize: "14px",
    fontFamily: "inherit"
  };

  const buttonStyle = {
    padding: "10px 20px",
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "600"
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px"
  };

  const thStyle = {
    backgroundColor: "#2196F3",
    color: "white",
    padding: "12px",
    textAlign: "left",
    fontWeight: "600"
  };

  const tdStyle = {
    padding: "12px",
    borderBottom: "1px solid #ddd"
  };

  const messageStyle = {
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "5px",
    backgroundColor: message.includes("Lỗi") ? "#fee" : "#efe",
    color: message.includes("Lỗi") ? "#c33" : "#3c3",
    fontWeight: "600"
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ color: "#2196F3", marginBottom: "20px" }}>
        ⚙️ Quản Lý Quy Tắc Tính Lương
      </h2>

      {message && <div style={messageStyle}>{message}</div>}

      <div style={formStyle}>
        <div style={{ gridColumn: "1 / -1" }}>
          <h3 style={{ marginTop: 0, color: "#2196F3" }}>
            {editingRule ? "Sửa Quy Tắc" : "Tạo Quy Tắc Mới"}
          </h3>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>
            Loại Quy Tắc
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            style={inputStyle}
          >
            <option value="bonus">Phụ cấp/Thưởng</option>
            <option value="deduction">Khoản khấu trừ</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>
            Tên Quy Tắc
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="VD: Phụ cấp ăn trưa"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>
            Mô Tả
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Mô tả quy tắc"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>
            Phần Trăm (%)
          </label>
          <input
            type="number"
            value={formData.percentage}
            onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            style={inputStyle}
            step="0.01"
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>
            Số Tiền Cố Định (VND)
          </label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            style={inputStyle}
            step="1000"
          />
        </div>

        <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px" }}>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.name}
            style={{ ...buttonStyle, opacity: loading || !formData.name ? 0.6 : 1 }}
          >
            {editingRule ? "Cập Nhật" : "Tạo Mới"}
          </button>
          {editingRule && (
            <button
              onClick={handleCancel}
              style={{ ...buttonStyle, backgroundColor: "#999" }}
            >
              Hủy
            </button>
          )}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Loại</th>
              <th style={thStyle}>Tên Quy Tắc</th>
              <th style={thStyle}>Mô Tả</th>
              <th style={thStyle}>%</th>
              <th style={thStyle}>Số Tiền (VND)</th>
              <th style={thStyle}>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ ...tdStyle, textAlign: "center", color: "#999" }}>
                  Chưa có quy tắc nào
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id}>
                  <td style={tdStyle}>
                    {rule.type === "bonus" ? "🎁 Phụ cấp" : "📉 Khấu trừ"}
                  </td>
                  <td style={tdStyle}>{rule.name}</td>
                  <td style={tdStyle}>{rule.description || "-"}</td>
                  <td style={tdStyle}>{rule.percentage}%</td>
                  <td style={tdStyle}>{rule.amount?.toLocaleString("vi-VN") || "-"}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleEdit(rule)}
                      style={{
                        padding: "5px 10px",
                        marginRight: "5px",
                        backgroundColor: "#2196F3",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      style={{
                        padding: "5px 10px",
                        backgroundColor: "#c33",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
