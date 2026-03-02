import { FaceProfile, User } from "../models/pg/index.js";
import fs from 'fs';

/**
 * Simple Euclidean distance calculation
 * Both inputs must be arrays of 128 numbers
 */
function euclidean(a, b) {
  // Convert to arrays safely
  let arrA = a;
  let arrB = b;
  
  // If stored as JSONB in DB, ensure conversion to array
  if (!Array.isArray(a)) {
    if (typeof a === 'string') {
      arrA = JSON.parse(a);
    } else if (typeof a === 'object' && a !== null) {
      arrA = Object.values(a);
    } else {
      arrA = Array.from(a);
    }
  }
  
  if (!Array.isArray(b)) {
    if (typeof b === 'string') {
      arrB = JSON.parse(b);
    } else if (typeof b === 'object' && b !== null) {
      arrB = Object.values(b);
    } else {
      arrB = Array.from(b);
    }
  }
  
  // Validate
  if (!Array.isArray(arrA) || !Array.isArray(arrB)) {
    console.warn('⚠️ Warning: Embeddings could not be converted to arrays', {
      typeA: typeof a,
      typeB: typeof b,
      isAArray: Array.isArray(arrA),
      isBArray: Array.isArray(arrB)
    });
    return Infinity;
  }
  
  if (arrA.length === 0 || arrB.length === 0) {
    console.warn('⚠️ Warning: Empty embeddings array');
    return Infinity;
  }
  
  // Calculate euclidean distance
  let sumSquares = 0;
  const len = Math.min(arrA.length, arrB.length);
  
  for (let i = 0; i < len; i++) {
    const valA = Number(arrA[i]) || 0;
    const valB = Number(arrB[i]) || 0;
    const diff = valA - valB;
    sumSquares += diff * diff;
  }
  
  return Math.sqrt(sumSquares);
}

/**
 * Match a descriptor against all stored face profiles
 */
