import { useCallback, useEffect, useRef, useState } from "react";

const Recognition =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const PAUSE_MS = 2000; // a gap this long between speech events counts as a pause

const ERRORS = {
  "not-allowed": "Microphone access was blocked. Allow it in the address bar and try again.",
  "service-not-allowed": "Microphone access was blocked. Allow it in the address bar and try again.",
  "audio-capture": "No microphone was found.",
  network: "Speech recognition needs an internet connection.",
};

const fresh = () => ({ last: null, spanMs: 0, pauses: 0, longestMs: 0, heard: false });

export function useSpeech({ lang = "en-IN", onText }) {
  const supported = Boolean(Recognition);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef(null);
  const want = useRef(false);
  const stats = useRef(fresh());
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  });

  useEffect(
    () => () => {
      want.current = false;
      rec.current?.abort();
    },
    []
  );

  const reset = useCallback(() => {
    stats.current = fresh();
  }, []);

  const start = useCallback(() => {
    if (!Recognition || want.current) return;
    setError("");
    const r = new Recognition();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;

    r.onresult = (e) => {
      const now = Date.now();
      const s = stats.current;
      if (s.last !== null) {
        const gap = now - s.last;
        s.spanMs += gap;
        if (gap > PAUSE_MS) {
          s.pauses += 1;
          s.longestMs = Math.max(s.longestMs, gap);
        }
      }
      s.last = now;
      s.heard = true;
      let finalText = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      onTextRef.current?.({ finalText, interim });
    };

    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      want.current = false;
      setListening(false);
      setError(ERRORS[e.error] || `Speech recognition error: ${e.error}`);
    };

    // Browsers end continuous recognition after a stretch of silence: restart while the user wants it on.
    r.onend = () => {
      if (want.current) {
        try {
          r.start();
        } catch {
          want.current = false;
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    rec.current = r;
    want.current = true;
    stats.current.last = null; // time spent not listening is not a pause
    try {
      r.start();
      setListening(true);
    } catch {
      want.current = false;
      setError("Could not start the microphone.");
    }
  }, [lang]);

  const stop = useCallback(() => {
    want.current = false;
    rec.current?.stop();
    setListening(false);
    onTextRef.current?.({ finalText: "", interim: "" });
  }, []);

  // Timing only; word counts and filler words are computed on the server from the final text.
  const getMetrics = useCallback(() => {
    const s = stats.current;
    if (!s.heard) return null;
    return {
      duration_s: +(s.spanMs / 1000).toFixed(1),
      pauses: s.pauses,
      longest_pause_s: +(s.longestMs / 1000).toFixed(1),
    };
  }, []);

  return { supported, listening, error, start, stop, reset, getMetrics };
}