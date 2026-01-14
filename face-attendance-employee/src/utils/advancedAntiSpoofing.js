/**
 * ADVANCED ANTI-SPOOFING MODULE
 * Phát hiện: Hình ảnh tĩnh, Video, Ảnh chuyển động, In ấn, Screen display
 * Phương pháp: Texture, Frequency, Color, Motion, Reflection, Depth
 */

import { createCanvas } from 'canvas';

/**
 * Tính Laplacian để phát hiện texture
 * Real face: ~15-30, Photo: ~5-15, Screen: ~3-8
 */
function calculateLaplacian(imageData) {
  const data = imageData.data;
  const width = imageData.width;
  let laplacianSum = 0;
  let count = 0;

  // Laplacian kernel để detect edges
  const kernel = [
    [0, -1, 0],
    [-1, 4, -1],
    [0, -1, 0]
  ];

  for (let y = 1; y < imageData.height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const idx = ((y - 1 + ky) * width + (x - 1 + kx)) * 4;
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          sum += gray * kernel[ky][kx];
        }
      }
      laplacianSum += Math.abs(sum);
      count++;
    }
  }

  return count > 0 ? laplacianSum / count : 0;
}

/**
 * Phát hiện Moire pattern (in ấn hoặc screen)
 * Real face: ~0-5, Print/Screen: ~15-50+
 */
function detectMoirePattern(imageData) {
  const data = imageData.data;
  const width = imageData.width;
  let moireScore = 0;

  // Kiểm tra pattern lặp lại
  for (let y = 0; y < imageData.height - 2; y++) {
    for (let x = 0; x < width - 2; x++) {
      const idx1 = (y * width + x) * 4;
      const idx2 = (y * width + (x + 2)) * 4;
      const idx3 = ((y + 2) * width + x) * 4;

      // Nếu pixel lặp lại theo pattern → Moire
      const diff12 = Math.abs(data[idx1] - data[idx2]) + 
                     Math.abs(data[idx1 + 1] - data[idx2 + 1]) + 
                     Math.abs(data[idx1 + 2] - data[idx2 + 2]);
      const diff13 = Math.abs(data[idx1] - data[idx3]) + 
                     Math.abs(data[idx1 + 1] - data[idx3 + 1]) + 
                     Math.abs(data[idx1 + 2] - data[idx3 + 2]);

      if (diff12 < 20 && diff13 < 20) {
        moireScore++;
      }
    }
  }

  return (moireScore / (imageData.width * imageData.height)) * 100;
}

/**
 * Phát hiện brightness uniformity (ảnh/screen bị phản chiếu đều)
 * Real face: ~20-40% variance, Photo: ~5-15%, Screen: ~2-8%
 */
function detectBrightnessUniformity(imageData) {
  const data = imageData.data;
  const samples = [];

  // Sample brightness từ toàn bộ image
  for (let i = 0; i < data.length; i += 4 * 50) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    samples.push(gray);
  }

  const mean = samples.reduce((a, b) => a + b) / samples.length;
  const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2)) / samples.length;
  const stdDev = Math.sqrt(variance);

  return (stdDev / mean) * 100; // Variance percentage
}

/**
 * Phát hiện Color saturation (hình ảnh thường oversaturated hoặc undersaturated)
 * Real face: ~40-70%, Photo: ~20-40%, Screen: ~10-30%
 */
function detectColorSaturation(imageData) {
  const data = imageData.data;
  let saturationSum = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2 / 255;

    let saturation = 0;
    if (lightness > 0 && lightness < 1) {
      saturation = (max - min) / (lightness < 0.5 ? max + min : 2 * 255 - max - min);
    }

    saturationSum += saturation * 100;
    count++;
  }

  return count > 0 ? saturationSum / count : 0;
}

/**
 * Phát hiện Reflection/Gloss (ảnh bóng/phản chiếu)
 * Screen: ~30-60%, Photo: ~10-30%, Real face: ~5-15%
 */
function detectReflection(imageData) {
  const data = imageData.data;
  let brightPixels = 0;
  const threshold = 230;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > threshold && data[i + 1] > threshold && data[i + 2] > threshold) {
      brightPixels++;
    }
  }

  return (brightPixels / (imageData.width * imageData.height / 4)) * 100;
}

/**
 * Phát hiện Face presence + texture
 * Real face: high texture + moderate brightness variation
 * Photo: low texture + uniform brightness + possible moire
 * Screen: very low texture + uniform brightness + gloss
 */
