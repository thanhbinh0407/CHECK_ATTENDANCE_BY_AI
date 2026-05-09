import React, { useEffect, useMemo, useRef, useState } from "react";
import { theme } from "../styles/theme.js";
import * as faceapi from "face-api.js";
import { EDUCATION_COEFFICIENTS } from "../utils/salaryCalculation.js";
import { filterNumbersFromName, validateName, validateEmail, validateEmployeeCode, validatePassword } from "../utils/validationUtils.js";
import { calculateAntiSpoofingScore } from "../utils/antiSpoofing.js";

const JOB_LABELS = {
  "Nhân viên CNTT": "IT Staff",
  "Chuyên viên CNTT": "IT Specialist",
  "Chuyên viên chính": "Senior Specialist",
  "Phó phòng CNTT": "IT Deputy Manager",
  "Trưởng phòng CNTT": "IT Manager",
  "Nhân viên": "Employee",
  "Chuyên viên": "Specialist",
  "Phó phòng": "Deputy Manager",
  "Trưởng phòng": "Manager",
  "Phó giám đốc": "Deputy Director",
  "Giám đốc": "Director",
};
const EDU_LABELS = {
  "Trung cấp": "Vocational",
  "Cao đẳng": "College",
  "Đại học": "University",
  "Sau đại học (ThS/TS)": "Postgraduate (Master/PhD)",
};

