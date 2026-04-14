import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    loadEnv(mode, '.', '');

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tailwindcss()],
      // Gemini API key artık client bundle'a gömülmez.
      // Production: /api/gemini proxy (Vercel serverless)
      // Geliştirme: VITE_GEMINI_API_KEY .env.local'den Vite tarafından otomatik yüklenir
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      }
    };
});