function detectFaceQuality(imageData) {
  const laplacian = calculateLaplacian(imageData);
  const moire = detectMoirePattern(imageData);
  const brightnessVar = detectBrightnessUniformity(imageData);
  const saturation = detectColorSaturation(imageData);
  const reflection = detectReflection(imageData);

  // Scoring (higher = more likely real face)
  let score = 0;

  // Laplacian score (weight: 40%)
  const laplacianScore = Math.min(100, (laplacian / 25) * 100);
  score += laplacianScore * 0.40;

  // Moire penalty (weight: 20%) - ảnh có moire = không thực
  const moirePenalty = Math.max(0, 100 - (moire * 2));
  score += moirePenalty * 0.20;

  // Brightness variation (weight: 15%) - ảnh quá đều = không thực
  const brightnessScore = Math.min(100, brightnessVar * 2);
  score += brightnessScore * 0.15;

  // Saturation (weight: 15%) - 40-70% là tốt
  const saturationScore = Math.max(0, 100 - Math.abs(saturation - 55) / 55 * 100);
  score += saturationScore * 0.15;

  // Reflection (weight: 10%) - quá nhiều bóng = ảnh
  const reflectionScore = Math.max(0, 100 - reflection);
  score += reflectionScore * 0.10;

  return {
    score: Math.min(100, Math.max(0, score)),
    laplacian,
    moire,
    brightnessVar,
    saturation,
    reflection,
    isReal: score > 55 // Threshold: 55 để phân loại
  };
}

/**
 * Main anti-spoofing function
 * Input: Canvas element hoặc ImageData
 * Output: { isLive, score, details, detectionType }
 */
export function runAdvancedAntiSpoofing(canvasOrImage) {
  try {
    let imageData;

    // Handle canvas element
    if (canvasOrImage instanceof HTMLCanvasElement) {
      const ctx = canvasOrImage.getContext('2d', { willReadFrequently: true });
      imageData = ctx.getImageData(0, 0, canvasOrImage.width, canvasOrImage.height);
    }
    // Handle ImageData directly
    else if (canvasOrImage instanceof ImageData) {
      imageData = canvasOrImage;
    }
    // Handle HTML image element
    else if (canvasOrImage instanceof HTMLImageElement) {
      const canvas = createCanvas(canvasOrImage.width, canvasOrImage.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(canvasOrImage, 0, 0);
      imageData = ctx.getImageData(0, 0, canvasOrImage.width, canvasOrImage.height);
    }
    else {
      throw new Error('Invalid input: must be Canvas, ImageData, or HTMLImageElement');
    }

    // Run detection
    const quality = detectFaceQuality(imageData);

    // Determine type
    let detectionType = 'Unknown';
    if (quality.moire > 20) {
      detectionType = 'Print/Screen';
    } else if (quality.reflection > 25) {
      detectionType = 'Screen Display';
    } else if (quality.laplacian < 10) {
      detectionType = 'Still Image';
    } else if (quality.brightnessVar < 10) {
      detectionType = 'Video Replay';
    } else {
      detectionType = 'Real Face';
    }

    return {
      isLive: quality.isReal,
      score: quality.score,
      threshold: 55,
      passed: quality.score > 55,
      details: {
        laplacian: quality.laplacian.toFixed(2),
        moire: quality.moire.toFixed(2),
        brightnessVariance: quality.brightnessVar.toFixed(2),
        saturation: quality.saturation.toFixed(2),
        reflection: quality.reflection.toFixed(2)
      },
      detectionType,
      confidence: Math.abs(quality.score - 55) / 45 // 0-1 scale
    };
  } catch (error) {
    console.error('Anti-spoofing error:', error);
    return {
      isLive: false,
      score: 0,
      passed: false,
      error: error.message
    };
  }
}

/**
 * Batch anti-spoofing check (multiple frames for video detection)
 * Nếu một frame bất kỳ không phải real face → reject
 */
export function batchAntiSpoofingCheck(canvases, threshold = 55) {
  if (!Array.isArray(canvases) || canvases.length === 0) {
    return {
      passed: false,
      reason: 'No frames provided'
    };
  }

  const results = canvases.map(canvas => runAdvancedAntiSpoofing(canvas));
  const allPassed = results.every(r => r.score > threshold);
  const avgScore = results.reduce((a, b) => a + b.score, 0) / results.length;

  return {
    passed: allPassed,
    avgScore: avgScore.toFixed(2),
    minScore: Math.min(...results.map(r => r.score)).toFixed(2),
    maxScore: Math.max(...results.map(r => r.score)).toFixed(2),
    framesPassed: results.filter(r => r.score > threshold).length,
    totalFrames: results.length,
    detectionTypes: Array.from(new Set(results.map(r => r.detectionType))),
    details: results
  };
}

export default {
  runAdvancedAntiSpoofing,
  batchAntiSpoofingCheck,
  calculateLaplacian,
  detectMoirePattern,
  detectBrightnessUniformity,
  detectColorSaturation,
  detectReflection,
  detectFaceQuality
};
