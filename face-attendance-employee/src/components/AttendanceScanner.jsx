import { useState, useRef, useEffect, useMemo } from "react";
import { calculateAntiSpoofingScore, checkLiveness } from "../utils/antiSpoofing";
import { evaluateSpoofEvidence } from "../utils/deviceSpoofDetector";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const MODELS_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model/";

// How many consecutive clean frames are required before the spoof latch resets.
// At ~300 ms / frame this is roughly 2 seconds with the device fully out of frame.
const SPOOF_CLEAN_FRAMES_REQUIRED = 6;
// Maximum length of the evidence ring buffer.
const EVIDENCE_BUFFER_LIMIT = 12;
// How many consecutive frames of CLEAN single-face detection are required
// before the system is allowed to open the confirm dialog. This prevents the
// race where face-api fires once on a phone-displayed face before any of the
// anti-spoof signals have accumulated enough evidence.
const REQUIRED_STABLE_FRAMES = 4;

// ---------------------------------------------------------------------------
// Face-frame circle.
// The kiosk renders a fixed circular region in the centre of the camera
// preview. Users must place their face inside this circle for the system to
// even consider running anti-spoof / matching. The area OUTSIDE the circle
// is then aggressively scanned for device borders / rectangular bezels.
// ---------------------------------------------------------------------------
const FACE_CIRCLE = {
  cxRatio: 0.5, // centre X
  cyRatio: 0.45, // centre Y (slightly above middle so chin has room)
  rRatio: 0.26, // radius = 26% of height -> diameter ~52%
};
const FACE_FIT = {
  centerOffsetMax: 0.35, // face centre must stay within 35% of circle radius
  minFaceRadiusRatio: 0.55, // face must be >= 55% of circle radius
  maxFaceRadiusRatio: 1.20, // face must be <= 120% of circle radius
};
// Mean-luminance threshold (0..255). Below this the room is considered too
// dark to verify a face reliably, so the scanner asks the user to brighten.
const LOW_LIGHT_THRESHOLD = 55;

const getNextAttendanceType = (matchData) => {
  if (!matchData) return "IN";
  if (matchData.nextType === "IN" || matchData.nextType === "OUT") return matchData.nextType;
  const count = Array.isArray(matchData.logsToday) ? matchData.logsToday.length : 0;
  return count % 2 === 0 ? "IN" : "OUT";
};

const computeFaceCircle = (W, H) => ({
  cx: W * FACE_CIRCLE.cxRatio,
  cy: H * FACE_CIRCLE.cyRatio,
  r: H * FACE_CIRCLE.rRatio,
});

const evaluateFaceFit = (faceBox, circle) => {
  if (!faceBox || !circle) return { ok: false, reasons: ["no_face"] };
  const fcx = faceBox.x + faceBox.width / 2;
  const fcy = faceBox.y + faceBox.height / 2;
  const fr = (faceBox.width + faceBox.height) / 4;
  const dist = Math.hypot(fcx - circle.cx, fcy - circle.cy);
  const reasons = [];
  if (dist > circle.r * FACE_FIT.centerOffsetMax) reasons.push("off_center");
  if (fr < circle.r * FACE_FIT.minFaceRadiusRatio) reasons.push("too_far");
  if (fr > circle.r * FACE_FIT.maxFaceRadiusRatio) reasons.push("too_close");
  return { ok: reasons.length === 0, reasons };
};

// Mean luminance of a video frame in 0..255. Sampled at 80x60 for speed; the
// ITU-R BT.601 luma weights approximate perceptual brightness well enough.
const measureLuminance = (video) => {
  if (!video || !video.videoWidth) return 255;
  const w = 80;
  const h = 60;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const cx = c.getContext("2d", { willReadFrequently: true });
  cx.drawImage(video, 0, 0, w, h);
  const d = cx.getImageData(0, 0, w, h).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) {
    sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }
  return sum / (w * h);
};

/**
 * Scan the ring between the user's detected face bbox (+ a small margin) and
 * the circle perimeter for long horizontal / vertical edges or right-angle
 * corners. Real faces leave that ring sparse (skin / hair); a phone-displayed
 * face leaves a sharp rectangular bezel inside it.
 *
 * @param {HTMLVideoElement} video
 * @param {{cx:number, cy:number, r:number}} circle  In ORIGINAL video coords.
 * @param {{x:number,y:number,width:number,height:number}} faceBox
 * @returns {null|{detected:boolean, reasons:string[],
 *                 longHorizontals:number, longVerticals:number,
 *                 cornerCount:number, suspectBbox:object|null}}
 */
