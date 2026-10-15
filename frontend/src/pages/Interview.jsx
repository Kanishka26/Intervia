import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { finishSession,getSession, sendAnswer } from "../api.js";
import { useSpeech } from "../useSpeech.js";
import { loadSession, saveSession } from "../session.js";

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
    return <p role="status" className="text-muted">Loading your interview…</p>;
  }
  if (!state) {
    return (
      <div className="max-w-xl">
        <h1 className="font-serif text-3xl font-semibold">This interview isn't available</h1>
        <p className="mt-2 text-muted">
          Interviews are kept in memory on the server and can't be reopened after the server
          restarts or in a different browser.
        </p>
        <Link to="/" className="mt-5 inline-block rounded-md bg-teal px-5 py-2.5 font-medium text-white hover:bg-teal-dark">
          Start a new interview
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
      const r = await sendAnswer(id, text, metrics);
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
      usedMic.current = false;
    } catch (err) {
      setError(err.message); // answer text stays so nothing is lost
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

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3" aria-label={`Question ${n} of ${total}`}>
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < n - 1 ? "bg-teal" : i === n - 1 ? "bg-teal/50" : "bg-line"}`}
            />
          ))}
        </div>
        <span className="text-sm tabular-nums text-muted">{n} of {total}</span>
      </div>

      {is_followup && (
        <p className="mt-8 inline-block rounded-full border border-gold bg-surface px-3 py-0.5 text-sm">
          Follow-up on your last answer
        </p>
      )}

      <h1 className={`font-serif text-3xl font-normal leading-snug sm:text-4xl ${is_followup ? "mt-3" : "mt-8"}`} aria-live="polite">
        {question}
      </h1>

      <label htmlFor="answer" className="mt-8 block font-medium">Your answer</label>
      <p className="mb-2 text-sm text-muted">Answer as you would out loud. Press Ctrl+Enter to send.</p>
      <textarea
        id="answer"
        ref={box}
        rows={9}
        maxLength={MAX_ANSWER}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={busy}
        className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base leading-relaxed"
      />
      <div className="mt-1 text-right text-xs tabular-nums text-muted">
        {answer.length.toLocaleString()} / {MAX_ANSWER.toLocaleString()}
      </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
        {speech.supported ? (
          <button
            type="button"
            onClick={toggleMic}
            disabled={busy}
            aria-pressed={speech.listening}
            className={`rounded-md border px-4 py-2 font-medium disabled:opacity-50 ${
              speech.listening ? "border-danger bg-danger/5 text-danger" : "border-line bg-surface"
            }`}
          >
            {speech.listening ? "Stop speaking" : "Speak your answer"}
          </button>
        ) : (
          <p className="text-sm text-muted">Voice input needs Chrome or Edge. You can type instead.</p>
        )}
        {speech.listening && (
          <span role="status" className="text-sm text-muted">Listening…</span>
        )}
      </div>
      {interim && <p className="mt-2 text-sm italic text-muted">{interim}</p>}
      {speech.error && (
        <p role="alert" className="mt-2 text-sm text-danger">{speech.error}</p>
      )}
      <p className="mt-2 text-xs text-muted">
        Voice input uses your browser's speech service, which may send audio to the browser's vendor.
        Speaking stats are approximate.
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={submit}
          disabled={busy || !answer.trim()}
          className="rounded-md bg-teal px-5 py-2.5 font-medium text-white hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send answer
        </button>
                <button
          onClick={finishEarly}
          disabled={busy || (n === 1 && !is_followup)}
          className="rounded-md border border-line bg-surface px-5 py-2.5 font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Finish and see report
        </button>
        {busy && <span role="status" className="text-sm text-muted">Reading your answer…</span>}
      </div>
    </div>
  );
}
