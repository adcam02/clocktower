import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The built site goes to docs/, which GitHub Pages serves.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
  },
});
