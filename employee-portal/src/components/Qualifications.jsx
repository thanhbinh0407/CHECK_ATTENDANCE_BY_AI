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
  const [messageType, setMessageType] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 3000);
  };

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
      showMessage("Only JPG, PNG or PDF files are allowed!", "error");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage("File size must not exceed 5MB!", "error");
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
      showMessage("Please select a document to upload!", "error");
      return;
    }

    try {
      setUploading(true);
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
        showMessage("Document uploaded successfully!", "success");
      } else {
        showMessage("Upload failed: " + (data.message || "Unable to upload file"), "error");
      }
    } catch (error) {
      showMessage("Error: " + error.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate document upload for new qualifications
    if (!editingId && !documentPath) {
      showMessage("Please upload a document before submitting!", "error");
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
        showMessage(data.message || "Submitted successfully! Awaiting approval.", "success");
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
        showMessage("Error: " + (data.message || "Unable to submit"), "error");
      }
    } catch (error) {
      showMessage("Error: " + error.message, "error");
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

  const handleDelete = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      const res = await fetch(`${apiBase}/api/qualifications/${deleteId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        showMessage("Qualification deleted successfully!", "success");
        await fetchQualifications();
      } else {
        showMessage("Failed to delete qualification", "error");
      }
    } catch (error) {
      showMessage("Error: " + error.message, "error");
      console.error("Error deleting qualification:", error);
    } finally {
      setShowDeleteConfirm(false);
      setDeleteId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': 
        return { bg: '#d4edda', color: '#155724', text: 'APPROVED' };
      case 'pending': 
        return { bg: '#fff3cd', color: '#856404', text: 'PENDING' };
      case 'rejected': 
        return { bg: '#f8d7da', color: '#721c24', text: 'REJECTED' };
      default: 
        return { bg: '#e2e3e5', color: '#383d41', text: status };
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      'certificate': 'Certificate',
      'degree': 'Degree',
      'license': 'License',
      'training': 'Training'
    };
    return labels[type] || type;
  };

  const stats = {
    total: qualifications.length,
    approved: qualifications.filter(q => q.approvalStatus === 'approved').length,
    pending: qualifications.filter(q => q.approvalStatus === 'pending').length,
    rejected: qualifications.filter(q => q.approvalStatus === 'rejected').length
  };

  return (
    <div style={{ padding: "32px", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      {/* Header Section */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "32px" 
      }}>
        <div>
          <h2 style={{ 
            fontSize: "28px", 
            fontWeight: "700", 
            color: "#1a1a1a", 
            marginBottom: "8px" 
          }}>
            Qualifications & Certifications
          </h2>
          <p style={{ 
            fontSize: "14px", 
            color: "#6c757d", 
            margin: 0 
          }}>
            Manage your professional qualifications and certifications
          </p>
        </div>
        
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: "12px 24px",
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 8px rgba(33, 150, 243, 0.3)",
              transition: "all 0.3s ease"
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#1976D2";
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 4px 12px rgba(33, 150, 243, 0.4)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "#2196F3";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 2px 8px rgba(33, 150, 243, 0.3)";
            }}
          >
            <span style={{ fontSize: "18px" }}>+</span>
            ADD QUALIFICATION
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
        gap: "24px", 
        marginBottom: "32px" 
      }}>
        {/* Total Qualifications */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "16px",
          padding: "28px 24px",
          color: "white",
          boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
          transition: "all 0.3s ease",
          cursor: "pointer"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(102, 126, 234, 0.4)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.3)";
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ 
                fontSize: "11px", 
                fontWeight: "600", 
                letterSpacing: "0.8px", 
                opacity: 0.9, 
                marginBottom: "12px",
                textTransform: "uppercase"
              }}>
                Total Qualifications
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", marginBottom: "4px" }}>
                {stats.total}
              </div>
              <div style={{ fontSize: "13px", opacity: 0.85 }}>
                All certifications
              </div>
            </div>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
          </div>
        </div>

        {/* Approved */}
        <div style={{
          background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
          borderRadius: "16px",
          padding: "28px 24px",
          color: "white",
          boxShadow: "0 4px 15px rgba(17, 153, 142, 0.3)",
          transition: "all 0.3s ease",
          cursor: "pointer"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(17, 153, 142, 0.4)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 15px rgba(17, 153, 142, 0.3)";
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ 
                fontSize: "11px", 
                fontWeight: "600", 
                letterSpacing: "0.8px", 
                opacity: 0.9, 
                marginBottom: "12px",
                textTransform: "uppercase"
              }}>
                Approved
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", marginBottom: "4px" }}>
                {stats.approved}
              </div>
              <div style={{ fontSize: "13px", opacity: 0.85 }}>
                Verified qualifications
              </div>
            </div>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div style={{
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          borderRadius: "16px",
          padding: "28px 24px",
          color: "white",
          boxShadow: "0 4px 15px rgba(240, 147, 251, 0.3)",
          transition: "all 0.3s ease",
          cursor: "pointer"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(240, 147, 251, 0.4)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 15px rgba(240, 147, 251, 0.3)";
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ 
                fontSize: "11px", 
                fontWeight: "600", 
                letterSpacing: "0.8px", 
                opacity: 0.9, 
                marginBottom: "12px",
                textTransform: "uppercase"
              }}>
                Pending
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", marginBottom: "4px" }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: "13px", opacity: 0.85 }}>
                Awaiting approval
              </div>
            </div>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
          </div>
        </div>

        {/* Rejected */}
        <div style={{
          background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
          borderRadius: "16px",
          padding: "28px 24px",
          color: "white",
          boxShadow: "0 4px 15px rgba(250, 112, 154, 0.3)",
          transition: "all 0.3s ease",
          cursor: "pointer"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(250, 112, 154, 0.4)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 15px rgba(250, 112, 154, 0.3)";
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ 
                fontSize: "11px", 
                fontWeight: "600", 
                letterSpacing: "0.8px", 
                opacity: 0.9, 
                marginBottom: "12px",
                textTransform: "uppercase"
              }}>
                Rejected
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", marginBottom: "4px" }}>
                {stats.rejected}
              </div>
              <div style={{ fontSize: "13px", opacity: 0.85 }}>
                Declined requests
              </div>
            </div>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: "20px",
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "32px",
            maxWidth: "600px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
          }}>
            <h3 style={{ 
              fontSize: "24px", 
              fontWeight: "700", 
              marginBottom: "24px",
              color: "#1a1a1a"
            }}>
              {editingId ? "Edit Qualification" : "Add New Qualification"}
            </h3>

            <form onSubmit={handleSubmit}>
              {/* Type */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ 
                  display: "block", 
                  fontSize: "13px", 
                  fontWeight: "600", 
                  color: "#495057", 
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Type <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <select 
                  name="type" 
                  value={formData.type} 
                  onChange={handleInputChange} 
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "14px",
                    transition: "all 0.3s ease",
                    backgroundColor: "white"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#2196F3"}
                  onBlur={(e) => e.target.style.borderColor = "#e9ecef"}
                >
                  <option value="certificate">Certificate</option>
                  <option value="degree">Degree</option>
                  <option value="license">License</option>
                  <option value="training">Training</option>
                </select>
              </div>

              {/* Name */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ 
                  display: "block", 
                  fontSize: "13px", 
                  fontWeight: "600", 
                  color: "#495057", 
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Name <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., ISO 9001 Certification"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "14px",
                    transition: "all 0.3s ease"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#2196F3"}
                  onBlur={(e) => e.target.style.borderColor = "#e9ecef"}
                />
              </div>

              {/* Issued By */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ 
                  display: "block", 
                  fontSize: "13px", 
                  fontWeight: "600", 
                  color: "#495057", 
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Issued By
                </label>
                <input
                  type="text"
                  name="issuedBy"
                  value={formData.issuedBy}
                  onChange={handleInputChange}
                  placeholder="e.g., Company, Institution"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "14px",
                    transition: "all 0.3s ease"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#2196F3"}
                  onBlur={(e) => e.target.style.borderColor = "#e9ecef"}
                />
              </div>

              {/* Dates */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 1fr", 
                gap: "16px", 
                marginBottom: "20px" 
              }}>
                <div>
                  <label style={{ 
                    display: "block", 
                    fontSize: "13px", 
                    fontWeight: "600", 
                    color: "#495057", 
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Issue Date
                  </label>
                  <input
                    type="date"
                    name="issuedDate"
                    value={formData.issuedDate}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e9ecef",
                      borderRadius: "8px",
                      fontSize: "14px",
                      transition: "all 0.3s ease"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#2196F3"}
                    onBlur={(e) => e.target.style.borderColor = "#e9ecef"}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: "block", 
                    fontSize: "13px", 
                    fontWeight: "600", 
                    color: "#495057", 
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e9ecef",
                      borderRadius: "8px",
                      fontSize: "14px",
                      transition: "all 0.3s ease"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#2196F3"}
                    onBlur={(e) => e.target.style.borderColor = "#e9ecef"}
                  />
                </div>
              </div>

              {/* Certificate Number */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ 
                  display: "block", 
                  fontSize: "13px", 
                  fontWeight: "600", 
                  color: "#495057", 
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Certificate Number
                </label>
                <input
                  type="text"
                  name="certificateNumber"
                  value={formData.certificateNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., CERT-2025-001"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "14px",
                    transition: "all 0.3s ease"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#2196F3"}
                  onBlur={(e) => e.target.style.borderColor = "#e9ecef"}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ 
                  display: "block", 
                  fontSize: "13px", 
                  fontWeight: "600", 
                  color: "#495057", 
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Additional notes or details..."
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "14px",
                    minHeight: "100px",
                    fontFamily: "inherit",
                    transition: "all 0.3s ease",
                    resize: "vertical"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#2196F3"}
                  onBlur={(e) => e.target.style.borderColor = "#e9ecef"}
                />
              </div>

              {/* Document Upload */}
              <div style={{ 
                marginBottom: "24px", 
                padding: "20px", 
                backgroundColor: "#fff3cd", 
                borderRadius: "12px", 
                border: "2px solid #ffc107" 
              }}>
                <label style={{ 
                  display: "block", 
                  fontWeight: "600", 
                  marginBottom: "12px", 
                  color: "#856404",
                  fontSize: "14px"
                }}>
                  📄 Document Scan <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <div style={{ 
                  fontSize: "12px", 
                  color: "#856404", 
                  marginBottom: "12px",
                  lineHeight: "1.5"
                }}>
                  Please upload a scan or PDF of your qualification (JPG, PNG, PDF - max 5MB)
                </div>
                
                {!documentPath && (
                  <div>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,application/pdf"
                      onChange={handleFileChange}
                      style={{ marginBottom: "12px" }}
                    />
                    {documentFile && (
                      <div style={{ marginTop: "12px" }}>
                        <button
                          type="button"
                          onClick={handleUploadDocument}
                          disabled={uploading}
                          style={{
                            padding: "10px 20px",
                            backgroundColor: uploading ? "#ccc" : "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: uploading ? "not-allowed" : "pointer",
                            fontWeight: "600",
                            fontSize: "13px",
                            transition: "all 0.3s ease"
                          }}
                        >
                          {uploading ? "⏳ Uploading..." : "📤 Upload Document"}
                        </button>
                        <span style={{ marginLeft: "12px", fontSize: "12px", color: "#495057" }}>
                          {documentFile.name} ({(documentFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {documentPreview && (
                  <div style={{ marginTop: "12px" }}>
                    <img
                      src={documentPreview}
                      alt="Preview"
                      style={{ 
                        maxWidth: "100%", 
                        maxHeight: "300px", 
                        border: "2px solid #dee2e6", 
                        borderRadius: "8px" 
                      }}
                    />
                  </div>
                )}

                {documentPath && (
                  <div style={{ 
                    marginTop: "12px", 
                    padding: "12px", 
                    backgroundColor: "#d4edda", 
                    borderRadius: "8px", 
                    border: "2px solid #28a745" 
                  }}>
                    <div style={{ 
                      color: "#155724", 
                      fontWeight: "600", 
                      marginBottom: "6px",
                      fontSize: "13px"
                    }}>
                      ✅ Upload successful!
                    </div>
                    <a
                      href={`${import.meta.env.VITE_API_BASE || "http://localhost:5000"}${documentPath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        color: "#007bff", 
                        textDecoration: "underline", 
                        fontSize: "12px" 
                      }}
                    >
                      View uploaded file
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
                          marginLeft: "12px",
                          padding: "4px 12px",
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "11px",
                          fontWeight: "600"
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Message */}
              {message && (
                <div style={{
                  padding: "12px 16px",
                  marginBottom: "20px",
                  backgroundColor: messageType === "success" ? "#d4edda" : "#f8d7da",
                  color: messageType === "success" ? "#155724" : "#721c24",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "500",
                  border: `2px solid ${messageType === "success" ? "#28a745" : "#dc3545"}`
                }}>
                  {message}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
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
                  }}
                  style={{ 
                    padding: "12px 24px", 
                    backgroundColor: "#6c757d", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "8px", 
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "all 0.3s ease"
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = "#5a6268"}
                  onMouseOut={(e) => e.target.style.backgroundColor = "#6c757d"}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!editingId && !documentPath}
                  style={{ 
                    padding: "12px 24px", 
                    backgroundColor: (!editingId && !documentPath) ? "#ccc" : "#2196F3", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "8px", 
                    cursor: (!editingId && !documentPath) ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                    boxShadow: (!editingId && !documentPath) ? "none" : "0 2px 8px rgba(33, 150, 243, 0.3)"
                  }}
                  onMouseOver={(e) => {
                    if (editingId || documentPath) {
                      e.target.style.backgroundColor = "#1976D2";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (editingId || documentPath) {
                      e.target.style.backgroundColor = "#2196F3";
                    }
                  }}
                >
                  {editingId ? "Update" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Qualifications List */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "16px",
        padding: "24px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
      }}>
        <h3 style={{ 
          fontSize: "18px", 
          fontWeight: "700", 
          marginBottom: "20px",
          color: "#1a1a1a"
        }}>
          Qualifications History
        </h3>

        {loading ? (
          <div style={{ 
            textAlign: "center", 
            padding: "40px", 
            color: "#6c757d" 
          }}>
            Loading...
          </div>
        ) : qualifications.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "40px", 
            color: "#6c757d" 
          }}>
            No qualifications added yet
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ 
              width: "100%", 
              borderCollapse: "separate",
              borderSpacing: "0"
            }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa" }}>
                  <th style={{ 
                    padding: "14px 16px", 
                    textAlign: "left",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#495057",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    borderBottom: "2px solid #dee2e6",
                    borderTopLeftRadius: "8px"
                  }}>
                    Type
                  </th>
                  <th style={{ 
                    padding: "14px 16px", 
                    textAlign: "left",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#495057",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    borderBottom: "2px solid #dee2e6"
                  }}>
                    Name
                  </th>
                  <th style={{ 
                    padding: "14px 16px", 
                    textAlign: "left",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#495057",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    borderBottom: "2px solid #dee2e6"
                  }}>
                    Issued By
                  </th>
                  <th style={{ 
                    padding: "14px 16px", 
                    textAlign: "left",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#495057",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    borderBottom: "2px solid #dee2e6"
                  }}>
                    Issue Date
                  </th>
                  <th style={{ 
                    padding: "14px 16px", 
                    textAlign: "left",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#495057",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    borderBottom: "2px solid #dee2e6"
                  }}>
                    Status
                  </th>
                  <th style={{ 
                    padding: "14px 16px", 
                    textAlign: "center",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#495057",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    borderBottom: "2px solid #dee2e6",
                    borderTopRightRadius: "8px"
                  }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {qualifications.map(qual => {
                  const statusStyle = getStatusBadge(qual.approvalStatus);
                  return (
                    <tr 
                      key={qual.id} 
                      style={{ 
                        backgroundColor: qual.isActive ? "white" : "#f8f9fa",
                        transition: "all 0.2s ease"
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "#f8f9fa";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = qual.isActive ? "white" : "#f8f9fa";
                      }}
                    >
                      <td style={{ 
                        padding: "16px", 
                        borderBottom: "1px solid #e9ecef",
                        fontSize: "13px",
                        color: "#495057",
                        fontWeight: "600"
                      }}>
                        {getTypeLabel(qual.type)}
                      </td>
                      <td style={{ 
                        padding: "16px", 
                        borderBottom: "1px solid #e9ecef",
                        fontSize: "14px",
                        color: "#212529",
                        fontWeight: "500"
                      }}>
                        {qual.name}
                      </td>
                      <td style={{ 
                        padding: "16px", 
                        borderBottom: "1px solid #e9ecef",
                        fontSize: "13px",
                        color: "#6c757d"
                      }}>
                        {qual.issuedBy || "-"}
                      </td>
                      <td style={{ 
                        padding: "16px", 
                        borderBottom: "1px solid #e9ecef",
                        fontSize: "13px",
                        color: "#6c757d"
                      }}>
                        {qual.issuedDate ? new Date(qual.issuedDate).toLocaleDateString("en-US") : "-"}
                      </td>
                      <td style={{ 
                        padding: "16px", 
                        borderBottom: "1px solid #e9ecef"
                      }}>
                        <span style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color,
                          fontSize: "11px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          display: "inline-block"
                        }}>
                          {statusStyle.text}
                        </span>
                        {qual.rejectionReason && (
                          <div style={{ 
                            fontSize: "11px", 
                            color: "#721c24", 
                            marginTop: "6px",
                            fontStyle: "italic"
                          }}>
                            Reason: {qual.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td style={{ 
                        padding: "16px", 
                        borderBottom: "1px solid #e9ecef",
                        textAlign: "center"
                      }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <button
                            onClick={() => handleEdit(qual)}
                            style={{ 
                              padding: "6px 14px", 
                              backgroundColor: "#FFC107", 
                              color: "white", 
                              border: "none", 
                              borderRadius: "6px", 
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600",
                              transition: "all 0.2s ease"
                            }}
                            onMouseOver={(e) => {
                              e.target.style.backgroundColor = "#FFB300";
                              e.target.style.transform = "translateY(-1px)";
                            }}
                            onMouseOut={(e) => {
                              e.target.style.backgroundColor = "#FFC107";
                              e.target.style.transform = "translateY(0)";
                            }}
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => {
                              setDeleteId(qual.id);
                              setShowDeleteConfirm(true);
                            }}
                            style={{ 
                              padding: "6px 14px", 
                              backgroundColor: "#dc3545", 
                              color: "white", 
                              border: "none", 
                              borderRadius: "6px", 
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600",
                              transition: "all 0.2s ease"
                            }}
                            onMouseOver={(e) => {
                              e.target.style.backgroundColor = "#c82333";
                              e.target.style.transform = "translateY(-1px)";
                            }}
                            onMouseOut={(e) => {
                              e.target.style.backgroundColor = "#dc3545";
                              e.target.style.transform = "translateY(0)";
                            }}
                          >
                            DELETE
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "32px",
            maxWidth: "440px",
            width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            textAlign: "center"
          }}>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "#fee",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px"
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>

            <h3 style={{ 
              fontSize: "22px", 
              fontWeight: "700", 
              marginBottom: "12px",
              color: "#1a1a1a"
            }}>
              Delete Qualification
            </h3>
            
            <p style={{ 
              fontSize: "14px", 
              color: "#6c757d", 
              marginBottom: "28px",
              lineHeight: "1.6"
            }}>
              Are you sure you want to delete this qualification? This action cannot be undone.
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteId(null);
                }}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  backgroundColor: "#f8f9fa",
                  color: "#495057",
                  border: "2px solid #dee2e6",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#e9ecef";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "#f8f9fa";
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#c82333";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "#dc3545";
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
