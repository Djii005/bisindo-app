import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { loadLayersModel } from '@tensorflow/tfjs-layers';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const DEFAULT_MODEL_BASE_PATH = '/ml-model';
const FEATURE_COUNT = 126;
const MAX_HANDS = 2;
const LANDMARKS_PER_HAND = 21;
const COORDS_PER_LANDMARK = 3;

/**
 * Temperature for softmax calibration (P2-E).
 * Higher T → softer probabilities → fewer overconfident wrong predictions.
 */
const TEMPERATURE = 1.5;

const runtimePromises = new Map();

function getAssetUrl(basePath, path) {
  return new URL(`${basePath}/${path}`, window.location.origin).toString();
}

async function fetchJson(basePath, path) {
  const response = await fetch(getAssetUrl(basePath, path));

  if (!response.ok) {
    throw new Error(`Gagal memuat aset ML: ${path}`);
  }

  return response.json();
}

async function ensureBackend() {
  // P3-A: Try WebGL first; lazy-load CPU backend only as fallback
  try {
    const success = await tf.setBackend('webgl');
    if (success) {
      await tf.ready();
      return 'webgl';
    }
  } catch {
    // WebGL failed, fall through to CPU
  }

  try {
    await import('@tensorflow/tfjs-backend-cpu');
    const success = await tf.setBackend('cpu');
    if (success) {
      await tf.ready();
      return 'cpu';
    }
  } catch {
    // CPU also failed
  }

  throw new Error('TensorFlow.js backend tidak tersedia.');
}

function warmModel(model) {
  tf.tidy(() => {
    const input = tf.zeros([1, FEATURE_COUNT]);
    const prediction = model.predict(input);
    const output = Array.isArray(prediction) ? prediction[0] : prediction;
    output.dataSync();
  });
}

async function createRuntime(modelBasePath) {
  const runtimeBasePath = modelBasePath ?? DEFAULT_MODEL_BASE_PATH;
  const vision = await FilesetResolver.forVisionTasks(getAssetUrl(DEFAULT_MODEL_BASE_PATH, 'wasm'));
  const handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: getAssetUrl(DEFAULT_MODEL_BASE_PATH, 'hand_landmarker.task'),
    },
    runningMode: 'VIDEO',
    numHands: MAX_HANDS,
    minHandDetectionConfidence: 0.3,
    minHandPresenceConfidence: 0.3,
    minTrackingConfidence: 0.3,
  });

  // P1-B: Pre-allocate reusable buffers
  const featureBuffer = new Float32Array(FEATURE_COUNT);
  const normalizedBuffer = new Float32Array(FEATURE_COUNT);

  if (!modelBasePath) {
    return {
      backend: 'mediapipe',
      classes: [],
      featureBuffer,
      handLandmarker,
      hasClassifier: false,
      model: null,
      normalizedBuffer,
      normMin: null,
      normRange: null,
    };
  }

  const backend = await ensureBackend();
  const [model, normMin, normRange, rawClasses] = await Promise.all([
    loadLayersModel(getAssetUrl(runtimeBasePath, 'model.json')),
    fetchJson(runtimeBasePath, 'norm_min.json'),
    fetchJson(runtimeBasePath, 'norm_range.json'),
    fetchJson(runtimeBasePath, 'classes.json'),
  ]);

  const classes = Object.keys(rawClasses)
    .sort((left, right) => Number(left) - Number(right))
    .map((key) => rawClasses[key]);

  warmModel(model);

  return {
    backend,
    classes,
    featureBuffer,
    handLandmarker,
    hasClassifier: true,
    model,
    normalizedBuffer,
    normMin: Float32Array.from(normMin),
    normRange: Float32Array.from(normRange),
  };
}

export async function getBisindoRuntime(modelBasePath = DEFAULT_MODEL_BASE_PATH) {
  const cacheKey = modelBasePath ?? '__vision_only__';

  if (!runtimePromises.has(cacheKey)) {
    const runtimePromise = createRuntime(modelBasePath).catch((error) => {
      runtimePromises.delete(cacheKey);
      throw error;
    });

    runtimePromises.set(cacheKey, runtimePromise);
  }

  return runtimePromises.get(cacheKey);
}

