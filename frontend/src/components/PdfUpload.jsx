import { useState } from "react";
import { extractResume } from "../api.js";

export default function PdfUpload({ label, disabled, onText, onError }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function onChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    onError("");
    setNote("");
    setBusy(true);
    try {
      const { text } = await extractResume(file);
      onText(text);
      setNote(
        `Read ${text.length.toLocaleString()} characters from ${file.name}. Check them below and fix anything that looks wrong.`
      );
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
      e.target.value = ""; // lets the user re-pick the same file
    }
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="application/pdf"
          onChange={onChange}
          disabled={disabled || busy}
          aria-label={label}
          className="text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        {busy && <span className="text-sm text-muted" role="status">Reading PDF…</span>}
      </div>
      {note && <p className="mb-2 text-sm text-muted" role="status">{note}</p>}
    </>
  );
}