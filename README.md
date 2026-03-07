# Weaver Golf

Standalone 3-hole mini golf game. Same game as in GoGoPlanet, packaged as its own app for eventual release (e.g. Apple App Store).

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output is in `dist/` (static files; can be deployed to any host or wrapped for native).

## App Store path

This is a Vite + React web app. To ship to the Apple App Store you can later:

- Use **Capacitor** (or similar) to wrap the built web app in a native iOS shell, then submit to App Store Connect.
- Or use **PWA** + “Add to Home Screen” for a simpler install flow without the store.

No Firebase, auth, or router—just the game.
