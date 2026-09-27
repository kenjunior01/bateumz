# 📲 Guia de Geração do APK Android — Bateu v2.0

A plataforma Bateu agora é **100% compatível com APK Android** via Capacitor.
O mesmo código React serve a **versão web** e a **versão APK nativa**.

---

## ⚡ Resumo rápido

```bash
# 1. Primeira vez (só uma vez)
npm install
npm run apk:init          # build web + cria projeto android/

# 2. Sempre que atualizar o código
npm run apk:sync          # build web + sincroniza com android/

# 3. Gerar o APK (precisa de Android Studio)
npm run apk:open          # abre no Android Studio
#    no Android Studio: Build → Build Bundle(s)/APK(s) → Build APK(s)
#    APK sai em: android/app/build/outputs/apk/debug/app-debug.apk

# OU, sem abrir o Android Studio (linha de comando):
npm run apk:ci            # gera app-debug.apk via Gradle
```

---

## 📋 Requisitos

| Requisito | Versão | Nota |
|-----------|--------|------|
| Node.js | 18+ | para o build web |
| Android Studio | Hedgehog (2023.1)+ | inclui SDK Android 34 |
| JDK | 17 | incluído no Android Studio |
| Variável `ANDROID_HOME` | — | ex.: `C:\Users\Tu\AppData\Local\Android\Sdk` |

> 💡 **Linux/Mac**: instale com `sudo snap install android-studio --classic`
> e exporte `ANDROID_HOME=$HOME/Android/Sdk` no `.bashrc`.

---

## 🔧 Configuração incluída

O arquivo `capacitor.config.ts` já vem otimizado:

- **App ID**: `online.bateu.app`
- **Nome**: `Bateu`
- **Splash screen** escura (#0a0a0f) fullscreen 2s
- **Status bar** escura a condizer com o tema
- **HTTPS scheme** nativo (`androidScheme: "https"`) — evita problemas de CORS/cookies com o Supabase
- Ícones e imagens: reutiliza os da PWA (`public/pwa-192x192.png` e `pwa-512x512.png`)

## 🎨 Passo extra recomendado (ícones nativos)

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --android   # gera todos os densities de ícone + splash
```

Coloque antes:
- `resources/icon.png` (1024×1024, sem transparência)
- `resources/splash.png` (2732×2732)

## 🚀 Publicar na Play Store

```bash
cd android
./gradlew bundleRelease    # gera .aab para a Play Store
```

Assine com o seu keystore:

```bash
keytool -genkey -v -keystore bateu-release.keystore -alias bateu -keyalg RSA -keysize 2048 -validity 10000
```

Configure em `android/app/build.gradle` → `signingConfigs`.

## 🔁 Fluxo diário de desenvolvimento

1. Código novo → `npm run apk:sync`
2. Testar no telemóvel ligado por USB: `npx cap run android`
3. Hot reload contra o dev server (opcional): descomente `server.url`
   no `capacitor.config.ts` apontando para o IP do seu PC.

---

## ❓ FAQ

**A APK funciona offline?**
Parcialmente — a camada PWA/Service Worker faz cache dos assets e das
imagens. Dados de sorteios/jogos precisam de rede.

**Notificações push na APK?**
O projeto já tem `usePushNotifications.ts`. Dentro do APK nativo
recomenda-se o `@capacitor/push-notifications` + Firebase FCM.

**Preciso mudar URLs do Supabase?**
Não. O APK usa as mesmas variáveis `VITE_SUPABASE_*` no build.
