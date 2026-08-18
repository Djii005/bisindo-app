import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import {
    BookOpen, Star, Lock, ChevronRight, Flame, Trophy, Sparkles
} from 'lucide-react';
import { learningModules } from '../lib/learningModules';
import { moduleIcons } from '../lib/moduleIcons';
import './Learn.css';

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i = 0) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    }),
};

export default function Learn() {
    const navigate = useNavigate();
    const [totalXP] = useState(0);
    const [streak] = useState(0);
    const [level] = useState(1);

    return (
        <div className="learn-page">
            <div className="container">
                {/* Header */}
                <Motion.div
                    className="learn-header"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.1 } },
                    }}
                >
                    <Motion.div variants={fadeUp}>
                        <h1 className="learn-title">
                            Modul <span className="gradient-text">Pembelajaran</span>
                        </h1>
                        <p className="learn-subtitle">
                            Pilih modul dan mulai belajar BISINDO secara interaktif
                        </p>
                    </Motion.div>

                    {/* Gamification Bar */}
                    <Motion.div className="gamification-bar" variants={fadeUp}>
                        <div className="gam-item">
                            <div className="gam-icon gam-icon-xp">
                                <Star size={18} />
                            </div>
                            <div>
                                <div className="gam-value">{totalXP} XP</div>
                                <div className="gam-label">Total Poin</div>
                            </div>
                        </div>
                        <div className="gam-item">
                            <div className="gam-icon gam-icon-streak">
                                <Flame size={18} />
                            </div>
                            <div>
                                <div className="gam-value">{streak} Hari</div>
                                <div className="gam-label">Streak</div>
                            </div>
                        </div>
                        <div className="gam-item">
                            <div className="gam-icon gam-icon-level">
                                <Trophy size={18} />
                            </div>
                            <div>
                                <div className="gam-value">Level {level}</div>
                                <div className="gam-label">Pemula</div>
                            </div>
                        </div>
                    </Motion.div>
                </Motion.div>

                {/* Module Grid */}
                <div className="modules-grid">
                    {learningModules.map((mod, i) => {
                        const ModuleIcon = moduleIcons[mod.iconKey];

                        return (
                        <Motion.div
                            key={mod.id}
                            className={`card module-card ${mod.locked ? 'module-locked' : ''}`}
                            initial="hidden"
                            animate="visible"
                            custom={i}
                            variants={fadeUp}
                        >
                            {mod.locked && (
                                <div className="module-lock-overlay">
                                    <Lock size={32} />
                                    <span>Selesaikan modul sebelumnya</span>
                                </div>
                            )}

                            <div className="module-top">
                                <div className={`module-icon module-icon-${mod.color}`}>
                                    <ModuleIcon size={28} />
                                </div>
                                <div className="module-top-meta">
                                    <span className={`badge badge-${mod.color === 'amber' ? 'amber' : mod.color === 'rose' ? 'rose' : mod.color}`}>
                                        {mod.difficulty}
                                    </span>
                                    {!mod.locked && (
                                        <span className={`module-status module-status-${mod.status === 'ready' ? 'ready' : 'guide'}`}>
                                            <Sparkles size={12} />
                                            {mod.status === 'ready' ? 'AI siap' : 'Guide aktif'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <h3 className="module-title">{mod.title}</h3>
                            <p className="module-desc">{mod.desc}</p>
                            <p className="module-subcopy">{mod.subtitle}</p>

                            <div className="module-meta">
                                <span className="module-lessons">
                                    <BookOpen size={14} /> {mod.lessons} Pelajaran
                                </span>
                                <span className="module-xp">
                                    <Star size={14} /> {mod.xp} XP
                                </span>
                            </div>

                            <div className="module-progress-section">
                                <div className="module-progress-header">
                                    <span>Progress</span>
                                    <span>{mod.progress}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${mod.progress}%` }}
                                    />
                                </div>
                            </div>

                            {!mod.locked && (
                                <button
                                    className="btn btn-primary module-btn"
                                    onClick={() => navigate(`/belajar/${mod.id}`)}
                                    type="button"
                                >
                                    Mulai Belajar
                                    <ChevronRight size={18} />
                                </button>
                            )}
                        </Motion.div>
                    )})}
                </div>
            </div>
        </div>
    );
}
