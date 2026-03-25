"use client";

import { useState, useTransition } from "react";
import { Plus, UserPlus, Copy, Check, ChevronDown, ChevronRight, Loader2, Shield, Trash2, X, Link2 } from "lucide-react";
import { createTeamAction, createAthleteAction, deleteTeamAction, deleteAthleteAction } from "./actions";

interface Team {
  id: string;
  name: string;
  ow_team_id?: string | null;
}

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

// ── Avatar with initials ───────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700",
  "bg-indigo-100 text-indigo-700",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function AthleteAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const color = avatarColor(name);
  const sizeClass = size === "lg" ? "w-12 h-12 text-base" : size === "sm" ? "w-7 h-7 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-semibold shrink-0`}>
      {initials(name)}
    </div>
  );
}

// ── Copy button ────────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink border border-line hover:border-ink/30 rounded-md px-2 py-1 transition"
      title="Copy pairing link"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {label && <span>{copied ? "Copied!" : label}</span>}
    </button>
  );
}

// ── Athlete card ───────────────────────────────────────────────────────────────

function AthleteCard({
  athlete,
  onDelete,
}: {
  athlete: TeamAthlete;
  onDelete: () => void;
}) {
  const name = athlete.athlete_name ?? "Unknown";
  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-line bg-canvas p-4 hover:border-ink/20 hover:shadow-sm transition-all duration-150">
      {/* Delete button — top right, appears on hover */}
      <button
        onClick={onDelete}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded text-muted hover:text-red-500 hover:bg-red-50 transition-all"
        title="Remove athlete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Avatar + name */}
      <div className="flex items-center gap-3 pr-6">
        <AthleteAvatar name={name} size="lg" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{name}</p>
          <p className="text-xs text-muted truncate">{athlete.athlete_email ?? "—"}</p>
        </div>
      </div>

      {/* Pairing link */}
      <div className="flex items-center gap-2 pt-1 border-t border-line">
        <Link2 className="h-3.5 w-3.5 text-muted shrink-0" />
        {athlete.pairing_link ? (
          <CopyButton text={athlete.pairing_link} label="Copy link" />
        ) : (
          <span className="text-xs text-muted">No pairing link</span>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TeamsClient({ coachId, initialTeams, initialAthletes, owFrontendUrl }: Props) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [athletes, setAthletes] = useState<Record<string, TeamAthlete[]>>(initialAthletes);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(initialTeams[0]?.id ?? null);

  // New team form
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isPending, startTransition] = useTransition();

  // Add athlete form — per team
  const [showAddAthlete, setShowAddAthlete] = useState<string | null>(null);
  const [athleteForm, setAthleteForm] = useState<Record<string, {
    first_name: string; last_name: string; email: string; external_user_id: string;
  }>>({});
  const [athletePending, setAthletePending] = useState<string | null>(null);

  // Error + confirm dialogs
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<string | null>(null);
  const [confirmDeleteAthlete, setConfirmDeleteAthlete] = useState<{ teamId: string; owUserId: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function getAthleteForm(teamId: string) {
    return athleteForm[teamId] ?? { first_name: "", last_name: "", email: "", external_user_id: "" };
  }
  function setAthleteField(teamId: string, field: string, value: string) {
    setAthleteForm(prev => ({ ...prev, [teamId]: { ...getAthleteForm(teamId), [field]: value } }));
  }

  async function handleDeleteTeam() {
    if (!confirmDeleteTeam) return;
    setIsDeleting(true);
    const result = await deleteTeamAction(confirmDeleteTeam);
    setIsDeleting(false);
    setConfirmDeleteTeam(null);
    if (result.success) {
      setTeams(prev => prev.filter(t => t.id !== confirmDeleteTeam));
      setAthletes(prev => { const n = { ...prev }; delete n[confirmDeleteTeam]; return n; });
      if (expandedTeam === confirmDeleteTeam) setExpandedTeam(null);
    } else {
      setError(result.error ?? "Failed to delete team");
    }
  }

  async function handleDeleteAthlete() {
    if (!confirmDeleteAthlete) return;
    setIsDeleting(true);
    const result = await deleteAthleteAction(confirmDeleteAthlete.teamId, confirmDeleteAthlete.owUserId);
    setIsDeleting(false);
    setConfirmDeleteAthlete(null);
    if (result.success) {
      setAthletes(prev => ({
        ...prev,
        [confirmDeleteAthlete.teamId]: (prev[confirmDeleteAthlete.teamId] ?? []).filter(a => a.ow_user_id !== confirmDeleteAthlete.owUserId),
      }));
    } else {
      setError(result.error ?? "Failed to delete athlete");
    }
  }

  async function handleCreateTeam() {
    if (!newTeamName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createTeamAction(newTeamName.trim());
      if (result.success && result.teamId) {
        const newTeam = { id: result.teamId, name: newTeamName.trim() };
        setTeams(prev => [...prev, newTeam]);
        setAthletes(prev => ({ ...prev, [result.teamId!]: [] }));
        setExpandedTeam(result.teamId);
        setNewTeamName("");
        setShowNewTeam(false);
      } else {
        setError(result.error ?? "Failed to create team");
      }
    });
  }

  async function handleCreateAthlete(teamId: string) {
    const form = getAthleteForm(teamId);
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      setError("First name, last name and email are required.");
      return;
    }
    setError(null);
    setAthletePending(teamId);
    const result = await createAthleteAction(teamId, {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      external_user_id: form.external_user_id.trim() || `${form.first_name[0]}${form.last_name[0]}`.toUpperCase(),
    });
    if (result.success && result.userId) {
      const newAthlete: TeamAthlete = {
        ow_user_id: result.userId,
        athlete_name: `${form.first_name} ${form.last_name}`.trim(),
        athlete_email: form.email,
        pairing_link: result.pairingLink,
      };
      setAthletes(prev => ({ ...prev, [teamId]: [newAthlete, ...(prev[teamId] ?? [])] }));
      setAthleteForm(prev => ({ ...prev, [teamId]: { first_name: "", last_name: "", email: "", external_user_id: "" } }));
      setShowAddAthlete(null);
    } else {
      setError(result.error ?? "Failed to create athlete");
    }
    setAthletePending(null);
  }

  return (
    <div className="max-w-4xl space-y-5">

      {/* Top bar — New Team button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{teams.length} {teams.length === 1 ? "team" : "teams"}</p>
        <button
          onClick={() => { setShowNewTeam(v => !v); setNewTeamName(""); }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4" />
          New team
        </button>
      </div>

      {/* New team form — collapsible */}
      {showNewTeam && (
        <div className="rounded-xl border border-brand/30 bg-surface p-4 flex gap-2 items-center shadow-sm">
          <input
            type="text"
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreateTeam()}
            placeholder="Team name, e.g. Triathlon Squad"
            autoFocus
            className="flex-1 rounded-lg border border-line bg-canvas px-3.5 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
          />
          <button
            onClick={handleCreateTeam}
            disabled={isPending || !newTeamName.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </button>
          <button onClick={() => setShowNewTeam(false)} className="p-2 rounded-lg text-muted hover:text-ink hover:bg-surfaceStrong transition">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">{error}</p>
      )}

      {/* Teams */}
      {teams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <Shield className="h-8 w-8 text-muted mx-auto mb-3" />
          <p className="text-sm font-medium text-ink mb-1">No teams yet</p>
          <p className="text-xs text-muted">Click &ldquo;New team&rdquo; to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map(team => {
            const teamAthletes = athletes[team.id] ?? [];
            const expanded = expandedTeam === team.id;
            const form = getAthleteForm(team.id);
            const addingHere = showAddAthlete === team.id;

            return (
              <div key={team.id} className="rounded-xl border border-line bg-surface overflow-hidden">

                {/* Team header */}
                <button
                  onClick={() => setExpandedTeam(expanded ? null : team.id)}
                  className="w-full flex items-center gap-2.5 px-5 py-4 text-left hover:bg-surfaceStrong transition"
                >
                  {expanded
                    ? <ChevronDown className="h-4 w-4 text-muted shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-muted shrink-0" />}
                  <Shield className="h-4 w-4 text-muted shrink-0" />
                  <span className="text-sm font-semibold text-ink flex-1">{team.name}</span>
                  <span className="rounded-full bg-line px-2.5 py-0.5 text-xs text-muted font-medium">
                    {teamAthletes.length} {teamAthletes.length === 1 ? "athlete" : "athletes"}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDeleteTeam(team.id); }}
                    className="ml-2 p-1.5 rounded text-muted hover:text-red-500 hover:bg-red-50 transition"
                    title="Delete team"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </button>

                {expanded && (
                  <div className="border-t border-line">

                    {/* Athlete cards grid */}
                    {teamAthletes.length > 0 && (
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {teamAthletes.map(a => (
                          <AthleteCard
                            key={a.ow_user_id}
                            athlete={a}
                            onDelete={() => setConfirmDeleteAthlete({
                              teamId: team.id,
                              owUserId: a.ow_user_id,
                              name: a.athlete_name ?? "this athlete",
                            })}
                          />
                        ))}
                      </div>
                    )}

                    {/* Empty state */}
                    {teamAthletes.length === 0 && !addingHere && (
                      <div className="px-5 py-6 text-sm text-muted text-center">
                        No athletes yet.
                      </div>
                    )}

                    {/* Add athlete form — collapsible */}
                    {addingHere ? (
                      <div className="border-t border-line bg-canvas/60 px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-muted uppercase tracking-wider">New athlete</p>
                          <button onClick={() => setShowAddAthlete(null)} className="p-1 rounded text-muted hover:text-ink transition">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input type="text" value={form.first_name} onChange={e => setAthleteField(team.id, "first_name", e.target.value)}
                            placeholder="First name *" autoFocus
                            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition" />
                          <input type="text" value={form.last_name} onChange={e => setAthleteField(team.id, "last_name", e.target.value)}
                            placeholder="Last name *"
                            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <input type="email" value={form.email} onChange={e => setAthleteField(team.id, "email", e.target.value)}
                            placeholder="Email *"
                            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition" />
                          <input type="text" value={form.external_user_id} onChange={e => setAthleteField(team.id, "external_user_id", e.target.value)}
                            placeholder="ID / initials (e.g. JDO)"
                            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted font-mono focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleCreateAthlete(team.id)} disabled={athletePending === team.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition">
                            {athletePending === team.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                            Add to team
                          </button>
                          <button onClick={() => setShowAddAthlete(null)}
                            className="px-3 py-2 rounded-lg border border-line text-sm text-muted hover:text-ink hover:bg-surfaceStrong transition">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-line px-5 py-3 flex justify-end">
                        <button
                          onClick={() => { setShowAddAthlete(team.id); setError(null); }}
                          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink border border-line hover:border-ink/30 rounded-lg px-3 py-1.5 hover:bg-surfaceStrong transition"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Add athlete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm delete team */}
      {confirmDeleteTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-xl border border-line bg-surface shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-sm font-semibold text-ink mb-1">Delete team?</p>
            <p className="text-sm text-muted mb-5">This will permanently delete the team and all its athletes from Everstride and Open Wearables. This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteTeam(null)} className="px-4 py-2 rounded-lg border border-line text-sm text-ink hover:bg-surfaceStrong transition">Cancel</button>
              <button onClick={handleDeleteTeam} disabled={isDeleting} className="px-4 py-2 rounded-lg bg-red-600 text-sm text-white hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-1.5">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete athlete */}
      {confirmDeleteAthlete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-xl border border-line bg-surface shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-sm font-semibold text-ink mb-1">Remove athlete?</p>
            <p className="text-sm text-muted mb-5"><span className="font-medium text-ink">{confirmDeleteAthlete.name}</span> will be permanently removed from this team and deleted from Open Wearables. This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteAthlete(null)} className="px-4 py-2 rounded-lg border border-line text-sm text-ink hover:bg-surfaceStrong transition">Cancel</button>
              <button onClick={handleDeleteAthlete} disabled={isDeleting} className="px-4 py-2 rounded-lg bg-red-600 text-sm text-white hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-1.5">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remove athlete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
