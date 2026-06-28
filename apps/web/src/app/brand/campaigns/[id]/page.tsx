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
  complianceTier: string;
  budget: number;
  currency: string;
  requiresDisclosureLabel: boolean;
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [funding, setFunding] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [psp, setPsp] = useState("paystack");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const token = getToken();
    api.get<Campaign>(`/campaigns/${id}`, token ?? undefined)
      .then(setCampaign)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function publish() {
    setErr(""); setMsg("");
    setPublishing(true);
    try {
      await api.post(`/campaigns/${id}/publish`, {}, getToken() ?? undefined);
      setMsg("Campaign published!");
      setCampaign((c) => c ? { ...c, status: "active" } : c);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setPublishing(false);
    }
  }

  async function fund(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg("");
    setFunding(true);
    try {
      await api.post(`/campaigns/${id}/fund`, { amount: Number(fundAmount), currency: "NGN", pspProvider: psp }, getToken() ?? undefined);
      setMsg("Budget deposited into escrow!");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setFunding(false);
    }
  }

  if (loading) return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;
  if (!campaign) return <div className="page"><p>Campaign not found.</p></div>;

  return (
    <div className="page">
      <button className="btn-ghost" style={{ marginBottom: "1rem", fontSize: "0.8rem" }} onClick={() => router.back()}>← Back</button>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>{campaign.title}</h1>
          <p style={{ color: "var(--muted)", marginTop: "0.25rem" }}>{campaign.complianceTier} · {campaign.campaignType}</p>
        </div>
        <span className={`badge ${campaign.status === "active" ? "badge-green" : campaign.status === "draft" ? "badge-gray" : "badge-yellow"}`}>
          {campaign.status}
        </span>
      </div>

      <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
        <div className="card">
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Campaign brief</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>{campaign.brief}</p>
          {campaign.requiresDisclosureLabel && (
            <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--warning)" }}>
              ⚠ Requires disclosure label (#ad or equivalent)
            </p>
          )}
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {campaign.status === "draft" && (
            <>
              <div>
                <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Fund campaign</h2>
                <form onSubmit={fund}>
                  <div className="form-row">
                    <label>Amount (NGN)</label>
                    <input type="number" min={1} required value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} />
                  </div>
                  <div className="form-row">
                    <label>PSP provider</label>
                    <select value={psp} onChange={(e) => setPsp(e.target.value)}>
                      <option value="paystack">Paystack</option>
                      <option value="moniepoint">Moniepoint</option>
                      <option value="opay">OPay</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary" disabled={funding}>
                    {funding ? "Depositing…" : "Deposit to escrow"}
                  </button>
                </form>
              </div>

              <div>
                <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Publish</h2>
                <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.75rem" }}>Make this campaign visible to all creators.</p>
                <button className="btn-primary" onClick={publish} disabled={publishing}>
                  {publishing ? "Publishing…" : "Publish campaign"}
                </button>
              </div>
            </>
          )}

          {campaign.status !== "draft" && (
            <div className="stat">
              <span className="stat-label">Status</span>
              <span className="stat-value" style={{ fontSize: "1.1rem" }}>{campaign.status}</span>
            </div>
          )}
        </div>
      </div>

      {msg && <p className="success-msg">{msg}</p>}
      {err && <p className="error-msg">{err}</p>}
    </div>
  );
}
