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
phroom1.html          "Will it fit?" — measures the customer's space in a photo and says if the machine fits
phroom-ai-worker.js   The room AIs for phroom.html / phroom1.html (floor/furniture segmentation, 3D depth), off the main thread
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
  front of it; drag with one finger to move, twist with two fingers to turn, long-press to place it exactly.
- **Sizes it from the room**: things of known height in the photo (doors, counters, fridge,
  stove, sofa, wardrobe, wall-to-ceiling), the photo's lens (EXIF) and its vertical lines.
- **3D depth scan** when the photo has nothing of known height: a depth AI (Metric3D, 145 MB,
  WebGPU) measures the room. Downloads by itself on a computer; phones ask first.
- **A size badge** on the photo always says how the size was worked out — green "Sized from the
  door / counter / 3D scan…", or yellow "Estimated size", which offers the ways to make it exact.
- **📏 Measure** for an exact fit: touch the bottom and top of a door, table, counter or
  anything you know the height of.
- **In-app camera** on phones: a level, tilt guidance, and the phone's tilt saved with the
  photo — the one thing a photo can't tell the sizing by itself.
- **Save** makes a JPEG at the photo's own resolution (up to 2560 px), ready to share.

Tested on 16 real room photos. On the ones with nothing of known size in view, checked against
hand-measured objects, the old guess drew the machine 16–62% too small; the depth scan brings
that to within 1–21%, marking one known object with Calibrate to within ~1–8%, and the in-app
camera's recorded tilt alone took one of them (my_pg) to within 2.5%.

## phroom1.html — "Will it fit?" in a photo (fit in room, not just view in room)
`phroom.html` shows the machine at the room's *estimated* scale — right to 5–20%, fine for seeing
how it looks, not for "will it go in this 62 cm gap". `phroom1.html` measures the actual space and
compares it with IFB's datasheet size plus the gaps a machine needs (≥1 cm each side — 2.5 cm is
comfortable — 5 cm behind for hoses, 2 cm above).

**How the space is measured — the customer picks one:**

| Method | What the customer does | Width accuracy (tested) |
|---|---|---|
| 📄 **A4 sheet on the floor** (recommended) | Lays a sheet of A4 in the space, takes the photo; the app finds the sheet, the customer checks its corners | ~1.4% RMS when found automatically (±~1 cm on a 64 cm gap) |
| 🔲 **Floor tiles** | Drags 4 dots onto a tile (or 2×2 block) at the space, picks the tile size | ~2% RMS |
| 📏 **I measured it** | Types the tape / phone-Measure-app width (depth, height optional) | exact (±0.5 cm) |
| 🚪 **Door or counter height** | Marks something of known height (the existing Measure tool) | ~3.5% RMS |
| ✋ **Your hand** | Lays a hand flat across the front of the space (fingers sideways), taps wrist + fingertip, picks a typical (man ~18.5 / woman ~17 cm) or measured hand length | ~5.5% RMS typical length, ~4% measured (in-app camera, which records the phone's tilt); wider from a gallery photo |
| ✨ **Quick estimate** | Nothing — the AI judges the room | rough: only firm for clearly roomy / clearly hopeless spaces |
| 📱 **Live AR** | Opens the phone's own AR (ARKit / ARCore via `<model-viewer>`, `ar-scale="fixed"`) at true size | visual check, no numbers |

Then the customer marks the space on the photo — its left and right sides where they meet the floor,
optionally the wall behind (depth) and the underside of a counter above (height) — with a magnifier,
and a live readout and the machine's footprint drawn in green/red as they go. The answer:
**✅ Fits / ✅ Fits, snugly / ⚠️ Too close to call / ❌ Won't fit**, decided on the whole error band
(a Monte-Carlo over every corner and tap), never on the middle value alone; the machine is then
stood in the space, square to it, and the saved picture carries the verdict.

**How the A4 sheet sizes the room:** the sheet's four corners give the floor-to-photo homography;
from it the phone's height, tilt, roll and lens are fitted (Levenberg–Marquardt, with a phone's
usual lens, a hand-held height and the in-app camera's recorded tilt as priors, and the lens left
open between 1x / ultra-wide / zoom when the photo can't tell). The sheet finder looks for a bright,
darker, coloured or edge-bounded smooth quadrilateral on the floor, snaps its sides to sub-pixel
edges, and only calls it "found" when all four edges are clean and stop at the corners — otherwise
it asks the customer to check.

**Tested** (all without anyone's help, in the browser): 150–300 synthetic rooms per case rendered
with three.js with known answers (floors: white/beige/grey tiles, wood, granite; random gaps,
phone heights, tilts, rolls, lenses, lighting, shadows, JPEG noise), and the 16 real room photos in
`test_image/` with an A4 sheet composited on the floor. Found automatically on 14/16 real photos
(all within 1 px), never a confident wrong detection; **no wrong fit verdicts in any test** — when
the error band straddles the limit it says "too close to call" and points to the tape measure.
Hardest case: a white sheet on white tiles, or half in shadow — then the customer drags the dots.
The hand is the least precise reference (small in the photo, and people's hands differ), so its
verdicts are firm only with a clear margin; if the room's angle can't be read at all (the implied
phone height comes out impossible) the page says so instead of giving a size.

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
