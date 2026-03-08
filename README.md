# Weaver Golf

Standalone 3-hole mini golf game. Same game as in GoGoPlanet, packaged as its own app for the Apple App Store (via Capacitor).

## Run locally

```bash
npm install
npm run dev
```

Runs at http://localhost:5175.

## Build

```bash
npm run build
```

Output is in `dist/`.

## iOS / App Store (no Mac required)

The app is built for iOS using **GitHub Actions** on macOS runners. You never need a Mac.

1. **One-time setup:** Create an Apple Developer account, App ID, distribution certificate (.p12), and provisioning profile, then add them as [GitHub Actions secrets](https://github.com/YOUR_USERNAME/weaver-golf/settings/secrets/actions). Full step-by-step from Windows: **[docs/APPSTORE-SETUP.md](docs/APPSTORE-SETUP.md)**.
2. **Build:** Push to `main`/`master` or run **Actions → Build iOS → Run workflow**. The workflow produces an IPA and can optionally upload it to TestFlight.
3. **Submit:** In App Store Connect, use the build from TestFlight to submit to the App Store.

If you have a Mac, you can also open the project in Xcode: `npm run cap:open:ios` (after `npm run cap:sync`).

No Firebase, auth, or router—just the game.
