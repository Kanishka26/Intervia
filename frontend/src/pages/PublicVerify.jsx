import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Hash,
  Link as LinkIcon,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { publicVerify } from "../api.js";

const when = (t) =>
  new Date(t * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function PublicVerify() {
  const { id: urlId } = useParams();
  const [query, setQuery] = useState(urlId || "");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (urlId) {
      doVerify(urlId);
    }
  }, [urlId]);

  async function doVerify(targetId) {
    if (!targetId?.trim()) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await publicVerify(targetId.trim());
      setData(res);
    } catch (err) {
      setError(err.message || "Failed to verify certificate");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    if (query) doVerify(query);
  }

  function copyLink() {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isVerified = data?.valid || data?.chain_status === "verified" || data?.chain_status === "verified_cached";
  const a = data?.anchor;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Top Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 border border-teal/20 px-3 py-1 text-xs font-bold text-teal">
          <ShieldCheck size={14} />
          <span>Decentralized Credential Registry</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-ink">
          Cryptographic Interview Verifier
        </h1>
        <p className="text-sm text-muted max-w-xl mx-auto">
          Verify tamper-evident interview scores, candidate transcripts, and AI evaluations anchored to the Ethereum / Polygon blockchain.
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-sm focus-within:border-teal">
          <Search size={18} className="text-muted ml-2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter Session ID (e.g. cand-seed-01) or SHA-256 Digest (0x...)"
            className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none px-2 font-mono"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-teal px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-dark transition-all disabled:opacity-50 shrink-0"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            <span>Verify Proof</span>
          </button>
        </div>
      </form>

      {/* Error Notice */}
      {error && (
        <div className="rounded-2xl border border-danger/40 bg-danger/5 p-5 text-sm text-danger flex items-start gap-3 mb-8">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Verification Failed</div>
            <p className="text-xs mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Verification Results Certificate Card */}
      {data && (
        <div className="space-y-6">
          <div
            className={`rounded-3xl border p-6 sm:p-8 shadow-md transition-all ${
              isVerified
                ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
                : "border-danger/30 bg-danger/5"
            }`}
          >
            {/* Status Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-line/60">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    isVerified ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-danger/15 text-danger"
                  }`}
                >
                  {isVerified ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
                </div>
                <div>
                  <h2 className="font-display text-xl font-extrabold text-ink">
                    {isVerified ? "Cryptographically Verified On-Chain" : "Tampering Detected or Unanchored"}
                  </h2>
                  <p className="text-xs text-muted">
                    {isVerified
                      ? "The SHA-256 fingerprint matches the immutable smart contract record with 100% mathematical integrity."
                      : "The report data has been altered from its original hash, or has not yet been anchored."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink hover:bg-paper transition-colors"
                >
                  {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copied ? "Link Copied" : "Share Verification"}</span>
                </button>
              </div>
            </div>

            {/* Candidate Credential Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6 border-b border-line/60 text-xs">
              <div className="space-y-1">
                <div className="text-muted font-medium">Candidate Role</div>
                <div className="font-bold text-ink text-sm sm:text-base">{data.role}</div>
                <span className="inline-block rounded-full bg-paper border border-line px-2 py-0.5 text-[10px] font-semibold text-muted capitalize">
                  Level: {data.experience_level || "Standard"}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-muted font-medium">Verified Overall Score</div>
                <div className="font-display text-2xl font-black text-teal">
                  {data.overall_score != null ? `${data.overall_score} / 5.0` : "Evaluated"}
                </div>
                <div className="text-[11px] text-muted">Based on {data.total_turns} multi-turn AI interview prompts</div>
              </div>

              <div className="space-y-1">
                <div className="text-muted font-medium">Timestamp Anchored</div>
                <div className="font-bold text-ink text-sm">
                  {a?.anchored_at ? when(a.anchored_at) : (data.created_at ? when(data.created_at) : "Recently")}
                </div>
                <div className="text-[11px] font-mono text-muted">
                  Block #{a?.block || data?.on_chain?.block || 1042}
                </div>
              </div>
            </div>

            {/* On-Chain Ledger Proof Metadata */}
            <div className="pt-6 space-y-3">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                Cryptographic Ledger Attributes
              </h3>

              <div className="rounded-2xl border border-line bg-surface/70 p-4 space-y-2 text-xs font-mono">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-muted font-sans font-medium">SHA-256 Canonical Fingerprint:</span>
                  <span className="break-all text-ink font-semibold text-[11px]">{data.report_hash}</span>
                </div>

                {a?.tx && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-muted font-sans font-medium">Transaction Hash:</span>
                    <span className="break-all text-teal font-semibold text-[11px]">{a.tx}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-muted font-sans font-medium">Smart Contract (ReportRegistry):</span>
                  <span className="break-all text-muted text-[11px]">{a?.contract || "0x5FbDB2315678afecb367f032d93F642f64180aa3"}</span>
                </div>
              </div>
            </div>

            {/* Evaluated Competencies */}
            {data.strengths && data.strengths.length > 0 && (
              <div className="pt-6">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-2.5">
                  Verified Candidate Strengths
                </h3>
                <ul className="grid sm:grid-cols-2 gap-2 text-xs">
                  {data.strengths.map((st, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-300 font-medium"
                    >
                      <CheckCircle2 size={13} className="shrink-0" />
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Verification Protocol Explanation */}
          <div className="rounded-2xl border border-line bg-surface p-5 text-xs text-muted space-y-2">
            <div className="font-bold text-ink flex items-center gap-1.5">
              <Sparkles size={14} className="text-teal" />
              <span>How Intervia's Hash-Only Cryptographic Anchoring Works</span>
            </div>
            <p>
              To respect GDPR and privacy regulations, candidate personal data and transcripts are never stored directly on the public blockchain. Instead, Intervia computes a canonical SHA-256 hash across all answers, speech metrics, and evaluations. This 32-byte hash is committed to an Ethereum smart contract. Any verification re-computes the hash from source data—if even a single score is altered, the verification fails immediately.
            </p>
          </div>
        </div>
      )}

      {/* Quick Example Links */}
      {!data && !loading && (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center space-y-3">
          <p className="text-xs text-muted">Want to test with a verified candidate benchmark?</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => doVerify("cand-seed-01")}
              className="rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:border-teal hover:text-teal transition-all"
            >
              Verify Aarav Sharma (Full-Stack) &rarr;
            </button>
            <button
              type="button"
              onClick={() => doVerify("cand-seed-02")}
              className="rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:border-teal hover:text-teal transition-all"
            >
              Verify Priya Nair (Backend) &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
