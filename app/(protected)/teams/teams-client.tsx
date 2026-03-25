"use client";

import { useState, useTransition } from "react";
import { Plus, UserPlus, Copy, Check, ChevronDown, ChevronRight, Loader2, Trash2, X, Pencil, Mail, ExternalLink } from "lucide-react";
import Link from "next/link";
import { createTeamAction, createAthleteAction, deleteTeamAction, deleteAthleteAction, updateAthleteAction } from "./actions";

interface Team { id: string; name: string; ow_team_id?: string | null; }
interface TeamAthlete {
  ow_user_id: string;
  athlete_name?: string | null;
  athlete_email?: string | null;
  pairing_link?: string | null;
  created_at?: string;
}
interface Props {
  coachId: string;
  initialTeams: Team[];
  initialAthletes: Record<string, TeamAthlete[]>;
  owFrontendUrl: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  ["#dbeafe","#1d4ed8"], ["#d1fae5","#065f46"], ["#ede9fe","#6d28d9"],
  ["#fef3c7","#92400e"], ["#ffe4e6","#be123c"], ["#cffafe","#0e7490"],
  ["#ffedd5","#c2410c"], ["#e0e7ff","#3730a3"],
];
function avatarPair(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
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

// ── Edit modal ─────────────────────────────────────────────────────────────────

function EditAthleteModal({
  athlete, teamId, onClose, onSave,
}: {
  athlete: TeamAthlete; teamId: string;
  onClose: () => void;
  onSave: (name: string, email: string) => void;
}) {
  const [name, setName] = useState(athlete.athlete_name ?? "");
  const [email, setEmail] = useState(athlete.athlete_email ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    const result = await updateAthleteAction(teamId, athlete.ow_user_id, { athlete_name: name.trim(), athlete_email: email.trim() });
    setSaving(false);
    if (result.success) { onSave(name.trim(), email.trim()); onClose(); }
    else setError(result.error ?? "Save failed");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h3 className="text-base font-semibold text-ink">Edit athlete</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surfaceStrong transition text-muted hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Avatar preview */}
          <div className="flex items-center gap-3">
            {(() => {
              const [bg, fg] = avatarPair(athlete.athlete_name ?? "?");
              return (
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                  style={{ backgroundColor: bg, color: fg }}>
                  {initials(athlete.athlete_name ?? "?")}
                </div>
              );
            })()}
            <div>
              <p className="text-sm font-medium text-ink">{athlete.athlete_name}</p>
              <p className="text-xs text-muted">{athlete.ow_user_id.slice(0, 12)}…</p>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition" />
            </div>
          </div>

          {/* Pairing link */}
          {athlete.pairing_link && (
            <div>
              <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Pairing link</label>
              <div className="flex items-center gap-2 rounded-lg border border-line bg-surfaceStrong px-3.5 py-2.5">
                <span className="text-xs text-muted truncate flex-1 font-mono">{athlete.pairing_link}</span>
                <CopyLink url={athlete.pairing_link} />
                <a href={athlete.pairing_link} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink transition shrink-0">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-6 py-4 border-t border-line bg-canvas">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-line text-sm text-ink hover:bg-surfaceStrong transition">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-lg bg-black text-sm font-medium text-white hover:bg-ink/80 disabled:opacity-50 transition flex items-center gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Athlete card ───────────────────────────────────────────────────────────────

function AthleteCard({
  athlete, teamId, onDelete, onUpdate,
}: {
  athlete: TeamAthlete; teamId: string;
  onDelete: () => void;
  onUpdate: (name: string, email: string) => void;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const name = athlete.athlete_name ?? "Unknown";
  const [bg, fg] = avatarPair(name);

  return (
    <>
      <div className="flex flex-col rounded-2xl border border-line bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-ink/20 transition-all duration-150">

        {/* Top — avatar + name block */}
        <Link href={`/athletes/${athlete.ow_user_id}`} className="group flex flex-col items-center pt-7 pb-5 px-5 gap-3 cursor-pointer">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shadow-sm shrink-0"
            style={{ backgroundColor: bg, color: fg }}>
            {initials(name)}
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-ink group-hover:text-brand transition-colors leading-snug">{name}</p>
            <p className="text-xs text-muted mt-0.5 flex items-center justify-center gap-1">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[150px]">{athlete.athlete_email ?? "—"}</span>
            </p>
          </div>
        </Link>

        {/* Bottom action bar */}
        <div className="border-t border-line flex items-stretch divide-x divide-line mt-auto">
          <button
            onClick={() => setShowEdit(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted hover:text-ink hover:bg-surfaceStrong transition"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-muted hover:text-red-600 hover:bg-red-50 transition"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {showEdit && (
        <EditAthleteModal
          athlete={athlete}
          teamId={teamId}
          onClose={() => setShowEdit(false)}
          onSave={onUpdate}
        />
      )}
    </>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function TeamsClient({ coachId, initialTeams, initialAthletes, owFrontendUrl }: Props) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [athletes, setAthletes] = useState<Record<string, TeamAthlete[]>>(initialAthletes);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(() => new Set(initialTeams.map(t => t.id)));

  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isPending, startTransition] = useTransition();

  const [showAddAthlete, setShowAddAthlete] = useState<string | null>(null);
  const [athleteForm, setAthleteForm] = useState<Record<string, { first_name: string; last_name: string; email: string; external_user_id: string; }>>({});
  const [athletePending, setAthletePending] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<{ id: string; name: string } | null>(null);
  const [confirmDeleteAthlete, setConfirmDeleteAthlete] = useState<{ teamId: string; owUserId: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

      {/* ── Page toolbar ── */}
      <div className="flex items-center justify-between mb-8">
        <p className="text-sm text-muted">{teams.length} {teams.length === 1 ? "team" : "teams"}</p>
        <button
          onClick={() => { setShowNewTeam(v => !v); setNewTeamName(""); }}
          className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition shadow-sm"
        >
          <Plus className="h-4 w-4" /> New team
        </button>
      </div>

      {/* New team input */}
      {showNewTeam && (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 flex gap-2 items-center mb-8">
          <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreateTeam()}
            placeholder="Team name, e.g. Triathlon Squad" autoFocus
            className="flex-1 rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/30 transition" />
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
          <p className="text-sm text-muted mb-5">Create a team to start adding athletes.</p>
          <button onClick={() => setShowNewTeam(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition">
            <Plus className="h-4 w-4" /> New team
          </button>
        </div>
      )}

      {/* ── Teams ── */}
      <div className="space-y-10">
        {teams.map(team => {
          const teamAthletes = athletes[team.id] ?? [];
          const expanded = expandedTeams.has(team.id);
          const form = getForm(team.id);
          const addingHere = showAddAthlete === team.id;

          return (
            <div key={team.id}>

              {/* Team header bar */}
              <div className="flex items-center gap-3 rounded-2xl bg-zinc-900 px-5 py-4 mb-4">
                <button onClick={() => toggleTeam(team.id)} className="flex items-center gap-3 flex-1 text-left min-w-0">
                  {expanded ? <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />}
                  <span className="text-base font-bold text-white truncate">{team.name}</span>
                  <span className="text-xs text-zinc-400 shrink-0">{teamAthletes.length} {teamAthletes.length === 1 ? "athlete" : "athletes"}</span>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setShowAddAthlete(addingHere ? null : team.id); setError(null); }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition shadow-sm"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Add athlete
                  </button>
                  <button onClick={() => setConfirmDeleteTeam({ id: team.id, name: team.name })}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition" title="Delete team">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="space-y-4">
                  {/* Add athlete form */}
                  {addingHere && (
                    <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-5">
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
                          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition shadow-sm">
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

                  {/* Athlete cards */}
                  {teamAthletes.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {teamAthletes.map(a => (
                        <AthleteCard
                          key={a.ow_user_id}
                          athlete={a}
                          teamId={team.id}
                          onDelete={() => setConfirmDeleteAthlete({ teamId: team.id, owUserId: a.ow_user_id, name: a.athlete_name ?? "this athlete" })}
                          onUpdate={(name, email) => setAthletes(p => ({
                            ...p,
                            [team.id]: (p[team.id] ?? []).map(x => x.ow_user_id === a.ow_user_id ? { ...x, athlete_name: name, athlete_email: email } : x),
                          }))}
                        />
                      ))}
                    </div>
                  ) : !addingHere ? (
                    <div className="rounded-2xl border-2 border-dashed border-line py-10 text-center">
                      <p className="text-sm text-muted">No athletes yet.</p>
                      <button onClick={() => setShowAddAthlete(team.id)}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-orange-500 hover:text-orange-600 transition">
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
            <p className="text-sm text-muted mb-6"><span className="font-semibold text-ink">{confirmDeleteAthlete.name}</span> will be permanently removed and deleted from Open Wearables.</p>
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
