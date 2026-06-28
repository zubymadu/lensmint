"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface LedgerEntry {
  id: string;
  entryType: string;
  amount: string;
  currency: string;
  campaignId: string | null;
  pspProvider: string | null;
  timestamp: string;
}

interface Campaign { id: string; title: string; }

export default function LedgerPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    api.get<Campaign[]>("/campaigns", token ?? undefined).then(setCampaigns).catch(console.error);
  }, []);

  async function loadLedger(campaignId: string) {
    setSelected(campaignId);
    setLoading(true);
    try {
      const data = await api.get<LedgerEntry[]>(`/campaigns/${campaignId}/ledger`, getToken() ?? undefined);
      setEntries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function typeColor(t: string) {
    if (t === "deposit") return "badge-green";
    if (t === "payout") return "badge-red";
    if (t === "commission_revenue") return "badge-purple";
    return "badge-gray";
  }

  return (
    <div className="page">
      <h1 className="page-title">Ledger</h1>

      <div className="form-row" style={{ maxWidth: 320, marginBottom: "1.5rem" }}>
        <label>Select campaign</label>
        <select value={selected} onChange={(e) => loadLedger(e.target.value)}>
          <option value="">Choose…</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}

      {!loading && entries.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>PSP</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td><span className={`badge ${typeColor(e.entryType)}`}>{e.entryType}</span></td>
                  <td style={{ fontWeight: 600 }}>₦{Number(e.amount).toLocaleString()}</td>
                  <td>{e.currency}</td>
                  <td style={{ color: "var(--muted)" }}>{e.pspProvider ?? "—"}</td>
                  <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{new Date(e.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && selected && entries.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No ledger entries yet.</p>
      )}
    </div>
  );
}
