import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/auth";
import { LoginPhotoPanel } from "@/components/photo-accents";

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* LEFT: photo panel — hidden on mobile */}
      <LoginPhotoPanel />

      {/* RIGHT: sign-in card */}
      <div className="flex flex-1 items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-muted">Everstride</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Sign in</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            {configured
              ? "Supabase Auth is configured. Add your provider UI or OAuth entrypoint below."
              : "Running in local demo mode. No auth required for development."}
          </p>
          <div className="mt-8 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
            {configured ? (
              <>Add your provider UI here and keep the post-login redirect pointed at <span className="font-medium text-ink">/dashboard</span>.</>
            ) : (
              <>Local demo access is enabled. Open <span className="font-medium text-ink">/dashboard</span> directly while you finish the auth wiring.</>
            )}
          </div>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-brand bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:opacity-90"
          >
            {configured ? "Continue to dashboard" : "Open local demo"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
