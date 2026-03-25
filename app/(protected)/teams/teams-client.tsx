"use client";

import { useState, useTransition } from "react";
import { Plus, UserPlus, Copy, Check, ChevronDown, ChevronRight, Loader2, Shield, Trash2, X, Link2, ArrowRight } from "lucide-react";
import Link from "next/link";
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

// ── Avatar ─────────────────────────────────────────────────────────────────────

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

function AthleteAvatar({ name }: { name: string }) {
  const color = avatarColor(name);
  return (
    <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-sm font-semibold shrink-0`}>
      {initials(name)}
    </div>
  );
}

// ── Copy button ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink border border-line hover:border-ink/30 rounded px-1.5 py-0.5 transition shrink-0"
      title="Copy pairing link"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      <span>{copied ? "Copied" : "Link"}</span>
    </button>
  );
}

// ── Athlete card ───────────────────────────────────────────────────────────────

function AthleteCard({
  athlete,
  onDelete,
}: {
  athlete: TeamAthlete;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const name = athlete.athlete_name ?? "Unknown";
  return (
    <Link
      href={`/athletes/${athlete.ow_user_id}`}
      className="group relative flex items-center gap-3 rounded-xl border border-line bg-canvas px-4 py-3 hover:border-ink/25 hover:shadow-sm hover:bg-surface transition-all duration-150"
    >
      <AthleteAvatar name={name} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink truncate group-hover:text-brand transition-colors">{name}</p>
        <p className="text-xs text-muted truncate">{athlete.athlete_email ?? "—"}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {athlete.pairing_link && <CopyButton text={athlete.pairing_link} />}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted hover:text-red-500 hover:bg-red-50 transition-all"
          title="Remove athlete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <ArrowRight className="h-3.5 w-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function TeamsClient({ coachId, initialTeams, initialAthletes, owFrontendUrl }: Props) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [athletes, setAthletes] = useState<Record<string, TeamAthlete[]>>(initialAthletes);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(
    () => new Set(initialTeams.map(t => t.id))
  );

  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isPending, startTransition] = useTransition();

  const [showAddAthlete, setShowAddAthlete] = useState<string | null>(null);
  const [athleteForm, setAthleteForm] = useState<Record<string, {
    first_name: string; last_name: string; email: string; external_user_id: string;
  }>>({});
  const [athletePending, setAthletePending] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<{ id: string; name: string } | null>(null);
  const [confirmDeleteAthlete, setConfirmDeleteAthlete] = useState<{ teamId: string; owUserId: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function toggleTeam(id: string) {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function getAthleteForm(teamId: string) {
    return athleteForm[teamId] ?? { first_name: "", last_name: "", email: "", external_user_id: "" };
  }
  function setAthleteField(teamId: string, field: string, value: string) {
    setAthleteForm(prev => ({ ...prev, [teamId]: { ...getAthleteForm(teamId), [field]: value } }));
  }

  async function handleDeleteTeam() {
    if (!confirmDeleteTeam) return;
    setIsDeleting(true);
    const result = await deleteTeamAction(confirmDeleteTeam.id);
    setIsDeleting(false);
    setConfirmDeleteTeam(null);
    if (result.success) {
      setTeams(prev => prev.filter(t => t.id !== confirmDeleteTeam.id));
      setAthletes(prev => { const n = { ...prev }; delete n[confirmDeleteTeam.id]; return n; });
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
        setExpandedTeams(prev => new Set([...prev, result.teamId!]));
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
    <div className="space-y-8">

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">{error}</p>
      )}

      {/* Teams */}
      {teams.length === 0 && !showNewTeam ? (
        <div className="rounded-xl border border-dashed border-line p-12 text-center">
          <Shield className="h-8 w-8 text-muted mx-auto mb-3" />
          <p className="text-sm font-medium text-ink mb-1">No teams yet</p>
          <p className="text-xs text-muted mb-4">Create a team to start adding athletes.</p>
          <button
            onClick={() => setShowNewTeam(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
          >
            <Plus className="h-4 w-4" /> New team
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {teams.map(team => {
            const teamAthletes = athletes[team.id] ?? [];
            const expanded = expandedTeams.has(team.id);
            const form = getAthleteForm(team.id);
            const addingHere = showAddAthlete === team.id;

            return (
              <div key={team.id}>
                {/* ── Team heading ── */}
                <div className="flex items-center gap-2 mb-3 group/header">
                  <button
                    onClick={() => toggleTeam(team.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {expanded
                      ? <ChevronDown className="h-4 w-4 text-muted shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-muted shrink-0" />}
                    <h2 className="text-base font-semibold text-ink">{team.name}</h2>
                    <span className="text-xs text-muted font-normal">
                      {teamAthletes.length} {teamAthletes.length === 1 ? "athlete" : "athletes"}
                    </span>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setShowAddAthlete(team.id); setError(null); }}
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink border border-line hover:border-ink/30 rounded-md px-2 py-1 hover:bg-surfaceStrong transition"
                    >
                      <UserPlus className="h-3 w-3" /> Add athlete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteTeam({ id: team.id, name: team.name })}
                      className="p-1.5 rounded text-muted hover:text-red-500 hover:bg-red-50 transition"
                      title="Delete team"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="space-y-3">
                    {/* Add athlete form */}
                    {addingHere && (
                      <div className="rounded-xl border border-brand/30 bg-surface p-4 mb-1">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-muted uppercase tracking-wider">New athlete</p>
                          <button onClick={() => setShowAddAthlete(null)} className="p-1 rounded text-muted hover:text-ink transition">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input type="text" value={form.first_name} onChange={e => setAthleteField(team.id, "first_name", e.target.value)}
                            placeholder="First name *" autoFocus
                            className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition" />
                          <input type="text" value={form.last_name} onChange={e => setAthleteField(team.id, "last_name", e.target.value)}
                            placeholder="Last name *"
                            className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <input type="email" value={form.email} onChange={e => setAthleteField(team.id, "email", e.target.value)}
                            placeholder="Email *"
                            className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition" />
                          <input type="text" value={form.external_user_id} onChange={e => setAthleteField(team.id, "external_user_id", e.target.value)}
                            placeholder="ID / initials (e.g. JDO)"
                            className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted font-mono focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition" />
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
                    )}

                    {/* Athlete cards */}
                    {teamAthletes.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {teamAthletes.map(a => (
                          <AthleteCard
                            key={a.ow_user_id}
                            athlete={a}
                            onDelete={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              setConfirmDeleteAthlete({
                                teamId: team.id,
                                owUserId: a.ow_user_id,
                                name: a.athlete_name ?? "this athlete",
                              });
                            }}
                          />
                        ))}
                      </div>
                    ) : !addingHere ? (
                      <p className="text-sm text-muted py-1">No athletes yet — hover the team name to add one.</p>
                    ) : null}
                  </div>
                )}

                {/* Divider between teams */}
                <div className="mt-6 border-b border-line" />
              </div>
            );
          })}

          {/* New team form or button */}
          {showNewTeam ? (
            <div className="rounded-xl border border-brand/30 bg-surface p-4 flex gap-2 items-center">
              <input
                type="text"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreateTeam()}
                placeholder="Team name, e.g. Triathlon Squad"
                autoFocus
                className="flex-1 rounded-lg border border-line bg-canvas px-3.5 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
              />
              <button onClick={handleCreateTeam} disabled={isPending || !newTeamName.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create
              </button>
              <button onClick={() => setShowNewTeam(false)} className="p-2 rounded-lg text-muted hover:text-ink hover:bg-surfaceStrong transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewTeam(true)}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink border border-dashed border-line hover:border-ink/30 rounded-lg px-4 py-2.5 hover:bg-surfaceStrong transition w-full justify-center"
            >
              <Plus className="h-4 w-4" /> New team
            </button>
          )}
        </div>
      )}

      {/* Confirm delete team */}
      {confirmDeleteTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-xl border border-line bg-surface shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-sm font-semibold text-ink mb-1">Delete &ldquo;{confirmDeleteTeam.name}&rdquo;?</p>
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
            <p className="text-sm text-muted mb-5"><span className="font-medium text-ink">{confirmDeleteAthlete.name}</span> will be permanently removed and deleted from Open Wearables. This cannot be undone.</p>
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
