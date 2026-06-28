"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface Claim {
  id: string;
  status: string;
  trackedLink: string | null;
  trackedHashtag: string | null;
  claimedAt: string;
  campaign: { title: string; campaignType: string };
  payout: { amount: string; status: string } | null;
}

const STATUS_BADGE: Record<string, string> = {
  active: "badge-yellow",
  submitted: "badge-yellow",
  qualifying: "badge-yellow",
  qualified: "badge-green",
  disqualified: "badge-red",
  under_review: "badge-yellow",
  paid: "badge-green",
  rejected: "badge-red",
  no_show: "badge-red",
};

export default function MyClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    api.get<Claim[]>("/my/claims", token ?? undefined)
      .then(setClaims)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <h1 className="page-title">My Claims</h1>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : claims.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>You haven't claimed any campaigns yet.</p>
          <Link href="/creator"><button className="btn-primary">Browse campaigns</button></Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {claims.map((c) => (
            <div key={c.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{c.campaign.title}</div>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span className={`badge ${STATUS_BADGE[c.status] ?? "badge-gray"}`}>{c.status}</span>
                    <span className="badge badge-gray">{c.campaign.campaignType}</span>
                  </div>
                  {c.trackedLink && (
                    <p style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "monospace" }}>
                      {c.trackedLink}  {c.trackedHashtag}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  {c.payout ? (
                    <div className="stat">
                      <span className="stat-value" style={{ fontSize: "1.1rem" }}>₦{Number(c.payout.amount).toLocaleString()}</span>
                      <span className="stat-label">{c.payout.status}</span>
                    </div>
                  ) : null}
                  <Link href={`/creator/claims/${c.id}`} style={{ fontSize: "0.8rem", display: "block", marginTop: "0.5rem" }}>Manage →</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
