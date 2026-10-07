# Intervia

Adaptive AI interview simulator. Current state: **layer 1** (text-only interview loop + report), backend and frontend.

## Run backend

    cd backend
    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env        # set ANTHROPIC_API_KEY, or INTERVIA_LLM=mock
    export $(grep -v '^#' .env | xargs)
    uvicorn app.main:app --reload

    # tests (no API key needed)
    INTERVIA_LLM=mock python -m pytest -q

## Run frontend (second terminal)

    cd frontend
    npm install
    npm run dev                 # http://localhost:5173, proxies /api to :8000

Flow: setup form (JD, resume PDF or text, project) -> interview screen -> report.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | /api/resume/extract | PDF -> text (multipart `file`) |
| POST | /api/sessions | `{job_description, resume_text, project_info, n_questions}` -> first question |
| POST | /api/sessions/{id}/answer | `{answer}` -> next question or `status: complete` |
| GET | /api/sessions/{id}/report | scores + feedback (409 until complete) |

## Design rules
- The LLM proposes, the code decides: follow-up cap (2), score clamping 0-5, report numbers computed in code.
- Candidate text is untrusted: fenced in tags, prompts say to treat it as data.
- Scores are hidden during the interview and shown only in the report.

## Next
1. Eval harness: hand-score ~20 answers, compare against LLM scores (`backend/evals/`)
2. Voice (speech-to-text) in the interview screen
3. Pace/pause/filler metrics, then webcam, then blockchain hash
