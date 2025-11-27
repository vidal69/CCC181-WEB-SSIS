// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/',  // This is important - serves from root
    build: {
        outDir: '../backend/dist',
        emptyOutDir: true,
    },
    server: {
        // Proxy API requests to the Flask backend to avoid CORS/SameSite cookie issues
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5001',
                changeOrigin: true,
                secure: false,
            },
        },
    },
})