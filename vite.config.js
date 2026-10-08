import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        tracker: 'index.html',
        atlas: 'atlas.html',
        shanShui: 'shan-shui-reference.html'
      }
    }
  }
});
