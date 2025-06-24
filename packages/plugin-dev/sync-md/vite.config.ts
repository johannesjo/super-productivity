import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    minify: true,
    target: 'esnext',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
  define: {
    // Ensure we're in production mode for smaller builds
    'process.env.NODE_ENV': '"production"',
  },
});
