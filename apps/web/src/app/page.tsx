import Link from "next/link";

export default function Home() {
  return (
    <main style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "1.5rem", padding: "2rem", textAlign: "center" }}>
      <div>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          <span style={{ color: "var(--accent-light)" }}>Lens</span>mint
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 420 }}>
          Performance-based, AI-verified creator campaigns. No brand contact required.
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/auth/signin">
          <button className="btn-primary">Sign in</button>
        </Link>
        <Link href="/auth/signup">
          <button className="btn-ghost">Create account</button>
        </Link>
      </div>

      <div className="grid-3" style={{ marginTop: "2rem", maxWidth: 800 }}>
        {[
          { icon: "🎯", title: "Open campaigns", body: "Any creator can claim any campaign — no gatekeeping, no DMs." },
          { icon: "🤖", title: "AI-verified", body: "Claude checks sentiment, brand assets, and attribution automatically." },
          { icon: "💸", title: "Performance payouts", body: "Non-linear payout ladders — better content earns more." },
        ].map((f) => (
          <div key={f.title} className="card" style={{ textAlign: "left" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{f.icon}</div>
            <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{f.title}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{f.body}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
