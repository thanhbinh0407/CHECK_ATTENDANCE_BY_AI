import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

export default function CameraScan({ onDetected }) {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setMessage("Loading models...");
      
      // Try multiple model URLs as fallback
      const modelUrls = [
        "/models",
        "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model/"
      ];

      let loaded = false;
      let lastError = null;

      for (const modelUrl of modelUrls) {
        try {
          console.log(`Attempting to load from: ${modelUrl}`);
          
          // Load with verbose error handling
          const detectorPromise = faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
          const landmarkPromise = faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
          const recognitionPromise = faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl);
          
          await Promise.all([detectorPromise, landmarkPromise, recognitionPromise]);
          
          console.log(`Models loaded successfully from ${modelUrl}`);
          setModelsLoaded(true);
          setMessage("Models loaded. Ready to scan.");
          loaded = true;
          break;
        } catch (err) {
          lastError = err;
          console.warn(`Failed to load from ${modelUrl}:`, err.message);
        }
      }

      if (!loaded) {
        throw lastError || new Error("Failed to load models from all sources");
      }
    } catch (error) {
      console.error("Model loading error:", error);
      setMessage("Model loading failed. Please refresh the page.");
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
        setMessage("Camera started");
      };
    } catch (error) {
      console.error("Error accessing camera:", error);
      setMessage("Camera access bị từ chối hoặc không khả dụng: " + error.message + ". Hãy kiểm tra quyền camera và thử lại.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      setCameraActive(false);
      setMessage("Camera stopped");
    }
  };

  const handleScan = async () => {
    if (!modelsLoaded) {
      setMessage("Models not loaded yet");
      return;
    }
    
    if (!cameraActive) {
      setMessage("Camera not active");
      return;
    }

    setLoading(true);
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setMessage("No face detected - please position your face in front of the camera");
        setLoading(false);
        return;
      }

      drawDetection(detection);

      // prepare payload
      const descriptor = Array.from(detection.descriptor);
      
      // Extract and convert face image
      let imageBase64 = null;
      try {
        const box = detection.detection.box;
        const regionsToExtract = [new faceapi.Rect(box.x, box.y, box.width, box.height)];
        const faceImages = await faceapi.extractFaces(videoRef.current, regionsToExtract);
        
        if (faceImages.length > 0) {
          const tmpCanvas = document.createElement("canvas");
          tmpCanvas.width = faceImages[0].width;
          tmpCanvas.height = faceImages[0].height;
          const ctx = tmpCanvas.getContext("2d");
          ctx.drawImage(faceImages[0], 0, 0);
          imageBase64 = tmpCanvas.toDataURL("image/jpeg");
        }
      } catch (error) {
        console.warn("Error extracting face image:", error);
      }

      const payload = {
        descriptor,
        confidence: detection.detection.score,
        timestamp: new Date().toISOString(),
        deviceId: "web-kiosk-1",
        imageBase64
      };

      // call attendance API
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      console.log("Calling API:", apiBase + "/api/attendance/log", payload);
      
      const res = await fetch(`${apiBase}/api/attendance/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      console.log("API Response:", data);
      
      if (onDetected) onDetected(data);
      
      if (data.status === "success") {
        setMessage(`Attendance logged successfully! User: ${data.userId}`);
      } else {
        setMessage(`Scan completed: ${data.message || "Processing..."}`);
      }
    } catch (error) {
      console.error("Scan error:", error);
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const drawDetection = (detection) => {
    if (!videoRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = videoRef.current.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    const dims = { width, height };
    const resized = faceapi.resizeResults(detection, dims);
    faceapi.draw.drawDetections(canvas, resized);
    faceapi.draw.drawFaceLandmarks(canvas, resized);
  };

  const containerStyle = {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "40px 30px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
  };

  const titleStyle = {
    fontSize: "28px",
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: "8px",
    textAlign: "center"
  };

  const subtitleStyle = {
    fontSize: "14px",
    color: "#666",
    marginBottom: "24px",
    textAlign: "center"
  };

  const videoContainerStyle = {
    position: "relative",
    width: "100%",
    maxWidth: "640px",
    margin: "0 auto 24px",
    borderRadius: "8px",
    overflow: "hidden",
    backgroundColor: "#000",
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)"
  };

  const videoStyle = {
    width: "100%",
    display: "block",
    backgroundColor: "#000"
  };

  const buttonContainerStyle = {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    marginBottom: "24px",
    flexWrap: "wrap"
  };

  const buttonStyle = {
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: "600",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    minWidth: "140px"
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#007bff",
    color: "#fff"
  };
  primaryButtonStyle[":hover"] = { backgroundColor: "#0056b3" };

  const dangerButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#dc3545",
    color: "#fff"
  };
  dangerButtonStyle[":hover"] = { backgroundColor: "#c82333" };

  const successButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#28a745",
    color: "#fff"
  };
  successButtonStyle[":hover"] = { backgroundColor: "#218838" };

  const statusBoxStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "24px",
    backgroundColor: "#f8f9fa",
    padding: "16px",
    borderRadius: "8px"
  };

  const statusItemStyle = {
    padding: "12px",
    backgroundColor: "#fff",
    borderRadius: "6px",
    border: "1px solid #e0e0e0",
    fontSize: "14px"
  };

  const messageBoxStyle = {
    padding: "16px",
    marginBottom: "24px",
    backgroundColor: (message && message.toLowerCase().includes("error")) ? "#f8d7da" :
                    (message && (message.toLowerCase().includes("success") || message.toLowerCase().includes("logged"))) ? "#d4edda" : "#fff3cd",
    border: "1px solid " + ((message && message.toLowerCase().includes("error")) ? "#f5c6cb" : 
                           (message && (message.toLowerCase().includes("success") || message.toLowerCase().includes("logged"))) ? "#c3e6cb" : "#ffeaa7"),
    borderRadius: "6px",
    color: "#333"
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>Face Recognition System</div>
      <div style={subtitleStyle}>Professional Attendance Management</div>
      
      <div style={statusBoxStyle}>
        <div style={statusItemStyle}>
          <strong>Models:</strong> {modelsLoaded ? "Ready" : "Loading..."}
        </div>
        <div style={statusItemStyle}>
          <strong>Camera:</strong> {cameraActive ? "Active" : "Inactive"}
        </div>
      </div>

      <div style={videoContainerStyle}>
        <video 
          ref={videoRef} 
          style={videoStyle}
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
            pointerEvents: "none"
          }}
        />
      </div>

      <div style={buttonContainerStyle}>
        <button 
          onClick={startCamera}
          style={successButtonStyle}
          disabled={cameraActive || loading}
        >
          Start Camera
        </button>
        <button 
          onClick={stopCamera}
          style={dangerButtonStyle}
          disabled={!cameraActive}
        >
          Stop Camera
        </button>
        <button 
          onClick={handleScan}
          style={primaryButtonStyle}
          disabled={!cameraActive || loading || !modelsLoaded}
        >
          {loading ? "Scanning..." : "Scan & Attendance"}
        </button>
      </div>

      {message && (
        <div style={messageBoxStyle}>
          {message}
        </div>
      )}
    </div>
  );
}
