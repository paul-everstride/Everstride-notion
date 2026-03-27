"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, UserPlus, ChevronDown, ChevronRight, Loader2, Trash2, X, Pencil, Mail, ExternalLink, Copy, Check, Camera } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createTeamAction, createAthleteAction, deleteTeamAction, deleteAthleteAction, updateAthleteAction, uploadAvatarAction } from "./actions";
import { getTeamColor } from "@/lib/team-colors";

interface Team { id: string; name: string; ow_team_id?: string | null; }
interface TeamAthlete {
  ow_user_id: string;
  athlete_name?: string | null;
  athlete_email?: string | null;
  pairing_link?: string | null;
  avatar_url?: string | null;
}
interface Props {
  coachId: string;
  initialTeams: Team[];
  initialAthletes: Record<string, TeamAthlete[]>;
  owFrontendUrl: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  ["#dbeafe","#1d4ed8"],["#d1fae5","#065f46"],["#ede9fe","#6d28d9"],
  ["#fef3c7","#92400e"],["#ffe4e6","#be123c"],["#cffafe","#0e7490"],
  ["#ffedd5","#c2410c"],["#e0e7ff","#3730a3"],
];
function avatarPair(name: string): [string, string] {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] as [string, string];
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={e => { e.preventDefault(); navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border border-line bg-surfaceStrong hover:bg-line text-ink transition shrink-0">
      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

// ── Avatar component ─────────────────────────────────────────────────────────

function Avatar({ name, avatarUrl, size = 64 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const [bg, fg] = avatarPair(name);
  if (avatarUrl) {
    return (
      <div className="rounded-full overflow-hidden shrink-0 shadow-sm" style={{ width: size, height: size }}>
        <Image src={avatarUrl} alt={name} width={size} height={size} className="object-cover w-full h-full" />
      </div>
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm"
      style={{ width: size, height: size, backgroundColor: bg, color: fg, fontSize: size * 0.3 }}>
      {initials(name)}
    </div>
  );
}

// ── Edit modal ───────────────────────────────────────────────────────────────

function EditAthleteModal({
  athlete, teamId, onClose, onSave,
}: {
  athlete: TeamAthlete; teamId: string;
  onClose: () => void;
  onSave: (name: string, email: string, avatarUrl?: string) => void;
}) {
  const [name, setName] = useState(athlete.athlete_name ?? "");
  const [email, setEmail] = useState(athlete.athlete_email ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(athlete.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePhoto(file: File) {
    setError(null);
    // Client-side validation before hitting the server
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setError(`Unsupported file type. Please use JPG, PNG, WebP or GIF.`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      setError(`File is ${mb} MB — maximum is 5 MB. Please compress or resize the image first.`);
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadAvatarAction(athlete.ow_user_id, fd);
    if (result.success) {
      setAvatarUrl(result.url ?? null);
    } else {
      setError(result.error ?? "Upload failed.");
    }
    setUploading(false);
  }

  async function save() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    const result = await updateAthleteAction(teamId, athlete.ow_user_id, {
      athlete_name: name.trim(), athlete_email: email.trim(),
      ...(avatarUrl !== athlete.avatar_url ? { avatar_url: avatarUrl ?? "" } : {}),
    });
    setSaving(false);
    if (result.success) { onSave(name.trim(), email.trim(), avatarUrl ?? undefined); onClose(); }
    else setError(result.error ?? "Save failed");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h3 className="text-base font-semibold text-ink">Edit athlete</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surfaceStrong text-muted hover:text-ink transition"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Photo upload */}
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
              <Avatar name={name || "?"} avatarUrl={avatarUrl} size={72} />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
              </div>
            </div>
            <div>
              <button onClick={() => !uploading && fileRef.current?.click()}
                disabled={uploading}
                className="text-sm font-medium text-ink hover:text-brand transition flex items-center gap-1.5 disabled:opacity-50">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
              </button>
              <p className="text-xs text-muted mt-0.5">JPG, PNG or WebP · max 5 MB</p>
              {avatarUrl && !uploading && (
                <button onClick={() => setAvatarUrl(null)} className="text-xs text-red-500 hover:text-red-700 mt-1 transition">Remove photo</button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.target.value = ""; }} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email"
              className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition" />
          </div>

          {athlete.pairing_link && (
            <div>
              <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Pairing link</label>
              <div className="flex items-center gap-2 rounded-lg border border-line bg-surfaceStrong px-3.5 py-2.5">
                <span className="text-xs text-muted truncate flex-1 font-mono">{athlete.pairing_link}</span>
                <CopyLink url={athlete.pairing_link} />
                <a href={athlete.pairing_link} target="_blank" rel="noreferrer"
                  className="inline-flex items-center text-xs text-muted hover:text-ink transition shrink-0">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-2 justify-end px-6 py-4 border-t border-line bg-canvas">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-line text-sm text-ink hover:bg-surfaceStrong transition">Cancel</button>
          <button onClick={save} disabled={saving || uploading}
            className="px-4 py-2 rounded-lg bg-black text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 transition flex items-center gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Athlete card ─────────────────────────────────────────────────────────────

function AthleteCard({ athlete, teamId, onDelete, onUpdate }: {
  athlete: TeamAthlete; teamId: string;
  onDelete: () => void;
  onUpdate: (name: string, email: string, avatarUrl?: string) => void;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const name = athlete.athlete_name ?? "Unknown";

  return (
    <>
      <div className="flex flex-col rounded-2xl border border-line bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-150 group">
        <Link href={`/athletes/${athlete.ow_user_id}`} className="flex flex-col items-center pt-8 pb-5 px-5 gap-3">
          <Avatar name={name} avatarUrl={athlete.avatar_url} size={72} />
          <div className="text-center">
            <p className="text-sm font-semibold text-ink group-hover:text-brand transition-colors leading-snug">{name}</p>
            <p className="text-xs text-muted mt-0.5 flex items-center justify-center gap-1">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[140px]">{athlete.athlete_email ?? "—"}</span>
            </p>
          </div>
        </Link>
        <div className="border-t border-line flex items-stretch divide-x divide-line mt-auto">
          <button onClick={() => setShowEdit(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted hover:text-ink hover:bg-surfaceStrong transition">
            <Pencil className="h-3 w-3" /> Edit
          </button>
          <button onClick={onDelete}
            className="flex items-center justify-center px-4 py-2.5 text-muted hover:text-red-600 hover:bg-red-50 transition">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showEdit && (
        <EditAthleteModal
          athlete={athlete} teamId={teamId}
          onClose={() => setShowEdit(false)}
          onSave={onUpdate}
        />
      )}
    </>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function TeamsClient({ coachId, initialTeams, initialAthletes, owFrontendUrl }: Props) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [athletes, setAthletes] = useState<Record<string, TeamAthlete[]>>(initialAthletes);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(() => new Set(initialTeams.map(t => t.id)));

  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isPending, startTransition] = useTransition();

  const [showAddAthlete, setShowAddAthlete] = useState<string | null>(null);
  const [athleteForm, setAthleteForm] = useState<Record<string, { first_name: string; last_name: string; email: string; external_user_id: string }>>({});
  const [athletePending, setAthletePending] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<{ id: string; name: string } | null>(null);
  const [confirmDeleteAthlete, setConfirmDeleteAthlete] = useState<{ teamId: string; owUserId: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  void owFrontendUrl;

  function toggleTeam(id: string) {
    setExpandedTeams(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function getForm(tid: string) { return athleteForm[tid] ?? { first_name: "", last_name: "", email: "", external_user_id: "" }; }
  function setField(tid: string, f: string, v: string) { setAthleteForm(p => ({ ...p, [tid]: { ...getForm(tid), [f]: v } })); }

  async function handleDeleteTeam() {
    if (!confirmDeleteTeam) return;
    setIsDeleting(true);
    const r = await deleteTeamAction(confirmDeleteTeam.id);
    setIsDeleting(false); setConfirmDeleteTeam(null);
    if (r.success) {
      setTeams(p => p.filter(t => t.id !== confirmDeleteTeam.id));
      setAthletes(p => { const n = { ...p }; delete n[confirmDeleteTeam.id]; return n; });
    } else setError(r.error ?? "Failed to delete team");
  }

  async function handleDeleteAthlete() {
    if (!confirmDeleteAthlete) return;
    setIsDeleting(true);
    const r = await deleteAthleteAction(confirmDeleteAthlete.teamId, confirmDeleteAthlete.owUserId);
    setIsDeleting(false); setConfirmDeleteAthlete(null);
    if (r.success) setAthletes(p => ({ ...p, [confirmDeleteAthlete.teamId]: (p[confirmDeleteAthlete.teamId] ?? []).filter(a => a.ow_user_id !== confirmDeleteAthlete.owUserId) }));
    else setError(r.error ?? "Failed to delete athlete");
  }

  async function handleCreateTeam() {
    if (!newTeamName.trim()) return;
    setError(null);
    startTransition(async () => {
      const r = await createTeamAction(newTeamName.trim());
      if (r.success && r.teamId) {
        setTeams(p => [...p, { id: r.teamId!, name: newTeamName.trim() }]);
        setAthletes(p => ({ ...p, [r.teamId!]: [] }));
        setExpandedTeams(p => new Set([...p, r.teamId!]));
        setNewTeamName(""); setShowNewTeam(false);
      } else setError(r.error ?? "Failed to create team");
    });
  }

  async function handleCreateAthlete(teamId: string) {
    const form = getForm(teamId);
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) { setError("First name, last name and email are required."); return; }
    setError(null); setAthletePending(teamId);
    const r = await createAthleteAction(teamId, {
      first_name: form.first_name.trim(), last_name: form.last_name.trim(),
      email: form.email.trim(),
      external_user_id: form.external_user_id.trim() || `${form.first_name[0]}${form.last_name[0]}`.toUpperCase(),
    });
    if (r.success && r.userId) {
      setAthletes(p => ({ ...p, [teamId]: [{ ow_user_id: r.userId!, athlete_name: `${form.first_name} ${form.last_name}`.trim(), athlete_email: form.email, pairing_link: r.pairingLink }, ...(p[teamId] ?? [])] }));
      setAthleteForm(p => ({ ...p, [teamId]: { first_name: "", last_name: "", email: "", external_user_id: "" } }));
      setShowAddAthlete(null);
    } else setError(r.error ?? "Failed to create athlete");
    setAthletePending(null);
  }

  return (
    <div className="space-y-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-8">
        <p className="text-sm text-muted">{teams.length} {teams.length === 1 ? "team" : "teams"}</p>
        <button
          onClick={() => { setShowNewTeam(v => !v); setNewTeamName(""); }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:text-ink hover:border-zinc-300 transition"
        >
          <Plus className="h-3.5 w-3.5" /> New team
        </button>
      </div>

      {/* New team input */}
      {showNewTeam && (
        <div className="rounded-2xl border border-line bg-surfaceStrong p-4 flex gap-2 items-center mb-8">
          <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreateTeam()}
            placeholder="Team name, e.g. Triathlon Squad" autoFocus
            className="flex-1 rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-black/15 focus:border-black/30 transition" />
          <button onClick={handleCreateTeam} disabled={isPending || !newTeamName.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-40 transition">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
          </button>
          <button onClick={() => setShowNewTeam(false)} className="p-2 rounded-lg text-muted hover:text-ink hover:bg-line transition"><X className="h-4 w-4" /></button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">{error}</p>}

      {teams.length === 0 && !showNewTeam && (
        <div className="rounded-2xl border-2 border-dashed border-line p-16 text-center">
          <p className="text-base font-semibold text-ink mb-1">No teams yet</p>
          <p className="text-sm text-muted mb-5">Create your first team to start adding athletes.</p>
          <button onClick={() => setShowNewTeam(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition">
            <Plus className="h-4 w-4" /> New team
          </button>
        </div>
      )}

      {/* Teams */}
      <div className="space-y-10">
        {teams.map(team => {
          const teamAthletes = athletes[team.id] ?? [];
          const expanded = expandedTeams.has(team.id);
          const form = getForm(team.id);
          const addingHere = showAddAthlete === team.id;

          const teamColor = getTeamColor(team.ow_team_id ?? team.id, 'light');
          return (
            <div key={team.id}>
              {/* Team header — light, prominent heading style */}
              <div className="flex items-center gap-3 pb-3 mb-5" style={{ borderBottom: `2px solid ${teamColor.border}` }}>
                <button onClick={() => toggleTeam(team.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left group">
                  {expanded
                    ? <ChevronDown className="h-4 w-4 text-muted shrink-0 group-hover:text-ink transition" />
                    : <ChevronRight className="h-4 w-4 text-muted shrink-0 group-hover:text-ink transition" />}
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: teamColor.text }} />
                  <span className="text-lg font-bold text-ink truncate">{team.name}</span>
                  <span className="text-xs text-muted bg-zinc-100 rounded-full px-2.5 py-0.5 shrink-0">
                    {teamAthletes.length} {teamAthletes.length === 1 ? "athlete" : "athletes"}
                  </span>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setShowAddAthlete(addingHere ? null : team.id); setError(null); }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 px-4 py-2 text-sm font-semibold text-white shadow transition"
                  >
                    <UserPlus className="h-4 w-4" /> Add athlete
                  </button>
                  <button onClick={() => setConfirmDeleteTeam({ id: team.id, name: team.name })}
                    className="p-2 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 transition" title="Delete team">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="space-y-4">
                  {/* Add athlete form */}
                  {addingHere && (
                    <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-5 mb-2">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-ink">New athlete</p>
                        <button onClick={() => setShowAddAthlete(null)} className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-line transition"><X className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <input type="text" value={form.first_name} onChange={e => setField(team.id, "first_name", e.target.value)}
                          placeholder="First name *" autoFocus
                          className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition" />
                        <input type="text" value={form.last_name} onChange={e => setField(team.id, "last_name", e.target.value)}
                          placeholder="Last name *"
                          className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <input type="email" value={form.email} onChange={e => setField(team.id, "email", e.target.value)}
                          placeholder="Email *"
                          className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition" />
                        <input type="text" value={form.external_user_id} onChange={e => setField(team.id, "external_user_id", e.target.value)}
                          placeholder="ID / initials (optional)"
                          className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted font-mono focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleCreateAthlete(team.id)} disabled={athletePending === team.id}
                          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition shadow">
                          {athletePending === team.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                          Add to team
                        </button>
                        <button onClick={() => setShowAddAthlete(null)}
                          className="px-4 py-2.5 rounded-xl border border-line text-sm text-muted hover:text-ink hover:bg-surfaceStrong transition">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Athlete grid */}
                  {teamAthletes.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                      {teamAthletes.map(a => (
                        <AthleteCard
                          key={a.ow_user_id}
                          athlete={a}
                          teamId={team.id}
                          onDelete={() => setConfirmDeleteAthlete({ teamId: team.id, owUserId: a.ow_user_id, name: a.athlete_name ?? "this athlete" })}
                          onUpdate={(name, email, avatarUrl) => setAthletes(p => ({
                            ...p,
                            [team.id]: (p[team.id] ?? []).map(x => x.ow_user_id === a.ow_user_id ? { ...x, athlete_name: name, athlete_email: email, ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}) } : x),
                          }))}
                        />
                      ))}
                    </div>
                  ) : !addingHere ? (
                    <div className="rounded-2xl border-2 border-dashed border-line py-10 text-center">
                      <p className="text-sm text-muted">No athletes yet.</p>
                      <button onClick={() => setShowAddAthlete(team.id)}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-500 hover:text-orange-600 transition">
                        <UserPlus className="h-4 w-4" /> Add first athlete
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm delete team */}
      {confirmDeleteTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <p className="text-base font-semibold text-ink mb-2">Delete &ldquo;{confirmDeleteTeam.name}&rdquo;?</p>
            <p className="text-sm text-muted mb-6">This permanently deletes the team and all its athletes from Everstride and Open Wearables.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteTeam(null)} className="px-4 py-2 rounded-xl border border-line text-sm text-ink hover:bg-surfaceStrong transition">Cancel</button>
              <button onClick={handleDeleteTeam} disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-1.5">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete athlete */}
      {confirmDeleteAthlete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <p className="text-base font-semibold text-ink mb-2">Remove athlete?</p>
            <p className="text-sm text-muted mb-6"><span className="font-semibold text-ink">{confirmDeleteAthlete.name}</span> will be permanently removed from Everstride and Open Wearables.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteAthlete(null)} className="px-4 py-2 rounded-xl border border-line text-sm text-ink hover:bg-surfaceStrong transition">Cancel</button>
              <button onClick={handleDeleteAthlete} disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-1.5">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
