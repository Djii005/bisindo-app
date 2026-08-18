import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Learn from './pages/Learn';
import LearnSession from './pages/LearnSession';
import Practice from './pages/Practice';
import SelfPractice from './pages/SelfPractice';
import Dictionary from './pages/Dictionary';
import Progress from './pages/Progress';
import Login from './pages/Login';
import Register from './pages/Register';
import './styles/global.css';
import './styles/components.css';

const AUTH_ROUTES = ['/login', '/register'];

function AppLayout() {
  const { pathname } = useLocation();
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  return (
    <>
      <ScrollToTop />
      {!isAuthPage && <Navbar />}
      <main className={isAuthPage ? '' : 'page'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/belajar" element={
            <ProtectedRoute><Learn /></ProtectedRoute>
          } />
          <Route path="/belajar/:moduleId" element={
            <ProtectedRoute><LearnSession /></ProtectedRoute>
          } />
          <Route path="/latihan" element={
            <ProtectedRoute><Practice /></ProtectedRoute>
          } />
          <Route path="/mandiri" element={
            <ProtectedRoute><SelfPractice /></ProtectedRoute>
          } />
          <Route path="/kamus" element={<Dictionary />} />
          <Route path="/progress" element={
            <ProtectedRoute><Progress /></ProtectedRoute>
          } />
        </Routes>
      </main>
      {!isAuthPage && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}
