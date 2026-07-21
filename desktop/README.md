# Kafbat UI Desktop

Self-contained desktop build of Kafbat UI for macOS and Windows. Bundles its own Java 25
runtime and the app's fat JAR — end users install nothing else, run fully offline, and add
Kafka clusters from the UI (persisted locally, no server).

## Prerequisites (build machine only)

- Node 22+
- **JDK 25** (Temurin) with `JAVA_HOME` set — required to build the fat JAR.

## One-time / per-release build

```bash
cd desktop
npm install

# 1. Icon (once, or when icon.svg changes)
npm run make-icons

# 2. Build the fat JAR (needs JDK 25)
JAVA_HOME=/path/to/jdk-25 npm run build:jar

# 3. Package installer — each command fetches the matching platform JRE first,
#    so the bundled Java 25 runtime always matches the target OS.
npm run build:mac      # → dist/*.dmg   (Apple Silicon)
npm run build:win      # → dist/*.exe   (Windows x64; must run on Windows or CI)
```

Artifacts land in `desktop/dist/`.

> **Always build the Windows `.exe` on Windows (or CI), never by cross-building
> `build:win` on macOS.** `build:mac` and `build:win` each overwrite
> `resources/jre` with the JRE for their own target, so the runtime matches the
> OS the installer is built on. A Windows installer produced on macOS cannot be
> code-signed and NSIS packaging requires wine; use the CI workflow below.

## Run in development

For dev, populate `resources/jre` with a runtime for **your** machine, then start:

```bash
JAVA_HOME=/path/to/jdk-25 npm run build:jar          # produce resources/app.jar
node scripts/fetch-jre.mjs --platform=mac --arch=aarch64   # your OS/arch
npm start
```

## Tests

```bash
npm test
```

## Building both platforms via CI (recommended)

A Windows `.exe` cannot be built on macOS without wine, and vice versa. The GitHub Actions
workflow `.github/workflows/desktop-build.yml` builds both installers on native runners
(macOS arm64 → `.dmg`, Windows x64 → `.exe`), each with a matching bundled JRE. Trigger it
manually ("Run workflow") or by pushing a `desktop-v*` tag; download the installers from the
run's artifacts. This is the reliable path to shipping both platforms.

## Notes

- **Unsigned (v1):** first launch requires bypassing Gatekeeper (macOS: right-click → Open)
  or SmartScreen (Windows: More info → Run anyway).
- **Upgrades:** running a newer installer replaces the current install, closes the running
  app, and relaunches. User config (`dynamic_config.yaml`) lives in the OS user-data folder
  and survives upgrades.
- **Other architectures:** for Intel macOS, fetch `--arch=x64` and add `x64` to the mac
  `arch` list in `electron-builder.yml`.
- Data/log locations: **macOS** `~/Library/Application Support/kafbat-ui-desktop/`,
  **Windows** `%APPDATA%/kafbat-ui-desktop/`.
