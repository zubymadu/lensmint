"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function IdentityPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "bank">("phone");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [psp, setPsp] = useState("paystack");
  const [addingBank, setAddingBank] = useState(false);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg("");
    setSending(true);
    try {
      await api.post("/identity/otp/send", { phone }, getToken() ?? undefined);
      setMsg("OTP sent. Check your phone.");
      setStep("otp");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg("");
    setVerifying(true);
    try {
      await api.post("/identity/otp/verify", { phone, otp }, getToken() ?? undefined);
      setMsg("Phone verified!");
      setStep("bank");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "OTP verification failed");
    } finally {
      setVerifying(false);
    }
  }

  async function addBank(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg("");
    setAddingBank(true);
    try {
      await api.post("/identity/bank-account", { accountNumber, bankCode, pspProvider: psp }, getToken() ?? undefined);
      setMsg("Bank account verified — you are now Tier 1!");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bank account verification failed");
    } finally {
      setAddingBank(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Verify Your Identity</h1>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
        {(["phone", "otp", "bank"] as const).map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {i > 0 && <span style={{ color: "var(--border)" }}>—</span>}
            <span style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: step === s ? "var(--accent-light)" : "var(--muted)",
            }}>
              {i + 1}. {s === "phone" ? "Phone" : s === "otp" ? "Verify OTP" : "Bank account"}
            </span>
          </div>
        ))}
      </div>

      {step === "phone" && (
        <div className="card" style={{ maxWidth: 420 }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Enter your phone number</h2>
          <form onSubmit={sendOtp}>
            <div className="form-row">
              <label>Phone (with country code)</label>
              <input type="tel" required placeholder="+2348012345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {msg && <p className="success-msg">{msg}</p>}
            {err && <p className="error-msg">{err}</p>}
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={sending}>
                {sending ? "Sending…" : "Send OTP"}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === "otp" && (
        <div className="card" style={{ maxWidth: 420 }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Enter the OTP</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1rem" }}>
            Sent to {phone}. In dev mode the code is <strong>123456</strong>.
          </p>
          <form onSubmit={verifyOtp}>
            <div className="form-row">
              <label>One-time code</label>
              <input type="text" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} />
            </div>
            {msg && <p className="success-msg">{msg}</p>}
            {err && <p className="error-msg">{err}</p>}
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={verifying}>
                {verifying ? "Verifying…" : "Verify OTP"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setStep("phone")}>Back</button>
            </div>
          </form>
        </div>
      )}

      {step === "bank" && (
        <div className="card" style={{ maxWidth: 420 }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Link your bank account</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1rem" }}>
            We resolve your account name via the PSP to verify ownership. No BVN/NIN required.
          </p>
          <form onSubmit={addBank}>
            <div className="form-row">
              <label>Account number</label>
              <input type="text" required maxLength={10} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Bank code (NUBAN)</label>
              <input type="text" required placeholder="044" value={bankCode} onChange={(e) => setBankCode(e.target.value)} />
            </div>
            <div className="form-row">
              <label>PSP provider</label>
              <select value={psp} onChange={(e) => setPsp(e.target.value)}>
                <option value="paystack">Paystack</option>
                <option value="moniepoint">Moniepoint</option>
                <option value="opay">OPay</option>
              </select>
            </div>
            {msg && <p className="success-msg">{msg}</p>}
            {err && <p className="error-msg">{err}</p>}
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={addingBank}>
                {addingBank ? "Verifying…" : "Verify bank account"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
