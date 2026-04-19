import React, { useState, useEffect, useRef } from "react";

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

  // Use local date (not UTC) to correctly reflect the user's timezone (e.g. UTC+7 Vietnam)
  const getLocalToday = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  // Recalculated on every render — always reflects real-time current date
  const today = getLocalToday();
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Per-type expiry config
  const expiryConfig = {
    degree:      { required: false, hidden: true,  hint: "Degrees do not expire — leave blank." },
    certificate: { required: false, hidden: false, hint: "e.g. IELTS/TOEFL: 2 yrs · IT/Marketing certs: 1–3 yrs · Office skills: no expiry" },
    license:     { required: true,  hidden: false, hint: "Check the expiry date printed directly on your license/ID card." },
    training:    { required: false, hidden: false, hint: "Leave blank unless this is a safety/fire training course (typically 1–2 yrs)." },
  };
  const currentExpiry = expiryConfig[formData.type] || expiryConfig.certificate;

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    // Use substring to avoid timezone shift: take the YYYY-MM-DD part directly
    const ymd = dateStr.substring(0, 10); // "YYYY-MM-DD"
    const [y, m, d] = ymd.split("-");
    return `${d}/${m}/${y}`; // DD/MM/YYYY
  };

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
    // When switching to Degree, clear expiry date automatically
    if (name === "type" && value === "degree") {
      setFormData(prev => ({ ...prev, type: value, expiryDate: "" }));
      return;
    }
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

    // Validate date logic
    if (!formData.issuedDate) {
      showMessage("Issue Date is required!", "error");
      return;
    }
    if (formData.issuedDate && formData.issuedDate > today) {
      showMessage("Issue Date cannot be in the future!", "error");
      return;
    }
    if (formData.expiryDate && formData.expiryDate <= today) {
      showMessage("Expiry Date must be in the future (after today)!", "error");
      return;
    }
    if (formData.issuedDate && formData.expiryDate && formData.expiryDate <= formData.issuedDate) {
      showMessage("Expiry Date must be strictly after Issue Date!", "error");
      return;
    }
    if (currentExpiry.required && !formData.expiryDate) {
      showMessage("Expiry Date is required for License — please check your license card.", "error");
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
        // Close the create/edit form immediately so the user sees the
        // refreshed list and the audit log on the admin side stays in sync.
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
        await fetchQualifications();
        showMessage(data.message || "Submitted successfully! Awaiting approval.", "success");
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
    setMessage("");
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
    rejected: qualifications.filter(q => q.approvalStatus === 'rejected').length,
    expiringSoon: qualifications.filter(q => {
      if (!q.expiryDate) return false;
      const exp = new Date(q.expiryDate);
      const now = new Date();
      const days = (exp - now) / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 60;
    }).length
  };

  return (
    <div style={{
      backgroundColor: "#f8f9fa",
      minHeight: "100vh",
      padding: "24px"
    }}>
      {/* Header Section */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "16px",
        padding: "24px 32px",
        marginBottom: "24px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}>
          <div>
            <h2 style={{
              margin: "0 0 8px 0",
              fontSize: "28px",
              fontWeight: "700",
              color: "#1a1a1a"
            }}>
              Qualifications & Certifications
            </h2>
            <p style={{
              margin: 0,
              color: "#666",
              fontSize: "14px"
            }}>
              Manage your professional qualifications and certifications
            </p>
          </div>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                padding: "12px 24px",
                backgroundColor: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "14px",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                transition: "all 0.2s",
                boxShadow: "0 2px 8px rgba(25,118,210,0.3)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#1565c0";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(25,118,210,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#1976d2";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(25,118,210,0.3)";
              }}
            >
              + Add Qualification
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards - matching Leave Request design */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "24px",
        marginBottom: "32px"
      }}>
        {/* Total Qualifications */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "16px",
          padding: "28px 24px",
          boxShadow: "0 8px 24px rgba(102, 126, 234, 0.25)",
          position: "relative",
          overflow: "hidden",
          transition: "all 0.3s ease",
          cursor: "pointer"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.35)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.25)";
        }}>
          <div style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            width: "100px",
            height: "100px",
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: "50%"
          }}></div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "16px"
          }}>
            <div style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "rgba(255,255,255,0.9)",
              textTransform: "uppercase",
              letterSpacing: "1px"
            }}>
              Total Qualifications
            </div>
            <div style={{
              width: "48px",
              height: "48px",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
          </div>

          <div style={{
            fontSize: "40px",
            fontWeight: "800",
            color: "#fff",
            lineHeight: "1",
            marginBottom: "4px"
          }}>
            {stats.total}
          </div>

          <div style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.8)",
            fontWeight: "500"
          }}>
            All certifications
          </div>
        </div>

        {/* Pending */}
        <div style={{
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          borderRadius: "16px",
          padding: "28px 24px",
          boxShadow: "0 8px 24px rgba(240, 147, 251, 0.25)",
          position: "relative",
          overflow: "hidden",
          transition: "all 0.3s ease",
          cursor: "pointer"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 32px rgba(240, 147, 251, 0.35)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(240, 147, 251, 0.25)";
        }}>
          <div style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            width: "100px",
            height: "100px",
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: "50%"
          }}></div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "16px"
          }}>
            <div style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "rgba(255,255,255,0.9)",
              textTransform: "uppercase",
              letterSpacing: "1px"
            }}>
              Pending
            </div>
            <div style={{
              width: "48px",
              height: "48px",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
          </div>

          <div style={{
            fontSize: "40px",
            fontWeight: "800",
            color: "#fff",
            lineHeight: "1",
            marginBottom: "4px"
          }}>
            {stats.pending}
          </div>

          <div style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.8)",
            fontWeight: "500"
          }}>
            Awaiting approval
          </div>
        </div>

        {/* Approved */}
        <div style={{
          background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          borderRadius: "16px",
          padding: "28px 24px",
          boxShadow: "0 8px 24px rgba(79, 172, 254, 0.25)",
          position: "relative",
          overflow: "hidden",
          transition: "all 0.3s ease",
          cursor: "pointer"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 32px rgba(79, 172, 254, 0.35)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(79, 172, 254, 0.25)";
        }}>
          <div style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            width: "100px",
            height: "100px",
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: "50%"
          }}></div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "16px"
          }}>
            <div style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "rgba(255,255,255,0.9)",
              textTransform: "uppercase",
              letterSpacing: "1px"
            }}>
              Approved
            </div>
            <div style={{
              width: "48px",
              height: "48px",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>

          <div style={{
            fontSize: "40px",
            fontWeight: "800",
            color: "#fff",
            lineHeight: "1",
            marginBottom: "4px"
          }}>
            {stats.approved}
          </div>

          <div style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.8)",
            fontWeight: "500"
          }}>
            Verified qualifications
          </div>
        </div>

        {/* Rejected */}
        <div style={{
          background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
          borderRadius: "16px",
          padding: "28px 24px",
          boxShadow: "0 8px 24px rgba(250, 112, 154, 0.25)",
          position: "relative",
          overflow: "hidden",
          transition: "all 0.3s ease",
          cursor: "pointer"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 32px rgba(250, 112, 154, 0.35)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(250, 112, 154, 0.25)";
        }}>
          <div style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            width: "100px",
            height: "100px",
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: "50%"
          }}></div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "16px"
          }}>
            <div style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "rgba(255,255,255,0.9)",
              textTransform: "uppercase",
              letterSpacing: "1px"
            }}>
              Rejected
            </div>
            <div style={{
              width: "48px",
              height: "48px",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
          </div>

          <div style={{
            fontSize: "40px",
            fontWeight: "800",
            color: "#fff",
            lineHeight: "1",
            marginBottom: "4px"
          }}>
            {stats.rejected}
          </div>

          <div style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.8)",
            fontWeight: "500"
          }}>
            Declined requests
          </div>
        </div>

        {/* Expiring Soon */}
        <div style={{
          background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
          borderRadius: "16px",
          padding: "28px 24px",
          boxShadow: "0 8px 24px rgba(168, 237, 234, 0.25)",
          position: "relative",
          overflow: "hidden",
          transition: "all 0.3s ease",
          cursor: "pointer"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 32px rgba(168, 237, 234, 0.35)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(168, 237, 234, 0.25)";
        }}>
          <div style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            width: "100px",
            height: "100px",
            backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius: "50%"
          }}></div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "16px"
          }}>
            <div style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "#2c3e50",
              textTransform: "uppercase",
              letterSpacing: "1px"
            }}>
              Expiring Soon
            </div>
            <div style={{
              width: "48px",
              height: "48px",
              backgroundColor: "rgba(255,255,255,0.5)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2c3e50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
          </div>

          <div style={{
            fontSize: "40px",
            fontWeight: "800",
            color: "#2c3e50",
            lineHeight: "1",
            marginBottom: "4px"
          }}>
            {stats.expiringSoon}
          </div>

          <div style={{
            fontSize: "13px",
            color: "#34495e",
            fontWeight: "500"
          }}>
            Within 60 days
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
            maxWidth: "700px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #A2B9ED 0%, #8BA3E0 100%)",
              padding: "24px 32px",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h3 style={{ 
                fontSize: "22px", 
                fontWeight: "700", 
                color: "#fff",
                margin: 0
              }}>
                {editingId ? "✏️ Edit Qualification" : "➕ Add New Qualification"}
              </h3>
              <button
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
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  borderRadius: "8px",
                  width: "36px",
                  height: "36px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "20px",
                  fontWeight: "600",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => {
                  e.target.style.background = "rgba(255, 255, 255, 0.3)";
                  e.target.style.transform = "rotate(90deg)";
                }}
                onMouseOut={(e) => {
                  e.target.style.background = "rgba(255, 255, 255, 0.2)";
                  e.target.style.transform = "rotate(0deg)";
                }}
              >
                ×
              </button>
            </div>

            {/* Form Content */}
            <div style={{ padding: "32px" }}>

            <form onSubmit={handleSubmit}>
              {/* Type */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ 
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px", 
                  fontWeight: "600", 
                  color: "#333", 
                  marginBottom: "10px"
                }}>
                  <span>📋</span>
                  <span>Type</span>
                  <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <select 
                  name="type" 
                  value={formData.type} 
                  onChange={handleInputChange} 
                  required
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "10px",
                    fontSize: "15px",
                    transition: "all 0.3s ease",
                    backgroundColor: "#f8f9fa",
                    color: "#333",
                    cursor: "pointer"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#A2B9ED";
                    e.target.style.backgroundColor = "white";
                    e.target.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e0e0e0";
                    e.target.style.backgroundColor = "#f8f9fa";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <option value="certificate">📜 Certificate</option>
                  <option value="degree">🎓 Degree</option>
                  <option value="license">📄 License</option>
                  <option value="training">🎯 Training</option>
            </select>
          </div>

              {/* Name */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ 
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px", 
                  fontWeight: "600", 
                  color: "#333", 
                  marginBottom: "10px"
                }}>
                  <span>🏷️</span>
                  <span>Name</span>
                  <span style={{ color: "#dc3545" }}>*</span>
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
                    padding: "14px 16px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "10px",
                    fontSize: "15px",
                    transition: "all 0.3s ease",
                    backgroundColor: "#f8f9fa"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#A2B9ED";
                    e.target.style.backgroundColor = "white";
                    e.target.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e0e0e0";
                    e.target.style.backgroundColor = "#f8f9fa";
                    e.target.style.boxShadow = "none";
                  }}
            />
          </div>

              {/* Issued By */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ 
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px", 
                  fontWeight: "600", 
                  color: "#333", 
                  marginBottom: "10px"
                }}>
                  <span>🏢</span>
                  <span>Issued By</span>
                </label>
            <input
              type="text"
              name="issuedBy"
              value={formData.issuedBy}
              onChange={handleInputChange}
                  placeholder="e.g., Company, Institution"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "10px",
                    fontSize: "15px",
                    transition: "all 0.3s ease",
                    backgroundColor: "#f8f9fa"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#A2B9ED";
                    e.target.style.backgroundColor = "white";
                    e.target.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e0e0e0";
                    e.target.style.backgroundColor = "#f8f9fa";
                    e.target.style.boxShadow = "none";
                  }}
            />
          </div>

              {/* Dates */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 1fr", 
                gap: "20px", 
                marginBottom: "24px" 
              }}>
            <div>
                  <label style={{ 
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "14px", 
                    fontWeight: "600", 
                    color: "#333", 
                    marginBottom: "10px"
                  }}>
                    <span>📅</span>
                    <span>Issue Date</span>
                    <span style={{ color: "#dc3545" }}>*</span>
                  </label>
              <input
                type="date"
                name="issuedDate"
                value={formData.issuedDate}
                required
                onChange={(e) => {
                  handleInputChange(e);
                  // Clear expiry if it's now before new issue date
                  if (formData.expiryDate && e.target.value && formData.expiryDate <= e.target.value) {
                    setFormData(prev => ({ ...prev, issuedDate: e.target.value, expiryDate: "" }));
                  }
                }}
                max={today}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "10px",
                      fontSize: "15px",
                      transition: "all 0.3s ease",
                      backgroundColor: "#f8f9fa"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#A2B9ED";
                      e.target.style.backgroundColor = "white";
                      e.target.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e0e0e0";
                      e.target.style.backgroundColor = "#f8f9fa";
                      e.target.style.boxShadow = "none";
                    }}
              />
            </div>
            <div>
                  <label style={{ 
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "14px", 
                    fontWeight: "600", 
                    color: "#333", 
                    marginBottom: "10px"
                  }}>
                    <span>⏰</span>
                    <span>Expiry Date</span>
                    {currentExpiry.required
                      ? <span style={{ color: "#dc3545" }}>*</span>
                      : <span style={{ fontSize: "11px", fontWeight: "400", color: "#adb5bd", fontStyle: "italic" }}>(Optional)</span>
                    }
                  </label>
              {currentExpiry.hidden ? (
                <div style={{
                  padding: "14px 16px",
                  border: "2px dashed #dee2e6",
                  borderRadius: "10px",
                  backgroundColor: "#f8f9fa",
                  color: "#adb5bd",
                  fontSize: "13px",
                  fontStyle: "italic"
                }}>
                  Not applicable for Degree
                </div>
              ) : (
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                required={currentExpiry.required}
                min={(() => {
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const tomorrowStr = tomorrow.toISOString().split("T")[0];
                  if (!formData.issuedDate) return tomorrowStr;
                  const afterIssue = new Date(formData.issuedDate);
                  afterIssue.setDate(afterIssue.getDate() + 1);
                  const afterIssueStr = afterIssue.toISOString().split("T")[0];
                  return afterIssueStr > tomorrowStr ? afterIssueStr : tomorrowStr;
                })()}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: `2px solid ${currentExpiry.required ? "#ffc107" : "#e0e0e0"}`,
                      borderRadius: "10px",
                      fontSize: "15px",
                      transition: "all 0.3s ease",
                      backgroundColor: "#f8f9fa"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#A2B9ED";
                      e.target.style.backgroundColor = "white";
                      e.target.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = currentExpiry.required ? "#ffc107" : "#e0e0e0";
                      e.target.style.backgroundColor = "#f8f9fa";
                      e.target.style.boxShadow = "none";
                    }}
              />
              )}
                  <div style={{ fontSize: "11px", color: currentExpiry.required ? "#856404" : "#adb5bd", marginTop: "6px", fontStyle: "italic" }}>
                    {currentExpiry.hint}
                  </div>
            </div>
          </div>

              {/* Certificate Number */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ 
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px", 
                  fontWeight: "600", 
                  color: "#333", 
                  marginBottom: "10px"
                }}>
                  <span>🔢</span>
                  <span>Certificate Number</span>
                </label>
            <input
              type="text"
              name="certificateNumber"
              value={formData.certificateNumber}
              onChange={handleInputChange}
                  placeholder="e.g., CERT-2025-001"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "10px",
                    fontSize: "15px",
                    transition: "all 0.3s ease",
                    backgroundColor: "#f8f9fa"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#A2B9ED";
                    e.target.style.backgroundColor = "white";
                    e.target.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e0e0e0";
                    e.target.style.backgroundColor = "#f8f9fa";
                    e.target.style.boxShadow = "none";
                  }}
            />
          </div>

              {/* Description */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ 
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px", 
                  fontWeight: "600", 
                  color: "#333", 
                  marginBottom: "10px"
                }}>
                  <span>📝</span>
                  <span>Description</span>
                </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
                  placeholder="Additional notes or details..."
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "10px",
                    fontSize: "15px",
                    minHeight: "100px",
                    fontFamily: "inherit",
                    transition: "all 0.3s ease",
                    resize: "vertical",
                    backgroundColor: "#f8f9fa"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#A2B9ED";
                    e.target.style.backgroundColor = "white";
                    e.target.style.boxShadow = "0 0 0 3px rgba(162, 185, 237, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e0e0e0";
                    e.target.style.backgroundColor = "#f8f9fa";
                    e.target.style.boxShadow = "none";
                  }}
            />
          </div>

              {/* Document Upload */}
              <div style={{ 
                marginBottom: "24px", 
                padding: "24px", 
                background: "linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%)",
                borderRadius: "12px", 
                border: "2px solid #ffc107" 
              }}>
                <label style={{ 
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "600", 
                  marginBottom: "12px", 
                  color: "#856404",
                  fontSize: "15px"
                }}>
                  <span>📄</span>
                  <span>Document Scan</span>
                  <span style={{ color: "#dc3545" }}>*</span>
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
              <div style={{ 
                display: "flex", 
                gap: "16px", 
                justifyContent: "flex-end",
                paddingTop: "8px",
                borderTop: "1px solid #e0e0e0",
                marginTop: "8px"
              }}>
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
                    padding: "14px 28px", 
                    backgroundColor: "#6c757d", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "10px", 
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                    boxShadow: "0 2px 8px rgba(108, 117, 125, 0.2)"
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#5a6268";
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 4px 12px rgba(108, 117, 125, 0.3)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = "#6c757d";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 2px 8px rgba(108, 117, 125, 0.2)";
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!editingId && !documentPath}
                  style={{ 
                    padding: "14px 28px", 
                    background: (!editingId && !documentPath) 
                      ? "linear-gradient(135deg, #ccc 0%, #bbb 100%)" 
                      : "linear-gradient(135deg, #A2B9ED 0%, #8BA3E0 100%)", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "10px", 
                    cursor: (!editingId && !documentPath) ? "not-allowed" : "pointer",
                    fontSize: "15px",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                    boxShadow: (!editingId && !documentPath) 
                      ? "none" 
                      : "0 4px 12px rgba(162, 185, 237, 0.3)"
                  }}
                  onMouseOver={(e) => {
                    if (editingId || documentPath) {
                      e.target.style.background = "linear-gradient(135deg, #8BA3E0 0%, #7B93D0 100%)";
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 6px 16px rgba(162, 185, 237, 0.4)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (editingId || documentPath) {
                      e.target.style.background = "linear-gradient(135deg, #A2B9ED 0%, #8BA3E0 100%)";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 4px 12px rgba(162, 185, 237, 0.3)";
                    }
                  }}
                >
                  {editingId ? "✏️ Update" : "✅ Submit"}
            </button>
          </div>
        </form>
          </div>
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
              borderSpacing: "0",
              border: "1px solid #868e96",
              borderRadius: "8px",
              overflow: "hidden"
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
                    borderBottom: "2px solid #868e96",
                    borderRight: "1px solid #868e96",
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
                    borderBottom: "2px solid #868e96",
                    borderRight: "1px solid #868e96"
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
                    borderBottom: "2px solid #868e96",
                    borderRight: "1px solid #868e96"
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
                    borderBottom: "2px solid #868e96",
                    borderRight: "1px solid #868e96"
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
                    borderBottom: "2px solid #868e96",
                    borderRight: "1px solid #868e96"
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
                    borderBottom: "2px solid #868e96",
                    borderTopRightRadius: "8px"
                  }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {qualifications.map((qual, index) => {
                  const statusStyle = getStatusBadge(qual.approvalStatus);
                  const isLastRow = index === qualifications.length - 1;
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
                        borderBottom: isLastRow ? "none" : "1px solid #868e96",
                        borderRight: "1px solid #868e96",
                        fontSize: "13px",
                        color: "#495057",
                        fontWeight: "600",
                        borderBottomLeftRadius: isLastRow ? "8px" : "0"
                      }}>
                        {getTypeLabel(qual.type)}
                    </td>
                      <td style={{ 
                        padding: "16px", 
                        borderBottom: isLastRow ? "none" : "1px solid #868e96",
                        borderRight: "1px solid #868e96",
                        fontSize: "14px",
                        color: "#212529",
                        fontWeight: "500"
                      }}>
                        {qual.name}
                      </td>
                      <td style={{ 
                        padding: "16px", 
                        borderBottom: isLastRow ? "none" : "1px solid #868e96",
                        borderRight: "1px solid #868e96",
                        fontSize: "13px",
                        color: "#6c757d"
                      }}>
                        {qual.issuedBy || "-"}
                      </td>
                      <td style={{ 
                        padding: "16px", 
                        borderBottom: isLastRow ? "none" : "1px solid #868e96",
                        borderRight: "1px solid #868e96",
                        fontSize: "13px",
                        color: "#6c757d"
                      }}>
                        {formatDate(qual.issuedDate)}
                      </td>
                      <td style={{ 
                        padding: "16px", 
                        borderBottom: isLastRow ? "none" : "1px solid #868e96",
                        borderRight: "1px solid #868e96"
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
                        borderBottom: isLastRow ? "none" : "1px solid #868e96",
                        textAlign: "center",
                        borderBottomRightRadius: isLastRow ? "8px" : "0"
                      }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button
                        onClick={() => handleEdit(qual)}
                        disabled={qual.approvalStatus === "approved"}
                            style={{ 
                              padding: "6px 14px", 
                              backgroundColor: qual.approvalStatus === "approved" ? "#ccc" : "#FFC107", 
                              color: "white", 
                              border: "none", 
                              borderRadius: "6px", 
                              cursor: qual.approvalStatus === "approved" ? "not-allowed" : "pointer",
                              fontSize: "12px",
                              fontWeight: "600",
                              transition: "all 0.2s ease",
                              title: qual.approvalStatus === "approved" ? "Cannot edit an approved qualification" : ""
                            }}
                            onMouseOver={(e) => {
                              if (qual.approvalStatus !== "approved") {
                                e.target.style.backgroundColor = "#FFB300";
                                e.target.style.transform = "translateY(-1px)";
                              }
                            }}
                            onMouseOut={(e) => {
                              if (qual.approvalStatus !== "approved") {
                                e.target.style.backgroundColor = "#FFC107";
                                e.target.style.transform = "translateY(0)";
                              }
                            }}
                          >
                            EDIT
                      </button>
                      <button
                        onClick={() => {
                          if (qual.approvalStatus === "approved") return;
                          setDeleteId(qual.id);
                          setShowDeleteConfirm(true);
                        }}
                        disabled={qual.approvalStatus === "approved"}
                        style={{ 
                          padding: "6px 14px", 
                          backgroundColor: qual.approvalStatus === "approved" ? "#ccc" : "#dc3545", 
                          color: "white", 
                          border: "none", 
                          borderRadius: "6px", 
                          cursor: qual.approvalStatus === "approved" ? "not-allowed" : "pointer",
                          fontSize: "12px",
                          fontWeight: "600",
                          transition: "all 0.2s ease"
                        }}
                        onMouseOver={(e) => {
                          if (qual.approvalStatus !== "approved") {
                            e.target.style.backgroundColor = "#c82333";
                            e.target.style.transform = "translateY(-1px)";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (qual.approvalStatus !== "approved") {
                            e.target.style.backgroundColor = "#dc3545";
                            e.target.style.transform = "translateY(0)";
                          }
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
