import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { getBisindoRuntime, predictBisindoLetter } from '../lib/ml/bisindoRuntime';

const DEFAULT_CLASSIFIER_BASE_PATH = '/ml-model';
const CONFIDENCE_THRESHOLD = 0.8;
const REQUIRED_STABLE_TICKS = 3;
const INFERENCE_INTERVAL_MS = 100;
const FEEDBACK_DELAY_MS = 900;

/**
 * P2-D: EMA smoothing factor for prediction probabilities.
 * 0.6 = current frame gets 60% weight, accumulated history gets 40%.
 * Reduces jitter between frames while keeping responsiveness.
 */
const EMA_ALPHA = 0.6;

/**
 * P1-D + P1-E: Optimized camera constraints.
 * 640×480 is sufficient for MediaPipe hand detection and reduces processing load.
 * Frame rate capped at 30fps max to avoid feeding unused frames.
 */
const CAMERA_CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: 'user',
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 15, max: 30 },
  },
};

function stopMediaStream(stream) {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach((track) => track.stop());
}

function getCameraErrorMessage(error) {
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'Browser ini tidak mendukung akses kamera.';
  }

  switch (error?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Izin kamera ditolak. Izinkan akses kamera lalu coba lagi.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Kamera tidak ditemukan di perangkat ini.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Kamera sedang dipakai aplikasi lain.';
    default:
      return error?.message || 'Kamera gagal diaktifkan.';
  }
}

function createEmptyVisionState() {
  return {
    handCount: 0,
    handLandmarks: [],
    handedness: [],
    inferenceCount: 0,
    lastVideoTime: 0,
    videoHeight: 0,
    videoReadyState: 0,
    videoWidth: 0,
  };
}

