import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import HeroDemo from "../components/HeroDemo.jsx";
import ThemeToggle from "../components/Themetoggle.jsx";

const btnPrimary =
  "inline-flex items-center justify-center rounded-md bg-teal px-5 py-2.5 font-medium text-white hover:bg-teal-dark";
const btnGhost =
  "inline-flex items-center justify-center rounded-md border border-line bg-surface px-5 py-2.5 font-medium hover:bg-soft";

const STEPS = [
  {
    title: "Add the job and your resume",
    body: "Paste the job posting and upload your resume as a PDF, or paste the text. The questions come from what you actually list.",
  },
  {
    title: "Join the call",
    body: "The AI interviewer reads each question aloud. Answer by voice or type. If an answer is vague, it asks a follow-up.",
  },
  {
    title: "Read your report",
    body: "Scores for every answer, the gaps it noticed, and what to practice next. Your progress builds up on your dashboard.",
  },
];

const FEATURES = [
  ["Follow-ups in your own words", "When you mention a tool or a trade-off, the next question asks about it."],
  ["Questions from your resume and the job", "Projects you list, plus skills the job needs that your resume doesn't show yet. Not a fixed question bank."],
  ["The rhythm of a real interview", "Questions are read aloud and you answer out loud. Text mode is there if you can't use a microphone."],
  ["Feedback with reasons", "Each answer is scored on relevance, depth, clarity, and completeness, with the specific gaps it noticed."],
  ["Voice and camera signals, if you want them", "Pace, pauses, filler words, and how often you faced the screen. Camera analysis runs in your browser, and video is never uploaded."],
  ["Progress over time", "A dashboard and skill insights show which topics keep coming up as weak."],
];

const FAQ = [
  ["Do I need a camera or a microphone?", "No. You can type your answers. Voice answers need Chrome or Edge, and the camera is optional."],
  ["Does it record or upload my video?", "No. Camera analysis runs in your browser, and only a few numbers, such as the share of time you faced the screen, are sent with your answer. Voice answers use your browser's speech recognition, which may send audio to the browser's vendor."],
  ["How accurate are the scores?", "They come from an AI model, so treat them as a practice guide, not a grade. The written feedback about gaps is usually more useful than the numbers."],
  ["What do I need to start?", "A Google account to sign in, a job description, and your resume."],
  ["Can I delete my data?", "Yes. Settings has a button that deletes all your interviews, reports, and profile details."],
];

const SAMPLE = [
  ["Relevance", 4.0],
  ["Technical depth", 3.0],
  ["Clarity", 3.5],
  ["Completeness", 2.5],
];

// Signed-out visitors sign in first and then land on the setup form.
function StartLink({ className = btnPrimary, children = "Start an interview" }) {
  const { user } = useAuth();
  return user ? (
    <Link to="/new" className={className}>{children}</Link>
  ) : (
    <Link to="/login" state={{ from: "/new" }} className={className}>{children}</Link>
  );
}

function Header() {
  const { user } = useAuth();
  const links = [["#how", "How it works"], ["#features", "What you get"], ["#faq", "Questions"]];
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3">
        <Link to="/dashboard" className="font-display text-2xl font-extrabold tracking-tight text-teal">Intervia</Link>
        <nav aria-label="Page sections" className="hidden gap-1 md:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-soft hover:text-ink">{label}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Link to="/dashboard" className={btnPrimary}>Go to dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-ink sm:inline">Sign in</Link>
              <StartLink />
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function SampleReport() {
  return (
    <aside
      aria-label="Example report with scores for relevance, technical depth, clarity and completeness"
      className="self-start rounded-2xl border border-line bg-surface p-6 shadow-sm lg:sticky lg:top-8"
    >
      <p className="inline-block rounded-full border border-line px-3 py-0.5 text-sm text-muted">Sample report, not real data</p>
      <h3 className="mt-4 text-xl font-semibold">Software Engineer, Backend</h3>
      <div className="mt-5 space-y-3">
        {SAMPLE.map(([label, v]) => (
          <div key={label} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 text-sm">
            <span>{label}</span>
            <div className="h-2.5 rounded-full bg-line">
              <div className={`h-full rounded-full ${v < 3 ? "bg-gold" : "bg-bar"}`} style={{ width: `${(v / 5) * 100}%` }} />
            </div>
            <span className="text-right tabular-nums">{v.toFixed(1)}</span>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm font-medium">Topics to revisit</p>
      <p className="text-muted">Authentication, REST API versioning</p>
      <p className="mt-4 text-sm font-medium">Gap noticed</p>
      <p className="text-muted">Did not explain how tokens are revoked, or where they are stored on the client.</p>
    </aside>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Header />

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1fr_1.05fr] lg:py-24">
          <div>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Mock interviews that follow up on what you say.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted">
              Paste a job description and your resume. An AI interviewer reads each question aloud, listens to your
              answer, and asks what a real interviewer would ask next.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <StartLink />
              <a href="#how" className={btnGhost}>See how it works</a>
            </div>
            <p className="mt-4 text-sm text-muted">Voice answers work in Chrome and Edge. The camera is optional.</p>
          </div>
          <div>
            <HeroDemo />
            <p className="sr-only">
              Example: the interviewer asks how you kept users signed in. You answer that you used a token in local
              storage. It follows up by asking what could go wrong if a malicious script ran on your page.
            </p>
          </div>
        </section>

        <section id="how" className="scroll-mt-4 border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">How a session works</h2>
            <ol className="mt-12 grid gap-10 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="border-t-2 border-teal pt-5">
                  <span className="font-display text-4xl font-extrabold text-teal">{i + 1}</span>
                  <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 max-w-sm text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="mx-auto grid max-w-6xl scroll-mt-4 gap-14 px-5 py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">What you get</h2>
            <dl className="mt-8 divide-y divide-line border-y border-line">
              {FEATURES.map(([title, body]) => (
                <div key={title} className="py-5 sm:grid sm:grid-cols-[13rem_1fr] sm:gap-6">
                  <dt className="font-semibold">{title}</dt>
                  <dd className="mt-1 text-muted sm:mt-0">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
          <SampleReport />
        </section>

        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Made for practice</h2>
            <p className="mt-4 max-w-2xl text-lg text-muted">
              Scores are estimates from an AI model, so use them to find what to work on, not as a verdict on you.
              Your interviews are saved to your account, and you can delete everything from Settings whenever you like.
            </p>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-4 px-5 py-20">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Questions</h2>
          <div className="mt-8 border-t border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group border-b border-line py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 max-w-2xl text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="rounded-3xl bg-stage px-8 py-14 text-white sm:px-14">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Run your first interview.</h2>
            <p className="mt-3 max-w-xl text-lg text-white/75">
              Sign in with Google and start with a job you are actually applying for.
            </p>
            <div className="mt-8">
              <StartLink />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted">
          <span className="font-display text-base font-bold text-ink">Intervia</span>
          <span>A student project. Scores are AI estimates, not hiring verdicts.</span>
        </div>
      </footer>
    </div>
  );
}