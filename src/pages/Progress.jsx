import {
  BookOpen,
  Calendar,
  Clock,
  Flame,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getModuleProgressSummary } from '../lib/learningModules';
import './Progress.css';

const moduleProgress = getModuleProgressSummary();

const achievements = [
  { icon: Star, title: 'Pemula', desc: 'Selesaikan pelajaran pertama', unlocked: false, color: 'blue' },
  { icon: Flame, title: 'On Fire!', desc: 'Streak 7 hari berturut-turut', unlocked: false, color: 'orange' },
  { icon: Target, title: 'Sharp Shooter', desc: 'Akurasi 90%+ dalam latihan', unlocked: false, color: 'emerald' },
  { icon: BookOpen, title: 'Bookworm', desc: 'Selesaikan 1 modul penuh', unlocked: false, color: 'violet' },
  { icon: Trophy, title: 'Champion', desc: 'Selesaikan semua modul', unlocked: false, color: 'amber' },
  { icon: Zap, title: 'Speed Learner', desc: 'Selesaikan 10 pelajaran dalam sehari', unlocked: false, color: 'rose' },
];

const recentActivity = [
  { text: 'Selamat datang di BISINDO.app! Mulai perjalanan belajarmu.', time: 'Baru saja' },
];

export default function Progress() {
  const { user } = useAuth();
  const overallProgress = 0;
  const totalXP = 0;
  const streak = 0;
  const level = 1;
  const initials = user?.full_name
    ? user.full_name.split(' ').map((word) => word[0]).join('').toUpperCase().slice(0, 2)
    : 'BS';

  return (
    <div className="progress-page">
      <div className="container">
        <div className="prog-header">
          <div className="profile-hero">
            <div className="profile-hero-avatar">{initials}</div>
            <div className="profile-hero-copy">
              <h1 className="prog-title">
                Profil & <span className="gradient-text">Progress</span>
              </h1>
              <p className="prog-subtitle">{user?.full_name ?? 'Pengguna BISINDO'}</p>
              <p className="profile-hero-meta">
                {(user?.email ?? 'Belum login') + ' - Pantau modul, pencapaian, dan ritme belajar kamu di satu tempat.'}
              </p>
            </div>
          </div>
        </div>

        <div className="prog-stats-row">
          <div className="card prog-stat-card">
            <div className="prog-stat-icon prog-stat-xp"><Star size={22} /></div>
            <div className="prog-stat-value">{totalXP}</div>
            <div className="prog-stat-label">Total XP</div>
          </div>
          <div className="card prog-stat-card">
            <div className="prog-stat-icon prog-stat-streak"><Flame size={22} /></div>
            <div className="prog-stat-value">{streak}</div>
            <div className="prog-stat-label">Hari Streak</div>
          </div>
          <div className="card prog-stat-card">
            <div className="prog-stat-icon prog-stat-level"><Trophy size={22} /></div>
            <div className="prog-stat-value">Lv.{level}</div>
            <div className="prog-stat-label">Level</div>
          </div>
          <div className="card prog-stat-card">
            <div className="prog-stat-icon prog-stat-time"><Clock size={22} /></div>
            <div className="prog-stat-value">0m</div>
            <div className="prog-stat-label">Waktu Belajar</div>
          </div>
        </div>

        <div className="prog-content">
          <div className="prog-left">
            <div className="card prog-ring-card">
              <h3>Progress Keseluruhan</h3>
              <div className="prog-ring-wrap">
                <svg viewBox="0 0 120 120" className="prog-ring-svg">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="var(--gray-100)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="url(#ring-grad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${overallProgress * 3.27} 327`}
                    transform="rotate(-90 60 60)"
                    className="prog-ring-fill"
                  />
                  <defs>
                    <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="var(--blue-500)" />
                      <stop offset="100%" stopColor="var(--violet-500)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="prog-ring-text">
                  <span className="prog-ring-percent">{overallProgress}%</span>
                  <span className="prog-ring-label">Selesai</span>
                </div>
              </div>
            </div>

            <div className="card prog-modules-card">
              <h3>Progress per Modul</h3>
              <div className="prog-modules-list">
                {moduleProgress.map((module) => (
                  <div key={module.name} className="prog-module-item">
                    <div className="prog-module-header">
                      <span className="prog-module-name">{module.name}</span>
                      <span className="prog-module-count">
                        {module.progress}/{module.total}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-bar-fill progress-fill-${module.color}`}
                        style={{ width: `${module.total > 0 ? (module.progress / module.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="prog-right">
            <div className="card prog-achievements-card">
              <div className="prog-card-header">
                <h3>Pencapaian</h3>
                <span className="badge badge-blue">0 / {achievements.length}</span>
              </div>
              <div className="achievements-grid">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.title}
                    className={`achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                  >
                    <div className={`achievement-icon achievement-icon-${achievement.color}`}>
                      <achievement.icon size={22} />
                    </div>
                    <div className="achievement-info">
                      <div className="achievement-title">{achievement.title}</div>
                      <div className="achievement-desc">{achievement.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card prog-activity-card">
              <div className="prog-card-header">
                <h3>Aktivitas Terbaru</h3>
                <TrendingUp size={18} className="prog-trend-icon" />
              </div>
              <div className="activity-list">
                {recentActivity.map((activity) => (
                  <div key={activity.text} className="activity-item">
                    <div className="activity-dot" />
                    <div className="activity-content">
                      <p className="activity-text">{activity.text}</p>
                      <span className="activity-time">
                        <Calendar size={12} /> {activity.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
