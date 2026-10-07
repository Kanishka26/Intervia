from dotenv import load_dotenv

load_dotenv()
from google import genai

c = genai.Client()
for m in ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite",
          "gemini-3.1-flash-lite", "gemini-3-flash-preview"]:
    try:
        r = c.models.generate_content(model=m, contents="Say ok")
        print(m, "OK", (r.text or "").strip()[:20])
    except Exception as e:
        print(m, getattr(e, "code", None), str(e)[:90])