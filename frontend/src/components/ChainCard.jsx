import { useCallback, useEffect, useState } from "react";
import { anchorReport, verifyReport } from "../api.js";

const when = (t) => new Date(t * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function Row({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="break-all font-mono text-xs">{value}</dd>
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

  const btn = "rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium disabled:opacity-50";
  const primary = "rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50";
  const status = info?.status;
  const a = info?.anchor;

  return (
    <section className="rounded-xl border border-line p-5">
      <h2 className="text-2xl font-semibold">Blockchain verification</h2>
      <p className="mt-1 text-sm text-muted">
        Only a fingerprint (SHA-256 hash) of this report is stored on the chain. Your answers and scores stay in
        the database. If anyone edits the report later, the fingerprint no longer matches.
      </p>

      {loading && <p role="status" className="mt-3 text-muted">Checking…</p>}

      {error && (
        <div className="mt-3">
          <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
          {!info && (
            <button onClick={check} disabled={busy} className={`${btn} mt-3`}>Try again</button>
          )}
        </div>
      )}

      {status === "not_anchored" && (
        <div className="mt-4">
          <p>This report has not been anchored yet.</p>
          <button onClick={() => anchor()} disabled={busy} className={`${primary} mt-3`}>
            {busy ? "Anchoring…" : "Anchor on blockchain"}
          </button>
        </div>
      )}

      {status === "verified" && (
        <p role="status" className="mt-4 font-semibold text-teal">
          ✓ Verified: this report matches the record on the chain.
        </p>
      )}
      {status === "mismatch" && (
        <p role="alert" className="mt-4 font-semibold text-danger">
          ✗ Mismatch: this report has changed since it was anchored.
        </p>
      )}
      {status === "chain_reset" && (
        <div className="mt-4">
          <p role="status" className="rounded-md border border-gold px-3 py-2 text-sm">
            The local demo blockchain was restarted, so the old record is gone. This does not mean the report
            was changed. Anchor it again to create a fresh record.
          </p>
          <button onClick={() => anchor(true)} disabled={busy} className={`${primary} mt-3`}>
            {busy ? "Anchoring…" : "Anchor again"}
          </button>
        </div>
      )}

      {info && status !== "not_anchored" && a && (
        <>
          <dl className="mt-4 space-y-3">
            <Row label="Report hash (SHA-256)" value={info.hash} />
            <Row label="Transaction" value={a.tx} />
            <Row label="Block" value={`${a.block} (chain ${a.chain_id})`} />
            <Row label="Contract" value={a.contract} />
            <Row label="Anchored" value={when(a.anchored_at)} />
          </dl>
          <button onClick={check} disabled={busy} className={`${btn} mt-4`}>
            {busy ? "Checking…" : "Verify again"}
          </button>
        </>
      )}
    </section>
  );
}