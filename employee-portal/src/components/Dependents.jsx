import React, { useState, useEffect } from "react";

export default function Dependents({ userId, refreshVersion = 0 }) {
  const [dependents, setDependents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    idNumber: "",
    address: "",
    phoneNumber: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [errors, setErrors] = useState({
    fullName: "",
    phoneNumber: "",
    dateOfBirth: "",
    idNumber: "",
    address: ""
  });
  const [cccdFiles, setCccdFiles] = useState([]);
  const [cccdFileError, setCccdFileError] = useState("");
  const [uploadedPreviews, setUploadedPreviews] = useState([]);
  const [cccdPreviews, setCccdPreviews] = useState([]);
  const [existingDocs, setExistingDocs] = useState([]);
  const [existingCccdDocs, setExistingCccdDocs] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileUploadError, setFileUploadError] = useState("");
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewDependent, setViewDependent] = useState(null);

  const getLocalToday = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const today = getLocalToday();

  // For manager role, dependents must be under 18 years old.
  const getMinDobForUnder18 = () => {
    const d = new Date();
    // cutoff = today - 18 years
    const cutoff = new Date(d.getFullYear() - 18, d.getMonth(), d.getDate());
    // allowed DOB must be after cutoff, so min = cutoff + 1 day
    cutoff.setDate(cutoff.getDate() + 1);
    return cutoff.toISOString().split('T')[0];
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
    console.log("Component mounted/updated with userId:", userId);
    fetchDependents();
  }, [userId, refreshVersion]);

  const fetchDependents = async () => {
    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");

      if (!token) {
        console.log("No auth token found");
        return;
      }

      // Decode token to see user info and determine role
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log("Token contains user:", payload);
        const role = payload.role || payload.userRole || payload.roleName || payload.roleType || null;
        setUserRole(role);
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

  // Validation (employee: ID/CCCD bắt buộc 9 hoặc 12 chữ số — khớp backend)
  const validateFullName = (value) => {
    const t = (value || "").trim();
    if (!t) return "Full name is required";
    if (t.length < 2) return "Full name is too short";
    if (t.length > 120) return "Full name must be at most 120 characters";
    if (!/^[\p{L}\s'.-]+$/u.test(t)) {
      return "Full name may only contain letters, spaces, and . ' -";
    }
    return "";
  };

  const validateRelationship = (value) => {
    return "";
  };

  const validatePhoneNumber = (value) => {
    const t = String(value || "").trim();
    if (!t) return "";
    const digits = t.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) {
      return "Phone must contain 8–15 digits (optional field)";
    }
    return "";
  };

  const validateEmail = (value) => {
    return "";
  };

  const validateAddress = (value) => {
    const t = (value || "").trim();
    if (t.length > 500) return "Address must be at most 500 characters";
    return "";
  };

  const validateDateOfBirth = (value) => {
    if (!value) {
      return "";
    }
    const selectedDate = new Date(value);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

    if (selectedDate > todayDate) {
      return "Date of Birth cannot be in the future";
    }

    // If current user is manager, dependent must be under 18 (DOB after cutoff)
    if (userRole === 'manager') {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 18);
      cutoff.setHours(0,0,0,0);
      // dependent must be born after cutoff (strictly younger than 18)
      if (selectedDate <= cutoff) {
        return "Dependent must be under 18 years old";
      }
    }

    return "";
  };

  const validateIdNumber = (value) => {
    const normalized = String(value || "").replace(/\D/g, "");
    // compute age from dateOfBirth
    const age = computeAge(formData.dateOfBirth);
    // If under 6 -> not required
    if (age !== null && age < 6) return "";
    // If 6 <= age < 14 -> optional (if provided must be valid)
    if (!normalized) {
      if (age === null) {
        // no DOB provided, keep requirement conservative
        return "ID / CCCD is required";
      }
      if (age >= 14) return "ID / CCCD is required";
      return "";
    }
    if (!/^(\d{9}|\d{12})$/.test(normalized)) {
      return "ID / CCCD must be exactly 9 or 12 digits";
    }
    return "";
  };

  const computeAge = (dob) => {
    if (!dob) return null;
    try {
      const b = new Date(dob);
      const todayD = new Date();
      let age = todayD.getFullYear() - b.getFullYear();
      const m = todayD.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && todayD.getDate() < b.getDate())) age--;
      return age;
    } catch (e) {
      return null;
    }
  };

  // Capitalize first letter of each word while preserving Vietnamese accents
  // Only capitalize if the first letter is lowercase, preserve accents
  const capitalizeWords = (str) => {
    return str
      .split(" ")
      .map(word => {
        if (!word) return word;
        const firstChar = word.charAt(0);
        const rest = word.slice(1);
        // Only capitalize if first char is lowercase letter (a-z), preserve Vietnamese accents
        if (firstChar >= 'a' && firstChar <= 'z') {
          return firstChar.toUpperCase() + rest;
        }
        // If already uppercase or has accent, keep as is
        return word;
      })
      .join(" ");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    let error = "";

    // Process and validate based on field name
    if (name === "fullName") {
      processedValue = value.replace(/\d/g, "");
      error = validateFullName(processedValue);
    } else if (name === "phoneNumber") {
      processedValue = value.replace(/\D/g, "");
      if (processedValue.length > 15) processedValue = processedValue.substring(0, 15);
      error = validatePhoneNumber(processedValue);
    } else if (name === "idNumber") {
      processedValue = value.replace(/\D/g, "");
      if (processedValue.length > 12) processedValue = processedValue.substring(0, 12);
      error = validateIdNumber(processedValue);
    } else if (name === "address") {
      processedValue = value;
      if (value.length > 500) processedValue = value.substring(0, 500);
      error = validateAddress(processedValue);
    } else if (name === "dateOfBirth") {
      processedValue = value;
      error = validateDateOfBirth(value);
      // revalidate idNumber because requirement may change
      setTimeout(() => {
        setErrors(prev => ({ ...prev, idNumber: validateIdNumber(formData.idNumber) }));
      }, 0);
    } else {
      // other simple fields: gender etc.
      processedValue = value;
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Update errors
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    let error = "";

    if (name === "fullName") {
      const capitalized = capitalizeWords(value);
      if (capitalized !== value) {
        setFormData(prev => ({
          ...prev,
          [name]: capitalized
        }));
        error = validateFullName(capitalized);
      } else {
        error = validateFullName(value);
      }
    } else if (name === "relationship") {
      error = "";
    } else if (name === "phoneNumber") {
      error = validatePhoneNumber(value);
    } else if (name === "dateOfBirth") {
      error = validateDateOfBirth(value);
      // update id validation on blur as well
      setErrors(prev => ({ ...prev, idNumber: validateIdNumber(formData.idNumber) }));
    } else if (name === "idNumber") {
      error = validateIdNumber(value);
    } else if (name === "address") {
      error = validateAddress(value);
    }

    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleDependentDocsChange = (e) => {
    const files = Array.from(e.target.files || []);
    setFileUploadError("");

    if (files.length === 0) {
      setUploadedFiles([]);
      return;
    }

    if (files.length > 10) {
      setUploadedFiles([]);
      setFileUploadError("You can upload up to 10 PDF files.");
      return;
    }

    const allowed = ["application/pdf"];
    // accept images
    const invalid = files.find((f) => !(f.type.startsWith('image/') || allowed.includes(f.type) || f.name.toLowerCase().endsWith('.pdf')));
    if (invalid) {
      setUploadedFiles([]);
      setFileUploadError("Only PDF or image files are allowed for dependent document.");
      return;
    }

    const tooLarge = files.find((f) => f.size > 10 * 1024 * 1024);
    if (tooLarge) {
      setUploadedFiles([]);
      setFileUploadError("Each file must not exceed 10MB.");
      return;
    }

    setUploadedFiles(files);
  };

  const handleCccdChange = (e) => {
    const files = Array.from(e.target.files || []);
    setCccdFileError("");

    if (files.length === 0) {
      setCccdFiles([]);
      return;
    }

    if (files.length > 2) {
      setCccdFiles([]);
      setCccdFileError("You can upload up to 2 files for CCCD (front/back).");
      return;
    }

    const invalid = files.find((f) => !(f.type.startsWith('image/') || f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')));
    if (invalid) {
      setCccdFiles([]);
      setCccdFileError("Only PDF or image files are allowed for CCCD.");
      return;
    }

    const tooLarge = files.find((f) => f.size > 10 * 1024 * 1024);
    if (tooLarge) {
      setCccdFiles([]);
      setCccdFileError("Each file must not exceed 10MB.");
      return;
    }

    setCccdFiles(files);
  };

  // build previews for selected files (object URLs)
  useEffect(() => {
    // uploadedFiles previews
    const prev = (uploadedFiles || []).map((f) => ({
      url: URL.createObjectURL(f),
      name: f.name,
      type: f.type
    }));
    setUploadedPreviews(prev);
    return () => {
      prev.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [uploadedFiles]);

  useEffect(() => {
    const prev = (cccdFiles || []).map((f) => ({ url: URL.createObjectURL(f), name: f.name, type: f.type }));
    setCccdPreviews(prev);
    return () => {
      prev.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [cccdFiles]);

  const uploadDependentDocs = async (dependentId, token, apiBase) => {
    // require dependent documents
    if (!uploadedFiles || uploadedFiles.length === 0) return false;

    const fd = new FormData();
    uploadedFiles.forEach((f) => fd.append("documents", f));
    // append cccd files if any
    cccdFiles.forEach((f) => fd.append("cccdFiles", f));

    setUploadingDocs(true);
    try {
      const res = await fetch(`${apiBase}/api/dependents/${dependentId}/documents`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: fd
      });

      let parsed = null;
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        try {
          parsed = await res.json();
        } catch (e) {
          parsed = { message: `Invalid JSON response (${e.message})` };
        }
      } else {
        // non-json (html/text) responses
        const txt = await res.text();
        parsed = { message: txt };
      }

      if (!res.ok) {
        const msg = parsed?.message || parsed?.error || res.statusText || "Upload failed";
        showMessage(`Upload failed: ${String(msg).slice(0, 200)}`, "error");
        return false;
      }

      return true;
    } catch (err) {
      showMessage(`Upload error: ${err.message}`, "error");
      return false;
    } finally {
      setUploadingDocs(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const fullNameError = validateFullName(formData.fullName);
    const phoneNumberError = validatePhoneNumber(formData.phoneNumber);
    const dateOfBirthError = validateDateOfBirth(formData.dateOfBirth);
    const idNumberError = validateIdNumber(formData.idNumber);
    const addressError = validateAddress(formData.address);

    setErrors({
      fullName: fullNameError,
      phoneNumber: phoneNumberError,
      dateOfBirth: dateOfBirthError,
      idNumber: idNumberError,
      address: addressError
    });

    if (
      fullNameError ||
      phoneNumberError ||
      dateOfBirthError ||
      idNumberError ||
      addressError
    ) {
      showMessage("Please fix the validation errors before submitting.", "error");
      return;
    }

    // For new dependent, require at least one dependent document (pdf or image)
    if (!editingId && (!uploadedFiles || uploadedFiles.length === 0)) {
      showMessage("Please upload at least one document (birth certificate) for this dependent.", "error");
      return;
    }
    if (fileUploadError) {
      showMessage(fileUploadError, "error");
      return;
    }
    if (cccdFileError) {
      showMessage(cccdFileError, "error");
      return;
    }

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

      const payload = {
        userId: userIdFromToken,
        ...formData,
        // default relationship is child
        relationship: 'child',
        fullName: formData.fullName.trim(),
        address: formData.address?.trim() || null,
        phoneNumber: formData.phoneNumber?.trim() || null,
        gender: formData.gender || null
      };

      console.log("Submitting dependent data:", payload);

      const url = editingId 
        ? `${apiBase}/api/dependents/${editingId}`
        : `${apiBase}/api/dependents`;

      const method = editingId ? "PUT" : "POST";

      // prevent double submit
      if (submitting) return;
      setSubmitting(true);

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
        const depId = responseData?.dependent?.id || responseData?.dependentId || editingId;
        if (depId) {
          const uploadedOk = await uploadDependentDocs(depId, token, apiBase);
          if (!uploadedOk) return;
        }

        showMessage(editingId ? "Dependent updated successfully!" : "Dependent added successfully!", "success");
        await fetchDependents();
        setTimeout(() => {
          setShowForm(false);
          setEditingId(null);
          setFormData({
            fullName: "",
            
            dateOfBirth: "",
            gender: "",
            idNumber: "",
            address: "",
            phoneNumber: "",
            
          });
          setErrors({
            fullName: "",
            phoneNumber: "",
            dateOfBirth: "",
            idNumber: "",
            address: ""
          });
          setUploadedFiles([]);
          setCccdFiles([]);
          setFileUploadError("");
        }, 2000);
      } else {
        const errorMsg = responseData.message || responseData.error || "Failed to save dependent";
        showMessage(`Error: ${errorMsg}`, "error");
        console.error("API Error:", responseData);
      }
      } catch (error) {
        showMessage("Network error: " + error.message, "error");
        console.error("Error saving dependent:", error);
      } finally {
        setSubmitting(false);
      }
  };

  // View dependent (read-only). Editing has been removed as requested.
  const handleView = (dep) => {
    setViewDependent(dep);
    setShowViewModal(true);
    // fetch documents for preview
    fetchDependentDocuments(dep.id);
  };

  const fetchDependentDocuments = async (dependentId) => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");
      if (!token) return;
      const res = await fetch(`${apiBase}/api/dependents/${dependentId}/documents`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        // try parse text
        const txt = await res.text().catch(() => null);
        console.warn('Could not fetch dependent documents:', res.status, txt);
        setExistingDocs([]);
        setExistingCccdDocs([]);
        return;
      }
      const data = await res.json().catch(() => null);
      // expected shape: { documents: [url or {url,name,type}], cccdFiles: [...] }
      const docs = data?.documents || data?.files || data || [];
      // normalize to objects {url,name,type}
      const norm = (docs || []).map(d => {
        if (typeof d === 'string') return { url: d, name: d.split('/').pop() };
        // server stores path in `documentPath` and original name in `fileName`
        const url = d.documentPath || d.url || d.path || d.file || '';
        const name = d.fileName || d.name || d.filename || (url || '').split('/').pop();
        return { url, name, type: d.mimeType || d.type || '' };
      });
      const cccd = data?.cccdFiles || [];
      const normCccd = (cccd || []).map(d => {
        if (typeof d === 'string') return { url: d, name: d.split('/').pop() };
        const url = d.documentPath || d.url || d.path || '';
        const name = d.fileName || d.name || d.filename || (url||'').split('/').pop();
        return { url, name, type: d.mimeType || d.type || '' };
      });
      setExistingDocs(norm);
      setExistingCccdDocs(normCccd);
    } catch (err) {
      console.error('Error fetching dependent documents', err);
      setExistingDocs([]);
      setExistingCccdDocs([]);
    }
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

  const getApprovalStatusLabel = (status) => {
    const labels = {
      pending: "Pending approval",
      approved: "Approved",
      rejected: "Rejected"
    };
    return labels[status] || status || "—";
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
            type="button"
            onClick={() => {
              setEditingId(null);
              setUploadedFiles([]);
              setFileUploadError("");
              setFormData({ fullName: "", dateOfBirth: "", gender: "", idNumber: "", address: "", phoneNumber: "" });
              setErrors({ fullName: "", phoneNumber: "", dateOfBirth: "", idNumber: "", address: "" });
              setShowForm(true);
            }}
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
                {editingId ? "✏️ Edit Dependent" : "➕ Add New Dependent"}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ fullName: "", dateOfBirth: "", gender: "", idNumber: "", address: "", phoneNumber: "" });
                  setMessage("");
                  setErrors({ fullName: "", phoneNumber: "", dateOfBirth: "", idNumber: "", address: "" });
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
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(255, 255, 255, 0.3)";
                  e.target.style.transform = "rotate(90deg)";
                }}
                onMouseLeave={(e) => {
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
              {/* Full Name */}
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
                  <span>👤</span>
                  <span>Full Name</span>
                  <span style={{ color: "#dc3545" }}>*</span>
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
                    padding: "14px 16px",
                    border: `2px solid ${errors.fullName ? "#dc3545" : "#e0e0e0"}`,
                    borderRadius: "10px",
                    fontSize: "15px",
                    transition: "all 0.3s ease",
                    backgroundColor: "#f8f9fa"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = errors.fullName ? "#dc3545" : "#A2B9ED";
                    e.target.style.backgroundColor = "white";
                    e.target.style.boxShadow = `0 0 0 3px ${errors.fullName ? "rgba(220, 53, 69, 0.1)" : "rgba(162, 185, 237, 0.1)"}`;
                  }}
                  onBlur={(e) => {
                    handleBlur(e);
                    e.target.style.borderColor = errors.fullName ? "#dc3545" : "#e0e0e0";
                    e.target.style.backgroundColor = "#f8f9fa";
                    e.target.style.boxShadow = "none";
                  }}
                />
                {errors.fullName && (
                  <div style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    color: "#dc3545",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <span>⚠️</span>
                    <span>{errors.fullName}</span>
                  </div>
                )}
              </div>

              {/* Gender (relationship removed — default to child) */}
              <div style={{ 
                display: "block", 
                marginBottom: "24px" 
              }}>
                <label style={{ 
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px", 
                  fontWeight: "600", 
                  color: "#333", 
                  marginBottom: "10px"
                }}>
                  <span>⚧️</span>
                  <span>Gender</span>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#6c757d" }}>(optional)</span>
                </label>
                <select 
                  name="gender" 
                  value={formData.gender} 
                  onChange={handleInputChange}
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
                >
                  <option value="">— Not specified —</option>
                  <option value="male">👨 Male</option>
                  <option value="female">👩 Female</option>
                  <option value="other">⚧️ Other</option>
                </select>
              </div>

              {/* Date of Birth & ID Number */}
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
                    <span>Date of Birth{userRole === 'manager' ? ' (must be under 18)' : ''}</span>
                    <span style={{ marginLeft: 8, fontSize: 13, color: '#6c757d' }}>
                      {formData.dateOfBirth ? (`Age: ${computeAge(formData.dateOfBirth)} yrs`) : ''}
                    </span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    max={today}
                    min={userRole === 'manager' ? getMinDobForUnder18() : undefined}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: `2px solid ${errors.dateOfBirth ? "#dc3545" : "#e0e0e0"}`,
                      borderRadius: "10px",
                      fontSize: "15px",
                      transition: "all 0.3s ease",
                      backgroundColor: "#f8f9fa"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = errors.dateOfBirth ? "#dc3545" : "#A2B9ED";
                      e.target.style.backgroundColor = "white";
                      e.target.style.boxShadow = `0 0 0 3px ${errors.dateOfBirth ? "rgba(220, 53, 69, 0.1)" : "rgba(162, 185, 237, 0.1)"}`;
                    }}
                    onBlur={(e) => {
                      handleBlur(e);
                      e.target.style.borderColor = "#e0e0e0";
                      e.target.style.backgroundColor = "#f8f9fa";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  {errors.dateOfBirth && (
                    <div style={{
                      marginTop: "6px",
                      fontSize: "12px",
                      color: "#dc3545",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      <span>⚠️</span>
                      <span>{errors.dateOfBirth}</span>
                    </div>
                  )}
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
                    <span>🆔</span>
                    <span>ID / CCCD</span>
                    {
                      (computeAge(formData.dateOfBirth) !== null && computeAge(formData.dateOfBirth) >= 14) ? (
                        <span style={{ color: "#dc3545" }}>*</span>
                      ) : null
                    }
                  </label>
                  <div style={{ fontSize: "11px", color: "#6c757d", marginBottom: "8px", lineHeight: 1.45 }}>
                    Employees: enter exactly 9 or 12 digits (CMND/CCCD). Requirement depends on age.
                  </div>
                  <input
                    type="text"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleInputChange}
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="9 or 12 digits"
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: `2px solid ${errors.idNumber ? "#dc3545" : "#e0e0e0"}`,
                      borderRadius: "10px",
                      fontSize: "15px",
                      transition: "all 0.3s ease",
                      backgroundColor: "#f8f9fa"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = errors.idNumber ? "#dc3545" : "#A2B9ED";
                      e.target.style.backgroundColor = "white";
                      e.target.style.boxShadow = `0 0 0 3px ${errors.idNumber ? "rgba(220, 53, 69, 0.1)" : "rgba(162, 185, 237, 0.1)"}`;
                    }}
                    onBlur={(e) => {
                      handleBlur(e);
                      e.target.style.borderColor = errors.idNumber ? "#dc3545" : "#e0e0e0";
                      e.target.style.backgroundColor = "#f8f9fa";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  {errors.idNumber && (
                    <div style={{
                      marginTop: "6px",
                      fontSize: "12px",
                      color: "#dc3545",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      <span>⚠️</span>
                      <span>{errors.idNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dependent Documents Upload */}
              <div style={{
                marginBottom: "24px",
                padding: "20px",
                background: "linear-gradient(135deg, rgba(255, 193, 7, 0.12) 0%, rgba(255, 193, 7, 0.06) 100%)",
                borderRadius: "12px",
                border: "2px solid #ffc107"
              }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "600",
                  marginBottom: "10px",
                  color: "#856404",
                  fontSize: "15px"
                }}>
                  <span>📄</span>
                  <span>Dependent Documents (PDF)</span>
                  <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <div style={{
                  fontSize: "12px",
                  color: "#856404",
                  marginBottom: "12px",
                  lineHeight: "1.5"
                }}>
                  Upload supporting documents for your dependent (birth certificate). PDF or image files allowed, up to 10 files, max 10MB each.
                </div>

                <input
                  type="file"
                  accept="application/pdf,image/*,.pdf,.jpg,.jpeg,.png"
                  multiple
                  onChange={handleDependentDocsChange}
                  style={{ marginBottom: "10px" }}
                />

                {fileUploadError && (
                  <div style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    color: "#dc3545",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <span>⚠️</span>
                    <span>{fileUploadError}</span>
                  </div>
                )}

                {uploadedPreviews?.length > 0 && (
                  <div style={{ marginTop: "10px", padding: "10px 12px", backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #ffe08a" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#856404", marginBottom: "6px" }}>Selected files</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {uploadedPreviews.map((p, idx) => (
                        <div key={idx} style={{ width: 120, textAlign: 'center' }}>
                          {p.type && p.type.startsWith('image/') ? (
                            <a href={p.url} target="_blank" rel="noreferrer">
                              <img src={p.url} alt={p.name} style={{ width: 110, height: 78, objectFit: 'cover', borderRadius: 6, border: '1px solid #e9ecef' }} />
                            </a>
                          ) : (
                            <a href={p.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', width: 110, height: 78, borderRadius: 6, border: '1px solid #e9ecef', padding: 8, background: '#fafafa', textDecoration: 'none', color: '#333' }}>
                              <div style={{ fontSize: 12, fontWeight: 700 }}>PDF</div>
                              <div style={{ fontSize: 11 }}>{p.name}</div>
                            </a>
                          )}
                          <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{p.name}</div>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => setUploadedFiles([])} style={{ marginTop: "10px", padding: "6px 12px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>Remove selected</button>
                  </div>
                )}
                {existingDocs?.length > 0 && (
                  <div style={{ marginTop: 12, padding: "10px", background: "#fafafa", borderRadius: 8, border: "1px solid #f0e6b2" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#856404', marginBottom: 8 }}>Existing birth documents</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {existingDocs.map((p, idx) => (
                        <div key={idx} style={{ width: 120, textAlign: 'center' }}>
                          {p.url && (p.type || p.name.toLowerCase().endsWith('.jpg') || p.name.toLowerCase().endsWith('.png')) && p.type && p.type.startsWith('image/') ? (
                            <a href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt={p.name} style={{ width: 110, height: 78, objectFit: 'cover', borderRadius: 6, border: '1px solid #e9ecef' }} /></a>
                          ) : (
                            <a href={p.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', width: 110, height: 78, borderRadius: 6, border: '1px solid #e9ecef', padding: 8, background: '#fff', textDecoration: 'none', color: '#333' }}>
                              <div style={{ fontSize: 12, fontWeight: 700 }}>View</div>
                              <div style={{ fontSize: 11 }}>{p.name}</div>
                            </a>
                          )}
                          <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{p.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CCCD Front/Back Upload (supplemental) */}
              <div style={{
                marginBottom: "24px",
                padding: "16px",
                background: "#f1f3f5",
                borderRadius: "12px",
                border: "1px solid #e9ecef"
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", marginBottom: "10px", fontSize: "15px" }}>
                  <span>🪪</span>
                  <span>CCCD (Front/Back) — supplemental</span>
                </label>
                <div style={{ fontSize: "12px", color: "#6c757d", marginBottom: "8px" }}>
                  Upload CCCD front/back images or PDF (optional or required depending on age). Up to 2 files, max 10MB each.
                </div>
                <input
                  type="file"
                  accept="application/pdf,image/*,.pdf,.jpg,.jpeg,.png"
                  multiple
                  onChange={handleCccdChange}
                  style={{ marginBottom: "10px" }}
                />

                {cccdFileError && (
                  <div style={{ marginTop: "6px", fontSize: "12px", color: "#dc3545", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>⚠️</span>
                    <span>{cccdFileError}</span>
                  </div>
                )}

                {cccdPreviews?.length > 0 && (
                  <div style={{ marginTop: "10px", padding: "10px 12px", backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e9ecef" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#495057", marginBottom: "6px" }}>Selected CCCD files</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {cccdPreviews.map((p, idx) => (
                        <div key={idx} style={{ width: 120, textAlign: 'center' }}>
                          {p.type && p.type.startsWith('image/') ? (
                            <a href={p.url} target="_blank" rel="noreferrer">
                              <img src={p.url} alt={p.name} style={{ width: 110, height: 78, objectFit: 'cover', borderRadius: 6, border: '1px solid #e9ecef' }} />
                            </a>
                          ) : (
                            <a href={p.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', width: 110, height: 78, borderRadius: 6, border: '1px solid #e9ecef', padding: 8, background: '#fafafa', textDecoration: 'none', color: '#333' }}>
                              <div style={{ fontSize: 12, fontWeight: 700 }}>PDF</div>
                              <div style={{ fontSize: 11 }}>{p.name}</div>
                            </a>
                          )}
                          <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{p.name}</div>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => setCccdFiles([])} style={{ marginTop: "10px", padding: "6px 12px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>Remove selected</button>
                  </div>
                )}
                {existingCccdDocs?.length > 0 && (
                  <div style={{ marginTop: 12, padding: "10px", background: "#fffaf6", borderRadius: 8, border: "1px solid #f0e6d8" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#495057', marginBottom: 8 }}>Existing CCCD files</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {existingCccdDocs.map((p, idx) => (
                        <div key={idx} style={{ width: 120, textAlign: 'center' }}>
                          {p.url && (p.type && p.type.startsWith('image/')) ? (
                            <a href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt={p.name} style={{ width: 110, height: 78, objectFit: 'cover', borderRadius: 6, border: '1px solid #e9ecef' }} /></a>
                          ) : (
                            <a href={p.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', width: 110, height: 78, borderRadius: 6, border: '1px solid #e9ecef', padding: 8, background: '#fff', textDecoration: 'none', color: '#333' }}>
                              <div style={{ fontSize: 12, fontWeight: 700 }}>View</div>
                              <div style={{ fontSize: 11 }}>{p.name}</div>
                            </a>
                          )}
                          <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{p.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Address */}
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
                  <span>📍</span>
                  <span>Address</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="Home address (optional)"
                  maxLength={500}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: `2px solid ${errors.address ? "#dc3545" : "#e0e0e0"}`,
                    borderRadius: "10px",
                    fontSize: "15px",
                    transition: "all 0.3s ease",
                    backgroundColor: "#f8f9fa"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = errors.address ? "#dc3545" : "#A2B9ED";
                    e.target.style.backgroundColor = "white";
                    e.target.style.boxShadow = `0 0 0 3px ${errors.address ? "rgba(220, 53, 69, 0.1)" : "rgba(162, 185, 237, 0.1)"}`;
                  }}
                  onBlur={(e) => {
                    handleBlur(e);
                    e.target.style.borderColor = errors.address ? "#dc3545" : "#e0e0e0";
                    e.target.style.backgroundColor = "#f8f9fa";
                    e.target.style.boxShadow = "none";
                  }}
                />
                {errors.address && (
                  <div style={{ marginTop: "6px", fontSize: "12px", color: "#dc3545", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>⚠️</span>
                    <span>{errors.address}</span>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr", 
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
                    <span>📞</span>
                    <span>Phone</span>
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#6c757d" }}>(optional)</span>
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="8–15 digits (e.g. 09xxxxxxxx)"
                    maxLength={15}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: `2px solid ${errors.phoneNumber ? "#dc3545" : "#e0e0e0"}`,
                      borderRadius: "10px",
                      fontSize: "15px",
                      transition: "all 0.3s ease",
                      backgroundColor: "#f8f9fa"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = errors.phoneNumber ? "#dc3545" : "#A2B9ED";
                      e.target.style.backgroundColor = "white";
                      e.target.style.boxShadow = `0 0 0 3px ${errors.phoneNumber ? "rgba(220, 53, 69, 0.1)" : "rgba(162, 185, 237, 0.1)"}`;
                    }}
                    onBlur={(e) => {
                      handleBlur(e);
                      e.target.style.borderColor = errors.phoneNumber ? "#dc3545" : "#e0e0e0";
                      e.target.style.backgroundColor = "#f8f9fa";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  {errors.phoneNumber && (
                    <div style={{
                      marginTop: "6px",
                      fontSize: "12px",
                      color: "#dc3545",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      <span>⚠️</span>
                      <span>{errors.phoneNumber}</span>
                    </div>
                  )}
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
                    setFormData({ fullName: "", dateOfBirth: "", gender: "", idNumber: "", address: "", phoneNumber: "" });
                    setMessage("");
                    setErrors({ fullName: "", phoneNumber: "", dateOfBirth: "", idNumber: "", address: "" });
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
                  disabled={uploadingDocs || submitting}
                  style={{ 
                    padding: "14px 28px", 
                    background: "linear-gradient(135deg, #A2B9ED 0%, #8BA3E0 100%)",
                    color: "white", 
                    border: "none", 
                    borderRadius: "10px", 
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 12px rgba(162, 185, 237, 0.3)"
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = "linear-gradient(135deg, #8BA3E0 0%, #7B93D0 100%)";
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 6px 16px rgba(162, 185, 237, 0.4)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = "linear-gradient(135deg, #A2B9ED 0%, #8BA3E0 100%)";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 4px 12px rgba(162, 185, 237, 0.3)";
                  }}
                >
                  {uploadingDocs ? "⏳ Uploading..." : (editingId ? "✏️ Update" : "✅ Add")}
                </button>
              </div>
            </form>
          </div>
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
                  {/* Relationship column removed - dependents considered children by default */}
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
                    {/* Relationship removed - default child */}
                    <td style={{ 
                      padding: "16px", 
                      borderBottom: "1px solid #e9ecef",
                      fontSize: "12px"
                    }}>
                      <span style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontWeight: "600",
                        backgroundColor:
                          dep.approvalStatus === "approved"
                            ? "#d4edda"
                            : dep.approvalStatus === "rejected"
                              ? "#f8d7da"
                              : "#fff3cd",
                        color:
                          dep.approvalStatus === "approved"
                            ? "#155724"
                            : dep.approvalStatus === "rejected"
                              ? "#721c24"
                              : "#856404"
                      }}>
                        {getApprovalStatusLabel(dep.approvalStatus)}
                      </span>
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
                          onClick={() => handleView(dep)}
                          style={{ 
                            padding: "6px 14px", 
                            backgroundColor: "#17a2b8", 
                            color: "white", 
                            border: "none", 
                            borderRadius: "6px", 
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "600",
                            transition: "all 0.2s ease"
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = "#138496";
                            e.target.style.transform = "translateY(-1px)";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = "#17a2b8";
                            e.target.style.transform = "translateY(0)";
                          }}
                        >
                          VIEW
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

      {/* View Dependent Modal (read-only) */}
      {showViewModal && viewDependent && (
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
            width: 820,
            maxWidth: "95%",
            backgroundColor: "white",
            borderRadius: "12px",
            padding: 20,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            overflowY: "auto",
            maxHeight: "90%"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{viewDependent.fullName}</h3>
              <button onClick={() => { setShowViewModal(false); setViewDependent(null); setExistingDocs([]); setExistingCccdDocs([]); }} style={{ border: 'none', background: 'transparent', fontSize: 20 }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><strong>Date of Birth:</strong> {viewDependent.dateOfBirth ? new Date(viewDependent.dateOfBirth).toLocaleDateString() : '—'}</div>
              <div><strong>Gender:</strong> {viewDependent.gender || '—'}</div>
              <div><strong>Phone:</strong> {viewDependent.phoneNumber || '—'}</div>
              <div><strong>Address:</strong> {viewDependent.address || '—'}</div>
            </div>

            {/* Existing documents previews */}
            {(existingDocs && existingDocs.length > 0) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Dependent Documents</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {existingDocs.map((d, i) => (
                    <div key={i} style={{ width: 140, textAlign: 'center' }}>
                      {/(jpg|jpeg|png|gif)$/i.test(d.name || d.url || '') ? (
                        <a href={d.url} target="_blank" rel="noreferrer"><img src={d.url} alt={d.name} style={{ width: 130, height: 90, objectFit: 'cover', borderRadius: 6, border: '1px solid #e9ecef' }} /></a>
                      ) : (
                        <a href={d.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', width: 130, height: 90, borderRadius: 6, border: '1px solid #e9ecef', padding: 8, background: '#fff', textDecoration: 'none', color: '#333' }}>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>Open</div>
                          <div style={{ fontSize: 11 }}>{d.name}</div>
                        </a>
                      )}
                      <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{d.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(existingCccdDocs && existingCccdDocs.length > 0) && (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>CCCD / ID Documents</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {existingCccdDocs.map((d, i) => (
                    <div key={i} style={{ width: 140, textAlign: 'center' }}>
                      {/(jpg|jpeg|png|gif)$/i.test(d.name || d.url || '') ? (
                        <a href={d.url} target="_blank" rel="noreferrer"><img src={d.url} alt={d.name} style={{ width: 130, height: 90, objectFit: 'cover', borderRadius: 6, border: '1px solid #e9ecef' }} /></a>
                      ) : (
                        <a href={d.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', width: 130, height: 90, borderRadius: 6, border: '1px solid #e9ecef', padding: 8, background: '#fff', textDecoration: 'none', color: '#333' }}>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>Open</div>
                          <div style={{ fontSize: 11 }}>{d.name}</div>
                        </a>
                      )}
                      <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{d.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
