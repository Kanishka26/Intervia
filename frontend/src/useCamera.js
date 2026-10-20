import { useCallback, useEffect, useRef, useState } from "react";
import { FrameTracker, gazeOffset, isFacing, poseRatios } from "./vision/faceMath.js";

const SAMPLE_MS = 200; // aim for about 5 samples per second
const CALIBRATION_MS = 2500;
const STALL_MS = 3000; // no new video frame for this long = feed looks frozen
const WASM_DIR = "/mediapipe/wasm";
const MODEL = "/mediapipe/face_landmarker.task";

function friendly(e) {
  if (e?.name === "NotAllowedError") return "Camera access was blocked. Allow it in the address bar and try again.";
  if (e?.name === "NotFoundError") return "No camera was found.";
  if (e?.name === "NotReadableError") return "The camera is being used by another app.";
  if (/fetch|404|model|wasm|load/i.test(String(e?.message ?? e))) {
    return 'Face tracking files are missing. Run "npm run setup:vision" in the frontend folder, then reload.';
  }
  return `Could not start the camera: ${e?.message || e}`;
}

export function useCamera() {
  const supported = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
  const videoRef = useRef(null);
  const [status, setStatus] = useState("off"); // off | loading | calibrating | on | error
  const [error, setError] = useState("");
  const [facing, setFacing] = useState(null); // live: true / false / null (not tracking yet)
  const [stalled, setStalled] = useState(false); // live: the video feed stopped updating
  const live = useRef({
    stream: null, landmarker: null, timer: null, running: false,
    calib: [], calibUntil: 0, retries: 0, lastTime: -1, stalledSince: null,
  });
  const tracker = useRef(new FrameTracker());

  const stopAll = useCallback(() => {
    const l = live.current;
    l.running = false;
    if (l.timer) clearTimeout(l.timer);
    l.timer = null;
    l.stream?.getTracks().forEach((t) => t.stop());
    l.stream = null;
    try {
      l.landmarker?.close();
    } catch {
      /* already closed */
    }
    l.landmarker = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setFacing(null);
    setStalled(false);
  }, []);

  useEffect(() => stopAll, [stopAll]); // release the camera when leaving the page

  // One detection. Frames that did not change are skipped, so a frozen feed can never produce numbers.
  const step = useCallback(() => {
    const l = live.current;
    const video = videoRef.current;
    if (!l.landmarker || !video || video.readyState < 2) return;
    const now = performance.now();

    if (video.paused) video.play().catch(() => {});
    if (video.currentTime === l.lastTime) {
      l.stalledSince ??= now;
      if (now - l.stalledSince > STALL_MS) setStalled(true);
      return;
    }
    l.lastTime = video.currentTime;
    l.stalledSince = null;
    setStalled(false);

    let sample = null;
    try {
      const r = l.landmarker.detectForVideo(video, now);
      const face = r.faceLandmarks?.[0];
      const pose = face ? poseRatios(face) : null;
      if (pose) {
        const g = gazeOffset(r.faceBlendshapes?.[0]?.categories ?? []);
        sample = { ...pose, gx: g.x, gy: g.y };
      }
    } catch {
      return;
    }

    if (!tracker.current.base) {
      // Calibration: learn what "looking at the screen" looks like for this person and camera.
      if (sample) l.calib.push(sample);
      if (now >= l.calibUntil) {
        if (tracker.current.setBaseline(l.calib)) {
          setStatus("on");
        } else if (l.retries < 2) {
          l.retries += 1;
          l.calibUntil = now + CALIBRATION_MS;
        } else {
          stopAll();
          setError("Could not see your face. Check the lighting and that nothing covers the camera.");
          setStatus("error");
        }
      }
      return;
    }
    setFacing(isFacing(sample, tracker.current.base));
    tracker.current.add(sample, now);
  }, [stopAll]);

  // Self-scheduling loop: waits at least twice as long as each detection took,
  // so a slow machine keeps its page (and the video preview) responsive.
  const loop = useCallback(() => {
    const l = live.current;
    if (!l.running) return;
    const t0 = performance.now();
    step();
    const spent = performance.now() - t0;
    l.timer = setTimeout(loop, Math.max(SAMPLE_MS - spent, spent * 2, 50));
  }, [step]);

  const enable = useCallback(async () => {
    if (!supported || status === "loading" || status === "calibrating" || status === "on") return;
    setError("");
    setStatus("loading");
    const l = live.current;
    try {
      l.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      const video = videoRef.current;
      video.srcObject = l.stream;
      await video.play();

      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_DIR);
      const make = (delegate) =>
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL, delegate },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
      try {
        l.landmarker = await make("GPU");
      } catch {
        l.landmarker = await make("CPU"); // some machines have no usable GPU path
      }

      tracker.current = new FrameTracker();
      l.calib = [];
      l.retries = 0;
      l.calibUntil = performance.now() + CALIBRATION_MS;
      l.lastTime = -1;
      l.stalledSince = null;
      l.running = true;
      setStatus("calibrating");
      loop();
    } catch (e) {
      stopAll();
      setError(friendly(e));
      setStatus("error");
    }
  }, [supported, status, loop, stopAll]);

  const disable = useCallback(() => {
    stopAll();
    setStatus("off");
  }, [stopAll]);

  // Re-learn "looking at the screen", for example after you shift in your chair.
  const recalibrate = useCallback(() => {
    const l = live.current;
    if (!l.landmarker) return;
    tracker.current = new FrameTracker();
    l.calib = [];
    l.retries = 0;
    l.calibUntil = performance.now() + CALIBRATION_MS;
    setStatus("calibrating");
  }, []);

  const reset = useCallback(() => tracker.current.reset(), []);

  // Counts only, never video: { frames, face_pct, facing_pct, away_events, longest_away_s } or null.
  const getMetrics = useCallback(
    () => (tracker.current.base ? tracker.current.metrics(performance.now()) : null),
    []
  );

  return { supported, status, error, facing, stalled, videoRef, enable, disable, recalibrate, reset, getMetrics };
}