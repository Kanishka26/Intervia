// One-time setup: copies the MediaPipe WASM runtime out of node_modules and downloads the face model,
// so face tracking works from your own server (no CDN needed at demo time).
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const out = join(root, "public", "mediapipe");
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const FILES = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

mkdirSync(join(out, "wasm"), { recursive: true });
for (const f of FILES) {
  if (!existsSync(join(src, f))) {
    console.error(`Missing ${f}. Run "npm install" first.`);
    process.exit(1);
  }
  cpSync(join(src, f), join(out, "wasm", f));
}
console.log("Copied the WASM runtime to public/mediapipe/wasm");

const modelPath = join(out, "face_landmarker.task");
if (existsSync(modelPath)) {
  console.log("Face model already present.");
} else {
  try {
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(modelPath, Buffer.from(await res.arrayBuffer()));
    console.log("Downloaded the face model to public/mediapipe/face_landmarker.task");
  } catch (e) {
    console.error(`Model download failed (${e.message}).`);
    console.error(`Download it manually from:\n  ${MODEL_URL}\nand save it as public/mediapipe/face_landmarker.task`);
    process.exit(1);
  }
}