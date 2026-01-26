import React, { useEffect, useRef, useState } from "react";
import { theme, commonStyles } from "../styles/theme.js";
import * as faceapi from "face-api.js";
import { JOB_COEFFICIENTS, EDUCATION_COEFFICIENTS, CERTIFICATE_COEFFICIENTS } from "../utils/salaryCalculation.js";

export default function EnrollmentForm() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [faceDetected, setFaceDetected] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeCode: "",
    password: "",
    jobTitle: "Nhân viên",
    educationLevel: "Đại học",
    certificates: [],
    dependents: 0,
    baseSalary: 1800000
  });
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [capturedDescriptor, setCapturedDescriptor] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [passwordGenerated, setPasswordGenerated] = useState(false);
  const detectionIntervalRef = useRef(null);

  // Load face detection models
  useEffect(() => {
    loadModels();
  }, []);

  // Realtime face detection loop
  useEffect(() => {
    if (cameraActive && modelsLoaded && videoRef.current && canvasRef.current) {
      detectionIntervalRef.current = setInterval(async () => {
        try {
          const detections = await faceapi
            .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
            .withFaceLandmarks();

          setFaceDetected(detections.length > 0);

          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          detections.forEach((detection) => {
            const box = detection.detection.box;
            ctx.strokeStyle = "#00ff00";
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            if (detection.landmarks) {
              ctx.fillStyle = "#00ff00";
              ctx.strokeStyle = "#00ff00";
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
              ctx.fillStyle = "#00ff00";
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
  }, [cameraActive, modelsLoaded]);

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
          console.log("Models loaded from", modelUrl);
          break;
        } catch (err) {
          console.warn(`Failed to load from ${modelUrl}:`, err.message);
        }
      }
      if (!loaded) throw new Error("Failed to load models from all sources");
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
      setMessage("Camera stopped");
    }
  };

  const captureFace = async () => {
    if (!cameraActive || !modelsLoaded) return;
    
    try {
      setLoading(true);
      setMessage("Capturing face...");

      // Check for multiple faces first
      const allDetections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
        .withFaceLandmarks();

      if (allDetections.length > 1) {
        setMessage(`Phát hiện ${allDetections.length} khuôn mặt! Chỉ 1 khuôn mặt được phép. Vui lòng loại bỏ những người khác.`);
        setLoading(false);
        return;
      }

      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setMessage("No face detected - please try again");
        setLoading(false);
        return;
      }

      setCapturedDescriptor(Array.from(detection.descriptor));
      setMessage("Face captured successfully!");
    } catch (error) {
      setMessage("Capture error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEnrollment = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.employeeCode) {
      setMessage("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    if (useCustomPassword && (!formData.password || formData.password.length < 6)) {
      setMessage("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (!capturedDescriptor) {
      setMessage("Vui lòng chụp ảnh khuôn mặt trước khi đăng ký");
      return;
    }

    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      const token = localStorage.getItem("authToken");
      
      const res = await fetch(`${apiBase}/api/enroll/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          employeeCode: formData.employeeCode,
          descriptor: capturedDescriptor,
          password: useCustomPassword ? formData.password : undefined,
          jobTitle: formData.jobTitle,
          educationLevel: formData.educationLevel,
          certificates: formData.certificates,
          dependents: formData.dependents,
          baseSalary: formData.baseSalary
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Đăng ký nhân viên thành công!");
        setGeneratedPassword(data.password);
        setPasswordGenerated(data.passwordGenerated || false);
        setFormData({ 
          name: "", 
          email: "", 
          employeeCode: "", 
          password: "",
          jobTitle: "Nhân viên",
          educationLevel: "Đại học",
          certificates: [],
          dependents: 0,
          baseSalary: 1800000
        });
        setUseCustomPassword(false);
        setCapturedDescriptor(null);
      } else {
        setMessage("Đăng ký thất bại: " + data.message);
        setGeneratedPassword(null);
        setPasswordGenerated(false);
      }
    } catch (error) {
      setMessage("Error: " + error.message);
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
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    padding: "40px 32px",
    borderRadius: "16px 16px 0 0",
    marginBottom: "0"
  };

  const titleStyle = {
    fontSize: "32px",
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: "8px"
  };

  const subtitleStyle = {
    fontSize: "15px",
    color: "#666",
    marginBottom: "32px"
  };

  const contentCardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "0 0 16px 16px",
    padding: "40px 32px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.1)"
  };

  const labelStyle = {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
    color: "#1a1a1a",
    fontSize: "14px"
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    border: "2px solid #e0e0e0",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box",
    transition: "all 0.3s"
  };

  const buttonStyle = {
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "600",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    width: "100%"
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#007bff",
    color: "#fff"
  };

  const successButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#28a745",
    color: "#fff"
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#6c757d",
    color: "#fff"
  };

  return (
    <div style={containerStyle}>
      {/* Welcome Header */}
      <div style={welcomeStyle}>
        <h1 style={{ margin: "0 0 12px 0", fontSize: "36px", fontWeight: "700" }}>
          Đăng Ký Nhân Viên Mới
        </h1>
        <p style={{ margin: 0, fontSize: "16px", opacity: 0.95 }}>
          Chào mừng bạn đến với hệ thống đăng ký nhân viên! Vui lòng điền thông tin và chụp ảnh khuôn mặt để hoàn tất đăng ký.
        </p>
      </div>

      {/* Main Content */}
      <div style={contentCardStyle}>
        {message && (
          <div style={{
            padding: "16px 20px",
            backgroundColor: message.includes("thành công") ? "#d4edda" : "#f8d7da",
            border: `2px solid ${message.includes("thành công") ? "#c3e6cb" : "#f5c6cb"}`,
            borderRadius: "8px",
            color: message.includes("thành công") ? "#155724" : "#721c24",
            marginBottom: "28px",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            {message}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
        {/* Left: Form */}
        <div>
          <form onSubmit={handleSubmitEnrollment}>
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Full Name *</label>
              <input
                type="text"
                style={inputStyle}
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., John Doe"
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Email Address *</label>
              <input
                type="email"
                style={inputStyle}
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="e.g., john@company.com"
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Employee Code *</label>
              <input
                type="text"
                style={inputStyle}
                value={formData.employeeCode}
                onChange={(e) => setFormData({...formData, employeeCode: e.target.value})}
                placeholder="e.g., EMP001"
              />
            </div>

            {/* Job Title */}
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Chức vụ *</label>
              <select
                style={inputStyle}
                value={formData.jobTitle}
                onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
              >
                {Object.keys(JOB_COEFFICIENTS).map(job => (
                  <option key={job} value={job}>{job}</option>
                ))}
              </select>
            </div>

            {/* Education Level */}
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Trình độ *</label>
              <select
                style={inputStyle}
                value={formData.educationLevel}
                onChange={(e) => setFormData({...formData, educationLevel: e.target.value})}
              >
                {Object.keys(EDUCATION_COEFFICIENTS).map(edu => (
                  <option key={edu} value={edu}>{edu}</option>
                ))}
              </select>
            </div>

            {/* Certificates */}
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Chứng chỉ (có thể chọn nhiều)</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                {Object.keys(CERTIFICATE_COEFFICIENTS).map(cert => (
                  <label key={cert} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formData.certificates.includes(cert)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, certificates: [...formData.certificates, cert]});
                        } else {
                          setFormData({...formData, certificates: formData.certificates.filter(c => c !== cert)});
                        }
                      }}
                      style={{ marginRight: "8px", width: "16px", height: "16px" }}
                    />
                    <span style={{ fontSize: "14px" }}>{cert}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Dependents */}
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Số người phụ thuộc</label>
              <input
                type="number"
                style={inputStyle}
                value={formData.dependents}
                onChange={(e) => setFormData({...formData, dependents: parseInt(e.target.value) || 0})}
                min="0"
                placeholder="0"
              />
            </div>

            {/* Base Salary */}
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Lương cơ sở (VNĐ)</label>
              <input
                type="number"
                style={inputStyle}
                value={formData.baseSalary}
                onChange={(e) => setFormData({...formData, baseSalary: parseInt(e.target.value) || 1800000})}
                min="0"
                placeholder="1800000"
              />
              <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                Mặc định: 1,800,000 VNĐ (lương cơ sở Nhà nước)
              </div>
            </div>

            <div style={{ marginBottom: "20px", paddingTop: "16px", borderTop: "1px solid #e0e0e0" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                <input
                  type="checkbox"
                  id="useCustomPassword"
                  checked={useCustomPassword}
                  onChange={(e) => {
                    setUseCustomPassword(e.target.checked);
                    if (!e.target.checked) {
                      setFormData({...formData, password: ""});
                    }
                  }}
                  style={{ marginRight: "8px", width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="useCustomPassword" style={{ ...labelStyle, margin: 0, cursor: "pointer", fontWeight: "500" }}>
                  Tạo mật khẩu tùy chỉnh (nếu không chọn, hệ thống sẽ tự động tạo mật khẩu)
                </label>
              </div>
              {useCustomPassword && (
                <div>
                  <label style={{...labelStyle, marginTop: "8px"}}>Mật khẩu *</label>
                  <input
                    type="password"
                    style={inputStyle}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Nhập mật khẩu cho nhân viên"
                    minLength={6}
                  />
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                    Mật khẩu phải có ít nhất 6 ký tự
                  </div>
                </div>
              )}
            </div>

            <div style={{ 
              marginBottom: "24px", 
              paddingTop: "16px", 
              borderTop: "1px solid #e0e0e0"
            }}>
              <label style={labelStyle}>Face Recognition Status</label>
              <div style={{
                padding: "12px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: capturedDescriptor ? "#d4edda" : "#fff3cd",
                border: "1px solid " + (capturedDescriptor ? "#c3e6cb" : "#ffeaa7"),
                color: capturedDescriptor ? "#155724" : "#856404"
              }}>
                <span style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: capturedDescriptor ? "#28a745" : "#ffc107",
                  display: "inline-block"
                }}></span>
                {capturedDescriptor ? "Face captured - Ready to enroll" : "Capture your face to proceed"}
              </div>
            </div>

            <button
              type="submit"
              style={{
                ...successButtonStyle,
                opacity: !capturedDescriptor || loading ? 0.6 : 1,
                cursor: !capturedDescriptor || loading ? "not-allowed" : "pointer"
              }}
              disabled={!capturedDescriptor || loading}
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
            {cameraActive && faceDetected && (
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
            {cameraActive && !faceDetected && (
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
                opacity: !cameraActive || loading || !faceDetected ? 0.6 : 1
              }}
              disabled={!cameraActive || loading || !faceDetected}
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
          padding: "24px",
          backgroundColor: "#f8f9fa",
          borderRadius: "12px",
          border: "2px solid #28a745"
        }}>
          <div style={{ fontWeight: "700", marginBottom: "16px", color: "#155724", fontSize: "18px" }}>
            {passwordGenerated ? "Mật khẩu đã được tạo tự động" : "Mật khẩu đã được tạo"}
          </div>
          <div style={{
            fontSize: "24px",
            fontFamily: "'Courier New', monospace",
            fontWeight: "700",
            color: "#007bff",
            backgroundColor: "#fff",
            padding: "20px 24px",
            borderRadius: "8px",
            display: "block",
            letterSpacing: "3px",
            border: "2px solid #007bff",
            textAlign: "center",
            marginBottom: "16px"
          }}>
            {generatedPassword}
          </div>
          <div style={{ 
            marginBottom: "16px", 
            padding: "16px", 
            backgroundColor: "#fff3cd", 
            borderRadius: "8px",
            fontSize: "14px", 
            color: "#856404",
            border: "1px solid #ffc107"
          }}>
            <strong>Lưu ý quan trọng:</strong> Vui lòng ghi lại mật khẩu này và cung cấp cho nhân viên. Mật khẩu sẽ không được hiển thị lại sau khi bạn rời khỏi trang này.
          </div>
          <button
            onClick={(e) => {
              navigator.clipboard.writeText(generatedPassword);
              const btn = e.target;
              const originalText = btn.textContent;
              btn.textContent = "Đã copy!";
              btn.style.backgroundColor = "#28a745";
              setTimeout(() => {
                btn.textContent = originalText;
                btn.style.backgroundColor = "#007bff";
              }, 2000);
            }}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
              transition: "all 0.3s"
            }}
          >
            Copy mật khẩu
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
