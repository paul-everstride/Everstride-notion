"use client";
import Image from "next/image";

/**
 * Photo accent components for Everstride.
 * All photo placements are isolated here so reverting is a single file deletion
 * plus removing the import lines from: login/page.tsx, dashboard-workspace.tsx,
 * athlete-detail-panel.tsx, and compare-workbench.tsx
 */

// ── Login page: full-height left panel ───────────────────────────────────────

export function LoginPhotoPanel() {
  return (
    <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden bg-black">
      <Image
        src="/photos/runners-legs.jpg"
        alt=""
        fill
        className="object-cover object-center opacity-80"
        priority
        sizes="60vw"
      />
      {/* gradient: darkens bottom-left for text legibility, fades right edge into page */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/30" />
      {/* Branding */}
      <div className="absolute top-10 left-10">
        <span className="text-white/70 text-[11px] font-semibold uppercase tracking-[0.2em]">Everstride</span>
      </div>
      {/* Bottom tagline */}
      <div className="absolute bottom-10 left-10 right-12">
        <p className="text-white text-2xl font-light leading-snug tracking-tight">
          Coach-first intelligence<br />for endurance athletes.
        </p>
        <p className="mt-3 text-white/50 text-sm leading-relaxed">
          Recovery, readiness, and performance — unified.
        </p>
      </div>
    </div>
  );
}

// ── Athlete detail: hero strip behind athlete name ────────────────────────────

export function AthleteHeroStrip({ name }: { name: string }) {
  return (
    <div className="relative h-[140px] overflow-hidden bg-black">
      <Image
        src="/photos/cyclist-solo.jpg"
        alt=""
        fill
        className="object-cover object-center opacity-75"
        sizes="100vw"
        priority
      />
      {/* bottom-to-top fade into page background */}
      <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/40 to-transparent" />
      {/* left fade */}
      <div className="absolute inset-0 bg-gradient-to-r from-canvas/60 to-transparent" />
      {/* Name overlay (bottom-left) */}
      <div className="absolute bottom-4 left-6">
        <p className="text-ink/50 text-[10px] font-semibold uppercase tracking-[0.18em] mb-0.5">Athlete</p>
        <h1 className="text-ink text-2xl font-semibold tracking-tight leading-none">{name}</h1>
      </div>
    </div>
  );
}

// ── Compare page: cinematic header strip ─────────────────────────────────────

export function ComparePhotoStrip({ title }: { title: string }) {
  return (
    <div className="relative h-[100px] overflow-hidden bg-black border-b border-line">
      <Image
        src="/photos/cyclists-race.jpg"
        alt=""
        fill
        className="object-cover object-[center_30%] opacity-70"
        sizes="100vw"
      />
      {/* dark overlay + left-to-right fade */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
      {/* bottom fade into toolbar */}
      <div className="absolute inset-0 bg-gradient-to-t from-canvas/80 to-transparent" />
      <div className="absolute bottom-4 left-5">
        <p className="text-white/50 text-[10px] font-semibold uppercase tracking-[0.18em] mb-0.5">Compare</p>
        <h2 className="text-white text-lg font-semibold tracking-tight leading-none">{title}</h2>
      </div>
    </div>
  );
}

// ── Dashboard: attention monitor section accent ───────────────────────────────
// A narrow right-edge accent photo beside the attention monitor header

export function DashboardAttentionPhoto() {
  return (
    <div className="relative h-full w-[120px] shrink-0 overflow-hidden rounded-r-xl">
      <Image
        src="/photos/crosswalk-runner.jpg"
        alt=""
        fill
        className="object-cover object-[center_20%] opacity-60"
        sizes="120px"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-canvas/90 to-transparent" />
    </div>
  );
}

// ── Dashboard: desert ambient strip (above the table, subtle) ────────────────

export function DashboardAmbientStrip() {
  return (
    <div className="relative h-[72px] overflow-hidden bg-black border-b border-line">
      <Image
        src="/photos/desert-landscape.jpg"
        alt=""
        fill
        className="object-cover object-[center_55%] opacity-50"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-canvas/80 via-transparent to-canvas/80" />
      <div className="absolute inset-0 bg-gradient-to-b from-canvas/30 to-canvas/70" />
    </div>
  );
}
