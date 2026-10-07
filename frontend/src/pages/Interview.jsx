import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { finishSession, sendAnswer } from "../api.js";
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

  useEffect(() => {
    box.current?.focus();
  }, [state?.question]);

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
      const r = await sendAnswer(id, text);
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
