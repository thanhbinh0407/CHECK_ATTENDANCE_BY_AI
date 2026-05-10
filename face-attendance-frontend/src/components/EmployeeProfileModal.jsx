import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { theme } from "../styles/theme.js";
import "./employeeProfileModal.css";

export default function EmployeeProfileModal({ employee, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [contractFormData, setContractFormData] = useState({
    contractType: '',
    startDate: '',
    retirementAge: 60
  });
  const [message, setMessage] = useState("");
  const [editForm, setEditForm] = useState({});
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [managers, setManagers] = useState([]);
  const [activeTab, setActiveTab] = useState("info");
  const [editingWorkExp, setEditingWorkExp] = useState(null); // null | "new" | number (work experience id)
  const [workExpForm, setWorkExpForm] = useState({
    companyName: "",
    position: "",
    startDate: "",
    endDate: "",
    description: "",
    responsibilities: "",
    achievements: "",
    isCurrent: false
  });
  const [savingWorkExp, setSavingWorkExp] = useState(false);
  const [editingQual, setEditingQual] = useState(null); // null | "new" | number
  const [qualForm, setQualForm] = useState({
    type: "degree",
    name: "",
    issuedBy: "",
    issuedDate: "",
    expiryDate: "",
    certificateNumber: "",
    description: "",
    documentPath: "",
  });
  const [savingQual, setSavingQual] = useState(false);
  const [editingDep, setEditingDep] = useState(null); // null | "new" | number
  const [depForm, setDepForm] = useState({
    fullName: "",
    relationship: "child",
    dateOfBirth: "",
    gender: "",
    idNumber: "",
    address: "",
    phoneNumber: "",
    email: "",
    occupation: "",
    notes: "",
  });
  const [savingDep, setSavingDep] = useState(false);
  // Transfer History
  const [transferHistory, setTransferHistory] = useState(null);
  const [transferHistoryLoading, setTransferHistoryLoading] = useState(false);
  /** In-modal confirm (avoids toast top-right outside this dialog). */
  const [modalConfirm, setModalConfirm] = useState(null);
  const modalConfirmResolveRef = useRef(null);

  const closeModalConfirm = useCallback((result) => {
    setModalConfirm(null);
    const resolve = modalConfirmResolveRef.current;
    modalConfirmResolveRef.current = null;
    if (resolve) resolve(result);
  }, []);

  const openModalConfirm = useCallback((opts) => {
    return new Promise((resolve) => {
      modalConfirmResolveRef.current = resolve;
      setModalConfirm({
        message: opts.message,
        confirmText: opts.confirmText ?? "Confirm",
        cancelText: opts.cancelText ?? "Cancel",
      });
    });
  }, []);

  useEffect(() => {
    if (!modalConfirm) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeModalConfirm(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalConfirm, closeModalConfirm]);

  const [validationErrors, setValidationErrors] = useState({});
  const [attendanceFilter, setAttendanceFilter] = useState(null); // { month, year } | null = auto
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [expandedLeaveId, setExpandedLeaveId] = useState(null); // leave request id whose reason is expanded
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatLocalDate = (value) => {
    const date = parseDate(value);
    return date ? date.toLocaleDateString("en-US") : "-";
  };

  const getAge = (dateOfBirth) => {
    const dob = parseDate(dateOfBirth);
    if (!dob) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age -= 1;
    }
    return age;
  };

  const getRetirementAge = (gender) => {
    if (!gender) return 60;
    const normalized = String(gender).trim().toLowerCase();
    if (normalized === "female" || normalized === "f") return 55;
    return 60;
  };

  const contractTypeLabel = (contractType) => {
    if (contractType === "probation_1_month") return "Probation (1 month)";
    if (contractType === "probation_2_month") return "Probation (2 months)";
    if (contractType === "probation_3_month") return "Probation (3 months)";
    if (contractType === "formal_1_year") return "Formal (1 year)";
    if (contractType === "formal_2_year") return "Formal (2 years)";
    if (contractType === "formal_3_year") return "Formal (3 years)";
    return "Unknown";
  };

  const calculateContractEndDate = (contractType, startDate) => {
    const hireDate = parseDate(startDate);
    if (!hireDate || !contractType) return null;
    const endDate = new Date(hireDate);
    switch (contractType) {
      case "probation_1_month":
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case "probation_2_month":
        endDate.setMonth(endDate.getMonth() + 2);
        break;
      case "probation_3_month":
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case "formal_1_year":
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case "formal_2_year":
        endDate.setFullYear(endDate.getFullYear() + 2);
        break;
      case "formal_3_year":
        endDate.setFullYear(endDate.getFullYear() + 3);
        break;
      default:
        return null;
    }
    return endDate;
  };

  const getContractStatus = (contractType, startDate, isActive = true) => {
    if (!contractType || !startDate) {
      return { status: "Pending", badge: "gray", daysUntil: null };
    }



    const endDate = calculateContractEndDate(contractType, startDate);
    if (!endDate) {
      return { status: "Active", badge: "green", daysUntil: null };
    }

    const today = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntil = Math.ceil((endDate - today) / msPerDay);

    if (daysUntil < 0) {
      return { status: "Expired", badge: "red", daysUntil };
    }
    if (daysUntil <= 30) {
      return { status: "Expiring soon", badge: "orange", daysUntil };
    }
    return { status: "Active", badge: "green", daysUntil };
  };

  const contractOverview = React.useMemo(() => {
    const contractType = employeeDetails?.contractType;
    const startDate = employeeDetails?.startDate;
    const status = getContractStatus(contractType, startDate, employeeDetails?.isActive);
    const age = getAge(employeeDetails?.dateOfBirth);
    const retirementAge = employeeDetails?.retirementAge || getRetirementAge(employeeDetails?.gender);
    const yearsToRetirement = age != null ? retirementAge - age : null;
    const warnings = [];

    if (age != null && age < 18) {
      warnings.push("Employee is under 18 years old; creating or updating records is restricted.");
    }
    if (yearsToRetirement != null && yearsToRetirement <= 2 && yearsToRetirement >= 0) {
      warnings.push("Employee is nearing retirement age. Please check contract renewal and labor rules.");
    }
    if (status.status === "Expiring soon") {
      warnings.push(`Contract expires in ${Math.max(status.daysUntil, 0)} day(s). Renew or deactivate before expiration.`);
    }
    if (status.status === "Expired") {
      warnings.push("Contract has expired. Employee should be deactivated or renewed immediately.");
    }

    return {
      contractTypeLabel: contractTypeLabel(contractType),
      contractStartDate: formatLocalDate(startDate),
      contractEndDate: formatLocalDate(calculateContractEndDate(contractType, startDate)),
      contractStatus: status.status,
      contractBadge: status.badge,
      contractDaysUntil: status.daysUntil,
      currentAge: age != null ? `${age} years` : "-",
      retirementAge: `${retirementAge} years`,
      yearsToRetirement: yearsToRetirement != null ? (yearsToRetirement >= 0 ? `${yearsToRetirement} years` : "Retirement age reached") : "-",
      warnings,
      employmentStatus: employeeDetails?.employmentStatus || "Unknown"
    };
  }, [employeeDetails]);

  const contractSigningHistory = useMemo(() => {
    const histories = Array.isArray(employeeDetails?.contractHistory)
      ? employeeDetails.contractHistory
      : [];

    const normalized = histories
      .map((item) => {
        const signedAt = item?.effectiveDate || item?.newStartDate || item?.createdAt || null;
        return {
          id: item?.id || `${item?.createdAt || "contract"}-${item?.newStartDate || ""}`,
          signedAt,
          contractType: item?.newContractType || employeeDetails?.contractType || null,
          startDate: item?.newStartDate || null,
          note: item?.note || item?.summary || "",
          signerName: item?.actor?.name || "System",
          signerCode: item?.actor?.employeeCode || "",
          source: "audit",
        };
      })
      .filter((item) => item.signedAt);

    const hasInitialInHistory = normalized.some((item) => {
      if (!employeeDetails?.startDate) return false;
      const historyDate = String(item.startDate || item.signedAt || "").slice(0, 10);
      const currentStartDate = new Date(employeeDetails.startDate).toISOString().slice(0, 10);
      return historyDate === currentStartDate;
    });

    if (!hasInitialInHistory && employeeDetails?.startDate) {
      normalized.push({
        id: `initial-${employeeDetails.id}`,
        signedAt: employeeDetails.startDate,
        contractType: employeeDetails.contractType || null,
        startDate: employeeDetails.startDate,
        note: "Initial contract",
        signerName: "System",
        signerCode: "",
        source: "initial",
      });
    }

    return normalized.sort((a, b) => {
      const aTime = new Date(a.signedAt).getTime();
      const bTime = new Date(b.signedAt).getTime();
      return bTime - aTime;
    });
  }, [employeeDetails]);

  useEffect(() => {
    if (employeeDetails) {
      setContractFormData({
        contractType: employeeDetails.contractType || '',
        startDate: employeeDetails.startDate ? new Date(employeeDetails.startDate).toISOString().split('T')[0] : '',
        retirementAge: employeeDetails.retirementAge || 60
      });
    }
  }, [employeeDetails]);

  useEffect(() => {
    if (employee) {
      setAttendanceFilter(null); // reset filter on employee switch
      fetchEmployeeDetails();
      fetchDepartments();
      fetchJobTitles();
      fetchManagers();
      fetchTransferHistory();
    }
  }, [employee]);
  useEffect(() => {
    const onMainProfileTab = activeTab === "info" || activeTab === "work";
    if (onMainProfileTab || !isEditing) return;
    setIsEditing(false);
    fetchEmployeeDetails();
  }, [activeTab, isEditing]);

  const fetchAttendanceByFilter = async (month, year) => {
    try {
      setAttendanceLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(
        `${apiBase}/api/admin/employees/${employee.id}/details?month=${month}&year=${year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) {
        setEmployeeDetails(prev => ({
          ...prev,
          attendanceStats: data.employee.attendanceStats,
          recentAttendance: data.employee.recentAttendance
        }));
      }
    } catch (e) {
      console.error("Failed to fetch attendance:", e);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleAttendanceFilterChange = (month, year) => {
    setAttendanceFilter({ month, year });
    fetchAttendanceByFilter(month, year);
  };

  const resetAttendanceFilter = () => {
    setAttendanceFilter(null);
    fetchEmployeeDetails();
  };

  const fetchEmployeeDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/admin/employees/${employee.id}/details?includeHistory=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setEmployeeDetails(data.employee);
        const emp = data.employee;
        setEditForm({
          name: emp.name || "",
          email: emp.email || "",
          personalEmail: emp.personalEmail || "",
          companyEmail: emp.companyEmail || "",
          phoneNumber: emp.phoneNumber || "",
          address: emp.address || "",
          permanentAddress: emp.permanentAddress || "",
          temporaryAddress: emp.temporaryAddress || "",
          dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split('T')[0] : "",
          gender: emp.gender || "",
          departmentId: emp.departmentId || null,
          jobTitleId: emp.jobTitleId || null,
          baseSalary: emp.baseSalary || 0,
          isActive: emp.isActive !== undefined ? emp.isActive : true,
          startDate: emp.startDate ? new Date(emp.startDate).toISOString().split('T')[0] : "",
          bankAccount: emp.bankAccount || "",
          bankName: emp.bankName || "",
          taxCode: emp.taxCode || "",
          idNumber: emp.idNumber || "",
          idIssueDate: emp.idIssueDate ? new Date(emp.idIssueDate).toISOString().split('T')[0] : "",
          idIssuePlace: emp.idIssuePlace || "",
          contractType: emp.contractType || "",
          employmentStatus: emp.employmentStatus || "active",
          managerId: emp.managerId || null,
          branchName: emp.branchName || "",
          bankBranch: emp.bankBranch || "",
          lunchAllowance: emp.lunchAllowance || 0,
          transportAllowance: emp.transportAllowance || 0,
          phoneAllowance: emp.phoneAllowance || 0,
          responsibilityAllowance: emp.responsibilityAllowance || 0,
          socialInsuranceNumber: emp.socialInsuranceNumber || "",
          healthInsuranceProvider: emp.healthInsuranceProvider || "",
          dependentCount: emp.dependentCount || 0,
          educationLevel: emp.educationLevel || "",
          major: emp.major || "",
          emergencyContactName: emp.emergencyContactName || "",
          emergencyContactRelationship: emp.emergencyContactRelationship || "",
          emergencyContactPhone: emp.emergencyContactPhone || ""
        });
      }
    } catch (err) {
      setMessage("Error loading employee information");
      console.error("Error loading employee details:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchJobTitles = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/job-titles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setJobTitles(data.jobTitles || []);
      }
    } catch (error) {
      console.error("Error fetching job titles:", error);
    }
  };

  const fetchManagers = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        // Filter out current employee and only show active employees/admins/managers
        const managerList = (data.employees || []).filter(emp => 
          emp.id !== employee?.id && 
          (emp.role === 'admin' || emp.role === 'accountant' || emp.isActive)
        );
        setManagers(managerList);
      }
    } catch (error) {
      console.error("Error fetching managers:", error);
    }
  };

  const fetchTransferHistory = async () => {
    try {
      setTransferHistoryLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/admin/employees/${employee?.id}/history?historyType=job&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.jobHistory) {
        setTransferHistory(data.jobHistory);
      } else {
        setTransferHistory([]);
      }
    } catch (error) {
      console.error("Error fetching transfer history:", error);
      setTransferHistory([]);
    } finally {
      setTransferHistoryLoading(false);
    }
  };

  // Validation functions
  const validateField = (fieldName, value) => {
    let error = "";
    
    switch (fieldName) {
      case "name":
        if (!value || value.trim().length < 2) {
          error = "Full Name must be at least 2 characters";
        } else if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(value)) {
          error = "Full Name can only contain letters and spaces";
        }
        break;
      case "idNumber":
        if (!value || value.trim().length === 0) {
          error = "ID Number is required";
        } else if (!/^\d{12}$/.test(value)) {
          error = "ID Number must be exactly 12 digits";
        }
        break;
      case "idIssuePlace":
        // Only validate if ID Number is provided and valid (12 digits)
        if (editForm.idNumber && editForm.idNumber.trim().length === 12) {
          if (!value || value.trim().length < 3) {
            error = "ID Issue Place must be at least 3 characters";
          }
        }
        break;
      case "permanentAddress":
        if (!value || value.trim().length < 10) {
          error = "Permanent Address must be at least 10 characters";
        }
        break;
      case "temporaryAddress":
        if (!value || value.trim().length < 10) {
          error = "Temporary Address must be at least 10 characters";
        }
        break;
      case "personalEmail":
        if (!value || value.trim().length === 0) {
          error = "Personal Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = "Personal Email must be a valid email address";
        }
        break;
      case "emergencyContactName":
        if (!value || value.trim().length < 2) {
          error = "Emergency Contact Name must be at least 2 characters";
        } else if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(value)) {
          error = "Emergency Contact Name can only contain letters and spaces";
        }
        break;
      case "emergencyContactPhone":
        if (!value || value.trim().length === 0) {
          error = "Emergency Contact Phone is required";
        } else if (!/^0\d{9,10}$/.test(value)) {
          error = "Emergency Contact Phone must be a valid Vietnamese phone number (10-11 digits, starts with 0)";
        }
        break;
      default:
        break;
    }
    
    return error;
  };

  const validateForm = () => {
    const errors = {};
    
    // Validate all required fields
    const nameError = validateField("name", editForm.name);
    if (nameError) errors.name = nameError;
    
    const idNumberError = validateField("idNumber", editForm.idNumber);
    if (idNumberError) errors.idNumber = idNumberError;
    
    // Only validate idIssuePlace if idNumber exists and is valid
    if (editForm.idNumber && editForm.idNumber.trim().length === 12) {
      const idIssuePlaceError = validateField("idIssuePlace", editForm.idIssuePlace);
      if (idIssuePlaceError) errors.idIssuePlace = idIssuePlaceError;
    }
    
    const permanentAddressError = validateField("permanentAddress", editForm.permanentAddress);
    if (permanentAddressError) errors.permanentAddress = permanentAddressError;
    
    const temporaryAddressError = validateField("temporaryAddress", editForm.temporaryAddress);
    if (temporaryAddressError) errors.temporaryAddress = temporaryAddressError;
    
    const personalEmailError = validateField("personalEmail", editForm.personalEmail);
    if (personalEmailError) errors.personalEmail = personalEmailError;
    
    const emergencyContactNameError = validateField("emergencyContactName", editForm.emergencyContactName);
    if (emergencyContactNameError) errors.emergencyContactName = emergencyContactNameError;
    
    const emergencyContactPhoneError = validateField("emergencyContactPhone", editForm.emergencyContactPhone);
    if (emergencyContactPhoneError) errors.emergencyContactPhone = emergencyContactPhoneError;
    
    setValidationErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    
    // Debug: log validation errors if any
    if (!isValid) {
      console.log("Validation errors:", errors);
    }
    
    // Return both isValid and errors for scroll functionality
    return { isValid, errors };
  };

  const handleSave = async () => {
    // Validate form before saving
    const { isValid, errors } = validateForm();
    if (!isValid) {
      const errorCount = Object.keys(errors).length;
      setMessage(`Please correct the ${errorCount} error${errorCount > 1 ? 's' : ''} before saving`);
      console.log("Validation errors preventing save:", errors);
      
      // Scroll to first error field
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        // Wait a bit for validation errors to render and state to update
        setTimeout(() => {
          const errorElement = document.querySelector(`[data-field="${firstErrorField}"]`);
          if (errorElement) {
            // Scroll to the element
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add a highlight effect
            const originalBoxShadow = errorElement.style.boxShadow;
            errorElement.style.transition = 'box-shadow 0.3s';
            errorElement.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.3)';
            setTimeout(() => {
              errorElement.style.boxShadow = originalBoxShadow;
            }, 2000);
            
            // Focus on the input field if it exists
            const inputElement = errorElement.querySelector('input, textarea, select');
            if (inputElement) {
              inputElement.focus();
              // Select text if it's an input (not textarea)
              if (inputElement.tagName === 'INPUT' && inputElement.type !== 'date') {
                inputElement.select();
              }
            }
          }
        }, 200);
      }
      
      setTimeout(() => setMessage(""), 5000);
      return;
    }

    const age = getAge(editForm.dateOfBirth);
    if (age != null && age < 18) {
      setMessage("Cannot save: employee age must be at least 18 years old.");
      setTimeout(() => setMessage(""), 5000);
      return;
    }

    // If ID Number changed or provided, check uniqueness on server
    try {
      const newId = String(editForm.idNumber || "").replace(/\D/g, "");
      const currentId = String(employeeDetails?.idNumber || "").replace(/\D/g, "");
      if (newId && newId !== currentId) {
        const token = localStorage.getItem("authToken");
        const q = new URLSearchParams({ idNumber: newId, excludeId: String(employee.id) });
        const chkRes = await fetch(`${apiBase}/api/admin/employees/check-id?${q.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const chk = await chkRes.json().catch(() => ({}));
        if (chkRes.ok && chk.exists) {
          setValidationErrors(prev => ({ ...prev, idNumber: "CCCD is already registered" }));
          setMessage("Please correct validation errors before saving");
          setTimeout(() => setMessage(""), 4000);
          return;
        }
      }
    } catch (err) {
      console.warn("ID uniqueness check failed, continuing to save (server may validate):", err);
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      
      // Sync email and companyEmail - they are the same (company email)
      const companyEmail = editForm.email || editForm.companyEmail || employeeDetails?.email || employeeDetails?.companyEmail;
      const contractStartDate = employeeDetails?.startDate
        ? new Date(employeeDetails.startDate).toISOString().split('T')[0]
        : null;
      const toNumberOrNull = (value) => {
        if (value === "" || value === null || value === undefined) return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const formData = {
        name: editForm.name,
        email: companyEmail,
        companyEmail: companyEmail,
        personalEmail: editForm.personalEmail || null,
        phoneNumber: editForm.phoneNumber || null,
        address: editForm.address || null,
        permanentAddress: editForm.permanentAddress || null,
        temporaryAddress: editForm.temporaryAddress || null,
        dateOfBirth: editForm.dateOfBirth || null,
        gender: editForm.gender || null,
        idNumber: editForm.idNumber || null,
        idIssueDate: editForm.idIssueDate || null,
        idIssuePlace: editForm.idIssuePlace || null,
        educationLevel: editForm.educationLevel || null,
        major: editForm.major || null,
        emergencyContactName: editForm.emergencyContactName || null,
        emergencyContactRelationship: editForm.emergencyContactRelationship || null,
        emergencyContactPhone: editForm.emergencyContactPhone || null,
        departmentId: toNumberOrNull(editForm.departmentId),
        jobTitleId: toNumberOrNull(editForm.jobTitleId),
        baseSalary: editForm.baseSalary === "" || editForm.baseSalary === null || editForm.baseSalary === undefined ? 0 : Number(editForm.baseSalary),
        isActive: !!editForm.isActive,
        // Start date is controlled by Employment Contract and is not editable in Work.
        startDate: contractStartDate,
        bankAccount: editForm.bankAccount || null,
        bankName: editForm.bankName || null,
        taxCode: editForm.taxCode || null,
        contractType: editForm.contractType || null,
        employmentStatus: editForm.employmentStatus || null,
        managerId: toNumberOrNull(editForm.managerId),
        branchName: editForm.branchName || null,
        bankBranch: editForm.bankBranch || null,
        lunchAllowance: Number(editForm.lunchAllowance || 0),
        transportAllowance: Number(editForm.transportAllowance || 0),
        phoneAllowance: Number(editForm.phoneAllowance || 0),
        responsibilityAllowance: Number(editForm.responsibilityAllowance || 0),
        socialInsuranceNumber: editForm.socialInsuranceNumber || null,
        healthInsuranceProvider: editForm.healthInsuranceProvider || null,
        dependentCount: Number(editForm.dependentCount || 0),
      };
      
      console.log("Saving form data:", formData);
      
      const res = await fetch(`${apiBase}/api/admin/employees/${employee.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      console.log("Save response:", data);
      if (res.ok) {
        setMessage("Updated successfully");
        setValidationErrors({});
        setIsEditing(false);
        fetchEmployeeDetails();
        if (onUpdate) onUpdate();
        setTimeout(() => setMessage(""), 3000);
      } else {
        console.error("Save error:", data);
        setMessage("Error: " + (data.message || "Unable to update"));
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContract = async () => {
    // Validate contract form
    if (!contractFormData.contractType) {
      setMessage("Contract type is required");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    if (!contractFormData.startDate) {
      setMessage("Start date is required");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    // Prevent choosing a start date in the past
    const todayISO = new Date().toISOString().split('T')[0];
    if (contractFormData.startDate < todayISO) {
      setMessage("Start date cannot be in the past");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    if (contractFormData.retirementAge < 50 || contractFormData.retirementAge > 70) {
      setMessage("Retirement age must be between 50 and 70");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      
      const formData = {
        contractType: contractFormData.contractType,
        startDate: contractFormData.startDate,
        retirementAge: contractFormData.retirementAge
      };
      
      console.log("Saving contract data:", formData);
      
      const res = await fetch(`${apiBase}/api/admin/employees/${employee.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      console.log("Contract save response:", data);
      if (res.ok) {
        setMessage("Contract updated successfully");
        setIsEditingContract(false);
        fetchEmployeeDetails();
        if (onUpdate) onUpdate();
        setTimeout(() => setMessage(""), 3000);
      } else {
        console.error("Contract save error:", data);
        setMessage("Error: " + (data.message || "Unable to update contract"));
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorkExp = async () => {
    if (!workExpForm.companyName || !workExpForm.position) {
      setMessage("Company name and position are required");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    try {
      setSavingWorkExp(true);
      const token = localStorage.getItem("authToken");
      const employeePk = Number(employee.id);
      const url = editingWorkExp === "new" 
        ? `${apiBase}/api/work-experiences/${employeePk}`
        : `${apiBase}/api/work-experiences/${editingWorkExp}`;
      const method = editingWorkExp === "new" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(workExpForm)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(editingWorkExp === "new" ? "Work experience added successfully!" : "Work experience updated successfully!");
        setEditingWorkExp(null);
        setWorkExpForm({
          companyName: "",
          position: "",
          startDate: "",
          endDate: "",
          description: "",
          responsibilities: "",
          achievements: "",
          isCurrent: false
        });
        fetchEmployeeDetails();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Unable to save work experience"));
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      setMessage("Error: " + error.message);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setSavingWorkExp(false);
    }
  };

  const handleCancelWorkExp = () => {
    setEditingWorkExp(null);
    setWorkExpForm({
      companyName: "",
      position: "",
      startDate: "",
      endDate: "",
      description: "",
      responsibilities: "",
      achievements: "",
      isCurrent: false
    });
  };

  const handleDeleteWorkExp = async (id) => {
    const ok = await openModalConfirm({ message: "Delete this work experience?" });
    if (!ok) return;

    try {
      setSavingWorkExp(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/work-experiences/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Work experience deleted successfully!");
        fetchEmployeeDetails();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Unable to delete work experience"));
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      setMessage("Error: " + error.message);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setSavingWorkExp(false);
    }
  };

  const resetQualForm = () =>
    setQualForm({
      type: "degree",
      name: "",
      issuedBy: "",
      issuedDate: "",
      expiryDate: "",
      certificateNumber: "",
      description: "",
      documentPath: "",
    });

  const resetDepForm = () =>
    setDepForm({
      fullName: "",
      relationship: "child",
      dateOfBirth: "",
      gender: "",
      idNumber: "",
      address: "",
      phoneNumber: "",
      email: "",
      occupation: "",
      notes: "",
    });

  const handleSaveQual = async () => {
    if (!employee?.id) return;
    if (!qualForm.type || !qualForm.name?.trim()) {
      setMessage("Qualification type and name are required");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    const employeePk = Number(employee.id);
    try {
      setSavingQual(true);
      const token = localStorage.getItem("authToken");
      const url =
        editingQual === "new"
          ? `${apiBase}/api/qualifications`
          : `${apiBase}/api/qualifications/${editingQual}`;
      const method = editingQual === "new" ? "POST" : "PUT";
      const body =
        editingQual === "new"
          ? {
              userId: employeePk,
              type: qualForm.type,
              name: qualForm.name.trim(),
              issuedBy: qualForm.issuedBy?.trim() || null,
              issuedDate: qualForm.issuedDate || null,
              expiryDate: qualForm.expiryDate || null,
              certificateNumber: qualForm.certificateNumber?.trim() || null,
              description: qualForm.description?.trim() || null,
              documentPath: qualForm.documentPath?.trim() || null,
            }
          : {
              type: qualForm.type,
              name: qualForm.name.trim(),
              issuedBy: qualForm.issuedBy?.trim() || null,
              issuedDate: qualForm.issuedDate || null,
              expiryDate: qualForm.expiryDate || null,
              certificateNumber: qualForm.certificateNumber?.trim() || null,
              description: qualForm.description?.trim() || null,
              documentPath: qualForm.documentPath?.trim() || null,
            };

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(editingQual === "new" ? "Qualification added." : "Qualification updated.");
        setEditingQual(null);
        resetQualForm();
        fetchEmployeeDetails();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Unable to save qualification"));
        setTimeout(() => setMessage(""), 4000);
      }
    } catch (error) {
      setMessage("Error: " + error.message);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setSavingQual(false);
    }
  };

  const handleCancelQual = () => {
    setEditingQual(null);
    resetQualForm();
  };

  const handleDeleteQual = async (id) => {
    const ok = await openModalConfirm({ message: "Delete this qualification / certificate?" });
    if (!ok) return;
    try {
      setSavingQual(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/qualifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Qualification deleted.");
        fetchEmployeeDetails();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Unable to delete"));
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      setMessage("Error: " + error.message);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setSavingQual(false);
    }
  };

  const handleSaveDep = async () => {
    if (!employee?.id) return;
    if (!depForm.fullName?.trim() || !depForm.relationship) {
      setMessage("Dependent name and relationship are required");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    const employeePk = Number(employee.id);
    try {
      setSavingDep(true);
      const token = localStorage.getItem("authToken");
      const url =
        editingDep === "new" ? `${apiBase}/api/dependents` : `${apiBase}/api/dependents/${editingDep}`;
      const method = editingDep === "new" ? "POST" : "PUT";
      const payload =
        editingDep === "new"
          ? {
              userId: employeePk,
              fullName: depForm.fullName.trim(),
              relationship: depForm.relationship,
              dateOfBirth: depForm.dateOfBirth || null,
              gender: depForm.gender || null,
              idNumber: depForm.idNumber?.trim() || null,
              address: depForm.address?.trim() || null,
              phoneNumber: depForm.phoneNumber?.trim() || null,
              email: depForm.email?.trim() || null,
              occupation: depForm.occupation?.trim() || null,
              notes: depForm.notes?.trim() || null,
            }
          : {
              fullName: depForm.fullName.trim(),
              relationship: depForm.relationship,
              dateOfBirth: depForm.dateOfBirth || null,
              gender: depForm.gender || null,
              idNumber: depForm.idNumber?.trim() || null,
              address: depForm.address?.trim() || null,
              phoneNumber: depForm.phoneNumber?.trim() || null,
              email: depForm.email?.trim() || null,
              occupation: depForm.occupation?.trim() || null,
              notes: depForm.notes?.trim() || null,
            };

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(editingDep === "new" ? "Dependent added." : "Dependent updated.");
        setEditingDep(null);
        resetDepForm();
        fetchEmployeeDetails();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Unable to save dependent"));
        setTimeout(() => setMessage(""), 4000);
      }
    } catch (error) {
      setMessage("Error: " + error.message);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setSavingDep(false);
    }
  };

  const handleCancelDep = () => {
    setEditingDep(null);
    resetDepForm();
  };

  const handleDeleteDep = async (id) => {
    const ok = await openModalConfirm({ message: "Delete this dependent?" });
    if (!ok) return;
    try {
      setSavingDep(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/dependents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Dependent deleted.");
        fetchEmployeeDetails();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error: " + (data.message || "Unable to delete"));
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      setMessage("Error: " + error.message);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setSavingDep(false);
    }
  };

  const workExperienceListForGrid = useMemo(() => {
    const all = employeeDetails?.WorkExperiences ?? [];
    if (editingWorkExp != null && editingWorkExp !== "new") {
      return all.filter((e) => Number(e.id) !== Number(editingWorkExp));
    }
    return all;
  }, [employeeDetails?.WorkExperiences, editingWorkExp]);

  const workExperienceTotalCount = (employeeDetails?.WorkExperiences ?? []).length;

  const qualListForGrid = useMemo(() => {
    const all = employeeDetails?.Qualifications ?? employeeDetails?.qualifications ?? [];
    if (editingQual != null && editingQual !== "new") {
      return all.filter((q) => Number(q.id) !== Number(editingQual));
    }
    return all;
  }, [employeeDetails?.Qualifications, employeeDetails?.qualifications, editingQual]);

  const qualTotalCount = (employeeDetails?.Qualifications ?? employeeDetails?.qualifications ?? []).length;

  const depListForGrid = useMemo(() => {
    const all = employeeDetails?.Dependents ?? employeeDetails?.dependents ?? [];
    if (editingDep != null && editingDep !== "new") {
      return all.filter((d) => Number(d.id) !== Number(editingDep));
    }
    return all;
  }, [employeeDetails?.Dependents, employeeDetails?.dependents, editingDep]);

  const depTotalCount = (employeeDetails?.Dependents ?? employeeDetails?.dependents ?? []).length;

  const approvalBadgeStyle = (status) => {
    const st = status || "pending";
    if (st === "approved") return { label: "Approved", bg: "#d4edda", color: "#155724" };
    if (st === "rejected") return { label: "Rejected", bg: "#f8d7da", color: "#721c24" };
    return { label: "Pending", bg: "#fff3cd", color: "#856404" };
  };

  if (!employee) return null;

  const modalOverlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: theme.spacing.xl,
    overflowY: "auto"
  };

  const modalContentStyle = {
    position: "relative",
    backgroundColor: theme.neutral.white,
    borderRadius: theme.radius.xl,
    width: "100%",
    maxWidth: "1200px",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: theme.shadows.xl,
    "--epm-accent": theme.primary.main
  };

  const headerStyle = {
    background: theme.gradients.primary,
    color: theme.neutral.white,
    padding: "16px 22px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  };

  const contentStyle = {
    flex: 1,
    overflowY: "auto"
  };

  const valueStyle = {
    fontSize: "16px",
    fontWeight: 500,
    color: theme.neutral.gray900
  };

  const inputStyle = {
    width: "100%",
    padding: theme.spacing.md,
    border: `1px solid ${theme.neutral.gray300}`,
    borderRadius: theme.radius.md,
    fontSize: "14px",
    fontFamily: "inherit"
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        {modalConfirm ? (
          <div
            role="presentation"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 100,
              backgroundColor: "rgba(15, 23, 42, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: theme.spacing.lg,
              borderRadius: theme.radius.xl,
            }}
            onClick={() => closeModalConfirm(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="epm-confirm-title"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: theme.neutral.white,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.xl,
                maxWidth: 400,
                width: "100%",
                boxShadow: theme.shadows.xl,
              }}
            >
              <p id="epm-confirm-title" style={{ margin: `0 0 ${theme.spacing.md} 0`, fontSize: "16px", fontWeight: 600, color: theme.neutral.gray900 }}>
                {modalConfirm.message}
              </p>
              <div style={{ display: "flex", gap: theme.spacing.sm, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => closeModalConfirm(false)}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    cursor: "pointer",
                    border: `1px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.md,
                    background: theme.neutral.gray100,
                    fontWeight: 600,
                    fontSize: "14px",
                  }}
                >
                  {modalConfirm.cancelText}
                </button>
                <button
                  type="button"
                  onClick={() => closeModalConfirm(true)}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    cursor: "pointer",
                    border: "none",
                    borderRadius: theme.radius.md,
                    background: theme.primary.main,
                    color: theme.neutral.white,
                    fontWeight: 600,
                    fontSize: "14px",
                  }}
                >
                  {modalConfirm.confirmText}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>
              {employeeDetails?.name || employee.name}
            </h2>
            <p style={{ margin: `${theme.spacing.xs} 0 0 0`, fontSize: "14px", opacity: 0.9 }}>
              {employeeDetails?.employeeCode || employee.employeeCode} | {employeeDetails?.email || employee.email}
            </p>
          </div>
          <div style={{ display: "flex", gap: theme.spacing.sm, alignItems: "center" }}>
            {!isEditing && (activeTab === "info" || activeTab === "work") && (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  color: theme.neutral.white,
                  border: "none",
                  borderRadius: theme.radius.md,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "14px"
                }}
              >
                ✏️ Edit
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: "rgba(255,255,255,0.2)",
                color: theme.neutral.white,
                border: "none",
                borderRadius: theme.radius.md,
                cursor: "pointer",
                fontSize: "20px",
                fontWeight: 700
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {message && (
          <div style={{
            padding: theme.spacing.md,
            margin: theme.spacing.md,
            backgroundColor: (message.includes("successfully") || message.toLowerCase().includes("success")) ? "#d4edda" : "#f8d7da",
            color: (message.includes("successfully") || message.toLowerCase().includes("success")) ? "#155724" : "#721c24",
            borderRadius: theme.radius.md,
            fontSize: "14px"
          }}>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="epm-tabs-scroll">
          <div className="epm-tabs-scroll-inner">
            <div className="epm-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "info"}
                className={activeTab === "info" ? "epm-tab epm-tab--active" : "epm-tab"}
                onClick={() => setActiveTab("info")}
              >
                Personal
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "work"}
                className={activeTab === "work" ? "epm-tab epm-tab--active" : "epm-tab"}
                onClick={() => setActiveTab("work")}
              >
                Work
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "contract"}
                className={activeTab === "contract" ? "epm-tab epm-tab--active" : "epm-tab"}
                onClick={() => setActiveTab("contract")}
              >
                Employment Contract
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "family"}
                className={activeTab === "family" ? "epm-tab epm-tab--active" : "epm-tab"}
                onClick={() => setActiveTab("family")}
              >
                Family
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "qualifications"}
                className={activeTab === "qualifications" ? "epm-tab epm-tab--active" : "epm-tab"}
                onClick={() => setActiveTab("qualifications")}
              >
                Qualifications
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "experience"}
                className={activeTab === "experience" ? "epm-tab epm-tab--active" : "epm-tab"}
                onClick={() => setActiveTab("experience")}
              >
                Experience
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "attendance"}
                className={activeTab === "attendance" ? "epm-tab epm-tab--active" : "epm-tab"}
                onClick={() => setActiveTab("attendance")}
              >
                Attendance
              </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "transfer"}
                  className={activeTab === "transfer" ? "epm-tab epm-tab--active" : "epm-tab"}
                  onClick={() => setActiveTab("transfer")}
                >
                  Transfer History
                </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={contentStyle} className="epm-body">
          {loading && !employeeDetails ? (
            <div style={{ textAlign: "center", padding: theme.spacing.xxl }}>
              Loading...
            </div>
          ) : (
            <>
              {/* Tab: Thông tin cá nhân */}
              {activeTab === "info" && (
                <div>
                  {employeeDetails && contractOverview.warnings.length > 0 && (
                    <div className="epm-contract-warning" style={{ marginBottom: theme.spacing.lg }}>
                      <strong>Warning:</strong>
                      <ul style={{ margin: "10px 0 0 20px", padding: 0 }}>
                        {contractOverview.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Face Profiles Section */}
                  {employeeDetails?.FaceProfiles && employeeDetails.FaceProfiles.length > 0 && (
                    <div className="epm-section" style={{ marginBottom: 18 }}>
                      <h4 className="epm-section-title">Face enrollment</h4>
                      <div className="epm-face">
                        <div className="epm-face-head">
                          Registered ({employeeDetails.FaceProfiles.length})
                        </div>
                        <div className="epm-face-grid">
                          {employeeDetails.FaceProfiles.map((profile, idx) => (
                            profile.imageUrl ? (
                              <div key={profile.id} className="epm-face-thumb">
                                <img
                                  src={`${import.meta.env.VITE_API_BASE || "http://localhost:5000"}${profile.imageUrl}`}
                                  alt={`Face ${idx + 1}`}
                                  onError={(e) => {
                                    e.target.parentElement.style.display = "none";
                                  }}
                                />
                                <div style={{
                                  position: "absolute",
                                  bottom: "4px",
                                  right: "4px",
                                  backgroundColor: "rgba(0,0,0,0.65)",
                                  color: "white",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  fontWeight: "600"
                                }}>
                                  #{idx + 1}
                                </div>
                              </div>
                            ) : null
                          ))}
                        </div>
                        <div className="epm-face-meta">
                          Registered on:{" "}
                          {new Date(employeeDetails.FaceProfiles[0].createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="epm-section">
                    <h4 className="epm-section-title">Contact & profile</h4>
                    <div className="epm-fields" onClick={(e) => e.stopPropagation()}>
                    {/* Employee ID - Read-only */}
                    <div className="epm-field">
                      <label className="epm-label">Employee ID</label>
                      <div style={valueStyle}>{employeeDetails?.employeeCode || employee?.employeeCode || "-"}</div>
                    </div>

                    {/* Full Name */}
                    <div className="epm-field" data-field="name">
                      <label className="epm-label">Full Name *</label>
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => {
                              let value = e.target.value;
                              // Auto-capitalize first letter of each word and filter non-alphabetic
                              value = value.replace(/[^a-zA-ZÀ-ỹ\s]/g, '');
                              value = value.split(' ').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                              ).join(' ');
                              setEditForm({ ...editForm, name: value });
                              const error = validateField("name", value);
                              setValidationErrors({ ...validationErrors, name: error });
                            }}
                            onBlur={(e) => {
                              const error = validateField("name", e.target.value);
                              setValidationErrors({ ...validationErrors, name: error });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              ...inputStyle,
                              borderColor: validationErrors.name ? theme.error.main : inputStyle.border
                            }}
                            placeholder="Enter full name"
                          />
                          {validationErrors.name && (
                            <div style={{ color: theme.error.main, fontSize: "12px", marginTop: "4px" }}>
                              {validationErrors.name}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.name || "-"}</div>
                      )}
                    </div>

                    {/* Company Email (Login) - Read-only */}
                    <div className="epm-field">
                      <label className="epm-label">Company Email (Login) *</label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editForm.email || editForm.companyEmail || employeeDetails?.email || employeeDetails?.companyEmail || ""}
                          readOnly
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            ...inputStyle,
                            backgroundColor: theme.neutral.gray100,
                            cursor: "not-allowed"
                          }}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.email || employeeDetails?.companyEmail || "-"}</div>
                      )}
                    </div>

                    <div className="epm-field" data-field="personalEmail">
                      <label className="epm-label">Personal Email *</label>
                      {isEditing ? (
                        <>
                          <input
                            type="email"
                            value={editForm.personalEmail}
                            onChange={(e) => {
                              setEditForm({ ...editForm, personalEmail: e.target.value });
                              const error = validateField("personalEmail", e.target.value);
                              setValidationErrors({ ...validationErrors, personalEmail: error });
                            }}
                            onBlur={(e) => {
                              const error = validateField("personalEmail", e.target.value);
                              setValidationErrors({ ...validationErrors, personalEmail: error });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              ...inputStyle,
                              borderColor: validationErrors.personalEmail ? theme.error.main : inputStyle.border
                            }}
                            placeholder="Enter personal email"
                          />
                          {validationErrors.personalEmail && (
                            <div style={{ color: theme.error.main, fontSize: "12px", marginTop: "4px" }}>
                              {validationErrors.personalEmail}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.personalEmail || "-"}</div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Phone Number</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.phoneNumber}
                          onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.phoneNumber || "-"}</div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Date of Birth</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.dateOfBirth}
                          onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.dateOfBirth ? new Date(employeeDetails.dateOfBirth).toLocaleDateString('en-US') : "-"}
                        </div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Gender</label>
                      {isEditing ? (
                        <select
                          value={editForm.gender}
                          onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.gender === "male" ? "Male" : 
                           employeeDetails?.gender === "female" ? "Female" : 
                           employeeDetails?.gender === "other" ? "Other" : "-"}
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                  <div className="epm-section">
                    <h4 className="epm-section-title">Identity documents</h4>
                    <div className="epm-fields" onClick={(e) => e.stopPropagation()}>
                    {/* ID Number CCCD */}
                    <div className="epm-field" data-field="idNumber">
                      <label className="epm-label">ID Number CCCD *</label>
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editForm.idNumber}
                            onChange={(e) => {
                              let value = e.target.value.replace(/\D/g, '').slice(0, 12);
                              setEditForm({ ...editForm, idNumber: value });
                              const error = validateField("idNumber", value);
                              setValidationErrors({ ...validationErrors, idNumber: error });
                            }}
                            onBlur={async (e) => {
                                const raw = e.target.value || "";
                                const error = validateField("idNumber", raw);
                                setValidationErrors({ ...validationErrors, idNumber: error });

                                // If format OK and differs from current stored value, check uniqueness
                                const normalized = String(raw).replace(/\D/g, '');
                                const current = String(employeeDetails?.idNumber || '').replace(/\D/g, '');
                                if (!error && normalized && normalized !== current) {
                                  try {
                                    const token = localStorage.getItem('authToken');
                                    const q = new URLSearchParams({ idNumber: normalized, excludeId: String(employee.id) });
                                    const resp = await fetch(`${apiBase}/api/admin/employees/check-id?${q.toString()}`, {
                                      headers: { Authorization: `Bearer ${token}` }
                                    });
                                    const body = await resp.json().catch(() => ({}));
                                    if (resp.ok && body.exists) {
                                      setValidationErrors(prev => ({ ...prev, idNumber: 'CCCD is already registered' }));
                                    }
                                  } catch (err) {
                                    console.warn('Failed id uniqueness check:', err);
                                  }
                                }
                              }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              ...inputStyle,
                              borderColor: validationErrors.idNumber ? theme.error.main : inputStyle.border
                            }}
                            placeholder="Enter 12-digit CCCD number"
                          />
                          {validationErrors.idNumber && (
                            <div style={{ color: theme.error.main, fontSize: "12px", marginTop: "4px" }}>
                              {validationErrors.idNumber}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.idNumber || "-"}</div>
                      )}
                    </div>

                    {/* ID Issue Date */}
                    <div className="epm-field">
                      <label className="epm-label">ID Issue Date</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.idIssueDate}
                          onChange={(e) => setEditForm({ ...editForm, idIssueDate: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.idIssueDate ? new Date(employeeDetails.idIssueDate).toLocaleDateString('en-US') : "-"}
                        </div>
                      )}
                    </div>

                    {/* ID Issue Place */}
                    <div className="epm-field" data-field="idIssuePlace">
                      <label className="epm-label">ID Issue Place *</label>
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editForm.idIssuePlace}
                            onChange={(e) => {
                              setEditForm({ ...editForm, idIssuePlace: e.target.value });
                              const error = validateField("idIssuePlace", e.target.value);
                              setValidationErrors({ ...validationErrors, idIssuePlace: error });
                            }}
                            onBlur={(e) => {
                              const error = validateField("idIssuePlace", e.target.value);
                              setValidationErrors({ ...validationErrors, idIssuePlace: error });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              ...inputStyle,
                              borderColor: validationErrors.idIssuePlace ? theme.error.main : inputStyle.border
                            }}
                            placeholder="Enter ID issue place"
                          />
                          {validationErrors.idIssuePlace && (
                            <div style={{ color: theme.error.main, fontSize: "12px", marginTop: "4px" }}>
                              {validationErrors.idIssuePlace}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.idIssuePlace || "-"}</div>
                      )}
                    </div>
                    </div>
                  </div>
                  <div className="epm-section">
                    <h4 className="epm-section-title">Education</h4>
                    <div className="epm-fields" onClick={(e) => e.stopPropagation()}>
                    <div className="epm-field">
                      <label className="epm-label">Education Level</label>
                      {isEditing ? (
                        <select
                          value={editForm.educationLevel || ""}
                          onChange={(e) => setEditForm({ ...editForm, educationLevel: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          style={inputStyle}
                        >
                          <option value="">Select education level</option>
                          <option value="high_school">High School</option>
                          <option value="vocational">Vocational</option>
                          <option value="college">College</option>
                          <option value="university">University</option>
                          <option value="master">Master's Degree</option>
                          <option value="phd">PhD</option>
                          <option value="other">Other</option>
                        </select>
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.educationLevel === "high_school" ? "High School" :
                           employeeDetails?.educationLevel === "vocational" ? "Vocational" :
                           employeeDetails?.educationLevel === "college" ? "College" :
                           employeeDetails?.educationLevel === "university" ? "University" :
                           employeeDetails?.educationLevel === "master" ? "Master's Degree" :
                           employeeDetails?.educationLevel === "phd" ? "PhD" :
                           employeeDetails?.educationLevel === "other" ? "Other" : "-"}
                        </div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Major / Specialization</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.major}
                          onChange={(e) => setEditForm({ ...editForm, major: e.target.value })}
                          style={inputStyle}
                          placeholder="Training major"
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.major || "-"}</div>
                      )}
                    </div>
                    </div>
                  </div>
                  <div className="epm-section">
                    <h4 className="epm-section-title">Addresses</h4>
                    <div className="epm-fields" onClick={(e) => e.stopPropagation()}>
                    {/* Permanent Address */}
                    <div className="epm-field epm-field--full" data-field="permanentAddress">
                      <label className="epm-label">Permanent Address *</label>
                      {isEditing ? (
                        <>
                          <textarea
                            value={editForm.permanentAddress}
                            onChange={(e) => {
                              setEditForm({ ...editForm, permanentAddress: e.target.value });
                              const error = validateField("permanentAddress", e.target.value);
                              setValidationErrors({ ...validationErrors, permanentAddress: error });
                            }}
                            onBlur={(e) => {
                              const error = validateField("permanentAddress", e.target.value);
                              setValidationErrors({ ...validationErrors, permanentAddress: error });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            rows={3}
                            style={{
                              ...inputStyle,
                              borderColor: validationErrors.permanentAddress ? theme.error.main : inputStyle.border
                            }}
                            placeholder="Enter permanent address (according to household registration)"
                          />
                          {validationErrors.permanentAddress && (
                            <div style={{ color: theme.error.main, fontSize: "12px", marginTop: "4px" }}>
                              {validationErrors.permanentAddress}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.permanentAddress || "-"}</div>
                      )}
                    </div>

                    {/* Temporary Address */}
                    <div className="epm-field epm-field--full" data-field="temporaryAddress">
                      <label className="epm-label">Temporary Address *</label>
                      {isEditing ? (
                        <>
                          <textarea
                            value={editForm.temporaryAddress}
                            onChange={(e) => {
                              setEditForm({ ...editForm, temporaryAddress: e.target.value });
                              const error = validateField("temporaryAddress", e.target.value);
                              setValidationErrors({ ...validationErrors, temporaryAddress: error });
                            }}
                            onBlur={(e) => {
                              const error = validateField("temporaryAddress", e.target.value);
                              setValidationErrors({ ...validationErrors, temporaryAddress: error });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            rows={3}
                            style={{
                              ...inputStyle,
                              borderColor: validationErrors.temporaryAddress ? theme.error.main : inputStyle.border
                            }}
                            placeholder="Enter temporary address (current address)"
                          />
                          {validationErrors.temporaryAddress && (
                            <div style={{ color: theme.error.main, fontSize: "12px", marginTop: "4px" }}>
                              {validationErrors.temporaryAddress}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.temporaryAddress || "-"}</div>
                      )}
                    </div>


                  </div>
                </div>

                  <div className="epm-section">
                    <h4 className="epm-section-title">Emergency contact</h4>
                    <div className="epm-fields" onClick={(e) => e.stopPropagation()}>
                    <div className="epm-field" data-field="emergencyContactName">
                      <label className="epm-label">Emergency Contact Name *</label>
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editForm.emergencyContactName}
                            onChange={(e) => {
                              let value = e.target.value;
                              // Auto-capitalize first letter of each word and filter non-alphabetic (including Vietnamese)
                              value = value.replace(/[^a-zA-ZÀ-ỹ\s]/g, '');
                              value = value.split(' ').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                              ).join(' ');
                              setEditForm({ ...editForm, emergencyContactName: value });
                              const error = validateField("emergencyContactName", value);
                              setValidationErrors({ ...validationErrors, emergencyContactName: error });
                            }}
                            onBlur={(e) => {
                              const error = validateField("emergencyContactName", e.target.value);
                              setValidationErrors({ ...validationErrors, emergencyContactName: error });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              ...inputStyle,
                              borderColor: validationErrors.emergencyContactName ? theme.error.main : inputStyle.border
                            }}
                            placeholder="Enter emergency contact name"
                          />
                          {validationErrors.emergencyContactName && (
                            <div style={{ color: theme.error.main, fontSize: "12px", marginTop: "4px" }}>
                              {validationErrors.emergencyContactName}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.emergencyContactName || "-"}</div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Relationship</label>
                      {isEditing ? (
                        <select
                          value={editForm.emergencyContactRelationship || ""}
                          onChange={(e) => setEditForm({ ...editForm, emergencyContactRelationship: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          style={inputStyle}
                        >
                          <option value="">Select relationship</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Parent">Parent</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Friend">Friend</option>
                          <option value="Colleague">Colleague</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.emergencyContactRelationship === "Spouse" ? "Spouse" :
                           employeeDetails?.emergencyContactRelationship === "Parent" ? "Parent" :
                           employeeDetails?.emergencyContactRelationship === "Sibling" ? "Sibling" :
                           employeeDetails?.emergencyContactRelationship === "Friend" ? "Friend" :
                           employeeDetails?.emergencyContactRelationship === "Colleague" ? "Colleague" :
                           employeeDetails?.emergencyContactRelationship === "Other" ? "Other" :
                           employeeDetails?.emergencyContactRelationship || "-"}
                        </div>
                      )}
                    </div>

                    <div className="epm-field" data-field="emergencyContactPhone">
                      <label className="epm-label">Emergency Contact Phone *</label>
                      {isEditing ? (
                        <>
                          <input
                            type="tel"
                            value={editForm.emergencyContactPhone}
                            onChange={(e) => {
                              let value = e.target.value.replace(/\D/g, '').slice(0, 11);
                              setEditForm({ ...editForm, emergencyContactPhone: value });
                              const error = validateField("emergencyContactPhone", value);
                              setValidationErrors({ ...validationErrors, emergencyContactPhone: error });
                            }}
                            onBlur={(e) => {
                              const error = validateField("emergencyContactPhone", e.target.value);
                              setValidationErrors({ ...validationErrors, emergencyContactPhone: error });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              ...inputStyle,
                              borderColor: validationErrors.emergencyContactPhone ? theme.error.main : inputStyle.border
                            }}
                            placeholder="Enter emergency contact phone (10-11 digits, starts with 0)"
                          />
                          {validationErrors.emergencyContactPhone && (
                            <div style={{ color: theme.error.main, fontSize: "12px", marginTop: "4px" }}>
                              {validationErrors.emergencyContactPhone}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.emergencyContactPhone ? (
                            <a href={`tel:${employeeDetails.emergencyContactPhone}`} style={{ color: theme.primary.main, textDecoration: "none" }}>
                              📞 {employeeDetails.emergencyContactPhone}
                            </a>
                          ) : (
                            <span style={{ color: theme.error.main, fontStyle: "italic" }}>⚠️ Not set</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                  {isEditing && (
                    <div style={{ display: "flex", gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
                      <button
                        onClick={handleSave}
                        disabled={loading || Boolean(validationErrors.idNumber)}
                        style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          backgroundColor: theme.primary.main,
                          color: theme.neutral.white,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: loading ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          fontSize: "16px"
                        }}
                      >
                        {loading ? "Saving..." : "💾 Save Changes"}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          fetchEmployeeDetails();
                        }}
                        style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          backgroundColor: theme.neutral.gray300,
                          color: theme.neutral.gray700,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "16px"
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Work Info */}
              {activeTab === "work" && (
                <div>
                  <div className="epm-section">
                    <h4 className="epm-section-title">Job, contract & banking</h4>
                    <div className="epm-fields">
                    <div className="epm-field">
                      <label className="epm-label">Employee Code</label>
                      <div style={valueStyle}>{employeeDetails?.employeeCode || "-"}</div>
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Department</label>
                      {isEditing ? (
                        <select
                          value={editForm.departmentId || ""}
                          onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value ? parseInt(e.target.value) : null })}
                          style={inputStyle}
                        >
                          <option value="">Select department</option>
                          {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.Department?.name || employeeDetails?.department || "-"}</div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Job Title</label>
                      {isEditing ? (
                        <select
                          value={editForm.jobTitleId || ""}
                          onChange={(e) => setEditForm({ ...editForm, jobTitleId: e.target.value ? parseInt(e.target.value) : null })}
                          style={inputStyle}
                        >
                          <option value="">Select job title</option>
                          {jobTitles.map(job => (
                            <option key={job.id} value={job.id}>{job.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.JobTitle?.name || employeeDetails?.jobTitle || "-"}</div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Base Salary (VND)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.baseSalary}
                          onChange={(e) => setEditForm({ ...editForm, baseSalary: parseFloat(e.target.value) || 0 })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.baseSalary ? new Intl.NumberFormat('en-US').format(employeeDetails.baseSalary) + " VND" : "-"}
                        </div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Start Date</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={employeeDetails?.startDate ? new Date(employeeDetails.startDate).toISOString().split('T')[0] : ""}
                          readOnly
                          disabled
                          title="Start Date is managed in Employment Contract tab"
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.startDate ? new Date(employeeDetails.startDate).toLocaleDateString('en-US') : "-"}
                        </div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Status</label>
                      {isEditing ? (
                        <label style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
                          <input
                            type="checkbox"
                            checked={editForm.isActive}
                            onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                          />
                          <span>Active</span>
                        </label>
                      ) : (
                        <div style={valueStyle}>
                          <span style={{
                            padding: "4px 12px",
                            borderRadius: theme.radius.full,
                            backgroundColor: employeeDetails?.isActive ? "#d4edda" : "#f8d7da",
                            color: employeeDetails?.isActive ? "#155724" : "#721c24",
                            fontSize: "12px",
                            fontWeight: 600
                          }}>
                            {employeeDetails?.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Contract Type</label>
                      {isEditing ? (
                        <select
                          value={editForm.contractType || ""}
                          onChange={(e) => setEditForm({ ...editForm, contractType: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="">Select contract type</option>
                          <optgroup label="Probation Contracts">
                            <option value="probation_1_month">Probation (1 month)</option>
                            <option value="probation_2_month">Probation (2 months)</option>
                            <option value="probation_3_month">Probation (3 months)</option>
                          </optgroup>
                          <optgroup label="Formal Contracts">
                            <option value="formal_1_year">Formal (1 year)</option>
                            <option value="formal_2_year">Formal (2 years)</option>
                            <option value="formal_3_year">Formal (3 years)</option>
                          </optgroup>
                        </select>
                      ) : (
                        <div style={valueStyle}>{contractTypeLabel(employeeDetails?.contractType)}</div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Employment Status</label>
                      {isEditing ? (
                        <select
                          value={editForm.employmentStatus || "active"}
                          onChange={(e) => setEditForm({ ...editForm, employmentStatus: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="active">Active</option>
                          <option value="maternity_leave">Maternity Leave</option>
                          <option value="unpaid_leave">Unpaid Leave</option>
                          <option value="suspended">Suspended</option>
                          <option value="terminated">Terminated</option>
                          <option value="resigned">Resigned</option>
                        </select>
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.employmentStatus === "active" ? "Active" :
                           employeeDetails?.employmentStatus === "maternity_leave" ? "Maternity Leave" :
                           employeeDetails?.employmentStatus === "unpaid_leave" ? "Unpaid Leave" :
                           employeeDetails?.employmentStatus === "suspended" ? "Suspended" :
                           employeeDetails?.employmentStatus === "terminated" ? "Terminated" :
                           employeeDetails?.employmentStatus === "resigned" ? "Resigned" : "-"}
                        </div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Direct Manager</label>
                      {isEditing ? (
                        <select
                          value={editForm.managerId || ""}
                          onChange={(e) => setEditForm({ ...editForm, managerId: e.target.value ? parseInt(e.target.value) : null })}
                          style={inputStyle}
                        >
                          <option value="">Select manager</option>
                          {managers.map(manager => (
                            <option key={manager.id} value={manager.id}>
                              {manager.name} ({manager.employeeCode || manager.email})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.Manager ? `${employeeDetails.Manager.name} (${employeeDetails.Manager.employeeCode || employeeDetails.Manager.email})` : "-"}
                        </div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Branch/Office</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.branchName}
                          onChange={(e) => setEditForm({ ...editForm, branchName: e.target.value })}
                          style={inputStyle}
                          placeholder="Enter branch/office name"
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.branchName || "-"}</div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Bank Account</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.bankAccount}
                          onChange={(e) => setEditForm({ ...editForm, bankAccount: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.bankAccount || "-"}</div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Bank Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.bankName}
                          onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.bankName || "-"}</div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Tax Code</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.taxCode}
                          onChange={(e) => setEditForm({ ...editForm, taxCode: e.target.value })}
                          style={inputStyle}
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.taxCode || "-"}</div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Bank Branch</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.bankBranch}
                          onChange={(e) => setEditForm({ ...editForm, bankBranch: e.target.value })}
                          style={inputStyle}
                          placeholder="Enter bank branch"
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.bankBranch || "-"}</div>
                      )}
                    </div>
                  </div>

                </div>

                  <div className="epm-section">
                    <h4 className="epm-section-title">Payroll, allowances & insurance</h4>
                    <div className="epm-fields">
                    <div className="epm-field">
                      <label className="epm-label">Lunch Allowance (VND)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.lunchAllowance}
                          onChange={(e) => setEditForm({ ...editForm, lunchAllowance: parseFloat(e.target.value) || 0 })}
                          style={inputStyle}
                          min="0"
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.lunchAllowance ? new Intl.NumberFormat('en-US').format(employeeDetails.lunchAllowance) + " VND" : "0 VND"}
                        </div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Transport Allowance (VND)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.transportAllowance}
                          onChange={(e) => setEditForm({ ...editForm, transportAllowance: parseFloat(e.target.value) || 0 })}
                          style={inputStyle}
                          min="0"
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.transportAllowance ? new Intl.NumberFormat('en-US').format(employeeDetails.transportAllowance) + " VND" : "0 VND"}
                        </div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Phone Allowance (VND)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.phoneAllowance}
                          onChange={(e) => setEditForm({ ...editForm, phoneAllowance: parseFloat(e.target.value) || 0 })}
                          style={inputStyle}
                          min="0"
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.phoneAllowance ? new Intl.NumberFormat('en-US').format(employeeDetails.phoneAllowance) + " VND" : "0 VND"}
                        </div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Responsibility Allowance (VND)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.responsibilityAllowance}
                          onChange={(e) => setEditForm({ ...editForm, responsibilityAllowance: parseFloat(e.target.value) || 0 })}
                          style={inputStyle}
                          min="0"
                        />
                      ) : (
                        <div style={valueStyle}>
                          {employeeDetails?.responsibilityAllowance ? new Intl.NumberFormat('en-US').format(employeeDetails.responsibilityAllowance) + " VND" : "0 VND"}
                        </div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Social Insurance Number (BHXH)</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.socialInsuranceNumber}
                          onChange={(e) => setEditForm({ ...editForm, socialInsuranceNumber: e.target.value })}
                          style={inputStyle}
                          placeholder="Enter social insurance number"
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.socialInsuranceNumber || "-"}</div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Health Insurance Provider (BHYT)</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.healthInsuranceProvider}
                          onChange={(e) => setEditForm({ ...editForm, healthInsuranceProvider: e.target.value })}
                          style={inputStyle}
                          placeholder="Initial healthcare registration place"
                        />
                      ) : (
                        <div style={valueStyle}>{employeeDetails?.healthInsuranceProvider || "-"}</div>
                      )}
                    </div>

                    <div className="epm-field">
                      <label className="epm-label">Dependent Count</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.dependentCount}
                          onChange={(e) => setEditForm({ ...editForm, dependentCount: parseInt(e.target.value) || 0 })}
                          style={inputStyle}
                          min="0"
                        />
                      ) : (
                        <div style={valueStyle}>
                          {(() => {
                            const dependents = employeeDetails?.Dependents || employeeDetails?.dependents || [];
                            const count = dependents.length;
                            return (
                              <>
                                {count} {count === 1 ? "person" : "people"}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                  {isEditing && (
                    <div style={{ display: "flex", gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          backgroundColor: theme.primary.main,
                          color: theme.neutral.white,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: loading ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          fontSize: "16px"
                        }}
                      >
                        {loading ? "Saving..." : "💾 Save Changes"}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          fetchEmployeeDetails();
                        }}
                        style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          backgroundColor: theme.neutral.gray300,
                          color: theme.neutral.gray700,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "16px"
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Employment Contract */}
              {activeTab === "contract" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.lg }}>
                    <h3 style={{ marginTop: 0, marginBottom: 0, color: theme.primary.main }}>Employment Contract</h3>
                    {!isEditingContract && (
                      <button
                        type="button"
                        onClick={() => setIsEditingContract(true)}
                        style={{
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          backgroundColor: theme.primary.main,
                          color: theme.neutral.white,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        ✏️ Edit Contract
                      </button>
                    )}
                  </div>

                  {/* Contract Status Overview */}
                  <div className="epm-section" style={{ marginBottom: theme.spacing.xl }}>
                    <h4 className="epm-section-title">Contract Status</h4>
                    <div className="epm-contract-summary" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: theme.spacing.md }}>
                      <div className="epm-contract-card" style={{ padding: theme.spacing.md, border: "1px solid #e2e8f0", borderRadius: theme.radius.md, backgroundColor: "#f8fafc" }}>
                        <div className="epm-contract-label" style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Contract Type</div>
                        <div className="epm-val" style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", marginTop: "4px" }}>{contractOverview.contractTypeLabel}</div>
                      </div>
                      <div className="epm-contract-card" style={{ padding: theme.spacing.md, border: "1px solid #e2e8f0", borderRadius: theme.radius.md, backgroundColor: "#f8fafc" }}>
                        <div className="epm-contract-label" style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Status</div>
                        <span className={`epm-contract-pill epm-contract-pill--${contractOverview.contractBadge}`} style={{ marginTop: "4px", display: "inline-block" }}>
                          {contractOverview.contractStatus}
                        </span>
                      </div>
                      <div className="epm-contract-card" style={{ padding: theme.spacing.md, border: "1px solid #e2e8f0", borderRadius: theme.radius.md, backgroundColor: "#f8fafc" }}>
                        <div className="epm-contract-label" style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Start Date</div>
                        <div className="epm-val" style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", marginTop: "4px" }}>{contractOverview.contractStartDate}</div>
                      </div>
                      <div className="epm-contract-card" style={{ padding: theme.spacing.md, border: "1px solid #e2e8f0", borderRadius: theme.radius.md, backgroundColor: "#f8fafc" }}>
                        <div className="epm-contract-label" style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>End Date</div>
                        <div className="epm-val" style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", marginTop: "4px" }}>{contractOverview.contractEndDate}</div>
                      </div>
                    </div>
                  </div>

                  {/* Edit Contract Form */}
                  {isEditingContract && (
                    <div className="epm-section" style={{ marginBottom: theme.spacing.xl, backgroundColor: "#fef3c7", border: "1px solid #f59e0b", borderRadius: theme.radius.md, padding: theme.spacing.lg }}>
                      <h4 className="epm-section-title" style={{ color: "#92400e" }}>Edit Contract Details</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: theme.spacing.md }}>
                        <div className="epm-field">
                          <label className="epm-label" style={{ color: "#92400e" }}>Contract Type *</label>
                          <select
                            value={contractFormData.contractType}
                            onChange={(e) => setContractFormData({ ...contractFormData, contractType: e.target.value })}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: "1px solid #d97706",
                              borderRadius: theme.radius.sm,
                              fontSize: "14px"
                            }}
                          >
                            <option value="">Select contract type</option>
                            <optgroup label="Probation Contracts">
                              <option value="probation_1_month">Probation (1 month)</option>
                              <option value="probation_2_month">Probation (2 months)</option>
                              <option value="probation_3_month">Probation (3 months)</option>
                            </optgroup>
                            <optgroup label="Formal Contracts">
                              <option value="formal_1_year">Formal (1 year)</option>
                              <option value="formal_2_year">Formal (2 years)</option>
                              <option value="formal_3_year">Formal (3 years)</option>
                            </optgroup>
                          </select>
                        </div>
                        <div className="epm-field">
                          <label className="epm-label" style={{ color: "#92400e" }}>Start Date *</label>
                          <input
                            type="date"
                            value={contractFormData.startDate}
                                onChange={(e) => setContractFormData({ ...contractFormData, startDate: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: "1px solid #d97706",
                              borderRadius: theme.radius.sm,
                              fontSize: "14px"
                            }}
                          />
                        </div>
                        <div className="epm-field">
                          <label className="epm-label" style={{ color: "#92400e" }}>Retirement Age</label>
                          <input
                            type="number"
                            min="50"
                            max="70"
                            value={contractFormData.retirementAge}
                            onChange={(e) => setContractFormData({ ...contractFormData, retirementAge: parseInt(e.target.value) || 60 })}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: "1px solid #d97706",
                              borderRadius: theme.radius.sm,
                              fontSize: "14px"
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
                        <button
                          onClick={handleSaveContract}
                          disabled={loading}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: "#f59e0b",
                            color: "#92400e",
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: loading ? "not-allowed" : "pointer",
                            fontWeight: 600,
                            fontSize: "14px"
                          }}
                        >
                          {loading ? "Saving..." : "💾 Save Contract"}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingContract(false);
                            setContractFormData({
                              contractType: employeeDetails?.contractType || '',
                              startDate: employeeDetails?.startDate ? new Date(employeeDetails.startDate).toISOString().split('T')[0] : '',
                              retirementAge: employeeDetails?.retirementAge || 60
                            });
                          }}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: "#fef3c7",
                            color: "#92400e",
                            border: "1px solid #d97706",
                            borderRadius: theme.radius.md,
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: "14px"
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Contract Timeline */}
                  <div className="epm-section" style={{ marginBottom: theme.spacing.xl }}>
                    <h4 className="epm-section-title">Contract Timeline</h4>
                    <div className="epm-contract-timeline" style={{ backgroundColor: "#f8fafc", padding: theme.spacing.md, borderRadius: theme.radius.md, border: "1px solid #e2e8f0" }}>
                      <div className="epm-contract-timeline-row" style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                        <span style={{ fontWeight: 600, color: "#374151" }}>Hire / Start Date</span>
                        <span style={{ color: "#1f2937" }}>{contractOverview.contractStartDate}</span>
                      </div>
                      <div className="epm-contract-timeline-row" style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                        <span style={{ fontWeight: 600, color: "#374151" }}>Contract Type</span>
                        <span style={{ color: "#1f2937" }}>{contractOverview.contractTypeLabel}</span>
                      </div>
                      <div className="epm-contract-timeline-row" style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                        <span style={{ fontWeight: 600, color: "#374151" }}>Expected End Date</span>
                        <span style={{ color: "#1f2937" }}>{contractOverview.contractEndDate}</span>
                      </div>
                      <div className="epm-contract-timeline-row" style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                        <span style={{ fontWeight: 600, color: "#374151" }}>Employment Status</span>
                        <span style={{ color: "#1f2937" }}>{contractOverview.employmentStatus}</span>
                      </div>
                      {contractOverview.contractDaysUntil != null && (
                        <div className="epm-contract-timeline-row" style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                          <span style={{ fontWeight: 600, color: "#374151" }}>Days Until Expiry</span>
                          <span style={{ color: contractOverview.contractDaysUntil >= 0 ? "#059669" : "#dc2626", fontWeight: 600 }}>
                            {contractOverview.contractDaysUntil >= 0 ? `${contractOverview.contractDaysUntil} day(s)` : "Expired"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="epm-section" style={{ marginBottom: theme.spacing.xl }}>
                    <h4 className="epm-section-title">Contract Signing History</h4>
                    <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: theme.radius.md, overflow: "hidden" }}>
                      {contractSigningHistory.length > 0 ? (
                        contractSigningHistory.map((item, index) => (
                          <div
                            key={item.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1.2fr 1.2fr 1fr 1.3fr",
                              gap: theme.spacing.md,
                              padding: theme.spacing.md,
                              borderBottom: index === contractSigningHistory.length - 1 ? "none" : "1px solid #e2e8f0",
                              alignItems: "center"
                            }}
                          >
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Start Date</div>
                              <div style={{ color: "#0f172a", fontWeight: 600 }}>{formatLocalDate(item.startDate)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Contract Type</div>
                              <div style={{ color: "#0f172a" }}>{contractTypeLabel(item.contractType)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>End Date</div>
                              <div style={{ color: "#0f172a" }}>{formatLocalDate(calculateContractEndDate(item.contractType, item.startDate))}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Updated By</div>
                              <div style={{ color: "#0f172a", fontWeight: 600 }}>
                                {item.signerName}
                                {item.signerCode ? ` (${item.signerCode})` : ""}
                              </div>
                              {item.note && (
                                <div style={{ marginTop: "4px", color: "#64748b", fontSize: "12px" }}>{item.note}</div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: theme.spacing.md, color: "#64748b" }}>
                          No contract signing history found.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Age & Retirement Info */}
                  <div className="epm-section" style={{ marginBottom: theme.spacing.xl }}>
                    <h4 className="epm-section-title">Age & Retirement Information</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: theme.spacing.md }}>
                      <div style={{ padding: theme.spacing.md, border: "1px solid #e2e8f0", borderRadius: theme.radius.md, backgroundColor: "#f8fafc" }}>
                        <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Current Age</div>
                        <div style={{ fontSize: "24px", fontWeight: 700, color: "#1e293b", marginTop: "4px" }}>{contractOverview.currentAge}</div>
                      </div>
                      <div style={{ padding: theme.spacing.md, border: "1px solid #e2e8f0", borderRadius: theme.radius.md, backgroundColor: "#f8fafc" }}>
                        <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Retirement Age</div>
                        <div style={{ fontSize: "24px", fontWeight: 700, color: "#1e293b", marginTop: "4px" }}>{contractOverview.retirementAge}</div>
                      </div>
                      <div style={{ padding: theme.spacing.md, border: "1px solid #e2e8f0", borderRadius: theme.radius.md, backgroundColor: "#f8fafc" }}>
                        <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Years to Retirement</div>
                        <div style={{ fontSize: "24px", fontWeight: 700, color: contractOverview.yearsToRetirement.includes("Retirement") ? "#dc2626" : "#059669", marginTop: "4px" }}>{contractOverview.yearsToRetirement}</div>
                      </div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {contractOverview.warnings.length > 0 && (
                    <div className="epm-contract-warning" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: theme.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.xl }}>
                      <strong style={{ color: "#dc2626" }}>⚠️ Attention Required:</strong>
                      <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px", color: "#dc2626" }}>
                        {contractOverview.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="epm-contract-actions" style={{ display: "flex", gap: theme.spacing.md, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab("work")}
                      style={{
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#fff",
                        borderRadius: theme.radius.md,
                        padding: "10px 16px",
                        cursor: "pointer",
                        color: theme.neutral.gray900,
                        fontWeight: 600
                      }}
                    >
                      📋 Review Work Experience
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("info")}
                      style={{
                        border: "1px solid transparent",
                        backgroundColor: theme.primary.main,
                        color: "#fff",
                        borderRadius: theme.radius.md,
                        padding: "10px 16px",
                        cursor: "pointer",
                        fontWeight: 600
                      }}
                    >
                      👤 View Personal Profile
                    </button>
                  </div>
                </div>
              )}
              {activeTab === "family" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.lg }}>
                    <h3 style={{ marginTop: 0, marginBottom: 0, color: theme.primary.main }}>Dependents</h3>
                    {!editingDep && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDep("new");
                          resetDepForm();
                        }}
                        style={{
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          backgroundColor: theme.primary.main,
                          color: theme.neutral.white,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        ➕ Add Dependent
                      </button>
                    )}
                  </div>

                  {editingDep && (
                    <div
                      style={{
                        padding: theme.spacing.lg,
                        backgroundColor: theme.neutral.gray50,
                        borderRadius: theme.radius.md,
                        border: `2px solid ${theme.primary.main}`,
                        marginBottom: theme.spacing.lg,
                      }}
                    >
                      <h4 style={{ marginTop: 0, marginBottom: theme.spacing.md, color: theme.primary.main }}>
                        {editingDep === "new" ? "Add dependent" : "Edit dependent"}
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: theme.spacing.md }}>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>Full name *</label>
                          <input
                            type="text"
                            value={depForm.fullName}
                            onChange={(e) => setDepForm({ ...depForm, fullName: e.target.value })}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>Relationship *</label>
                          <select
                            value={depForm.relationship}
                            onChange={(e) => setDepForm({ ...depForm, relationship: e.target.value })}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px" }}
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
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>Date of birth</label>
                          <input
                            type="date"
                            value={depForm.dateOfBirth}
                            onChange={(e) => setDepForm({ ...depForm, dateOfBirth: e.target.value })}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>Gender</label>
                          <select
                            value={depForm.gender}
                            onChange={(e) => setDepForm({ ...depForm, gender: e.target.value })}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px" }}
                          >
                            <option value="">—</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                            ID / CCCD — employees: 9 or 12 digits. HR/staff: optional; internal reference allowed (e.g. seed codes)
                          </label>
                          <input
                            type="text"
                            value={depForm.idNumber}
                            onChange={(e) => setDepForm({ ...depForm, idNumber: e.target.value })}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px" }}
                          />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>Address</label>
                          <textarea
                            value={depForm.address}
                            onChange={(e) => setDepForm({ ...depForm, address: e.target.value })}
                            rows={2}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px", resize: "vertical" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>Phone</label>
                          <input
                            type="text"
                            value={depForm.phoneNumber}
                            onChange={(e) => setDepForm({ ...depForm, phoneNumber: e.target.value })}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>Email</label>
                          <input
                            type="email"
                            value={depForm.email}
                            onChange={(e) => setDepForm({ ...depForm, email: e.target.value })}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px" }}
                          />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>Occupation</label>
                          <input
                            type="text"
                            value={depForm.occupation}
                            onChange={(e) => setDepForm({ ...depForm, occupation: e.target.value })}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px" }}
                          />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>Notes</label>
                          <textarea
                            value={depForm.notes}
                            onChange={(e) => setDepForm({ ...depForm, notes: e.target.value })}
                            rows={2}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px", resize: "vertical" }}
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
                        <button
                          type="button"
                          onClick={handleSaveDep}
                          disabled={savingDep || !depForm.fullName?.trim()}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                            backgroundColor: savingDep || !depForm.fullName?.trim() ? theme.neutral.gray400 : theme.primary.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: savingDep || !depForm.fullName?.trim() ? "not-allowed" : "pointer",
                            fontWeight: 600,
                            fontSize: "14px",
                          }}
                        >
                          {savingDep ? "Saving…" : "💾 Save"}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelDep}
                          disabled={savingDep}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                            backgroundColor: theme.neutral.gray300,
                            color: theme.neutral.gray700,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: savingDep ? "not-allowed" : "pointer",
                            fontWeight: 600,
                            fontSize: "14px",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {depListForGrid.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: theme.spacing.md }}>
                      {depListForGrid.map((dep) => {
                        const ab = approvalBadgeStyle(dep.approvalStatus);
                        return (
                          <div
                            key={dep.id}
                            style={{
                              padding: theme.spacing.md,
                              backgroundColor: theme.neutral.gray50,
                              borderRadius: theme.radius.md,
                              border: `1px solid ${theme.neutral.gray200}`,
                              position: "relative",
                            }}
                          >
                            {Number(editingDep) !== Number(dep.id) && (
                              <div style={{ position: "absolute", top: theme.spacing.sm, right: theme.spacing.sm, display: "flex", gap: theme.spacing.xs }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDep(dep.id);
                                    setDepForm({
                                      fullName: dep.fullName || "",
                                      relationship: dep.relationship || "child",
                                      dateOfBirth: dep.dateOfBirth ? new Date(dep.dateOfBirth).toISOString().split("T")[0] : "",
                                      gender: dep.gender || "",
                                      idNumber: dep.idNumber || "",
                                      address: dep.address || "",
                                      phoneNumber: dep.phoneNumber || "",
                                      email: dep.email || "",
                                      occupation: dep.occupation || "",
                                      notes: dep.notes || "",
                                    });
                                  }}
                                  style={{
                                    padding: "4px 8px",
                                    backgroundColor: theme.primary.main,
                                    color: theme.neutral.white,
                                    border: "none",
                                    borderRadius: theme.radius.sm,
                                    cursor: "pointer",
                                    fontSize: "12px",
                                  }}
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDep(dep.id)}
                                  style={{
                                    padding: "4px 8px",
                                    backgroundColor: theme.error.main,
                                    color: theme.neutral.white,
                                    border: "none",
                                    borderRadius: theme.radius.sm,
                                    cursor: "pointer",
                                    fontSize: "12px",
                                  }}
                                  title="Delete"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                            <div style={{ fontWeight: 700, marginBottom: theme.spacing.xs, fontSize: "18px", color: theme.primary.main, paddingRight: 72 }}>
                              {dep.fullName || "—"}
                            </div>
                            <div style={{ fontSize: "14px", color: theme.neutral.gray700, fontWeight: 600, marginBottom: theme.spacing.xs }}>
                              {dep.relationship ? dep.relationship.charAt(0).toUpperCase() + dep.relationship.slice(1) : "—"}
                              <span
                                style={{
                                  marginLeft: "8px",
                                  padding: "2px 8px",
                                  backgroundColor: ab.bg,
                                  color: ab.color,
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                }}
                              >
                                {ab.label}
                              </span>
                            </div>
                            <div style={{ fontSize: "13px", color: theme.neutral.gray700, marginTop: theme.spacing.sm, display: "flex", flexDirection: "column", gap: 6 }}>
                              {dep.gender && (
                                <div>
                                  <strong>Gender:</strong> {dep.gender}
                                </div>
                              )}
                              {dep.dateOfBirth && (
                                <div>
                                  <strong>Date of Birth:</strong> {new Date(dep.dateOfBirth).toLocaleDateString("en-US")}
                                </div>
                              )}
                              {dep.idNumber && (
                                <div>
                                  <strong>ID Number:</strong> {dep.idNumber}
                                </div>
                              )}
                              {dep.address && (
                                <div>
                                  <strong>Address:</strong> {dep.address}
                                </div>
                              )}
                              {dep.phoneNumber && (
                                <div>
                                  <strong>Phone:</strong> {dep.phoneNumber}
                                </div>
                              )}
                              {dep.email && (
                                <div>
                                  <strong>Email:</strong> {dep.email}
                                </div>
                              )}
                              {dep.occupation && (
                                <div>
                                  <strong>Occupation:</strong> {dep.occupation}
                                </div>
                              )}
                              {dep.notes && (
                                <div>
                                  <strong>Notes:</strong> {dep.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : !editingDep && depTotalCount === 0 ? (
                    <p style={{ color: theme.neutral.gray500, fontStyle: "italic" }}>No dependents recorded</p>
                  ) : null}
                </div>
              )}

              {/* Tab: Qualifications — same UX pattern as Work Experience */}
              {activeTab === "qualifications" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.lg }}>
                    <h3 style={{ marginTop: 0, marginBottom: 0, color: theme.primary.main }}>Qualifications and Certificates</h3>
                    {!editingQual && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQual("new");
                          resetQualForm();
                        }}
                        style={{
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          backgroundColor: theme.primary.main,
                          color: theme.neutral.white,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        ➕ Add Qualification
                      </button>
                    )}
                  </div>

                  {editingQual && (
                    <div
                      style={{
                        padding: theme.spacing.lg,
                        backgroundColor: theme.neutral.gray50,
                        borderRadius: theme.radius.md,
                        border: `2px solid ${theme.primary.main}`,
                        marginBottom: theme.spacing.lg,
                      }}
                    >
                      <h4 style={{ marginTop: 0, marginBottom: theme.spacing.md, color: theme.primary.main }}>
                        {editingQual === "new" ? "Add qualification / certificate" : "Edit qualification"}
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: theme.spacing.md }}>
                        <div>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>Type *</label>
                          <select
                            value={qualForm.type}
                            onChange={(e) => setQualForm({ ...qualForm, type: e.target.value })}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px" }}
                          >
                            <option value="degree">Degree</option>
                            <option value="certificate">Certificate</option>
                            <option value="license">License</option>
                            <option value="training">Training</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>Certificate / degree name *</label>
                          <input
                            type="text"
                            value={qualForm.name}
                            onChange={(e) => setQualForm({ ...qualForm, name: e.target.value })}
                            placeholder="e.g. Bachelor of Human Resource Management"
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px" }}
                          />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>Issued by</label>
                          <input
                            type="text"
                            value={qualForm.issuedBy}
                            onChange={(e) => setQualForm({ ...qualForm, issuedBy: e.target.value })}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>Issued date</label>
                          <input
                            type="date"
                            value={qualForm.issuedDate}
                            onChange={(e) => setQualForm({ ...qualForm, issuedDate: e.target.value })}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>Expiry date</label>
                          <input
                            type="date"
                            value={qualForm.expiryDate}
                            onChange={(e) => setQualForm({ ...qualForm, expiryDate: e.target.value })}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px" }}
                          />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>Certificate number</label>
                          <input
                            type="text"
                            value={qualForm.certificateNumber}
                            onChange={(e) => setQualForm({ ...qualForm, certificateNumber: e.target.value })}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px" }}
                          />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>Description</label>
                          <textarea
                            value={qualForm.description}
                            onChange={(e) => setQualForm({ ...qualForm, description: e.target.value })}
                            rows={3}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px", resize: "vertical" }}
                          />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                            Document path (optional for HR — e.g. /uploads/qualifications/file.pdf)
                          </label>
                          <input
                            type="text"
                            value={qualForm.documentPath}
                            onChange={(e) => setQualForm({ ...qualForm, documentPath: e.target.value })}
                            style={{ width: "100%", padding: theme.spacing.sm, border: `1px solid ${theme.neutral.gray300}`, borderRadius: theme.radius.sm, fontSize: "14px" }}
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
                        <button
                          type="button"
                          onClick={handleSaveQual}
                          disabled={savingQual || !qualForm.type || !qualForm.name?.trim()}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                            backgroundColor: savingQual || !qualForm.type || !qualForm.name?.trim() ? theme.neutral.gray400 : theme.primary.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: savingQual || !qualForm.type || !qualForm.name?.trim() ? "not-allowed" : "pointer",
                            fontWeight: 600,
                            fontSize: "14px",
                          }}
                        >
                          {savingQual ? "Saving…" : "💾 Save"}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelQual}
                          disabled={savingQual}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                            backgroundColor: theme.neutral.gray300,
                            color: theme.neutral.gray700,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: savingQual ? "not-allowed" : "pointer",
                            fontWeight: 600,
                            fontSize: "14px",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {qualListForGrid.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: theme.spacing.md }}>
                      {qualListForGrid.map((qual) => {
                        const ab = approvalBadgeStyle(qual.approvalStatus);
                        const typeLabel = qual.type ? String(qual.type).charAt(0).toUpperCase() + String(qual.type).slice(1) : "—";
                        return (
                          <div
                            key={qual.id}
                            style={{
                              padding: theme.spacing.md,
                              backgroundColor: theme.neutral.gray50,
                              borderRadius: theme.radius.md,
                              border: `1px solid ${theme.neutral.gray200}`,
                              position: "relative",
                            }}
                          >
                            {Number(editingQual) !== Number(qual.id) && (
                              <div style={{ position: "absolute", top: theme.spacing.sm, right: theme.spacing.sm, display: "flex", gap: theme.spacing.xs }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingQual(qual.id);
                                    setQualForm({
                                      type: qual.type || "degree",
                                      name: qual.name || "",
                                      issuedBy: qual.issuedBy || "",
                                      issuedDate: qual.issuedDate ? new Date(qual.issuedDate).toISOString().split("T")[0] : "",
                                      expiryDate: qual.expiryDate ? new Date(qual.expiryDate).toISOString().split("T")[0] : "",
                                      certificateNumber: qual.certificateNumber || "",
                                      description: qual.description || "",
                                      documentPath: qual.documentPath || "",
                                    });
                                  }}
                                  style={{
                                    padding: "4px 8px",
                                    backgroundColor: theme.primary.main,
                                    color: theme.neutral.white,
                                    border: "none",
                                    borderRadius: theme.radius.sm,
                                    cursor: "pointer",
                                    fontSize: "12px",
                                  }}
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQual(qual.id)}
                                  style={{
                                    padding: "4px 8px",
                                    backgroundColor: theme.error.main,
                                    color: theme.neutral.white,
                                    border: "none",
                                    borderRadius: theme.radius.sm,
                                    cursor: "pointer",
                                    fontSize: "12px",
                                  }}
                                  title="Delete"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                            <div style={{ fontWeight: 700, marginBottom: theme.spacing.xs, fontSize: "18px", color: theme.primary.main, paddingRight: 72 }}>
                              {qual.name}
                            </div>
                            <div style={{ fontSize: "14px", color: theme.neutral.gray700, fontWeight: 600, marginBottom: theme.spacing.xs }}>
                              {typeLabel}
                              <span
                                style={{
                                  marginLeft: "8px",
                                  padding: "2px 8px",
                                  backgroundColor: ab.bg,
                                  color: ab.color,
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                }}
                              >
                                {ab.label}
                              </span>
                            </div>
                            <div style={{ fontSize: "13px", color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                              {qual.issuedDate ? new Date(qual.issuedDate).toLocaleDateString("en-US") : "—"}
                              {qual.expiryDate ? ` → ${new Date(qual.expiryDate).toLocaleDateString("en-US")}` : ""}
                            </div>
                            {qual.issuedBy && (
                              <div style={{ fontSize: "13px", color: theme.neutral.gray700, marginTop: theme.spacing.sm }}>
                                <strong>Issued by:</strong> {qual.issuedBy}
                              </div>
                            )}
                            {qual.certificateNumber && (
                              <div style={{ fontSize: "13px", color: theme.neutral.gray700, marginTop: theme.spacing.xs }}>
                                <strong>Certificate No.:</strong> {qual.certificateNumber}
                              </div>
                            )}
                            {qual.description && (
                              <div style={{ fontSize: "13px", color: theme.neutral.gray700, marginTop: theme.spacing.xs }}>
                                <strong>Description:</strong> {qual.description}
                              </div>
                            )}
                            {qual.documentPath && (
                              <div style={{ marginTop: theme.spacing.sm }}>
                                <a
                                  href={`${apiBase}${qual.documentPath}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: theme.primary.main, textDecoration: "underline", fontSize: "12px" }}
                                >
                                  View document
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : !editingQual && qualTotalCount === 0 ? (
                    <p style={{ color: theme.neutral.gray500, fontStyle: "italic" }}>No qualifications or certificates</p>
                  ) : null}
                </div>
              )}

              {/* Tab: Work Experience */}
              {activeTab === "experience" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.lg }}>
                    <h3 style={{ marginTop: 0, marginBottom: 0, color: theme.primary.main }}>
                      Work Experience
                    </h3>
                    {!editingWorkExp && (
                      <button
                        onClick={() => {
                          setEditingWorkExp("new");
                          setWorkExpForm({
                            companyName: "",
                            position: "",
                            startDate: "",
                            endDate: "",
                            description: "",
                            responsibilities: "",
                            achievements: "",
                            isCurrent: false
                          });
                        }}
                        style={{
                          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          backgroundColor: theme.primary.main,
                          color: theme.neutral.white,
                          border: "none",
                          borderRadius: theme.radius.md,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                      >
                        ➕ Add Experience
                      </button>
                    )}
                  </div>

                  {/* Add/Edit Form */}
                  {editingWorkExp && (
                    <div style={{
                      padding: theme.spacing.lg,
                      backgroundColor: theme.neutral.gray50,
                      borderRadius: theme.radius.md,
                      border: `2px solid ${theme.primary.main}`,
                      marginBottom: theme.spacing.lg
                    }}>
                      <h4 style={{ marginTop: 0, marginBottom: theme.spacing.md, color: theme.primary.main }}>
                        {editingWorkExp === "new" ? "Add New Work Experience" : "Edit Work Experience"}
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: theme.spacing.md }}>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                            Company Name *
                          </label>
                          <input
                            type="text"
                            value={workExpForm.companyName}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, companyName: e.target.value })}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: `1px solid ${theme.neutral.gray300}`,
                              borderRadius: theme.radius.sm,
                              fontSize: "14px"
                            }}
                            placeholder="Enter company name"
                          />
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                            Position *
                          </label>
                          <input
                            type="text"
                            value={workExpForm.position}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, position: e.target.value })}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: `1px solid ${theme.neutral.gray300}`,
                              borderRadius: theme.radius.sm,
                              fontSize: "14px"
                            }}
                            placeholder="Enter position"
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={workExpForm.startDate}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, startDate: e.target.value })}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: `1px solid ${theme.neutral.gray300}`,
                              borderRadius: theme.radius.sm,
                              fontSize: "14px"
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                            End Date
                          </label>
                          <input
                            type="date"
                            value={workExpForm.endDate}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, endDate: e.target.value })}
                            disabled={workExpForm.isCurrent}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: `1px solid ${theme.neutral.gray300}`,
                              borderRadius: theme.radius.sm,
                              fontSize: "14px",
                              opacity: workExpForm.isCurrent ? 0.5 : 1,
                              cursor: workExpForm.isCurrent ? "not-allowed" : "text"
                            }}
                          />
                        </div>

                        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
                          <input
                            type="checkbox"
                            checked={workExpForm.isCurrent}
                            onChange={(e) => {
                              setWorkExpForm({ ...workExpForm, isCurrent: e.target.checked, endDate: e.target.checked ? "" : workExpForm.endDate });
                            }}
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                          />
                          <label style={{ fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
                            Currently working here
                          </label>
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                            Description
                          </label>
                          <textarea
                            value={workExpForm.description}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, description: e.target.value })}
                            rows={3}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: `1px solid ${theme.neutral.gray300}`,
                              borderRadius: theme.radius.sm,
                              fontSize: "14px",
                              resize: "vertical"
                            }}
                            placeholder="Describe your role and responsibilities"
                          />
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                            Key Responsibilities
                          </label>
                          <textarea
                            value={workExpForm.responsibilities}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, responsibilities: e.target.value })}
                            rows={3}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: `1px solid ${theme.neutral.gray300}`,
                              borderRadius: theme.radius.sm,
                              fontSize: "14px",
                              resize: "vertical"
                            }}
                            placeholder="List key responsibilities"
                          />
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                            Achievements
                          </label>
                          <textarea
                            value={workExpForm.achievements}
                            onChange={(e) => setWorkExpForm({ ...workExpForm, achievements: e.target.value })}
                            rows={3}
                            style={{
                              width: "100%",
                              padding: theme.spacing.sm,
                              border: `1px solid ${theme.neutral.gray300}`,
                              borderRadius: theme.radius.sm,
                              fontSize: "14px",
                              resize: "vertical"
                            }}
                            placeholder="List notable achievements"
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
                        <button
                          onClick={handleSaveWorkExp}
                          disabled={savingWorkExp || !workExpForm.companyName || !workExpForm.position}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                            backgroundColor: savingWorkExp || !workExpForm.companyName || !workExpForm.position ? theme.neutral.gray400 : theme.primary.main,
                            color: theme.neutral.white,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: savingWorkExp || !workExpForm.companyName || !workExpForm.position ? "not-allowed" : "pointer",
                            fontWeight: 600,
                            fontSize: "14px"
                          }}
                        >
                          {savingWorkExp ? "Saving..." : "💾 Save"}
                        </button>
                        <button
                          onClick={handleCancelWorkExp}
                          disabled={savingWorkExp}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                            backgroundColor: theme.neutral.gray300,
                            color: theme.neutral.gray700,
                            border: "none",
                            borderRadius: theme.radius.md,
                            cursor: savingWorkExp ? "not-allowed" : "pointer",
                            fontWeight: 600,
                            fontSize: "14px"
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Work Experience List */}
                  {workExperienceListForGrid.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: theme.spacing.md }}>
                      {workExperienceListForGrid.map((exp) => (
                        <div key={exp.id} style={{
                          padding: theme.spacing.md,
                          backgroundColor: theme.neutral.gray50,
                          borderRadius: theme.radius.md,
                          border: `1px solid ${theme.neutral.gray200}`,
                          position: "relative"
                        }}>
                          {Number(editingWorkExp) !== Number(exp.id) && (
                            <div style={{ position: "absolute", top: theme.spacing.sm, right: theme.spacing.sm, display: "flex", gap: theme.spacing.xs }}>
                              <button
                                onClick={() => {
                                  setEditingWorkExp(exp.id);
                                  setWorkExpForm({
                                    companyName: exp.companyName || "",
                                    position: exp.position || "",
                                    startDate: exp.startDate ? new Date(exp.startDate).toISOString().split('T')[0] : "",
                                    endDate: exp.endDate ? new Date(exp.endDate).toISOString().split('T')[0] : "",
                                    description: exp.description || "",
                                    responsibilities: exp.responsibilities || "",
                                    achievements: exp.achievements || "",
                                    isCurrent: exp.isCurrent || false
                                  });
                                }}
                                style={{
                                  padding: "4px 8px",
                                  backgroundColor: theme.primary.main,
                                  color: theme.neutral.white,
                                  border: "none",
                                  borderRadius: theme.radius.sm,
                                  cursor: "pointer",
                                  fontSize: "12px"
                                }}
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteWorkExp(exp.id)}
                                style={{
                                  padding: "4px 8px",
                                  backgroundColor: theme.error.main,
                                  color: theme.neutral.white,
                                  border: "none",
                                  borderRadius: theme.radius.sm,
                                  cursor: "pointer",
                                  fontSize: "12px"
                                }}
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                          <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs, fontSize: "18px", color: theme.primary.main }}>
                            {exp.companyName}
                          </div>
                          <div style={{ fontSize: "14px", color: theme.neutral.gray700, fontWeight: 600, marginBottom: theme.spacing.xs }}>
                            {exp.position}
                          </div>
                          <div style={{ fontSize: "13px", color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                            {exp.startDate ? new Date(exp.startDate).toLocaleDateString('en-US') : "N/A"} - {exp.isCurrent ? "Present" : (exp.endDate ? new Date(exp.endDate).toLocaleDateString('en-US') : "N/A")}
                            {exp.isCurrent && (
                              <span style={{ marginLeft: "8px", padding: "2px 8px", backgroundColor: "#d4edda", color: "#155724", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                                Current
                              </span>
                            )}
                          </div>
                          {exp.description && (
                            <div style={{ fontSize: "13px", color: theme.neutral.gray700, marginTop: theme.spacing.sm }}>
                              <strong>Description:</strong> {exp.description}
                            </div>
                          )}
                          {exp.responsibilities && (
                            <div style={{ fontSize: "13px", color: theme.neutral.gray700, marginTop: theme.spacing.xs }}>
                              <strong>Responsibilities:</strong> {exp.responsibilities}
                            </div>
                          )}
                          {exp.achievements && (
                            <div style={{ fontSize: "13px", color: theme.neutral.gray700, marginTop: theme.spacing.xs }}>
                              <strong>Achievements:</strong> {exp.achievements}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : !editingWorkExp && workExperienceTotalCount === 0 ? (
                    <p style={{ color: theme.neutral.gray500, fontStyle: "italic" }}>No work experience recorded</p>
                  ) : null}
                </div>
              )}

              {/* Tab: Attendance */}
              {activeTab === "attendance" && (
                <div>
                  {/* Header row: title + month/year filter */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
                    <h3 style={{ margin: 0, color: theme.primary.main }}>Attendance Statistics</h3>

                    {/* Month / Year picker */}
                    {(() => {
                      const now = new Date();
                      const dispMonth = attendanceFilter?.month ?? employeeDetails?.attendanceStats?.month ?? (now.getMonth() + 1);
                      const dispYear  = attendanceFilter?.year  ?? employeeDetails?.attendanceStats?.year  ?? now.getFullYear();
                      const isCurrentMonth = dispMonth === now.getMonth() + 1 && dispYear === now.getFullYear();

                      const goPrev = () => {
                        const m = dispMonth === 1 ? 12 : dispMonth - 1;
                        const y = dispMonth === 1 ? dispYear - 1 : dispYear;
                        if (y < 2020) return;
                        handleAttendanceFilterChange(m, y);
                      };
                      const goNext = () => {
                        if (isCurrentMonth) return;
                        const m = dispMonth === 12 ? 1 : dispMonth + 1;
                        const y = dispMonth === 12 ? dispYear + 1 : dispYear;
                        handleAttendanceFilterChange(m, y);
                      };
                      const monthLabel = new Date(dispYear, dispMonth - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

                      const btnStyle = (disabled) => ({
                        width: 32, height: 32, borderRadius: 8, border: `1px solid ${theme.neutral.gray200}`,
                        background: disabled ? theme.neutral.gray100 : "#fff",
                        color: disabled ? theme.neutral.gray400 : theme.neutral.gray700,
                        cursor: disabled ? "not-allowed" : "pointer",
                        fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center"
                      });

                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button onClick={goPrev} style={btnStyle(dispYear <= 2020 && dispMonth === 1)} title="Previous month">‹</button>
                          <span style={{
                            minWidth: 150, textAlign: "center", fontWeight: 600, fontSize: 14,
                            color: theme.neutral.gray800, padding: "4px 12px",
                            border: `1px solid ${theme.neutral.gray200}`, borderRadius: 8, background: "#fff"
                          }}>
                            {attendanceLoading ? "Loading…" : monthLabel}
                          </span>
                          <button onClick={goNext} style={btnStyle(isCurrentMonth)} title="Next month">›</button>
                          {!isCurrentMonth && (
                            <button
                              onClick={resetAttendanceFilter}
                              style={{
                                height: 32, padding: "0 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                                border: `1px solid ${theme.primary.main}`, background: theme.primary.main,
                                color: "#fff", cursor: "pointer"
                              }}
                            >
                              Current
                            </button>
                          )}
                          {employeeDetails?.attendanceStats?.isFallback && !attendanceFilter && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                              color: theme.warning?.main || "#d97706",
                              backgroundColor: `${theme.warning?.main || "#d97706"}15`,
                              border: `1px solid ${theme.warning?.main || "#d97706"}40`
                            }}>Auto: Prev Month</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {employeeDetails?.attendanceStats ? (
                    <>
                    <div className="epm-fields">
                      <div className="epm-field">
                        <label className="epm-label">Total Days Worked</label>
                        <div style={{ ...valueStyle, fontSize: "24px", fontWeight: 700, color: theme.primary.main }}>
                          {employeeDetails.attendanceStats.totalDaysWorked || 0}
                          {employeeDetails.attendanceStats.totalDays ? (
                            <span style={{ fontSize: 12, color: theme.neutral.gray500, marginLeft: 8 }}>
                              / {employeeDetails.attendanceStats.totalDays} working days
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="epm-field">
                        <label className="epm-label">Late Days</label>
                        <div style={{ ...valueStyle, fontSize: "24px", fontWeight: 700, color: theme.warning.main }}>
                          {employeeDetails.attendanceStats.totalLate || 0}
                        </div>
                      </div>
                      <div className="epm-field">
                        <label className="epm-label">Early Leave Days</label>
                        <div style={{ ...valueStyle, fontSize: "24px", fontWeight: 700, color: theme.warning.main }}>
                          {employeeDetails.attendanceStats.totalEarlyLeave || 0}
                        </div>
                      </div>
                      <div className="epm-field">
                        <label className="epm-label">Absent Days</label>
                        <div style={{ ...valueStyle, fontSize: "24px", fontWeight: 700, color: theme.error.main }}>
                          {employeeDetails.attendanceStats.totalAbsent || 0}
                        </div>
                        <span style={{ fontSize: 11, color: theme.neutral.gray400 }}>to date, excl. weekends</span>
                      </div>
                    </div>

                      {/* Attendance log table */}
                      <div style={{ marginTop: theme.spacing.xl }}>
                        <h4 style={{ margin: 0, marginBottom: theme.spacing.md, color: theme.neutral.gray800 }}>
                          Attendance Log ({new Date(employeeDetails.attendanceStats.year, employeeDetails.attendanceStats.month - 1)
                            .toLocaleDateString("en-US", { month: "long", year: "numeric" })})
                        </h4>
                        {attendanceLoading ? (
                          <p style={{ color: theme.neutral.gray400, fontStyle: "italic" }}>Loading attendance data…</p>
                        ) : employeeDetails?.recentAttendance && employeeDetails.recentAttendance.length > 0 ? (
                          <div style={{ overflowX: "auto", border: `1px solid ${theme.neutral.gray200}`, borderRadius: theme.radius.lg }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                              <thead>
                                <tr style={{ backgroundColor: theme.neutral.gray50, borderBottom: `1px solid ${theme.neutral.gray200}` }}>
                                  <th style={{ textAlign: "left", padding: theme.spacing.md, fontSize: 12, textTransform: "uppercase", color: theme.neutral.gray700 }}>Date</th>
                                  <th style={{ textAlign: "left", padding: theme.spacing.md, fontSize: 12, textTransform: "uppercase", color: theme.neutral.gray700 }}>Check-in</th>
                                  <th style={{ textAlign: "left", padding: theme.spacing.md, fontSize: 12, textTransform: "uppercase", color: theme.neutral.gray700 }}>Check-out</th>
                                  <th style={{ textAlign: "left", padding: theme.spacing.md, fontSize: 12, textTransform: "uppercase", color: theme.neutral.gray700 }}>Total Hours</th>
                                  <th style={{ textAlign: "left", padding: theme.spacing.md, fontSize: 12, textTransform: "uppercase", color: theme.neutral.gray700 }}>Status</th>
                                  <th style={{ textAlign: "left", padding: theme.spacing.md, fontSize: 12, textTransform: "uppercase", color: theme.neutral.gray700 }}>Late Duration</th>
                                </tr>
                              </thead>
                              <tbody>
                                {employeeDetails.recentAttendance.map((row, idx) => {
                                  const checkIn = row.checkIn ? new Date(row.checkIn) : null;
                                  const checkOut = row.checkOut ? new Date(row.checkOut) : null;
                                  const flags = row.flags || {};
                                  const isAbsent = row.isAbsent === true;
                                  const isOnLeave = isAbsent && !!row.leaveInfo;
                                  const leaveTypeLabel = {
                                    paid: "Paid", unpaid: "Unpaid", sick: "Sick",
                                    maternity: "Maternity", personal: "Personal", other: "Other"
                                  }[row.leaveInfo?.type] || row.leaveInfo?.type || "";

                                  // Total working hours
                                  const totalHours = (() => {
                                    if (!checkIn || !checkOut) return null;
                                    const diff = checkOut - checkIn;
                                    const h = Math.floor(diff / 3600000);
                                    const m = Math.floor((diff % 3600000) / 60000);
                                    return `${h}h ${m}m`;
                                  })();

                                  // Late duration (how many minutes past 08:00 VN)
                                  const lateDuration = (() => {
                                    if (!checkIn || !flags.isLate) return null;
                                    const standard = new Date(checkIn);
                                    standard.setHours(8, 0, 0, 0);
                                    const mins = Math.floor((checkIn - standard) / 60000);
                                    return mins > 0 ? `${mins} min` : null;
                                  })();

                                  const rowBg = isOnLeave ? "#e0f2fe20"
                                    : isAbsent ? `${theme.error.main}08`
                                    : flags.isLate ? "#fffbeb50"
                                    : "transparent";

                                  // Status chips — mirrors employee Attendance History
                                  const chips = [];
                                  if (isOnLeave) {
                                    chips.push({ label: "On Leave", sub: leaveTypeLabel || null, color: "#0284c7" });
                                  } else if (isAbsent) {
                                    chips.push({ label: "Absent", sub: null, color: theme.error.main });
                                  } else {
                                    // Check-in status
                                    if (flags.isLate) {
                                      chips.push({ label: "Late", color: "#dc3545" });
                                    } else {
                                      chips.push({ label: "On Time", color: "#28a745" });
                                    }
                                    // Check-out status
                                    if (flags.isEarlyLeave) {
                                      chips.push({ label: "Early Leave", color: "#d97706" });
                                    } else if (flags.isOvertime) {
                                      chips.push({ label: "Overtime", color: "#007bff" });
                                    }
                                  }

                                  return (
                                    <tr
                                      key={idx}
                                      style={{
                                        borderBottom: `1px solid ${theme.neutral.gray100}`,
                                        backgroundColor: rowBg
                                      }}
                                    >
                                      <td style={{ padding: theme.spacing.md, fontWeight: 700, color: isOnLeave ? "#0284c7" : isAbsent ? theme.error.main : theme.neutral.gray800 }}>
                                        {row.date ? new Date(row.date + "T00:00:00").toLocaleDateString("vi-VN") : "-"}
                                      </td>
                                      <td style={{ padding: theme.spacing.md }}>
                                        {checkIn ? (
                                          <span style={{ fontSize: 14, fontWeight: 600, color: flags.isLate ? "#dc3545" : "#28a745" }}>
                                            {checkIn.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                          </span>
                                        ) : <span style={{ color: theme.neutral.gray400 }}>—</span>}
                                      </td>
                                      <td style={{ padding: theme.spacing.md }}>
                                        {checkOut ? (
                                          <span style={{ fontSize: 14, fontWeight: 600, color: flags.isEarlyLeave ? "#d97706" : theme.neutral.gray700 }}>
                                            {checkOut.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                          </span>
                                        ) : <span style={{ color: theme.neutral.gray400 }}>—</span>}
                                      </td>
                                      <td style={{ padding: theme.spacing.md }}>
                                        {totalHours ? (
                                          <span style={{ fontSize: 14, fontWeight: 600, color: "#007bff" }}>{totalHours}</span>
                                        ) : <span style={{ color: theme.neutral.gray400 }}>—</span>}
                                      </td>
                                      <td style={{ padding: theme.spacing.md }}>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                          {chips.map((chip, ci) => (
                                            <span key={ci} style={{
                                              display: "inline-flex", alignItems: "center", gap: 4,
                                              padding: "4px 12px", borderRadius: 4,
                                              fontWeight: 600, fontSize: 11,
                                              textTransform: "uppercase", letterSpacing: "0.5px",
                                              color: "#fff",
                                              backgroundColor: chip.color
                                            }}>
                                              {chip.label}
                                              {chip.sub && <span style={{ fontWeight: 500, fontSize: 10, opacity: 0.9 }}>({chip.sub})</span>}
                                            </span>
                                          ))}
                                        </div>
                                      </td>
                                      <td style={{ padding: theme.spacing.md }}>
                                        {lateDuration ? (
                                          <span style={{
                                            backgroundColor: "#fff3cd", color: "#856404",
                                            padding: "3px 10px", borderRadius: 12,
                                            fontSize: 13, fontWeight: 600
                                          }}>{lateDuration}</span>
                                        ) : <span style={{ color: theme.neutral.gray400 }}>—</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p style={{ color: theme.neutral.gray500, margin: 0, fontStyle: "italic" }}>No attendance records this month</p>
                        )}

                        {/* Leave Requests This Month */}
                        {employeeDetails?.monthLeaveRequests && employeeDetails.monthLeaveRequests.length > 0 && (
                          <div style={{ marginTop: 24 }}>
                            <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700, color: theme.neutral.gray800 }}>
                              Leave Requests This Month
                            </h4>
                            <div style={{ border: `1px solid #bae6fd`, borderRadius: theme.radius.lg, overflow: "hidden" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ backgroundColor: "#f0f9ff", borderBottom: `1px solid #bae6fd` }}>
                                    <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, textTransform: "uppercase", color: "#0369a1" }}>Type</th>
                                    <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, textTransform: "uppercase", color: "#0369a1" }}>Period</th>
                                    <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, textTransform: "uppercase", color: "#0369a1" }}>Days</th>
                                    <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, textTransform: "uppercase", color: "#0369a1" }}>Status</th>
                                    <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 12, textTransform: "uppercase", color: "#0369a1" }}>Reason</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {employeeDetails.monthLeaveRequests.map((lr, lrIdx) => {
                                    const leaveTypeLabel = {
                                      paid: "Paid", unpaid: "Unpaid", sick: "Sick",
                                      maternity: "Maternity", personal: "Personal", other: "Other"
                                    }[lr.type] || lr.type;
                                    const statusColors = {
                                      approved: { color: "#16a34a", bg: "#dcfce7" },
                                      pending:  { color: "#b45309", bg: "#fef9c3" },
                                      rejected: { color: "#dc2626", bg: "#fee2e2" }
                                    };
                                    const sc = statusColors[lr.status] || { color: "#6b7280", bg: "#f3f4f6" };
                                    const isExpanded = expandedLeaveId === lr.id;
                                    return (
                                      <React.Fragment key={lr.id}>
                                        <tr style={{ borderBottom: isExpanded ? "none" : `1px solid #e0f2fe`, backgroundColor: lrIdx % 2 === 0 ? "#fff" : "#f8fcff" }}>
                                          <td style={{ padding: "10px 14px", fontWeight: 600, fontSize: 13, color: "#0284c7" }}>{leaveTypeLabel}</td>
                                          <td style={{ padding: "10px 14px", fontSize: 13, color: theme.neutral.gray700 }}>
                                            {new Date(lr.startDate + "T00:00:00").toLocaleDateString("vi-VN")} – {new Date(lr.endDate + "T00:00:00").toLocaleDateString("vi-VN")}
                                          </td>
                                          <td style={{ padding: "10px 14px", fontSize: 13, color: theme.neutral.gray700 }}>{lr.days} day{lr.days !== 1 ? "s" : ""}</td>
                                          <td style={{ padding: "10px 14px" }}>
                                            <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, color: sc.color, backgroundColor: sc.bg }}>
                                              {lr.status.charAt(0).toUpperCase() + lr.status.slice(1)}
                                            </span>
                                          </td>
                                          <td style={{ padding: "10px 14px" }}>
                                            <button
                                              onClick={() => setExpandedLeaveId(isExpanded ? null : lr.id)}
                                              style={{
                                                cursor: "pointer", background: "none", border: `1px solid #7dd3fc`,
                                                borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#0284c7",
                                                fontWeight: 600
                                              }}
                                            >
                                              {isExpanded ? "Hide" : "View Reason"}
                                            </button>
                                          </td>
                                        </tr>
                                        {isExpanded && (
                                          <tr style={{ borderBottom: `1px solid #e0f2fe`, backgroundColor: lrIdx % 2 === 0 ? "#fff" : "#f8fcff" }}>
                                            <td colSpan={5} style={{ padding: "8px 14px 14px 14px" }}>
                                              <div style={{ backgroundColor: "#f0f9ff", border: `1px solid #bae6fd`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: theme.neutral.gray700, lineHeight: 1.6 }}>
                                                <strong style={{ color: "#0369a1" }}>Reason: </strong>
                                                {lr.reason || <em style={{ color: theme.neutral.gray500 }}>No reason provided</em>}
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p style={{ color: theme.neutral.gray500 }}>No attendance data</p>
                  )}
                </div>
              )}

              {/* Tab: Transfer History */}
              {activeTab === "transfer" && (
                <div>
                  <div style={{ marginBottom: theme.spacing.lg }}>
                    <h3 style={{ margin: 0, marginBottom: theme.spacing.md, color: theme.primary.main }}>Department & Position Transfer History</h3>
                  </div>

                  {transferHistoryLoading ? (
                    <div style={{ textAlign: "center", padding: theme.spacing.lg, color: theme.neutral.gray500 }}>
                      Loading transfer history...
                    </div>
                  ) : transferHistory && transferHistory.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md }}>
                      {transferHistory.map((transfer, idx) => {
                        const effectiveDate = new Date(transfer.effectiveDate);
                        const dateStr = effectiveDate.toLocaleDateString("en-US", { 
                          year: "numeric", 
                          month: "long", 
                          day: "numeric" 
                        });

                        // Format change type with better labels
                        const changeTypeLabels = {
                          hire: "Hire",
                          initial_assignment: "Initial Assignment",
                          transfer: "Transfer",
                          promotion: "Promotion",
                          demotion: "Demotion",
                          correction: "Correction",
                          other: "Other"
                        };
                        const changeTypeLabel = changeTypeLabels[transfer.changeType] || transfer.changeType;

                        // Color coding for change types
                        const getChangeTypeColor = (changeType) => {
                          const colorMap = {
                            hire: { bg: "#dcfce7", color: "#166534", border: "#86efac" },
                            initial_assignment: { bg: "#dbeafe", color: "#164e63", border: "#7dd3fc" },
                            transfer: { bg: "#fce7f3", color: "#831843", border: "#f472b6" },
                            promotion: { bg: "#fef08a", color: "#713f12", border: "#facc15" },
                            demotion: { bg: "#fed7aa", color: "#7c2d12", border: "#fdba74" },
                            correction: { bg: "#f3e8ff", color: "#581c87", border: "#e9d5ff" },
                            other: { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" }
                          };
                          return colorMap[changeType] || colorMap.other;
                        };
                        const typeColor = getChangeTypeColor(transfer.changeType);

                        return (
                          <div
                            key={`transfer-${idx}`}
                            style={{
                              border: `1px solid ${theme.neutral.gray200}`,
                              borderRadius: theme.radius.lg,
                              padding: theme.spacing.lg,
                              backgroundColor: theme.neutral.gray50,
                              transition: "all 0.2s ease"
                            }}
                          >
                            {/* Header with date and change type */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.md, flexWrap: "wrap", gap: theme.spacing.md }}>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: theme.neutral.gray800 }}>
                                  {dateStr}
                                </div>
                                <div style={{ fontSize: 12, color: theme.neutral.gray500, marginTop: 2 }}>
                                  Effective Date
                                </div>
                              </div>
                              <div
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: typeColor.color,
                                  backgroundColor: typeColor.bg,
                                  border: `1px solid ${typeColor.border}`
                                }}
                              >
                                {changeTypeLabel}
                              </div>
                            </div>

                            {/* Department Transfer */}
                            {(transfer.fromDepartmentName || transfer.toDepartmentName) && (
                              <div style={{ marginBottom: theme.spacing.md }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: theme.neutral.gray600, textTransform: "uppercase", marginBottom: 8 }}>
                                  Department
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.md }}>
                                  <div
                                    style={{
                                      flex: 1,
                                      padding: theme.spacing.md,
                                      backgroundColor: "#f0f9ff",
                                      border: `1px solid #bae6fd`,
                                      borderRadius: theme.radius.md,
                                      fontSize: 14,
                                      color: theme.neutral.gray700,
                                      fontWeight: 500
                                    }}
                                  >
                                    {transfer.fromDepartmentName || "N/A"}
                                  </div>
                                  <div style={{ fontSize: 18, color: theme.neutral.gray400, fontWeight: 700 }}>
                                    →
                                  </div>
                                  <div
                                    style={{
                                      flex: 1,
                                      padding: theme.spacing.md,
                                      backgroundColor: "#f0fdf4",
                                      border: `1px solid #bbf7d0`,
                                      borderRadius: theme.radius.md,
                                      fontSize: 14,
                                      color: theme.neutral.gray700,
                                      fontWeight: 500
                                    }}
                                  >
                                    {transfer.toDepartmentName || "N/A"}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Job Title Transfer */}
                            {(transfer.fromJobTitleName || transfer.toJobTitleName) && (
                              <div style={{ marginBottom: theme.spacing.md }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: theme.neutral.gray600, textTransform: "uppercase", marginBottom: 8 }}>
                                  Position / Job Title
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.md }}>
                                  <div
                                    style={{
                                      flex: 1,
                                      padding: theme.spacing.md,
                                      backgroundColor: "#fef3c7",
                                      border: `1px solid #fde68a`,
                                      borderRadius: theme.radius.md,
                                      fontSize: 14,
                                      color: theme.neutral.gray700,
                                      fontWeight: 500
                                    }}
                                  >
                                    {transfer.fromJobTitleName || "N/A"}
                                  </div>
                                  <div style={{ fontSize: 18, color: theme.neutral.gray400, fontWeight: 700 }}>
                                    →
                                  </div>
                                  <div
                                    style={{
                                      flex: 1,
                                      padding: theme.spacing.md,
                                      backgroundColor: "#fce7f3",
                                      border: `1px solid #fbcfe8`,
                                      borderRadius: theme.radius.md,
                                      fontSize: 14,
                                      color: theme.neutral.gray700,
                                      fontWeight: 500
                                    }}
                                  >
                                    {transfer.toJobTitleName || "N/A"}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {transfer.notes && (
                              <div style={{ marginBottom: theme.spacing.md }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: theme.neutral.gray600, textTransform: "uppercase", marginBottom: 8 }}>
                                  Notes
                                </div>
                                <div
                                  style={{
                                    padding: theme.spacing.md,
                                    backgroundColor: "#f9fafb",
                                    border: `1px solid ${theme.neutral.gray200}`,
                                    borderRadius: theme.radius.md,
                                    fontSize: 13,
                                    color: theme.neutral.gray700,
                                    fontStyle: "italic"
                                  }}
                                >
                                  {transfer.notes}
                                </div>
                              </div>
                            )}

                            {/* Changed By */}
                            {transfer.changedBy && (
                              <div style={{ fontSize: 12, color: theme.neutral.gray500, paddingTop: theme.spacing.md, borderTop: `1px solid ${theme.neutral.gray200}` }}>
                                <strong>Changed by:</strong> {transfer.changedBy.name} ({transfer.changedBy.employeeCode})
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: theme.spacing.lg, color: theme.neutral.gray500, fontStyle: "italic" }}>
                      No transfer history found
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

