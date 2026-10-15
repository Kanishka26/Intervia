"""Cross-interview statistics for the dashboard, computed from saved turns (no LLM calls)."""
from statistics import mean

DIMS = ["relevance", "technical_depth", "clarity", "completeness"]
WEAK = 3.0
STRONG = 4.0


def _turn_score(t: dict) -> float:
    return mean(t["evaluation"]["scores"][d] for d in DIMS)


def compute_insights(docs: list[dict]) -> dict:
    done = [d for d in docs if d.get("status") == "complete" and d.get("turns")]
    done.sort(key=lambda d: d.get("created_at", 0))

    trend, by_dim, by_type, by_topic, names = [], {k: [] for k in DIMS}, {}, {}, {}
    words = fillers = 0
    timed_words = timed_minutes = 0.0
    spoken = 0

    for d in done:
        scores = [_turn_score(t) for t in d["turns"]]
        trend.append({
            "id": d["id"],
            "created_at": d.get("created_at", 0),
            "role": (d.get("profile") or {}).get("role", ""),
            "overall": round(mean(scores), 2),
        })
        had_speech = False
        for t, sc in zip(d["turns"], scores):
            for k in DIMS:
                by_dim[k].append(t["evaluation"]["scores"][k])
            by_type.setdefault(t.get("type") or "other", []).append(sc)
            topic = (t.get("topic") or "General").strip() or "General"
            key = topic.lower()
            names.setdefault(key, topic)
            by_topic.setdefault(key, []).append(sc)
            sp = t.get("speech")
            if sp:
                had_speech = True
                words += sp.get("words", 0)
                fillers += sp.get("filler_total", 0)
                if sp.get("wpm"):
                    timed_words += sp["words"]
                    timed_minutes += sp["duration_s"] / 60
        spoken += had_speech

    topics = sorted(
        ({"topic": names[k], "avg": round(mean(v), 2), "count": len(v)} for k, v in by_topic.items()),
        key=lambda x: x["avg"],
    )
    return {
        "interviews": len(done),
        "answers": sum(len(d["turns"]) for d in done),
        "average": round(mean(r["overall"] for r in trend), 2) if trend else None,
        "trend": trend[-20:],
        "by_dimension": {k: round(mean(v), 2) for k, v in by_dim.items() if v},
        "by_type": {k: round(mean(v), 2) for k, v in by_type.items()},
        "weak_topics": [t for t in topics if t["avg"] < WEAK][:8],
        "strong_topics": [t for t in reversed(topics) if t["avg"] >= STRONG][:5],
        "speech": (
            {
                "interviews": spoken,
                "avg_wpm": round(timed_words / timed_minutes) if timed_minutes else None,
                "filler_per_100_words": round(100 * fillers / words, 1) if words else 0,
            }
            if words
            else None
        ),
    }