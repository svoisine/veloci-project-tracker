import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Both ports come from server/paths.js so there is exactly one place either
// number is written. The browser never sees them: the app calls /api with
// relative paths, which Vite forwards here in dev and which are same-origin in
// serve mode — so changing a port needs no code edit anywhere in src/.
import { PORT, VITE_PORT } from './server/paths.js';

export default defineConfig({
  plugins: [react()],
  server: {
    port: VITE_PORT,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://localhost:${PORT}`,
        changeOrigin: true,
      },
    },
  },
});
