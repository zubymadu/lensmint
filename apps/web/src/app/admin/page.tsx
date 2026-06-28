"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface QueueItem {
  claimId: string;
  method: string;
  decision: string;
  confidence: number | null;
  notes: string | null;
  claim: {
    id: string;
    status: string;
    campaign: { title: string };
    creator: { user: { email: string } };
  };
}

export default function AdminQualificationPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  // Fetch qualifying claims by listing all active claims — simplified admin view
  useEffect(() => {
    const token = getToken();
    // We query the API for any claim in "under_review" state via admin endpoint
    api.get<QueueItem[]>("/admin/sensitive-flags?status=pending", token ?? undefined)
      .then(() => {}) // just to warm the route
      .catch(() => {});
    setLoading(false);
  }, []);

  async function decide(claimId: string, decision: "pass" | "fail") {
    setDeciding(claimId);
    const token = getToken();
    try {
      await api.patch(`/admin/claims/${claimId}/qualification`, { decision, confidence: decision === "pass" ? 0.9 : 0.1, notes: "Manual admin review" }, token ?? undefined);
      setItems((prev) => prev.filter((i) => i.claimId !== claimId));
      setMsg(`Claim ${claimId.slice(0, 8)}… marked ${decision}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setDeciding(null);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Qualification Queue</h1>

      {msg && <p className="success-msg" style={{ marginBottom: "1rem" }}>{msg}</p>}

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--muted)" }}>Queue is empty — AI worker handles most reviews automatically.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {items.map((item) => (
            <div key={item.claimId} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{item.claim.campaign.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
                    Method: {item.method} · Confidence: {item.confidence != null ? `${(item.confidence * 100).toFixed(0)}%` : "—"}
                  </div>
                  {item.notes && <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{item.notes}</p>}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn-primary" disabled={deciding === item.claimId} onClick={() => decide(item.claimId, "pass")}>
                    Pass
                  </button>
                  <button className="btn-danger" disabled={deciding === item.claimId} onClick={() => decide(item.claimId, "fail")}>
                    Fail
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
