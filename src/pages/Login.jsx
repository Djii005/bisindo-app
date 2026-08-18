import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, LogIn, Hand, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Left Panel - Branding */}
      <div className="auth-brand-panel">
        <div className="auth-brand-bg">
          <div className="auth-brand-blob auth-blob-1"></div>
          <div className="auth-brand-blob auth-blob-2"></div>
        </div>
        <div className="auth-brand-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="auth-brand-logo">
              <Hand size={32} />
            </div>
            <h2 className="auth-brand-title">BISINDO.app</h2>
            <p className="auth-brand-desc">
              Platform pembelajaran Bahasa Isyarat Indonesia interaktif 
              dengan teknologi AI & Computer Vision
            </p>
            <div className="auth-brand-features">
              <div className="auth-brand-feature">
                <Sparkles size={16} />
                <span>Deteksi gerakan real-time</span>
              </div>
              <div className="auth-brand-feature">
                <Sparkles size={16} />
                <span>Gamifikasi & achievement</span>
              </div>
              <div className="auth-brand-feature">
                <Sparkles size={16} />
                <span>Divalidasi PUSBISINDO</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="auth-form-panel">
        <motion.div
          className="auth-form-wrapper"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="auth-form-header">
            <h1 className="auth-form-title">Selamat Datang! 👋</h1>
            <p className="auth-form-subtitle">
              Masuk ke akun BISINDO.app kamu
            </p>
          </div>

          {error && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="login-email">Email</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className="input auth-input"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input auth-input"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg auth-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="auth-loading">Memproses...</span>
              ) : (
                <>
                  <LogIn size={20} />
                  Masuk
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            Belum punya akun?{' '}
            <Link to="/register" className="auth-switch-link">
              Daftar sekarang
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
