import { Mic, MicOff, PhoneOff, RotateCcw, Send, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { finishSession, getSession, sendAnswer } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { loadSession, saveSession } from "../session.js";
import { useCamera } from "../useCamera.js";
import { useSpeech } from "../useSpeech.js";
import { useTts } from "../useTts.js";

const MAX_ANSWER = 5000;
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function RoundBtn({ onClick, label, icon: Icon, active = true, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-40 ${
        active ? "bg-white/15 hover:bg-white/25" : "bg-danger/90 hover:bg-danger"
      }`}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}

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
  const [wantCam, setWantCam] = useState(false);
  const [wantMic, setWantMic] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [ttsOn, setTtsOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const usedMic = useRef(false);

  const speech = useSpeech({
    onText: ({ finalText, interim: partial }) => {
      if (finalText) setAnswer((prev) => (prev ? prev + " " : "") + finalText.trim());
      setInterim(partial);
    },
  });
  const camera = useCamera();
  const tts = useTts();

  // Latest values for effects that must not re-run when these change.
  const latest = useRef({});
  latest.current = { micOn, ttsOn, speech, tts };

  // Restore the current question from the server if this tab has no saved state.
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
  useEffect(() => {
    if (inLobby) return undefined;
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [inLobby]);

  // The AI reads the question aloud; the microphone stays off meanwhile so it cannot hear the AI.
  useEffect(() => {
    if (phase !== "speaking" || !state?.question) return undefined;
    let cancelled = false;
    const { ttsOn: voiceOn, speech: sp, tts: t } = latest.current;
    sp.stop();
    (async () => {
      if (voiceOn && t.supported) await t.speak(state.question);
      if (!cancelled) setPhase("listening");
    })();
    return () => {
      cancelled = true;
      latest.current.tts.cancel();
    };
  }, [phase, state?.question, replay]); // eslint-disable-line react-hooks/exhaustive-deps

  // When it is the candidate's turn, switch the microphone on (after a short pause so it misses the AI's last word).
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

  async function join() {
    setError("");
    let mic = wantMic && speech.supported;
    if (mic) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true }); // ask permission inside the click
        s.getTracks().forEach((t) => t.stop());
      } catch {
        mic = false;
        setError("Microphone access was blocked, so you can type your answers instead.");
      }
    }
    setMicOn(mic);
    if (wantCam) camera.enable(); // progress and errors show on the candidate tile
    setPhase("speaking");
  }

  async function submit() {
    const text = answer.trim();
    if (!text || phase === "thinking" || phase === "lobby") return;
    setError("");
    const metrics = usedMic.current ? speech.getMetrics() : null;
    const vision = camera.getMetrics();
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
      setError(e.message); // the answer text stays so nothing is lost
      setPhase("listening");
    }
  }

  async function endInterview() {
    if (!window.confirm("End the interview now? The report will cover only the questions you've answered.")) return;
    speech.stop();
    tts.cancel();
    try {
      await finishSession(id);
      navigate(`/report/${id}`);
    } catch (e) {
      setError(
        e.message === "answer at least one question first"
          ? "Answer at least one question before ending, or leave from My interviews."
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

  const camActive = ["loading", "calibrating", "on"].includes(camera.status);
  function toggleCamera() {
    if (camActive) camera.disable();
    else camera.enable();
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
    return <p role="status" className="p-8 text-muted">Loading your interview…</p>;
  }
  if (!state) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <h1 className="text-3xl font-semibold">This interview isn't available</h1>
        <p className="mt-2 text-muted">It may have been deleted, or it belongs to a different account.</p>
        <Link to="/new" className="mt-5 inline-block rounded-md bg-teal px-5 py-2.5 font-medium text-white hover:bg-teal-dark">
          Start a new interview
        </Link>
      </div>
    );
  }

  const { question, question_number: n, total_questions: total, is_followup: followUp } = state;
  const aiStatus = { lobby: "Ready", speaking: "Speaking…", listening: "Listening…", thinking: "Thinking…" }[phase];
  const name = user?.displayName || user?.email || "You";

  return (
    <div className="relative flex min-h-screen flex-col bg-[#12152b] text-white lg:h-screen lg:overflow-hidden">
      <header className="flex items-center justify-between gap-4 px-5 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Question {n} of {total}</p>
          <div className="mt-1.5 flex max-w-xs gap-1" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${i < n - 1 ? "bg-white" : i === n - 1 ? "bg-white/60" : "bg-white/20"}`} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-white/70">
          <span className="tabular-nums">{mmss(elapsed)}</span>
          <Link to={`/interview/${id}/text`} className="underline">Text mode</Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 pb-2 lg:flex-row">
        <main className="grid min-h-0 flex-1 gap-4 md:grid-cols-2 lg:grid-rows-1">
          <div className="relative flex aspect-video min-h-[220px] flex-col items-center justify-center rounded-2xl bg-[#1d2142] lg:aspect-auto lg:h-full">
            <div
              className={`flex h-32 w-32 items-center justify-center rounded-full bg-teal text-5xl font-semibold ${
                phase === "speaking" ? "ring-4 ring-white/60 motion-safe:animate-pulse" : ""
              }`}
            >
              AI
            </div>
            <p className="mt-4 text-base text-white/80">Intervia interviewer</p>
            <span className="absolute bottom-3 left-3 rounded bg-black/40 px-2 py-0.5 text-xs" role="status">{aiStatus}</span>
          </div>

          <div className="relative flex aspect-video min-h-[220px] items-center justify-center overflow-hidden rounded-2xl bg-[#1d2142] lg:aspect-auto lg:h-full">
            <video
              ref={camera.videoRef}
              autoPlay
              muted
              playsInline
              className={`h-full w-full object-cover ${camActive ? "" : "hidden"}`}
              style={{ transform: "scaleX(-1)" }}
            />
            {!camActive && (
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/15 text-5xl font-semibold">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-3 left-3 max-w-[70%] truncate rounded bg-black/40 px-2 py-0.5 text-xs">
              {name}{micOn ? "" : " (muted)"}
            </span>
            {camera.status === "loading" && <span className="absolute right-3 top-3 rounded bg-black/40 px-2 py-0.5 text-xs">Starting camera…</span>}
            {camera.status === "calibrating" && <span className="absolute right-3 top-3 rounded bg-black/40 px-2 py-0.5 text-xs">Look at the screen…</span>}
            {camera.status === "on" && camera.stalled && (
              <span className="absolute right-3 top-3 rounded bg-danger/80 px-2 py-0.5 text-xs">Camera feed frozen</span>
            )}
          </div>
        </main>

        <aside className="flex min-h-0 w-full flex-col gap-3 lg:w-[380px] lg:shrink-0">
          {followUp && (
            <p className="inline-block self-start rounded-full border border-gold px-3 py-0.5 text-sm">Follow-up on your last answer</p>
          )}
          <p className="max-h-56 overflow-y-auto rounded-xl bg-black/30 px-4 py-3 text-lg leading-snug" aria-live="polite">{question}</p>

          <label htmlFor="answer" className="sr-only">Your answer</label>
          <textarea
            id="answer"
            rows={6}
            maxLength={MAX_ANSWER}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={phase === "thinking" || phase === "lobby"}
            placeholder="Your answer appears here as you speak. You can also type it, or fix the transcript."
            className="min-h-32 flex-1 resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/50"
          />
          {interim && <p className="text-sm italic text-white/60">{interim}</p>}
          {speech.error && <p role="alert" className="text-sm text-red-300">{speech.error}</p>}
          {camera.error && <p role="alert" className="text-sm text-red-300">{camera.error}</p>}
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={!answer.trim() || phase === "thinking" || inLobby}
            className="flex items-center justify-center gap-2 rounded-xl bg-teal px-5 py-3 font-medium hover:bg-teal-dark disabled:opacity-40"
          >
            <Send size={18} aria-hidden="true" />
            {phase === "thinking" ? "Thinking…" : "Done answering"}
          </button>
        </aside>
      </div>

      <footer className="flex flex-wrap items-center justify-center gap-3 bg-[#12152b]/90 px-5 py-3 backdrop-blur">
        <RoundBtn onClick={toggleMic} label={micOn ? "Mute microphone" : "Unmute microphone"} icon={micOn ? Mic : MicOff} active={micOn} disabled={!speech.supported || inLobby} />
        <RoundBtn onClick={toggleCamera} label={camActive ? "Turn camera off" : "Turn camera on"} icon={camActive ? Video : VideoOff} active={camActive} disabled={!camera.supported || inLobby} />
        <RoundBtn onClick={toggleVoice} label={ttsOn ? "Turn off the AI voice" : "Turn on the AI voice"} icon={ttsOn ? Volume2 : VolumeX} active={ttsOn} disabled={!tts.supported || inLobby} />
        <RoundBtn onClick={repeatQuestion} label="Repeat the question" icon={RotateCcw} disabled={!tts.supported || !ttsOn || phase === "thinking" || inLobby} />
        <button
          type="button"
          onClick={endInterview}
          disabled={inLobby || phase === "thinking"}
          className="flex items-center gap-2 rounded-full bg-danger px-5 py-2.5 font-medium hover:opacity-90 disabled:opacity-40"
        >
          <PhoneOff size={18} aria-hidden="true" />
          End
        </button>
      </footer>

      {inLobby && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#12152b]/85 px-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="join-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-ink shadow-xl">
            <h1 id="join-title" className="text-2xl font-semibold">Ready to join?</h1>
            <p className="mt-1 text-sm text-muted">
              The AI interviewer reads each question aloud, then listens while you answer. Press
              &quot;Done answering&quot; when you finish.
            </p>

            <div className="mt-4 space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={wantMic && speech.supported} disabled={!speech.supported} onChange={(e) => setWantMic(e.target.checked)} />
                Answer with my microphone
              </label>
              {!speech.supported && <p className="text-muted">Voice answers need Chrome or Edge. You can type instead.</p>}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={wantCam} disabled={!camera.supported} onChange={(e) => setWantCam(e.target.checked)} />
                Use my camera (optional, experimental)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={ttsOn && tts.supported} disabled={!tts.supported} onChange={(e) => setTtsOn(e.target.checked)} />
                Read questions aloud
              </label>
              {!tts.supported && <p className="text-muted">This browser can't read aloud. Questions will appear as text.</p>}
            </div>

            {tts.supported && (
              <div className="mt-4">
                <label htmlFor="voice" className="block text-sm font-medium">Interviewer voice</label>
                <div className="mt-1 flex gap-2">
                  <select id="voice" value={tts.voice?.name || ""} onChange={(e) => tts.setVoiceName(e.target.value)} className="min-w-0 flex-1 rounded-md border border-line px-2 py-2 text-sm">
                    {tts.voices.length === 0 && <option value="">Default voice</option>}
                    {tts.voices.map((v) => (
                      <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => tts.speak("Hello, I'm your interviewer today. Shall we begin?")} className="rounded-md border border-line px-3 py-2 text-sm font-medium">
                    Test
                  </button>
                </div>
              </div>
            )}

            {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

            <button type="button" onClick={join} className="mt-5 w-full rounded-md bg-teal px-5 py-2.5 font-medium text-white hover:bg-teal-dark">
              Join interview
            </button>
            <p className="mt-3 text-xs text-muted">
              Voice and camera features use your browser. Video never leaves your device; only counts such as
              &quot;% of time facing the screen&quot; are sent.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}