const detectRectangleInsideCircle = (video, circle, faceBox) => {
  if (!video || !video.videoWidth || !circle || !faceBox) return null;
  const W = 320;
  const H = 240;
  const sx = video.videoWidth / W;
  const sy = video.videoHeight / H;

  const ccx = circle.cx / sx;
  const ccy = circle.cy / sy;
  const cr = circle.r / Math.max(sx, sy);
  const cr2 = cr * cr;

  // Face bbox in working space + 8 px margin so eyes / brow / hairline are
  // outside the ring.
  const FACE_PAD = 8;
  const fbx1 = faceBox.x / sx - FACE_PAD;
  const fby1 = faceBox.y / sy - FACE_PAD;
  const fbx2 = (faceBox.x + faceBox.width) / sx + FACE_PAD;
  const fby2 = (faceBox.y + faceBox.height) / sy + FACE_PAD;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;

  // Pre-compute grayscale + ring mask.
  const gray = new Float32Array(W * H);
  const mask = new Uint8Array(W * H);
  let ringPixels = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const j = i * 4;
      gray[i] = (data[j] + data[j + 1] + data[j + 2]) / 3;
      const dx = x - ccx;
      const dy = y - ccy;
      const insideCircle = dx * dx + dy * dy <= cr2;
      const insideFace =
        x >= fbx1 && x <= fbx2 && y >= fby1 && y <= fby2;
      if (insideCircle && !insideFace) {
        mask[i] = 1;
        ringPixels++;
      }
    }
  }
  if (ringPixels < 200) return null;

  // Sobel magnitude + direction inside the ring.
  const gx = new Float32Array(W * H);
  const gy = new Float32Array(W * H);
  const mag = new Float32Array(W * H);
  const MAG_T = 60;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!mask[i]) continue;
      const a =
        -gray[i - W - 1] - 2 * gray[i - 1] - gray[i + W - 1] +
        gray[i - W + 1] + 2 * gray[i + 1] + gray[i + W + 1];
      const b =
        -gray[i - W - 1] - 2 * gray[i - W] - gray[i - W + 1] +
        gray[i + W - 1] + 2 * gray[i + W] + gray[i + W + 1];
      gx[i] = a;
      gy[i] = b;
      mag[i] = Math.sqrt(a * a + b * b);
    }
  }

  const MIN_RUN = 22;
  const horizEnds = [];
  const vertEnds = [];

  // Long horizontal lines (gradient mostly vertical).
  let longHorizontals = 0;
  for (let y = 1; y < H - 1; y++) {
    let runStart = -1;
    for (let x = 1; x < W; x++) {
      const i = y * W + x;
      const accept =
        mask[i] &&
        mag[i] > MAG_T &&
        Math.abs(gy[i]) > Math.abs(gx[i]) * 1.2;
      if (accept) {
        if (runStart < 0) runStart = x;
      } else if (runStart >= 0) {
        if (x - runStart >= MIN_RUN) {
          longHorizontals++;
          horizEnds.push({ x: runStart, y });
          horizEnds.push({ x: x - 1, y });
        }
        runStart = -1;
      }
    }
    if (runStart >= 0 && W - runStart >= MIN_RUN) {
      longHorizontals++;
      horizEnds.push({ x: runStart, y });
      horizEnds.push({ x: W - 1, y });
    }
  }

  // Long vertical lines (gradient mostly horizontal).
  let longVerticals = 0;
  for (let x = 1; x < W - 1; x++) {
    let runStart = -1;
    for (let y = 1; y < H; y++) {
      const i = y * W + x;
      const accept =
        mask[i] &&
        mag[i] > MAG_T &&
        Math.abs(gx[i]) > Math.abs(gy[i]) * 1.2;
      if (accept) {
        if (runStart < 0) runStart = y;
      } else if (runStart >= 0) {
        if (y - runStart >= MIN_RUN) {
          longVerticals++;
          vertEnds.push({ x, y: runStart });
          vertEnds.push({ x, y: y - 1 });
        }
        runStart = -1;
      }
    }
    if (runStart >= 0 && H - runStart >= MIN_RUN) {
      longVerticals++;
      vertEnds.push({ x, y: runStart });
      vertEnds.push({ x, y: H - 1 });
    }
  }

  // Right-angle corners: a horizontal endpoint near a vertical endpoint.
  const PROX = 8;
  const PROX2 = PROX * PROX;
  const buckets = new Map();
  for (const v of vertEnds) {
    const key = `${Math.floor(v.x / PROX)}:${Math.floor(v.y / PROX)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(v);
  }
  let cornerCount = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const seen = new Set();
  for (const h of horizEnds) {
    const cellX = Math.floor(h.x / PROX);
    const cellY = Math.floor(h.y / PROX);
    let matched = false;
    for (let dy = -1; dy <= 1 && !matched; dy++) {
      for (let dx = -1; dx <= 1 && !matched; dx++) {
        const list = buckets.get(`${cellX + dx}:${cellY + dy}`);
        if (!list) continue;
        for (const v of list) {
          const ddx = h.x - v.x;
          const ddy = h.y - v.y;
          if (ddx * ddx + ddy * ddy <= PROX2) {
            const ckey = `${Math.round(h.x / PROX)}:${Math.round(h.y / PROX)}`;
            if (seen.has(ckey)) continue;
            seen.add(ckey);
            cornerCount++;
            if (h.x < minX) minX = h.x;
            if (h.x > maxX) maxX = h.x;
            if (h.y < minY) minY = h.y;
            if (h.y > maxY) maxY = h.y;
            matched = true;
            break;
          }
        }
      }
    }
  }

  const reasons = [];
  if (cornerCount >= 2) reasons.push(`corners:${cornerCount}`);
  if (longHorizontals >= 2 && longVerticals >= 2) {
    reasons.push(`grid:${longHorizontals}x${longVerticals}`);
  }
  const detected =
    cornerCount >= 2 || (longHorizontals >= 2 && longVerticals >= 2);

  let suspectBbox = null;
  if (detected && minX < maxX && minY < maxY) {
    suspectBbox = {
      x: minX * sx,
      y: minY * sy,
      width: (maxX - minX) * sx,
      height: (maxY - minY) * sy,
    };
  }

  return {
    detected,
    reasons,
    longHorizontals,
    longVerticals,
    cornerCount,
    suspectBbox,
  };
};

function resolveKioskAvatarSrc(avatarUrl) {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  const base = (API_BASE || "").replace(/\/$/, "");
  const path = avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`;
  return `${base}${path}`;
}

/** Ảnh đại diện nhân viên — khung tròn (kiosk) */
function KioskRoundAvatar({ avatarUrl, name, size = 80, borderColor = "rgba(255,255,255,0.95)", ringColor }) {
  const src = resolveKioskAvatarSrc(avatarUrl);
  const initial = (name || "?").charAt(0).toUpperCase();
  const ring = ringColor || "rgba(24, 144, 255, 0.35)";
  const wrap = {
    width: size,
    height: size,
    borderRadius: "50%",
    overflow: "hidden",
    border: `3px solid ${borderColor}`,
    boxSizing: "border-box",
    flexShrink: 0,
    boxShadow: `0 0 0 4px ${ring}, 0 8px 24px rgba(0,0,0,0.15)`,
    background: src ? "#0f172a" : "linear-gradient(145deg, #6366f1, #8b5cf6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: Math.round(size * 0.38),
    fontWeight: 800,
  };
  if (src) {
    return (
      <div style={wrap} aria-hidden={!name}>
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
    );
  }
  return <div style={wrap}>{initial}</div>;
}

function AttendanceScanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("Loading recognition models...");
  const [isScanning, setIsScanning] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [workShiftPlan, setWorkShiftPlan] = useState(null);
  // "Today's Attendance Log" should show ONLY the current matched user.
  const [activeUserId, setActiveUserId] = useState(null);
  const activeUserIdRef = useRef(null);
  const [lastMatch, setLastMatch] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [successAvatar, setSuccessAvatar] = useState(null);
  const [noFaceWarning, setNoFaceWarning] = useState(false);
  const [multiFaceWarning, setMultiFaceWarning] = useState(false);
  const [spoofWarning, setSpoofWarning] = useState(false);
  const [spoofReason, setSpoofReason] = useState(null);
  const [faceFitGuide, setFaceFitGuide] = useState("place_in_circle");
  const [lowLight, setLowLight] = useState(false);
  // Pinned at the slider's strictest setting (was a user-facing range, now
  // hidden from the UI). Server anti-spoof is OFF by default - the third-
  // party endpoint frequently misclassifies real faces as "Printed Photo /
  // Screen" which would block real users. The local detectors (rectangle-
  // in-circle, temporal HF correlation, liveness, circle gate) cover the
  // spoof surface without that false-positive risk.
  const antiThreshold = 95;
  const useServerAnti = false;
  // Diagnostic panel was removed from the UI; these are kept as refs so the
  // detection pipeline can still record the values for logging without
  // pulling React renders.
  const antiInfoRef = useRef(null);
  const serverAntiLoadingRef = useRef(false);
  const setAntiInfo = (v) => {
    antiInfoRef.current = v;
  };
  const setServerAntiLoading = (v) => {
    serverAntiLoadingRef.current = v;
  };
  const detectionIntervalRef = useRef(null);
  const antiBufferRef = useRef([]);
  const antiFramesRef = useRef([]);
  const noFaceWarningRef = useRef(null);
  const noFaceCountRef = useRef(0);
  const landmarkBufferRef = useRef([]);
  const centerBufferRef = useRef([]);
  const spoofDetectedRef = useRef(false);

  // Anti-spoof rolling state
  const evidenceBufferRef = useRef([]);
  const cleanFrameCountRef = useRef(0);
  const spoofLatchRef = useRef(false);
  const spoofBoxRef = useRef(null);
  const spoofReasonRef = useRef(null);
  const stableFaceFramesRef = useRef(0);

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

  useEffect(() => {
    activeUserIdRef.current = activeUserId;
  }, [activeUserId]);

  // Load face-api.js and models
  useEffect(() => {
    const loadFaceApi = async () => {
      try {
        setLoadingStatus("Loading face-api library...");
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/dist/face-api.min.js";
        script.onload = async () => {
          console.log("✓ face-api.js loaded");
          setLoadingStatus("Loading facial recognition models...");
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
            setErrorMsg("Model loading error: " + err.message);
            setIsLoading(false);
          }
        };
        script.onerror = () => {
          setErrorMsg("Unable to load face-api.js");
          setIsLoading(false);
        };
        document.body.appendChild(script);
      } catch (error) {
        console.error("Load face-api error:", error);
        setErrorMsg("Face-api loading error: " + error.message);
        setIsLoading(false);
      }
    };

    loadFaceApi();

    // Load today's attendance logs from backend so they persist after reload
    fetchTodayLogs();

    // Keep the "Today" list in sync with backend (other kiosks / devices)
    const pollId = setInterval(() => {
      fetchTodayLogs();
    }, 5000);

    const onVis = () => {
      if (!document.hidden) fetchTodayLogs();
    };
    document.addEventListener("visibilitychange", onVis);

    // Cleanup
    return () => {
      clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVis);
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  // Fetch today's attendance logs from backend (so they persist after reload)
  const fetchTodayLogs = async (userIdOverride = null) => {
    try {
      const uid = userIdOverride ?? activeUserIdRef.current;
      if (!uid) {
        // No active user yet -> don't show other people's rows.
        if (attendanceLogs.length) setAttendanceLogs([]);
        return;
      }
      const qs = new URLSearchParams({ userId: String(uid) });
      const res = await fetch(`${API_BASE}/api/attendance/today?${qs.toString()}`);
      const data = await res.json();
      if (data.status === "success" && Array.isArray(data.logs)) {
        const overtimeRequestStatus = data.overtimeRequest?.approvalStatus || null;
        const mapped = data.logs.map((log) => ({
          id: log.id,
          timestamp: log.timestamp ? new Date(log.timestamp).getTime() : 0,
          time: log.timestamp ? new Date(log.timestamp).toLocaleTimeString("en-US") : "",
          name: log.detectedName || "Unknown",
          status: "✓",
          type: log.type || "IN",
          logsCount: 0,
          avatarUrl: log.avatarUrl || null,
          note: log.note || "",
          flags: log.flags || {},
          shiftLabel: log.shiftLabel || "Main shift",
          allowedLateMinutes: log.allowedLateMinutes || data.allowedLateMinutes || 0,
          overtimeRequestStatus,
        }));
        mapped.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setAttendanceLogs(mapped);
        setWorkShiftPlan(data.shiftPlan || null);
      }
    } catch (e) {
      console.warn("Fetch today logs failed:", e);
    }
  };

  const startScanning = async () => {
    try {
      // Reset all rolling state before a fresh scan so stale signals from a
      // previous session can't keep the spoof latch engaged.
      antiBufferRef.current = [];
      antiFramesRef.current = [];
      landmarkBufferRef.current = [];
      centerBufferRef.current = [];
      noFaceCountRef.current = 0;
      resetSpoofState();
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
      setErrorMsg("Cannot access camera: " + error.message);
    }
  };

  const renderDetailText = (log) => {
    if (log.isAuto) {
      return "Auto checkout";
    }
    if (log.flags.isLate) {
      const lateMinutesMatch = log.note?.match(/(-?\d+)\s*min/);
      const minutes = lateMinutesMatch ? Number(lateMinutesMatch[1]) : null;
      return minutes !== null
        ? `Late by ${minutes} min beyond Allowed late time (${log.allowedLateMinutes} min)`
        : `Late beyond Allowed late time (${log.allowedLateMinutes} min)`;
    }
    if (log.flags.isEarlyLeave) {
      const earlyMinutesMatch = log.note?.match(/(-?\d+)\s*min/);
      const minutes = earlyMinutesMatch ? Number(earlyMinutesMatch[1]) : null;
      return minutes !== null
        ? `Left early by ${minutes} min`
        : `Left early`;
    }
    if (log.flags.isOvertime) {
      if (log.overtimeRequestStatus === 'approved') {
        return `OT Approved`;
      }
      if (log.overtimeRequestStatus === 'pending') {
        return `Pending OT request`;
      }
      return `Overtime shift`;
    }
    if (log.overtimeRequestStatus === 'pending') {
      return `Pending OT request`;
    }
    return log.shiftLabel || "Main shift";
  };

  const getShiftOrder = (label) => {
    if (!label) return 500;
    const match = label.match(/Shift\s*(\d+)/i);
    if (match) return Number(match[1]);
    if (/overtime/i.test(label)) return 999;
    return 500;
  };

  const groupedShiftLogs = useMemo(() => {
    const groups = new Map();
    const sortedLogs = [...attendanceLogs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    sortedLogs.forEach((log) => {
      const label = log.shiftLabel || "Shift 1";
      const group = groups.get(label) || {
        shiftLabel: label,
        checkIn: null,
        checkOut: null,
        overtimeRequestStatus: log.overtimeRequestStatus || null,
        logs: []
      };
      group.logs.push(log);
      if (log.type === 'IN') group.checkIn = log;
      if (log.type === 'OUT') group.checkOut = log;
      if (!group.overtimeRequestStatus && log.overtimeRequestStatus) {
        group.overtimeRequestStatus = log.overtimeRequestStatus;
      }
      groups.set(label, group);
    });
    return Array.from(groups.values()).sort((a, b) => getShiftOrder(a.shiftLabel) - getShiftOrder(b.shiftLabel));
  }, [attendanceLogs]);

  const startDetection = () => {
    setIsScanning(true);
    detectionIntervalRef.current = setInterval(detectFace, 300);
  };

  // Push one frame's evidence into the rolling buffer, evaluate the latch,
  // and synchronise React state. Returns the latch decision so callers can
  // immediately gate any follow-up actions (e.g. opening the confirm dialog).
  const pushEvidenceAndEvaluate = (evidence) => {
    const buffer = evidenceBufferRef.current;
    buffer.push(evidence);
    if (buffer.length > EVIDENCE_BUFFER_LIMIT) buffer.shift();

    const decision = evaluateSpoofEvidence(buffer, {
      cleanFramesRequired: SPOOF_CLEAN_FRAMES_REQUIRED,
    });

    const hasAnySignal =
      !!evidence.staticImage ||
      !!evidence.lowLiveness ||
      !!(evidence.rectInside && evidence.rectInside.detected) ||
      !!(evidence.serverSpoof && (evidence.serverSpoof.lowScore || /Screen|Print|Replay|Encoding|Compressed/i.test(evidence.serverSpoof.spooType || "")));

    if (decision.block) {
      spoofLatchRef.current = true;
      cleanFrameCountRef.current = 0;
      if (decision.primaryBbox) {
        spoofBoxRef.current = decision.primaryBbox;
      }
      if (decision.primaryReason) {
        spoofReasonRef.current = decision.primaryReason;
        setSpoofReason(decision.primaryReason);
      }
      if (!spoofWarning) setSpoofWarning(true);
      console.warn(
        `[SpoofGate] BLOCK reason=${decision.primaryReason || "n/a"} ` +
          `high=${decision.highCount} medium=${decision.mediumCount}`
      );
      return { latched: true, decision };
    }

    if (spoofLatchRef.current) {
      // Already latched – count clean (no-evidence) frames before releasing.
      if (!hasAnySignal) {
        cleanFrameCountRef.current += 1;
      } else {
        cleanFrameCountRef.current = 0;
      }
      if (cleanFrameCountRef.current >= SPOOF_CLEAN_FRAMES_REQUIRED) {
        console.log(
          `[SpoofGate] release after ${cleanFrameCountRef.current} clean frames`
        );
        spoofLatchRef.current = false;
        spoofBoxRef.current = null;
        spoofReasonRef.current = null;
        cleanFrameCountRef.current = 0;
        setSpoofWarning(false);
        setSpoofReason(null);
      }
      return { latched: spoofLatchRef.current, decision };
    }

    if (!hasAnySignal) {
      cleanFrameCountRef.current = Math.min(
        cleanFrameCountRef.current + 1,
        SPOOF_CLEAN_FRAMES_REQUIRED
      );
    }
    return { latched: false, decision };
  };

  const resetSpoofState = () => {
    evidenceBufferRef.current = [];
    spoofLatchRef.current = false;
    spoofBoxRef.current = null;
    spoofReasonRef.current = null;
    cleanFrameCountRef.current = 0;
    stableFaceFramesRef.current = 0;
    setSpoofWarning(false);
    setSpoofReason(null);
    setFaceFitGuide("place_in_circle");
  };

  const detectFace = async () => {
    if (!videoRef.current || !canvasRef.current || !faceApiLoaded) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Low-light gate: if the room is too dark, ask the user to brighten
      // before running any detection / spoof pipeline. Skipping the rest of
      // the work also keeps the spoof latch from resetting prematurely.
      const meanLum = measureLuminance(video);
      if (meanLum < LOW_LIGHT_THRESHOLD) {
        setLowLight(true);
        setFaceFitGuide("low_light");
        setConfirmDialog(null);
        stableFaceFramesRef.current = 0;
        const ctxLL = canvas.getContext("2d");
        ctxLL.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      if (lowLight) setLowLight(false);

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      // Draw on canvas
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const faceCircle = computeFaceCircle(canvas.width, canvas.height);

      // Draw the face-frame circle. Colour communicates current state:
      //   red    -> spoof latched / device detected
      //   green  -> face inside circle and clean
      //   blue   -> waiting for face to enter the circle
      const drawFaceCircle = (state) => {
        const colour =
          state === "spoof"
            ? "#ff1f1f"
            : state === "ok"
            ? "#52c41a"
            : "#1890ff";
        ctx.save();
        // Soft inner glow / dashed line
        ctx.lineWidth = 4;
        ctx.strokeStyle = colour;
        ctx.shadowColor = colour;
        ctx.shadowBlur = state === "spoof" ? 18 : 10;
        ctx.beginPath();
        // Match the CSS overlay's near-round vertical ellipse (0.95:1).
        ctx.ellipse(
          faceCircle.cx,
          faceCircle.cy,
          faceCircle.r * 0.95,
          faceCircle.r,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
      };

      // If the spoof latch is on, paint the suspected region in bright red
      // BEFORE the face overlays so it's clearly visible to the user.
      const drawSpoofBox = () => {
        const box = spoofBoxRef.current;
        if (!spoofLatchRef.current || !box) return;
        ctx.save();
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#ff1f1f";
        ctx.shadowColor = "rgba(255, 31, 31, 0.55)";
        ctx.shadowBlur = 14;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.restore();
      };

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

        // Face fit assessment is computed up-front so the canvas overlays
        // (circle colour, face bbox colour) reflect the same state that
        // gates the detector pipeline below.
        const primaryDet =
          detections.length === 1 ? detections[0] : null;
        const fit = primaryDet
          ? evaluateFaceFit(primaryDet.detection.box, faceCircle)
          : { ok: false, reasons: ["multi_face"] };

        const circleState = spoofLatchRef.current
          ? "spoof"
          : fit.ok
          ? "ok"
          : "wait";
        drawFaceCircle(circleState);

        detections.forEach((detection, idx) => {
          const box = detection.detection.box;
          const landmarks = detection.landmarks;

          // Draw bounding box (green for normal, yellow for multi-face,
          // red while spoof latch is engaged so the user sees the issue).
          ctx.strokeStyle = spoofLatchRef.current
            ? "#ff1f1f"
            : detections.length === 1
            ? fit.ok
              ? "#28a745"
              : "#1890ff"
            : "#ffc107";
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

        drawSpoofBox();

        // -----------------------------------------------------------------
        // FACE-IN-CIRCLE GATE.
        // Until the user puts their face inside the fixed circle, no
        // anti-spoof / matching work runs. We surface a guide message and
        // drop the stable counter so the confirm dialog can never open.
        // -----------------------------------------------------------------
        if (!fit.ok) {
          setFaceFitGuide(fit.reasons[0] || "place_in_circle");
          setConfirmDialog(null);
          stableFaceFramesRef.current = 0;
          return;
        }
        setFaceFitGuide(null);

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

          // ----------------------------------------------------------------
          // SPOOF SIGNAL COLLECTION
          // The user's circle gate enforces a minimum face size, which in
          // turn enforces a minimum real-world distance. At that distance a
          // phone-displayed face is too small to fit. The remaining defense
          // layers therefore focus on whether the imagery itself looks like
          // a real, moving face: liveness, local anti-spoof (texture/moire),
          // temporal HF correlation, and server-side anti-spoof.
          // ----------------------------------------------------------------

          // Server-side advanced analysis – signal only, never auto-passes.
          let serverSpoof = null;
          if (useServerAnti) {
            try {
              setServerAntiLoading(true);

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
                        temporal.staticImage = true;
                      }
                    }
                  }
                } catch (e) {
                  console.warn('Temporal stream failed', e);
                }
              }

              const img = document.createElement('canvas');
              const ictx = img.getContext('2d');
              img.width = videoRef.current.videoWidth || 640;
              img.height = videoRef.current.videoHeight || 480;
              ictx.drawImage(videoRef.current, 0, 0, img.width, img.height);
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
                  serverSpoof = {
                    spooType: json.spooType,
                    isReal: json.isReal,
                    score: serverScore,
                    lowScore: serverScore < antiThreshold,
                  };
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
          setAntiInfo({ ...anti, score: Math.round(avgAnti) });
          console.log(`[AntiCheck] avgAnti=${avgAnti.toFixed(1)}, anti.isFace=${anti.isFace}, live.isAlive=${live.isAlive}`);

          // Rectangle-inside-circle detector: scans the ring between the
          // user's face bbox and the circle perimeter for long horizontal/
          // vertical edges or right-angle corners. Real faces leave that
          // ring sparse; a phone-displayed face leaves a sharp bezel.
          let insideRect = null;
          try {
            insideRect = detectRectangleInsideCircle(
              videoRef.current,
              faceCircle,
              primaryDet.detection.box
            );
          } catch (e) {
            console.warn("rectangle-in-circle detector failed", e);
            insideRect = null;
          }

          // Build the per-frame evidence record. Each signal is independent;
          // the evaluator combines them to decide whether to latch.
          // NOTE: lowAntiScore is intentionally NOT part of the evidence:
          // with antiThreshold pinned at 95 the local heuristic would fire
          // on virtually every real frame and silently block real users.
          // The corroborated `live.isAlive AND avgAnti < threshold` gate
          // below still uses it as a *combined* signal.
          const antiValid = Number.isFinite(avgAnti);
          const evidence = {
            timestamp: Date.now(),
            staticImage: !!temporal.staticImage,
            lowLiveness: !live.isAlive,
            rectInside: insideRect,
            serverSpoof,
          };

          const { latched } = pushEvidenceAndEvaluate(evidence);

          // Any spoof signal AT ALL on this frame resets the stable-face
          // counter so the confirm dialog can never open while a screen /
          // photo / static signal is present.
          const hasAnySpoofSignalThisFrame =
            !!temporal.staticImage ||
            evidence.lowLiveness ||
            !!(insideRect && insideRect.detected) ||
            !!(
              serverSpoof &&
              (serverSpoof.lowScore ||
                /Screen|Print|Replay|Encoding|Compressed/i.test(
                  serverSpoof.spooType || ""
                ))
            );

          if (hasAnySpoofSignalThisFrame) {
            stableFaceFramesRef.current = 0;
          } else {
            stableFaceFramesRef.current = Math.min(
              stableFaceFramesRef.current + 1,
              REQUIRED_STABLE_FRAMES * 2
            );
          }

          if (latched) {
            spoofDetectedRef.current = true;
            setConfirmDialog(null);
            return;
          }

          // Per-frame fail-closed gate. Once any of the strong signals fire,
          // never progress to confirm even if the multi-frame latch hasn't
          // engaged yet.
          if (temporal.staticImage) {
            setConfirmDialog(null);
            return;
          }
          if (insideRect && insideRect.detected) {
            console.warn(
              "[SpoofGate] rectangle-in-circle: " +
                (insideRect.reasons || []).join(",")
            );
            setConfirmDialog(null);
            return;
          }
          // Server spoof verdict alone is not enough to fail-close - the
          // server's "Printed Photo / Screen" classifier mis-fires on real
          // faces. Require corroboration with a local signal (no liveness
          // OR low local anti-spoof) before blocking.
          if (
            serverSpoof &&
            serverSpoof.spooType &&
            /Screen|Print|Replay|Encoding|Compressed/i.test(serverSpoof.spooType) &&
            (!live.isAlive || (antiValid && avgAnti < antiThreshold))
          ) {
            setConfirmDialog(null);
            return;
          }
          if (!live.isAlive && antiValid && avgAnti < antiThreshold) {
            setConfirmDialog(null);
            return;
          }

          spoofDetectedRef.current = false;

          // Require N consecutive clean frames before opening the confirm
          // dialog. This is the second layer of the fail-closed design – it
          // protects against the case where face-api fires once on a phone
          // before any of the spoof detectors have had a chance to run.
          if (stableFaceFramesRef.current < REQUIRED_STABLE_FRAMES) {
            return;
          }

          if (
            !spoofLatchRef.current &&
            (!lastMatch || Date.now() - lastMatch > 5000)
          ) {
            showConfirmation(detections[0]);
          }
        }
      } else {
        setDetectedFaces(0);
        // Close dialog if no face detected
        setConfirmDialog(null);
        centerBufferRef.current = [];
        landmarkBufferRef.current = [];
        spoofDetectedRef.current = false;
        stableFaceFramesRef.current = 0;
        setFaceFitGuide("place_in_circle");
        drawFaceCircle(spoofLatchRef.current ? "spoof" : "wait");
        drawSpoofBox();

        pushEvidenceAndEvaluate({
          timestamp: Date.now(),
          staticImage: false,
          lowLiveness: false,
          serverSpoof: null,
        });

        // Count frames without face - show warning after ~7 frames (2 seconds at 300ms interval)
        noFaceCountRef.current += 1;
        if (noFaceCountRef.current >= 7 && !noFaceWarning && !spoofLatchRef.current) {
          setNoFaceWarning(true);
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

        // Block deactivated accounts: show message and don't open confirm dialog / log
        if (matchData.deactivated) {
          console.warn("🚫 Deactivated account attempted attendance:", matchData.detectedName);
          setConfirmDialog(null);
          setErrorMsg(
            matchData.message ||
              `Your account has been deactivated${
                matchData.detectedName ? ` (${matchData.detectedName})` : ""
              }. Please contact HR.`
          );
          setLastMatch(Date.now());
          setTimeout(() => setErrorMsg(""), 6000);
          return;
        }

        // Final fail-closed check: the spoof latch may have engaged while
        // the backend match request was in flight – never open the dialog
        // in that case.
        if (spoofLatchRef.current) {
          console.warn(
            "[Scanner] dropping match result because spoof latch engaged during request"
          );
          return;
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
        // When a user is matched, show ONLY their "today" rows.
        if (matchData?.matched && matchData?.userId) {
          setActiveUserId(matchData.userId);
          fetchTodayLogs(matchData.userId);
        }
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

    // Defence-in-depth: if a spoof signal arrived while the dialog was open
    // (e.g. the user pulled out a phone after the dialog appeared) the latch
    // is now engaged. Block the submission and surface the warning instead.
    if (confirmed && spoofLatchRef.current) {
      console.warn(
        "[Scanner] CONFIRM pressed while spoof latch engaged – blocking"
      );
      setConfirmDialog(null);
      setSpoofWarning(true);
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
          // Backend reports the matched user is deactivated — do NOT treat as a successful log
          if (result.deactivated) {
            console.warn("🚫 Deactivated account blocked at log step:", result.detectedName);
            setErrorMsg(
              result.message ||
                `Your account has been deactivated${
                  result.detectedName ? ` (${result.detectedName})` : ""
                }. Please contact HR.`
            );
            setTimeout(() => setErrorMsg(""), 6000);
            return;
          }

          console.log("Attendance logged:", result);
          if (result?.userId) setActiveUserId(result.userId);
          // Reload today's logs from server so list stays in sync and persists after reload
          await fetchTodayLogs(result?.userId || null);

          // Show success or finished toast for 3 seconds
          if (result.finished) {
            setSuccessMsg("Workday completed successfully");
          } else {
            setSuccessMsg(`Attendance recorded: ${result.detectedName}`);
          }
          setSuccessAvatar(
            result.avatarUrl
              ? { url: result.avatarUrl, name: result.detectedName || "" }
              : null
          );
          setTimeout(() => {
            setSuccessMsg("");
            setSuccessAvatar(null);
          }, 3000);
          
          // Keep camera visible but stopped - user can click to scan again
        } else {
          console.error("Log error:", result);
          setErrorMsg("Error: " + (result.message || "Unable to record attendance"));
        }
      } catch (error) {
        console.error("Attendance log error:", error);
        setErrorMsg("Connection error: " + error.message);
      } finally {
        console.log("Attendance submission complete");
        setIsSubmitting(false);
        centerBufferRef.current = [];
        landmarkBufferRef.current = [];
        spoofDetectedRef.current = false;
        resetSpoofState();
      }
    } else {
      console.log("Confirmed NO - Closing dialog and restarting detection");
      setConfirmDialog(null);
      setLastMatch(Date.now());
      setAntiInfo(null);
      antiBufferRef.current = [];
      centerBufferRef.current = [];
      landmarkBufferRef.current = [];
      spoofDetectedRef.current = false;
      noFaceCountRef.current = 0;
      resetSpoofState();
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

  const nextDialogType = getNextAttendanceType(confirmDialog?.matchData);
  const nextDialogIsIn = nextDialogType === "IN";

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

      {/* Spoof / device-in-frame warning is rendered as an overlay on the
          camera container further down. We keep this top-level toast empty
          to avoid duplicating the message. */}

      {/* Success Toast */}
      {successMsg && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          backgroundColor: "#f6ffed",
          color: "#389e0d",
          padding: "16px 20px",
          borderRadius: "12px",
          border: "2px solid #b7eb8f",
          boxShadow: "0 8px 24px rgba(56, 158, 13, 0.15)",
          zIndex: 2000,
          fontSize: "15px",
          fontWeight: "600",
          maxWidth: "420px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}>
          {successAvatar ? (
            <KioskRoundAvatar
              avatarUrl={successAvatar.url}
              name={successAvatar.name}
              size={56}
              borderColor="#b7eb8f"
              ringColor="rgba(82, 196, 26, 0.25)"
            />
          ) : null}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: "700", marginBottom: "4px" }}>SUCCESS</div>
            <div style={{ fontSize: "14px", fontWeight: "400" }}>
              {successMsg}
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
                    margin: "0 auto 12px",
                    fontSize: "36px",
                    color: "#ffffff"
                  }}>
                    ✓
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                    <KioskRoundAvatar
                      avatarUrl={confirmDialog.matchData.avatarUrl}
                      name={confirmDialog.matchData.detectedName}
                      size={96}
                      borderColor="#ffffff"
                      ringColor="rgba(82, 196, 26, 0.35)"
                    />
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
                      setAntiInfo(null);
                      antiBufferRef.current = [];
                      centerBufferRef.current = [];
                      landmarkBufferRef.current = [];
                      spoofDetectedRef.current = false;
                      noFaceCountRef.current = 0;
                      resetSpoofState();
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
                  backgroundColor: nextDialogIsIn ? "#e6f7ff" : "#fff7e6",
                  padding: "32px 32px 24px",
                  borderBottom: `2px solid ${nextDialogIsIn ? "#91d5ff" : "#ffd591"}`,
                  textAlign: "center"
                }}>
                  <div style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    backgroundColor: nextDialogIsIn ? "#1890ff" : "#fa8c16",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                    fontSize: "36px",
                    color: "#ffffff",
                    fontWeight: "700"
                  }}>
                    {nextDialogType}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                    <KioskRoundAvatar
                      avatarUrl={confirmDialog.matchData.avatarUrl}
                      name={confirmDialog.matchData.detectedName}
                      size={96}
                      borderColor="#ffffff"
                      ringColor={
                        nextDialogIsIn
                          ? "rgba(24, 144, 255, 0.35)"
                          : "rgba(250, 140, 22, 0.35)"
                      }
                    />
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
                    Verify your {nextDialogIsIn ? "check-in" : "check-out"} record
                  </p>
                </div>
                
                <div style={{ padding: "24px 32px 32px" }}>
                  <div style={{
                    backgroundColor: nextDialogIsIn ? "#e6f7ff" : "#fff7e6",
                    border: `2px solid ${nextDialogIsIn ? "#91d5ff" : "#ffd591"}`,
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "24px",
                    textAlign: "left"
                  }}>
                    <div style={{
                      display: "inline-block",
                      padding: "6px 14px",
                      backgroundColor: nextDialogIsIn ? "#1890ff" : "#fa8c16",
                      color: "#ffffff",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "700",
                      letterSpacing: "0.5px",
                      marginBottom: "12px"
                    }}>
                      {nextDialogIsIn ? "CHECK IN" : "CHECK OUT"}
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
                      {nextDialogIsIn
                        ? "Starting your work session"
                        : "Ending your work session"}
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
                        backgroundColor: nextDialogIsIn ? "#1890ff" : "#fa8c16",
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
                          e.target.style.backgroundColor = nextDialogIsIn ? "#096dd9" : "#d46b08";
                          e.target.style.transform = "translateY(-2px)";
                          e.target.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = nextDialogIsIn ? "#1890ff" : "#fa8c16";
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
                      setAntiInfo(null);
                      antiBufferRef.current = [];
                      centerBufferRef.current = [];
                      landmarkBufferRef.current = [];
                      spoofDetectedRef.current = false;
                      noFaceCountRef.current = 0;
                      resetSpoofState();
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

                {/* Face-frame ring overlay. CSS-only so the ring keeps a
                    near-perfect vertical circle regardless of the camera
                    container's aspect ratio. The outer wrapper clips the
                    box-shadow that paints the scrim outside the ring. */}
                {isScanning && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                      zIndex: 6,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: `${FACE_CIRCLE.cyRatio * 100}%`,
                        transform: "translate(-50%, -50%)",
                        height: `${FACE_CIRCLE.rRatio * 200}%`,
                        aspectRatio: "0.95 / 1",
                        borderRadius: "50%",
                        border: `3px ${
                          spoofWarning || faceFitGuide ? "dashed" : "solid"
                        } ${
                          spoofWarning
                            ? "#ff1f1f"
                            : lowLight || faceFitGuide
                            ? "#1890ff"
                            : "#52c41a"
                        }`,
                        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.42)",
                      }}
                    />
                  </div>
                )}

                {/* Face-fit guide message. Hidden once the spoof overlay
                    takes over (the user needs to deal with that first). */}
                {isScanning && (lowLight || faceFitGuide) && !spoofWarning && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "8%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "rgba(0,0,0,0.6)",
                      color: "#ffffff",
                      padding: "10px 18px",
                      borderRadius: "999px",
                      fontSize: "13px",
                      fontWeight: 600,
                      letterSpacing: "0.3px",
                      zIndex: 7,
                      pointerEvents: "none",
                      maxWidth: "85%",
                      textAlign: "center"
                    }}
                  >
                    {lowLight
                      ? "Lighting too low - please brighten the area"
                      : faceFitGuide === "multi_face"
                      ? "Only one person should be in frame"
                      : "Place your face inside the circle"}
                  </div>
                )}

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

                {/* INVALID ATTENDANCE overlay – shown while the spoof latch
                    is engaged. Mirrors the design from the product mockup. */}
                {spoofWarning && (
                  <div
                    style={{
                      position: "absolute",
                      top: "5%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "rgba(255, 235, 235, 0.97)",
                      border: "2px solid #ffb3b3",
                      borderRadius: "14px",
                      padding: "16px 24px",
                      width: "min(86%, 520px)",
                      textAlign: "center",
                      boxShadow: "0 12px 32px rgba(207, 19, 34, 0.25)",
                      zIndex: 20,
                      pointerEvents: "none"
                    }}
                  >
                    <div
                      style={{
                        color: "#cf1322",
                        fontWeight: 800,
                        fontSize: "18px",
                        letterSpacing: "0.6px",
                        marginBottom: "8px",
                        textTransform: "uppercase"
                      }}
                    >
                      INVALID ATTENDANCE
                    </div>
                    <div
                      style={{
                        color: "#1a1f36",
                        fontSize: "14px",
                        marginBottom: "6px",
                        fontWeight: 500
                      }}
                    >
                      A photo or video from a mobile device has been detected.
                    </div>
                    <div
                      style={{
                        color: "#cf1322",
                        fontWeight: 700,
                        fontSize: "14px",
                        marginBottom: "6px"
                      }}
                    >
                      Fraudulent attempts are strictly prohibited.
                    </div>
                    <div
                      style={{
                        color: "#697386",
                        fontSize: "13px"
                      }}
                    >
                      Please use your real presence for attendance.
                    </div>
                    {spoofReason && (
                      <div
                        style={{
                          marginTop: "10px",
                          fontSize: "11px",
                          color: "#8c8c8c",
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace"
                        }}
                      >
                        reason: {spoofReason}
                      </div>
                    )}
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
                gap: "16px" 
              }}>
                {groupedShiftLogs.map((group) => {
                  const checkIn = group.checkIn;
                  const checkOut = group.checkOut;
                  const completed = checkIn && checkOut;
                  const groupStatus = completed ? "Completed" : "Incomplete";

                  return (
                    <div
                      key={group.shiftLabel}
                      style={{
                        padding: "22px",
                        backgroundColor: "#ffffff",
                        borderRadius: "18px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 18px 35px rgba(15, 23, 42, 0.06)"
                      }}
                    >
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "12px"
                      }}>
                        <div>
                          <div style={{
                            fontSize: "18px",
                            fontWeight: 700,
                            color: "#111827",
                            marginBottom: "6px"
                          }}>
                            {group.shiftLabel}
                          </div>
                          <div style={{
                            fontSize: "13px",
                            color: "#6b7280"
                          }}>
                            {groupStatus}
                          </div>
                        </div>
                        {group.overtimeRequestStatus && /overtime/i.test(group.shiftLabel) && (
                          <span style={{
                            padding: "6px 14px",
                            borderRadius: "999px",
                            backgroundColor: group.overtimeRequestStatus === 'approved' ? '#0d6efd' : '#f59e0b',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px'
                          }}>
                            {group.overtimeRequestStatus === 'approved' ? 'OT Approved' : 'Pending OT request'}
                          </span>
                        )}
                      </div>

                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "14px",
                        marginTop: "18px"
                      }}>
                        {['IN', 'OUT'].map((type) => {
                          const log = type === 'IN' ? checkIn : checkOut;
                          const isIn = type === 'IN';
                          const statusColor = isIn ? '#52c41a' : '#fa8c16';
                          const isAutoCheckout = !isIn && checkOut && checkOut.isAuto;

                          return (
                            <div
                              key={type}
                              style={{
                                borderRadius: "16px",
                                border: isAutoCheckout ? "2px solid #dc3545" : "1px solid #e5e7eb",
                                backgroundColor: isAutoCheckout ? "#fff5f5" : "#f8fafc",
                                padding: "18px",
                                boxShadow: isAutoCheckout ? "0 0 0 3px rgba(220, 53, 69, 0.1)" : "none"
                              }}
                            >
                              <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "12px"
                              }}>
                                <span style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  color: "#475569",
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase"
                                }}>
                                  {isIn ? "Check In" : "Check Out"}
                                </span>
                                <span style={{
                                  padding: "6px 12px",
                                  borderRadius: "999px",
                                  backgroundColor: statusColor,
                                  color: "#fff",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  textTransform: "uppercase"
                                }}>
                                  {log ? "Verified" : "Missing"}
                                </span>
                              </div>

                              {log ? (
                                <>
                                  <div style={{
                                    fontSize: "22px",
                                    fontWeight: 700,
                                    color: "#111827",
                                    marginBottom: "10px"
                                  }}>
                                    {log.time}
                                  </div>
                                  <div style={{
                                    fontSize: "13px",
                                    color: "#475569",
                                    marginBottom: "10px"
                                  }}>
                                    {renderDetailText(log)}
                                  </div>
                                  <div style={{
                                    fontSize: "12px",
                                    color: "#6b7280"
                                  }}>
                                    {log.name}
                                  </div>
                                </>
                              ) : (
                                <div style={{
                                  fontSize: "14px",
                                  color: "#9ca3af"
                                }}>
                                  Không có dữ liệu
                                </div>
                              )}
                            </div>
                          );
                        })}
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
