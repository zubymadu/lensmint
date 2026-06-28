"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface Claim {
  id: string;
  status: string;
  trackedLink: string | null;
  trackedHashtag: string | null;
  claimedAt: string;
  campaign: { title: string; campaignType: string; platforms: string[] };
}

export default function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);

  // Submission form state
  const [postUrl, setPostUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [postedAt, setPostedAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const token = getToken();
    api.get<Claim>(`/claims/${id}`, token ?? undefined)
      .then((c) => { setClaim(c); setPlatform(c.campaign.platforms[0] ?? ""); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg("");
    setSubmitting(true);
    try {
      const res = await api.post<{ status: string; trackedIdentifierPresent: boolean }>(
        `/claims/${id}/submissions`,
        { postUrl, platform, postedAt },
        getToken() ?? undefined,
      );
      setMsg(`Submission ${res.status}. Attribution: ${res.trackedIdentifierPresent ? "✓" : "✗"}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;
  if (!claim) return <div className="page"><p>Claim not found.</p></div>;

  return (
    <div className="page">
      <button className="btn-ghost" style={{ marginBottom: "1rem", fontSize: "0.8rem" }} onClick={() => router.back()}>← Back</button>

      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.25rem" }}>{claim.campaign.title}</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>Status: <strong>{claim.status}</strong></p>

      {claim.trackedLink && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Your tracked identifiers</h2>
          <p style={{ fontFamily: "monospace", fontSize: "0.875rem", marginBottom: "0.4rem" }}>
            Link: <strong>{claim.trackedLink}</strong>
          </p>
          <p style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
            Hashtag: <strong>{claim.trackedHashtag}</strong>
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.75rem" }}>
            Include the link or hashtag in your post so Lensmint can verify attribution.
          </p>
        </div>
      )}

      {claim.status === "active" && (
        <div className="card" style={{ maxWidth: 540 }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Submit your post</h2>
          <form onSubmit={submitLink}>
            <div className="form-row">
              <label>Post URL</label>
              <input type="url" required value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="https://instagram.com/p/…" />
            </div>
            <div className="grid-2">
              <div className="form-row">
                <label>Platform</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  {claim.campaign.platforms.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>When did you post?</label>
                <input type="datetime-local" required value={postedAt} onChange={(e) => setPostedAt(e.target.value)} />
              </div>
            </div>
            {msg && <p className="success-msg">{msg}</p>}
            {err && <p className="error-msg">{err}</p>}
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit post"}
              </button>
            </div>
          </form>
        </div>
      )}

      {claim.status !== "active" && (
        <div className="card">
          <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            Your claim is <strong>{claim.status}</strong>. Check back for qualification results and payout status.
          </p>
        </div>
      )}
    </div>
  );
}
