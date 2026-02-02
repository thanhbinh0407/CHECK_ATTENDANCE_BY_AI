import React, { useState, useEffect } from "react";

export default function Dependents({ userId }) {
  const [dependents, setDependents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    relationship: "spouse",
    dateOfBirth: "",
    gender: "male",
    idNumber: "",
    address: "",
    phoneNumber: "",
    email: ""
  });
  const [editingId, setEditingId] = useState(null);
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
    console.log("Component mounted/updated with userId:", userId);
    fetchDependents();
  }, [userId]);

  const fetchDependents = async () => {
    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      if (!token) {
        console.log("No auth token found");
        return;
      }

      // Decode token to see user info
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log("Token contains user:", payload);
      } catch (e) {
        console.log("Cannot decode token");
      }

      console.log("Fetching dependents from API...");
      const res = await fetch(`${apiBase}/api/dependents/my`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      console.log("Fetch dependents response:", data);
      
      if (res.ok) {
        console.log("Setting dependents:", data.dependents || []);
        setDependents(data.dependents || []);
      } else {
        console.error("Failed to fetch dependents:", data);
      }
    } catch (error) {
      console.error("Error fetching dependents:", error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      if (!token) {
        showMessage("Authentication required. Please login again.", "error");
        return;
      }

      // Extract user ID from token
      let userIdFromToken = userId;
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        // Use the 'id' field from token if available, otherwise use userId prop
        userIdFromToken = tokenPayload.id || tokenPayload.userId || userId;
        console.log("Using userId from token:", userIdFromToken, "Token payload:", tokenPayload);
      } catch (e) {
        console.log("Cannot decode token, using prop userId:", userId);
      }

      // Send userId from token in the request
      const payload = {
        userId: userIdFromToken,
        ...formData
      };

      console.log("Submitting dependent data:", payload);

      const url = editingId 
        ? `${apiBase}/api/dependents/${editingId}`
        : `${apiBase}/api/dependents`;

      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const responseData = await res.json();
      console.log("API Response:", responseData);

      if (res.ok) {
        showMessage(editingId ? "Dependent updated successfully!" : "Dependent added successfully!", "success");
        await fetchDependents();
        setTimeout(() => {
          setShowForm(false);
          setEditingId(null);
          setFormData({
            fullName: "",
            relationship: "spouse",
            dateOfBirth: "",
            gender: "male",
            idNumber: "",
            address: "",
            phoneNumber: "",
            email: ""
          });
        }, 2000);
      } else {
        const errorMsg = responseData.message || responseData.error || "Failed to save dependent";
        showMessage(`Error: ${errorMsg}`, "error");
        console.error("API Error:", responseData);
      }
    } catch (error) {
      showMessage("Network error: " + error.message, "error");
      console.error("Error saving dependent:", error);
    }
  };

  const handleEdit = (dep) => {
    setEditingId(dep.id);
    setFormData({
      fullName: dep.fullName,
      relationship: dep.relationship,
      dateOfBirth: dep.dateOfBirth ? dep.dateOfBirth.split("T")[0] : "",
      gender: dep.gender || "male",
      idNumber: dep.idNumber || "",
      address: dep.address || "",
      phoneNumber: dep.phoneNumber || "",
      email: dep.email || ""
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      const res = await fetch(`${apiBase}/api/dependents/${deleteId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        showMessage("Dependent deleted successfully!", "success");
        await fetchDependents();
      } else {
        showMessage("Failed to delete dependent", "error");
      }
    } catch (error) {
      showMessage("Error: " + error.message, "error");
      console.error("Error deleting dependent:", error);
    } finally {
      setShowDeleteConfirm(false);
      setDeleteId(null);
    }
  };

  const getRelationshipLabel = (rel) => {
    const translations = {
      "spouse": "Spouse",
      "child": "Child",
      "parent": "Parent",
      "grandparent": "Grandparent",
      "sibling": "Sibling",
      "other": "Other"
    };
    return translations[rel] || rel;
  };

  const getGenderLabel = (gender) => {
    const labels = {
      "male": "Male",
      "female": "Female",
      "other": "Other"
    };
    return labels[gender] || gender;
  };

  const stats = {
    total: dependents.length,
    spouse: dependents.filter(d => d.relationship === 'spouse').length,
    children: dependents.filter(d => d.relationship === 'child').length,
    others: dependents.filter(d => !['spouse', 'child'].includes(d.relationship)).length
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
            Dependents
          </h2>
          <p style={{ 
            fontSize: "14px", 
            color: "#6c757d", 
            margin: 0 
          }}>
            Manage your family dependents information
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
            ADD DEPENDENT
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
        {/* Total Dependents */}
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
                Total Dependents
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", marginBottom: "4px" }}>
                {stats.total}
              </div>
              <div style={{ fontSize: "13px", opacity: 0.85 }}>
                All family members
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
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* Spouse */}
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
                Spouse
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", marginBottom: "4px" }}>
                {stats.spouse}
              </div>
              <div style={{ fontSize: "13px", opacity: 0.85 }}>
                Husband/Wife
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
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* Children */}
        <div style={{
          background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          borderRadius: "16px",
          padding: "28px 24px",
          color: "white",
          boxShadow: "0 4px 15px rgba(79, 172, 254, 0.3)",
          transition: "all 0.3s ease",
          cursor: "pointer"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(79, 172, 254, 0.4)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 15px rgba(79, 172, 254, 0.3)";
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
                Children
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", marginBottom: "4px" }}>
                {stats.children}
              </div>
              <div style={{ fontSize: "13px", opacity: 0.85 }}>
                Sons and daughters
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
                <circle cx="12" cy="8" r="5"></circle>
                <path d="M3 21v-2a7 7 0 0 1 7-7"></path>
                <path d="M16 11l2 2 4-4"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* Others */}
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
                Others
              </div>
              <div style={{ fontSize: "36px", fontWeight: "700", marginBottom: "4px" }}>
                {stats.others}
              </div>
              <div style={{ fontSize: "13px", opacity: 0.85 }}>
                Parents & siblings
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
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
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
            maxWidth: "700px",
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
              {editingId ? "Edit Dependent" : "Add New Dependent"}
            </h3>

            <form onSubmit={handleSubmit}>
              {/* Full Name */}
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
                  Full Name <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter full name"
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

              {/* Relationship & Gender */}
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
                    Relationship <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <select 
                    name="relationship" 
                    value={formData.relationship} 
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
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                    <option value="grandparent">Grandparent</option>
                    <option value="sibling">Sibling</option>
                    <option value="other">Other</option>
                  </select>
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
                    Gender
                  </label>
                  <select 
                    name="gender" 
                    value={formData.gender} 
                    onChange={handleInputChange}
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
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Date of Birth & ID Number */}
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
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
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
                    ID Number
                  </label>
                  <input
                    type="text"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleInputChange}
                    placeholder="ID/Passport number"
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

              {/* Address */}
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
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Home address"
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

              {/* Phone & Email */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 1fr", 
                gap: "16px", 
                marginBottom: "24px" 
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
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="Contact number"
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
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email address"
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
                      fullName: "", 
                      relationship: "spouse", 
                      dateOfBirth: "", 
                      gender: "male", 
                      idNumber: "", 
                      address: "", 
                      phoneNumber: "", 
                      email: "" 
                    });
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
                  style={{ 
                    padding: "12px 24px", 
                    backgroundColor: "#2196F3", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "8px", 
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                    boxShadow: "0 2px 8px rgba(33, 150, 243, 0.3)"
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = "#1976D2"}
                  onMouseOut={(e) => e.target.style.backgroundColor = "#2196F3"}
                >
                  {editingId ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dependents List */}
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
          Dependents List
        </h3>

        {loading ? (
          <div style={{ 
            textAlign: "center", 
            padding: "40px", 
            color: "#6c757d" 
          }}>
            Loading...
          </div>
        ) : dependents.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "40px", 
            color: "#6c757d" 
          }}>
            No dependents added yet
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
                    Full Name
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
                    Relationship
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
                    Date of Birth
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
                    Phone Number
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
                {dependents.map(dep => (
                  <tr 
                    key={dep.id} 
                    style={{ 
                      backgroundColor: "white",
                      transition: "all 0.2s ease"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                    }}
                  >
                    <td style={{ 
                      padding: "16px", 
                      borderBottom: "1px solid #e9ecef",
                      fontSize: "14px",
                      color: "#212529",
                      fontWeight: "500"
                    }}>
                      {dep.fullName}
                    </td>
                    <td style={{ 
                      padding: "16px", 
                      borderBottom: "1px solid #e9ecef",
                      fontSize: "13px",
                      color: "#495057",
                      fontWeight: "600"
                    }}>
                      {getRelationshipLabel(dep.relationship)}
                    </td>
                    <td style={{ 
                      padding: "16px", 
                      borderBottom: "1px solid #e9ecef",
                      fontSize: "13px",
                      color: "#6c757d"
                    }}>
                      {dep.dateOfBirth ? new Date(dep.dateOfBirth).toLocaleDateString("en-US") : "-"}
                    </td>
                    <td style={{ 
                      padding: "16px", 
                      borderBottom: "1px solid #e9ecef",
                      fontSize: "13px",
                      color: "#6c757d"
                    }}>
                      {dep.phoneNumber || "-"}
                    </td>
                    <td style={{ 
                      padding: "16px", 
                      borderBottom: "1px solid #e9ecef",
                      textAlign: "center"
                    }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button
                          onClick={() => handleEdit(dep)}
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
                            setDeleteId(dep.id);
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
                ))}
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
              Delete Dependent
            </h3>
            
            <p style={{ 
              fontSize: "14px", 
              color: "#6c757d", 
              marginBottom: "28px",
              lineHeight: "1.6"
            }}>
              Are you sure you want to delete this dependent? This action cannot be undone.
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
