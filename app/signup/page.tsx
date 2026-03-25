"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { LoginPhotoPanel } from "@/components/photo-accents";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Auth is not configured. Add Supabase env vars.");
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Signed up + auto-signed in → go straight to dashboard
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <LoginPhotoPanel />

      <div className="flex flex-1 items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-muted">Everstride</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Create account</h1>
          <p className="mt-2 text-sm text-muted">
            Set up your coach account to get started.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ink mb-1.5">
                Your name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
                placeholder="Alex Coach"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
                placeholder="coach@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
                placeholder="Min. 8 characters"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-muted text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-ink font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
