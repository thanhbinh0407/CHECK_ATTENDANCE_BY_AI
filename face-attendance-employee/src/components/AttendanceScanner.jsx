import { useState, useRef, useEffect } from "react";
import { calculateAntiSpoofingScore, checkLiveness } from "../utils/antiSpoofing";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const MODELS_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model/";

function AttendanceScanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("Đang tải các mô hình nhận dạng...");
  const [isScanning, setIsScanning] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [lastMatch, setLastMatch] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [noFaceWarning, setNoFaceWarning] = useState(false);
  const [multiFaceWarning, setMultiFaceWarning] = useState(false);
  const [spoofWarning, setSpoofWarning] = useState(false);
  const [antiInfo, setAntiInfo] = useState(null);
  const [antiThreshold, setAntiThreshold] = useState(60);
  const [useServerAnti, setUseServerAnti] = useState(false);
  const [serverAntiLoading, setServerAntiLoading] = useState(false);
  const detectionIntervalRef = useRef(null);
  const antiBufferRef = useRef([]);
  const antiFramesRef = useRef([]);
  const noFaceWarningRef = useRef(null);
  const noFaceCountRef = useRef(0);
  const landmarkBufferRef = useRef([]);
  const centerBufferRef = useRef([]);
  const spoofDetectedRef = useRef(false);

  // Helper to convert dataURL -> Blob for faster multipart uploads
  const dataURLToBlob = (dataurl) => {
    try {
      const arr = dataurl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.warn('dataURLToBlob failed', e);
      return null;
    }
  };

  // Load face-api.js and models
  useEffect(() => {
    const loadFaceApi = async () => {
      try {
        setLoadingStatus("Đang tải thư viện face-api...");
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/dist/face-api.min.js";
        script.onload = async () => {
          console.log("✓ face-api.js loaded");
          setLoadingStatus("Đang tải các mô hình nhận dạng khuôn mặt...");
          try {
            await Promise.all([
              faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
              faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
              faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
            ]);
            console.log("✓ All face-api models loaded");
            setFaceApiLoaded(true);
            setIsLoading(false);
            startScanning();
          } catch (err) {
            console.error("Model loading error:", err);
            setErrorMsg("Lỗi tải mô hình: " + err.message);
            setIsLoading(false);
          }
        };
        script.onerror = () => {
          setErrorMsg("Không thể tải face-api.js");
          setIsLoading(false);
        };
        document.body.appendChild(script);
      } catch (error) {
        console.error("Load face-api error:", error);
        setErrorMsg("Lỗi khi tải face-api: " + error.message);
        setIsLoading(false);
      }
    };

    loadFaceApi();

    // Cleanup
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          startDetection();
        };
      }
    } catch (error) {
      console.error("Camera error:", error);
      setErrorMsg("Không thể truy cập camera: " + error.message);
    }
  };

  const startDetection = () => {
    setIsScanning(true);
    detectionIntervalRef.current = setInterval(detectFace, 300);
  };

  const detectFace = async () => {
    if (!videoRef.current || !canvasRef.current || !faceApiLoaded) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      // Draw on canvas
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detections.length > 0) {
        setDetectedFaces(detections.length);
        setNoFaceWarning(false);
        noFaceCountRef.current = 0;
        clearTimeout(noFaceWarningRef.current);

        // Check for multiple faces
        if (detections.length > 1) {
          setMultiFaceWarning(true);
          setSpoofWarning(false);
          setConfirmDialog(null);
          centerBufferRef.current = [];
          landmarkBufferRef.current = [];
        } else {
          setMultiFaceWarning(false);
        }

        detections.forEach((detection, idx) => {
          const box = detection.detection.box;
          const landmarks = detection.landmarks;

          // Draw bounding box
          ctx.strokeStyle = detections.length === 1 ? "#28a745" : "#ffc107";
          ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          // Draw landmarks (facial skeleton)
          ctx.fillStyle = "#00d4ff";
          landmarks.positions.forEach((point) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
            ctx.fill();
          });
        });

        // If single face and confidence > 0.8, run anti-spoof + liveness checks then show confirmation
        if (detections.length === 1 && detections[0].detection.score > 0.8) {
          const det = detections[0];
          const pts = det.landmarks.positions;
          const nose = pts[30];
          const leftEye = pts.slice(36, 42).reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
          leftEye.x /= 6; leftEye.y /= 6;
          const rightEye = pts.slice(42, 48).reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
          rightEye.x /= 6; rightEye.y /= 6;

          // update landmark/center buffers used by liveness & spoof checks
          landmarkBufferRef.current.push({ nose, leftEye, rightEye });
          if (landmarkBufferRef.current.length > 12) landmarkBufferRef.current.shift();

          const box = det.detection.box;
          const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
          centerBufferRef.current.push(center);
          if (centerBufferRef.current.length > 12) centerBufferRef.current.shift();

          // Local anti-spoofing & liveness
          let anti = calculateAntiSpoofingScore(videoRef.current);
          let live = checkLiveness(landmarkBufferRef.current, centerBufferRef.current);

          // Capture a frame for multi-frame temporal analysis (local)
          try {
            const tmpCanvas = document.createElement('canvas');
            const tctx = tmpCanvas.getContext('2d');
            tmpCanvas.width = videoRef.current.videoWidth || 640;
            tmpCanvas.height = videoRef.current.videoHeight || 480;
            tctx.drawImage(videoRef.current, 0, 0, tmpCanvas.width, tmpCanvas.height);
            const dataUrlFrame = tmpCanvas.toDataURL('image/jpeg', 0.7);
            antiFramesRef.current.push(dataUrlFrame);
            if (antiFramesRef.current.length > 8) antiFramesRef.current.shift();
          } catch (e) {
            console.warn('Frame capture failed for temporal analysis', e);
          }

          // Run local multi-frame temporal checks when buffer full-ish
          const runTemporalChecks = () => {
            const frames = antiFramesRef.current.slice();
            if (frames.length < 4) return { staticImage: false, temporalScore: 1 };

            // Compute high-frequency correlation between successive frames
            try {
              const hfCors = [];
              // For performance, use small downscaled canvases
              const w = 160; const h = 120;
              const tempCanvases = frames.map(f => {
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                const cx = c.getContext('2d');
                const img = new Image();
                img.src = f;
                cx.drawImage(img, 0, 0, w, h);
                return cx.getImageData(0, 0, w, h);
              });

              const laplacian = (imgData) => {
                const data = imgData.data; const out = new Float32Array(imgData.width * imgData.height);
                const W = imgData.width, H = imgData.height;
                for (let y = 1; y < H - 1; y++) {
                  for (let x = 1; x < W - 1; x++) {
                    const i = (y * W + x) * 4;
                    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    // simple laplacian kernel
                    const sum = (
                      ((data[((y-1)*W + x)*4] + data[((y-1)*W + x)*4+1] + data[((y-1)*W + x)*4+2]) / 3) * -1
                      + ((data[(y*W + (x-1))*4] + data[(y*W + (x-1))*4+1] + data[(y*W + (x-1))*4+2]) / 3) * -1
                      + gray * 4
                      + ((data[(y*W + (x+1))*4] + data[(y*W + (x+1))*4+1] + data[(y*W + (x+1))*4+2]) / 3) * -1
                      + ((data[((y+1)*W + x)*4] + data[((y+1)*W + x)*4+1] + data[((y+1)*W + x)*4+2]) / 3) * -1
                    );
                    out[y*W + x] = Math.abs(sum);
                  }
                }
                return out;
              };

              const hfMaps = tempCanvases.map(img => laplacian(img));
              for (let i = 1; i < hfMaps.length; i++) {
                const a = hfMaps[i-1]; const b = hfMaps[i];
                let dot = 0, na = 0, nb = 0;
                for (let j = 0; j < a.length; j += 4) { // sample every 4th
                  dot += a[j] * b[j]; na += a[j]*a[j]; nb += b[j]*b[j];
                }
                const corr = dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
                hfCors.push(corr || 0);
              }

              const avgCorr = hfCors.reduce((s,v)=>s+v,0)/hfCors.length;

              // Landmark variance check: non-rigid movement expected for live face
              let landmarkVariance = 0;
              try {
                const lb = landmarkBufferRef.current;
                if (lb.length >= 3) {
                  const values = lb.map(item => [item.nose.x, item.nose.y, item.leftEye.x, item.leftEye.y, item.rightEye.x, item.rightEye.y]);
                  const stds = [];
                  for (let i = 0; i < values[0].length; i++) {
                    const arr = values.map(v=>v[i]);
                    const mean = arr.reduce((a,b)=>a+b,0)/arr.length;
                    const variance = arr.reduce((a,b)=>a+Math.pow(b-mean,2),0)/arr.length;
                    stds.push(Math.sqrt(variance));
                  }
                  landmarkVariance = stds.reduce((a,b)=>a+b,0)/stds.length;
                }
              } catch (e) { landmarkVariance = 999; }

              // Heuristics: high HF correlation across frames + very low landmark variance => static image
              const staticImage = (avgCorr > 0.96 && landmarkVariance < 1.5);
              return { staticImage, temporalScore: avgCorr, landmarkVariance };
            } catch (e) {
              return { staticImage: false, temporalScore: 1 };
            }
          };

          const temporal = runTemporalChecks();
          if (temporal.staticImage) {
            console.log('[TemporalCheck] Static image detected', temporal);
            setSpoofWarning(true);
            spoofDetectedRef.current = true;
            return;
          }

          // If server-side anti is enabled, first run a fast temporal multipart upload,
          // then fall back to the detailed /advanced analysis.
          if (useServerAnti) {
            try {
              setServerAntiLoading(true);

              // Temporal pre-check: send binary frames to server for HF-correlation analysis
              if (antiFramesRef.current && antiFramesRef.current.length >= 4) {
                try {
                  const fd = new FormData();
                  const framesToSend = antiFramesRef.current.slice(-8);
                  for (let i = 0; i < framesToSend.length; i++) {
                    const blob = dataURLToBlob(framesToSend[i]);
                    if (blob) fd.append('frames', blob, `frame${i}.jpg`);
                  }

                  const tRes = await fetch(`${API_BASE}/api/anti-spoof/temporal-stream`, {
                    method: 'POST',
                    body: fd
                  });

                  if (tRes.ok) {
                    const tjson = await tRes.json();
                    if (tjson && tjson.temporal) {
                      const { temporalScore, staticImage } = tjson.temporal;
                      console.log('[ServerTemporal] avgCorr=', temporalScore, 'static=', staticImage);
                      if (staticImage) {
                        setSpoofWarning(true);
                        spoofDetectedRef.current = true;
                        setServerAntiLoading(false);
                        return; // early exit on static image
                      }
                    }
                  }
                } catch (e) {
                  console.warn('Temporal stream failed', e);
                }
              }

              // Full advanced analysis (fallback / additional signal)
              const img = document.createElement('canvas');
              const ctx = img.getContext('2d');
              img.width = videoRef.current.videoWidth || 640;
              img.height = videoRef.current.videoHeight || 480;
              ctx.drawImage(videoRef.current, 0, 0, img.width, img.height);
              const imageBase64 = img.toDataURL('image/jpeg', 0.8);

              const res = await fetch(`${API_BASE}/api/anti-spoof/advanced`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64, threshold: antiThreshold })
              });

              if (res.ok) {
                const json = await res.json();
                if (json && typeof json.score === 'number') {
                  const serverScore = json.score;
                  anti = { isFace: json.isReal === true, score: serverScore, details: { ...json.details, spooType: json.spooType, confidence: (json.confidence * 100).toFixed(0) + '%' } };
                  console.log(`[Advanced Server Anti] Score: ${serverScore.toFixed(1)}, Type: ${json.spooType}, Real: ${json.isReal}`);
                }
              }
            } catch (e) {
              console.warn('Advanced anti-spoof failed, using local', e);
            } finally {
              setServerAntiLoading(false);
            }
          }

          // Push anti score into buffer and average to smooth spikes
          const s = anti.score || 0;
          antiBufferRef.current.push(s);
          if (antiBufferRef.current.length > 6) antiBufferRef.current.shift();
          const avgAnti = antiBufferRef.current.reduce((a,b)=>a+b,0) / antiBufferRef.current.length;
          // Save anti info for overlay (use averaged score)
          setAntiInfo({ ...anti, score: Math.round(avgAnti) });
          console.log(`[AntiCheck] avgAnti=${avgAnti.toFixed(1)}, anti.isFace=${anti.isFace}, live.isAlive=${live.isAlive}`);

          // Gate logic: prefer liveness. Only block if NO liveness AND avg anti below threshold
          if (!live.isAlive && (avgAnti < antiThreshold)) {
            setSpoofWarning(true);
            spoofDetectedRef.current = true;
            setConfirmDialog(null);
            return;
          }

          spoofDetectedRef.current = false;
          setSpoofWarning(false);

          if (!lastMatch || Date.now() - lastMatch > 5000) {
            showConfirmation(detections[0]);
          }
        }
      } else {
        setDetectedFaces(0);
        // Close dialog if no face detected
        setConfirmDialog(null);
        setSpoofWarning(false);
        centerBufferRef.current = [];
        landmarkBufferRef.current = [];
        spoofDetectedRef.current = false;
        // Count frames without face - show warning after ~7 frames (2 seconds at 300ms interval)
        noFaceCountRef.current += 1;
        if (noFaceCountRef.current >= 7 && !noFaceWarning) {
          setNoFaceWarning(true);
          // Auto-hide warning after 2 seconds
          clearTimeout(noFaceWarningRef.current);
          noFaceWarningRef.current = setTimeout(() => {
            setNoFaceWarning(false);
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Detection error:", error);
    }
  };

  // Calculate Eye Aspect Ratio (EAR) for blink detection
  const calculateEAR = (eye) => {
    // eye is array of 6 points [36,37,38,39,40,41] or [42,43,44,45,46,47]
    if (!eye || eye.length < 6) return 0;
    const p1 = eye[0], p2 = eye[1], p3 = eye[2], p4 = eye[3], p5 = eye[4], p6 = eye[5];
    
    const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    const vertical1 = dist(p2, p6);
    const vertical2 = dist(p3, p5);
    const horizontal = dist(p1, p4);
    
    return (vertical1 + vertical2) / (2 * horizontal);
  };

  // Detect micro-movements (blink, mouth movement, centroid shift)
  const hasMicroMovements = () => {
    if (landmarkBufferRef.current.length < 5) return false;
    
    // 1. Check for blink patterns in recent frames
    const recentLandmarks = landmarkBufferRef.current.slice(-5);
    let blinksDetected = 0;
    
    for (let i = 0; i < recentLandmarks.length; i++) {
      const landmarks = recentLandmarks[i];
      // Rough blink check: eye region changes in y-coordinate
      const eyeHeightVariance = Math.abs(landmarks.leftEye.y - landmarks.rightEye.y);
      if (eyeHeightVariance > 0.5) {
        blinksDetected++;
      }
    }
    
    // 2. Check for mouth movement (lips movement in y-axis)
    const mouthY = recentLandmarks.map(l => l.nose.y); // Using nose as reference for mouth proximity
    const mouthMeanY = mouthY.reduce((a,b)=>a+b,0) / mouthY.length;
    const mouthVarY = mouthY.reduce((a,b)=>a+Math.pow(b-mouthMeanY,2),0) / mouthY.length;
    const mouthMovement = Math.sqrt(mouthVarY);
    
    // 3. Check centroid micro-movement (face position jitter)
    const recentCenters = centerBufferRef.current.slice(-5);
    if (recentCenters.length >= 3) {
      const centersX = recentCenters.map(c => c.x);
      const centersY = recentCenters.map(c => c.y);
      const meanX = centersX.reduce((a,b)=>a+b,0) / centersX.length;
      const meanY = centersY.reduce((a,b)=>a+b,0) / centersY.length;
      const varX = centersX.reduce((a,b)=>a+Math.pow(b-meanX,2),0) / centersX.length;
      const varY = centersY.reduce((a,b)=>a+Math.pow(b-meanY,2),0) / centersY.length;
      const centroidMovement = Math.sqrt(varX + varY);
      
      // Log micro-movements for debugging
      console.log(`[MicroMovement] Blinks: ${blinksDetected}/5, MouthMove: ${mouthMovement.toFixed(3)}, CentroidMove: ${centroidMovement.toFixed(3)}`);
      
      // Pass if has blink OR mouth movement OR centroid jitter
      return blinksDetected >= 1 || mouthMovement > 0.1 || centroidMovement > 0.3;
    }
    
    console.log(`[MicroMovement] Blinks: ${blinksDetected}/5, MouthMove: ${mouthMovement.toFixed(3)}`);
    return blinksDetected >= 1 || mouthMovement > 0.1;
  };

  const showConfirmation = async (detection) => {
    // Query backend to get matching user info
    try {
      const descriptor = Array.from(detection.descriptor);
      // helper to collect additional descriptors from live camera
      const collectMoreDescriptors = async (count = 6, intervalMs = 250) => {
        const collected = [];
        for (let i = 0; i < count; i++) {
          try {
            const det = await faceapi
              .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .withFaceDescriptor();
            if (det && det.descriptor) collected.push(Array.from(det.descriptor));
          } catch (e) {
            console.warn('collectMoreDescriptors error', e);
          }
          // small pause to allow micro-movements
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, intervalMs));
        }
        return collected;
      };
      
      // First, query backend to get user info matching this face
      const matchResponse = await fetch(`${API_BASE}/api/attendance/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor })
      });

      if (matchResponse.ok) {
        let matchData = await matchResponse.json();
        let retryCount = 0;
        const MAX_RETRIES = 2;

        console.log("🔍 MATCH RESPONSE:", {
          matched: matchData.matched,
          detectedName: matchData.detectedName,
          distance: matchData.distance,
          threshold: matchData.threshold,
          fullData: matchData
        });

        // Retry loop: If RequireMoreFrames, collect more descriptors and retry
        while (matchData.detectedName === 'RequireMoreFrames' && retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`📸 RequireMoreFrames (retry ${retryCount}/${MAX_RETRIES}) - collecting additional descriptors...`);
          setServerAntiLoading(true);
          try {
            const extra = await collectMoreDescriptors(6, 220);
            const descriptors = [descriptor, ...extra];
            if (descriptors.length > 0) {
              const retryRes = await fetch(`${API_BASE}/api/attendance/match`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ descriptors })
              });
              if (retryRes.ok) {
                matchData = await retryRes.json();
                console.log(`🔁 RETRY ${retryCount} RESPONSE:`, matchData);
              }
            }
          } catch (e) {
            console.warn(`Retry ${retryCount} on RequireMoreFrames failed`, e);
            break; // Exit retry loop on error
          } finally {
            setServerAntiLoading(false);
          }
        }

        // If still RequireMoreFrames after retries, don't show dialog - continue scanning
        if (matchData.detectedName === 'RequireMoreFrames') {
          console.warn('⚠️ Still RequireMoreFrames after retries - continuing scan...');
          return; // Exit without showing dialog
        }

        // Convert Unknown matched status
        if (!matchData.matched && matchData.detectedName !== 'RequireMoreFrames') {
          matchData.isUnknown = true;
          console.warn("⚠️ UNKNOWN FACE: No matching record found");
        }

        // Capture image from video
        let capturedImage = null;
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = videoRef.current.videoWidth || 640;
          canvas.height = videoRef.current.videoHeight || 480;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          capturedImage = canvas.toDataURL('image/jpeg', 0.8);
        } catch (e) {
          console.warn('Failed to capture image:', e);
        }

        setConfirmDialog({
          descriptor: descriptor,
          confidence: detection.detection.score,
          matchData: matchData,
          timestamp: new Date(),
          imageBase64: capturedImage
        });
        setLastMatch(Date.now());
      } else {
        console.error("Match response error:", matchResponse.status);
      }
    } catch (error) {
      console.error("Match query error:", error);
    }
  };

  const handleConfirmAttendance = async (confirmed) => {
    console.log("📌 handleConfirmAttendance called:", { confirmed, isSubmitting, hasDialog: !!confirmDialog });
    
    if (!confirmDialog || isSubmitting) {
      console.log("Dialog validation failed");
      return;
    }

    if (confirmed) {
      console.log("Confirmed YES - Submitting attendance...");
      
      // Immediately close dialog and reset state
      const dialogData = confirmDialog;
      setConfirmDialog(null);
      setIsSubmitting(true);
      setErrorMsg("");
      setLastMatch(Date.now());
      
      // Stop detection but keep camera view visible
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      setIsScanning(false);
      
      try {
        const response = await fetch(`${API_BASE}/api/attendance/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            descriptor: dialogData.descriptor,
            confidence: dialogData.confidence,
            timestamp: dialogData.timestamp.toISOString(),
            deviceId: "kiosk-1",
            imageBase64: dialogData.imageBase64 || null
          })
        });

        const result = await response.json();
        console.log("Backend response:", { ok: response.ok, status: response.status, result });
        
        if (response.ok) {
          console.log("Attendance logged:", result);
          // Get type from backend response (more accurate than calculating)
          const type = result.type || 'IN';
          setAttendanceLogs((prev) => [
            {
              id: Math.random(),
              time: dialogData.timestamp.toLocaleTimeString("vi-VN"),
              name: result.detectedName || "Unknown",
              status: result.matched ? "✓" : "⚠",
              type: type,
              logsCount: 0
            },
            ...prev.slice(0, 9)
          ]);
          
          // Show success or finished toast for 3 seconds
          if (result.finished) {
            setSuccessMsg(`Bạn đã kết thúc 1 ngày công`);
          } else {
            setSuccessMsg(`Điểm danh thành công: ${result.detectedName}`);
          }
          setTimeout(() => setSuccessMsg(""), 3000);
          
          // Keep camera visible but stopped - user can click to scan again
        } else {
          console.error("Log error:", result);
          setErrorMsg("Lỗi: " + (result.message || "Không thể ghi nhận"));
        }
      } catch (error) {
        console.error("Attendance log error:", error);
        setErrorMsg("Lỗi kết nối: " + error.message);
      } finally {
        console.log("Attendance submission complete");
        setIsSubmitting(false);
        // Reset spoof detection buffers for next scan
        setSpoofWarning(false);
        centerBufferRef.current = [];
        landmarkBufferRef.current = [];
        spoofDetectedRef.current = false;
      }
    } else {
      console.log("Confirmed NO - Closing dialog and restarting detection");
      setConfirmDialog(null);
      setLastMatch(Date.now());
      // Reset spoof detection buffers for next scan
      setSpoofWarning(false);
      setAntiInfo(null);
      antiBufferRef.current = [];
      centerBufferRef.current = [];
      landmarkBufferRef.current = [];
      spoofDetectedRef.current = false;
      noFaceCountRef.current = 0;
      // Always restart detection (clear any existing interval first)
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      setIsScanning(true);
      detectionIntervalRef.current = setInterval(detectFace, 300);
    }
  };

  const stopScanning = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    setIsScanning(false);
  };

  const containerStyle = {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "32px 24px",
    backgroundColor: "#f5f7fa",
    minHeight: "100vh"
  };

  const headerStyle = {
    marginBottom: "32px",
    textAlign: "center"
  };

  const mainContentStyle = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "24px",
    maxWidth: "900px",
    margin: "0 auto"
  };

  const cameraSection = {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    overflow: "hidden",
    border: "1px solid #e1e8ed"
  };

  const cameraSectionHeader = {
    padding: "24px 28px",
    backgroundColor: "#ffffff",
    borderBottom: "2px solid #f0f3f7",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  };

  const cameraBody = {
    padding: "28px"
  };

  const logsSection = {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
    padding: "28px",
    border: "1px solid #e1e8ed"
  };

  const cameraContainerStyle = {
    position: "relative",
    width: "100%",
    backgroundColor: "#000000",
    borderRadius: "12px",
    overflow: "hidden",
    aspectRatio: "4/3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "3px solid #e1e8ed",
    boxShadow: "inset 0 2px 8px rgba(0,0,0,0.2)"
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
    height: "100%",
    zIndex: 10
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={{ 
          fontSize: "36px", 
          fontWeight: "700", 
          color: "#1a1f36",
          marginBottom: "8px",
          letterSpacing: "-0.5px"
        }}>
          Face Attendance System
        </h1>
        <p style={{ 
          fontSize: "16px", 
          color: "#697386",
          margin: 0 
        }}>
          Secure and accurate facial recognition attendance
        </p>
      </div>

      {/* No Face Warning */}
      {noFaceWarning && (
        <div style={{
          position: "fixed",
          top: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#fff7e6",
          color: "#d46b08",
          padding: "16px 28px",
          borderRadius: "12px",
          border: "2px solid #ffd591",
          boxShadow: "0 8px 24px rgba(212, 107, 8, 0.15)",
          zIndex: 1999,
          fontSize: "15px",
          fontWeight: "600",
          maxWidth: "500px"
        }}>
          <div style={{ fontWeight: "700", marginBottom: "4px" }}>NO FACE DETECTED</div>
          <div style={{ fontSize: "13px", fontWeight: "400", opacity: 0.9 }}>
            Please position your face within the camera frame
          </div>
        </div>
      )}

      {/* Multi-Face Warning */}
      {multiFaceWarning && (
        <div style={{
          position: "fixed",
          top: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#fff2e8",
          color: "#d4380d",
          padding: "16px 28px",
          borderRadius: "12px",
          border: "2px solid #ffbb96",
          boxShadow: "0 8px 24px rgba(212, 56, 13, 0.15)",
          zIndex: 1999,
          fontSize: "15px",
          fontWeight: "600",
          maxWidth: "500px"
        }}>
          <div style={{ fontWeight: "700", marginBottom: "4px" }}>MULTIPLE FACES DETECTED</div>
          <div style={{ fontSize: "13px", fontWeight: "400", opacity: 0.9 }}>
            {detectedFaces} faces found. Only one person should be in frame
          </div>
        </div>
      )}

      {/* Spoof Warning */}
      {spoofWarning && (
        <div style={{
          position: "fixed",
          top: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#fff7e6",
          color: "#d46b08",
          padding: "16px 28px",
          borderRadius: "12px",
          border: "2px solid #ffd591",
          boxShadow: "0 8px 24px rgba(212, 107, 8, 0.15)",
          zIndex: 1999,
          fontSize: "15px",
          fontWeight: "600",
          maxWidth: "500px"
        }}>
          <div style={{ fontWeight: "700", marginBottom: "4px" }}>SPOOFING DETECTED</div>
          <div style={{ fontSize: "13px", fontWeight: "400", opacity: 0.9 }}>
            Please use your real face, not a photo or video
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successMsg && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          backgroundColor: "#f6ffed",
          color: "#389e0d",
          padding: "18px 28px",
          borderRadius: "12px",
          border: "2px solid #b7eb8f",
          boxShadow: "0 8px 24px rgba(56, 158, 13, 0.15)",
          zIndex: 2000,
          fontSize: "15px",
          fontWeight: "600",
          maxWidth: "420px"
        }}>
          <div style={{ fontWeight: "700", marginBottom: "4px" }}>SUCCESS</div>
          <div style={{ fontSize: "14px", fontWeight: "400" }}>
            {successMsg}
          </div>
        </div>
      )}

      {/* Anti-spoof overlay & controls */}
      {antiInfo && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          backgroundColor: "rgba(26, 31, 54, 0.95)",
          backdropFilter: "blur(10px)",
          color: "#ffffff",
          padding: "16px 20px",
          borderRadius: "12px",
          zIndex: 2000,
          fontSize: "13px",
          maxWidth: "320px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)"
        }}>
          <div style={{ 
            fontWeight: 700, 
            marginBottom: 10,
            fontSize: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>Anti-Spoofing Score</span>
            <span style={{ 
              color: antiInfo.score >= antiThreshold ? "#52c41a" : "#ff4d4f",
              fontSize: "16px"
            }}>
              {antiInfo.score || 0}/100
            </span>
          </div>
          {serverAntiLoading && (
            <div style={{ 
              fontSize: 11, 
              color: "#91d5ff",
              marginBottom: 8
            }}>
              Processing on server...
            </div>
          )}
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 12, lineHeight: 1.6 }}>
            <div>Texture: <strong>{antiInfo.details?.texture?.textureScore?.toFixed(1) || 'N/A'}</strong></div>
            <div>Frequency: <strong>{antiInfo.details?.frequency?.frequencyScore?.toFixed(1) || 'N/A'}</strong></div>
            <div>Color: <strong>{antiInfo.details?.color?.colorScore?.toFixed(2) || 'N/A'}</strong></div>
          </div>
          <div style={{ 
            paddingTop: 12,
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: 'flex', 
            flexDirection: "column",
            gap: 10 
          }}>
            <label style={{ 
              fontSize: 12, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              cursor: "pointer"
            }}>
              <input 
                type="checkbox" 
                checked={useServerAnti} 
                onChange={(e) => setUseServerAnti(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <span>Enable Server-side Detection</span>
            </label>
            <div style={{ fontSize: 12, display: 'flex', flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Detection Threshold</span>
                <strong>{antiThreshold}</strong>
              </div>
              <input 
                type="range" 
                min={40} 
                max={95} 
                value={antiThreshold} 
                onChange={(e) => setAntiThreshold(Number(e.target.value))}
                style={{ 
                  width: "100%",
                  accentColor: "#1890ff",
                  cursor: "pointer"
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "0",
            maxWidth: "480px",
            width: "100%",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            overflow: "hidden"
          }}>
            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ 
                fontSize: "10px", 
                color: "#999", 
                padding: "8px 12px", 
                backgroundColor: "#f5f5f5",
                borderBottom: "1px solid #e8e8e8",
                fontFamily: "monospace"
              }}>
                matched={String(confirmDialog.matchData?.matched)} | name={confirmDialog.matchData?.detectedName}
              </div>
            )}
            
            {/* Workday Completed */}
            {confirmDialog.matchData?.finished === true ? (
              <>
                <div style={{
                  backgroundColor: "#f6ffed",
                  padding: "32px 32px 24px",
                  borderBottom: "2px solid #b7eb8f",
                  textAlign: "center"
                }}>
                  <div style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    backgroundColor: "#52c41a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                    fontSize: "36px",
                    color: "#ffffff"
                  }}>
                    ✓
                  </div>
                  <h2 style={{ 
                    margin: 0,
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#135200",
                    marginBottom: "8px"
                  }}>
                    Workday Complete
                  </h2>
                  <p style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#389e0d",
                    opacity: 0.9
                  }}>
                    You have successfully completed today's attendance
                  </p>
                </div>
                
                <div style={{ padding: "24px 32px 32px" }}>
                  <div style={{
                    backgroundColor: "#f6ffed",
                    border: "2px solid #b7eb8f",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "24px"
                  }}>
                    <div style={{ 
                      fontSize: "18px", 
                      fontWeight: "700",
                      color: "#135200",
                      marginBottom: "16px"
                    }}>
                      {confirmDialog.matchData.detectedName}
                    </div>
                    <div style={{
                      display: "grid",
                      gap: "12px"
                    }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        backgroundColor: "#ffffff",
                        borderRadius: "8px",
                        border: "1px solid #d9f7be"
                      }}>
                        <span style={{ fontSize: "13px", color: "#389e0d", fontWeight: "600" }}>
                          CHECK IN
                        </span>
                        <span style={{ fontSize: "14px", fontWeight: "700", color: "#135200" }}>
                          {confirmDialog.matchData.logsToday?.[0]?.timestamp 
                            ? new Date(confirmDialog.matchData.logsToday[0].timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) 
                            : 'N/A'}
                        </span>
                      </div>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        backgroundColor: "#ffffff",
                        borderRadius: "8px",
                        border: "1px solid #d9f7be"
                      }}>
                        <span style={{ fontSize: "13px", color: "#389e0d", fontWeight: "600" }}>
                          CHECK OUT
                        </span>
                        <span style={{ fontSize: "14px", fontWeight: "700", color: "#135200" }}>
                          {confirmDialog.matchData.logsToday?.[1]?.timestamp 
                            ? new Date(confirmDialog.matchData.logsToday[1].timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) 
                            : 'Just Now'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setConfirmDialog(null);
                      setSpoofWarning(false);
                      setAntiInfo(null);
                      antiBufferRef.current = [];
                      centerBufferRef.current = [];
                      landmarkBufferRef.current = [];
                      spoofDetectedRef.current = false;
                      noFaceCountRef.current = 0;
                      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
                      setIsScanning(false);
                    }}
                    type="button"
                    style={{
                      width: "100%",
                      padding: "16px",
                      backgroundColor: "#52c41a",
                      color: "#ffffff",
                      fontWeight: "700",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontSize: "15px",
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#389e0d";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#52c41a";
                    }}
                  >
                    CONTINUE
                  </button>
                </div>
              </>
            ) : confirmDialog.matchData?.matched === true ? (
              <>
                {/* Matched Face - Confirm Attendance */}
                <div style={{
                  backgroundColor: confirmDialog.matchData.logsToday?.length === 0 ? "#e6f7ff" : "#fff7e6",
                  padding: "32px 32px 24px",
                  borderBottom: `2px solid ${confirmDialog.matchData.logsToday?.length === 0 ? "#91d5ff" : "#ffd591"}`,
                  textAlign: "center"
                }}>
                  <div style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    backgroundColor: confirmDialog.matchData.logsToday?.length === 0 ? "#1890ff" : "#fa8c16",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                    fontSize: "36px",
                    color: "#ffffff",
                    fontWeight: "700"
                  }}>
                    {confirmDialog.matchData.logsToday?.length === 0 ? "IN" : "OUT"}
                  </div>
                  <h2 style={{ 
                    margin: 0,
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#1a1f36",
                    marginBottom: "8px"
                  }}>
                    Confirm Attendance
                  </h2>
                  <p style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#697386"
                  }}>
                    Verify your {confirmDialog.matchData.logsToday?.length === 0 ? "check-in" : "check-out"} record
                  </p>
                </div>
                
                <div style={{ padding: "24px 32px 32px" }}>
                  <div style={{
                    backgroundColor: confirmDialog.matchData.logsToday?.length === 0 ? "#e6f7ff" : "#fff7e6",
                    border: `2px solid ${confirmDialog.matchData.logsToday?.length === 0 ? "#91d5ff" : "#ffd591"}`,
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "24px",
                    textAlign: "left"
                  }}>
                    <div style={{
                      display: "inline-block",
                      padding: "6px 14px",
                      backgroundColor: confirmDialog.matchData.logsToday?.length === 0 ? "#1890ff" : "#fa8c16",
                      color: "#ffffff",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "700",
                      letterSpacing: "0.5px",
                      marginBottom: "12px"
                    }}>
                      {confirmDialog.matchData.logsToday?.length === 0 ? "CHECK IN" : "CHECK OUT"}
                    </div>
                    <div style={{ 
                      fontSize: "20px", 
                      fontWeight: "700",
                      color: "#1a1f36",
                      marginBottom: "12px"
                    }}>
                      {confirmDialog.matchData.detectedName}
                    </div>
                    <div style={{ 
                      fontSize: "13px",
                      color: "#697386",
                      marginBottom: "16px",
                      lineHeight: "1.6"
                    }}>
                      {confirmDialog.matchData.logsToday?.length === 0 
                        ? "Starting your workday" 
                        : "Ending your workday"}
                    </div>
                    <div style={{
                      padding: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.6)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#697386",
                      display: "flex",
                      justifyContent: "space-between"
                    }}>
                      <span>Match Distance:</span>
                      <strong style={{ color: "#1a1f36" }}>{confirmDialog.matchData.distance.toFixed(3)}</strong>
                    </div>
                    <div style={{
                      padding: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.6)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#697386",
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "8px"
                    }}>
                      <span>Confidence Level:</span>
                      <strong style={{ color: "#1a1f36" }}>{(confirmDialog.confidence * 100).toFixed(1)}%</strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={(e) => {
                        console.log("CANCEL button clicked");
                        e.preventDefault();
                        e.stopPropagation();
                        handleConfirmAttendance(false);
                      }}
                      disabled={isSubmitting}
                      type="button"
                      style={{
                        flex: 1,
                        padding: "16px",
                        backgroundColor: "#ffffff",
                        color: "#697386",
                        fontWeight: "700",
                        opacity: isSubmitting ? 0.5 : 1,
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                        border: "2px solid #d9d9d9",
                        borderRadius: "10px",
                        fontSize: "15px",
                        transition: "all 0.3s ease"
                      }}
                      onMouseEnter={(e) => {
                        if (!isSubmitting) {
                          e.target.style.borderColor = "#8c8c8c";
                          e.target.style.color = "#1a1f36";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.borderColor = "#d9d9d9";
                        e.target.style.color = "#697386";
                      }}
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={(e) => {
                        console.log("CONFIRM button clicked");
                        e.preventDefault();
                        e.stopPropagation();
                        handleConfirmAttendance(true);
                      }}
                      disabled={isSubmitting}
                      type="button"
                      style={{
                        flex: 1,
                        padding: "16px",
                        backgroundColor: confirmDialog.matchData.logsToday?.length === 0 ? "#1890ff" : "#fa8c16",
                        color: "#ffffff",
                        fontWeight: "700",
                        opacity: isSubmitting ? 0.6 : 1,
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                        border: "none",
                        borderRadius: "10px",
                        fontSize: "15px",
                        transition: "all 0.3s ease",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
                      }}
                      onMouseEnter={(e) => {
                        if (!isSubmitting) {
                          e.target.style.backgroundColor = confirmDialog.matchData.logsToday?.length === 0 ? "#096dd9" : "#d46b08";
                          e.target.style.transform = "translateY(-2px)";
                          e.target.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = confirmDialog.matchData.logsToday?.length === 0 ? "#1890ff" : "#fa8c16";
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                      }}
                    >
                      {isSubmitting ? "PROCESSING..." : "CONFIRM"}
                    </button>
                  </div>
                </div>
              </>
            ) : confirmDialog.matchData?.matched === false || confirmDialog.matchData?.isUnknown ? (
              <>
                {/* Unknown Face Warning */}
                <div style={{
                  backgroundColor: "#fff7e6",
                  padding: "32px 32px 24px",
                  borderBottom: "2px solid #ffd591",
                  textAlign: "center"
                }}>
                  <div style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    backgroundColor: "#fa8c16",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                    fontSize: "36px",
                    color: "#ffffff",
                    fontWeight: "700"
                  }}>
                    !
                  </div>
                  <h2 style={{ 
                    margin: 0,
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#ad4e00",
                    marginBottom: "8px"
                  }}>
                    Face Not Recognized
                  </h2>
                  <p style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#d46b08"
                  }}>
                    Unknown face profile detected
                  </p>
                </div>
                
                <div style={{ padding: "24px 32px 32px" }}>
                  <div style={{
                    backgroundColor: "#fff7e6",
                    border: "2px solid #ffd591",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "24px"
                  }}>
                    <div style={{
                      fontWeight: "700",
                      fontSize: "15px",
                      color: "#ad4e00",
                      marginBottom: "12px"
                    }}>
                      Verification Failed
                    </div>
                    <div style={{
                      fontSize: "13px",
                      color: "#d46b08",
                      lineHeight: "1.6",
                      marginBottom: "16px"
                    }}>
                      This face is <strong>not registered</strong> in the system. Please try again or contact your administrator.
                    </div>
                    <div style={{
                      padding: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.6)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#8c8c8c",
                      marginBottom: "8px"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span>Match Distance:</span>
                        <strong style={{ color: "#d46b08" }}>
                          {confirmDialog.matchData?.distance?.toFixed(3) || "N/A"}
                        </strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Required Threshold:</span>
                        <strong style={{ color: "#d46b08" }}>
                          {confirmDialog.matchData?.threshold || "0.6"}
                        </strong>
                      </div>
                    </div>
                    <div style={{
                      fontSize: "11px",
                      color: "#8c8c8c",
                      textAlign: "center",
                      fontStyle: "italic"
                    }}>
                      Distance exceeds recognition threshold
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      console.log("SCAN AGAIN button clicked");
                      e.preventDefault();
                      e.stopPropagation();
                      setConfirmDialog(null);
                      setSpoofWarning(false);
                      setAntiInfo(null);
                      antiBufferRef.current = [];
                      centerBufferRef.current = [];
                      landmarkBufferRef.current = [];
                      spoofDetectedRef.current = false;
                      noFaceCountRef.current = 0;
                      if (!detectionIntervalRef.current) {
                        setIsScanning(true);
                        detectionIntervalRef.current = setInterval(detectFace, 300);
                      }
                    }}
                    type="button"
                    style={{
                      width: "100%",
                      padding: "16px",
                      backgroundColor: "#1890ff",
                      color: "#ffffff",
                      fontWeight: "700",
                      cursor: "pointer",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "15px",
                      transition: "all 0.3s ease",
                      boxShadow: "0 4px 12px rgba(24, 144, 255, 0.2)"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#096dd9";
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 6px 16px rgba(24, 144, 255, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#1890ff";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 4px 12px rgba(24, 144, 255, 0.2)";
                    }}
                  >
                    SCAN AGAIN
                  </button>
                </div>
              </>
            ) : (
              <div style={{ 
                padding: "60px 32px",
                textAlign: "center",
                color: "#8c8c8c"
              }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  border: "3px solid #f0f0f0",
                  borderTop: "3px solid #1890ff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 16px"
                }}></div>
                <div style={{ fontSize: "15px", fontWeight: "600" }}>
                  Processing Recognition...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={mainContentStyle}>
          <div style={{
            ...cameraSection,
            padding: "60px 40px",
            textAlign: "center"
          }}>
            <div style={{ 
              width: "80px",
              height: "80px",
              border: "4px solid #e1e8ed",
              borderTop: "4px solid #1890ff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 24px"
            }}></div>
            <h3 style={{ 
              fontSize: "20px", 
              fontWeight: "600",
              color: "#1a1f36",
              marginBottom: "12px"
            }}>
              Initializing System
            </h3>
            <p style={{ 
              color: "#697386",
              fontSize: "15px",
              marginBottom: "8px"
            }}>
              {loadingStatus}
            </p>
            <div style={{ 
              fontSize: "13px", 
              color: "#8f9bb3",
              marginTop: "16px"
            }}>
              Loading facial recognition models...
            </div>
          </div>
        </div>
      ) : errorMsg ? (
        <div style={mainContentStyle}>
          <div style={{
            ...cameraSection,
            padding: "60px 40px",
            textAlign: "center",
            backgroundColor: "#fff2f0",
            border: "2px solid #ffccc7"
          }}>
            <div style={{ 
              fontSize: "56px",
              marginBottom: "20px",
              color: "#cf1322"
            }}>
              ERROR
            </div>
            <h3 style={{ 
              fontSize: "20px", 
              fontWeight: "600",
              color: "#cf1322",
              marginBottom: "12px"
            }}>
              System Error
            </h3>
            <p style={{ 
              color: "#cf1322",
              fontSize: "15px"
            }}>
              {errorMsg}
            </p>
          </div>
        </div>
      ) : (
        <div style={mainContentStyle}>
          {/* Camera Section */}
          <div style={cameraSection}>
            <div style={cameraSectionHeader}>
              <div>
                <h2 style={{ 
                  margin: 0,
                  fontSize: "22px",
                  fontWeight: "700",
                  color: "#1a1f36",
                  marginBottom: "4px"
                }}>
                  Face Recognition Scanner
                </h2>
                <p style={{ 
                  margin: 0,
                  fontSize: "14px",
                  color: "#697386"
                }}>
                  Position your face within the frame for detection
                </p>
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}>
                <div style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  padding: "8px 16px",
                  backgroundColor: detectedFaces > 0 ? "#f6ffed" : "#f5f5f5",
                  color: detectedFaces > 0 ? "#389e0d" : "#8c8c8c",
                  borderRadius: "20px",
                  border: `2px solid ${detectedFaces > 0 ? "#b7eb8f" : "#d9d9d9"}`,
                  minWidth: "140px",
                  textAlign: "center"
                }}>
                  {isScanning ? `${detectedFaces || 0} Face${detectedFaces !== 1 ? 's' : ''} Detected` : "Scanner Inactive"}
                </div>
              </div>
            </div>

            <div style={cameraBody}>
              <div style={cameraContainerStyle}>
                <video ref={videoRef} style={videoStyle} />
                <canvas ref={canvasRef} style={canvasStyle} />
                
                {/* Scanning Overlay */}
                {isScanning && (
                  <div style={{
                    position: "absolute",
                    top: "20px",
                    left: "20px",
                    right: "20px",
                    bottom: "20px",
                    border: "2px solid rgba(24, 144, 255, 0.6)",
                    borderRadius: "8px",
                    pointerEvents: "none",
                    zIndex: 5
                  }}>
                    {/* Corner indicators */}
                    <div style={{ position: "absolute", top: "-2px", left: "-2px", width: "40px", height: "40px", borderTop: "4px solid #1890ff", borderLeft: "4px solid #1890ff", borderRadius: "8px 0 0 0" }}></div>
                    <div style={{ position: "absolute", top: "-2px", right: "-2px", width: "40px", height: "40px", borderTop: "4px solid #1890ff", borderRight: "4px solid #1890ff", borderRadius: "0 8px 0 0" }}></div>
                    <div style={{ position: "absolute", bottom: "-2px", left: "-2px", width: "40px", height: "40px", borderBottom: "4px solid #1890ff", borderLeft: "4px solid #1890ff", borderRadius: "0 0 0 8px" }}></div>
                    <div style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "40px", height: "40px", borderBottom: "4px solid #1890ff", borderRight: "4px solid #1890ff", borderRadius: "0 0 8px 0" }}></div>
                  </div>
                )}
              </div>

              <div style={{ 
                display: "flex", 
                gap: "12px",
                marginTop: "24px"
              }}>
                {isScanning ? (
                  <button
                    onClick={stopScanning}
                    style={{
                      flex: 1,
                      padding: "16px 24px",
                      backgroundColor: "#ff4d4f",
                      color: "#ffffff",
                      fontWeight: "600",
                      fontSize: "15px",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      boxShadow: "0 4px 12px rgba(255, 77, 79, 0.2)"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#cf1322";
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 6px 16px rgba(255, 77, 79, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#ff4d4f";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 4px 12px rgba(255, 77, 79, 0.2)";
                    }}
                  >
                    STOP SCANNING
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      startScanning();
                    }}
                    style={{
                      flex: 1,
                      padding: "16px 24px",
                      backgroundColor: "#52c41a",
                      color: "#ffffff",
                      fontWeight: "600",
                      fontSize: "15px",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      boxShadow: "0 4px 12px rgba(82, 196, 26, 0.2)"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#389e0d";
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 6px 16px rgba(82, 196, 26, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#52c41a";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 4px 12px rgba(82, 196, 26, 0.2)";
                    }}
                  >
                    START SCANNING
                  </button>
                )}
              </div>

              <div style={{ 
                marginTop: "20px",
                padding: "16px",
                backgroundColor: "#f5f7fa",
                borderRadius: "10px",
                border: "1px solid #e1e8ed"
              }}>
                <div style={{ 
                  fontSize: "13px", 
                  color: "#697386",
                  lineHeight: "1.6",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px"
                }}>
                  <span style={{ 
                    fontSize: "18px",
                    flexShrink: 0,
                    marginTop: "-2px"
                  }}>
                    INFO
                  </span>
                  <span>
                    Look directly at the camera and keep your face within the scanning frame for accurate detection
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Logs Section */}
          <div style={logsSection}>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ 
                margin: 0,
                fontSize: "22px",
                fontWeight: "700",
                color: "#1a1f36",
                marginBottom: "4px"
              }}>
                Today's Attendance Log
              </h2>
              <p style={{ 
                margin: 0,
                fontSize: "14px",
                color: "#697386"
              }}>
                View your check-in and check-out records
              </p>
            </div>

            {attendanceLogs.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "60px 24px",
                backgroundColor: "#fafafa",
                borderRadius: "12px",
                border: "2px dashed #d9d9d9"
              }}>
                <div style={{ 
                  fontSize: "56px",
                  marginBottom: "16px",
                  opacity: 0.3
                }}>
                  NO RECORDS
                </div>
                <p style={{ 
                  fontSize: "16px",
                  color: "#8c8c8c",
                  margin: 0
                }}>
                  No attendance records found for today
                </p>
              </div>
            ) : (
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: "12px" 
              }}>
                {attendanceLogs.map((log) => {
                  const isIn = log.type === 'IN';
                  const bgColor = isIn ? "#f6ffed" : "#fff7e6";
                  const borderColor = isIn ? "#52c41a" : "#fa8c16";
                  const textColor = isIn ? "#389e0d" : "#d46b08";
                  
                  return (
                    <div
                      key={log.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "20px 24px",
                        backgroundColor: bgColor,
                        borderRadius: "12px",
                        border: `2px solid ${borderColor}`,
                        transition: "all 0.3s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateX(4px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateX(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontWeight: "700",
                          fontSize: "17px",
                          color: textColor,
                          marginBottom: "6px"
                        }}>
                          {log.name}
                        </div>
                        <div style={{ 
                          fontSize: "14px",
                          color: textColor,
                          opacity: 0.8,
                          fontWeight: "500"
                        }}>
                          {log.time}
                        </div>
                      </div>
                      <div style={{ 
                        display: "flex",
                        gap: "16px",
                        alignItems: "center" 
                      }}>
                        <span style={{
                          padding: "8px 20px",
                          backgroundColor: borderColor,
                          color: "#ffffff",
                          borderRadius: "20px",
                          fontSize: "13px",
                          fontWeight: "700",
                          letterSpacing: "0.5px"
                        }}>
                          {isIn ? "CHECK IN" : "CHECK OUT"}
                        </span>
                        <div style={{ 
                          fontSize: "24px",
                          color: log.status === "✓" ? "#52c41a" : "#ff4d4f",
                          fontWeight: "700"
                        }}>
                          {log.status === "✓" ? "VERIFIED" : "WARNING"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceScanner;
