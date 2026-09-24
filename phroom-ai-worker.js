// The room AIs for phroom.html, run off the page's main thread. Loading a model (parsing it, setting
// up the GPU) and every run of one used to block the page for seconds at a time -- a warm-up started
// early froze the upload screen mid-tap, and nothing responded during a run. In here they can take
// as long as they take without the page noticing. The page starts one of these per model (the
// segmenter, the depth model): onnxruntime can't interleave two models' GPU runs in one worker.
//
// Messages in:  { id, type: 'load' }                  -> { id, type: 'ready' }
//               { id, type: 'segment', image: url }   -> { id, type: 'result', out: [{ label, mask: { width, height, data } }] }
//               { id, type: 'depth', image: url }     -> { id, type: 'depth', width, height, data: Float32Array }
// Messages out, unasked: { type: 'progress', what: 'seg' | 'depth', pct }  while a model file downloads
// Any failure:  { id, type: 'error', message }
import { pipeline, env, AutoModel, AutoProcessor, RawImage } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/+esm';

env.allowLocalModels = false;
// onnxruntime logs a warning per model about which ops it kept on the CPU -- expected, and noise
if (env.backends && env.backends.onnx) env.backends.onnx.logLevel = 'error';
const session_options = { logSeverityLevel: 3 };
// a 1×1 PNG -- the model resizes every input to 512×512 anyway
const TINY_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const hasGPU = async () => !!(self.navigator && self.navigator.gpu && await self.navigator.gpu.requestAdapter().catch(() => null));
// several small config files report too; only a model file's progress means anything
const progressFor = (what) => (p) => {
  if (p && p.status === 'progress' && p.progress != null && /onnx/.test(p.file || '')) postMessage({ type: 'progress', what, pct: Math.round(p.progress) });
};

// ---- segmentation: which pixels are floor, wall, furniture ----
let segReady = null;
function load() {
  if (!segReady) {
    segReady = (async () => {
      // WebGPU when this device actually has an adapter, not just the API. Tested against CPU (wasm)
      // in this worker: wasm never touches the GPU, so it can't stall the page, but took ~10 s a
      // photo vs 2.4-3 s -- worth the one-time GPU warm-up below.
      const gpu = await hasGPU();
      const seg = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', {
        device: gpu ? 'webgpu' : 'wasm',
        dtype: gpu ? 'fp32' : 'q8',          // each device's usual choice, spelled out
        progress_callback: progressFor('seg'),
        session_options,
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

// ---- metric depth: how far away each pixel is ----
// Metric3D v2 (ViT-small, 144 MB). Only ever loaded when the page asks for it -- see the depth
// section of phroom.html for when that is. The full-precision file on purpose: the half-size fp16
// one overflows somewhere inside, and its depth came out noisy (4% off per pixel on average, some
// pixels 57%) and different on every run of the same photo. GPU only: on the CPU it's far too slow.
const DEPTH_MODEL = 'onnx-community/metric3d-vit-small';
let depthReady = null;
function loadDepth() {
  if (!depthReady) {
    depthReady = (async () => {
      if (!await hasGPU()) throw new Error('no-webgpu');
      const [model, processor] = await Promise.all([
        AutoModel.from_pretrained(DEPTH_MODEL, { device: 'webgpu', dtype: 'fp32', progress_callback: progressFor('depth'), session_options }),
        AutoProcessor.from_pretrained(DEPTH_MODEL),
      ]);
      return { session: Object.values(model.sessions)[0], processor };
    })().catch((e) => { depthReady = null; throw e; });
  }
  return depthReady;
}
async function depthMap(image) {
  const { session, processor } = await loadDepth();
  const { pixel_values: pv } = await processor(await RawImage.read(image));
  // Straight to the ONNX session: transformers.js has no depth post-processing for this model,
  // and the raw output is exactly what's wanted -- depth for a camera with a 1000 px focal length
  // at this resolution ("canonical"; the page rescales it to the photo's own lens).
  const res = await session.run({ [session.inputNames[0]]: pv.ort_tensor });
  const d = res.predicted_depth || res[session.outputNames[0]];
  const data = Float32Array.from(d.data);
  return { width: d.dims[d.dims.length - 1], height: d.dims[d.dims.length - 2], data };
}

self.onmessage = async (e) => {
  const { id, type, image } = e.data;
  try {
    if (type === 'depth') {
      const d = await depthMap(image);
      postMessage({ id, type: 'depth', width: d.width, height: d.height, data: d.data }, [d.data.buffer]);
      return;
    }
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
