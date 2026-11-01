import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stemstudio.learning',
  appName: 'STEM Studio',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
