import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.theempirestays.command',
  appName: 'Empire Command',
  webDir: 'out',
  server: { androidScheme: 'https' },
  android: { backgroundColor: '#050608' }
};

export default config;