export function useBisindoPractice(targets, options = {}) {
  const classifierBasePath = options.classifierBasePath ?? DEFAULT_CLASSIFIER_BASE_PATH;
  const loopTargets = options.loopTargets ?? true;
  const moduleTitle = options.moduleTitle ?? 'modul ini';
  const videoRef = useRef(null);
  const runtimeRef = useRef(null);
  const animationFrameRef = useRef(0);
  const feedbackTimeoutRef = useRef(0);
  const mediaStreamRef = useRef(null);
  const sessionRef = useRef(0);
  const lastInferenceAtRef = useRef(0);
  const stableLabelRef = useRef(null);
  const stableTicksRef = useRef(0);
  const attemptLockedRef = useRef(false);
  const currentTargetRef = useRef('');
  const cameraStatusRef = useRef('off');
  const modelStatusRef = useRef('loading');
  const lastVideoTimeRef = useRef(-1);

  /**
   * P2-D: EMA accumulator for prediction probabilities.
   * Stores the smoothed probability vector between frames.
   */
  const emaProbRef = useRef(null);

  /**
   * P1-A: Refs for values that the overlay canvas needs but don't need
   * to trigger React re-renders on every inference frame.
   * We only push to state when values meaningfully change.
   */
  const handsDetectedRef = useRef(false);
  const predictionRef = useRef(null);
  const holdProgressRef = useRef(0);
  const feedbackStateRef = useRef('loading');
  const feedbackMessageRef = useRef('Memuat model AI...');
  const inferenceCountRef = useRef(0);

  const [backend, setBackend] = useState('');
  const [cameraStatus, setCameraStatus] = useState('off');
  const [modelStatus, setModelStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackState, setFeedbackState] = useState('loading');
  const [feedbackMessage, setFeedbackMessage] = useState('Memuat model AI...');
  const [handsDetected, setHandsDetected] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [prediction, setPrediction] = useState(null);
  const [currentSign, setCurrentSign] = useState(0);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [visionState, setVisionState] = useState(createEmptyVisionState);

  const currentTarget = targets[currentSign] ?? targets[0] ?? '';
  const cameraOn = cameraStatus === 'starting' || cameraStatus === 'live';
  const runtimeReady = modelStatus === 'ready' || modelStatus === 'guide';

  /**
   * P1-A: Flush ref values to React state in a single batch.
   * Called at most once per inference frame, reducing 3-6 separate
   * setState calls down to 1 batched update.
   */
  function flushToState() {
    setHandsDetected(handsDetectedRef.current);
    setPrediction(predictionRef.current);
    setHoldProgress(holdProgressRef.current);
    setFeedbackState(feedbackStateRef.current);
    setFeedbackMessage(feedbackMessageRef.current);
  }

  function clearFeedbackTimeout() {
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = 0;
    }
  }

  function resetStabilityWindow() {
    stableLabelRef.current = null;
    stableTicksRef.current = 0;
    holdProgressRef.current = 0;
    emaProbRef.current = null;
  }

  const stopLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
  }, []);

  const releaseCamera = useCallback(() => {
    stopLoop();
    stopMediaStream(mediaStreamRef.current);
    mediaStreamRef.current = null;

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }, [stopLoop]);

  function goToNextTarget() {
    startTransition(() => {
      setCurrentSign((previous) => {
        const nextIndex = previous + 1;
        if (loopTargets) {
          return nextIndex % targets.length;
        }

        return Math.min(nextIndex, Math.max(targets.length - 1, 0));
      });
    });
  }

  function setIdleFeedback(message) {
    feedbackStateRef.current = 'idle';
    feedbackMessageRef.current = message;
    setFeedbackState('idle');
    setFeedbackMessage(message);
  }

  function handleSuccessfulAttempt(result) {
    attemptLockedRef.current = true;
    resetStabilityWindow();
    setScore((previous) => previous + 1);
    setTotalAttempts((previous) => previous + 1);
    feedbackStateRef.current = 'success';
    feedbackMessageRef.current = `Bagus. Huruf ${result.label} terdeteksi dengan stabil.`;

    clearFeedbackTimeout();
    feedbackTimeoutRef.current = window.setTimeout(() => {
      attemptLockedRef.current = false;
      goToNextTarget();
    }, FEEDBACK_DELAY_MS);
  }

  function handleIncorrectAttempt(result) {
    attemptLockedRef.current = true;
    resetStabilityWindow();
    setTotalAttempts((previous) => previous + 1);
    feedbackStateRef.current = 'incorrect';
    feedbackMessageRef.current = `AI membaca ${result.label}. Targetnya masih ${currentTargetRef.current}.`;

    clearFeedbackTimeout();
    feedbackTimeoutRef.current = window.setTimeout(() => {
      attemptLockedRef.current = false;
      resetStabilityWindow();
      if (cameraStatusRef.current === 'live') {
        feedbackStateRef.current = 'tracking';
        feedbackMessageRef.current = `Coba lagi untuk huruf ${currentTargetRef.current}.`;
        flushToState();
      }
    }, FEEDBACK_DELAY_MS);
  }

  /**
   * P2-D: Apply EMA smoothing to prediction probabilities.
   * Returns smoothed prediction result.
   */
  function smoothPrediction(rawResult) {
    if (!rawResult || !rawResult.probabilities) {
      emaProbRef.current = null;
      return rawResult;
    }

    const rawProbs = rawResult.probabilities;
    let smoothed;

    if (emaProbRef.current && emaProbRef.current.length === rawProbs.length) {
      // EMA: smoothed = alpha * current + (1 - alpha) * previous
      smoothed = new Float32Array(rawProbs.length);
      for (let i = 0; i < rawProbs.length; i += 1) {
        smoothed[i] = EMA_ALPHA * rawProbs[i] + (1 - EMA_ALPHA) * emaProbRef.current[i];
      }
    } else {
      smoothed = rawProbs instanceof Float32Array ? rawProbs : Float32Array.from(rawProbs);
    }

    emaProbRef.current = smoothed;

    // Find argmax of smoothed probabilities
    let topIndex = 0;
    for (let i = 1; i < smoothed.length; i += 1) {
      if (smoothed[i] > smoothed[topIndex]) {
        topIndex = i;
      }
    }

    const runtime = runtimeRef.current;
    return {
      confidence: smoothed[topIndex] ?? 0,
      index: topIndex,
      label: runtime?.classes?.[topIndex] ?? rawResult.label ?? '?',
      probabilities: smoothed,
    };
  }

  function processPrediction(rawResult) {
    // P2-D: Smooth before processing
    const result = smoothPrediction(rawResult);

    handsDetectedRef.current = true;
    predictionRef.current = result;

    if (attemptLockedRef.current) {
      return;
    }

    if (result.confidence < CONFIDENCE_THRESHOLD) {
      resetStabilityWindow();
      feedbackStateRef.current = 'tracking';
      feedbackMessageRef.current =
        `AI membaca ${result.label} (${Math.round(result.confidence * 100)}%). Tahan isyarat lebih stabil.`;
      return;
    }

    if (stableLabelRef.current === result.label) {
      stableTicksRef.current += 1;
    } else {
      stableLabelRef.current = result.label;
      stableTicksRef.current = 1;
    }

    if (result.label === currentTargetRef.current) {
      holdProgressRef.current = Math.min(stableTicksRef.current / REQUIRED_STABLE_TICKS, 1);
      feedbackStateRef.current = 'tracking';
      feedbackMessageRef.current =
        stableTicksRef.current >= REQUIRED_STABLE_TICKS
          ? `Huruf ${result.label} sudah cocok.`
          : `Huruf ${result.label} cocok. Tahan ${REQUIRED_STABLE_TICKS - stableTicksRef.current} frame lagi.`;

      if (stableTicksRef.current >= REQUIRED_STABLE_TICKS) {
        handleSuccessfulAttempt(result);
      }
      return;
    }

    holdProgressRef.current = 0;
    feedbackStateRef.current = 'tracking';
    feedbackMessageRef.current =
      `AI membaca ${result.label} (${Math.round(result.confidence * 100)}%). Samakan dengan target ${currentTargetRef.current}.`;

    if (stableTicksRef.current >= REQUIRED_STABLE_TICKS) {
      handleIncorrectAttempt(result);
    }
  }

  function runInference(timestamp) {
    const runtime = runtimeRef.current;
    const video = videoRef.current;

    if (!runtime || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      if (video) {
        setVisionState((previous) => ({
          ...previous,
          lastVideoTime: video.currentTime,
          videoHeight: video.videoHeight,
          videoReadyState: video.readyState,
          videoWidth: video.videoWidth,
        }));
      }
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setVisionState((previous) => ({
        ...previous,
        lastVideoTime: video.currentTime,
        videoHeight: video.videoHeight,
        videoReadyState: video.readyState,
        videoWidth: video.videoWidth,
      }));
      return;
    }

    const result = runtime.handLandmarker.detectForVideo(video, timestamp);
    const handLandmarks = result.landmarks ?? result.handLandmarks ?? [];
    const handedness = (result.handedness ?? result.handednesses ?? []).map(
      (entries) => entries?.[0]?.categoryName ?? '?'
    );

    inferenceCountRef.current += 1;

    // P1-A: Update visionState (needed by overlay canvas) — single setState
    setVisionState({
      handCount: handLandmarks.length,
      handLandmarks,
      handedness,
      inferenceCount: inferenceCountRef.current,
      lastVideoTime: video.currentTime,
      videoHeight: video.videoHeight,
      videoReadyState: video.readyState,
      videoWidth: video.videoWidth,
    });

    if (handLandmarks.length === 0) {
      resetStabilityWindow();
      handsDetectedRef.current = false;
      predictionRef.current = null;
      emaProbRef.current = null;
      if (!attemptLockedRef.current) {
        feedbackStateRef.current = 'no-hands';
        feedbackMessageRef.current = `Target ${currentTargetRef.current}: arahkan tangan ke area kamera.`;
      }
      // P1-A: Single flush instead of multiple setState calls
      flushToState();
      return;
    }

    if (!runtime.hasClassifier) {
      handsDetectedRef.current = true;
      predictionRef.current = null;
      holdProgressRef.current = 0;
      if (!attemptLockedRef.current) {
        feedbackStateRef.current = 'tracking';
        feedbackMessageRef.current =
          `Tangan terdeteksi. Panduan landmark untuk ${moduleTitle} aktif, tetapi model AI modul ini belum tersedia.`;
      }
      flushToState();
      return;
    }

    processPrediction(predictBisindoLetter(runtime, handLandmarks));
    // P1-A: Single flush for all the ref changes made by processPrediction
    flushToState();
  }

  async function startCamera() {
    if (!runtimeRef.current || !runtimeReady) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('error');
      setFeedbackState('error');
      setFeedbackMessage('Browser ini tidak mendukung akses kamera.');
      return;
    }

    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    attemptLockedRef.current = false;
    resetStabilityWindow();
    clearFeedbackTimeout();
    predictionRef.current = null;
    handsDetectedRef.current = false;
    setErrorMessage('');
    setVisionState(createEmptyVisionState());
    setCameraStatus('starting');
    setFeedbackState('tracking');
    setFeedbackMessage('Menghubungkan kamera...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);

      if (sessionRef.current !== sessionId) {
        stopMediaStream(stream);
        return;
      }

      const video = videoRef.current;
      if (!video) {
        stopMediaStream(stream);
        throw new Error('Elemen video tidak tersedia.');
      }

      mediaStreamRef.current = stream;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      if (sessionRef.current !== sessionId) {
        stopMediaStream(stream);
        return;
      }

      setCameraStatus('live');
      setFeedbackState('tracking');
      setFeedbackMessage(
        runtimeRef.current?.hasClassifier
          ? `Target ${currentTarget}: tahan isyarat sampai AI yakin.`
          : `Kamera aktif. Gunakan overlay landmark untuk membentuk gerakan ${moduleTitle}.`
      );
      lastInferenceAtRef.current = 0;
      lastVideoTimeRef.current = -1;

      const loop = (timestamp) => {
        if (sessionRef.current !== sessionId) {
          return;
        }

        if (
          timestamp - lastInferenceAtRef.current >= INFERENCE_INTERVAL_MS
          && video.currentTime !== lastVideoTimeRef.current
        ) {
          lastInferenceAtRef.current = timestamp;
          lastVideoTimeRef.current = video.currentTime;
          try {
            runInference(timestamp);
          } catch (error) {
            console.error('Inference error:', error);
            stopCamera();
            setCameraStatus('error');
            setFeedbackState('error');
            setFeedbackMessage('AI gagal memproses webcam.');
          }
        }

        animationFrameRef.current = requestAnimationFrame(loop);
      };

      animationFrameRef.current = requestAnimationFrame(loop);
    } catch (error) {
      console.error('Camera start error:', error);
      releaseCamera();
      setCameraStatus('error');
      setFeedbackState('error');
      setFeedbackMessage(getCameraErrorMessage(error));
      setErrorMessage(getCameraErrorMessage(error));
    }
  }

  function stopCamera() {
    sessionRef.current += 1;
    attemptLockedRef.current = false;
    clearFeedbackTimeout();
    releaseCamera();
    lastVideoTimeRef.current = -1;
    resetStabilityWindow();
    predictionRef.current = null;
    handsDetectedRef.current = false;
    emaProbRef.current = null;
    setPrediction(null);
    setHandsDetected(false);
    setHoldProgress(0);
    setVisionState(createEmptyVisionState());
    setCameraStatus('off');

    if (modelStatusRef.current === 'ready') {
      setIdleFeedback('AI siap. Aktifkan kamera untuk mulai latihan.');
    } else if (modelStatusRef.current === 'guide') {
      setIdleFeedback(`Panduan MediaPipe siap. Aktifkan kamera untuk mulai belajar ${moduleTitle}.`);
    } else if (modelStatusRef.current === 'loading') {
      setFeedbackState('loading');
      setFeedbackMessage('Memuat model AI...');
    }
  }

  function toggleCamera() {
    if (cameraOn) {
      stopCamera();
      return;
    }

    void startCamera();
  }

  function resetPractice() {
    clearFeedbackTimeout();
    attemptLockedRef.current = false;
    resetStabilityWindow();
    predictionRef.current = null;
    handsDetectedRef.current = false;
    emaProbRef.current = null;
    setPrediction(null);
    setHandsDetected(false);
    setHoldProgress(0);
    setVisionState((previous) => ({
      ...previous,
      handCount: 0,
      handLandmarks: [],
      handedness: [],
    }));
    setScore(0);
    setTotalAttempts(0);
    startTransition(() => setCurrentSign(0));

    if (cameraStatus === 'live') {
      setFeedbackState('tracking');
      setFeedbackMessage(
        modelStatus === 'ready'
          ? `Target ${targets[0]}: tahan isyarat sampai AI yakin.`
          : `Kamera aktif. Gunakan overlay landmark untuk membentuk gerakan ${moduleTitle}.`
      );
    } else if (modelStatus === 'ready') {
      setIdleFeedback('Stat latihan direset. Aktifkan kamera untuk mulai lagi.');
    } else if (modelStatus === 'guide') {
      setIdleFeedback(`Panduan ${moduleTitle} direset. Aktifkan kamera untuk mulai lagi.`);
    }
  }

  function nextTarget() {
    clearFeedbackTimeout();
    attemptLockedRef.current = false;
    emaProbRef.current = null;
    startTransition(() => {
      setCurrentSign((previous) => {
        const nextIndex = previous + 1;
        if (loopTargets) {
          return nextIndex % targets.length;
        }

        return Math.min(nextIndex, Math.max(targets.length - 1, 0));
      });
    });
  }

  function prevTarget() {
    clearFeedbackTimeout();
    attemptLockedRef.current = false;
    emaProbRef.current = null;
    startTransition(() => {
      setCurrentSign((previous) => {
        if (loopTargets) {
          return (previous - 1 + targets.length) % targets.length;
        }

        return Math.max(previous - 1, 0);
      });
    });
  }

  useEffect(() => {
    currentTargetRef.current = currentTarget;
  }, [currentTarget]);

  useEffect(() => {
    cameraStatusRef.current = cameraStatus;
  }, [cameraStatus]);

  useEffect(() => {
    modelStatusRef.current = modelStatus;
  }, [modelStatus]);

  useEffect(() => {
    let cancelled = false;

    setModelStatus('loading');
    setFeedbackState('loading');
    setFeedbackMessage('Memuat model AI...');

    getBisindoRuntime(classifierBasePath)
      .then((runtime) => {
        if (cancelled) {
          return;
        }

        runtimeRef.current = runtime;
        setBackend(runtime.backend);
        setErrorMessage('');

        if (runtime.hasClassifier) {
          setModelStatus('ready');
          setIdleFeedback('AI siap. Aktifkan kamera untuk mulai latihan.');
          return;
        }

        setModelStatus('guide');
        setIdleFeedback(`Panduan MediaPipe siap. Aktifkan kamera untuk mulai belajar ${moduleTitle}.`);
      })
      .catch((error) => {
        console.error('Model init error:', error);
        if (cancelled) {
          return;
        }

        setModelStatus('error');
        setErrorMessage(error?.message || 'Model AI gagal dimuat.');
        setFeedbackState('error');
        setFeedbackMessage(error?.message || 'Model AI gagal dimuat.');
      });

    return () => {
      cancelled = true;
      sessionRef.current += 1;
      clearFeedbackTimeout();
      lastVideoTimeRef.current = -1;
      emaProbRef.current = null;
      setVisionState(createEmptyVisionState());
      releaseCamera();
    };
  }, [classifierBasePath, moduleTitle, releaseCamera]);

  useEffect(() => {
    clearFeedbackTimeout();
    attemptLockedRef.current = false;
    resetStabilityWindow();
    predictionRef.current = null;
    handsDetectedRef.current = false;
    setPrediction(null);
    setHandsDetected(false);
    setHoldProgress(0);

    if (cameraStatus === 'live') {
      setFeedbackState('tracking');
      setFeedbackMessage(
        modelStatus === 'ready'
          ? `Target ${currentTarget}: tahan isyarat sampai AI yakin.`
          : `Kamera aktif. Gunakan overlay landmark untuk membentuk gerakan ${moduleTitle}.`
      );
    }
  }, [cameraStatus, currentTarget, modelStatus, moduleTitle]);

  return {
    backend,
    cameraOn,
    cameraStatus,
    currentSign,
    currentTarget,
    errorMessage,
    feedbackMessage,
    feedbackState,
    handsDetected,
    holdProgress,
    modelStatus,
    prediction,
    prevTarget,
    nextTarget,
    resetPractice,
    score,
    supportsClassification: modelStatus === 'ready',
    toggleCamera,
    totalAttempts,
    videoRef,
    visionState,
  };
}
