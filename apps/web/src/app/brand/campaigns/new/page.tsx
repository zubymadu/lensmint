"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function NewCampaignPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    brief: "",
    platforms: "instagram",
    campaignType: "standard",
    complianceTier: "commercial",
    qualificationType: "positive_mention",
    budget: "",
    maxCreators: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const token = getToken();
    try {
      const body = {
        title: form.title,
        brief: form.brief,
        platforms: form.platforms.split(",").map((s) => s.trim()),
        campaignType: form.campaignType,
        complianceTier: form.complianceTier,
        qualificationType: form.qualificationType,
        budget: Number(form.budget),
        maxCreators: form.maxCreators ? Number(form.maxCreators) : null,
        contentTypes: ["post"],
        payoutLadder: {
          minimumThreshold: 1000,
          tiers: [
            { minViews: 1000, baseRatePer1k: 50, multiplier: 1 },
            { minViews: 10000, baseRatePer1k: 80, multiplier: 1.2 },
            { minViews: 100000, baseRatePer1k: 120, multiplier: 1.5 },
          ],
        },
      };
      const res = await api.post<{ campaignId: string }>("/campaigns", body, token ?? undefined);
      router.push(`/brand/campaigns/${res.campaignId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">New Campaign</h1>

      <div className="card" style={{ maxWidth: 640 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Campaign title</label>
            <input required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Pepsi Summer Launch" />
          </div>
          <div className="form-row">
            <label>Brief (what creators should do)</label>
            <textarea required rows={4} value={form.brief} onChange={(e) => set("brief", e.target.value)} placeholder="Create a 30s reel featuring our product…" />
          </div>
          <div className="grid-2">
            <div className="form-row">
              <label>Platforms (comma-separated)</label>
              <input value={form.platforms} onChange={(e) => set("platforms", e.target.value)} />
            </div>
            <div className="form-row">
              <label>Campaign type</label>
              <select value={form.campaignType} onChange={(e) => set("campaignType", e.target.value)}>
                <option value="standard">Standard</option>
                <option value="seeding">Seeding</option>
                <option value="streaming">Streaming</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-row">
              <label>Compliance tier</label>
              <select value={form.complianceTier} onChange={(e) => set("complianceTier", e.target.value)}>
                <option value="commercial">Commercial</option>
                <option value="personal">Personal</option>
                <option value="government">Government</option>
                <option value="political">Political</option>
              </select>
            </div>
            <div className="form-row">
              <label>Qualification type</label>
              <select value={form.qualificationType} onChange={(e) => set("qualificationType", e.target.value)}>
                <option value="positive_mention">Positive mention</option>
                <option value="brand_material">Brand material</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-row">
              <label>Budget (NGN)</label>
              <input type="number" required min={1} value={form.budget} onChange={(e) => set("budget", e.target.value)} />
            </div>
            <div className="form-row">
              <label>Max creators (optional)</label>
              <input type="number" min={1} value={form.maxCreators} onChange={(e) => set("maxCreators", e.target.value)} />
            </div>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Creating…" : "Create campaign"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => router.back()}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
