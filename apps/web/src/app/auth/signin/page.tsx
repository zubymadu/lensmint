"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function SignInPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ token: string; role: string }>("/auth/signin", form);
      saveSession(res.token, res.role);
      router.push(res.role === "brand" ? "/brand" : res.role === "admin" ? "/admin" : "/creator");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem" }}>
      <div className="card" style={{ width: "100%", maxWidth: 420 }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>Sign in to Lensmint</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>

        <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--muted)" }}>
          No account? <Link href="/auth/signup">Create one</Link>
        </p>
      </div>
    </main>
  );
}
