import { FileCheck, FileText, Loader2, RefreshCw, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { extractResume } from "../api.js";

export default function PdfUpload({
  label = "Upload PDF",
  disabled = false,
  onText,
  onError,
  hint = "PDF up to 5MB",
  onFileLoaded,
}) {
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  async function processFile(file) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      onError("Please select a valid PDF file.");
      return;
    }
    onError("");
    setBusy(true);
    try {
      const { text } = await extractResume(file);
      setFileName(file.name);
      setFileSize(formatSize(file.size));
      setCharCount(text.length);
      onText(text);
      if (onFileLoaded) {
        onFileLoaded({ name: file.name, size: file.size, length: text.length });
      }
    } catch (err) {
      onError(err.message || "Failed to extract text from PDF");
    } finally {
      setBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    if (disabled || busy) return;
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleClick() {
    if (disabled || busy) return;
    fileInputRef.current?.click();
  }

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
        }}
        disabled={disabled || busy}
        className="hidden"
        aria-label={label}
      />

      {fileName && charCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal/40 bg-soft/40 p-3.5 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal text-white shadow-sm">
              <FileCheck size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{fileName}</p>
              <p className="text-xs text-muted">
                {fileSize && <span>{fileSize} • </span>}
                <span className="font-medium text-teal">{charCount.toLocaleString()} characters extracted</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled || busy}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-sm hover:border-teal hover:text-teal disabled:opacity-50"
          >
            <RefreshCw size={13} aria-hidden="true" className={busy ? "animate-spin" : ""} />
            Replace PDF
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
            isDragging
              ? "border-teal bg-soft/60 ring-4 ring-teal/20"
              : "border-line bg-surface/50 hover:border-teal/60 hover:bg-soft/20"
          } ${disabled || busy ? "pointer-events-none opacity-60" : ""}`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-soft text-teal transition-transform group-hover:scale-110">
            {busy ? (
              <Loader2 size={24} className="animate-spin text-teal" aria-hidden="true" />
            ) : (
              <UploadCloud size={24} aria-hidden="true" />
            )}
          </div>
          <p className="mt-3 text-sm font-medium text-ink">
            {busy ? (
              <span className="text-teal font-semibold">Reading PDF & extracting text…</span>
            ) : (
              <>
                <span className="font-semibold text-teal underline underline-offset-2">Click to upload</span> or drag and drop
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-muted">{hint}</p>
        </div>
      )}
    </div>
  );
}
