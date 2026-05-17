import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

export default function CameraScan({ onDetected, modelPath = "/models" }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const detectionIntervalRef = useRef(null);

  // Load models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        setMessage("Loading models...");
        const MODEL_URL = `${modelPath}/`;
        await Promise.all([
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceDetectionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        setMessage("Models loaded. Ready to scan.");
        console.log("All models loaded successfully");
      } catch (err) {
        console.warn(`Failed to load from ${modelPath}:`, err.message);
        try {
          const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
          await Promise.all([
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceDetectionNet.loadFromUri(MODEL_URL),
          ]);
          setModelsLoaded(true);
          setMessage("Models loaded (CDN). Ready to scan.");
          console.log("All models loaded from CDN");
        } catch (fallbackErr) {
          console.error("Failed to load models from fallback:", fallbackErr);
          setMessage("Model loading failed. Please refresh the page.");
        }
      }
    };

    loadModels();
  }, [modelPath]);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        setMessage("Camera started");
      }
    } catch (error) {
      setCameraActive(false);
      setMessage("Camera access was denied or is unavailable: " + error.message + ". Please check camera permissions and try again.");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      setCameraActive(false);
      setMessage("Camera stopped");
    }
  };

  const captureAndScan = async () => {
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
      // Detect face
      const detection = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceExpressions();

      if (!detection) {
        setMessage("No face detected - please position your face in front of the camera");
        setLoading(false);
        return;
      }

      // Draw detection on canvas
      drawDetection(detection);

      // Get descriptor
      const descriptor = await faceapi.computeFaceDescriptor(videoRef.current);
      if (!descriptor) {
        setMessage("Failed to compute face descriptor");
        setLoading(false);
        return;
      }

      // Capture image (optional)
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.9);

      // Prepare payload
      const payload = {
        descriptor: Array.from(descriptor),
        confidence: detection.detection.score,
        imageBase64: imageBase64,
        timestamp: new Date().toISOString(),
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
      
      // Check if user account is deactivated
      if (data.deactivated) {
        setMessage(`âŒ ${data.message || "Your account has been deactivated. Please contact HR."}`);
        return;
      }
      
      if (data.deactivated) {
        setMessage(`❌ ${data.message || "Your account has been deactivated. Please contact HR."}`);
        return;
      }
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
    color: "#666666",
    marginBottom: "24px",
    textAlign: "center"
  };

  const cameraContainerStyle = {
    position: "relative",
    width: "100%",
    maxWidth: "600px",
    margin: "0 auto 24px auto",
    backgroundColor: "#000",
    borderRadius: "8px",
    overflow: "hidden",
    aspectRatio: "4 / 3"
  };

  const videoStyle = {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  };

  const canvasStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%"
  };

  const messageBoxStyle = {
    marginBottom: "20px",
    padding: "12px 16px",
    borderRadius: "6px",
    fontSize: "14px",
    textAlign: "center",
    minHeight: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: (message && message.toLowerCase().includes("error")) ? "#f8d7da" :
                     (message && message.toLowerCase().includes("success")) ? "#d4edda" :
                     (message && message.toLowerCase().includes("âŒ")) ? "#f8d7da" :
                     "#e7f3ff",
    color: (message && message.toLowerCase().includes("error")) ? "#721c24" :
           (message && message.toLowerCase().includes("success")) ? "#155724" :
           (message && message.toLowerCase().includes("âŒ")) ? "#721c24" :
           "#004085",
    border: "1px solid " + 
           ((message && message.toLowerCase().includes("error")) ? "#f5c6cb" :
            (message && message.toLowerCase().includes("success")) ? "#c3e6cb" :
            (message && message.toLowerCase().includes("âŒ")) ? "#f5c6cb" :
            "#bee5eb")
  };

  const buttonContainerStyle = {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    marginBottom: "16px"
  };

  const buttonStyle = {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s"
  };

  const startButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#28a745",
    color: "white"
  };

  const stopButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#dc3545",
    color: "white"
  };

  const scanButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#007bff",
    color: "white",
    opacity: loading || !cameraActive ? 0.5 : 1,
    cursor: loading || !cameraActive ? "not-allowed" : "pointer"
  };

  const statusStyle = {
    fontSize: "12px",
    color: "#666666",
    textAlign: "center",
    marginTop: "8px"
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>ðŸ“¸ Face Attendance Scanner</h1>
      <p style={subtitleStyle}>Position your face in front of the camera to check in/out</p>

      <div style={messageBoxStyle}>
        {message || "Ready to scan"}
      </div>

      <div style={cameraContainerStyle}>
        <video ref={videoRef} style={videoStyle} autoPlay muted playsInline />
        <canvas ref={canvasRef} style={canvasStyle} />
      </div>

      <div style={buttonContainerStyle}>
        <button
          onClick={startCamera}
          disabled={cameraActive}
          style={{
            ...startButtonStyle,
            opacity: cameraActive ? 0.5 : 1,
            cursor: cameraActive ? "not-allowed" : "pointer"
          }}
        >
          ðŸ“· Start Camera
        </button>
        <button
          onClick={stopCamera}
          disabled={!cameraActive}
          style={{
            ...stopButtonStyle,
            opacity: !cameraActive ? 0.5 : 1,
            cursor: !cameraActive ? "not-allowed" : "pointer"
          }}
        >
          â¹ï¸ Stop Camera
        </button>
        <button
          onClick={captureAndScan}
          disabled={loading || !cameraActive}
          style={scanButtonStyle}
        >
          {loading ? "ðŸ”„ Scanning..." : "âœ… Scan & Log"}
        </button>
      </div>

      <div style={statusStyle}>
        <strong>Camera:</strong> {cameraActive ? "Active" : "Inactive"} | <strong>Models:</strong> {modelsLoaded ? "Ready" : "Loading..."}
      </div>
    </div>
  );
}

