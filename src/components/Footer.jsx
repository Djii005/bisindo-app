import { Hand, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    {/* Brand */}
                    <div className="footer-brand">
                        <Link to="/" className="footer-logo">
                            <div className="footer-logo-icon">
                                <Hand size={20} />
                            </div>
                            <span className="footer-logo-text">BISINDO<span className="footer-logo-accent">.app</span></span>
                        </Link>
                        <p className="footer-desc">
                            Platform pembelajaran Bahasa Isyarat Indonesia (BISINDO) interaktif dengan teknologi Computer Vision & Deep Learning.
                        </p>
                    </div>

                    {/* Navigasi */}
                    <div className="footer-col">
                        <h4 className="footer-col-title">Navigasi</h4>
                        <Link to="/" className="footer-link">Beranda</Link>
                        <Link to="/belajar" className="footer-link">Belajar</Link>
                        <Link to="/latihan" className="footer-link">Latihan</Link>
                        <Link to="/kamus" className="footer-link">Kamus</Link>
                        <Link to="/progress" className="footer-link">Progress</Link>
                    </div>

                    {/* Mitra */}
                    <div className="footer-col">
                        <h4 className="footer-col-title">Mitra</h4>
                        <p className="footer-partner">
                            Pusat Bahasa Isyarat Indonesia (PUSBISINDO) Sulawesi Utara
                        </p>
                    </div>

                    {/* Teknologi */}
                    <div className="footer-col">
                        <h4 className="footer-col-title">Teknologi</h4>
                        <span className="footer-tech-tag">React</span>
                        <span className="footer-tech-tag">MediaPipe</span>
                        <span className="footer-tech-tag">TensorFlow.js</span>
                        <span className="footer-tech-tag">Computer Vision</span>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>
                        © {new Date().getFullYear()} BISINDO.app — Dibuat dengan <Heart size={14} className="footer-heart" /> untuk komunitas Tuli Indonesia
                    </p>
                </div>
            </div>
        </footer>
    );
}
