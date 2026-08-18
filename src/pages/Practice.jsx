import { useEffect, useRef } from 'react';
import { motion as Motion } from 'framer-motion';
import {
  Brain,
  Camera,
  CameraOff,
  ChevronLeft,
  ChevronRight,
  Hand,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useBisindoPractice } from '../hooks/useBisindoPractice';
import { drawHandOverlay } from '../lib/ml/drawHandOverlay';
import './Practice.css';

const practiceTargets = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function getModelLabel(modelStatus, backend) {
  if (modelStatus === 'loading') {
    return 'Memuat model';
  }

  if (modelStatus === 'error') {
    return 'AI bermasalah';
  }

  if (modelStatus === 'guide') {
    return 'Panduan MediaPipe';
  }

  return backend ? `AI siap (${backend.toUpperCase()})` : 'AI siap';
}



export default function Practice() {
  const overlayRef = useRef(null);
  const {
    backend,
    cameraOn,
    cameraStatus,
    currentSign,
    currentTarget,
    handsDetected,
    modelStatus,
    prediction,
    prevTarget,
    nextTarget,
    resetPractice,
    toggleCamera,
    videoRef,
    visionState,
  } = useBisindoPractice(practiceTargets);

  const confidencePercent = prediction ? Math.round(prediction.confidence * 100) : 0;
  const toggleDisabled = modelStatus !== 'ready' && modelStatus !== 'guide';

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) {
      return;
    }

    const width = visionState.videoWidth || videoRef.current?.videoWidth || 1280;
    const height = visionState.videoHeight || videoRef.current?.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    if (!cameraOn) {
      drawHandOverlay(canvas, []);
      return;
    }

    drawHandOverlay(canvas, visionState.handLandmarks);
  }, [cameraOn, videoRef, visionState.handLandmarks, visionState.videoHeight, visionState.videoWidth]);

  return (
    <div className="practice-page">
      <div className="container">
        <Motion.div
          className="practice-header"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <h1 className="practice-title">
            Mode <span className="gradient-text">Latihan</span>
          </h1>
          <p className="practice-subtitle">
            Praktikkan gerakan isyarat dengan feedback real-time dari AI browser-side.
          </p>
        </Motion.div>

        <div className="practice-layout">
          <Motion.div
            className="practice-camera-section"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <div className={`camera-view ${cameraOn ? 'camera-live' : ''}`}>
              <video
                ref={videoRef}
                autoPlay
                className={`camera-feed ${cameraOn ? 'visible' : ''}`}
                muted
                playsInline
              />
              <canvas
                ref={overlayRef}
                className={`camera-overlay-canvas ${cameraOn ? 'visible' : ''}`}
              />

              {cameraOn && <div className="camera-gradient" />}

              {!cameraOn && (
                <div className="camera-inactive">
                  <div className="camera-icon-wrap">
                    <CameraOff size={48} />
                  </div>
                  <p className="camera-inactive-text">Kamera belum aktif</p>
                  <p className="camera-inactive-hint">
                    {modelStatus === 'ready'
                      ? 'Aktifkan kamera untuk mulai latihan alfabet BISINDO'
                      : 'Menunggu model AI siap digunakan'}
                  </p>
                </div>
              )}

              {cameraOn && (
                <>
                  <div className="camera-overlay-corners">
                    <span className="corner corner-tl"></span>
                    <span className="corner corner-tr"></span>
                    <span className="corner corner-bl"></span>
                    <span className="corner corner-br"></span>
                  </div>

                  <div className="camera-status-live">
                    <span className="live-dot"></span>
                    LIVE
                  </div>

                  <div className="camera-top-badges">
                    <span className={`camera-badge ${modelStatus === 'ready' ? 'camera-badge-blue' : 'camera-badge-rose'}`}>
                      <Brain size={14} />
                      {getModelLabel(modelStatus, backend)}
                    </span>
                    <span className={`camera-badge ${handsDetected ? 'camera-badge-emerald' : 'camera-badge-amber'}`}>
                      <Hand size={14} />
                      {handsDetected ? 'Tangan terdeteksi' : 'Belum ada tangan'}
                    </span>
                  </div>

                  <div className="camera-prediction-panel">
                    <div className="camera-prediction-head">
                      <span>Prediksi AI</span>
                      <strong>{prediction?.label ?? '--'}</strong>
                    </div>
                    <div className="camera-confidence-row">
                      <span>Confidence</span>
                      <span>{confidencePercent}%</span>
                    </div>
                    <div className="progress-bar practice-progress-bar">
                      <div
                        className="progress-bar-fill practice-progress-fill"
                        style={{ width: `${confidencePercent}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="camera-controls">
              <button
                className={`btn ${cameraOn ? 'btn-ghost' : 'btn-primary'} btn-lg camera-toggle`}
                disabled={toggleDisabled}
                onClick={toggleCamera}
                type="button"
              >
                {cameraOn ? <CameraOff size={20} /> : <Camera size={20} />}
                {modelStatus === 'loading'
                  ? 'Memuat AI...'
                  : cameraStatus === 'starting'
                    ? 'Menghubungkan Kamera'
                    : cameraOn
                      ? 'Matikan Kamera'
                      : 'Aktifkan Kamera'}
              </button>
              <button
                className="btn btn-ghost btn-icon"
                onClick={resetPractice}
                title="Reset latihan"
                type="button"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </Motion.div>

          <Motion.div
            className="practice-controls"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <div className="card target-card">
              <div className="target-header">
                <h3>Isyarat Target</h3>
                <div className="target-nav">
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={prevTarget} type="button">
                    <ChevronLeft size={18} />
                  </button>
                  <span className="target-counter">
                    {currentSign + 1} / {practiceTargets.length}
                  </span>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={nextTarget} type="button">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <div className="target-display">
                <Motion.div
                  key={currentSign}
                  animate={{ scale: 1, opacity: 1 }}
                  className="target-letter"
                  initial={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {currentTarget}
                </Motion.div>
                <p className="target-label">
                  Huruf &quot;{currentTarget}&quot; dalam BISINDO
                </p>
              </div>

              <div className="target-hint-box">
                <Sparkles size={16} />
                <span>Tahan posisi tangan hingga AI yakin membaca huruf yang sama.</span>
              </div>
            </div>
          </Motion.div>
        </div>
      </div>
    </div>
  );
}
