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
    display: "flex",
    gap: "24px",
    flexWrap: "wrap"
  };

  const cameraSection = {
    flex: "1 1 100%",
    minWidth: "300px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  };

  const logsSection = {
    flex: "1 1 100%",
    minWidth: "300px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    padding: "16px"
  };

  const cameraContainerStyle = {
    position: "relative",
    width: "100%",
    backgroundColor: "#000",
    borderRadius: "6px",
    overflow: "hidden",
    aspectRatio: "4/3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
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
      {/* No Face Warning */}
      {noFaceWarning && (
        <div style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#fff3cd",
          color: "#856404",
          padding: "12px 20px",
          borderRadius: "8px",
          border: "1px solid #ffeaa7",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 1999,
          fontSize: "14px",
          fontWeight: "600"
        }}>
          Không phát hiện khuôn mặt. Vui lòng nhìn vào camera.
        </div>
      )}

      {/* Multi-Face Warning */}
      {multiFaceWarning && (
        <div style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#f8d7da",
          color: "#721c24",
          padding: "14px 20px",
          borderRadius: "8px",
          border: "1px solid #f5c6cb",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 1999,
          fontSize: "14px",
          fontWeight: "600"
        }}>
          ⚠️ Phát hiện {detectedFaces} khuôn mặt. Vui lòng chỉ cho 1 khuôn mặt trong khung hình.
        </div>
      )}

      {/* Spoof Warning */}
      {spoofWarning && (
        <div style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#fff3cd",
          color: "#856404",
          padding: "14px 20px",
          borderRadius: "8px",
          border: "1px solid #ffeaa7",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 1999,
          fontSize: "14px",
          fontWeight: "600"
        }}>
          Vui lòng không sử dụng hình ảnh. Hãy dùng khuôn mặt thật của bạn.
        </div>
      )}

      {/* Success Toast */}
      {successMsg && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          backgroundColor: "#d4edda",
          color: "#155724",
          padding: "16px 24px",
          borderRadius: "8px",
          border: "1px solid #c3e6cb",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 2000,
          fontSize: "16px",
          fontWeight: "600",
          maxWidth: "400px"
        }}>
          {successMsg}
        </div>
      )}

      {/* Anti-spoof overlay & controls */}
      {antiInfo && (
        <div style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          backgroundColor: "rgba(0,0,0,0.75)",
          color: "#fff",
          padding: "10px 12px",
          borderRadius: "8px",
          zIndex: 2000,
          fontSize: "12px",
          maxWidth: "280px"
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Anti-spoof: {antiInfo.score || 0}/100 {serverAntiLoading ? '(server...)' : ''}</div>
          <div style={{ fontSize: 11, opacity: 0.9 }}>
            Texture: {antiInfo.details?.texture?.textureScore?.toFixed(1) || 'N/A'} • Frequency: {antiInfo.details?.frequency?.frequencyScore?.toFixed(1) || 'N/A'} • Color: {antiInfo.details?.color?.colorScore?.toFixed(2) || 'N/A'}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={useServerAnti} onChange={(e) => setUseServerAnti(e.target.checked)} /> Server anti
            </label>
            <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Threshold</span>
              <input type="range" min={40} max={95} value={antiThreshold} onChange={(e) => setAntiThreshold(Number(e.target.value))} />
              <strong style={{ marginLeft: 6 }}>{antiThreshold}</strong>
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
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "400px",
            textAlign: "center",
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}></div>
            <h2 style={{ marginBottom: "8px", color: "#333" }}>Xác nhận điểm danh?</h2>
            
            {/* Debug: Log matched status */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ fontSize: "10px", color: "#999", marginBottom: "8px", padding: "4px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
                matched={String(confirmDialog.matchData?.matched)} | name={confirmDialog.matchData?.detectedName}
              </div>
            )}
            
            {confirmDialog.matchData?.finished === true ? (
              <>
                <div style={{ fontSize: "64px", marginBottom: "16px" }}>✅</div>
                <h2 style={{ marginBottom: "16px", color: "#28a745", fontSize: "24px" }}>Bạn đã kết thúc 1 ngày công</h2>
                <div style={{
                  backgroundColor: "#d4edda",
                  border: "2px solid #c3e6cb",
                  color: "#155724",
                  padding: "16px",
                  borderRadius: "6px",
                  marginBottom: "16px",
                  textAlign: "left"
                }}>
                  <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>
                    {confirmDialog.matchData.detectedName}
                  </div>
                  <div style={{ fontSize: "13px", marginBottom: "6px" }}>
                    🕐 Điểm danh vào: <strong>{confirmDialog.matchData.logsToday?.[0]?.timestamp ? new Date(confirmDialog.matchData.logsToday[0].timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</strong>
                  </div>
                  <div style={{ fontSize: "13px" }}>
                    🕑 Điểm danh ra: <strong>{confirmDialog.matchData.logsToday?.[1]?.timestamp ? new Date(confirmDialog.matchData.logsToday[1].timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong'}</strong>
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
                    padding: "14px",
                    backgroundColor: "#28a745",
                    color: "#fff",
                    fontWeight: "700",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    marginTop: "12px"
                  }}
                >
                  ✓ Đã hiểu
                </button>
              </>
            ) : confirmDialog.matchData?.matched === true ? (
              <>
                <div style={{ fontSize: "48px", marginBottom: "16px", fontWeight: "700" }}>
                  {confirmDialog.matchData.logsToday?.length === 0 ? '🔵' : '🟠'}
                </div>
                <div style={{
                  backgroundColor: confirmDialog.matchData.logsToday?.length === 0 ? "#d4edda" : "#fff3cd",
                  border: confirmDialog.matchData.logsToday?.length === 0 ? "2px solid #c3e6cb" : "2px solid #ffeaa7",
                  color: confirmDialog.matchData.logsToday?.length === 0 ? "#155724" : "#856404",
                  padding: "16px",
                  borderRadius: "6px",
                  marginBottom: "16px",
                  textAlign: "left"
                }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>
                    {confirmDialog.matchData.logsToday?.length === 0 ? "🟢 ĐIỂM DANH VÀO" : "🔴 ĐIỂM DANH RA"}
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>
                    {confirmDialog.matchData.detectedName}
                  </div>
                  {confirmDialog.matchData.logsToday?.length === 0 ? (
                    <div style={{ fontSize: "12px" }}>Bắt đầu ngày làm việc</div>
                  ) : (
                    <div style={{ fontSize: "12px" }}>Kết thúc ngày làm việc</div>
                  )}
                  <div style={{ fontSize: "11px", marginTop: "8px", opacity: 0.8 }}>
                    Khoảng cách: {confirmDialog.matchData.distance.toFixed(3)} | Độ tin cậy: {(confirmDialog.confidence * 100).toFixed(1)}%
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                  <button
                    onClick={(e) => {
                      console.log("NO button clicked");
                      e.preventDefault();
                      e.stopPropagation();
                      handleConfirmAttendance(false);
                    }}
                    disabled={isSubmitting}
                    type="button"
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: "#6c757d",
                      color: "#fff",
                      fontWeight: "600",
                      opacity: isSubmitting ? 0.6 : 1,
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "14px"
                    }}
                  >
                    ✕ Không
                  </button>
                  <button
                    onClick={(e) => {
                      console.log("YES button clicked");
                      e.preventDefault();
                      e.stopPropagation();
                      handleConfirmAttendance(true);
                    }}
                    disabled={isSubmitting}
                    type="button"
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: "#28a745",
                      color: "#fff",
                      fontWeight: "600",
                      opacity: isSubmitting ? 0.6 : 1,
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "14px"
                    }}
                  >
                    {isSubmitting ? "⏳ Đang ghi..." : "✓ Xác nhận"}
                  </button>
                </div>
              </>
            ) : confirmDialog.matchData?.matched === false || confirmDialog.matchData?.isUnknown ? (
              <>
                <div style={{
                  backgroundColor: "#fff3cd",
                  border: "1px solid #ffeaa7",
                  color: "#856404",
                  padding: "12px 16px",
                  borderRadius: "6px",
                  marginBottom: "16px"
                }}>
                  <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                    ⚠️ Khuôn mặt không khớp - Unknown
                  </div>
                  <div style={{ fontSize: "12px" }}>
                    Khoảng cách: {confirmDialog.matchData?.distance?.toFixed(3) || "N/A"} (Ngưỡng: {confirmDialog.matchData?.threshold || "0.6"})
                  </div>
                  <div style={{ fontSize: "12px", marginTop: "4px" }}>
                    Khuôn mặt này <strong>không có trong hệ thống</strong>. Vui lòng quét lại.
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                    <button
                      onClick={(e) => {
                        console.log("Rescan button clicked");
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
                        // Ensure detection is running
                        if (!detectionIntervalRef.current) {
                          setIsScanning(true);
                          detectionIntervalRef.current = setInterval(detectFace, 300);
                        }
                      }}
                    type="button"
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: "#007bff",
                      color: "#fff",
                      fontWeight: "600",
                      cursor: "pointer",
                      border: "none",
                      borderRadius: "6px"
                    }}
                    >
                    Quét lại
                  </button>
                </div>
              </>
            ) : (
              <div style={{ color: "#999", textAlign: "center", padding: "16px" }}>
                Đang tải thông tin...
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div
          style={{
            width: "100%",
            padding: "40px",
            textAlign: "center",
            backgroundColor: "#fff",
            borderRadius: "8px"
          }}
        >
          <div style={{ fontSize: "28px", marginBottom: "16px" }}> </div>
          <p style={{ color: "#666", marginBottom: "8px" }}>{loadingStatus}</p>
          <div style={{ fontSize: "12px", color: "#999" }}>Đang khởi tạo...</div>
        </div>
      ) : errorMsg ? (
        <div
          style={{
            width: "100%",
            padding: "24px",
            backgroundColor: "#f8d7da",
            borderRadius: "8px",
            color: "#721c24",
            border: "1px solid #f5c6cb"
          }}
        >
          <strong>Lỗi:</strong> {errorMsg}
        </div>
      ) : (
        <>
          {/* Camera Section */}
          <div style={cameraSection}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Quét Khuôn Mặt</h3>
              <div
                style={{
                  fontSize: "12px",
                  padding: "4px 12px",
                  backgroundColor: detectedFaces > 0 ? "#d4edda" : "#e2e3e5",
                  color: detectedFaces > 0 ? "#155724" : "#383d41",
                  borderRadius: "12px"
                }}
              >
                {isScanning ? `Phát hiện: ${detectedFaces || 0} khuôn mặt` : "Chưa quét"}
              </div>
            </div>

            <div style={cameraContainerStyle}>
              <video ref={videoRef} style={videoStyle} />
              <canvas ref={canvasRef} style={canvasStyle} />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              {isScanning ? (
                <button
                  onClick={stopScanning}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "#dc3545",
                    color: "#fff",
                    fontWeight: "600"
                  }}
                >
                  Dừng Quét
                </button>
              ) : (
                <button
                  onClick={() => {
                    startScanning();
                  }}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "#28a745",
                    color: "#fff",
                    fontWeight: "600"
                  }}
                >
                  ▶️ Bắt Đầu Quét
                </button>
              )}
            </div>

            <div style={{ fontSize: "12px", color: "#666", textAlign: "center" }}>
              💡 Hãy nhìn trực tiếp vào camera, giữ khuôn mặt trong khung
            </div>
          </div>

          {/* Attendance Logs Section */}
          <div style={logsSection}>
            <h3 style={{ marginTop: 0, marginBottom: "12px" }}>📋 Lịch Sử Điểm Danh (Hôm Nay)</h3>

            {attendanceLogs.length === 0 ? (
              <div style={{ textAlign: "center", color: "#999", padding: "32px 16px" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>😴</div>
                <p>Chưa có lần điểm danh nào</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {attendanceLogs.map((log) => {
                  const isIn = log.type === 'IN';
                  const borderColor = isIn ? "#28a745" : "#ff9800";
                  const bgColor = isIn ? "#d4edda" : "#fff3cd";
                  const textColor = isIn ? "#155724" : "#856404";
                  return (
                    <div
                      key={log.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px",
                        backgroundColor: bgColor,
                        borderRadius: "6px",
                        borderLeft: "4px solid " + borderColor,
                        border: `1px solid ${borderColor}`
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "600", color: textColor }}>
                          {isIn ? "🟢" : "🔴"} {log.name}
                        </div>
                        <div style={{ fontSize: "12px", color: textColor, opacity: 0.8 }}>{log.time}</div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{
                          padding: "4px 12px",
                          backgroundColor: borderColor,
                          color: "#fff",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}>
                          {isIn ? "VÀO" : "RA"}
                        </span>
                        <div style={{ fontSize: "18px", color: log.status === "✓" ? "#28a745" : "#dc3545" }}>
                          {log.status}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AttendanceScanner;
