import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // P3-B: Vendor chunk splitting for optimal caching
    rollupOptions: {
      output: {
        manualChunks: {
          // TensorFlow.js — largest dependency, rarely changes
          'vendor-tensorflow': [
            '@tensorflow/tfjs-core',
            '@tensorflow/tfjs-backend-webgl',
            '@tensorflow/tfjs-converter',
            '@tensorflow/tfjs-layers',
          ],
          // MediaPipe — second largest, stable
          'vendor-mediapipe': [
            '@mediapipe/tasks-vision',
          ],
          // UI framework deps
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom',
          ],
          // Animation library
          'vendor-motion': [
            'framer-motion',
          ],
        },
      },
    },
    // Increase chunk size warning limit for ML libraries
    chunkSizeWarningLimit: 1000,
  },
})
