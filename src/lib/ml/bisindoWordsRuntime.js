/**
 * BISINDO Words Runtime (Holistic Detection)
 * ==========================================
 * Uses HolisticLandmarker (head, shoulders, arms, hands) for rich body pose detection.
 * Loads and runs the words BiLSTM sequence model.
 */

import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { loadLayersModel } from '@tensorflow/tfjs-layers';
import { FilesetResolver, HolisticLandmarker } from '@mediapipe/tasks-vision';

// ── Paths ──
const WASM_BASE = '/ml-model/wasm';
const HOLISTIC_MODEL = '/ml-model/holistic_landmarker.task';
const WORDS_MODEL_PATH = '/ml-model-words';

// ── Feature Constants (must match Python holistic_detector.py) ──
const NUM_HAND_LANDMARKS = 21;
const NUM_COORDS = 3;
const HOLISTIC_FEATURE_COUNT = 167;
const SEQ_LENGTH = 60;

// Pose key indices (shoulders, elbows, wrists)
const POSE_INDICES = [11, 12, 13, 14, 15, 16];
// Face key indices (nose, chin, left eye outer, right eye outer, mouth center)
const FACE_INDICES = [0, 152, 33, 263, 13];

const TEMPERATURE = 1.3;

let cachedRuntime = null;

function getUrl(path) {
  return new URL(path, window.location.origin).toString();
}

async function fetchJson(path) {
  const res = await fetch(getUrl(path));
  if (!res.ok) throw new Error(`Failed to load: ${path}`);
  return res.json();
}

async function ensureBackend() {
  try {
    if (await tf.setBackend('webgl')) { await tf.ready(); return 'webgl'; }
  } catch { /* fall through */ }
  try {
    await import('@tensorflow/tfjs-backend-cpu');
    if (await tf.setBackend('cpu')) { await tf.ready(); return 'cpu'; }
  } catch { /* fall through */ }
  throw new Error('TensorFlow.js backend not available');
}

// ── Holistic Feature Extraction (mirrors Python holistic_detector.py) ──

