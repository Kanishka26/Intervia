// Pure functions, no camera or MediaPipe needed, so they are easy to test and tune.
// Landmark indices refer to MediaPipe's face mesh.
const NOSE = 1;
const FOREHEAD = 10;
const CHIN = 152;
const FACE_LEFT = 234;
const FACE_RIGHT = 454;

// Rough starting thresholds, measured relative to a baseline taken while you look at the screen.
// They are NOT validated values: adjust them after trying the camera yourself.
export const LIMITS = { yaw: 0.13, pitch: 0.09, gazeX: 0.45, gazeY: 0.5 };
export const AWAY_MIN_MS = 1500; // looking away shorter than this is ignored
export const MIN_FRAMES = 15; // need about 3 seconds of samples before reporting

const round1 = (n) => Math.round(n * 10) / 10;

// Head turn (yaw) and tilt (pitch) proxies from where the nose sits inside the face outline.
export function poseRatios(lm) {
  const width = Math.abs(lm[FACE_RIGHT].x - lm[FACE_LEFT].x);
  const height = Math.abs(lm[CHIN].y - lm[FOREHEAD].y);
  if (width < 1e-6 || height < 1e-6) return null;
  const midX = (lm[FACE_LEFT].x + lm[FACE_RIGHT].x) / 2;
  return { yaw: (lm[NOSE].x - midX) / width, pitch: (lm[NOSE].y - lm[FOREHEAD].y) / height };
}

// Eye direction from MediaPipe's eye blendshape scores (each 0 to 1).
export function gazeOffset(categories) {
  const v = {};
  for (const c of categories) v[c.categoryName] = c.score;
  const g = (name) => v[name] ?? 0;
  return {
    x: (g("eyeLookOutLeft") - g("eyeLookInLeft") + (g("eyeLookInRight") - g("eyeLookOutRight"))) / 2,
    y: (g("eyeLookUpLeft") + g("eyeLookUpRight") - (g("eyeLookDownLeft") + g("eyeLookDownRight"))) / 2,
  };
}

export function meanSample(samples) {
  const m = { yaw: 0, pitch: 0, gx: 0, gy: 0 };
  for (const s of samples) for (const k of Object.keys(m)) m[k] += s[k] / samples.length;
  return m;
}

export function isFacing(sample, base, limits = LIMITS) {
  if (!sample || !base) return false; // no face in view counts as not facing
  return (
    Math.abs(sample.yaw - base.yaw) < limits.yaw &&
    Math.abs(sample.pitch - base.pitch) < limits.pitch &&
    Math.abs(sample.gx - base.gx) < limits.gazeX &&
    Math.abs(sample.gy - base.gy) < limits.gazeY
  );
}

// Accumulates one answer's worth of samples (about 5 per second).
export class FrameTracker {
  constructor() {
    this.base = null;
    this.reset();
  }

  setBaseline(samples) {
    if (samples.length < 5) return false;
    this.base = meanSample(samples);
    return true;
  }

  reset() {
    this.frames = 0;
    this.faces = 0;
    this.facing = 0;
    this.awayStart = null;
    this.awayEvents = 0;
    this.longestAwayMs = 0;
  }

  add(sample, t) {
    if (!this.base) return;
    this.frames += 1;
    if (sample) this.faces += 1;
    if (isFacing(sample, this.base)) {
      this.facing += 1;
      this.closeAway(t);
    } else if (this.awayStart === null) {
      this.awayStart = t;
    }
  }

  closeAway(t) {
    if (this.awayStart === null) return;
    const d = t - this.awayStart;
    if (d >= AWAY_MIN_MS) {
      this.awayEvents += 1;
      this.longestAwayMs = Math.max(this.longestAwayMs, d);
    }
    this.awayStart = null;
  }

  metrics(now) {
    if (this.frames < MIN_FRAMES) return null;
    let events = this.awayEvents;
    let longest = this.longestAwayMs;
    if (this.awayStart !== null) {
      const d = now - this.awayStart; // an away run still open when the answer is sent
      if (d >= AWAY_MIN_MS) {
        events += 1;
        longest = Math.max(longest, d);
      }
    }
    return {
      frames: this.frames,
      face_pct: round1((100 * this.faces) / this.frames),
      facing_pct: round1((100 * this.facing) / this.frames),
      away_events: events,
      longest_away_s: round1(longest / 1000),
    };
  }
}