"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface Campaign {
  id: string;
  title: string;
  brief: string;
  campaignType: string;
  platforms: string[];
  budget: number;
  currency: string;
  _count?: { claims: number };
}

export default function DiscoverPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get<Campaign[]>("/campaigns")
      .then(setCampaigns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function claim(campaignId: string) {
    setClaiming(campaignId);
    const token = getToken();
    try {
      const res = await api.post<{ claimId: string; trackedLink: string; trackedHashtag: string }>(
        `/campaigns/${campaignId}/claims`,
        {},
        token ?? undefined,
      );
      setMsgs((m) => ({ ...m, [campaignId]: `Claimed! Your link: ${res.trackedLink}` }));
    } catch (e) {
      setMsgs((m) => ({ ...m, [campaignId]: e instanceof Error ? e.message : "Failed" }));
    } finally {
      setClaiming(null);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Discover Campaigns</h1>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : campaigns.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No active campaigns right now.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {campaigns.map((c) => (
            <div key={c.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem" }}>
                    <span style={{ fontWeight: 600 }}>{c.title}</span>
                    <span className="badge badge-purple">{c.campaignType}</span>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.5, marginBottom: "0.5rem" }}>
                    {c.brief.slice(0, 160)}{c.brief.length > 160 ? "…" : ""}
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    {c.platforms.join(", ")} · {c._count?.claims ?? 0} creators
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: 140, alignItems: "flex-end" }}>
                  <button
                    className="btn-primary"
                    disabled={claiming === c.id}
                    onClick={() => claim(c.id)}
                  >
                    {claiming === c.id ? "Claiming…" : "Claim campaign"}
                  </button>
                  <Link href={`/creator/campaigns/${c.id}`} style={{ fontSize: "0.8rem" }}>View details →</Link>
                </div>
              </div>
              {msgs[c.id] && (
                <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: msgs[c.id].startsWith("Claimed") ? "var(--success)" : "var(--danger)" }}>
                  {msgs[c.id]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
