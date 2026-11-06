import {
  AlertCircle,
  Camera,
  CheckCircle2,
  CornerDownLeft,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  Send,
  Sparkles,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { finishSession, getSession, sendAnswer } from "../api.js";
import { loadSession, saveSession } from "../session.js";
import { useCamera } from "../useCamera.js";
import { useSpeech } from "../useSpeech.js";

const MAX_ANSWER = 5000;

export default function Interview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState(() => loadSession(id));
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const box = useRef(null);
  const [interim, setInterim] = useState("");
  const usedMic = useRef(false);

  const speech = useSpeech({
    onText: ({ finalText, interim }) => {
      if (finalText) setAnswer((prev) => (prev ? prev + " " : "") + finalText.trim());
      setInterim(interim);
    },
  });

  const camera = useCamera();

  useEffect(() => {
    box.current?.focus();
  }, [state?.question]);

  const [restoring, setRestoring] = useState(() => !loadSession(id));

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

  if (!state && restoring) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 size={32} className="animate-spin text-teal" />
        <p className="mt-4 text-sm font-medium text-muted">Restoring your interview session…</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-line bg-surface p-8 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <AlertCircle size={28} />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">Interview Unavailable</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Interviews are kept securely in memory and can't be reopened after a server restart or in a different session.
        </p>
        <Link
          to="/new"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm hover:bg-teal-dark"
        >
          <Sparkles size={16} />
          Start a New Interview
        </Link>
      </div>
    );
  }

  async function submit() {
    const text = answer.trim();
    if (!text || busy) return;
    setError("");
    setBusy(true);
    try {
      const metrics = usedMic.current ? speech.getMetrics() : null;
      speech.stop();
      const vision = camera.getMetrics();
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
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function finishEarly() {
    if (busy) return;
    if (!window.confirm("End the interview now? The report will only cover the questions you've answered.")) return;
    setError("");
    setBusy(true);
    try {
      await finishSession(id);
      navigate(`/report/${id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  function toggleMic() {
    if (speech.listening) {
      speech.stop();
    } else {
      usedMic.current = true;
      speech.start();
    }
  }

  function onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  const { question, question_number: n, total_questions: total, is_followup } = state;
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>QUESTION PROGRESS</span>
            <span className="tabular-nums font-bold text-teal">
              {n} of {total}
            </span>
          </div>
          <div className="mt-2 flex h-2 w-full gap-1.5 overflow-hidden rounded-full bg-line/80">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`h-full flex-1 rounded-full transition-all duration-300 ${
                  i < n - 1
                    ? "bg-teal"
                    : i === n - 1
                      ? "bg-teal ring-2 ring-teal/30"
                      : "bg-line"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Switch to Interactive Call Room */}
        <Link
          to={`/interview/${id}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-teal/30 bg-soft/50 px-3.5 py-2 text-xs font-semibold text-teal hover:bg-soft"
          title="Switch to immersive video-call mode"
        >
          <Video size={15} />
          Switch to Interactive Call Room
        </Link>
      </div>

      {/* Question Card */}
      <div className="relative overflow-hidden rounded-2xl border border-teal/20 bg-gradient-to-br from-soft/40 via-surface to-paper p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal text-white shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-ink">Intervia AI Interviewer</p>
              <p className="text-[11px] text-muted">Adaptive Senior Bar Raiser</p>
            </div>
          </div>

          {is_followup && (
            <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
              ⚡ Follow-up on your last response
            </span>
          )}
        </div>

        <h1
          className="mt-5 font-display text-xl sm:text-2xl font-bold text-ink leading-snug"
          aria-live="polite"
        >
          {question}
        </h1>
      </div>

      {/* Answer Workspace */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="answer" className="font-display text-sm font-bold text-ink">
            Your Response
          </label>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="hidden sm:inline">Press <kbd className="rounded border border-line bg-paper px-1.5 py-0.5 text-[10px] font-semibold text-ink">Ctrl + Enter</kbd> to submit</span>
            <span className="tabular-nums font-medium text-ink">
              {wordCount} words
            </span>
            <span className="tabular-nums">
              ({answer.length.toLocaleString()} / {MAX_ANSWER.toLocaleString()} chars)
            </span>
          </div>
        </div>

        <div className="relative">
          <textarea
            id="answer"
            ref={box}
            rows={8}
            maxLength={MAX_ANSWER}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy}
            placeholder="Type your answer, or use voice dictation below. Focus on context, trade-offs, decisions, and outcomes…"
            className="w-full resize-y rounded-xl border border-line bg-paper/30 p-4 text-sm leading-relaxed text-ink placeholder:text-muted/60 focus:bg-surface"
          />
        </div>

        {/* Interim voice recognition text */}
        {interim && (
          <p className="rounded-lg bg-soft/40 p-2.5 text-xs italic text-teal leading-relaxed">
            Transcribing: {interim}…
          </p>
        )}

        {/* Speech Dictation & Camera Tools */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {speech.supported && (
              <button
                type="button"
                onClick={toggleMic}
                disabled={busy}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  speech.listening
                    ? "border border-danger/40 bg-danger/10 text-danger animate-pulse"
                    : "border border-line bg-paper text-ink hover:border-teal hover:text-teal"
                }`}
              >
                {speech.listening ? (
                  <>
                    <MicOff size={15} />
                    Listening… (Click to stop)
                  </>
                ) : (
                  <>
                    <Mic size={15} />
                    Dictate Response
                  </>
                )}
              </button>
            )}

            {camera.supported && (
              <button
                type="button"
                onClick={camera.status === "on" || camera.status === "calibrating" ? camera.disable : camera.enable}
                disabled={busy || camera.status === "loading"}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium ${
                  camera.status === "on"
                    ? "border-teal/50 bg-soft text-teal"
                    : "border-line bg-paper text-muted hover:text-ink"
                }`}
              >
                <Camera size={14} />
                {camera.status === "on" ? "Camera Active" : "Camera Tracking (Optional)"}
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={finishEarly}
              disabled={busy || (n === 1 && !is_followup)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-muted hover:border-danger/40 hover:text-danger disabled:opacity-40"
              title="Finish interview and jump to comprehensive report"
            >
              <PhoneOff size={14} />
              End & View Report
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={busy || !answer.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-teal px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm hover:bg-teal-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Evaluating…
                </>
              ) : (
                <>
                  <Send size={15} />
                  Send Answer
                </>
              )}
            </button>
          </div>
        </div>

        {/* Camera preview strip if enabled */}
        {["loading", "calibrating", "on"].includes(camera.status) && (
          <div className="rounded-xl border border-line bg-paper/50 p-3 text-xs flex items-center gap-4">
            <video
              ref={camera.videoRef}
              autoPlay
              muted
              playsInline
              className="h-16 w-24 rounded-lg bg-black/20 object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="flex-1">
              <p className="font-semibold text-ink">
                {camera.status === "on"
                  ? camera.facing
                    ? "✓ Screen focus detected"
                    : "⚠️ Looking away from screen"
                  : "Calibrating camera position…"}
              </p>
              <p className="text-[11px] text-muted">
                Vision tracking processes locally in browser. No video is ever stored or uploaded.
              </p>
            </div>
            {camera.status === "on" && (
              <button
                type="button"
                onClick={camera.recalibrate}
                className="text-xs font-medium text-teal hover:underline"
              >
                Recalibrate
              </button>
            )}
          </div>
        )}

        {/* Errors */}
        {(error || speech.error || camera.error) && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/5 p-3 text-xs text-danger"
          >
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error || speech.error || camera.error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
