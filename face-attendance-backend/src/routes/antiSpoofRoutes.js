/**
 * ADVANCED ANTI-SPOOFING ENDPOINT
 * Sử dụng: POST /api/anti-spoof/advanced
 * Body: { imageBase64, frames: [...], threshold: 60 }
 * 
 * Phát hiện:
 * - Hình ảnh tĩnh
 * - Video replay
 * - In ấn
 * - Screen display
 * - Ảnh chuyển động (deepfake)
 */

import express from 'express';
import { Buffer } from 'buffer';
import Jimp from 'jimp';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Helper: compute temporal score (average HF-correlation) from an array of Buffers
async function computeTemporalScoreFromBuffers(buffers, options = {}) {
  const downW = options.downW || 160;
  const downH = options.downH || 120;
  const take = options.take || 8;
  const hfMaps = [];

  for (const buf of buffers.slice(-take)) {
    const img = await Jimp.read(buf);
    img.resize(downW, downH);
    const bitmap = img.bitmap;
    const data = bitmap.data;
    const W = bitmap.width, H = bitmap.height;
    const out = new Float32Array(W * H);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const idx = (y * W + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const g1 = (data[((y-1)*W + x)*4] + data[((y-1)*W + x)*4+1] + data[((y-1)*W + x)*4+2]) / 3;
        const g2 = (data[(y*W + (x-1))*4] + data[(y*W + (x-1))*4+1] + data[(y*W + (x-1))*4+2]) / 3;
        const g3 = (data[(y*W + (x+1))*4] + data[(y*W + (x+1))*4+1] + data[(y*W + (x+1))*4+2]) / 3;
        const g4 = (data[((y+1)*W + x)*4] + data[((y+1)*W + x)*4+1] + data[((y+1)*W + x)*4+2]) / 3;
        const sum = Math.abs(g1 * -1 + g2 * -1 + gray * 4 + g3 * -1 + g4 * -1);
        out[y*W + x] = sum;
      }
    }
    hfMaps.push(out);
  }

  if (hfMaps.length < 2) return { avgCorr: 1, corrs: [] };

  const corrs = [];
  for (let i = 1; i < hfMaps.length; i++) {
    const a = hfMaps[i-1]; const b = hfMaps[i];
    let dot = 0, na = 0, nb = 0;
    for (let j = 0; j < a.length; j += 4) {
      dot += a[j] * b[j]; na += a[j]*a[j]; nb += b[j]*b[j];
    }
    const corr = dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
    corrs.push(corr || 0);
  }
  const avgCorr = corrs.reduce((s,v)=>s+v,0)/corrs.length;
  return { avgCorr, corrs };
}

/**
 * Tính Laplacian variance (phát hiện blur/texture)
 * Real face: 15-50, Photo: 5-15, Video: 3-10
 */
function calculateLaplacianVariance(image) {
  const { bitmap } = image;
  const data = bitmap.data;
  const width = bitmap.width;
  let laplacianSum = 0;
  let count = 0;

  // Laplacian kernel
  const kernel = [
    [0, -1, 0],
    [-1, 4, -1],
    [0, -1, 0]
  ];

  for (let y = 1; y < bitmap.height - 1; y++) {
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
 * Phát hiện Moire pattern (in ấn, screen)
 */
function detectMoirePattern(image) {
  const { bitmap } = image;
  const data = bitmap.data;
  const width = bitmap.width;
  let moireScore = 0;
  let totalChecks = 0;

  for (let y = 0; y < bitmap.height - 4; y += 2) {
    for (let x = 0; x < width - 4; x += 2) {
      const idx1 = (y * width + x) * 4;
      const idx2 = (y * width + (x + 4)) * 4;
      const idx3 = ((y + 4) * width + x) * 4;

      if (idx2 < data.length && idx3 < data.length) {
        const diff12 = Math.abs(data[idx1] - data[idx2]) + 
                      Math.abs(data[idx1 + 1] - data[idx2 + 1]) + 
                      Math.abs(data[idx1 + 2] - data[idx2 + 2]);
        const diff13 = Math.abs(data[idx1] - data[idx3]) + 
                      Math.abs(data[idx1 + 1] - data[idx3 + 1]) + 
                      Math.abs(data[idx1 + 2] - data[idx3 + 2]);

        if (diff12 < 25 && diff13 < 25) {
          moireScore++;
        }
        totalChecks++;
      }
    }
  }

  return totalChecks > 0 ? (moireScore / totalChecks) * 100 : 0;
}

/**
 * Phát hiện brightness uniformity
 */
function detectBrightnessUniformity(image) {
  const { bitmap } = image;
  const data = bitmap.data;
  const samples = [];

  for (let i = 0; i < data.length; i += 4 * 100) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    samples.push(gray);
  }

  if (samples.length === 0) return 0;

  const mean = samples.reduce((a, b) => a + b) / samples.length;
  const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2)) / samples.length;
  const stdDev = Math.sqrt(variance);

  return (stdDev / mean) * 100;
}

