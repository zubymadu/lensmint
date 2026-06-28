"use client";

import { Nav } from "@/components/Nav";

const LINKS = [
  { label: "Discover", href: "/creator" },
  { label: "My claims", href: "/creator/claims" },
  { label: "Verify identity", href: "/creator/identity" },
];

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav role="creator" links={LINKS} />
      {children}
    </>
  );
}
