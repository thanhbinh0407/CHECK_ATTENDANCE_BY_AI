import React, { useState, useEffect } from "react";

export default function Qualifications({ userId }) {
  const [qualifications, setQualifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "certificate",
    name: "",
    issuedBy: "",
    issuedDate: "",
    expiryDate: "",
    certificateNumber: "",
    description: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [documentPath, setDocumentPath] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchQualifications();
  }, [userId]);

  const fetchQualifications = async () => {
    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      if (!token) return;

      const res = await fetch(`${apiBase}/api/qualifications/my`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok) {
        setQualifications(data.qualifications || []);
      }
    } catch (error) {
      console.error("Error fetching qualifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setMessage("Chỉ chấp nhận file ảnh (JPG, PNG) hoặc PDF!");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage("File không được vượt quá 5MB!");
      return;
    }

    setDocumentFile(file);
    setMessage("");

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setDocumentPreview(null);
    }
  };

  const handleUploadDocument = async () => {
    if (!documentFile) {
      setMessage("Vui lòng chọn file ảnh scan của chứng chỉ/bằng cấp!");
      return;
    }

    try {
      setUploading(true);
      setMessage("");
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      const formData = new FormData();
      formData.append('document', documentFile);

      const res = await fetch(`${apiBase}/api/qualifications/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setDocumentPath(data.documentPath);
        setMessage("✅ Upload ảnh scan thành công!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Lỗi upload: " + (data.message || "Không thể upload file"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate document upload for new qualifications
    if (!editingId && !documentPath) {
      setMessage("⚠️ Vui lòng upload ảnh scan của chứng chỉ/bằng cấp trước khi gửi đơn!");
      return;
    }

    try {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      const payload = {
        userId,
        ...formData,
        documentPath: documentPath || formData.documentPath
      };

      const url = editingId 
        ? `${apiBase}/api/qualifications/${editingId}`
        : `${apiBase}/api/qualifications`;

      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ " + (data.message || "Gửi đơn thành công! Đang chờ admin duyệt."));
        await fetchQualifications();
        setTimeout(() => {
          setShowForm(false);
          setEditingId(null);
          setFormData({
            type: "certificate",
            name: "",
            issuedBy: "",
            issuedDate: "",
            expiryDate: "",
            certificateNumber: "",
            description: ""
          });
          setDocumentFile(null);
          setDocumentPreview(null);
          setDocumentPath(null);
          setMessage("");
        }, 2000);
      } else {
        setMessage("Lỗi: " + (data.message || "Không thể gửi đơn"));
      }
    } catch (error) {
      setMessage("Lỗi: " + error.message);
      console.error("Error saving qualification:", error);
    }
  };

  const handleEdit = (qual) => {
    setEditingId(qual.id);
    setFormData({
      type: qual.type,
      name: qual.name,
      issuedBy: qual.issuedBy || "",
      issuedDate: qual.issuedDate ? qual.issuedDate.split("T")[0] : "",
      expiryDate: qual.expiryDate ? qual.expiryDate.split("T")[0] : "",
      certificateNumber: qual.certificateNumber || "",
      description: qual.description || "",
      documentPath: qual.documentPath || ""
    });
    setDocumentPath(qual.documentPath || null);
    setDocumentFile(null);
    setDocumentPreview(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Xóa chứng chỉ này?")) return;

    try {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      const res = await fetch(`${apiBase}/api/qualifications/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        await fetchQualifications();
      }
    } catch (error) {
      console.error("Error deleting qualification:", error);
    }
  };

  return (
    <div style={{ padding: "20px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
      <h3>📜 Chứng chỉ và Bằng cấp</h3>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: "8px 16px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginBottom: "15px"
          }}
        >
          + Thêm chứng chỉ
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ backgroundColor: "white", padding: "15px", borderRadius: "8px", marginBottom: "15px" }}>
          <div style={{ marginBottom: "10px" }}>
            <label>Loại: </label>
            <select name="type" value={formData.type} onChange={handleInputChange} required>
              <option value="certificate">Chứng chỉ</option>
              <option value="degree">Bằng cấp</option>
              <option value="license">Giấy phép</option>
              <option value="training">Đào tạo</option>
            </select>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label>Tên: </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label>Cơ quan cấp: </label>
            <input
              type="text"
              name="issuedBy"
              value={formData.issuedBy}
              onChange={handleInputChange}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div>
              <label>Ngày cấp: </label>
              <input
                type="date"
                name="issuedDate"
                value={formData.issuedDate}
                onChange={handleInputChange}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <div>
              <label>Ngày hết hạn: </label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label>Số chứng chỉ: </label>
            <input
              type="text"
              name="certificateNumber"
              value={formData.certificateNumber}
              onChange={handleInputChange}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Ghi chú: </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              style={{ width: "100%", padding: "8px", minHeight: "80px" }}
            />
          </div>

          {/* File Upload Section */}
          <div style={{ marginBottom: "15px", padding: "15px", backgroundColor: "#fff3cd", borderRadius: "8px", border: "2px solid #ffc107" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "10px", color: "#856404" }}>
              📄 Ảnh scan chứng chỉ/bằng cấp <span style={{ color: "red" }}>*</span>
            </label>
            <div style={{ fontSize: "12px", color: "#856404", marginBottom: "10px" }}>
              Vui lòng upload ảnh scan hoặc file PDF của chứng chỉ/bằng cấp (JPG, PNG, PDF - tối đa 5MB)
            </div>
            
            {!documentPath && (
              <div style={{ marginBottom: "10px" }}>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={handleFileChange}
                  style={{ marginBottom: "10px" }}
                />
                {documentFile && (
                  <div>
                    <button
                      type="button"
                      onClick={handleUploadDocument}
                      disabled={uploading}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: uploading ? "#ccc" : "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: uploading ? "not-allowed" : "pointer",
                        fontWeight: "600"
                      }}
                    >
                      {uploading ? "⏳ Đang upload..." : "📤 Upload ảnh"}
                    </button>
                    <span style={{ marginLeft: "10px", fontSize: "12px" }}>
                      {documentFile.name} ({(documentFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>
            )}

            {documentPreview && (
              <div style={{ marginTop: "10px" }}>
                <img
                  src={documentPreview}
                  alt="Preview"
                  style={{ maxWidth: "300px", maxHeight: "300px", border: "1px solid #ddd", borderRadius: "4px" }}
                />
              </div>
            )}

            {documentPath && (
              <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#d4edda", borderRadius: "4px", border: "1px solid #28a745" }}>
                <div style={{ color: "#155724", fontWeight: "600", marginBottom: "5px" }}>
                  ✅ Đã upload thành công!
                </div>
                <a
                  href={`${import.meta.env.VITE_API_BASE || "http://localhost:5000"}${documentPath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#007bff", textDecoration: "underline", fontSize: "12px" }}
                >
                  Xem file đã upload
                </a>
                {!editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentFile(null);
                      setDocumentPreview(null);
                      setDocumentPath(null);
                    }}
                    style={{
                      marginLeft: "10px",
                      padding: "4px 8px",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontSize: "11px"
                    }}
                  >
                    Xóa
                  </button>
                )}
              </div>
            )}
          </div>

          {message && (
            <div style={{
              padding: "10px",
              marginBottom: "15px",
              backgroundColor: message.includes("✅") || message.includes("thành công") ? "#d4edda" : "#f8d7da",
              color: message.includes("✅") || message.includes("thành công") ? "#155724" : "#721c24",
              borderRadius: "4px",
              fontSize: "13px"
            }}>
              {message}
            </div>
          )}

          <div>
            <button 
              type="submit" 
              disabled={!editingId && !documentPath}
              style={{ 
                padding: "8px 16px", 
                backgroundColor: (!editingId && !documentPath) ? "#ccc" : "#2196F3", 
                color: "white", 
                border: "none", 
                borderRadius: "4px", 
                cursor: (!editingId && !documentPath) ? "not-allowed" : "pointer" 
              }}
            >
              {editingId ? "Cập nhật" : "📤 Gửi đơn"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({ type: "certificate", name: "", issuedBy: "", issuedDate: "", expiryDate: "", certificateNumber: "", description: "" });
                setDocumentFile(null);
                setDocumentPreview(null);
                setDocumentPath(null);
                setMessage("");
              }}
              style={{ padding: "8px 16px", backgroundColor: "#666", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginLeft: "10px" }}
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div>
          {qualifications.length === 0 ? (
            <p style={{ color: "#666" }}>Chưa có chứng chỉ</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#e0e0e0" }}>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Loại</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Tên</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Cơ quan cấp</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Ngày cấp</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Trạng thái</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {qualifications.map(qual => {
                  const getStatusColor = (status) => {
                    switch(status) {
                      case 'approved': return { bg: '#d4edda', color: '#155724', text: '✅ Đã duyệt' };
                      case 'pending': return { bg: '#fff3cd', color: '#856404', text: '⏳ Chờ duyệt' };
                      case 'rejected': return { bg: '#f8d7da', color: '#721c24', text: '❌ Từ chối' };
                      default: return { bg: '#e2e3e5', color: '#383d41', text: status };
                    }
                  };
                  const statusStyle = getStatusColor(qual.approvalStatus);
                  return (
                    <tr key={qual.id} style={{ backgroundColor: qual.isActive ? "white" : "#f5f5f5" }}>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>{qual.type}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>{qual.name}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>{qual.issuedBy || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                        {qual.issuedDate ? new Date(qual.issuedDate).toLocaleDateString("vi-VN") : "-"}
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                        <span style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color,
                          fontSize: "12px",
                          fontWeight: "600"
                        }}>
                          {statusStyle.text}
                        </span>
                        {qual.rejectionReason && (
                          <div style={{ fontSize: "11px", color: "#721c24", marginTop: "4px" }}>
                            Lý do: {qual.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                        {qual.approvalStatus === 'pending' ? (
                          <span style={{ fontSize: "12px", color: "#666" }}>Đang chờ duyệt</span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(qual)}
                              style={{ padding: "4px 8px", backgroundColor: "#FFC107", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", marginRight: "5px" }}
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDelete(qual.id)}
                              style={{ padding: "4px 8px", backgroundColor: "#f44336", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}
                            >
                              Xóa
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
