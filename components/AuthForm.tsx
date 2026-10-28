"use client";

import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/auth/${signup ? "signup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next || "/editor";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-6 py-12">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-3xl p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15">
            <Sparkles className="h-6 w-6 text-violet-200" />
          </div>
          <h1 className="text-3xl font-black">{signup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-2 text-sm text-white/50">
            {signup ? "Start creating 3D product mockups." : "Sign in to continue to the editor."}
          </p>
        </div>

        <div className="space-y-4">
          {signup && (
            <label className="block">
              <span className="mb-2 block text-sm text-white/60">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-violet-400" />
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-sm text-white/60">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-violet-400" />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-white/60">Password</span>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-violet-400" />
          </label>
        </div>

        {error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}

        <button disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-bold text-black disabled:opacity-50">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {signup ? "Create account" : "Sign in"}
        </button>

        <p className="mt-6 text-center text-sm text-white/50">
          {signup ? "Already have an account? " : "Need an account? "}
          <Link href={signup ? "/login" : "/signup"} className="text-white underline underline-offset-4">
            {signup ? "Sign in" : "Create one"}
          </Link>
        </p>
      </form>
    </main>
  );
}
