"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface Campaign {
  id: string;
  title: string;
  brief: string;
  status: string;
  campaignType: string;
  platforms: string[];
  complianceTier: string;
  requiresDisclosureLabel: boolean;
  _count?: { claims: number };
}

export default function CreatorCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get<Campaign>(`/campaigns/${id}`)
      .then(setCampaign)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function claim() {
    setClaiming(true); setErr(""); setMsg("");
    try {
      const res = await api.post<{ claimId: string; trackedLink: string; trackedHashtag: string }>(
        `/campaigns/${id}/claims`, {}, getToken() ?? undefined,
      );
      setMsg(`Claimed! Link: ${res.trackedLink}  Hashtag: ${res.trackedHashtag}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to claim");
    } finally {
      setClaiming(false);
    }
  }

  if (loading) return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;
  if (!campaign) return <div className="page"><p>Campaign not found.</p></div>;

  return (
    <div className="page">
      <button className="btn-ghost" style={{ marginBottom: "1rem", fontSize: "0.8rem" }} onClick={() => router.back()}>← Back</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>{campaign.title}</h1>
          <p style={{ color: "var(--muted)", marginTop: "0.25rem" }}>
            {campaign.platforms.join(", ")} · {campaign.campaignType} · {campaign._count?.claims ?? 0} creators
          </p>
        </div>
        <button className="btn-primary" onClick={claim} disabled={claiming}>
          {claiming ? "Claiming…" : "Claim campaign"}
        </button>
      </div>

      {msg && <p className="success-msg" style={{ marginBottom: "1rem" }}>{msg}</p>}
      {err && <p className="error-msg" style={{ marginBottom: "1rem" }}>{err}</p>}

      <div className="card">
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Brief</h2>
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.7 }}>{campaign.brief}</p>
        {campaign.requiresDisclosureLabel && (
          <p style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--warning)" }}>
            ⚠ This campaign requires a disclosure label (#ad or as directed).
          </p>
        )}
      </div>
    </div>
  );
}
