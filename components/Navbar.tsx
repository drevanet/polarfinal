"use client";

import Link from "next/link";
import { Box, LogOut, Menu, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

type User = { id: string; name?: string | null; email: string };

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setUser(data.user || null))
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
            <Box className="h-5 w-5" />
          </span>
          RevaBox Shot Studio
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link href="/editor" className="text-sm text-white/65 hover:text-white">Editor</Link>
          <Link href="/pricing" className="text-sm text-white/65 hover:text-white">Pricing</Link>

          {user ? (
            <>
              <span className="text-sm text-white/45">{user.name || user.email}</span>
              <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black">
              Sign in
            </Link>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <Link href="/editor" onClick={() => setOpen(false)}>Editor</Link>
            <Link href="/pricing" onClick={() => setOpen(false)}>Pricing</Link>
            {!user && <Link href="/login" onClick={() => setOpen(false)}>Sign in</Link>}
            {user && (
              <button onClick={logout} className="flex items-center gap-2 text-left">
                <LogOut className="h-4 w-4" /> Log out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