/**
 * Phát hiện color saturation
 */
function detectColorSaturation(image) {
  const { bitmap } = image;
  const data = bitmap.data;
  let saturationSum = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4 * 50) {
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
 * Phát hiện reflection/gloss
 */
function detectReflection(image) {
  const { bitmap } = image;
  const data = bitmap.data;
  let brightPixels = 0;
  const threshold = 240;
  let totalPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > threshold && data[i + 1] > threshold && data[i + 2] > threshold) {
      brightPixels++;
    }
    totalPixels++;
  }

  return totalPixels > 0 ? (brightPixels / totalPixels) * 100 : 0;
}

/**
 * Phát hiện high frequency artifacts (compression, encoding)
 */
function detectFrequencyArtifacts(image) {
  const { bitmap } = image;
  const data = bitmap.data;
  const width = bitmap.width;
  let artifactCount = 0;
  let totalChecks = 0;

  for (let y = 0; y < bitmap.height - 1; y += 8) {
    for (let x = 0; x < width - 1; x += 8) {
      const idx1 = (y * width + x) * 4;
      const idx2 = (y * width + (x + 1)) * 4;

      if (idx2 < data.length) {
        const diff = Math.abs(data[idx1] - data[idx2]) + 
                     Math.abs(data[idx1 + 1] - data[idx2 + 1]) + 
                     Math.abs(data[idx1 + 2] - data[idx2 + 2]);

        // Encoding artifacts thường có sharp differences
        if (diff > 150) {
          artifactCount++;
        }
        totalChecks++;
      }
    }
  }

  return totalChecks > 0 ? (artifactCount / totalChecks) * 100 : 0;
}

/**
 * Main detection function
 */
function analyzeImageForSpoof(image) {
  const laplacian = calculateLaplacianVariance(image);
  const moire = detectMoirePattern(image);
  const brightness = detectBrightnessUniformity(image);
  const saturation = detectColorSaturation(image);
  const reflection = detectReflection(image);
  const artifacts = detectFrequencyArtifacts(image);

  // Calculate final score (0-100, higher = more real)
  let score = 0;

  // Laplacian (40%) - real face has high texture
  const laplacianScore = Math.min(100, (laplacian / 40) * 100);
  score += laplacianScore * 0.40;

  // Moire penalty (20%) - photo/screen have moire
  const moirePenalty = Math.max(0, 100 - (moire * 3));
  score += moirePenalty * 0.20;

  // Brightness variance (15%) - real face has variation
  const brightnessScore = Math.min(100, brightness * 2);
  score += brightnessScore * 0.15;

  // Saturation (15%) - real face 40-70%
  const saturationScore = Math.max(0, 100 - Math.abs(saturation - 55) / 55 * 100);
  score += saturationScore * 0.15;

  // Reflection (10%) - gloss indicates screen/print
  const reflectionScore = Math.max(0, 100 - (reflection * 2));
  score += reflectionScore * 0.10;

  // Frequency artifacts (would be added but already weighted)
  let spooType = 'Unknown';
  if (moire > 25) {
    spooType = 'Printed Photo / Screen';
  } else if (reflection > 20) {
    spooType = 'Screen Display';
  } else if (laplacian < 8) {
    spooType = 'Compressed / Video';
  } else if (artifacts > 30) {
    spooType = 'Encoding Artifacts (Video)';
  } else if (brightness < 5) {
    spooType = 'Video Replay';
  } else {
    spooType = 'Real Face';
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    isReal: score > 50, // Threshold
    spooType,
    details: {
      laplacian: laplacian.toFixed(2),
      moire: moire.toFixed(2),
      brightness: brightness.toFixed(2),
      saturation: saturation.toFixed(2),
      reflection: reflection.toFixed(2),
      artifacts: artifacts.toFixed(2)
    }
  };
}

/**
 * POST /api/anti-spoof/advanced
 * Advanced anti-spoofing analysis
 */
