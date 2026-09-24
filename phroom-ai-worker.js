// The room-segmentation AI for phroom.html, run off the page's main thread. Loading the model
// (parsing ~15 MB, setting up the GPU) and every run of it used to block the page for seconds at a
// time -- a warm-up started early froze the upload screen mid-tap, and nothing responded during a
// run. In here it can take as long as it takes without the page noticing.
//
// Messages in:  { id, type: 'load' }                  -> { id, type: 'ready' }
//               { id, type: 'segment', image: url }   -> { id, type: 'result', out: [{ label, mask: { width, height, data } }] }
// Messages out, unasked: { type: 'progress', pct }  while the model file downloads
// Any failure:  { id, type: 'error', message }
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/+esm';

env.allowLocalModels = false;
// a 1×1 PNG -- the model resizes every input to 512×512 anyway
const TINY_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

let segReady = null;
function load() {
  if (!segReady) {
    segReady = (async () => {
      // WebGPU when this device actually has an adapter, not just the API. Tested against CPU (wasm)
      // in this worker: wasm never touches the GPU, so it can't stall the page, but took ~10 s a
      // photo vs 2.4-3 s -- worth the one-time GPU warm-up below.
      const gpu = !!(self.navigator && self.navigator.gpu && await self.navigator.gpu.requestAdapter().catch(() => null));
      const seg = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', {
        device: gpu ? 'webgpu' : 'wasm',
        progress_callback: (p) => {
          // several small config files report too; only the model file's progress means anything
          if (p && p.status === 'progress' && p.progress != null && /onnx/.test(p.file || '')) postMessage({ type: 'progress', pct: Math.round(p.progress) });
        },
      });
      // One throwaway run: the first real one otherwise pays ~6 s of one-time GPU shader setup
      // (14 s vs 8 s on the same photo). It runs while the customer is choosing a photo. It isn't
      // entirely free -- compiling GPU shaders holds up the browser's other GPU work, so a tap that
      // lands mid-warm-up can take a couple of seconds to show -- but once done, every run is fast.
      await seg(TINY_IMAGE).catch(() => {});
      return seg;
    })().catch((e) => { segReady = null; throw e; });   // let the next request try again
  }
  return segReady;
}

self.onmessage = async (e) => {
  const { id, type, image } = e.data;
  try {
    const seg = await load();
    if (type === 'load') { postMessage({ id, type: 'ready' }); return; }
    const out = await seg(image);
    const masks = out.map((o) => ({ label: o.label, mask: o.mask ? { width: o.mask.width, height: o.mask.height, data: o.mask.data } : null }));
    // hand the pixel buffers over rather than copying them (deduped: a buffer can only move once)
    const buffers = [...new Set(masks.filter((o) => o.mask).map((o) => o.mask.data.buffer))];
    postMessage({ id, type: 'result', out: masks }, buffers);
  } catch (err) {
    postMessage({ id, type: 'error', message: String((err && err.message) || err) });
  }
};
