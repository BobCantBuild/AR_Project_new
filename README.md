# AR_Project_new — IFB Washing Machine AR Viewer

A **browser-only Web-AR** page: view an IFB washing machine in 3D and place it in your
own room at real size — on Android, iPhone, tablet or laptop. **No app needed.**

**Live site:** https://bobcantbuild.github.io/AR_Project_new/

Built with Google [`<model-viewer>`](https://modelviewer.dev) — the same "view in your room"
pattern Shopify and Amazon use (GLB for web/Android, auto-USDZ for iPhone Quick Look).

## What's here
```
index.html            Product 3D/AR viewer (model-viewer, pinned 4.3.1)
fit.html               "Will it fit?" AR — 8th Wall SLAM, place at real scale
models/IFB_WM.glb      The 3D washing-machine model (real scale: 85×59×62 cm)
assets/qr.png          QR code to the live site (shown to desktop users)
.nojekyll              Tells GitHub Pages to serve files as-is
AR-Washing-Machine-Viewer-Plan.pdf   Project plan & tech guide
```

## fit.html — "Will it fit?" (AR, browser-only)
Live camera + 8th Wall in-browser SLAM (works in stock Safari on iPhone and Chrome on
Android, no app). Aim at the floor → a reticle appears → tap **Place** and the machine is
**anchored at real 85 cm scale**; drag to rotate, or use **Move / Reset**. Measurement +
"fits / too tight" verdict are the next milestones.

> **8th Wall license:** the SLAM engine binary is free for commercial use under a limited-use
> license and requires the **"Powered by 8th Wall"** credit (kept in `fit.html`). IFB should
> review the terms before a full commercial launch. Loaded from jsDelivr, pinned to `1.0.0`.

## Features
- Live 3D preview (rotate / zoom) on every device.
- **View in your space** — floor-anchored AR at real 1:1 scale (`ar-placement="floor"`, `ar-scale="fixed"`).
- On-screen **dimensions** (H × W × D) read from the model.
- Desktop/laptop shows a **QR code** to continue on a phone (camera AR needs a phone).

## Host it on GitHub Pages (one-time)
1. Push this repo to `main` (see below).
2. On GitHub: **Settings → Pages → Build and deployment → Source: _Deploy from a branch_**,
   Branch: **main** / **/ (root)** → **Save**.
3. Wait ~1 minute; the site goes live at the Live-site URL above.

## Push updates
Every change is committed and pushed to `main`; GitHub Pages redeploys automatically.
```
git add -A
git commit -m "first commit"
git push
```

## Swapping the model
Replace `models/IFB_WM.glb` with your own GLB (keep the same filename, or update `src` in
`index.html`). For accurate AR size, author the GLB in **metres** (1 unit = 1 m) with its
**origin at the base-centre** so it rests flat on the floor. Keep it compressed (< ~5–10 MB).

## iPhone note
iPhone AR uses Apple Quick Look; `<model-viewer>` generates the USDZ automatically from the
GLB. For best iPhone fidelity you can later add a hand-authored `IFB_WM.usdz` and point
`ios-src` at it in `index.html`.
