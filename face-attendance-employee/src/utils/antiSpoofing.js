/**
 * Advanced Anti-Spoofing Utilities
 * Detects: printed photos, screen attacks, video replay
 * Methods: Texture Analysis, Frequency Analysis, Color Channel Analysis
 */

// 1. Texture Analysis - Detect flat surfaces (printed photos)
export const analyzeTextureQuality = (video) => {
  if (!video || !video.videoWidth) return { isHighQuality: false, textureScore: 0 };
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = 64;
  canvas.height = 64;
  
  // Draw video frame (grayscale)
  ctx.filter = 'grayscale(1)';
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Laplacian edge detection - high in real skin, low in flat images
  let laplacianSum = 0;
  for (let i = 4; i < data.length - 4; i += 4) {
    const pixel = data[i];
    const neighbors = [
      data[i - 4],
      data[i + 4],
      data[i - canvas.width * 4],
      data[i + canvas.width * 4]
    ];
    const laplacian = Math.abs(4 * pixel - neighbors.reduce((a,b)=>a+b,0));
    laplacianSum += laplacian;
  }
  
  const textureScore = laplacianSum / (canvas.width * canvas.height);
  const isHighQuality = textureScore > 15;
  
  console.log(`[Texture] Score: ${textureScore.toFixed(2)}, Quality: ${isHighQuality ? 'GOOD' : 'LOW'}`);
  return { isHighQuality, textureScore };
};

// 2. Frequency Analysis - Detect artificial patterns (moiré, screening)
export const analyzeFrequencyContent = (video) => {
  if (!video || !video.videoWidth) return { hasArtificialPattern: false, frequencyScore: 0 };
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = 32;
  canvas.height = 32;
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  
  // High-frequency content detection
  let highFreq = 0;
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const idx = (y * canvas.width + x) * 4;
      const center = pixels[idx];
      const neighbors = [
        pixels[idx - 4], pixels[idx + 4],
        pixels[idx - canvas.width * 4], pixels[idx + canvas.width * 4]
      ];
      const diff = Math.abs(center - neighbors.reduce((a,b)=>a+b,0)/neighbors.length);
      highFreq += diff;
    }
  }
  
  const frequencyScore = highFreq / (canvas.width * canvas.height);
  const hasArtificialPattern = frequencyScore > 30;
  
  console.log(`[Frequency] Score: ${frequencyScore.toFixed(2)}, Artificial: ${hasArtificialPattern ? 'YES' : 'NO'}`);
  return { hasArtificialPattern, frequencyScore };
};

// 3. Color Channel Analysis - Detect screen/print artifacts
export const analyzeColorChannels = (video) => {
  if (!video || !video.videoWidth) return { isColorDistributed: false, colorScore: 0 };
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = 32;
  canvas.height = 32;
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // RGB distribution analysis
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
  
  // Calculate variance
  let rVar = 0, gVar = 0, bVar = 0;
  for (let i = 0; i < data.length; i += 4) {
    rVar += Math.pow(data[i] - rMean, 2);
    gVar += Math.pow(data[i + 1] - gMean, 2);
    bVar += Math.pow(data[i + 2] - bMean, 2);
  }
  
  const colorScore = (Math.sqrt(rVar) + Math.sqrt(gVar) + Math.sqrt(bVar)) / 3 / pixelCount;
  const isColorDistributed = colorScore > 0.3;
  
  console.log(`[Color] Score: ${colorScore.toFixed(3)}, Balanced: ${isColorDistributed ? 'YES' : 'NO'}`);
  return { isColorDistributed, colorScore };
};

// 4. Combined Anti-Spoofing Score (0-100)
export const calculateAntiSpoofingScore = (video) => {
  if (!video) return { isFace: false, score: 0, details: {} };
  
  const texture = analyzeTextureQuality(video);
  const frequency = analyzeFrequencyContent(video);
  const color = analyzeColorChannels(video);
  
  let score = 0;
  
  // Texture: max 40 points
  if (texture.isHighQuality) score += 40;
  else score += Math.max(0, (texture.textureScore / 15) * 40);
  
  // Frequency: max 30 points
  if (!frequency.hasArtificialPattern) score += 30;
  else score += Math.max(0, 30 - (frequency.frequencyScore - 30) / 5);
  
  // Color: max 30 points
  if (color.isColorDistributed) score += 30;
  else score += Math.max(0, (color.colorScore / 0.3) * 30);
  
  // Threshold: > 70 = real face, < 70 = suspicious
  const isFace = score > 70;
  
  console.log(`[AntiSpoofing] TOTAL SCORE: ${score.toFixed(0)}/100, Result: ${isFace ? 'REAL FACE ✓' : 'SUSPICIOUS ✗'}`);
  
  return { 
    isFace, 
    score: Math.round(score), 
    details: { texture, frequency, color } 
  };
};

// 5. Liveness Detection - Check for blink + head movement
export const checkLiveness = (landmarkBuffer, centerBuffer) => {
  if (landmarkBuffer.length < 5 || centerBuffer.length < 5) {
    return { isAlive: false, reason: 'Not enough frames' };
  }
  
  const recentLandmarks = landmarkBuffer.slice(-5);
  
  // Check for eye movement (blink proxy)
  let eyeMovement = 0;
  for (let i = 0; i < recentLandmarks.length; i++) {
    const eyeHeight = Math.abs(recentLandmarks[i].leftEye.y - recentLandmarks[i].rightEye.y);
    if (eyeHeight > 0.5) eyeMovement++;
  }
  
  // Check for head movement
  const centersX = centerBuffer.slice(-5).map(c => c.x);
  const meanX = centersX.reduce((a,b)=>a+b,0) / centersX.length;
  const headVar = centersX.reduce((a,b)=>a+Math.pow(b-meanX,2),0) / centersX.length;
  const headMovement = Math.sqrt(headVar) > 0.3;
  
  const isAlive = eyeMovement >= 1 || headMovement;
  
  console.log(`[Liveness] Blinks: ${eyeMovement}, HeadMove: ${headMovement}, Result: ${isAlive ? 'ALIVE ✓' : 'STATIC ✗'}`);
  
  return { isAlive, eyeMovement, headMovement };
};
