"use client";

import { Nav } from "@/components/Nav";

const LINKS = [
  { label: "Qualification", href: "/admin" },
  { label: "Political reviews", href: "/admin/political" },
  { label: "Sensitive flags", href: "/admin/sensitive" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav role="admin" links={LINKS} />
      {children}
    </>
  );
}
