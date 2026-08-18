import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Hand, BookOpen, Camera, MessageSquare, BookMarked, LogIn, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const navLinks = [
  { path: '/', label: 'Beranda', icon: Hand },
  { path: '/belajar', label: 'Belajar', icon: BookOpen },
  { path: '/latihan', label: 'Latihan', icon: Camera },
  { path: '/mandiri', label: 'Mandiri', icon: MessageSquare },
  { path: '/kamus', label: 'Kamus', icon: BookMarked },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (showUserMenu && !e.target.closest('.user-menu-wrapper')) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUserMenu]);

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  function closeMenus() {
    setIsOpen(false);
    setShowUserMenu(false);
  }

  function handleLogout() {
    closeMenus();
    logout();
    navigate('/');
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''} ${isAuthPage ? 'navbar-auth' : ''}`}>
      <div className="container navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={closeMenus}>
          <div className="navbar-logo-icon">
            <Hand size={24} />
          </div>
          <span className="navbar-logo-text">
            BISINDO<span className="navbar-logo-accent">.app</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        {!isAuthPage && (
          <div className="navbar-links">
            {navLinks.map((link) => {
              const NavIcon = link.icon;

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={closeMenus}
                  className={`navbar-link ${location.pathname === link.path ? 'active' : ''}`}
                >
                  <NavIcon size={18} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="navbar-actions">
          {user ? (
            <div className="user-menu-wrapper">
              <button
                className="user-menu-trigger"
                onClick={() => setShowUserMenu(!showUserMenu)}
                type="button"
              >
                <div className="user-avatar">
                  {getInitials(user.full_name)}
                </div>
                <span className="user-name">{user.full_name}</span>
                <ChevronDown size={16} className={`user-chevron ${showUserMenu ? 'open' : ''}`} />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <Motion.div
                    className="user-dropdown"
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="user-dropdown-header">
                      <div className="user-avatar user-avatar-lg">
                        {getInitials(user.full_name)}
                      </div>
                      <div>
                        <div className="user-dropdown-name">{user.full_name}</div>
                        <div className="user-dropdown-email">{user.email}</div>
                      </div>
                    </div>
                    <div className="user-dropdown-divider" />
                    <Link to="/progress" className="user-dropdown-item" onClick={closeMenus}>
                      <User size={16} />
                      <span>Profil & Progress</span>
                    </Link>
                    <button className="user-dropdown-item user-dropdown-logout" onClick={handleLogout} type="button">
                      <LogOut size={16} />
                      <span>Keluar</span>
                    </button>
                  </Motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            !isAuthPage && (
              <Link to="/login" className="btn btn-primary btn-sm" onClick={closeMenus}>
                <LogIn size={16} />
                Masuk
              </Link>
            )
          )}
        </div>

        {/* Mobile Toggle */}
        {!isAuthPage && (
          <button
            className="navbar-toggle"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <Motion.div
            className="navbar-mobile"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {navLinks.map((link) => {
              const NavIcon = link.icon;

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={closeMenus}
                  className={`navbar-mobile-link ${location.pathname === link.path ? 'active' : ''}`}
                >
                  <NavIcon size={20} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            {user ? (
              <>
                <Link to="/progress" className="navbar-mobile-link" onClick={closeMenus}>
                  <User size={20} />
                  <span>Profil & Progress</span>
                </Link>
                <button className="btn btn-ghost" onClick={handleLogout} style={{ marginTop: '0.5rem' }} type="button">
                  <LogOut size={16} />
                  Keluar
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary" onClick={closeMenus} style={{ marginTop: '0.5rem' }}>
                <LogIn size={16} />
                Masuk
              </Link>
            )}
          </Motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
