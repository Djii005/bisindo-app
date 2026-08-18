import { useEffect, useRef, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import {
  Brain,
  Camera,
  CameraOff,
  Hand,
  ArrowLeft,
  Trash2,
} from 'lucide-react';
import {
  getWordsRuntime,
  pushFrame,
  predictWord,
  hasBodyDetected,
  resetSequenceBuffer,
} from '../lib/ml/bisindoWordsRuntime';
import { drawHolisticOverlay } from '../lib/ml/drawHandOverlay';
import './SelfPractice.css';

const CAMERA_CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: 'user',
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 15, max: 30 },
  },
};

const INFERENCE_INTERVAL_MS = 33; // 30 FPS to match dataset speed exactly
const CONFIDENCE_THRESHOLD = 0.70; // Individual frame confidence threshold
const REQUIRED_STABLE_TICKS = 35; // Matches required in the window (~1.15 seconds of dynamic movement)
const PREDICTION_WINDOW_SIZE = 50; // Sliding window of ~1.65 seconds (50 frames at 30 FPS)
const AVERAGE_CONFIDENCE_THRESHOLD = 0.75; // 75% average confidence required (70-80% average)
const COOLDOWN_DURATION_MS = 1200;

export default function SelfPractice() {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const runtimeRef = useRef(null);
  const animationFrameRef = useRef(0);
  const mediaStreamRef = useRef(null);
  const sessionRef = useRef(0);
  const predictionHistoryRef = useRef([]); // Stores last N predictions for sliding window analysis

  // Translation states
  const [cameraStatus, setCameraStatus] = useState('off');
  const [modelStatus, setModelStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [backend, setBackend] = useState('');

  // Live detection states
  const [prediction, setPrediction] = useState(null);
  const [handsDetected, setHandsDetected] = useState(false);
  const [stableTicks, setStableTicks] = useState(0);

  // Translation output states
  const [completedWords, setCompletedWords] = useState([]);

  // Cooldown / Timing states
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Refs for access in animation frame loop
  const stableLabelRef = useRef(null);
  const stableTicksRef = useRef(0);
  const cooldownEndRef = useRef(0);
  const lastInferenceAtRef = useRef(0);

  // Cooldown timer interval for visual countdown
  useEffect(() => {
    let interval;
    if (cooldownRemaining > 0) {
      interval = setInterval(() => {
        const remaining = Math.max(0, cooldownEndRef.current - Date.now());
        setCooldownRemaining(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 50);
    }
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  // Stop camera loop helper
  const stopLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
  };

  const releaseCamera = () => {
    stopLoop();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  };

  const handleBackspace = () => {
    setCompletedWords((prev) => prev.slice(0, -1));
    stableLabelRef.current = null;
    stableTicksRef.current = 0;
    predictionHistoryRef.current = [];
  };

  const handleClear = () => {
    setCompletedWords([]);
    stableLabelRef.current = null;
    stableTicksRef.current = 0;
    predictionHistoryRef.current = [];
    if (runtimeRef.current) resetSequenceBuffer(runtimeRef.current);
  };

  // Inference Core Loop
  const runInference = (timestamp) => {
    const runtime = runtimeRef.current;
    const video = videoRef.current;
    const canvas = overlayRef.current;

    if (!runtime || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    // Dynamic canvas resize
    if (canvas) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    // Use HolisticLandmarker
    const holisticResult = runtime.holisticLandmarker.detectForVideo(video, timestamp);

    // Draw holistic overlay
    if (canvas) {
      drawHolisticOverlay(canvas, holisticResult);
    }

    const now = Date.now();
    const bodyFound = hasBodyDetected(holisticResult);

    if (!bodyFound) {
      setHandsDetected(false);
      setPrediction(null);
      setStableTicks(0);
      stableTicksRef.current = 0;
      predictionHistoryRef.current = [];
      if (runtimeRef.current) resetSequenceBuffer(runtimeRef.current);
      return;
    }

    // Body detected
    setHandsDetected(true);

    // Push frame into sequence buffer for words model
    pushFrame(runtime, holisticResult);

    // If in cooldown, do not run predictions or stability checks
    if (now < cooldownEndRef.current) {
      setPrediction(null);
      setStableTicks(0);
      stableTicksRef.current = 0;
      stableLabelRef.current = null;
      return;
    }

    // Predict word
    const wordResult = predictWord(runtime);

    // Push prediction into sliding window
    predictionHistoryRef.current.push(wordResult);
    if (predictionHistoryRef.current.length > PREDICTION_WINDOW_SIZE) {
      predictionHistoryRef.current.shift();
    }

    // Count occurrences of each label in the window (only if confidence >= CONFIDENCE_THRESHOLD)
    const labelCounts = {};
    let maxLabel = null;
    let maxCount = 0;

    predictionHistoryRef.current.forEach((pred) => {
      if (pred && pred.confidence >= CONFIDENCE_THRESHOLD) {
        labelCounts[pred.label] = (labelCounts[pred.label] || 0) + 1;
        if (labelCounts[pred.label] > maxCount) {
          maxLabel = pred.label;
          maxCount = labelCounts[pred.label];
        }
      }
    });

    if (maxLabel && maxCount > 0) {
      // Calculate average confidence of matching frames for the dominant label
      const matchingPreds = predictionHistoryRef.current.filter(
        (pred) => pred && pred.label === maxLabel && pred.confidence >= CONFIDENCE_THRESHOLD
      );
      const avgConfidence =
        matchingPreds.reduce((sum, pred) => sum + pred.confidence, 0) /
        matchingPreds.length;

      // Show live prediction feedback and update progress bar
      setPrediction({ label: maxLabel, confidence: avgConfidence, type: 'word' });
      stableTicksRef.current = maxCount;
      setStableTicks(maxCount);

      // If stable (matches >= REQUIRED_STABLE_TICKS) and average confidence meets threshold
      if (maxCount >= REQUIRED_STABLE_TICKS && avgConfidence >= AVERAGE_CONFIDENCE_THRESHOLD) {
        setCompletedWords((prev) => [...prev, maxLabel]);

        // Lock with cooldown
        cooldownEndRef.current = now + COOLDOWN_DURATION_MS;
        setCooldownRemaining(COOLDOWN_DURATION_MS);

        // Clear sequence buffer so the same gesture doesn't linger in memory
        resetSequenceBuffer(runtime);

        // Reset sliding window and stability
        predictionHistoryRef.current = [];
        stableTicksRef.current = 0;
        setStableTicks(0);
        setPrediction(null);
      }
    } else {
      setPrediction(null);
      stableTicksRef.current = 0;
      setStableTicks(0);
    }
  };

  // Start Camera
  const startCamera = async () => {
    if (!runtimeRef.current || modelStatus !== 'ready') return;

    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    setErrorMessage('');
    setCameraStatus('starting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      if (sessionRef.current !== sessionId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error('Video element not ready.');
      }

      mediaStreamRef.current = stream;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      if (sessionRef.current !== sessionId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      setCameraStatus('live');
      lastInferenceAtRef.current = 0;

      const loop = (timestamp) => {
        if (sessionRef.current !== sessionId) return;

        if (timestamp - lastInferenceAtRef.current >= INFERENCE_INTERVAL_MS) {
          lastInferenceAtRef.current = timestamp;
          try {
            runInference(timestamp);
          } catch (err) {
            console.error(err);
            stopCamera();
            setCameraStatus('error');
            setErrorMessage('Gagal memproses webcam.');
          }
        }
        animationFrameRef.current = requestAnimationFrame(loop);
      };

      animationFrameRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.error(err);
      releaseCamera();
      setCameraStatus('error');
      setErrorMessage('Akses kamera ditolak atau sedang digunakan aplikasi lain.');
    }
  };

  const stopCamera = () => {
    sessionRef.current += 1;
    releaseCamera();
    setCameraStatus('off');
    setPrediction(null);
    setHandsDetected(false);
    setStableTicks(0);
    stableTicksRef.current = 0;
  };

  const toggleCamera = () => {
    if (cameraStatus === 'live') {
      stopCamera();
    } else {
      void startCamera();
    }
  };

  // Load model on mount
  useEffect(() => {
    let cancelled = false;
    setModelStatus('loading');

    getWordsRuntime()
      .then((runtime) => {
        if (cancelled) return;
        runtimeRef.current = runtime;
        setBackend(runtime.backend);
        setModelStatus('ready');
      })
      .catch((err) => {
        console.error('Words runtime failed to load:', err);
        if (cancelled) return;
        setModelStatus('error');
        setErrorMessage('Model AI gagal dimuat.');
      });

    return () => {
      cancelled = true;
      sessionRef.current += 1;
      releaseCamera();
    };
  }, []);

  const cooldownPercent = Math.min((cooldownRemaining / COOLDOWN_DURATION_MS) * 100, 100);

  return (
    <div className="self-practice-page">
      <div className="container">
        {/* Header */}
        <div className="practice-header">
          <h1 className="practice-title">
            Belajar <span className="gradient-text">Mandiri</span>
          </h1>
          <p className="practice-subtitle">
            Gunakan isyarat kata dan alfabet BISINDO untuk menerjemahkan gerakan tangan Anda menjadi teks.
          </p>
        </div>

        <div className="practice-grid">
          {/* Box 1: Big Camera Box */}
          <div className="camera-card card">
            <div className="camera-view">
              <video
                ref={videoRef}
                autoPlay
                className={`camera-feed ${cameraStatus === 'live' ? 'visible' : ''}`}
                muted
                playsInline
              />
              <canvas
                ref={overlayRef}
                className={`camera-overlay-canvas ${cameraStatus === 'live' ? 'visible' : ''}`}
              />

              {cameraStatus !== 'live' && (
                <div className="camera-inactive">
                  <div className="camera-icon-wrap">
                    <CameraOff size={48} />
                  </div>
                  <p className="camera-inactive-text">Kamera Belum Aktif</p>
                  <p className="camera-inactive-hint">
                    {errorMessage
                      ? errorMessage
                      : modelStatus === 'ready'
                      ? 'Aktifkan kamera untuk mulai menerjemahkan isyarat.'
                      : modelStatus === 'loading'
                      ? 'Memuat model AI (Kata)...'
                      : 'Model AI gagal dimuat.'}
                  </p>
                </div>
              )}

              {cameraStatus === 'live' && (
                <>

                  <div className="camera-top-badges">
                    <span className="camera-badge camera-badge-blue">
                      <Brain size={14} />
                      AI: {backend.toUpperCase()}
                    </span>
                    <span className={`camera-badge ${handsDetected ? 'camera-badge-emerald' : 'camera-badge-amber'}`}>
                      <Hand size={14} />
                      {handsDetected ? 'Tubuh terdeteksi' : 'Arahkan tangan'}
                    </span>
                    {prediction && (
                      <span className="camera-badge camera-badge-violet">
                        <Sparkles size={14} />
                        Kata
                      </span>
                    )}
                  </div>

                  {/* Cooldown Visual Ring */}
                  {cooldownRemaining > 0 && (
                    <div className="cooldown-overlay">
                      <svg className="cooldown-ring" viewBox="0 0 100 100">
                        <circle className="cooldown-ring-bg" cx="50" cy="50" r="45" />
                        <circle
                          className="cooldown-ring-fill"
                          cx="50"
                          cy="50"
                          r="45"
                          strokeDasharray={2 * Math.PI * 45}
                          strokeDashoffset={((100 - cooldownPercent) / 100) * (2 * Math.PI * 45)}
                        />
                      </svg>
                      <span className="cooldown-text">LOCKED</span>
                    </div>
                  )}

                  {/* Stable Progress Indicator */}
                  {handsDetected && prediction && cooldownRemaining === 0 && (
                    <div className="prediction-feedback-overlay">
                      <div className="pred-letter">{prediction.label}</div>
                      <div className="pred-stability-bar">
                        <div
                          className="pred-stability-fill"
                          style={{ width: `${(stableTicks / REQUIRED_STABLE_TICKS) * 100}%` }}
                        />
                      </div>
                      <div className="pred-caption">
                        Tahan posisi ({Math.round(prediction.confidence * 100)}%)
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="camera-controls">
              <button
                className={`btn ${cameraStatus === 'live' ? 'btn-ghost' : 'btn-primary'} btn-lg camera-toggle`}
                disabled={modelStatus !== 'ready'}
                onClick={toggleCamera}
                type="button"
              >
                {cameraStatus === 'live' ? <CameraOff size={20} /> : <Camera size={20} />}
                {modelStatus === 'loading'
                  ? 'Memuat AI...'
                  : cameraStatus === 'starting'
                  ? 'Menghubungkan Kamera'
                  : cameraStatus === 'live'
                  ? 'Matikan Kamera'
                  : 'Aktifkan Kamera'}
              </button>
            </div>
          </div>

          {/* Box 2: Translation Output */}
          <div className="translation-card card">
            <div className="translation-header">
              <h2>Hasil Terjemahan</h2>
            </div>

            <div className="translation-output-box">
              {completedWords.length === 0 ? (
                <span className="placeholder-text">Lakukan gerakan isyarat kata di depan kamera untuk menerjemahkan...</span>
              ) : (
                <div className="sentence-composer">
                  {completedWords.map((word, idx) => (
                    <span key={idx} className="word-token">
                      {word}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="translation-bottom-actions">
              <button
                className="btn btn-secondary btn-lg translation-action-btn"
                onClick={handleBackspace}
                type="button"
                disabled={completedWords.length === 0}
              >
                <ArrowLeft size={18} />
                Hapus
              </button>
              <button
                className="btn btn-ghost btn-rose btn-lg translation-action-btn"
                onClick={handleClear}
                type="button"
                disabled={completedWords.length === 0}
              >
                <Trash2 size={18} />
                Mulai Ulang
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
