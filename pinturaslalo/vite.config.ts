import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carga .env*, pero también permite variables del entorno del sistema (Cloudflare Pages)
  const env = loadEnv(mode, process.cwd(), '');

  const apiKey = env.API_KEY || env.GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY || '';

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey)
    },
    server: {
      port: 3000,
      host: '0.0.0.0'
    }
  };
});
