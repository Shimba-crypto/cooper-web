# CooperWeb Android app

The APK is a **TWA** (Trusted Web Activity): a thin Android shell that renders
the deployed PWA at `https://chikondi-dot.web.app` full-screen, with no browser
UI. There is no separate mobile codebase — ship the web app and the Android app
updates with it. Only rebuild the APK when the icon, name, or package changes.

## Layout

| Path | What |
|---|---|
| `cooperweb.keystore` | Signing key. **Gitignored. Back it up.** |
| `keystore-credentials.txt` | Keystore password. **Gitignored.** |
| `twa/` | Generated Gradle project. Gitignored; regenerate with Bubblewrap. |
| `twa/twa-manifest.json` | Bubblewrap's source of truth for the project |
| `../public/.well-known/assetlinks.json` | Digital Asset Links — proves the app owns the domain |
| `../public/downloads/cooperweb.apk` | The shipped APK, served by Firebase Hosting |

## The signing key matters

`cooperweb.keystore` is the app's identity. If it is lost, you cannot ship an
update to anyone who already installed the app, and Play Store would treat a
rebuild as a different app. Its SHA-256 is baked into `assetlinks.json`; change
the key and the TWA falls back to showing a browser address bar until you update
that file and redeploy.

Current fingerprint:

```
4E:06:85:1D:6D:6F:35:84:E6:42:5D:77:E8:CF:31:50:C1:68:B6:E4:0E:FC:46:4E:D6:3F:3B:B3:04:9F:96:DE
```

## Toolchain

Bubblewrap is fussy about versions. What this machine needed:

- **JDK 17 exactly.** Bubblewrap hard-rejects anything else (`JAVA_VERSION="17.0`
  string match), even though Gradle 8.11.1 itself is fine on 21. Installed at
  `~/.bubblewrap/jdk-extract/jdk-17.0.13+11`.
- **Android SDK** at `%LOCALAPPDATA%\Android\Sdk`, configured in
  `~/.bubblewrap/config.json`.
- **`build-tools/36.1.0`** — Bubblewrap hardcodes this version, but only 36.0.0
  is published. Worked around with a directory junction:
  `mklink /J build-tools\36.1.0 build-tools\36.0.0`
- **`Sdk\bin`** — Bubblewrap looks for `sdkmanager` in a legacy location.
  Junctioned to `cmdline-tools\latest\bin`.

## Rebuilding

`bubblewrap build` fails on this machine — it shells out to `gradlew.bat`
without a path and Windows cannot resolve it. Drive Gradle directly instead:

```powershell
$env:JAVA_HOME="C:\Users\pc\.bubblewrap\jdk-extract\jdk-17.0.13+11"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
cd android\twa
.\gradlew.bat assembleRelease --no-daemon
```

Then align and sign (Bubblewrap normally does this step):

```powershell
$bt="$env:LOCALAPPDATA\Android\Sdk\build-tools\36.0.0"
$pw="<from keystore-credentials.txt>"
& "$bt\zipalign.exe" -f -p 4 `
  app\build\outputs\apk\release\app-release-unsigned.apk app-release-aligned.apk
& "$bt\apksigner.bat" sign --ks ..\cooperweb.keystore --ks-key-alias cooperweb `
  --ks-pass "pass:$pw" --key-pass "pass:$pw" --out cooperweb.apk app-release-aligned.apk
& "$bt\apksigner.bat" verify --verbose cooperweb.apk
```

Copy the result to `public/downloads/cooperweb.apk`, then `npm run build` and
deploy. Bump `versionCode` (and `versionName`) in `twa/app/build.gradle` for
every release — Android refuses to install an APK with a lower `versionCode`.

Note: `bubblewrap update --skipVersionUpgrade` does **not** rewrite
`versionName` in `app/build.gradle`. Edit that file directly.

## Two things that will silently break the download

Both are already handled; do not undo them.

1. `firebase.json` must not ignore `**/.*`, or `.well-known/` never deploys and
   the TWA shows a browser address bar forever.
2. `vite.config.ts` sets `navigateFallbackDenylist` for `/downloads/` and
   `/.well-known/`. Without it the service worker answers those navigations with
   `index.html`, so the APK downloads as an HTML file.
