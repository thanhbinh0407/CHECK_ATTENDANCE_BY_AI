import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

export default function EnrollForm() {
  const videoRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const MODEL_URL = "/models";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
    })();
  }, []);

  const startCamera = async () => {
    const s = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = s;
    videoRef.current.play();
  };

  const handleEnroll = async () => {
    if (!modelsLoaded) return alert("Đang tải models");
    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return alert("Không tìm thấy khuôn mặt");

    const descriptor = Array.from(detection.descriptor);

    // crop face to base64
    const box = detection.detection.box;
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = box.width;
    tmpCanvas.height = box.height;
    const ctx = tmpCanvas.getContext("2d");
    ctx.drawImage(videoRef.current, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
    const imageBase64 = tmpCanvas.toDataURL("image/jpeg");

    const payload = {
      name, email, descriptor, imageBase64, modelVersion: "faceapi-tiny-1"
    };

    const res = await fetch(`${import.meta.env.VITE_API_BASE || "http://localhost:5000"}/api/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.status === "success") alert("Enroll thành công");
    else alert("Lỗi enroll");
  };

  return (
    <div>
      <h3>Enroll user</h3>
      <input placeholder="Tên" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <div>
        <video ref={videoRef} width="320" height="240" autoPlay muted />
      </div>
      <button onClick={startCamera}>Bật Camera</button>
      <button onClick={handleEnroll} style={{ marginLeft: 8 }}>
        Enroll (chụp & gửi)
      </button>
    </div>
  );
}