export async function matchDescriptor(descriptorOrList, threshold = 0.6) {
  try {
    const LOW = parseFloat(process.env.MATCH_THRESH_LOW || '0.25');
    const HIGH = parseFloat(process.env.MATCH_THRESH_HIGH || '0.32');
    const VAR_LIMIT = parseFloat(process.env.VARIANCE_LIMIT || '0.01');

    console.log(`\n📍 matchDescriptor called; thresholds low=${LOW}, high=${HIGH}, var_limit=${VAR_LIMIT}`);
    const isList = Array.isArray(descriptorOrList) && Array.isArray(descriptorOrList[0]);
    console.log(`   Input isList=${isList}`);
    let descriptors = [];
    if (isList) descriptors = descriptorOrList;
    else descriptors = [descriptorOrList];

    const profiles = await FaceProfile.findAll({
      include: [{ model: User, attributes: ['id', 'name', 'email', 'employeeCode', 'role'] }]
    });

    if (!profiles || profiles.length === 0) {
      console.log("❌ No face profiles found in database");
      return { matched: false, userId: null, detectedName: "Unknown (No profiles)", distance: Infinity, allProfiles: 0 };
    }

    console.log(`✅ Found ${profiles.length} stored profiles`);

    // Compute mean descriptor and variance across descriptors
    const dim = descriptors[0].length;
    const mean = new Array(dim).fill(0);
    for (const d of descriptors) {
      for (let i = 0; i < dim; i++) mean[i] += Number(d[i]) || 0;
    }
    for (let i = 0; i < dim; i++) mean[i] /= descriptors.length;

    const varPerDim = new Array(dim).fill(0);
    for (const d of descriptors) {
      for (let i = 0; i < dim; i++) {
        const diff = (Number(d[i]) || 0) - mean[i];
        varPerDim[i] += diff * diff;
      }
    }
    for (let i = 0; i < dim; i++) varPerDim[i] /= descriptors.length;
    const meanVariance = varPerDim.reduce((a,b)=>a+b,0)/dim;
    console.log(`   Mean variance across descriptors: ${meanVariance.toFixed(6)}`);

    if (meanVariance > VAR_LIMIT) {
      console.log(`   Variance ${meanVariance.toFixed(6)} > VAR_LIMIT ${VAR_LIMIT} => Mark Unknown`);
      return { matched: false, userId: null, detectedName: 'Unknown', distance: Infinity, allProfiles: profiles.length, topMatch: null, meanVariance };
    }

    let matched = null;
    let bestDistance = Infinity;
    const distances = [];

    for (const p of profiles) {
      if (!p.embeddings) { console.log(`   ⚠️ Profile ${p.id} (${p.User?.name}) has NO embeddings`); continue; }
      let embeddingsArray = p.embeddings;
      if (!Array.isArray(embeddingsArray)) {
        if (typeof embeddingsArray === 'object') embeddingsArray = Object.values(embeddingsArray);
      }
      if (!Array.isArray(embeddingsArray) || embeddingsArray.length === 0) { console.log(`   ⚠️ Profile ${p.id}: Invalid embeddings after conversion`); continue; }

      const dist = euclidean(mean, p.embeddings);
      const userName = p.User?.name || "Unknown";
      console.log(`   [${p.id}] ${userName.padEnd(15)} distance=${dist.toFixed(6)}`);
      distances.push({ userId: p.User?.id, name: userName, distance: dist });
      if (dist < bestDistance) { bestDistance = dist; matched = p; }
    }

    console.log(`📊 Best distance: ${bestDistance.toFixed(6)}`);
    if (bestDistance <= LOW) {
      const detectedName = matched.User?.name || "Unknown";
      console.log(`MATCH (LOW): ${detectedName} (distance: ${bestDistance.toFixed(6)} <= ${LOW})`);
      return { matched: true, userId: matched.User?.id || matched.userId, detectedName, distance: bestDistance, allProfiles: profiles.length };
    }
    // Treat uncertain zone (LOW, HIGH] as match so user can confirm and check-out; otherwise they get stuck on "RequireMoreFrames"
    if (bestDistance > LOW && bestDistance <= HIGH && matched) {
      const detectedName = matched.User?.name || "Unknown";
      console.log(`MATCH (HIGH/uncertain): ${detectedName} (distance: ${bestDistance.toFixed(6)} in (${LOW},${HIGH}) => allow confirm)`);
      return { matched: true, userId: matched.User?.id || matched.userId, detectedName, distance: bestDistance, allProfiles: profiles.length, softMatch: true };
    }

    console.log(`UNKNOWN: distance ${bestDistance.toFixed(6)} > ${HIGH} => Unknown`);
    // SVM/classifier fallback (optional): simple linear model from JSON
    const svmPath = process.env.SVM_MODEL_PATH || null;
    if (svmPath) {
      try {
        const model = JSON.parse(fs.readFileSync(svmPath, 'utf8'));
        if (model.weights && model.bias !== undefined) {
          let score = 0; for (let i=0;i<mean.length && i<model.weights.length;i++) score += mean[i]*model.weights[i];
          score += model.bias;
          console.log('SVM fallback score=', score);
          if (score > (model.threshold || 0)) {
            const detectedName = matched?.User?.name || 'Unknown';
            return { matched: true, userId: matched?.User?.id || null, detectedName, distance: bestDistance, allProfiles: profiles.length };
          }
        }
      } catch (e) {
        console.warn('SVM fallback failed to load or evaluate', e.message);
      }
    }

    return { matched: false, userId: null, detectedName: "Unknown", distance: bestDistance, allProfiles: profiles.length, topMatch: distances.length > 0 ? distances[0] : null, meanVariance };
  } catch (err) {
    console.error("Match error:", err);
    return { matched: false, userId: null, detectedName: "Error", distance: Infinity, error: err.message };
  }
}