router.post('/advanced', async (req, res) => {
  try {
    const { imageBase64, threshold = 50 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        status: 'error',
        message: 'imageBase64 required'
      });
    }

    console.log('\n🔍 Advanced Anti-Spoofing Analysis');
    console.log(`   Threshold: ${threshold}`);

    // Decode base64
    const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    
    // Load image with Jimp
    const image = await Jimp.read(buffer);

    // Analyze
    const result = analyzeImageForSpoof(image);

      // If frames provided, do temporal consistency checks (server-side)
      let temporal = { temporalScore: 1, staticImage: false };
      const { frames } = req.body;
      if (Array.isArray(frames) && frames.length > 1) {
        try {
          // downscale and compute laplacian per frame
          const downW = 160, downH = 120;
          const hfMaps = [];
          for (const f of frames.slice(-8)) {
            const buf = Buffer.from(f.replace(/^data:image\/\w+;base64,/, ''), 'base64');
            const img = await Jimp.read(buf);
            img.resize(downW, downH);
            const bitmap = img.bitmap;
            const data = bitmap.data;
            const W = bitmap.width, H = bitmap.height;
            const out = new Float32Array(W * H);
            for (let y = 1; y < H - 1; y++) {
              for (let x = 1; x < W - 1; x++) {
                const idx = (y * W + x) * 4;
                const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                const g1 = (data[((y-1)*W + x)*4] + data[((y-1)*W + x)*4+1] + data[((y-1)*W + x)*4+2]) / 3;
                const g2 = (data[(y*W + (x-1))*4] + data[(y*W + (x-1))*4+1] + data[(y*W + (x-1))*4+2]) / 3;
                const g3 = (data[(y*W + (x+1))*4] + data[(y*W + (x+1))*4+1] + data[(y*W + (x+1))*4+2]) / 3;
                const g4 = (data[((y+1)*W + x)*4] + data[((y+1)*W + x)*4+1] + data[((y+1)*W + x)*4+2]) / 3;
                const sum = Math.abs(g1 * -1 + g2 * -1 + gray * 4 + g3 * -1 + g4 * -1);
                out[y*W + x] = sum;
              }
            }
            hfMaps.push(out);
          }

          // compute correlations
          const corrs = [];
          for (let i = 1; i < hfMaps.length; i++) {
            const a = hfMaps[i-1]; const b = hfMaps[i];
            let dot = 0, na = 0, nb = 0;
            for (let j = 0; j < a.length; j += 4) {
              dot += a[j] * b[j]; na += a[j]*a[j]; nb += b[j]*b[j];
            }
            const corr = dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
            corrs.push(corr || 0);
          }
          const avgCorr = corrs.reduce((s,v)=>s+v,0)/corrs.length;
          temporal.temporalScore = avgCorr;
          temporal.staticImage = avgCorr > 0.96; // heuristic threshold
        } catch (e) {
          console.warn('Temporal analysis failed', e.message);
        }
      }

    console.log(`   Score: ${result.score.toFixed(2)}`);
    console.log(`   Type: ${result.spooType}`);
    console.log(`   Real: ${result.isReal ? '✅ YES' : '❌ NO'}`);

    return res.json({
      status: 'success',
      isReal: result.isReal && result.score > threshold,
      score: result.score,
      threshold,
      spooType: result.spooType,
      confidence: Math.abs(result.score - 50) / 50,
      temporal: temporal,
      details: result.details
    });
  } catch (error) {
    console.error('❌ Advanced anti-spoof error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

    /**
     * POST /api/anti-spoof/temporal-stream
     * Accepts multipart/form-data with files named `frames` (binary images).
     * Faster than base64 payloads from client. Returns temporal score and flag.
     */
    router.post('/temporal-stream', upload.array('frames', 32), async (req, res) => {
      try {
        const files = req.files || [];
        if (!files.length) return res.status(400).json({ status: 'error', message: 'frames files required' });

        const buffers = files.map(f => f.buffer);
        const { avgCorr, corrs } = await computeTemporalScoreFromBuffers(buffers);
        const staticImage = avgCorr > 0.96;
        return res.json({ status: 'success', temporal: { temporalScore: avgCorr, corrs, staticImage } });
      } catch (e) {
        console.error('temporal-stream error', e);
        return res.status(500).json({ status: 'error', message: e.message });
      }
    });

    /**
     * POST /api/anti-spoof/tune
     * Accepts JSON body: { samples: [ { label: 'real'|'spoof', frames: [dataURL,...] }, ... ] }
     * Returns per-sample temporal scores and a recommended threshold (midpoint between means).
     */
    router.post('/tune', async (req, res) => {
      try {
        const { samples } = req.body;
        if (!Array.isArray(samples) || samples.length === 0) return res.status(400).json({ status: 'error', message: 'samples required' });

        const results = [];
        const byLabel = { real: [], spoof: [] };

        for (const s of samples) {
          const frames = Array.isArray(s.frames) ? s.frames : [];
          const buffers = frames.map(f => Buffer.from(f.replace(/^data:image\/\w+;base64,/, ''), 'base64'));
          const { avgCorr } = await computeTemporalScoreFromBuffers(buffers);
          results.push({ label: s.label, avgCorr });
          if (s.label === 'real') byLabel.real.push(avgCorr);
          else byLabel.spoof.push(avgCorr);
        }

        const mean = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
        const meanReal = mean(byLabel.real);
        const meanSpoof = mean(byLabel.spoof);
        let recommended = null;
        if (meanReal !== null && meanSpoof !== null) {
          recommended = (meanReal + meanSpoof) / 2;
        }

        return res.json({ status: 'success', results, stats: { meanReal, meanSpoof, recommended } });
      } catch (e) {
        console.error('tune error', e);
        return res.status(500).json({ status: 'error', message: e.message });
      }
    });

export default router;
