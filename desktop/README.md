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

# 2. Bundle a JRE for the target platform
node scripts/fetch-jre.mjs --platform=mac --arch=aarch64   # or --platform=win --arch=x64

# 3. Build the fat JAR (needs JDK 25)
JAVA_HOME=/path/to/jdk-25 npm run build:jar

# 4. Package installer
npm run build:mac      # → dist/*.dmg   (Apple Silicon)
npm run build:win      # → dist/*.exe   (Windows x64; best run on Windows/CI)
```

Artifacts land in `desktop/dist/`.

## Run in development

```bash
JAVA_HOME=/path/to/jdk-25 npm run build:jar   # produce resources/app.jar
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
