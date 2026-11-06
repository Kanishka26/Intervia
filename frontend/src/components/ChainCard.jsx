import { AlertCircle, CheckCircle2, Copy, Hash, Link as LinkIcon, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { anchorReport, verifyReport } from "../api.js";

const when = (t) => new Date(t * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function Row({ label, value, copyable = false }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-line/60 last:border-0 text-xs">
      <dt className="font-semibold text-muted tracking-wide shrink-0 sm:w-44">{label}</dt>
      <dd className="flex items-center gap-1.5 break-all font-mono text-ink">
        <span>{value}</span>
        {copyable && (
          <button
            type="button"
            onClick={copy}
            title="Copy"
            className="p-1 text-muted hover:text-teal transition-colors shrink-0"
          >
            {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </button>
        )}
      </dd>
    </div>
  );
}

export default function ChainCard({ sessionId }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      setInfo(await verifyReport(sessionId));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    check();
  }, [check]);

  async function anchor(redo = false) {
    setError("");
    setBusy(true);
    try {
      await anchorReport(sessionId, redo);
      setInfo(await verifyReport(sessionId));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const status = info?.status;
  const a = info?.anchor;

  return (
    <section className="rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal/10 text-teal">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Cryptographic Verification</h2>
            <p className="text-xs text-muted">
              Tamper-evident verification anchored via immutable cryptographic SHA-256 ledger proof
            </p>
          </div>
        </div>

        {status === "verified" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={14} />
            Verified on Chain
          </span>
        )}
      </div>

      {loading && (
        <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted">
          <RefreshCw size={14} className="animate-spin text-teal" />
          <span>Verifying cryptographic proof on ledger…</span>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-danger/40 bg-danger/5 p-3.5 text-xs text-danger flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
          <button
            onClick={check}
            disabled={busy}
            className="font-bold underline ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {status === "not_anchored" && (
        <div className="mt-5 rounded-2xl bg-paper/60 p-5 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-ink">Not Yet Anchored</p>
            <p className="text-xs text-muted">
              Anchor this report hash on the blockchain to guarantee its authenticity and tamper-resistance for future employers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => anchor()}
            disabled={busy}
            className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-teal/20 hover:bg-teal-dark disabled:opacity-50"
          >
            {busy ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            <span>Anchor Proof</span>
          </button>
        </div>
      )}

      {status === "verified" && (
        <div className="mt-4 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          ✓ Verified: The SHA-256 digest matches the immutable smart-contract record.
        </div>
      )}

      {status === "mismatch" && (
        <div className="mt-4 text-xs text-danger font-medium">
          ✗ Integrity Mismatch: Report data does not match the ledger state.
        </div>
      )}

      {status === "chain_reset" && (
        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-700 dark:text-amber-300">
          <span>The demo ledger was reinitialized. You can re-anchor to generate a new proof block.</span>
          <button
            type="button"
            onClick={() => anchor(true)}
            disabled={busy}
            className="rounded-lg bg-teal px-3 py-1.5 font-bold text-white hover:bg-teal-dark shrink-0"
          >
            Re-anchor
          </button>
        </div>
      )}

      {info && status !== "not_anchored" && a && (
        <div className="mt-4">
          <dl className="rounded-2xl bg-paper/60 p-4 border border-line/60">
            <Row label="Report Hash (SHA-256)" value={info.hash} copyable />
            <Row label="Tx Hash" value={a.tx} copyable />
            <Row label="Block Number" value={`${a.block} (chain ${a.chain_id})`} />
            <Row label="Contract Address" value={a.contract} copyable />
            <Row label="Anchored Timestamp" value={when(a.anchored_at)} />
          </dl>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={check}
              disabled={busy}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
            >
              <RefreshCw size={12} className={busy ? "animate-spin" : ""} />
              <span>Re-verify Block</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
