import { useEffect, useRef } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import {
  ArrowLeft,
  Brain,
  Camera,
  CameraOff,
  ChevronLeft,
  ChevronRight,
  Hand,
  LayoutTemplate,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useBisindoPractice } from '../hooks/useBisindoPractice';
import { getLearningModule } from '../lib/learningModules';
import { drawHandOverlay } from '../lib/ml/drawHandOverlay';
import { moduleIcons } from '../lib/moduleIcons';
import './LearnSession.css';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

function getStatusLabel(modelStatus, supportsClassification, backend) {
  if (modelStatus === 'loading') {
    return 'Memuat workspace';
  }

  if (modelStatus === 'error') {
    return 'Workspace bermasalah';
  }

  if (!supportsClassification) {
    return 'Landmark guide aktif';
  }

  return backend ? `AI siap (${backend.toUpperCase()})` : 'AI siap';
}

function getSessionTone(modelStatus, supportsClassification) {
  if (modelStatus === 'error') {
    return 'rose';
  }

  if (modelStatus === 'loading') {
    return 'slate';
  }

  return supportsClassification ? 'blue' : 'amber';
}

export default function LearnSession() {
  const { moduleId } = useParams();
  const module = getLearningModule(moduleId);
  const safeModule = module ?? {
    classifierBasePath: null,
    iconKey: 'hand',
    locked: true,
    subtitle: '',
    targetLabel: 'Target',
    targets: [],
    title: 'Workspace',
  };
  const overlayRef = useRef(null);
  const ModuleIcon = moduleIcons[safeModule.iconKey] ?? Hand;
  const {
    backend,
    cameraOn,
    currentSign,
    currentTarget,
    handsDetected,
    holdProgress,
    modelStatus,
    prediction,
    prevTarget,
    nextTarget,
    resetPractice,
    score,
    supportsClassification,
    toggleCamera,
    totalAttempts,
    videoRef,
    visionState,
  } = useBisindoPractice(safeModule.targets, {
    classifierBasePath: safeModule.classifierBasePath,
    loopTargets: false,
    moduleTitle: safeModule.title,
  });

  const confidencePercent = prediction ? Math.round(prediction.confidence * 100) : 0;
  const cameraReady = modelStatus === 'ready' || modelStatus === 'guide';
  const workspaceTone = getSessionTone(modelStatus, supportsClassification);
  const progressPercent = safeModule.targets.length > 0
    ? Math.round(((currentSign + 1) / safeModule.targets.length) * 100)
    : 0;

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) {
      return;
    }

    const width = visionState.videoWidth || videoRef.current?.videoWidth || 1280;
    const height = visionState.videoHeight || videoRef.current?.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;
    drawHandOverlay(canvas, cameraOn ? visionState.handLandmarks : []);
  }, [cameraOn, videoRef, visionState.handLandmarks, visionState.videoHeight, visionState.videoWidth]);

  if (!module || module.locked) {
    return <Navigate replace to="/belajar" />;
  }

  return (
    <div className="learn-session-page">
      <div className="container">
        <Motion.div
          className="learn-session-header"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <Link className="learn-session-back" to="/belajar">
            <ArrowLeft size={16} />
            <span>Kembali ke modul</span>
          </Link>

          <div className="learn-session-copy">
            <div className={`learn-session-badge learn-session-badge-${workspaceTone}`}>
              <ModuleIcon size={16} />
              <span>{module.title}</span>
            </div>
            <h1 className="learn-session-title">{module.title}</h1>
            <p className="learn-session-subtitle">{module.subtitle}</p>
          </div>
        </Motion.div>

        <div className="learn-session-layout">
          <Motion.section
            className="learn-session-stage"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <div className={`learn-stage-camera learn-stage-${workspaceTone}`}>
              <video
                ref={videoRef}
                autoPlay
                className={`learn-stage-video ${cameraOn ? 'visible' : ''}`}
                muted
                playsInline
              />
              <canvas
                ref={overlayRef}
                className={`learn-stage-overlay ${cameraOn ? 'visible' : ''}`}
              />

              {!cameraOn && (
                <div className="learn-stage-idle">
                  <div className="learn-stage-idle-icon">
                    <LayoutTemplate size={28} />
                  </div>
                  <h2>Workspace {module.title}</h2>
                  <p>
                    {cameraReady
                      ? 'Aktifkan kamera. Landmark tangan akan langsung muncul di atas video.'
                      : 'Menyiapkan workspace AI dan landmark guide.'}
                  </p>
                </div>
              )}

              {cameraOn && (
                <>
                  <div className="learn-stage-topbar">
                    <div className="learn-stage-live">
                      <span className="learn-stage-live-dot" />
                      <span>Live</span>
                    </div>

                    <div className="learn-stage-statuses">
                      <div className={`learn-stage-chip learn-stage-chip-${workspaceTone}`}>
                        <Brain size={14} />
                        <span>{getStatusLabel(modelStatus, supportsClassification, backend)}</span>
                      </div>
                      <div className={`learn-stage-chip ${handsDetected ? 'learn-stage-chip-emerald' : 'learn-stage-chip-amber'}`}>
                        <Hand size={14} />
                        <span>{handsDetected ? 'Tangan terdeteksi' : 'Arahkan tangan ke frame'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="learn-stage-focus">
                    <div className="learn-stage-target-card">
                      <span className="learn-stage-target-label">{module.targetLabel} aktif</span>
                      <strong>{currentTarget}</strong>
                      <span>{currentSign + 1} / {module.targets.length}</span>
                    </div>
                  </div>

                  <div className="learn-stage-footer">
                    <div>
                      <span className="learn-stage-metric-label">Prediksi</span>
                      <strong className="learn-stage-metric-value">
                        {supportsClassification ? prediction?.label ?? '--' : 'Guide'}
                      </strong>
                    </div>
                    <div>
                      <span className="learn-stage-metric-label">Confidence</span>
                      <strong className="learn-stage-metric-value">
                        {supportsClassification ? `${confidencePercent}%` : 'N/A'}
                      </strong>
                    </div>
                    <div className="learn-stage-progress">
                      <div className="learn-stage-progress-head">
                        <span>Stabilitas</span>
                        <span>{Math.round(holdProgress * 100)}%</span>
                      </div>
                      <div className="progress-bar learn-stage-progress-bar">
                        <div
                          className="progress-bar-fill learn-stage-progress-fill"
                          style={{ width: `${Math.round(holdProgress * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="learn-session-actions">
              <button
                className={`btn ${cameraOn ? 'btn-ghost' : 'btn-primary'} btn-lg learn-session-camera-button`}
                disabled={!cameraReady}
                onClick={toggleCamera}
                type="button"
              >
                {cameraOn ? <CameraOff size={20} /> : <Camera size={20} />}
                {cameraOn ? 'Matikan Kamera' : 'Aktifkan Kamera'}
              </button>

              <button className="btn btn-ghost btn-icon" onClick={prevTarget} type="button">
                <ChevronLeft size={18} />
              </button>
              <button className="btn btn-ghost btn-icon" onClick={nextTarget} type="button">
                <ChevronRight size={18} />
              </button>
              <button className="btn btn-ghost btn-icon" onClick={resetPractice} type="button">
                <RefreshCw size={18} />
              </button>
            </div>
          </Motion.section>

          <Motion.aside
            className="learn-session-sidebar"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <section className="learn-session-panel learn-session-panel-primary">
              <div className="learn-session-panel-header">
                <div>
                  <span className="learn-session-kicker">Workspace</span>
                  <h2>Belajar {module.title}</h2>
                </div>
                <div className={`learn-session-pill learn-session-pill-${workspaceTone}`}>
                  {supportsClassification ? 'AI Detect' : 'Guide Only'}
                </div>
              </div>

              <p className="learn-session-panel-copy">{module.desc}</p>

              <div className="learn-session-stats">
                <div className="learn-session-stat">
                  <span>Progress modul</span>
                  <strong>{progressPercent}%</strong>
                </div>
                <div className="learn-session-stat">
                  <span>Target aktif</span>
                  <strong>{module.targetLabel} {currentTarget}</strong>
                </div>
                <div className="learn-session-stat">
                  <span>Percobaan</span>
                  <strong>{totalAttempts}</strong>
                </div>
                <div className="learn-session-stat">
                  <span>Berhasil</span>
                  <strong>{score}</strong>
                </div>
              </div>

              <div className="learn-session-notice">
                <Sparkles size={16} />
                <span>
                  {supportsClassification
                    ? 'Saat target dikenali dengan stabil, halaman akan maju otomatis ke target berikutnya.'
                    : 'Halaman modul ini sudah aktif, tetapi classifier khusus modul ini belum ditambahkan. Kamera tetap bisa dipakai untuk landmark guide.'}
                </span>
              </div>
            </section>



            <section className="learn-session-panel">
              <div className="learn-session-panel-header">
                <div>
                  <span className="learn-session-kicker">Urutan</span>
                  <h2>Lintasan Modul</h2>
                </div>
              </div>

              <div className="learn-session-target-grid">
                {module.targets.map((target, index) => {
                  const state =
                    index < currentSign ? 'done' : index === currentSign ? 'current' : 'upcoming';

                  return (
                    <div
                      key={target}
                      className={`learn-session-target-chip learn-session-target-chip-${state}`}
                    >
                      <span>{target}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </Motion.aside>
        </div>
      </div>
    </div>
  );
}
