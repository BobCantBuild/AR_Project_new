# AR_Project_new — IFB Washing Machine AR Viewer

A **browser-only Web-AR** page: view an IFB washing machine in 3D and place it in your
own room at real size — on Android, iPhone, tablet or laptop. **No app needed.**

**Live site:** https://bobcantbuild.github.io/AR_Project_new/

Built with Google [`<model-viewer>`](https://modelviewer.dev) — the same "view in your room"
pattern Shopify and Amazon use (GLB for web/Android, auto-USDZ for iPhone Quick Look).

## What's here
```
index.html            Product 3D/AR viewer (model-viewer, pinned 4.3.1)
phroom.html           "See it in your room" — AI places the machine into a room photo at real size
phroom-ai-worker.js   The room AIs for phroom.html (floor/furniture segmentation, 3D depth), off the main thread
fit.html               "Will it fit?" live AR — 8th Wall SLAM, place at real scale
photo.html             "Add to a photo" — drop the machine into a still photo by hand, save/share
models/IFB_WM1.glb      The 3D model: IFB Executive MXC 9014, true scale (87.5 cm tall), compressed (3 MB)
models/source/          The original, uncompressed model (24.5 MB) — edit/re-export from this
assets/qr.png          QR code to the live site (shown to desktop users)
.nojekyll              Tells GitHub Pages to serve files as-is
AR-Washing-Machine-Viewer-Plan.pdf   Project plan & tech guide
```

Every page shows the machine at IFB's datasheet size for the Executive MXC 9014:
**W 59.8 × D 65 × H 87.5 cm** ([ifbappliances.com](https://www.ifbappliances.com/executive-mxc-9014-sslc)).

## phroom.html — "See it in your room" (browser-only, no app)
Take a photo with the in-app camera or choose one, and the machine appears on your floor at
its real size:
- **Finds the floor** (AI segmentation) and keeps the machine on it, clear of furniture in
  front of it; drag to move, drag the machine to turn it, long-press to place it exactly.
- **Sizes it from the room**: things of known height in the photo (doors, counters, fridge,
  stove, sofa, wardrobe, wall-to-ceiling), the photo's lens (EXIF) and its vertical lines.
- **3D depth scan** when the photo has nothing of known height: a depth AI (Metric3D, 145 MB,
  WebGPU) measures the room. Downloads by itself on a computer; phones ask first.
- **📏 Calibrate size** for an exact fit: touch the bottom and top of a door, table, counter or
  anything you know the height of.
- **In-app camera** on phones: a level, tilt guidance, and the phone's tilt saved with the
  photo — the one thing a photo can't tell the sizing by itself.
- **Save** makes a JPEG at the photo's own resolution (up to 2560 px), ready to share.

Tested on 16 real room photos. On the ones with nothing of known size in view, checked against
hand-measured objects, the old guess drew the machine 16–62% too small; the depth scan brings
that to within 1–21%, marking one known object with Calibrate to within ~1–8%, and the in-app
camera's recorded tilt alone took one of them (my_pg) to within 2.5%.

## fit.html — "Will it fit?" (AR, browser-only)
Live camera + 8th Wall in-browser SLAM (works in stock Safari on iPhone and Chrome on
Android, no app). Aim at the floor → a reticle appears → tap **Place** and the machine is
**anchored at its real 87.5 cm size**; drag to rotate, or use **Move / Reset**. Measurement +
"fits / too tight" verdict are the next milestones.

> **8th Wall license:** the SLAM engine binary is free for commercial use under a limited-use
> license and requires the **"Powered by 8th Wall"** credit (kept in `fit.html`). IFB should
> review the terms before a full commercial launch. Loaded from jsDelivr, pinned to `1.0.0`.

## photo.html — "Add it to a photo" (browser-only, works everywhere)
Take or upload a photo of the room, then the real 3D machine is composited on top (three.js +
PBR lighting + a soft contact shadow). Drag to position, and **Size / Rotate / Angle** sliders
to match the room; then **Save picture** (Web Share on mobile, download on desktop). Rock-stable
(a still image — no drift), works on laptops too, and preserves the exact product look.
Phase 2 (later) adds client-side AI auto-placement. Note: a photo can't truly *measure* — use
`fit.html` for fit-checking.

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
Replace `models/IFB_WM1.glb` with your own GLB (keep the same filename, or update `src` in
`index.html`). For accurate AR size, author the GLB in **metres** (1 unit = 1 m) with its
**origin at the base-centre** so it rests flat on the floor. Keep it compressed — the current
one was made from `models/source/IFB_WM1.glb` with [glTF Transform](https://gltf-transform.dev):
```
npx @gltf-transform/cli@4 resize in.glb a.glb --pattern "<front texture>*" --width 2048 --height 2048
npx @gltf-transform/cli@4 webp a.glb b.glb --slots "baseColorTexture" --quality 90
npx @gltf-transform/cli@4 meshopt b.glb out.glb --level high
```
Every page already loads meshopt-compressed models. For a different machine, also update its
size: `heightCm`/`specCm` in `phroom.html` and `fit.html`, `SPEC` in `photo.html`,
`fit-stable.html` and `index.html`.

## iPhone note
iPhone AR uses Apple Quick Look; `<model-viewer>` generates the USDZ automatically from the
GLB. For best iPhone fidelity you can later add a hand-authored `IFB_WM1.usdz` and point
`ios-src` at it in `index.html`.
