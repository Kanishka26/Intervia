import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORE_KEY = "intervia:voice";

// Chrome stops reading long utterances after about 15 seconds, so speak one short chunk at a time.
export function splitSentences(text, maxLen = 200) {
  const parts = text.replace(/\s+/g, " ").trim().match(/[^.!?]+(?:[.!?]+|$)\s*/g) || [text];
  const out = [];
  for (const raw of parts) {
    const t = raw.trim();
    if (!t) continue;
    if (out.length && out[out.length - 1].length < 40) out[out.length - 1] += " " + t;
    else out.push(t);
  }
  const limited = [];
  for (const chunk of out) {
    if (chunk.length <= maxLen) {
      limited.push(chunk);
      continue;
    }
    let cur = "";
    for (const piece of chunk.split(/,\s+/)) {
      if (cur && (cur + ", " + piece).length > maxLen) {
        limited.push(cur);
        cur = piece;
      } else {
        cur = cur ? cur + ", " + piece : piece;
      }
    }
    if (cur) limited.push(cur);
  }
  return limited;
}

// Prefer natural-sounding voices (Edge "Online (Natural)", Chrome "Google ..."), then Indian or US/UK English.
export function rankVoice(v) {
  let s = 0;
  if (/natural|online/i.test(v.name)) s += 4;
  if (/en-IN/i.test(v.lang)) s += 2;
  if (/en-(US|GB)/i.test(v.lang)) s += 1;
  if (/google/i.test(v.name)) s += 1;
  return s;
}

export function pickVoice(voices, savedName) {
  if (!voices.length) return null;
  const saved = voices.find((v) => v.name === savedName);
  if (saved) return saved;
  return [...voices].sort((a, b) => rankVoice(b) - rankVoice(a))[0];
}

export function useTts() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [voices, setVoices] = useState([]);
  const [savedName, setSavedName] = useState(() => {
    try {
      return localStorage.getItem(STORE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [speaking, setSpeaking] = useState(false);
  const token = useRef(0);

  useEffect(() => {
    if (!supported) return undefined;
    const load = () => setVoices(window.speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang)));
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      token.current += 1;
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const voice = useMemo(() => pickVoice(voices, savedName), [voices, savedName]);

  const setVoiceName = useCallback((name) => {
    setSavedName(name);
    try {
      localStorage.setItem(STORE_KEY, name);
    } catch {
      /* storage unavailable: the choice just won't persist */
    }
  }, []);

  const cancel = useCallback(() => {
    token.current += 1;
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  // Resolves when the whole text has been spoken (or was cancelled).
  const speak = useCallback(
    (text) =>
      new Promise((resolve) => {
        if (!supported || !text) {
          resolve();
          return;
        }
        const mine = ++token.current;
        window.speechSynthesis.cancel();
        const chunks = splitSentences(text);
        let i = 0;
        setSpeaking(true);

        const finish = () => {
          if (mine === token.current) setSpeaking(false);
          resolve();
        };
        const next = () => {
          if (mine !== token.current) {
            resolve();
            return;
          }
          if (i >= chunks.length) {
            finish();
            return;
          }
          const chunk = chunks[i++];
          const u = new SpeechSynthesisUtterance(chunk);
          if (voice) {
            u.voice = voice;
            u.lang = voice.lang;
          }
          // Some voices never fire "end": move on after a generous estimate instead of hanging.
          const guard = setTimeout(next, Math.max(4000, chunk.length * 130));
          const done = () => {
            clearTimeout(guard);
            next();
          };
          u.onend = done;
          u.onerror = done;
          window.speechSynthesis.speak(u);
        };
        next();
      }),
    [supported, voice]
  );

  return { supported, voices, voice, setVoiceName, speaking, speak, cancel };
}