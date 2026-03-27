"use client";
import Image from "next/image";

/**
 * Photo accent components for Everstride.
 * All photo placements live here — reverting is one file deletion
 * plus removing import lines from:
 *   login/page.tsx, dashboard-workspace.tsx,
 *   athlete-detail-panel.tsx, compare-workbench.tsx
 */

// ── Login page: full-height left panel ───────────────────────────────────────

export function LoginPhotoPanel() {
  return (
    <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden bg-black">
      <Image
        src="/photos/runners-legs.jpg"
        alt=""
        fill
        className="object-cover object-center opacity-90"
        priority
        sizes="60vw"
      />
      {/* darken right edge toward the sign-in card */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-black/50" />
      {/* general dark wash for readability */}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute top-10 left-10">
        <span className="text-white/60 text-[11px] font-semibold uppercase tracking-[0.22em]">Everstride</span>
      </div>
      <div className="absolute bottom-10 left-10 right-14">
        <p className="text-white text-[26px] font-light leading-snug tracking-tight drop-shadow-sm">
          Coach-first intelligence<br />for endurance athletes.
        </p>
        <p className="mt-3 text-white/45 text-sm leading-relaxed">
          Recovery, readiness, and performance — unified.
        </p>
      </div>
    </div>
  );
}

// ── Athlete detail: hero card behind athlete name ─────────────────────────────
// Inset card with all-corners rounding, dark overlay only

export function AthleteHeroStrip({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <div className="relative h-[155px] overflow-hidden bg-black rounded-2xl mx-4 mt-4 shadow-md">
      <Image
        src="/photos/cyclist-solo.jpg"
        alt=""
        fill
        className="object-cover object-[55%_68%] opacity-90"
        sizes="100vw"
        priority
      />
      {/* dark vignette — no white/canvas colors */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/20 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
      {/* Athlete label */}
      <div className="absolute bottom-5 left-6">
        <p className="text-white/50 text-[10px] font-semibold uppercase tracking-[0.2em] mb-1">Athlete</p>
        <h1 className="text-white text-2xl font-semibold tracking-tight leading-none drop-shadow">{name}</h1>
      </div>
      {/* Avatar portrait — top right */}
      <div className="absolute top-4 right-5">
        {avatarUrl ? (
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/30 shadow-lg">
            <Image src={avatarUrl} alt={name} width={64} height={64} className="object-cover w-full h-full" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-white/15 border-2 border-white/25 flex items-center justify-center shadow-lg">
            <span className="text-white text-lg font-semibold">{initials}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Compare page: inset rounded photo card ────────────────────────────────────
// Sits at the top of the compare workbench with rounded corners and visible imagery

export function ComparePhotoStrip({ title, section }: { title: string; section?: "readiness" | "performance" }) {
  const photo = section === "readiness" ? "/photos/sauna.jpg" : "/photos/cyclists-race.jpg";
  const position = section === "readiness" ? "object-[center_65%]" : "object-[center_32%]";
  return (
    <div className="relative h-[110px] overflow-hidden bg-black rounded-2xl mx-4 mt-4 shadow-md">
      <Image
        src={photo}
        alt=""
        fill
        className={`object-cover ${position} opacity-90`}
        sizes="100vw"
      />
      {/* dark overlay — photo stays fully visible */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
      <div className="absolute bottom-4 left-5">
        <p className="text-white/50 text-[10px] font-semibold uppercase tracking-[0.2em] mb-1">Compare</p>
        <h2 className="text-white text-lg font-semibold tracking-tight leading-none drop-shadow">{title}</h2>
      </div>
    </div>
  );
}

// ── Dashboard: background for Quick view / Attention / AI Summary section ─────
// Wrap the cards grid in a `relative overflow-hidden rounded-2xl` div and
// render this as the first child. Cards float on top with their own bg-canvas.

export function DashboardSectionBg() {
  return (
    <>
      <Image
        src="/photos/crosswalk-runner.jpg"
        alt=""
        fill
        className="object-cover object-[center_25%] opacity-75"
        sizes="100vw"
      />
      {/* Dark wash — enough to keep card borders/labels legible at the edges */}
      <div className="absolute inset-0 bg-black/35" />
    </>
  );
}
