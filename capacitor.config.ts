import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nyx.autocaller',
  appName: 'Nyx Auto-Caller',
  webDir: 'agent-app',
  android: {
    backgroundColor: '#0a0a0f',
    allowMixedContent: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
