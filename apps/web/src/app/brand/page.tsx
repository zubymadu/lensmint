"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface Campaign {
  id: string;
  title: string;
  status: string;
  campaignType: string;
  complianceTier: string;
  budget: number;
  currency: string;
  _count?: { claims: number };
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: "badge-gray",
    active: "badge-green",
    paused: "badge-yellow",
    completed: "badge-purple",
    cancelled: "badge-red",
  };
  return `badge ${map[status] ?? "badge-gray"}`;
}

export default function BrandDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    api.get<Campaign[]>("/campaigns", token ?? undefined)
      .then(setCampaigns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 className="page-title" style={{ margin: 0 }}>Your Campaigns</h1>
        <Link href="/brand/campaigns/new">
          <button className="btn-primary">+ New campaign</button>
        </Link>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : campaigns.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>No campaigns yet.</p>
          <Link href="/brand/campaigns/new">
            <button className="btn-primary">Create your first campaign</button>
          </Link>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Compliance</th>
                <th>Status</th>
                <th>Claims</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.title}</td>
                  <td style={{ color: "var(--muted)" }}>{c.campaignType}</td>
                  <td style={{ color: "var(--muted)" }}>{c.complianceTier}</td>
                  <td><span className={statusBadge(c.status)}>{c.status}</span></td>
                  <td>{c._count?.claims ?? "—"}</td>
                  <td>
                    <Link href={`/brand/campaigns/${c.id}`} style={{ fontSize: "0.8rem" }}>View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
