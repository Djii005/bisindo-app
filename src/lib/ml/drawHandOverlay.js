export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

const HAND_COLORS = [
  { stroke: 'rgba(56, 189, 248, 0.95)', accent: 'rgba(191, 219, 254, 0.98)' },
  { stroke: 'rgba(16, 185, 129, 0.95)', accent: 'rgba(209, 250, 229, 0.98)' },
];

const WRIST_COLOR = 'rgba(251, 191, 36, 0.98)';
const WRIST_RADIUS = 6;
const JOINT_RADIUS = 4;
const TWO_PI = Math.PI * 2;

/**
 * Draw hand landmarks onto canvas.
 * P1-C: Batches all connections into a single Path2D per hand and sets
 * context properties once per hand instead of per-connection.
 */
export function drawHandOverlay(canvas, handLandmarks) {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);

  if (!handLandmarks || handLandmarks.length === 0) {
    return;
  }

  // Set shared properties once
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = 3;

  for (let handIndex = 0; handIndex < handLandmarks.length; handIndex += 1) {
    const hand = handLandmarks[handIndex];
    const colors = HAND_COLORS[handIndex] ?? HAND_COLORS[0];

    // Batch all connection lines into a single path per hand
    context.strokeStyle = colors.stroke;
    context.beginPath();

    for (let ci = 0; ci < HAND_CONNECTIONS.length; ci += 1) {
      const startLm = hand[HAND_CONNECTIONS[ci][0]];
      const endLm = hand[HAND_CONNECTIONS[ci][1]];

      if (!startLm || !endLm) {
        continue;
      }

      context.moveTo(startLm.x * width, startLm.y * height);
      context.lineTo(endLm.x * width, endLm.y * height);
    }

    context.stroke();

    // Draw joint dots — batch by color
    // Non-wrist joints first
    context.fillStyle = colors.accent;
    context.beginPath();
    for (let li = 1; li < hand.length; li += 1) {
      const lm = hand[li];
      context.moveTo(lm.x * width + JOINT_RADIUS, lm.y * height);
      context.arc(lm.x * width, lm.y * height, JOINT_RADIUS, 0, TWO_PI);
    }
    context.fill();

    // Wrist dot (index 0)
    if (hand[0]) {
      context.fillStyle = WRIST_COLOR;
      context.beginPath();
      context.arc(hand[0].x * width, hand[0].y * height, WRIST_RADIUS, 0, TWO_PI);
      context.fill();
    }
  }
}

// ── Holistic Overlay (Pose + Face + Hands) ──

const POSE_CONNECTIONS = [
  [11, 13], [13, 15], // Left arm
  [12, 14], [14, 16], // Right arm
  [11, 12],           // Shoulder bar
];
const FACE_KEY_INDICES = [0, 152, 33, 263, 13]; // nose, chin, L eye, R eye, mouth
const NUM_HAND_LM = 21;
const COL_CYAN = 'rgba(34, 211, 238, 0.9)';
const COL_YELLOW = 'rgba(250, 204, 21, 0.95)';
const COL_GREEN_L = 'rgba(52, 211, 153, 0.95)';
const COL_GREEN_R = 'rgba(16, 185, 129, 0.95)';

/**
 * Draw holistic skeleton overlay (pose, face, hands) on canvas.
 * Uses browser HolisticLandmarkerResult format (nested arrays).
 */
export function drawHolisticOverlay(canvas, holisticResult) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  if (!holisticResult) return;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Pose skeleton (cyan)
  const pose = holisticResult.poseLandmarks?.[0];
  if (pose && pose.length > 16) {
    ctx.strokeStyle = COL_CYAN;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const [a, b] of POSE_CONNECTIONS) {
      ctx.moveTo(pose[a].x * w, pose[a].y * h);
      ctx.lineTo(pose[b].x * w, pose[b].y * h);
    }
    ctx.stroke();

    // Pose joint dots
    ctx.fillStyle = COL_CYAN;
    ctx.beginPath();
    for (const idx of [11, 12, 13, 14, 15, 16]) {
      const p = pose[idx];
      ctx.moveTo(p.x * w + 5, p.y * h);
      ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  // 2. Face reference points (yellow)
  const face = holisticResult.faceLandmarks?.[0];
  if (face && face.length > 263) {
    ctx.fillStyle = COL_YELLOW;
    ctx.beginPath();
    for (const idx of FACE_KEY_INDICES) {
      const p = face[idx];
      ctx.moveTo(p.x * w + 3, p.y * h);
      ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  // 3. Hands (green)
  const handSets = [
    { lm: holisticResult.leftHandLandmarks?.[0], color: COL_GREEN_L },
    { lm: holisticResult.rightHandLandmarks?.[0], color: COL_GREEN_R },
  ];

  for (const { lm: hand, color } of handSets) {
    if (!hand || hand.length < NUM_HAND_LM) continue;

    // Connections
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const [a, b] of HAND_CONNECTIONS) {
      if (!hand[a] || !hand[b]) continue;
      ctx.moveTo(hand[a].x * w, hand[a].y * h);
      ctx.lineTo(hand[b].x * w, hand[b].y * h);
    }
    ctx.stroke();

    // Dots
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < hand.length; i++) {
      ctx.moveTo(hand[i].x * w + 4, hand[i].y * h);
      ctx.arc(hand[i].x * w, hand[i].y * h, 4, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

