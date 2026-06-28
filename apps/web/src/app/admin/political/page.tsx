"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface Review {
  id: string;
  status: string;
  decisionRationale: string | null;
  createdAt: string;
  claim: {
    id: string;
    status: string;
    campaign: { title: string; complianceTier: string };
  };
}

export default function PoliticalReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rationale, setRationale] = useState<Record<string, string>>({});
  const [deciding, setDeciding] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  function load() {
    const token = getToken();
    setLoading(true);
    api.get<Review[]>("/admin/political-reviews?status=pending", token ?? undefined)
      .then(setReviews)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function decide(reviewId: string, decision: "approved" | "rejected") {
    const r = rationale[reviewId];
    if (!r || r.length < 10) { setMsg("Rationale must be at least 10 characters"); return; }
    setDeciding(reviewId);
    try {
      await api.patch(`/admin/political-reviews/${reviewId}`, { decision, rationale: r }, getToken() ?? undefined);
      setMsg(`Review ${decision}`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setDeciding(null);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Political Review Queue</h1>

      {msg && <p className="success-msg" style={{ marginBottom: "1rem" }}>{msg}</p>}

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : reviews.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--muted)" }}>No pending political reviews.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {reviews.map((r) => (
            <div key={r.id} className="card">
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontWeight: 600 }}>{r.claim.campaign.title}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                  Claim {r.claim.id.slice(0, 12)}… · {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="form-row">
                <label>Decision rationale (min 10 chars)</label>
                <textarea
                  rows={3}
                  value={rationale[r.id] ?? ""}
                  onChange={(e) => setRationale((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  placeholder="Reviewer notes…"
                />
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button className="btn-primary" disabled={deciding === r.id} onClick={() => decide(r.id, "approved")}>
                  Approve
                </button>
                <button className="btn-danger" disabled={deciding === r.id} onClick={() => decide(r.id, "rejected")}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