function vecNorm(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Extract 167-dim feature vector from browser HolisticLandmarkerResult.
 * Browser result uses nested arrays: faceLandmarks[0], poseLandmarks[0], etc.
 */
export function extractHolisticFeatures(result) {
  const features = new Float32Array(HOLISTIC_FEATURE_COUNT);
  let offset = 0;

  // 1. Left Hand (21 * 3 = 63 features, wrist-relative)
  const leftHand = result.leftHandLandmarks?.[0];
  if (leftHand && leftHand.length >= NUM_HAND_LANDMARKS) {
    const wrist = [leftHand[0].x, leftHand[0].y, leftHand[0].z];
    for (let i = 0; i < NUM_HAND_LANDMARKS; i++) {
      features[offset++] = leftHand[i].x - wrist[0];
      features[offset++] = leftHand[i].y - wrist[1];
      features[offset++] = leftHand[i].z - wrist[2];
    }
  } else {
    offset += NUM_HAND_LANDMARKS * NUM_COORDS; // 63 zeros
  }

  // 2. Right Hand (21 * 3 = 63 features, wrist-relative)
  const rightHand = result.rightHandLandmarks?.[0];
  if (rightHand && rightHand.length >= NUM_HAND_LANDMARKS) {
    const wrist = [rightHand[0].x, rightHand[0].y, rightHand[0].z];
    for (let i = 0; i < NUM_HAND_LANDMARKS; i++) {
      features[offset++] = rightHand[i].x - wrist[0];
      features[offset++] = rightHand[i].y - wrist[1];
      features[offset++] = rightHand[i].z - wrist[2];
    }
  } else {
    offset += NUM_HAND_LANDMARKS * NUM_COORDS; // 63 zeros
  }

  // 3. Pose (6 keypoints * 3 = 18 features, shoulder-midpoint-relative)
  const pose = result.poseLandmarks?.[0];
  let rawLWrist = null, rawRWrist = null;
  let rawLShoulder = null, rawRShoulder = null;

  if (pose && pose.length > 16) {
    const lShld = [pose[11].x, pose[11].y, pose[11].z];
    const rShld = [pose[12].x, pose[12].y, pose[12].z];
    const mid = [(lShld[0] + rShld[0]) / 2, (lShld[1] + rShld[1]) / 2, (lShld[2] + rShld[2]) / 2];

    rawLShoulder = lShld;
    rawRShoulder = rShld;
    rawLWrist = [pose[15].x, pose[15].y, pose[15].z];
    rawRWrist = [pose[16].x, pose[16].y, pose[16].z];

    for (const idx of POSE_INDICES) {
      features[offset++] = pose[idx].x - mid[0];
      features[offset++] = pose[idx].y - mid[1];
      features[offset++] = pose[idx].z - mid[2];
    }
  } else {
    offset += POSE_INDICES.length * NUM_COORDS; // 18 zeros
  }

  // 4. Face (5 keypoints * 3 = 15 features, nose-relative)
  const face = result.faceLandmarks?.[0];
  let rawChin = null, rawNose = null, rawMouth = null;

  if (face && face.length > 263) {
    rawNose = [face[0].x, face[0].y, face[0].z];
    rawChin = [face[152].x, face[152].y, face[152].z];
    rawMouth = [face[13].x, face[13].y, face[13].z];

    for (const idx of FACE_INDICES) {
      features[offset++] = face[idx].x - rawNose[0];
      features[offset++] = face[idx].y - rawNose[1];
      features[offset++] = face[idx].z - rawNose[2];
    }
  } else {
    offset += FACE_INDICES.length * NUM_COORDS; // 15 zeros
  }

  // 5. Relative Distances (8 features)
  // Left wrist → L shoulder, R shoulder, chin, mouth
  if (rawLWrist) {
    if (rawLShoulder) { features[offset++] = vecNorm(rawLWrist, rawLShoulder); } else offset++;
    if (rawRShoulder) { features[offset++] = vecNorm(rawLWrist, rawRShoulder); } else offset++;
    if (rawChin) { features[offset++] = vecNorm(rawLWrist, rawChin); } else offset++;
    if (rawMouth) { features[offset++] = vecNorm(rawLWrist, rawMouth); } else offset++;
  } else {
    offset += 4;
  }
  // Right wrist → L shoulder, R shoulder, chin, mouth
  if (rawRWrist) {
    if (rawLShoulder) { features[offset++] = vecNorm(rawRWrist, rawLShoulder); } else offset++;
    if (rawRShoulder) { features[offset++] = vecNorm(rawRWrist, rawRShoulder); } else offset++;
    if (rawChin) { features[offset++] = vecNorm(rawRWrist, rawChin); } else offset++;
    if (rawMouth) { features[offset++] = vecNorm(rawRWrist, rawMouth); } else offset++;
  } else {
    offset += 4;
  }

  return features;
}

// ── Normalize ──

function normalizeInto(dst, src, normMin, normRange) {
  for (let i = 0; i < src.length; i++) {
    const denom = normRange[i] === 0 ? 1 : normRange[i];
    dst[i] = (src[i] - normMin[i]) / denom;
  }
}

// ── Temperature Calibration ──

function calibrate(probs, T) {
  if (T === 1) return probs;
  const logits = new Float32Array(probs.length);
  let maxL = -Infinity;
  for (let i = 0; i < probs.length; i++) {
    logits[i] = Math.log(Math.max(probs[i], 1e-10)) / T;
    if (logits[i] > maxL) maxL = logits[i];
  }
  let sumExp = 0;
  for (let i = 0; i < logits.length; i++) {
    logits[i] = Math.exp(logits[i] - maxL);
    sumExp += logits[i];
  }
  for (let i = 0; i < logits.length; i++) logits[i] /= sumExp;
  return logits;
}

function topResult(probs, classes) {
  let topIdx = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[topIdx]) topIdx = i;
  }
  return {
    label: classes[topIdx] ?? '?',
    confidence: probs[topIdx] ?? 0,
    index: topIdx,
    probabilities: probs,
  };
}

// ── Runtime Creation ──

