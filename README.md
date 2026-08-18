# BISINDO.app 🤟

A modern web application for learning **BISINDO** (Bahasa Isyarat Indonesia / Indonesian Sign Language) interactively with real-time camera feedback.

All AI gesture recognition runs directly inside your browser—no video feeds or camera streams are ever sent to a server.

---

## ✨ Features

- **Real-Time Gesture Detection**: Practice hand signs in front of your webcam and get instant visual feedback powered by MediaPipe and TensorFlow.js.
- **Structured Learning Modules**:
  - Alphabet (A–Z)
  - Numbers (0–20)
  - Basic Words & Everyday Phrases
  - Greetings & Expressions
- **Sign Language Dictionary**: Searchable reference of BISINDO gestures and hand poses.
- **Progress Tracking & Gamification**: XP points, daily streaks, achievements, and level progression saved to your account.
- **Privacy-First**: Computer vision models run 100% on the client side using WebAssembly and WebGL.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind-free vanilla CSS, Lucide Icons, Framer Motion
- **AI & Vision**: MediaPipe Tasks Vision, TensorFlow.js (runs client-side)
- **Backend API**: Node.js, Express, LibSQL / SQLite, JWT Auth
- **Deployment**: Vercel (Frontend) + Render / Koyeb (Backend) + Turso (Cloud SQLite)

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18 or newer)
- npm or pnpm

### 1. Clone the repository
```bash
git clone https://github.com/Djii005/bisindo-app.git
cd bisindo-app
```

### 2. Setup Backend Server
```bash
cd server
npm install
npm run dev
```
Backend will start on `http://localhost:3001`.

### 3. Setup Frontend
Open a new terminal in the project root:
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📄 License
Distributed under the MIT License.
