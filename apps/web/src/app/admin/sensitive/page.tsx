"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface Flag {
  id: string;
  category: string;
  status: string;
  createdAt: string;
  claim: {
    id: string;
    status: string;
    campaign: { title: string };
  };
}

export default function SensitiveFlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [rationale, setRationale] = useState<Record<string, string>>({});
  const [deciding, setDeciding] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  function load() {
    const token = getToken();
    setLoading(true);
    api.get<Flag[]>("/admin/sensitive-flags?status=pending", token ?? undefined)
      .then(setFlags)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function decide(flagId: string, decision: "approved" | "rejected") {
    const r = rationale[flagId];
    if (!r || r.length < 10) { setMsg("Rationale must be at least 10 characters"); return; }
    setDeciding(flagId);
    try {
      await api.patch(`/admin/sensitive-flags/${flagId}`, { decision, rationale: r }, getToken() ?? undefined);
      setMsg(`Flag ${decision}`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setDeciding(null);
    }
  }

  const CATEGORY_LABEL: Record<string, string> = {
    medical_fundraising: "Medical fundraising",
    missing_person: "Missing person",
    third_party_named: "Third party named",
    political_in_disguise: "Political in disguise",
  };

  return (
    <div className="page">
      <h1 className="page-title">Sensitive Content Flags</h1>

      {msg && <p className="success-msg" style={{ marginBottom: "1rem" }}>{msg}</p>}

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : flags.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--muted)" }}>No pending sensitive content flags.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {flags.map((f) => (
            <div key={f.id} className="card">
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600 }}>{f.claim.campaign.title}</span>
                  <span className="badge badge-red">{CATEGORY_LABEL[f.category] ?? f.category}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                  Claim {f.claim.id.slice(0, 12)}… · {new Date(f.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="form-row">
                <label>Decision rationale</label>
                <textarea
                  rows={3}
                  value={rationale[f.id] ?? ""}
                  onChange={(e) => setRationale((prev) => ({ ...prev, [f.id]: e.target.value }))}
                  placeholder="Reviewer notes…"
                />
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button className="btn-primary" disabled={deciding === f.id} onClick={() => decide(f.id, "approved")}>
                  Clear
                </button>
                <button className="btn-danger" disabled={deciding === f.id} onClick={() => decide(f.id, "rejected")}>
                  Reject claim
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
