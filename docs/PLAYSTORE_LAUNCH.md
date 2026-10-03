# 🚀 Bateu — Lançamento Play Store (Guia Rápido)

## O que já está pronto (artefatos assinados)

| Artefato | Uso |
|---|---|
| `Bateu-v2.0-release.apk` | Instalação direta (testes, distribuição fora da Play) |
| `Bateu-v2.0-playstore.aab` | **Upload na Play Store** (Google Play Console) |

Assinatura: `android/keystore/bateu-release.keystore` — alias `bateu`
→ **GUARDA ESTE FICHEIRO E A SENHA. Sem ele não podes atualizar o app na Play Store.**

## Publicar na Play Store hoje (checklist)

1. **Conta Google Play Console** (25 USD, one-time) — https://play.google.com/console
2. **Criar app** → Nome: `Bateu` · Idioma: Português (Moçambique) · App (não jogo) · Grátis
3. **Upload do AAB** → Testing → Production (podes usar "Internal testing" primeiro)
4. **Fichas obrigatórias** (preencher antes de produção):
   - Descrição curta (80 car.) e completa (4000 car.)
   - Ícone 512×512 PNG (usa `src/assets/bateu-logo.png`)
   - Banner 1024×500
   - **2 screenshots de telemóvel** mín. (faz screenshots do app)
   - Política de Privacidade (URL público) — obrigatório
5. **Classificação de conteúdo**: questionário IARC.
   ⚠️ O app tem jogos de azar simulados/sorteio de prémios → responde com atenção.
   Se o app inclui **dinheiro real em jogos**, aplica a Política de Jogo da Google
   (licença de jogo do país pode ser exigida). Consulta: "Gambling policies".
6. **Público-alvo**: se tiver apostas com dinheiro real, não pode ser marcado
   "Direcionado a crianças".
7. Submeter → revisão Google (1–7 dias normalmente)

## Versões futuras

```bash
npm run build
npx cap sync android
# (remover .gz/.br dos assets — ver abaixo)
cd android && ./gradlew assembleRelease bundleRelease
```

Antes de cada build: limpar assets obsoletos
```bash
rm -rf android/app/src/main/assets/public
npx cap sync android
find android/app/src/main/assets/public -name "*.gz" -delete
find android/app/src/main/assets/public -name "*.br" -delete
```

Aumentar `versionCode` (+1) e `versionName` em `android/app/build.gradle`.

## Apple Store (iOS) — próximos passos

- Precisas de: Mac (Xcode obrigatório) + conta Apple Developer (99 USD/ano)
- `npx cap add ios` (só funciona em macOS) → abrir no Xcode → archive → upload
- Os ícones/splash: gerar de `src/assets/bateu-logo.png` (Xcode Asset Catalog)
- Revisão Apple é mais estrita em jogos com dinheiro real — revisa
  "App Review Guidelines 3.2.2 / Gambling" antes de submeter

## Pagamentos (MPesa / e-Mola)

Ver `docs/MPESA_EMOLA_SETUP.md` — código pronto, só faltam os segredos da API.
