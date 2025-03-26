import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.superproductivity.superproductivity',
  appName: 'super-productivity',
  webDir: 'dist/browser',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
