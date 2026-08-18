import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Hand, Camera, BookOpen, BookMarked, ArrowRight,
    Users, ChevronRight,
    GraduationCap, Eye, Award
} from 'lucide-react';
import './Home.css';

function Counter({ end, suffix = '', duration = 2000 }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const counted = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !counted.current) {
                    counted.current = true;
                    let start = 0;
                    const step = end / (duration / 16);
                    const timer = setInterval(() => {
                        start += step;
                        if (start >= end) {
                            setCount(end);
                            clearInterval(timer);
                        } else {
                            setCount(Math.floor(start));
                        }
                    }, 16);
                }
            },
            { threshold: 0.5 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end, duration]);

    return <span ref={ref}>{count}{suffix}</span>;
}

const features = [
    {
        icon: Camera,
        title: 'Deteksi Real-time',
        desc: 'Gunakan webcam untuk latihan isyarat dengan umpan balik instan menggunakan AI.',
        color: 'blue',
    },
    {
        icon: BookOpen,
        title: 'Belajar Interaktif',
        desc: 'Modul pembelajaran terstruktur dari alfabet hingga percakapan sehari-hari.',
        color: 'violet',
    },
    {
        icon: BookMarked,
        title: 'Kamus BISINDO',
        desc: 'Referensi lengkap gerakan isyarat yang divalidasi oleh PUSBISINDO.',
        color: 'emerald',
    },
];

const steps = [
    { num: 1, icon: BookOpen, title: 'Pilih Modul', desc: 'Pilih topik yang ingin dipelajari dari koleksi modul kami.' },
    { num: 2, icon: Eye, title: 'Pelajari Gerakan', desc: 'Lihat demonstrasi gerakan isyarat yang benar.' },
    { num: 3, icon: Camera, title: 'Praktik & Feedback', desc: 'Aktifkan kamera dan dapatkan evaluasi real-time dari AI.' },
];

export default function Home() {
    return (
        <div className="home">
            {/* ── Hero ──────────────────────────── */}
            <section className="hero">
                <div className="hero-bg">
                    <div className="hero-gradient"></div>
                </div>

                <div className="container hero-content">
                    <div className="hero-text">
                        <span className="hero-badge">
                            Powered by AI & Computer Vision
                        </span>

                        <h1 className="hero-title">
                            Belajar <span className="gradient-text">BISINDO</span>
                            <br />dengan Teknologi AI
                        </h1>

                        <p className="hero-desc">
                            Platform pembelajaran Bahasa Isyarat Indonesia interaktif
                            dengan deteksi gerakan real-time. Belajar kapan saja, di mana saja.
                        </p>

                        <div className="hero-actions">
                            <Link to="/belajar" className="btn btn-primary btn-lg">
                                Mulai Belajar
                                <ArrowRight size={20} />
                            </Link>
                            <Link to="/kamus" className="btn btn-secondary btn-lg">
                                Jelajahi Kamus
                            </Link>
                        </div>

                        <div className="hero-stats-mini">
                            <div className="hero-stat-mini">
                                <GraduationCap size={16} />
                                <span>5 Modul Pembelajaran</span>
                            </div>
                            <div className="hero-stat-mini">
                                <Hand size={16} />
                                <span>100+ Gerakan Isyarat</span>
                            </div>
                            <div className="hero-stat-mini">
                                <Award size={16} />
                                <span>Validasi PUSBISINDO</span>
                            </div>
                        </div>
                    </div>

                    <div className="hero-visual">
                        <div className="hero-card-stack">
                            <div className="hero-card hero-card-back">
                                <div className="hero-card-hand">🤟</div>
                            </div>
                            <div className="hero-card hero-card-mid">
                                <div className="hero-card-hand">✋</div>
                            </div>
                            <div className="hero-card hero-card-front">
                                <div className="hero-card-hand">👋</div>
                                <div className="hero-card-label">Halo!</div>
                                <div className="hero-card-accuracy">
                                    <div className="hero-accuracy-dot"></div>
                                    Akurasi 95%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Features ─────────────────────── */}
            <section className="section features-section">
                <div className="container">
                    <h2 className="section-title">
                        Fitur <span className="gradient-text">Unggulan</span>
                    </h2>
                    <p className="section-subtitle">
                        Dibangun dengan teknologi terbaru untuk pengalaman belajar terbaik
                    </p>

                    <div className="features-grid">
                        {features.map((f) => (
                            <div key={f.title} className="card feature-card">
                                <div className={`feature-icon feature-icon-${f.color}`}>
                                    <f.icon size={28} />
                                </div>
                                <h3 className="feature-title">{f.title}</h3>
                                <p className="feature-desc">{f.desc}</p>
                                <ChevronRight size={18} className="feature-arrow" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How It Works ─────────────────── */}
            <section className="section how-section">
                <div className="container">
                    <h2 className="section-title">
                        Cara <span className="gradient-text">Belajar</span>
                    </h2>
                    <p className="section-subtitle">
                        Tiga langkah sederhana untuk mulai belajar BISINDO
                    </p>

                    <div className="steps-row">
                        {steps.map((s, i) => (
                            <div key={s.num} className="step-card">
                                <div className="step-num">{s.num}</div>
                                <div className="step-icon-wrap">
                                    <s.icon size={28} />
                                </div>
                                <h3 className="step-title">{s.title}</h3>
                                <p className="step-desc">{s.desc}</p>
                                {i < steps.length - 1 && <div className="step-connector" />}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Stats ────────────────────────── */}
            <section className="section stats-section">
                <div className="container">
                    <div className="stats-grid">
                        <div className="stat-item">
                            <div className="stat-number"><Counter end={100} suffix="+" /></div>
                            <div className="stat-label">Gerakan Isyarat</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-number"><Counter end={5} /></div>
                            <div className="stat-label">Modul Belajar</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-number"><Counter end={95} suffix="%" /></div>
                            <div className="stat-label">Akurasi Model</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-number"><Counter end={24} suffix="/7" /></div>
                            <div className="stat-label">Akses Kapan Saja</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Partner / CTA ────────────────── */}
            <section className="section cta-section">
                <div className="container">
                    <div className="cta-card">
                        <div className="cta-content">
                            <span className="badge badge-blue">
                                <Users size={14} /> Mitra Resmi
                            </span>
                            <h2 className="cta-title">
                                Didukung oleh PUSBISINDO Sulawesi Utara
                            </h2>
                            <p className="cta-desc">
                                Dataset dan akurasi gerakan isyarat divalidasi langsung oleh
                                Pusat Bahasa Isyarat Indonesia (PUSBISINDO) Sulawesi Utara
                                untuk menjamin kualitas pembelajaran.
                            </p>
                            <Link to="/belajar" className="btn btn-primary btn-lg">
                                Mulai Sekarang
                                <ArrowRight size={20} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
