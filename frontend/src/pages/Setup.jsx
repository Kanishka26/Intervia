import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { extractResume, startSession } from "../api.js";
import { saveSession } from "../session.js";

const MIN = 20;
const MAX = 15000;

const field =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base leading-relaxed placeholder:text-muted/70";

function Field({ id, label, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      {hint && <p className="mb-2 text-sm text-muted">{hint}</p>}
      {children}
    </div>
  );
}

export default function Setup() {
  const navigate = useNavigate();
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [project, setProject] = useState("");
  const [count, setCount] = useState(8);
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfNote, setPdfNote] = useState("");
  const [error, setError] = useState("");

  const tooShort = jd.trim().length < MIN || resume.trim().length < MIN;

  async function onPdf(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setPdfNote("");
    setPdfBusy(true);
    try {
      const { text } = await extractResume(file);
      setResume(text);
      setPdfNote(`Read ${text.length.toLocaleString()} characters from ${file.name}. Check them below and fix anything that looks wrong.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setPdfBusy(false);
      e.target.value = "";
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (tooShort || busy) return;
    setError("");
    setBusy(true);
    try {
      const data = await startSession({
        job_description: jd.trim(),
        resume_text: resume.trim(),
        project_info: project.trim(),
        n_questions: count,
      });
      saveSession(data.session_id, {
        question: data.question,
        question_number: data.question_number,
        total_questions: data.total_questions,
        is_followup: false,
      });
      navigate(`/interview/${data.session_id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-7">
      <div>
        <h1 className="font-serif text-4xl font-semibold leading-tight">Set up your interview</h1>
        <p className="mt-2 text-muted">
          Paste the job you want and your resume. The questions will come from what you actually
          list, and follow-ups will probe your answers.
        </p>
      </div>

      <Field id="jd" label="Job description" hint="Paste the full posting, including requirements.">
        <textarea
          id="jd"
          className={field}
          rows={8}
          maxLength={MAX}
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          disabled={busy}
        />
      </Field>

      <Field id="resume" label="Resume" hint="Upload a PDF to fill this in, or paste the text.">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="application/pdf"
            onChange={onPdf}
            disabled={busy || pdfBusy}
            aria-label="Upload resume PDF"
            className="text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          {pdfBusy && <span className="text-sm text-muted" role="status">Reading PDF…</span>}
        </div>
        {pdfNote && <p className="mb-2 text-sm text-muted" role="status">{pdfNote}</p>}
        <textarea
          id="resume"
          className={field}
          rows={10}
          maxLength={MAX}
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          disabled={busy}
        />
      </Field>

      <Field
        id="project"
        label="Project to be asked about"
        hint="Optional. Describe one project: what it does, your role, the tech, the hard parts."
      >
        <textarea
          id="project"
          className={field}
          rows={5}
          maxLength={MAX}
          value={project}
          onChange={(e) => setProject(e.target.value)}
          disabled={busy}
        />
      </Field>

      <Field id="count" label="Number of questions" hint="Follow-ups are extra. A session of 8 usually takes 20 to 30 minutes.">
        <select
          id="count"
          className={`${field} max-w-[10rem]`}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          disabled={busy}
        >
          {[5, 8, 10, 12].map((n) => (
            <option key={n} value={n}>{n} questions</option>
          ))}
        </select>
      </Field>

      {error && (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={tooShort || busy}
          className="rounded-md bg-teal px-5 py-2.5 font-medium text-white hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start interview
        </button>
        {busy && (
          <span role="status" className="text-sm text-muted">
            Reading your resume and planning questions. This can take up to 30 seconds.
          </span>
        )}
        {!busy && tooShort && (
          <span className="text-sm text-muted">Add a job description and resume to continue.</span>
        )}
      </div>
    </form>
  );
}
