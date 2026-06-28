"use client";

import { Nav } from "@/components/Nav";

const LINKS = [
  { label: "Campaigns", href: "/brand" },
  { label: "New campaign", href: "/brand/campaigns/new" },
  { label: "Ledger", href: "/brand/ledger" },
];

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav role="brand" links={LINKS} />
      {children}
    </>
  );
}