/**
 * Fill feature vector in-place into the provided buffer (P1-B: zero-alloc).
 */
export function fillFeatureVector(buffer, handLandmarks = []) {
  buffer.fill(0);

  for (let handIndex = 0; handIndex < Math.min(handLandmarks.length, MAX_HANDS); handIndex += 1) {
    const hand = handLandmarks[handIndex];
    const handOffset = handIndex * LANDMARKS_PER_HAND * COORDS_PER_LANDMARK;

    for (let landmarkIndex = 0; landmarkIndex < Math.min(hand.length, LANDMARKS_PER_HAND); landmarkIndex += 1) {
      const landmark = hand[landmarkIndex];
      const featureOffset = handOffset + landmarkIndex * COORDS_PER_LANDMARK;
      buffer[featureOffset] = landmark.x;
      buffer[featureOffset + 1] = landmark.y;
      buffer[featureOffset + 2] = landmark.z;
    }
  }
}

/**
 * Normalize in-place: reads from `src`, writes into `dst` (P1-B: zero-alloc).
 */
export function normalizeInto(dst, src, normMin, normRange) {
  for (let index = 0; index < FEATURE_COUNT; index += 1) {
    const denominator = normRange[index] === 0 ? 1 : normRange[index];
    dst[index] = (src[index] - normMin[index]) / denominator;
  }
}

/**
 * Apply temperature scaling to raw probabilities (P2-E).
 * Divides log-probabilities by T then re-softmaxes.
 * For T > 1: makes distribution softer → fewer overconfident wrong predictions.
 */
function calibrateProbabilities(probabilities, temperature) {
  if (temperature === 1) {
    return probabilities;
  }

  // Convert to log-space, divide by T, re-exponentiate
  let maxLogit = -Infinity;
  const logits = new Float32Array(probabilities.length);
  for (let i = 0; i < probabilities.length; i += 1) {
    // Clamp to avoid log(0)
    logits[i] = Math.log(Math.max(probabilities[i], 1e-10)) / temperature;
    if (logits[i] > maxLogit) maxLogit = logits[i];
  }

  let sumExp = 0;
  for (let i = 0; i < logits.length; i += 1) {
    logits[i] = Math.exp(logits[i] - maxLogit);
    sumExp += logits[i];
  }

  for (let i = 0; i < logits.length; i += 1) {
    logits[i] /= sumExp;
  }

  return logits;
}

/**
 * Run prediction using pre-allocated buffers. Returns { label, confidence, index, probabilities }.
 */
export function predictBisindoSign(runtime, handLandmarks) {
  if (!runtime?.hasClassifier || !runtime.model || !runtime.normMin || !runtime.normRange) {
    return null;
  }

  fillFeatureVector(runtime.featureBuffer, handLandmarks);
  normalizeInto(runtime.normalizedBuffer, runtime.featureBuffer, runtime.normMin, runtime.normRange);

  const rawProbabilities = tf.tidy(() => {
    const input = tf.tensor2d(runtime.normalizedBuffer, [1, FEATURE_COUNT]);
    const prediction = runtime.model.predict(input);
    const output = Array.isArray(prediction) ? prediction[0] : prediction;
    return output.dataSync(); // Returns Float32Array — no Array.from needed
  });

  // P2-E: Apply temperature calibration
  const probabilities = calibrateProbabilities(rawProbabilities, TEMPERATURE);

  let topIndex = 0;
  for (let index = 1; index < probabilities.length; index += 1) {
    if (probabilities[index] > probabilities[topIndex]) {
      topIndex = index;
    }
  }

  return {
    confidence: probabilities[topIndex] ?? 0,
    index: topIndex,
    label: runtime.classes[topIndex] ?? '?',
    probabilities,
  };
}

export const predictBisindoLetter = predictBisindoSign;

// Legacy API — allocating versions kept for external callers
export function createFeatureVector(handLandmarks = []) {
  const features = new Float32Array(FEATURE_COUNT);
  fillFeatureVector(features, handLandmarks);
  return features;
}

export function normalizeFeatureVector(features, normMin, normRange) {
  const normalized = new Float32Array(FEATURE_COUNT);
  normalizeInto(normalized, features, normMin, normRange);
  return normalized;
}
