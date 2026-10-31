import { Mic, PhoneOff, Video } from "lucide-react";
import { useEffect, useState } from "react";

// A short, looping mock interview that shows the one thing that sets Intervia apart: the follow-up.
export const SCRIPT = [
  { who: "ai", text: "You built a chat app with a login system. How did you keep users signed in?" },
  { who: "you", text: "I used JWTs and stored the token in local storage because it was quick to set up." },
  { who: "ai", followUp: true, text: "You mentioned local storage. What could go wrong if a malicious script ran on your page?" },
];

// What to do after the current position: the next position and how long to wait before moving to it.
export function tick(pos, script = SCRIPT) {
  const line = script[pos.step];
  if (pos.chars < line.text.length) {
    return { next: { step: pos.step, chars: pos.chars + 1 }, delay: line.who === "ai" ? 32 : 24 };
  }
  const last = pos.step === script.length - 1;
  return { next: last ? { step: 0, chars: 0 } : { step: pos.step + 1, chars: 0 }, delay: last ? 6000 : 900 };
}

function useReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.(query).matches));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

function Waves({ active }) {
  return (
    <div className="mt-3 flex h-6 items-end gap-1" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`h-full w-1 rounded-full bg-white/70 ${active ? "wave-bar" : ""}`}
          style={{ transform: active ? undefined : "scaleY(0.25)", transformOrigin: "bottom", animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

export default function HeroDemo() {
  const reduced = useReducedMotion();
  const [pos, setPos] = useState({ step: 0, chars: 0 });

  useEffect(() => {
    if (reduced) return undefined;
    const { next, delay } = tick(pos);
    const t = setTimeout(() => setPos(next), delay);
    return () => clearTimeout(t);
  }, [pos, reduced]);

  // With reduced motion the whole exchange is shown at once and nothing moves.
  const shown = SCRIPT.map((line, i) => (reduced || i < pos.step ? line.text : i === pos.step ? line.text.slice(0, pos.chars) : ""));
  const current = SCRIPT[pos.step];
  const typing = !reduced && pos.chars < current.text.length;
  const aiSpeaking = typing && current.who === "ai";
  const youSpeaking = typing && current.who === "you";

  return (
    <div aria-hidden="true" className="rounded-2xl bg-[#12152b] p-4 text-white shadow-2xl ring-1 ring-white/10 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Question 3 of 8</p>
          <div className="mt-1.5 flex w-40 gap-1">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${i < 2 ? "bg-white" : i === 2 ? "bg-white/60" : "bg-white/20"}`} />
            ))}
          </div>
        </div>
        <span className="text-sm tabular-nums text-white/70">04:12</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl bg-[#1d2142]">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-teal text-xl font-semibold ${aiSpeaking ? "ring-4 ring-white/50" : ""}`}>AI</div>
          <Waves active={aiSpeaking} />
          <p className="mt-1 text-xs text-white/70">Interviewer</p>
        </div>
        <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl bg-[#1d2142]">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-xl font-semibold ${youSpeaking ? "ring-4 ring-white/50" : ""}`}>Y</div>
          <Waves active={youSpeaking} />
          <p className="mt-1 text-xs text-white/70">You</p>
        </div>
      </div>

      <div className="mt-4 min-h-[13rem] space-y-3 text-sm leading-snug sm:min-h-[11rem]">
        {SCRIPT.map((line, i) =>
          shown[i] ? (
            <div key={i} className={line.who === "you" ? "border-l-2 border-white/30 pl-3 text-white/80" : ""}>
              <p className="mb-0.5 flex items-center gap-2 text-xs text-white/60">
                {line.who === "ai" ? "Interviewer" : "You"}
                {line.followUp && <span className="rounded-full border border-gold px-2 py-px text-white/90">Follow-up on your answer</span>}
              </p>
              <p>{shown[i]}</p>
            </div>
          ) : null
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><Mic size={16} /></span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><Video size={16} /></span>
        <span className="flex items-center gap-2 rounded-full bg-danger px-4 py-2 text-xs font-medium"><PhoneOff size={14} />End</span>
      </div>
    </div>
  );
}