export default function EnrollmentForm() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  /** Number of faces in frame; capture allowed only when exactly 1 */
  const [detectedFaceCount, setDetectedFaceCount] = useState(0);
  const [jobTitles, setJobTitles] = useState([]);
  const [jobTitlesLoading, setJobTitlesLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeCode: "",
    password: "",
    jobTitle: "Employee",
    jobTitleId: null,
    educationLevel: "University",
    baseSalary: 1800000
  });
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [capturedDescriptor, setCapturedDescriptor] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [passwordGenerated, setPasswordGenerated] = useState(false);
  const detectionIntervalRef = useRef(null);
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  /** Slightly larger input + lower threshold so a second (smaller/distant) face is more likely to be detected */
  const faceDetectorOptions = useMemo(
    () =>
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.38
      }),
    []
  );
  const normalizedEmployeeCode = String(formData.employeeCode || "").trim().toUpperCase();

  // Validation errors state
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    employeeCode: "",
    password: "",
    baseSalary: "",
    jobTitle: "",
    faceCapture: ""
  });
  
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    employeeCode: false,
    password: false,
    baseSalary: false,
    jobTitle: false
  });

  // Load face detection models
  useEffect(() => {
    loadModels();
  }, []);
  
  // Validation functions
  const validateField = (fieldName, value) => {
    let error = "";
    
    switch(fieldName) {
      case "name":
        const nameCheck = validateName(value);
        if (!nameCheck.valid) error = nameCheck.message;
        break;
      case "email":
        const emailCheck = validateEmail(value);
        if (!emailCheck.valid) error = emailCheck.message;
        break;
      case "employeeCode":
        const codeCheck = validateEmployeeCode(value);
        if (!codeCheck.valid) error = codeCheck.message;
        break;
      case "password":
        if (useCustomPassword) {
          const pwdCheck = validatePassword(value, true);
          if (!pwdCheck.valid) error = pwdCheck.message;
        }
        break;
      case "baseSalary":
        if (!value || value <= 0) {
          error = "Base salary must be greater than 0";
        }
        break;
      case "jobTitle":
        if (!formData.jobTitleId) {
          error = "Please select a job title";
        }
        break;
      default:
        break;
    }
    
    setErrors(prev => ({ ...prev, [fieldName]: error }));
    return error === "";
  };
  
  const handleBlur = (fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, formData[fieldName]);
  };
  
  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    if (touched[fieldName]) {
      validateField(fieldName, value);
    }
  };

  // Generate unique employee code based on job title code (e.g., NVC + 3 random digits)
  const generateEmployeeCodeForJob = async (job) => {
    try {
      if (!job) return;
      const prefix = job.code || "EMP";

      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));

      const existingCodes = Array.isArray(data.employees)
        ? data.employees
            .map((e) => e.employeeCode)
            .filter((code) => typeof code === "string" && code.startsWith(prefix))
        : [];

      const usedSuffixes = new Set(
        existingCodes
          .map((code) => code.slice(prefix.length))
          .filter((s) => /^[0-9]{3}$/.test(s))
      );

      let suffix = "000";
      for (let i = 0; i < 1000; i++) {
        const candidate = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
        if (!usedSuffixes.has(candidate)) {
          suffix = candidate;
          break;
        }
      }

      const newCode = `${prefix}${suffix}`;
      setFormData((prev) => ({ ...prev, employeeCode: newCode }));
      setErrors((prev) => ({ ...prev, employeeCode: "" }));
    } catch (err) {
      console.error("Error generating employee code:", err);
      // Không chặn flow nếu lỗi, chỉ log ra console
    }
  };

  // Load job titles for admin enrollment form
  useEffect(() => {
    const loadJobTitles = async () => {
      try {
        setJobTitlesLoading(true);
        const token = localStorage.getItem("authToken");
        const res = await fetch(`${apiBase}/api/job-titles`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          const activeTitles = (data.jobTitles || []).filter((jt) => jt.isActive);
          setJobTitles(activeTitles);

          // If no selection yet, default to first active job title and its base salary
          if (activeTitles.length > 0 && !formData.jobTitleId) {
            const first = activeTitles[0];
            setFormData((prev) => ({
              ...prev,
              jobTitleId: first.id,
              jobTitle: first.name || prev.jobTitle,
              baseSalary: first.baseSalaryMin
                ? parseInt(first.baseSalaryMin)
                : prev.baseSalary
            }));
            // Tự sinh mã nhân viên cho job mặc định
            generateEmployeeCodeForJob(first);
          }
        } else {
          setMessage(
            "Failed to load job titles: " + (data.message || "Unknown error")
          );
        }
      } catch (err) {
        console.error("Error loading job titles:", err);
        setMessage("Failed to load job titles from server");
      } finally {
        setJobTitlesLoading(false);
      }
    };

    loadJobTitles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime face detection loop
  useEffect(() => {
    if (cameraActive && modelsLoaded && videoRef.current && canvasRef.current) {
      detectionIntervalRef.current = setInterval(async () => {
        try {
          const detections = await faceapi
            .detectAllFaces(videoRef.current, faceDetectorOptions)
            .withFaceLandmarks();

          const count = detections.length;
          setDetectedFaceCount(count);

          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const warnMulti = count >= 2;
          const stroke = warnMulti ? "#ff4444" : "#00ff00";
          const fill = warnMulti ? "#ff4444" : "#00ff00";

          detections.forEach((detection) => {
            const box = detection.detection.box;
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            if (detection.landmarks) {
              ctx.fillStyle = fill;
              ctx.strokeStyle = fill;
              ctx.lineWidth = 2;

              // Draw jawline
              const jawline = detection.landmarks.getJawOutline();
              ctx.beginPath();
              jawline.forEach((point, i) => {
                if (i === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
              });
              ctx.stroke();

              // Draw eyes
              const leftEye = detection.landmarks.getLeftEye();
              const rightEye = detection.landmarks.getRightEye();
              [leftEye, rightEye].forEach((eye) => {
                ctx.beginPath();
                eye.forEach((point, i) => {
                  if (i === 0) ctx.moveTo(point.x, point.y);
                  else ctx.lineTo(point.x, point.y);
                });
                ctx.closePath();
                ctx.stroke();
              });

              // Draw nose
              const nose = detection.landmarks.getNose();
              ctx.beginPath();
              nose.forEach((point, i) => {
                if (i === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
              });
              ctx.stroke();

              // Draw mouth
              const mouth = detection.landmarks.getMouth();
              ctx.beginPath();
              mouth.forEach((point, i) => {
                if (i === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
              });
              ctx.closePath();
              ctx.stroke();

              // Draw keypoints
              ctx.fillStyle = fill;
              detection.landmarks.positions.forEach((point) => {
                ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
              });
            }
          });
        } catch (err) {
          console.error("Detection error:", err);
        }
      }, 100);

      return () => {
        if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      };
    }
  }, [cameraActive, modelsLoaded, faceDetectorOptions]);

  useEffect(() => {
    if (detectedFaceCount !== 1) return;
    setErrors((prev) => {
      if (prev.faceCapture !== "Multiple faces in frame") return prev;
      return { ...prev, faceCapture: "" };
    });
  }, [detectedFaceCount]);

  const loadModels = async () => {
    try {
      setMessage("Loading models...");
      const modelUrls = [
        "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model/",
        "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/models/"
      ];
      let loaded = false;
      for (const modelUrl of modelUrls) {
        try {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
            faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
            faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
          ]);
          setModelsLoaded(true);
          setMessage("Ready to enroll");
          loaded = true;
          break;
        } catch (err) {
          console.warn(`Failed to load from ${modelUrl}:`, err.message);
        }
      }
      if (!loaded) setMessage("Model loading failed");
    } catch (error) {
      console.error("Model loading error:", error);
      setMessage("Model loading failed");
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play();
        setCameraActive(true);
        setMessage("Camera active - position your face");
      };
    } catch (error) {
      setMessage("Camera access denied: " + error.message);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      setCameraActive(false);
      setDetectedFaceCount(0);
      setMessage("Camera stopped");
    }
  };

  const captureFace = async () => {
    if (!cameraActive || !modelsLoaded) return;

    try {
      setLoading(true);
      setMessage("Capturing face...");

      const allDetections = await faceapi
        .detectAllFaces(videoRef.current, faceDetectorOptions)
        .withFaceLandmarks();

      if (allDetections.length > 1) {
        setMessage(
          `Warning: ${allDetections.length} faces detected. Only one person is allowed — please ask others to leave the frame.`
        );
        setErrors((prev) => ({
          ...prev,
          faceCapture: "Multiple faces in frame"
        }));
        setLoading(false);
        return;
      }

      const detection = await faceapi
        .detectSingleFace(videoRef.current, faceDetectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setMessage("No face detected - please try again");
        setLoading(false);
        return;
      }

      const anti = calculateAntiSpoofingScore(videoRef.current);
      const antiScore = Number.isFinite(anti?.score) ? anti.score : 100;
      const ANTI_PHOTO_THRESHOLD = 28;
      if (antiScore < ANTI_PHOTO_THRESHOLD) {
        setMessage("Photo spoofing is not accepted. Please use a real face in front of the camera (with good lighting).");
        setErrors((prev) => ({ ...prev, faceCapture: "Photo not allowed" }));
        setLoading(false);
        return;
      }

      setCapturedDescriptor(Array.from(detection.descriptor));
      setMessage("Face captured successfully!");
      setErrors((prev) => ({ ...prev, faceCapture: "" }));
    } catch (error) {
      setMessage("Capture error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEnrollment = async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      employeeCode: true,
      password: useCustomPassword,
      baseSalary: true,
      jobTitle: true
    });
    
    // Validate all fields
    const nameValid = validateField("name", formData.name);
    const emailValid = validateField("email", formData.email);
    const codeValid = validateField("employeeCode", normalizedEmployeeCode);
    const passwordValid = useCustomPassword ? validateField("password", formData.password) : true;
    const salaryValid = validateField("baseSalary", formData.baseSalary);
    const jobTitleValid = validateField("jobTitle", formData.jobTitle);

    setErrors(prev => ({ ...prev, faceCapture: "" }));
    
    if (!nameValid || !emailValid || !codeValid || !passwordValid || !salaryValid || !jobTitleValid) {
      setMessage("❌ Please fix all validation errors before submitting");
      return;
    }
    if (!normalizedEmployeeCode) {
      setErrors((prev) => ({ ...prev, employeeCode: "Employee code has not been generated yet" }));
      setTouched((prev) => ({ ...prev, employeeCode: true }));
      setMessage("❌ Employee code is not ready. Please select Job Title to auto-generate code.");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      
      const payload = {
        name: formData.name,
        email: formData.email,
        employeeCode: normalizedEmployeeCode,
        password: useCustomPassword ? formData.password : undefined,
        jobTitleId: formData.jobTitleId,
        jobTitle: formData.jobTitle,
        educationLevel: formData.educationLevel,
        baseSalary: formData.baseSalary
      };
      if (capturedDescriptor) {
        payload.descriptor = capturedDescriptor;
      }

      const res = await fetch(`${apiBase}/api/enroll/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        const persistedCode =
          data?.employee?.employeeCode ||
          data?.user?.employeeCode ||
          data?.employeeCode ||
          normalizedEmployeeCode;
        setMessage(`✅ Employee registered successfully! Employee Code: ${persistedCode}`);
        setGeneratedPassword(data.password);
        setPasswordGenerated(data.passwordGenerated || false);
        setFormData({ 
          name: "", 
          email: "", 
          employeeCode: "", 
          password: "",
          jobTitle: "Employee",
          jobTitleId: null,
          educationLevel: "University",
          baseSalary: 1800000
        });
        setUseCustomPassword(false);
        setCapturedDescriptor(null);
        setErrors({
          name: "",
          email: "",
          employeeCode: "",
          password: "",
          baseSalary: "",
          jobTitle: "",
          faceCapture: ""
        });
        setTouched({
          name: false,
          email: false,
          employeeCode: false,
          password: false,
          baseSalary: false,
          jobTitle: false
        });
      } else {
        setMessage("❌ Registration failed: " + data.message);
        setGeneratedPassword(null);
        setPasswordGenerated(false);
      }
    } catch (error) {
      setMessage("❌ Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0"
  };

  const welcomeStyle = {
    padding: "18px 22px",
    borderRadius: "12px 12px 0 0",
    marginBottom: "0"
  };

  const contentCardStyle = {
    backgroundColor: theme.neutral.white,
    borderRadius: "0 0 12px 12px",
    padding: "20px 22px",
    boxShadow: (theme.shadows && theme.shadows.md) || "0 2px 16px rgba(0,0,0,0.08)"
  };

  const labelStyle = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "6px",
    fontWeight: "700",
    color: "#1f2937",
    fontSize: "13px",
    letterSpacing: "0.2px"
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${theme.neutral.gray200}`,
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box",
    transition: "all 0.3s ease",
    backgroundColor: "#fafafa",
    fontWeight: "500"
  };
  
  const inputErrorStyle = {
    ...inputStyle,
    border: "1px solid #ef4444",
    backgroundColor: "#fef2f2"
  };
  
  const inputHoverStyle = {
    border: `1px solid ${theme.info.main}`,
    backgroundColor: "#ffffff",
    boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.1)"
  };
  
  const inputFocusStyle = {
    outline: "none",
    border: `1px solid ${theme.info.main}`,
    backgroundColor: "#ffffff",
    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.15)"
  };
  
  const inputFocusErrorStyle = {
    outline: "none",
    border: "1px solid #ef4444",
    backgroundColor: "#ffffff",
    boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.15)"
  };
  
  const getInputStyle = (fieldName) => {
    return touched[fieldName] && errors[fieldName] ? inputErrorStyle : inputStyle;
  };
  
  const getInputFocusStyle = (fieldName) => {
    return touched[fieldName] && errors[fieldName] ? inputFocusErrorStyle : inputFocusStyle;
  };
  
  const errorMessageStyle = {
    fontSize: "13px",
    color: "#ef4444",
    marginTop: "6px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontWeight: "500"
  };

  const buttonStyle = {
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: "600",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    width: "100%"
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
    transform: "translateY(0)",
    ':hover': {
      transform: "translateY(-2px)",
      boxShadow: "0 6px 16px rgba(59, 130, 246, 0.4)"
    }
  };

  const successButtonStyle = {
    ...buttonStyle,
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
    transform: "translateY(0)"
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(107, 114, 128, 0.3)"
  };

  return (
    <div style={containerStyle}>
      {/* Welcome Header */}
      <div style={{ ...welcomeStyle, background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)" }}>
        <h1 style={{ margin: "0 0 6px 0", fontSize: "22px", fontWeight: "700", color: "#fff", lineHeight: 1.25 }}>
          New Employee Registration
        </h1>
        <p style={{ margin: 0, fontSize: "13px", opacity: 0.92, color: "#fff", lineHeight: 1.45 }}>
          Create employee profile; face capture optional now. * Required fields.
        </p>
      </div>

      {/* Main Content */}
      <div style={contentCardStyle}>
        {message && (
          <div style={{
            padding: "10px 14px",
            backgroundColor: /success|captured successfully/i.test(message) ? theme.success.bg : /failed|error|denied|required|cannot|invalid|please enter|Photo spoofing is not accepted|Warning:|faces detected|Multiple faces/i.test(message) ? theme.error.bg : theme.info.bg,
            border: `1px solid ${/success|captured successfully/i.test(message) ? theme.success.border : /failed|error|denied|required|cannot|invalid|please enter|Photo spoofing is not accepted|Warning:|faces detected|Multiple faces/i.test(message) ? theme.error.border : theme.info.border}`,
            borderRadius: "8px",
            color: /success|captured successfully/i.test(message) ? theme.success.text : /failed|error|denied|required|cannot|invalid|please enter|Photo spoofing is not accepted|Warning:|faces detected|Multiple faces/i.test(message) ? theme.error.text : theme.info.text,
            marginBottom: "16px",
            fontSize: "13px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            {message}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Left: Form */}
        <div>
          <form onSubmit={handleSubmitEnrollment}>
            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>
                <span style={{ fontSize: "15px" }}>👤</span>
                <span>Full Name *</span>
              </label>
              <input
                type="text"
                style={getInputStyle("name")}
                value={formData.name}
                onChange={(e) => handleFieldChange("name", filterNumbersFromName(e.target.value))}
                onBlur={(e) => { handleBlur("name"); Object.assign(e.target.style, getInputStyle("name")); }}
                placeholder="John Doe"
                onFocus={(e) => Object.assign(e.target.style, getInputFocusStyle("name"))}
                onMouseEnter={(e) => { if (e.target !== document.activeElement && !errors.name) Object.assign(e.target.style, inputHoverStyle) }}
                onMouseLeave={(e) => { if (e.target !== document.activeElement) Object.assign(e.target.style, getInputStyle("name")) }}
              />
              {touched.name && errors.name && (
                <div style={errorMessageStyle}>
                  <span>⚠️</span>
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>
                <span style={{ fontSize: "15px" }}>📧</span>
                <span>Email Address *</span>
              </label>
              <input
                type="email"
                style={getInputStyle("email")}
                value={formData.email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                onBlur={(e) => { handleBlur("email"); Object.assign(e.target.style, getInputStyle("email")); }}
                placeholder="john@company.com"
                onFocus={(e) => Object.assign(e.target.style, getInputFocusStyle("email"))}
                onMouseEnter={(e) => { if (e.target !== document.activeElement && !errors.email) Object.assign(e.target.style, inputHoverStyle) }}
                onMouseLeave={(e) => { if (e.target !== document.activeElement) Object.assign(e.target.style, getInputStyle("email")) }}
              />
              {touched.email && errors.email && (
                <div style={errorMessageStyle}>
                  <span>⚠️</span>
                  <span>{errors.email}</span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>
                <span style={{ fontSize: "15px" }}>🆔</span>
                <span>Employee Code *</span>
              </label>
              <input
                type="text"
                style={getInputStyle("employeeCode")}
                value={formData.employeeCode}
                readOnly
                placeholder="Auto-generated from Job Title"
              />
              {!errors.employeeCode && (
                <div style={{ fontSize: "12px", color: theme.neutral.gray600, marginTop: "6px", fontWeight: "500" }}>
                  🔒 Auto-generated from Job Title (cannot be edited)
                </div>
              )}
              {touched.employeeCode && errors.employeeCode && (
                <div style={errorMessageStyle}>
                  <span>⚠️</span>
                  <span>{errors.employeeCode}</span>
                </div>
              )}
            </div>

            {/* Job Title - loaded from Job Title Management */}
            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>
                <span style={{ fontSize: "15px" }}>💼</span>
                <span>Job Title *</span>
              </label>
              <select
                style={getInputStyle("jobTitle")}
                value={formData.jobTitleId || ""}
                onChange={(e) => {
                  const id = parseInt(e.target.value) || null;
                  const selected = jobTitles.find((jt) => jt.id === id);
                  setFormData((prev) => ({
                    ...prev,
                    jobTitleId: id,
                    jobTitle: selected ? (selected.name || prev.jobTitle) : prev.jobTitle,
                    baseSalary:
                      selected && selected.baseSalaryMin
                        ? parseInt(selected.baseSalaryMin)
                        : prev.baseSalary
                  }));
                  // Khi chọn chức danh, tự sinh mã nhân viên dựa trên mã chức danh (ví dụ NVC + 3 số)
                  if (selected) {
                    generateEmployeeCodeForJob(selected);
                  }
                  if (touched.jobTitle) {
                    validateField("jobTitle", selected ? selected.name : "");
                  }
                }}
                onBlur={(e) => { handleBlur("jobTitle"); Object.assign(e.target.style, getInputStyle("jobTitle")); }}
                disabled={jobTitlesLoading || jobTitles.length === 0}
                onFocus={(e) => Object.assign(e.target.style, getInputFocusStyle("jobTitle"))}
                onMouseEnter={(e) => { if (e.target !== document.activeElement && !errors.jobTitle) Object.assign(e.target.style, inputHoverStyle) }}
                onMouseLeave={(e) => { if (e.target !== document.activeElement) Object.assign(e.target.style, getInputStyle("jobTitle")) }}
              >
                <option value="">
                  {jobTitlesLoading
                    ? "Loading job titles..."
                    : "Select job title"}
                </option>
                {jobTitles.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.name}
                    {job.code ? ` (${job.code})` : ""}
                  </option>
                ))}
              </select>
              {touched.jobTitle && errors.jobTitle && (
                <div style={errorMessageStyle}>
                  <span>⚠️</span>
                  <span>{errors.jobTitle}</span>
                </div>
              )}
            </div>

            {/* Education Level */}
            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>
                <span style={{ fontSize: "15px" }}>🎓</span>
                <span>Education Level *</span>
              </label>
              <select
                style={inputStyle}
                value={formData.educationLevel}
                onChange={(e) => setFormData({...formData, educationLevel: e.target.value})}
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                onMouseEnter={(e) => { if (e.target !== document.activeElement) Object.assign(e.target.style, inputHoverStyle) }}
                onMouseLeave={(e) => { if (e.target !== document.activeElement) Object.assign(e.target.style, inputStyle) }}
              >
                {Object.keys(EDUCATION_COEFFICIENTS).map(edu => (
                  <option key={edu} value={edu}>{EDU_LABELS[edu] || edu}</option>
                ))}
              </select>
            </div>

            {/* Base Salary */}
            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>
                <span style={{ fontSize: "15px" }}>💰</span>
                <span>Base Salary (VND) *</span>
              </label>
              <input
                type="number"
                style={getInputStyle("baseSalary")}
                value={formData.baseSalary}
                readOnly
                min="0"
                placeholder="1800000"
              />
              {touched.baseSalary && errors.baseSalary && (
                <div style={errorMessageStyle}>
                  <span>⚠️</span>
                  <span>{errors.baseSalary}</span>
                </div>
              )}
              {!errors.baseSalary && (
                <div style={{ fontSize: "12px", color: theme.neutral.gray600, marginTop: "6px", fontWeight: "500" }}>
                  💡 Auto from selected Job Title (view only)
                </div>
              )}
            </div>

            <div style={{ marginBottom: "16px", paddingTop: "14px", borderTop: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "10px", padding: "10px 12px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                <input
                  type="checkbox"
                  id="useCustomPassword"
                  checked={useCustomPassword}
                  onChange={(e) => {
                    setUseCustomPassword(e.target.checked);
                    if (!e.target.checked) {
                      setFormData({...formData, password: ""});
                      setErrors(prev => ({...prev, password: ""}));
                      setTouched(prev => ({...prev, password: false}));
                    }
                  }}
                  style={{ marginRight: "10px", width: "18px", height: "18px", cursor: "pointer" }}
                />
                <label htmlFor="useCustomPassword" style={{ margin: 0, cursor: "pointer", fontWeight: "600", fontSize: "14px", color: "#374151", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "16px" }}>🔐</span>
                  <span>Use custom password (leave unchecked for auto-generated password)</span>
                </label>
              </div>
              {useCustomPassword && (
                <div style={{ marginTop: "16px" }}>
                  <label style={{...labelStyle}}>
                    <span style={{ fontSize: "15px" }}>🔑</span>
                    <span>Password *</span>
                  </label>
                  <input
                    type="password"
                    style={getInputStyle("password")}
                    value={formData.password}
                    onChange={(e) => handleFieldChange("password", e.target.value)}
                    onBlur={(e) => { handleBlur("password"); Object.assign(e.target.style, getInputStyle("password")); }}
                    placeholder="Enter password for employee"
                    minLength={6}
                    onFocus={(e) => Object.assign(e.target.style, getInputFocusStyle("password"))}
                    onMouseEnter={(e) => { if (e.target !== document.activeElement && !errors.password) Object.assign(e.target.style, inputHoverStyle) }}
                    onMouseLeave={(e) => { if (e.target !== document.activeElement) Object.assign(e.target.style, getInputStyle("password")) }}
                  />
                  {touched.password && errors.password && (
                    <div style={errorMessageStyle}>
                      <span>⚠️</span>
                      <span>{errors.password}</span>
                    </div>
                  )}
                  {!errors.password && (
                    <div style={{ fontSize: "12px", color: theme.neutral.gray600, marginTop: "6px", fontWeight: "500" }}>
                      🔒 Password must be at least 6 characters
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ 
              marginBottom: "16px", 
              paddingTop: "14px", 
              borderTop: `1px solid ${theme.neutral.gray200}`
            }}>
              <label style={{...labelStyle}}>
                <span style={{ fontSize: "15px" }}>📸</span>
                <span>Face Recognition Status</span>
              </label>
              <div style={{
                padding: "10px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: capturedDescriptor ? theme.success.bg : (errors.faceCapture ? "#fef2f2" : theme.warning.bg),
                border: `1px solid ${capturedDescriptor ? theme.success.border : (errors.faceCapture ? "#ef4444" : theme.warning.border)}`,
                color: capturedDescriptor ? theme.success.text : (errors.faceCapture ? "#ef4444" : theme.warning.text)
              }}>
                <span style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: capturedDescriptor ? "#28a745" : (errors.faceCapture ? "#ef4444" : "#ffc107"),
                  display: "inline-block"
                }}></span>
                {capturedDescriptor ? "✅ Face captured - Ready to enroll" : "⚠️ Face not captured yet (you can update later)"}
              </div>
            </div>

            <button
              type="submit"
              style={{
                ...successButtonStyle,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? "not-allowed" : "pointer"
              }}
              disabled={loading}
            >
              {loading ? "Enrolling..." : "Complete Enrollment"}
            </button>
          </form>
        </div>

        {/* Right: Camera with Canvas */}
        <div>
          <div style={{
            position: "relative",
            width: "100%",
            backgroundColor: "#000",
            borderRadius: "8px",
            overflow: "hidden",
            marginBottom: "16px",
            aspectRatio: "4/3"
          }}>
            <video
              ref={videoRef}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                objectFit: "cover"
              }}
              autoPlay
              muted
              playsInline
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: 10
              }}
              width={640}
              height={480}
            />
            {!cameraActive && (
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "#999",
                textAlign: "center",
                fontSize: "13px",
                zIndex: 5
              }}>
                  Camera not active
              </div>
            )}
            {cameraActive && detectedFaceCount >= 2 && (
              <div style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                right: "10px",
                backgroundColor: "rgba(220, 38, 38, 0.95)",
                color: "#fff",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                zIndex: 20,
                lineHeight: 1.35
              }}>
                Warning: {detectedFaceCount} faces detected — only one person allowed
              </div>
            )}
            {cameraActive && detectedFaceCount === 1 && (
              <div style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                backgroundColor: "#28a745",
                color: "white",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                zIndex: 20
              }}>
                Face Detected
              </div>
            )}
            {cameraActive && detectedFaceCount === 0 && (
              <div style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                backgroundColor: "#ffc107",
                color: "#333",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                zIndex: 20
              }}>
                No Face
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              onClick={startCamera}
              style={{
                ...primaryButtonStyle,
                opacity: cameraActive || loading ? 0.6 : 1
              }}
              disabled={cameraActive || loading}
            >
              Start Camera
            </button>
            <button
              onClick={captureFace}
              style={{
                ...successButtonStyle,
                opacity: !cameraActive || loading || detectedFaceCount !== 1 ? 0.6 : 1
              }}
              disabled={!cameraActive || loading || detectedFaceCount !== 1}
            >
              {loading ? "Capturing..." : "Capture Face"}
            </button>
            <button
              onClick={stopCamera}
              style={{
                ...secondaryButtonStyle,
                opacity: !cameraActive ? 0.6 : 1
              }}
              disabled={!cameraActive}
            >
              Stop Camera
            </button>
          </div>
        </div>
      </div>

      {/* Password Display Section */}
      {generatedPassword && (
        <div style={{
          marginTop: "32px",
          padding: "16px 18px",
          backgroundColor: theme.success.bg,
          borderRadius: "12px",
          border: `2px solid ${theme.success.border}`
        }}>
          <div style={{ fontWeight: "700", marginBottom: "12px", color: theme.success.text, fontSize: "16px" }}>
            {passwordGenerated ? "Password was auto-generated" : "Password was created"}
          </div>
          <div style={{
            fontSize: "24px",
            fontFamily: "'Courier New', monospace",
            fontWeight: "700",
            color: theme.info.main,
            backgroundColor: theme.neutral.white,
            padding: "20px 24px",
            borderRadius: "10px",
            display: "block",
            letterSpacing: "3px",
            border: `2px solid ${theme.info.main}`,
            textAlign: "center",
            marginBottom: "16px"
          }}>
            {generatedPassword}
          </div>
          <div style={{ 
            marginBottom: "16px", 
            padding: "16px", 
            backgroundColor: theme.warning.bg, 
            borderRadius: "10px",
            fontSize: "14px", 
            color: theme.warning.text,
            border: `2px solid ${theme.warning.border}`
          }}>
            <strong>Important:</strong> Please save this password and provide it to the employee. It will not be shown again after you leave this page.
          </div>
          <button
            onClick={(e) => {
              navigator.clipboard.writeText(generatedPassword);
              const btn = e.target;
              const originalText = btn.textContent;
              btn.textContent = "Copied!";
              btn.style.backgroundColor = "#28a745";
              setTimeout(() => {
                btn.textContent = originalText;
                btn.style.backgroundColor = theme.info.main;
              }, 2000);
            }}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: theme.info.main,
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
              transition: "all 0.2s"
            }}
          >
            Copy Password
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