async function createWordsRuntime() {
  const backend = await ensureBackend();
  const vision = await FilesetResolver.forVisionTasks(getUrl(WASM_BASE));

  const holisticLandmarker = await HolisticLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: getUrl(HOLISTIC_MODEL) },
    runningMode: 'VIDEO',
    minPoseDetectionConfidence: 0.3,
    minPosePresenceConfidence: 0.3,
    minHandLandmarksConfidence: 0.3,
  });

  const [wordsModel, wordsNormMin, wordsNormRange, wordsClasses] = await Promise.all([
    loadLayersModel(getUrl(`${WORDS_MODEL_PATH}/model.json`)),
    fetchJson(`${WORDS_MODEL_PATH}/norm_min.json`),
    fetchJson(`${WORDS_MODEL_PATH}/norm_range.json`),
    fetchJson(`${WORDS_MODEL_PATH}/classes.json`),
  ]);

  const wordClassList = Object.keys(wordsClasses).sort((a, b) => +a - +b).map(k => wordsClasses[k]);

  // Warm model so the first real prediction isn't hit by shader/kernel compilation
  tf.tidy(() => {
    wordsModel.predict(tf.zeros([1, SEQ_LENGTH, HOLISTIC_FEATURE_COUNT])).dataSync();
  });

  return {
    backend,
    holisticLandmarker,
    // Words model
    wordsModel,
    wordsNormMin: Float32Array.from(wordsNormMin),
    wordsNormRange: Float32Array.from(wordsNormRange),
    wordsClasses: wordClassList,
    // Buffers
    sequenceBuffer: new Array(SEQ_LENGTH).fill(null).map(() => new Float32Array(HOLISTIC_FEATURE_COUNT)),
    sequenceIndex: 0,
    sequenceFilled: false,
  };
}

export async function getWordsRuntime() {
  if (!cachedRuntime) {
    cachedRuntime = createWordsRuntime().catch(err => {
      cachedRuntime = null;
      throw err;
    });
  }
  return cachedRuntime;
}

// ── Sequence Buffer Management ──

export function pushFrame(runtime, holisticResult) {
  const features = extractHolisticFeatures(holisticResult);

  // Normalize
  const normalized = new Float32Array(HOLISTIC_FEATURE_COUNT);
  normalizeInto(normalized, features, runtime.wordsNormMin, runtime.wordsNormRange);

  // Write into circular buffer
  runtime.sequenceBuffer[runtime.sequenceIndex].set(normalized);
  runtime.sequenceIndex = (runtime.sequenceIndex + 1) % SEQ_LENGTH;
  if (runtime.sequenceIndex === 0) runtime.sequenceFilled = true;
}

export function resetSequenceBuffer(runtime) {
  runtime.sequenceIndex = 0;
  runtime.sequenceFilled = false;
  for (const buf of runtime.sequenceBuffer) buf.fill(0);
}

// ── Word Prediction (BiLSTM on 60-frame sequence) ──

export function predictWord(runtime) {
  if (!runtime.sequenceFilled && runtime.sequenceIndex < SEQ_LENGTH * 0.5) {
    return null; // Not enough frames
  }

  // Build ordered sequence from circular buffer
  const startIdx = runtime.sequenceFilled ? runtime.sequenceIndex : 0;
  const seqData = new Float32Array(SEQ_LENGTH * HOLISTIC_FEATURE_COUNT);

  for (let i = 0; i < SEQ_LENGTH; i++) {
    const bufIdx = (startIdx + i) % SEQ_LENGTH;
    seqData.set(runtime.sequenceBuffer[bufIdx], i * HOLISTIC_FEATURE_COUNT);
  }

  const rawProbs = tf.tidy(() => {
    const input = tf.tensor3d(seqData, [1, SEQ_LENGTH, HOLISTIC_FEATURE_COUNT]);
    const pred = runtime.wordsModel.predict(input);
    const out = Array.isArray(pred) ? pred[0] : pred;
    return out.dataSync();
  });

  const probs = calibrate(rawProbs, TEMPERATURE);
  return topResult(probs, runtime.wordsClasses);
}

// ── Detection Helpers ──

export function hasBodyDetected(holisticResult) {
  return (
    (holisticResult.leftHandLandmarks?.[0]?.length > 0) ||
    (holisticResult.rightHandLandmarks?.[0]?.length > 0)
  );
}
