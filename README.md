# CincoScribe — Desktop App (Electron)

CincoScribe is an Electron-wrapped desktop application for on-device audio transcription and merging. This repository contains only the frontend shell — no backend logic, no database code.

---

## Repository Contents

```
├── main.js               # Electron main process (activation, window management)
├── preload.js             # IPC bridge (contextBridge → electronAPI)
├── index.html             # Core SPA layout
├── activation.html        # License activation UI
├── invalid.html           # License invalid state
├── offline-expired.html   # Offline grace period expired
├── electron-builder.yml   # NSIS installer configuration
├── package.json           # Electron + dependencies only
├── css/                   # Design system (variables, base, sidebar, components)
├── js/                    # App logic (pages, utils, state, router, whisper, sidebar)
├── LICENSE
└── README.md
```

---

## Prerequisites

- Node.js 18+
- npm

---

## Install Dependencies

```bash
npm install
```

---

## Run in Development

```bash
npm start
```

Launches the Electron window. On first run, the activation screen is shown.

---

## Build Installer (Windows)

```bash
npm run build
```

Produces an NSIS installer in `dist/`. Configuration is in `electron-builder.yml`.

### electron-builder.yml summary

| Key | Value |
|-----|-------|
| `appId` | `com.cincoscribe.app` |
| `target` | `nsis` |
| `oneClick` | `false` (user picks install directory) |
| Excluded from build | `.env`, `server/**` |

---

## Activation Flow

1. **First launch** → `activation.html` is shown. User enters their 16-character license key (format: `XXXX-XXXX-XXXX-XXXX`).
2. The app generates a **hardware fingerprint** (`sha256(cpuId + mac)`) via `systeminformation`.
3. The key + fingerprint are sent to the license server (`POST /validate` with `action: activate`).
4. On success, credentials are persisted locally via `electron-store` (encrypted).
5. **Subsequent launches** → the app calls `POST /validate` with `action: check`. If the server confirms validity, `index.html` loads.
6. **Offline grace & Trial** → if the server is unreachable and activation occurred < 7 days ago, the app loads normally. After 7 days offline, `offline-expired.html` is shown. The free trial is valid for 24 hours from first launch.
7. **Fingerprint mismatch** → `invalid.html` is shown. The license is locked to the original machine.
8. **Distribution** → The built `.exe` installer is uploaded to LemonSqueezy. When users purchase a plan, LemonSqueezy's webhook triggers our server to generate and email a 16-character license key via Resend.

### Environment Variables (main process)

| Variable | Purpose | Default |
|----------|---------|---------|
| `SERVER_URL` | License validation server URL | `http://localhost:3000` |
| `STORE_ENCRYPTION_KEY` | Encryption key for `electron-store` | `default-dev-key` |

---

## License

See [LICENSE](./LICENSE).
