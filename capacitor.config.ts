import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuração do Capacitor — gera o APK Android da Bateu.
 *
 * Comandos rápidos (após `npm run build`):
 *   npx cap add android          (primeira vez)
 *   npx cap sync android         (a cada build)
 *   npx cap open android         (abre no Android Studio → Build APK)
 *   ou: npm run apk              (faz build + sync + abre)
 */
const config: CapacitorConfig = {
  appId: "online.bateu.app",
  appName: "Bateu",
  webDir: "dist",
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  server: {
    // Para testar contra o servidor de dev local, descomente:
    // url: "http://192.168.1.100:8080",
    // cleartext: true,
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0a0a0f",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0a0f",
    },
  },
};

export default config;
