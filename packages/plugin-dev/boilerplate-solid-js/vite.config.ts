import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { superProductivityPlugin } from '@super-productivity/vite-plugin';

export default defineConfig({
  plugins: [solidPlugin(), superProductivityPlugin()],
});
