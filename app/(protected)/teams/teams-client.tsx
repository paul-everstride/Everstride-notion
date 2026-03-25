"use client";

import { useState, useTransition } from "react";
import { Plus, UserPlus, Copy, Check, ChevronDown, ChevronRight, Loader2, Shield } from "lucide-react";
import { createTeamAction, createAthleteAction } from "./actions";

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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="ml-1 text-muted hover:text-ink transition p-0.5 rounded shrink-0" title="Copy link">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function TeamsClient({ coachId, initialTeams, initialAthletes, owFrontendUrl }: Props) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [athletes, setAthletes] = useState<Record<string, TeamAthlete[]>>(initialAthletes);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(initialTeams[0]?.id ?? null);
  const [newTeamName, setNewTeamName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Athlete form state per team
  const [athleteForm, setAthleteForm] = useState<Record<string, {
    first_name: string; last_name: string; email: string; external_user_id: string;
  }>>({});
  const [athletePending, setAthletePending] = useState<string | null>(null);

  function getAthleteForm(teamId: string) {
    return athleteForm[teamId] ?? { first_name: "", last_name: "", email: "", external_user_id: "" };
  }

  function setAthleteField(teamId: string, field: string, value: string) {
    setAthleteForm(prev => ({
      ...prev,
      [teamId]: { ...getAthleteForm(teamId), [field]: value }
    }));
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
    } else {
      setError(result.error ?? "Failed to create athlete");
    }
    setAthletePending(null);
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Create team */}
      <div className="rounded-xl border border-line bg-surface p-5">
        <p className="text-sm font-medium text-ink mb-3">New team</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreateTeam()}
            placeholder="e.g. Triathlon Squad"
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
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">{error}</p>
      )}

      {teams.length === 0 ? (
        <p className="text-sm text-muted py-4">No teams yet. Create one above.</p>
      ) : (
        <div className="space-y-4">
          {teams.map(team => {
            const teamAthletes = athletes[team.id] ?? [];
            const expanded = expandedTeam === team.id;
            const form = getAthleteForm(team.id);

            return (
              <div key={team.id} className="rounded-xl border border-line bg-surface overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpandedTeam(expanded ? null : team.id)}
                  className="w-full flex items-center gap-2.5 px-5 py-4 text-left hover:bg-surfaceStrong transition"
                >
                  {expanded ? <ChevronDown className="h-4 w-4 text-muted shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted shrink-0" />}
                  <Shield className="h-4 w-4 text-muted shrink-0" />
                  <span className="text-sm font-medium text-ink flex-1">{team.name}</span>
                  <span className="rounded-full bg-line px-2 py-0.5 text-xs text-muted">{teamAthletes.length}</span>
                </button>

                {expanded && (
                  <div className="border-t border-line">
                    {/* Add athlete form */}
                    <div className="px-5 py-4 border-b border-line bg-canvas/50">
                      <p className="text-xs font-medium text-muted uppercase tracking-wider mb-3">Add athlete</p>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input
                          type="text"
                          value={form.first_name}
                          onChange={e => setAthleteField(team.id, "first_name", e.target.value)}
                          placeholder="First name *"
                          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
                        />
                        <input
                          type="text"
                          value={form.last_name}
                          onChange={e => setAthleteField(team.id, "last_name", e.target.value)}
                          placeholder="Last name *"
                          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <input
                          type="email"
                          value={form.email}
                          onChange={e => setAthleteField(team.id, "email", e.target.value)}
                          placeholder="Email *"
                          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
                        />
                        <input
                          type="text"
                          value={form.external_user_id}
                          onChange={e => setAthleteField(team.id, "external_user_id", e.target.value)}
                          placeholder="ID / initials (e.g. JDO)"
                          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted font-mono focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
                        />
                      </div>
                      <button
                        onClick={() => handleCreateAthlete(team.id)}
                        disabled={athletePending === team.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
                      >
                        {athletePending === team.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        Add to team
                      </button>
                    </div>

                    {/* Athletes table */}
                    {teamAthletes.length === 0 ? (
                      <div className="px-5 py-4 text-sm text-muted">No athletes yet. Add one above.</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-line text-xs text-muted uppercase tracking-wider">
                            <th className="px-5 py-2 text-left font-medium">Athlete</th>
                            <th className="px-5 py-2 text-left font-medium">ID</th>
                            <th className="px-5 py-2 text-left font-medium">Pairing link</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamAthletes.map(a => (
                            <tr key={a.ow_user_id} className="border-b border-line last:border-0 hover:bg-surfaceStrong transition">
                              <td className="px-5 py-3">
                                <p className="font-medium text-ink">{a.athlete_name ?? "—"}</p>
                                <p className="text-xs text-muted">{a.athlete_email ?? "—"}</p>
                              </td>
                              <td className="px-5 py-3 font-mono text-xs text-muted">{a.ow_user_id.slice(0, 8)}…</td>
                              <td className="px-5 py-3">
                                {a.pairing_link ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted truncate max-w-[200px]">{a.pairing_link}</span>
                                    <CopyButton text={a.pairing_link} />
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
