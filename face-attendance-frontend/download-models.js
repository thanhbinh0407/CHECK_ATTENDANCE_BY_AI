/**
 * Script to download and fix face-api.js models
 * Run this in public/models directory
 */

/* eslint-env node */
import https from 'https';
import fs from 'fs';
import path from 'path';

const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model/';

const models = [
  { 
    name: 'tiny_face_detector_model',
    files: ['tiny_face_detector_model-shard1', 'tiny_face_detector_model-weights_manifest.json']
  },
  { 
    name: 'face_landmark_68_model',
    files: ['face_landmark_68_model-shard1', 'face_landmark_68_model-weights_manifest.json']
  },
  { 
    name: 'face_recognition_model',
    files: ['face_recognition_model-shard1', 'face_recognition_model-weights_manifest.json']
  }
];

async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const file = fs.createWriteStream(filepath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${filepath}`);
        resolve();
      });
    }).on('error', reject);
  });
}

async function downloadModels() {
  const modelsDir = path.join(process.cwd(), 'public', 'models');
  
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
    console.log('Created models directory');
  }

  for (const model of models) {
    for (const file of model.files) {
      const url = MODELS_URL + file;
      const filepath = path.join(modelsDir, file);
      
      if (!fs.existsSync(filepath)) {
        try {
          console.log(`Downloading: ${file}...`);
          await downloadFile(url, filepath);
        } catch (err) {
          console.error(`Failed to download ${file}:`, err.message);
        }
      } else {
        console.log(`✓ Already exists: ${file}`);
      }
    }
  }

  console.log('\nAll models ready!');
}

downloadModels().catch(console.error);
