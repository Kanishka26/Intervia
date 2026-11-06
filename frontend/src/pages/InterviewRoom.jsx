import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Edit3,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  RotateCcw,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { finishSession, getSession, sendAnswer } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { loadSession, saveSession } from "../session.js";
import { useCamera } from "../useCamera.js";
import { useSpeech } from "../useSpeech.js";
import { useTts } from "../useTts.js";

const mmss = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function InterviewRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [state, setState] = useState(() => loadSession(id));
  const [restoring, setRestoring] = useState(() => !loadSession(id));
  const [phase, setPhase] = useState("lobby"); // lobby | speaking | listening | thinking
  const [replay, setReplay] = useState(0);
  const [answer, setAnswer] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [ttsOn, setTtsOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [isBrave, setIsBrave] = useState(false);

  const usedMic = useRef(false);
  const transcriptEndRef = useRef(null);

  // Check if user is on Brave
  useEffect(() => {
    if (navigator.brave && typeof navigator.brave.isBrave === "function") {
      navigator.brave.isBrave().then(setIsBrave).catch(() => {});
    }
  }, []);

  const speech = useSpeech({
    onText: ({ finalText, interim: partial }) => {
      if (finalText !== undefined) {
        setAnswer(finalText);
      }
      setInterim(partial || "");
    },
  });

  const camera = useCamera();
  const tts = useTts();

  // Keep latest refs for effects
  const latest = useRef({});
  latest.current = { micOn, ttsOn, speech, tts };

  // Scroll transcript into view when answer grows
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [answer, interim]);

  // Turn on camera automatically in lobby (video is compulsory)
  useEffect(() => {
    if (phase === "lobby" && camera.status === "off") {
      camera.enable();
    }
  }, [phase, camera.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore current session from backend if tab has no local state
  useEffect(() => {
    if (state) return undefined;
    let cancelled = false;
    getSession(id)
      .then((r) => {
        if (cancelled) return;
        if (r.status === "complete") {
          navigate(`/report/${id}`, { replace: true });
          return;
        }
        const next = {
          question: r.question,
          question_number: r.question_number,
          total_questions: r.total_questions,
          is_followup: r.is_followup,
        };
        saveSession(id, next);
        setState(next);
      })
      .catch(() => {})
      .finally(() => !cancelled && setRestoring(false));
    return () => {
      cancelled = true;
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const inLobby = phase === "lobby";

  // Session timer
  useEffect(() => {
    if (inLobby) return undefined;
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [inLobby]);

  // The AI reads the question aloud; the microphone stays paused so it cannot hear the AI
  useEffect(() => {
    if (phase !== "speaking" || !state?.question) return undefined;
    let cancelled = false;
    const { ttsOn: voiceOn, speech: sp, tts: t } = latest.current;
    sp.stop();
    (async () => {
      if (voiceOn && t.supported) {
        await t.speak(state.question);
      }
      if (!cancelled) setPhase("listening");
    })();
    return () => {
      cancelled = true;
      latest.current.tts.cancel();
    };
  }, [phase, state?.question, replay]); // eslint-disable-line react-hooks/exhaustive-deps

  // When it is candidate's turn to answer, enable microphone
  useEffect(() => {
    if (phase !== "listening") return undefined;
    const { micOn: mic, speech: sp } = latest.current;
    if (!mic || !sp.supported) return undefined;
    const timer = setTimeout(() => {
      usedMic.current = true;
      sp.start();
    }, 300);
    return () => clearTimeout(timer);
  }, [phase]);

  // Join the classroom after compulsory checks pass
  async function joinClassroom() {
    setError("");

    // Compulsory Camera Check
    if (!camera.stream && camera.status !== "on" && camera.status !== "calibrating") {
      try {
        await camera.enable();
      } catch {
        setError("Camera is compulsory for this interview classroom. Please allow camera access.");
        return;
      }
    }

    setMicOn(true);
    setPhase("speaking");
  }

  // Submit Answer
  async function submit() {
    let text = answer.trim();

    // If no text transcribed yet but audio was recorded, transcribe before submit
    if (!text && speech.recording) {
      const transcribed = await speech.transcribeRecorded();
      if (transcribed) {
        text = transcribed.trim();
        setAnswer(text);
      }
    }

    if (!text || phase === "thinking" || phase === "lobby") return;

    setError("");
    const metrics = usedMic.current ? speech.getMetrics() : null;
    const vision = camera.getMetrics(metrics?.duration_s || 10);
    speech.stop();
    tts.cancel();
    setPhase("thinking");
    try {
      const r = await sendAnswer(id, text, metrics, vision);
      if (r.status === "complete") {
        navigate(`/report/${id}`);
        return;
      }
      const next = {
        question: r.question,
        question_number: r.question_number,
        total_questions: r.total_questions,
        is_followup: r.is_followup,
      };
      saveSession(id, next);
      setState(next);
      setAnswer("");
      setInterim("");
      speech.reset();
      camera.reset();
      usedMic.current = false;
      setPhase("speaking");
    } catch (e) {
      if (e.message === "session not found") {
        sessionStorage.removeItem(`intervia:session:${id}`);
        navigate("/new");
        return;
      }
      setError(e.message);
      setPhase("listening");
    }
  }

  function clearAndRespeak() {
    if (phase !== "listening") return;
    setAnswer("");
    setInterim("");
    speech.reset();
  }

  async function endInterview() {
    if (
      !window.confirm(
        "End the interview now? The report will cover only the questions you have answered."
      )
    ) {
      return;
    }
    speech.stop();
    tts.cancel();
    try {
      await finishSession(id);
      navigate(`/report/${id}`);
    } catch (e) {
      setError(
        e.message === "answer at least one question first"
          ? "Please answer at least one question before ending."
          : e.message
      );
    }
  }

  function toggleMic() {
    if (micOn) {
      speech.stop();
      setMicOn(false);
    } else {
      setMicOn(true);
      if (phase === "listening" && speech.supported) {
        usedMic.current = true;
        speech.start();
      }
    }
  }

  function toggleVoice() {
    if (ttsOn) tts.cancel();
    setTtsOn(!ttsOn);
  }

  function repeatQuestion() {
    speech.stop();
    setPhase("speaking");
    setReplay((n) => n + 1);
  }

  function onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  if (!state && restoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#12152b] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-teal" />
          <p className="text-sm text-white/70">Connecting to interview classroom…</p>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#12152b] px-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1d2142] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/20 text-danger">
            <AlertCircle size={28} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Interview Not Found</h1>
          <p className="mt-2 text-sm text-white/60">
            This interview session may have expired or belongs to a different session.
          </p>
          <Link
            to="/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal px-5 py-2.5 font-display text-sm font-semibold text-white hover:bg-teal-dark"
          >
            Start New Interview
          </Link>
        </div>
      </div>
    );
  }

  const { question, question_number: n, total_questions: total, is_followup: followUp } = state;
  const name = user?.displayName || user?.email?.split("@")[0] || "Candidate";
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const isCandidateSpeaking = speech.audioLevel > 14 || Boolean(interim);
  const isAiSpeaking = phase === "speaking";
  const camActive = Boolean(camera.stream) || ["loading", "calibrating", "on"].includes(camera.status);

  return (
    <div
      onKeyDown={onKeyDown}
      className="relative flex min-h-screen flex-col bg-[#0e1124] text-white select-none lg:h-screen lg:overflow-hidden font-sans"
    >
      {/* Top Classroom Bar */}
      <header className="flex items-center justify-between border-b border-white/10 bg-[#161a33]/90 px-5 py-3 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="font-display text-xl font-black tracking-tight text-teal hover:opacity-90"
          >
            Intervia
          </Link>
          <div className="hidden sm:block h-4 w-px bg-white/15" />
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-teal/20 px-3 py-1 text-xs font-bold text-teal ring-1 ring-teal/40">
              <Radio size={12} className="animate-pulse" />
              QUESTION {n} OF {total}
            </span>
            {followUp && (
              <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-semibold text-gold ring-1 ring-gold/40">
                ⚡ Follow-up
              </span>
            )}
          </div>
        </div>

        {/* Center: Proctoring Active & Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3.5 py-1 text-xs text-white/80">
            <span className="flex h-2 w-2 rounded-full bg-danger animate-pulse" />
            <span className="font-semibold tracking-wide">REC • VIDEO PROCTORED</span>
          </div>
          <span className="tabular-nums font-mono text-xs text-white/60 bg-white/5 px-2.5 py-1 rounded-md">
            {mmss(elapsed)}
          </span>
        </div>

        {/* Right: Audio and Leave */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleVoice}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              ttsOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-danger/20 text-danger"
            }`}
            title={ttsOn ? "AI Voice Audio Enabled" : "AI Voice Audio Muted"}
          >
            {ttsOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span className="hidden md:inline">{ttsOn ? "AI Audio On" : "AI Audio Muted"}</span>
          </button>

          <button
            type="button"
            onClick={endInterview}
            className="flex items-center gap-1.5 rounded-lg bg-danger/80 hover:bg-danger px-3 py-1.5 text-xs font-semibold text-white transition-all shadow-sm"
          >
            <PhoneOff size={14} />
            <span className="hidden sm:inline">Leave Room</span>
          </button>
        </div>
      </header>

      {/* Main Classroom Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-row lg:p-5 overflow-hidden">
        {/* Left Stage: Video Classroom Grid (AI + Candidate) */}
        <main className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2 gap-4">
          {/* AI Interviewer Video Tile */}
          <div
            className={`relative flex min-h-[240px] flex-col items-center justify-center rounded-2xl border bg-[#161a33] p-6 transition-all shadow-lg overflow-hidden ${
              isAiSpeaking
                ? "border-teal ring-4 ring-teal/20"
                : "border-white/10 hover:border-white/20"
            }`}
          >
            {/* Ambient Background Glow when AI speaks */}
            {isAiSpeaking && (
              <div className="absolute inset-0 bg-gradient-to-t from-teal/10 via-transparent to-transparent pointer-events-none" />
            )}

            {/* AI Avatar with Soundwaves */}
            <div className="relative flex flex-col items-center">
              <div
                className={`relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-teal to-teal-dark text-white shadow-xl transition-all duration-300 ${
                  isAiSpeaking ? "scale-105 ring-8 ring-teal/30" : "ring-4 ring-white/10"
                }`}
              >
                <Sparkles size={48} className={isAiSpeaking ? "animate-pulse" : ""} />
              </div>

              {/* Dynamic Soundwave Bars under AI Avatar */}
              <div className="mt-5 flex h-6 items-center gap-1">
                {isAiSpeaking ? (
                  <>
                    <span className="wave-bar inline-block h-3 w-1 rounded-full bg-teal" style={{ animationDelay: "0ms" }} />
                    <span className="wave-bar inline-block h-6 w-1 rounded-full bg-teal" style={{ animationDelay: "150ms" }} />
                    <span className="wave-bar inline-block h-4 w-1 rounded-full bg-teal" style={{ animationDelay: "300ms" }} />
                    <span className="wave-bar inline-block h-7 w-1 rounded-full bg-teal" style={{ animationDelay: "450ms" }} />
                    <span className="wave-bar inline-block h-3 w-1 rounded-full bg-teal" style={{ animationDelay: "600ms" }} />
                  </>
                ) : (
                  <span className="text-xs text-white/40 tracking-wider">AI Standby</span>
                )}
              </div>
            </div>

            {/* Bottom Overlay Label */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-teal" />
                <span className="text-xs font-semibold text-white">Intervia AI Interviewer</span>
                <span className="text-[10px] text-white/50">Senior Bar Raiser</span>
              </div>

              <div
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  phase === "speaking"
                    ? "bg-teal text-white shadow-sm"
                    : phase === "listening"
                      ? "bg-black/60 text-white/70"
                      : "bg-gold/20 text-gold"
                }`}
              >
                {phase === "speaking" && "Speaking…"}
                {phase === "listening" && "Listening to you…"}
                {phase === "thinking" && "Evaluating…"}
              </div>
            </div>
          </div>

          {/* Candidate Video Tile (COMPULSORY) */}
          <div
            className={`relative flex min-h-[240px] flex-col items-center justify-center rounded-2xl border bg-black shadow-lg overflow-hidden ${
              isCandidateSpeaking
                ? "border-emerald-500 ring-4 ring-emerald-500/20"
                : "border-white/10"
            }`}
          >
            {/* Live Camera Stream - Direct Bind with Callback Ref */}
            <video
              ref={(el) => {
                camera.videoRef.current = el;
                if (el && camera.stream && el.srcObject !== camera.stream) {
                  el.srcObject = camera.stream;
                  el.play().catch(() => {});
                }
              }}
              onLoadedMetadata={(e) => e.target.play().catch(() => {})}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Fallback if camera stream not yet initialized */}
            {!camera.stream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#161a33] p-6 text-center z-10">
                <Loader2 size={36} className="animate-spin text-teal" />
                <p className="mt-3 font-semibold text-sm text-white">Activating Camera Stream…</p>
                <p className="mt-1 text-xs text-white/60">
                  Video proctoring is mandatory throughout the interview.
                </p>
                <button
                  type="button"
                  onClick={() => camera.enable()}
                  className="mt-4 rounded-xl bg-teal px-4 py-2 text-xs font-semibold text-white hover:bg-teal-dark"
                >
                  Enable Camera
                </button>
              </div>
            )}

            {/* Top Proctoring / Face-Tracking Badges */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
              <span className="flex items-center gap-1.5 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                <ShieldCheck size={13} className="text-emerald-400" />
                Camera Compulsory (Proctored)
              </span>

              {camera.status === "on" && (
                <span
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${
                    camera.facing !== false
                      ? "bg-emerald-500/80 text-white"
                      : "bg-amber-500/90 text-white"
                  }`}
                >
                  {camera.facing !== false ? "✓ Facing Screen" : "⚠️ Eye Gaze Diverted"}
                </span>
              )}
            </div>

            {/* Bottom Candidate Bar */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 rounded-lg bg-black/70 px-3 py-1.5 backdrop-blur-sm">
                <User size={13} className="text-white/80" />
                <span className="text-xs font-semibold text-white">{name} (You)</span>
              </div>

              {/* Live Mic Activity & Volume Meter */}
              <div
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-semibold backdrop-blur-sm transition-all ${
                  speech.listening || speech.recording
                    ? "bg-emerald-500/80 text-white shadow-sm"
                    : "bg-black/60 text-white/60"
                }`}
              >
                {speech.listening || speech.recording ? (
                  <>
                    <Mic size={13} className="animate-pulse text-white" />
                    <span>Mic Live</span>
                    {/* Live Audio Level Bar */}
                    <div className="flex items-center gap-0.5 ml-1 h-3 w-8 bg-black/30 rounded-xs px-0.5">
                      <div
                        className="h-2 rounded-xs bg-white transition-all duration-75"
                        style={{ width: `${Math.max(10, speech.audioLevel)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <MicOff size={13} />
                    <span>Muted</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Right Panel: Live Speech Transcript & Audio Response Controller */}
        <aside className="flex min-h-0 w-full flex-col rounded-2xl border border-white/10 bg-[#161a33] shadow-xl lg:w-[420px] lg:shrink-0 overflow-hidden">
          {/* Transcript Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <MessageSquare size={17} className="text-teal" />
              <h2 className="font-display text-sm font-bold text-white tracking-wide">
                Speech Transcript
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {speech.audioLevel > 10 ? "Speaking…" : speech.nativeBlocked ? "AI Audio Active" : "Voice Active"}
              </span>
            </div>
          </div>

          {/* Dialogue Transcript Feed */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {/* AI Speech Bubble */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[10px] font-bold text-white">
                  AI
                </div>
                <span className="text-xs font-semibold text-white/90">AI Interviewer</span>
                <span className="text-[10px] text-white/40">Question {n}</span>
              </div>
              <div className="rounded-xl border border-teal/30 bg-teal/10 p-3.5 text-sm text-white/95 leading-relaxed shadow-xs">
                {question}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={repeatQuestion}
                  disabled={phase === "thinking" || inLobby}
                  className="flex items-center gap-1 text-[11px] text-teal hover:underline disabled:opacity-40"
                >
                  <RotateCcw size={11} /> Replay question aloud
                </button>
              </div>
            </div>

            {/* Candidate Spoken Speech Bubble */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
                    {name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-white/90">Your Answer (Live Speech)</span>
                </div>
                <span className="text-[11px] text-white/50 tabular-nums">
                  {wordCount} words
                </span>
              </div>

              {/* Live Spoken Answer Stream (Typing Disabled - Pure Speech) */}
              <div className="flex-1 flex flex-col rounded-xl border border-white/10 bg-black/40 p-4 space-y-3 min-h-[160px]">
                {answer || interim ? (
                  <div className="text-sm leading-relaxed text-white whitespace-pre-wrap">
                    <span>{answer}</span>
                    {interim && (
                      <span className="text-teal font-medium animate-pulse ml-1.5 bg-teal/10 px-1 py-0.5 rounded">
                        {interim}…
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-white/50">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="h-2 w-2 rounded-full bg-teal animate-ping" />
                      <span className="h-2 w-2 rounded-full bg-teal" />
                    </div>
                    <p className="text-sm font-medium text-white/80">Listening for your spoken answer…</p>
                    <p className="text-xs text-white/40 mt-1 max-w-xs">
                      Speak your response into the microphone. Your words will transcribe live simultaneously.
                    </p>
                  </div>
                )}

                {/* Live Mic Activity & Soundwave Equalizer */}
                <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[11px] text-white/60">
                  <div className="flex items-center gap-2">
                    <div className="flex items-end gap-0.5 h-3.5">
                      {[30, 60, 90, 45, 75].map((baseH, idx) => {
                        const barHeight = speech.audioLevel > 10
                          ? Math.min(100, Math.max(20, (speech.audioLevel * (idx + 1) * 22) % 100))
                          : 20;
                        return (
                          <span
                            key={idx}
                            className={`w-0.5 rounded-full transition-all duration-75 ${
                              speech.audioLevel > 10 ? "bg-emerald-400" : "bg-white/20"
                            }`}
                            style={{ height: `${barHeight}%` }}
                          />
                        );
                      })}
                    </div>
                    <span className={speech.audioLevel > 10 ? "text-emerald-400 font-medium" : "text-white/40"}>
                      {speech.audioLevel > 10 ? "Speaking (voice active)…" : "Listening for voice…"}
                    </span>
                  </div>

                  {speech.transcribing && (
                    <span className="inline-flex items-center gap-1 text-teal font-medium">
                      <Loader2 size={11} className="animate-spin" />
                      Transcribing…
                    </span>
                  )}
                </div>

                <div ref={transcriptEndRef} />
              </div>

              {/* Clear & Re-speak button */}
              {(answer.trim() || interim.trim()) && phase === "listening" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={clearAndRespeak}
                    className="flex items-center gap-1 text-[11px] text-white/60 hover:text-danger transition-colors"
                  >
                    <Trash2 size={11} /> Clear & Re-speak
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-red-300">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="border-t border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Voice / Speech Answer</span>
              <span>Press <kbd className="rounded border border-white/20 bg-white/10 px-1 py-0.5 text-[10px]">Ctrl+Enter</kbd></span>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={
                (!answer.trim() && !speech.recording) ||
                phase === "thinking" ||
                inLobby
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-5 py-3 font-display text-sm font-bold text-white shadow-lg shadow-teal/20 transition-all hover:bg-teal-dark active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {phase === "thinking" ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing Your Answer…
                </>
              ) : (
                <>
                  <Send size={16} />
                  Done Answering & Submit
                </>
              )}
            </button>
          </div>
        </aside>
      </div>

      {/* Floating Bottom Dock Controls */}
      <footer className="flex items-center justify-center gap-3 border-t border-white/10 bg-[#161a33]/95 px-5 py-2.5 backdrop-blur-md">
        {/* Mic Toggle */}
        <button
          type="button"
          onClick={toggleMic}
          disabled={!speech.supported || inLobby}
          aria-label={micOn ? "Mute Microphone" : "Unmute Microphone"}
          title={micOn ? "Mute Microphone" : "Unmute Microphone"}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
            micOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-danger text-white shadow-sm"
          }`}
        >
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        {/* Compulsory Camera Indicator (Cannot turn off) */}
        <div
          title="Video camera is compulsory during the interview"
          className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3.5 text-xs font-semibold text-white/90 ring-1 ring-white/15"
        >
          <Camera size={16} className="text-emerald-400" />
          <span>Camera ON (Compulsory)</span>
        </div>

        {/* Repeat Question */}
        <button
          type="button"
          onClick={repeatQuestion}
          disabled={!tts.supported || !ttsOn || phase === "thinking" || inLobby}
          title="Repeat Question Aloud"
          className="flex h-10 items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 text-xs font-medium text-white disabled:opacity-40"
        >
          <RotateCcw size={16} />
          <span className="hidden sm:inline">Repeat Question</span>
        </button>

        {/* End Interview */}
        <button
          type="button"
          onClick={endInterview}
          disabled={inLobby || phase === "thinking"}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-danger/80 hover:bg-danger px-4 text-xs font-semibold text-white disabled:opacity-40 transition-all"
        >
          <PhoneOff size={16} />
          <span>Finish Interview</span>
        </button>
      </footer>

      {/* Mandatory Pre-Join Classroom Lobby Modal */}
      {inLobby && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lobby-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e1124]/90 px-4 backdrop-blur-md"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#161a33] p-6 sm:p-8 text-white shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-teal/20 px-2.5 py-0.5 text-xs font-bold text-teal">
                  <Shield size={12} /> Proctoring & Readiness Check
                </div>
                <h1 id="lobby-title" className="mt-2 font-display text-2xl font-bold">
                  Enter Interview Classroom
                </h1>
              </div>
              <div className="text-right text-xs text-white/50">
                <span>Session #{id.slice(0, 8)}</span>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Left: Compulsory Camera Preview */}
              <div className="flex flex-col items-center">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/20 bg-black shadow-inner flex items-center justify-center">
                  <video
                    ref={(el) => {
                      camera.videoRef.current = el;
                      if (el && camera.stream && el.srcObject !== camera.stream) {
                        el.srcObject = camera.stream;
                        el.play().catch(() => {});
                      }
                    }}
                    onLoadedMetadata={(e) => e.target.play().catch(() => {})}
                    autoPlay
                    muted
                    playsInline
                    className={`h-full w-full object-cover ${camActive ? "" : "hidden"}`}
                    style={{ transform: "scaleX(-1)" }}
                  />
                  {!camActive && (
                    <div className="p-4 text-center">
                      <Camera size={32} className="mx-auto text-white/40 mb-2" />
                      <p className="text-xs text-white/70 font-semibold">Camera is Required</p>
                      <p className="text-[11px] text-white/40 mt-1">
                        Please allow camera permissions to join the classroom.
                      </p>
                      <button
                        type="button"
                        onClick={() => camera.enable()}
                        className="mt-3 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark"
                      >
                        Enable Camera
                      </button>
                    </div>
                  )}

                  {camActive && (
                    <span className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      <CheckCircle2 size={11} /> Camera Live
                    </span>
                  )}
                </div>
                <p className="mt-2 text-center text-xs text-white/60">
                  Adjust your lighting and sit directly facing the camera.
                </p>
              </div>

              {/* Right: Compulsory Rules & Verification */}
              <div className="space-y-4 text-xs">
                <div className="rounded-xl border border-teal/30 bg-teal/10 p-3.5 space-y-2">
                  <p className="font-bold text-sm text-teal flex items-center gap-1.5">
                    <ShieldCheck size={16} /> Classroom Guidelines
                  </p>
                  <ul className="space-y-2 text-white/80 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-teal font-bold">•</span>
                      <span>
                        <strong>Camera is Compulsory:</strong> Video tracking runs continuously for engagement & proctoring.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal font-bold">•</span>
                      <span>
                        <strong>Live Speech Transcription:</strong> Speak into your microphone and your words transcribe simultaneously.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal font-bold">•</span>
                      <span>
                        <strong>Live Transcript:</strong> Your speech appears in real-time on your screen.
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Brave-specific helpful guidance if detected */}
                {isBrave && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200 space-y-1">
                    <p className="font-semibold text-xs">🦁 Brave Browser Tip</p>
                    <p className="text-[11px] opacity-90 leading-relaxed">
                      For instant word-by-word streaming, enable <em>"Use Google services for speech recognition"</em> in <code className="bg-black/40 px-1 py-0.5 rounded">brave://settings/system</code>. Intervia also transcribes your audio continuously in the background.
                    </p>
                  </div>
                )}

                {/* Voice Selection */}
                {tts.supported && (
                  <div>
                    <label htmlFor="voice-select" className="block text-xs font-semibold text-white/80 mb-1">
                      Interviewer AI Voice
                    </label>
                    <div className="flex gap-2">
                      <select
                        id="voice-select"
                        value={tts.voice?.name || ""}
                        onChange={(e) => tts.setVoiceName(e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-white/20 bg-black/40 px-2.5 py-1.5 text-xs text-white"
                      >
                        {tts.voices.length === 0 && <option value="">Default AI Voice</option>}
                        {tts.voices.map((v) => (
                          <option key={v.name} value={v.name}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => tts.speak("Hello! I am your AI interviewer. Welcome to Intervia.")}
                        className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                      >
                        Test
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-red-300">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Join CTA */}
            <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-white/50">
                {!camActive
                  ? "⚠️ Camera must be enabled to enter"
                  : "✓ All mandatory systems ready"}
              </span>

              <button
                type="button"
                onClick={joinClassroom}
                disabled={!camActive}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-teal px-7 py-3 font-display text-sm font-bold text-white shadow-lg hover:bg-teal-dark active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Enter Classroom & Start Interview →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
