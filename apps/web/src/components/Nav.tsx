"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";

interface NavProps {
  role: "brand" | "creator" | "admin";
  links: Array<{ label: string; href: string }>;
}

export function Nav({ role, links }: NavProps) {
  const router = useRouter();

  function signOut() {
    clearSession();
    router.push("/");
  }

  const roleLabel = { brand: "Brand", creator: "Creator", admin: "Admin" }[role];

  return (
    <nav style={{
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      padding: "0 1.5rem",
      display: "flex",
      alignItems: "center",
      height: 56,
      gap: "1.5rem",
    }}>
      <Link href="/" style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)", textDecoration: "none" }}>
        <span style={{ color: "var(--accent-light)" }}>Lens</span>mint
      </Link>

      <span className="badge badge-purple" style={{ fontSize: "0.65rem" }}>{roleLabel}</span>

      <div style={{ display: "flex", gap: "1rem", marginLeft: "0.5rem" }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
            {l.label}
          </Link>
        ))}
      </div>

      <div style={{ marginLeft: "auto" }}>
        <button className="btn-ghost" style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem" }} onClick={signOut}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
