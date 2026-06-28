"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", role: "creator" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ token: string; role: string }>("/auth/signup", form);
      saveSession(res.token, res.role);
      router.push(res.role === "brand" ? "/brand" : "/creator");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem" }}>
      <div className="card" style={{ width: "100%", maxWidth: 420 }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>Create your account</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="form-row">
            <label>I am a</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="creator">Creator</option>
              <option value="brand">Brand</option>
            </select>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>

        <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--muted)" }}>
          Already have an account? <Link href="/auth/signin">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
