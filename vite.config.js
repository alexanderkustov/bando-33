import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        tracker: 'index.html',
        atlas: 'atlas.html'
      }
    }
  }
});
