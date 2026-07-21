# Kafka UI Desktop App — Design Spec

**Date:** 2026-07-21
**Status:** Approved pending user review

## Goal

Package the existing `kafbat-ui` project (Spring Boot backend + React frontend) into a
self-contained desktop application that runs on **macOS and Windows** with **no server
deployment and no external dependencies**. The user downloads one installer, double-clicks,
and gets a working Kafka management UI. They add Kafka clusters from within the app.

## Constraints & Given Facts

- Backend is Java 25 / Spring Boot; the Kafka client and serdes are JVM-only, so a Java
  process **must** run locally. The desktop app is a native shell around that process.
- The build already produces a single Spring Boot fat JAR that serves both the REST API and
  the bundled React frontend on one HTTP port (`./gradlew build -Pinclude-frontend`).
- `auth.type: DISABLED` by default → no login required for a single-user local app.
- Dynamic config is supported (`dynamic.config.enabled=true`, `dynamic.config.path=<file>`)
  → clusters can be **added and edited from the UI**, persisted to a local YAML file. No
  hand-edited config files, no server.
- Actuator health endpoint (`/actuator/health`) is enabled → usable as a readiness probe.

## Chosen Approach

**Electron shell + bundled Java 25 runtime.** (Confirmed with user over Tauri / jpackage.)

- Chromium renders the modern React SPA reliably (the deciding factor over system-webview
  and embedded-Java-browser options).
- `electron-builder` produces a macOS `.dmg` and a Windows NSIS `.exe` from one codebase.
- A full per-platform JRE (Eclipse Temurin 25) is bundled so the user needs nothing
  installed. Full JRE (not a jlinked minimal runtime) to avoid Spring Boot fat-jar
  missing-module failures at runtime. Trade-off accepted: ~80–100 MB app size.

## Architecture

New self-contained Electron project under `desktop/`. It does not modify the Java or React
source; it consumes the built JAR as a resource.

```
desktop/
├── package.json              electron + electron-builder, build scripts
├── electron-builder.yml      mac (dmg) + win (nsis) targets, extraResources
├── src/
│   ├── main.js               main process: lifecycle, window, single-instance, menu
│   ├── preload.js            contextBridge (minimal; status/error channel to splash)
│   ├── jvm.js                locate JRE+JAR, pick free port, spawn, health-poll, kill
│   ├── paths.js              dev vs packaged resource resolution
│   └── splash.html           designed loading screen shown during JVM cold start
├── build/
│   ├── icon.icns / icon.ico / icon.png   app icons (designed from one SVG source)
│   └── icon.svg
├── scripts/
│   ├── fetch-jre.mjs         download+extract Temurin 25 JRE for a target platform
│   └── build-jar.mjs         run gradle, copy fat jar → resources/app.jar
└── resources/                (git-ignored, populated at build)
    ├── app.jar
    └── jre/                  per-platform JRE
```

### Runtime flow

1. `app.whenReady` → acquire single-instance lock (second launch focuses existing window,
   never double-spawns the server). Show the splash window.
2. `jvm.js`: resolve JRE binary + `app.jar` (dev: `../api/build/libs/*.jar` picking the boot
   jar, not `-plain`; JRE from `JAVA_HOME`. packaged: `process.resourcesPath`). Pick a free
   loopback port. Spawn:
   ```
   <jre>/bin/java \
     -Dserver.address=127.0.0.1 -Dserver.port=<port> \
     -Ddynamic.config.enabled=true \
     -Ddynamic.config.path=<userData>/dynamic_config.yaml \
     -jar <app.jar>
   ```
   Bound to `127.0.0.1` only — never exposed to the network.
3. Poll `http://127.0.0.1:<port>/actuator/health` until `status: UP` (with timeout).
   Forward JVM stdout/stderr to `<userData>/logs/backend.log`.
4. On ready: load `http://127.0.0.1:<port>` into the main `BrowserWindow`, close splash.
5. On quit / `window-all-closed`: kill the JVM child (tree-kill) before exit.

### Error handling

- JVM exits before health-up, or health times out → dismiss splash, show a native error
  dialog with the tail of `backend.log` and a "Open log folder" action. No silent hang.
- Port acquisition failure → retry with a new port a few times, then error dialog.
- Missing bundled resources (dev misconfig) → clear diagnostic, not a blank window.

### Window & platform behavior

- `contextIsolation: true`, `nodeIntegration: false`. Loaded content is our own local
  server. External `http(s)` links and `target=_blank` open in the system browser.
- Remember window size/position across launches.
- Native menu: standard macOS app/edit/window items; plus "Open Data Folder", "View Logs",
  "Reload", "Reset (delete local config)".
- macOS `window-all-closed` keeps the app alive (dock), re-creates window on activate;
  Windows/Linux quit.

## Design-craft surfaces (the impeccable part)

Two surfaces get real design attention — everything else is native plumbing:

1. **Splash / boot screen** (`splash.html`). JVM cold start is 5–15s; a blank window would
   feel broken. This screen owns that wait: product mark, a determinate-feeling progress
   treatment tied to real phases ("Starting engine" → "Connecting" → "Ready"), and it
   surfaces errors inline rather than only via dialog. Self-contained HTML/CSS, no external
   assets, theme-aware, respects `prefers-reduced-motion`.
2. **App icon.** One SVG source → `.icns` (mac), `.ico` (win), `.png`. A committed mark, not
   a generic placeholder.

## Build & distribution

- `npm run build:jar` → gradle build with frontend, copy fat jar to `resources/app.jar`.
- `npm run fetch-jre -- --platform mac|win` → download Temurin 25 JRE into `resources/jre`.
- `npm run build:mac` / `build:win` → electron-builder → `.dmg` / NSIS `.exe`.
- Note: a Windows installer is best built on Windows/CI; cross-building from macOS works for
  an unsigned artifact but code-signing/notarization needs the native OS. Documented in
  `desktop/README.md`. Code signing is out of scope for v1 (produces an unsigned app the user
  must allow past Gatekeeper/SmartScreen).

## Out of scope (YAGNI for v1)

- Code signing / notarization / auto-update.
- Auth, multi-user, RBAC (single local user).
- Bundling anything beyond the JRE + app JAR.
- Any change to the Java/React source.

## Testing / verification

- `jvm.js` port-pick and health-poll logic unit-tested where practical.
- Manual acceptance: fresh launch on macOS → splash → UI loads → add a local broker
  (`localhost:9092`) → config persists across restart → quit terminates the JVM (no orphan
  `java` process). Windows install/run smoke test.
- Verify no orphaned JVM on force-quit; verify second launch focuses rather than re-spawns.
