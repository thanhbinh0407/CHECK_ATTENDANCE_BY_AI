/**
 * Anti-Spoofing & Liveness utilities (aligned with attendance scanner validation).
 * Used for face capture validation in employee enrollment.
 */

export const analyzeTextureQuality = (video) => {
  if (!video || !video.videoWidth) return { isHighQuality: false, textureScore: 0 };

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = 64;
  canvas.height = 64;

  ctx.filter = 'grayscale(1)';
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let laplacianSum = 0;
  for (let i = 4; i < data.length - 4; i += 4) {
    const pixel = data[i];
    const neighbors = [
      data[i - 4],
      data[i + 4],
      data[i - canvas.width * 4],
      data[i + canvas.width * 4]
    ];
    const laplacian = Math.abs(4 * pixel - neighbors.reduce((a, b) => a + b, 0));
    laplacianSum += laplacian;
  }

  const textureScore = laplacianSum / (canvas.width * canvas.height);
  const isHighQuality = textureScore > 15;
  return { isHighQuality, textureScore };
};

export const analyzeFrequencyContent = (video) => {
  if (!video || !video.videoWidth) return { hasArtificialPattern: false, frequencyScore: 0 };

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = 32;
  canvas.height = 32;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  let highFreq = 0;
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const idx = (y * canvas.width + x) * 4;
      const center = pixels[idx];
      const neighbors = [
        pixels[idx - 4], pixels[idx + 4],
        pixels[idx - canvas.width * 4], pixels[idx + canvas.width * 4]
      ];
      const diff = Math.abs(center - neighbors.reduce((a, b) => a + b, 0) / neighbors.length);
      highFreq += diff;
    }
  }

  const frequencyScore = highFreq / (canvas.width * canvas.height);
  const hasArtificialPattern = frequencyScore > 30;
  return { hasArtificialPattern, frequencyScore };
};

export const analyzeColorChannels = (video) => {
  if (!video || !video.videoWidth) return { isColorDistributed: false, colorScore: 0 };

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = 32;
  canvas.height = 32;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let rSum = 0, gSum = 0, bSum = 0;
  const pixelCount = canvas.width * canvas.height;

  for (let i = 0; i < data.length; i += 4) {
    rSum += data[i];
    gSum += data[i + 1];
    bSum += data[i + 2];
  }

  const rMean = rSum / pixelCount;
  const gMean = gSum / pixelCount;
  const bMean = bSum / pixelCount;

  let rVar = 0, gVar = 0, bVar = 0;
  for (let i = 0; i < data.length; i += 4) {
    rVar += Math.pow(data[i] - rMean, 2);
    gVar += Math.pow(data[i + 1] - gMean, 2);
    bVar += Math.pow(data[i + 2] - bMean, 2);
  }

  const colorScore = (Math.sqrt(rVar) + Math.sqrt(gVar) + Math.sqrt(bVar)) / 3 / pixelCount;
  const isColorDistributed = colorScore > 0.3;
  return { isColorDistributed, colorScore };
};

export const calculateAntiSpoofingScore = (video) => {
  if (!video) return { isFace: false, score: 0, details: {} };

  const texture = analyzeTextureQuality(video);
  const frequency = analyzeFrequencyContent(video);
  const color = analyzeColorChannels(video);

  let score = 0;

  const t = Number(texture.textureScore);
  if (texture.isHighQuality && Number.isFinite(t)) score += 40;
  else if (Number.isFinite(t)) score += Math.max(0, (t / 15) * 40);

  const f = Number(frequency.frequencyScore);
  if (!frequency.hasArtificialPattern && Number.isFinite(f)) score += 30;
  else if (Number.isFinite(f)) score += Math.max(0, 30 - (f - 30) / 5);

  const c = Number(color.colorScore);
  if (color.isColorDistributed && Number.isFinite(c)) score += 30;
  else if (Number.isFinite(c)) score += Math.max(0, (c / 0.3) * 30);

  const finalScore = Number.isFinite(score) ? Math.round(Math.max(0, Math.min(100, score))) : 0;
  const isFace = finalScore > 70;

  return {
    isFace,
    score: finalScore,
    details: { texture, frequency, color }
  };
};

export const checkLiveness = (landmarkBuffer, centerBuffer) => {
  if (landmarkBuffer.length < 4 || centerBuffer.length < 4) {
    return { isAlive: false, reason: 'Not enough frames' };
  }

  const recentLandmarks = landmarkBuffer.slice(-8);

  let eyeMovement = 0;
  for (let i = 0; i < recentLandmarks.length; i++) {
    const eyeHeight = Math.abs(recentLandmarks[i].leftEye.y - recentLandmarks[i].rightEye.y);
    if (eyeHeight > 0.22) eyeMovement++;
  }
  const midEyeY = recentLandmarks.map(l => (l.leftEye.y + l.rightEye.y) / 2);
  const meanMidY = midEyeY.reduce((a, b) => a + b, 0) / midEyeY.length;
  const varMidY = midEyeY.reduce((a, b) => a + Math.pow(b - meanMidY, 2), 0) / midEyeY.length;
  if (Math.sqrt(varMidY) > 0.2) eyeMovement = Math.max(eyeMovement, 1);

  const centers = centerBuffer.slice(-8);
  const centersX = centers.map(c => c.x);
  const centersY = centers.map(c => c.y);
  const meanX = centersX.reduce((a, b) => a + b, 0) / centersX.length;
  const meanY = centersY.reduce((a, b) => a + b, 0) / centersY.length;
  const headVarX = centersX.reduce((a, b) => a + Math.pow(b - meanX, 2), 0) / centersX.length;
  const headVarY = centersY.reduce((a, b) => a + Math.pow(b - meanY, 2), 0) / centersY.length;
  const headMovement = Math.sqrt(headVarX) > 0.1 || Math.sqrt(headVarY) > 0.1;

  const isAlive = eyeMovement >= 1 || headMovement;

  return { isAlive, eyeMovement, headMovement };
};
