import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, UserPlus, User, Hand, Sparkles, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

function PasswordStrength({ password }) {
  const checks = [
    { label: 'Minimal 6 karakter', pass: password.length >= 6 },
    { label: 'Mengandung huruf besar', pass: /[A-Z]/.test(password) },
    { label: 'Mengandung angka', pass: /[0-9]/.test(password) },
  ];

  const passed = checks.filter((c) => c.pass).length;
  const strengthPercent = (passed / checks.length) * 100;
  const strengthColor =
    strengthPercent <= 33 ? 'var(--rose-600)' :
    strengthPercent <= 66 ? 'var(--amber-500)' :
    'var(--emerald-600)';

  if (!password) return null;

  return (
    <div className="password-strength">
      <div className="password-strength-bar">
        <div
          className="password-strength-fill"
          style={{ width: `${strengthPercent}%`, background: strengthColor }}
        />
      </div>
      <div className="password-checks">
        {checks.map((c, i) => (
          <div key={i} className={`password-check ${c.pass ? 'pass' : ''}`}>
            {c.pass ? <Check size={12} /> : <X size={12} />}
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setIsLoading(true);

    try {
      await register(fullName, email, password);
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
              Bergabung dan mulai belajar Bahasa Isyarat Indonesia 
              dengan cara yang menyenangkan & interaktif
            </p>
            <div className="auth-brand-features">
              <div className="auth-brand-feature">
                <Sparkles size={16} />
                <span>100+ gerakan isyarat</span>
              </div>
              <div className="auth-brand-feature">
                <Sparkles size={16} />
                <span>5 modul pembelajaran</span>
              </div>
              <div className="auth-brand-feature">
                <Sparkles size={16} />
                <span>Gratis selamanya</span>
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
            <h1 className="auth-form-title">Buat Akun 🚀</h1>
            <p className="auth-form-subtitle">
              Daftar untuk mulai belajar BISINDO
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
              <label htmlFor="reg-name">Nama Lengkap</label>
              <div className="auth-input-wrapper">
                <User size={18} className="auth-input-icon" />
                <input
                  id="reg-name"
                  type="text"
                  className="input auth-input"
                  placeholder="Masukkan nama lengkap"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email">Email</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  id="reg-email"
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
              <label htmlFor="reg-password">Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input auth-input"
                  placeholder="Buat password"
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
              <PasswordStrength password={password} />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-confirm">Konfirmasi Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  className="input auth-input"
                  placeholder="Ulangi password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {confirmPassword && (
                  <span className={`auth-match-icon ${password === confirmPassword ? 'match' : 'no-match'}`}>
                    {password === confirmPassword ? <Check size={18} /> : <X size={18} />}
                  </span>
                )}
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
                  <UserPlus size={20} />
                  Daftar
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            Sudah punya akun?{' '}
            <Link to="/login" className="auth-switch-link">
              Masuk di sini
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
