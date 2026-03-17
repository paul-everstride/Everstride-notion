import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/auth";

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-canvas p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">Everstride</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {configured
            ? "Supabase Auth is expected to be configured already. This route is ready for your existing sign-in form or OAuth entrypoint."
            : "Supabase env vars are not configured, so Everstride is running in local demo mode for development."}
        </p>
        <div className="mt-8 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          {configured ? (
            <>
              Add your provider UI here and keep the post-login redirect pointed at <span className="font-medium text-ink">/dashboard</span>.
            </>
          ) : (
            <>
              Local demo access is enabled. Open <span className="font-medium text-ink">/dashboard</span> directly while you finish the auth wiring.
            </>
          )}
        </div>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-brand bg-brand px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-standard hover:bg-brand"
        >
          {configured ? "Continue to dashboard" : "Open local demo"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
