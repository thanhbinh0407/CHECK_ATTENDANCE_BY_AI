import fs from 'fs';
import { FaceProfile } from '../src/models/pg/index.js';

// Simple linear binary classifier trainer (logistic regression) to act
// as an optional fallback. This script uses stored profile embeddings as
// positive samples and generates synthetic negative samples.

const DIM = 128;

const sigmoid = (x) => 1 / (1 + Math.exp(-x));

const ensureArray = (emb) => {
  if (Array.isArray(emb)) return emb.map(Number);
  if (typeof emb === 'object') return Object.values(emb).map(Number);
  return null;
};

const randn = () => {
  // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

const train = async () => {
  console.log('Loading positive samples from DB...');
  const profiles = await FaceProfile.findAll();
  const positives = [];
  for (const p of profiles) {
    if (!p.embeddings) continue;
    const arr = ensureArray(p.embeddings);
    if (!arr || arr.length !== DIM) continue;
    positives.push(arr.map(Number));
  }

  if (positives.length === 0) {
    console.error('No positive embeddings found in DB. Aborting.');
    process.exit(1);
  }

  console.log(`Found ${positives.length} positive samples`);

  // Generate synthetic negatives (random gaussian) matched count
  const negatives = [];
  for (let i = 0; i < positives.length; i++) {
    const v = new Array(DIM).fill(0).map(() => randn()*0.6);
    negatives.push(v);
  }

  const X = positives.concat(negatives);
  const y = positives.map(()=>1).concat(negatives.map(()=>0));

  // initialize weights
  let weights = new Array(DIM).fill(0);
  let bias = 0;
  const lr = 0.15;
  const epochs = 600;

  for (let ep = 0; ep < epochs; ep++) {
    let loss = 0;
    for (let i = 0; i < X.length; i++) {
      const xi = X[i];
      let z = bias;
      for (let j = 0; j < DIM; j++) z += weights[j] * xi[j];
      const pred = sigmoid(z);
      const err = pred - y[i];
      loss += - (y[i]*Math.log(pred+1e-9) + (1-y[i])*Math.log(1-pred+1e-9));
      // gradient step
      for (let j = 0; j < DIM; j++) weights[j] -= lr * err * xi[j];
      bias -= lr * err;
    }
    if (ep % 50 === 0) console.log(`Epoch ${ep} loss=${(loss/X.length).toFixed(4)}`);
  }

  const model = { weights, bias, threshold: 0.5, createdAt: (new Date()).toISOString() };
  const outPath = './models/svm_model.json';
  try {
    fs.mkdirSync('./models', { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(model, null, 2));
    console.log('Model saved to', outPath);
  } catch (e) {
    console.error('Failed to save model:', e.message);
  }
};

train().then(()=>process.exit(0)).catch(err=>{console.error(err); process.exit(2);});
