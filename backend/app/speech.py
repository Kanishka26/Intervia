"""Speaking metrics. Text-based numbers are computed here from the transcript;
only timing (duration, pauses) comes from the browser."""
import re

MIN_SECONDS = 3.0  # below this, words-per-minute is meaningless
MIN_WORDS = 8

# Deliberately excludes "like" and "so": too many legitimate uses to count reliably.
FILLERS = {
    "um/uh": r"\b(?:um+|uh+|er+|erm|hmm+)\b",
    "you know": r"\byou know\b",
    "basically": r"\bbasically\b",
    "actually": r"\bactually\b",
    "literally": r"\bliterally\b",
    "i mean": r"\bi mean\b",
}


def analyze(text: str, duration_s: float, pauses: int, longest_pause_s: float) -> dict:
    words = len(re.findall(r"\w+(?:['’-]\w+)*", text))
    counts = {k: len(re.findall(p, text, re.I)) for k, p in FILLERS.items()}
    counts = {k: v for k, v in counts.items() if v}
    total = sum(counts.values())
    timed = duration_s >= MIN_SECONDS and words >= MIN_WORDS
    return {
        "words": words,
        "duration_s": round(duration_s, 1),
        "wpm": round(words / (duration_s / 60)) if timed else None,
        "filler_total": total,
        "fillers": counts,
        "pauses": pauses,
        "longest_pause_s": round(longest_pause_s, 1),
    }