import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeAudio } from "./api.js";

const Recognition =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const PAUSE_MS = 1500;

const fresh = () => ({ last: null, spanMs: 0, pauses: 0, longestMs: 0, heard: false });

export function useSpeech({ lang, onText }) {
  const supported =
    Boolean(Recognition) ||
    (typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia));

  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100
  const [transcribing, setTranscribing] = useState(false);
  const [nativeBlocked, setNativeBlocked] = useState(false);
  const [error, setError] = useState("");
  const [liveStreamActive, setLiveStreamActive] = useState(false);

  const rec = useRef(null);
  const want = useRef(false);
  const stats = useRef(fresh());
  const onTextRef = useRef(onText);
  const currentLang = useRef(lang || (typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US"));

  // Web Audio & MediaRecorder refs
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const animFrameRef = useRef(null);

  // Live transcript accumulation refs
  const baseConfirmedRef = useRef(""); // Confirmed text across speech recognition restarts
  const currentFinalRef = useRef("");   // Current engine run's confirmed text
  const currentInterimRef = useRef(""); // Current in-flight unconfirmed text
  const nativeGotResultsRef = useRef(false);

  // Background AI auto-transcribe fallback refs (for Brave / network blocks)
  const isTranscribingSliceRef = useRef(false);
  const lastSliceSentTimeRef = useRef(0);
  const speechDetectedRef = useRef(false);
  const silentFramesCountRef = useRef(0);
  const turnStartTimeRef = useRef(null);

  useEffect(() => {
    onTextRef.current = onText;
  });

  const reset = useCallback(() => {
    stats.current = fresh();
    audioChunksRef.current = [];
    baseConfirmedRef.current = "";
    currentFinalRef.current = "";
    currentInterimRef.current = "";
    nativeGotResultsRef.current = false;
    isTranscribingSliceRef.current = false;
    lastSliceSentTimeRef.current = 0;
    speechDetectedRef.current = false;
    silentFramesCountRef.current = 0;
    turnStartTimeRef.current = null;
    setError("");
  }, []);

  // Transcribe recorded audio buffer with backend Gemini
  const triggerAutoTranscribe = useCallback(async () => {
    // If native speech recognition is already streaming text, don't interfere
    if (nativeGotResultsRef.current || isTranscribingSliceRef.current) {
      return;
    }

    if (audioChunksRef.current.length === 0) return;

    isTranscribingSliceRef.current = true;
    setTranscribing(true);

    try {
      const mime = mediaRecorderRef.current?.mimeType || "audio/webm";
      const blob = new Blob(audioChunksRef.current, { type: mime });
      if (blob.size > 1500) {
        const res = await transcribeAudio(blob);
        if (res?.text && !nativeGotResultsRef.current) {
          const cleaned = res.text.trim();
          baseConfirmedRef.current = cleaned;
          onTextRef.current?.({ finalText: cleaned, interim: "" });
        }
      }
    } catch (err) {
      console.warn("Background auto-transcribe notice:", err);
    } finally {
      isTranscribingSliceRef.current = false;
      setTranscribing(false);
      lastSliceSentTimeRef.current = Date.now();
    }
  }, []);

  // Stop microphone audio capture & visualizer
  const stopAudioMonitoring = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* already stopped */
      }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch {
        /* ignore */
      }
      audioContextRef.current = null;
    }

    setAudioLevel(0);
    setRecording(false);
    setLiveStreamActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      want.current = false;
      try {
        rec.current?.abort();
      } catch {
        /* ignore */
      }
      stopAudioMonitoring();
    };
  }, [stopAudioMonitoring]);

  // Start hardware audio capture + volume meter + MediaRecorder rolling buffer
  const startAudioMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setLiveStreamActive(true);

      // Web Audio API live meter
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateMeter = () => {
            if (!want.current) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const currentLevel = Math.min(100, Math.round((avg / 128) * 100));
            setAudioLevel(currentLevel);

            const now = Date.now();
            // Voice activity detection (VAD)
            if (currentLevel > 14) {
              speechDetectedRef.current = true;
              silentFramesCountRef.current = 0;
              stats.current.heard = true;

              // Periodic rolling auto-transcription for fallback (every ~2.8s of speech)
              if (
                !nativeGotResultsRef.current &&
                now - lastSliceSentTimeRef.current > 2800 &&
                !isTranscribingSliceRef.current
              ) {
                lastSliceSentTimeRef.current = now;
                triggerAutoTranscribe();
              }
            } else {
              silentFramesCountRef.current += 1;
              // If user spoke and has paused for ~800ms (roughly 45 frames)
              if (
                speechDetectedRef.current &&
                silentFramesCountRef.current > 45 &&
                !nativeGotResultsRef.current &&
                now - lastSliceSentTimeRef.current > 1800 &&
                !isTranscribingSliceRef.current
              ) {
                lastSliceSentTimeRef.current = now;
                triggerAutoTranscribe();
              }
            }

            animFrameRef.current = requestAnimationFrame(updateMeter);
          };
          updateMeter();
        } catch {
          /* AudioContext fallback */
        }
      }

      // MediaRecorder for continuous rolling audio recording
      if (typeof MediaRecorder !== "undefined") {
        audioChunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        recorder.start(800); // 800ms slices for responsive live buffer
        mediaRecorderRef.current = recorder;
        setRecording(true);
      }
    } catch (err) {
      console.warn("Microphone capture error:", err);
      setError("Microphone permission was denied or not found.");
    }
  }, [triggerAutoTranscribe]);

  const start = useCallback(() => {
    setError("");
    want.current = true;
    turnStartTimeRef.current = Date.now();
    stats.current.last = null;
    startAudioMonitoring();

    if (!Recognition) {
      setListening(true);
      setNativeBlocked(true);
      return;
    }

    try {
      rec.current?.abort();
    } catch {
      /* ignore */
    }

    const r = new Recognition();
    r.lang = currentLang.current;
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

      // Extract full results cleanly from index 0 to e.results.length - 1
      let finalPortion = "";
      let interimPortion = "";
      for (let i = 0; i < e.results.length; i++) {
        const item = e.results[i];
        if (item.isFinal) {
          finalPortion += item[0].transcript + " ";
        } else {
          interimPortion += item[0].transcript;
        }
      }

      currentFinalRef.current = finalPortion.trim();
      currentInterimRef.current = interimPortion.trim();

      const combinedFinal = (
        (baseConfirmedRef.current ? baseConfirmedRef.current + " " : "") +
        currentFinalRef.current
      ).trim();

      if (combinedFinal || currentInterimRef.current) {
        nativeGotResultsRef.current = true;
        setNativeBlocked(false);
      }

      onTextRef.current?.({
        finalText: combinedFinal,
        interim: currentInterimRef.current,
      });
    };

    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "network") {
        // In Brave or on network blocks, browser speech triggers network error.
        // We activate background AI transcription fallback!
        setNativeBlocked(true);
      }
      setListening(false);
    };

    r.onend = () => {
      if (want.current && !nativeBlocked) {
        // Roll confirmed text into base confirmed so restart doesn't drop sentences
        if (currentFinalRef.current) {
          baseConfirmedRef.current = (
            (baseConfirmedRef.current ? baseConfirmedRef.current + " " : "") +
            currentFinalRef.current
          ).trim();
          currentFinalRef.current = "";
        }
        try {
          r.start();
          setListening(true);
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
      setNativeBlocked(true);
    }
  }, [startAudioMonitoring, nativeBlocked]);

  const stop = useCallback(() => {
    want.current = false;
    try {
      rec.current?.stop();
    } catch {
      /* ignore */
    }
    stopAudioMonitoring();
    setListening(false);
  }, [stopAudioMonitoring]);

  // Transcribe full recorded audio on demand (e.g. upon finishing)
  const transcribeRecorded = useCallback(async () => {
    if (audioChunksRef.current.length === 0) return "";
    setTranscribing(true);
    try {
      const mime = mediaRecorderRef.current?.mimeType || "audio/webm";
      const blob = new Blob(audioChunksRef.current, { type: mime });
      const res = await transcribeAudio(blob);
      if (res?.text) {
        const cleaned = res.text.trim();
        baseConfirmedRef.current = cleaned;
        onTextRef.current?.({ finalText: cleaned, interim: "" });
        return cleaned;
      }
      return "";
    } catch {
      return "";
    } finally {
      setTranscribing(false);
    }
  }, []);

  const getMetrics = useCallback(() => {
    const s = stats.current;
    if (!s.heard && !audioChunksRef.current.length && !turnStartTimeRef.current) return null;
    const now = Date.now();
    const elapsedSec = turnStartTimeRef.current
      ? Math.max(3.0, (now - turnStartTimeRef.current) / 1000)
      : (s.spanMs / 1000) || 15.0;

    return {
      duration_s: +elapsedSec.toFixed(1),
      pauses: s.pauses || 0,
      longest_pause_s: +(s.longestMs / 1000).toFixed(1) || 0,
    };
  }, []);

  return {
    supported,
    listening,
    recording,
    audioLevel,
    transcribing,
    nativeBlocked,
    liveStreamActive,
    error,
    start,
    stop,
    reset,
    transcribeRecorded,
    triggerAutoTranscribe,
    getMetrics,
  };
}
