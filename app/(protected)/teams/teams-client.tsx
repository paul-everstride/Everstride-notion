"use client";

import { useState } from "react";
import { Plus, Trash2, UserPlus, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface Team {
  id: string;
  name: string;
}

interface TeamAthlete {
  team_id: string;
  ow_user_id: string;
}

interface Props {
  coachId: string;
  initialTeams: Team[];
  initialTeamAthletes: TeamAthlete[];
}

export function TeamsClient({ coachId, initialTeams, initialTeamAthletes }: Props) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [teamAthletes, setTeamAthletes] = useState<TeamAthlete[]>(initialTeamAthletes);
  const [newTeamName, setNewTeamName] = useState("");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(
    initialTeams[0]?.id ?? null
  );
  const [newAthleteId, setNewAthleteId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [athleteLoading, setAthleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  async function createTeam() {
    if (!newTeamName.trim() || !supabase) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("teams")
      .insert({ name: newTeamName.trim(), coach_id: coachId })
      .select("id, name")
      .single();

    if (err) {
      setError(err.message);
    } else if (data) {
      setTeams((prev) => [...prev, data]);
      setExpandedTeam(data.id);
      setNewTeamName("");
    }
    setLoading(false);
  }

  async function deleteTeam(teamId: string) {
    if (!supabase) return;
    await supabase.from("teams").delete().eq("id", teamId);
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    setTeamAthletes((prev) => prev.filter((a) => a.team_id !== teamId));
  }

  async function addAthlete(teamId: string) {
    const owId = newAthleteId[teamId]?.trim();
    if (!owId || !supabase) return;
    setAthleteLoading(teamId);
    setError(null);

    const { error: err } = await supabase
      .from("team_athletes")
      .insert({ team_id: teamId, ow_user_id: owId });

    if (err) {
      setError(err.message.includes("unique") ? "That athlete is already in this team." : err.message);
    } else {
      setTeamAthletes((prev) => [...prev, { team_id: teamId, ow_user_id: owId }]);
      setNewAthleteId((prev) => ({ ...prev, [teamId]: "" }));
    }
    setAthleteLoading(null);
  }

  async function removeAthlete(teamId: string, owUserId: string) {
    if (!supabase) return;
    await supabase
      .from("team_athletes")
      .delete()
      .eq("team_id", teamId)
      .eq("ow_user_id", owUserId);
    setTeamAthletes((prev) =>
      prev.filter((a) => !(a.team_id === teamId && a.ow_user_id === owUserId))
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Create team */}
      <div className="rounded-xl border border-line bg-surface p-5">
        <p className="text-sm font-medium text-ink mb-3">New team</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createTeam()}
            placeholder="e.g. Triathlon Squad"
            className="flex-1 rounded-lg border border-line bg-canvas px-3.5 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
          />
          <button
            onClick={createTeam}
            disabled={loading || !newTeamName.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
          {error}
        </p>
      )}

      {/* Teams list */}
      {teams.length === 0 ? (
        <p className="text-sm text-muted py-4">No teams yet. Create your first team above.</p>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => {
            const athletes = teamAthletes.filter((a) => a.team_id === team.id);
            const expanded = expandedTeam === team.id;

            return (
              <div key={team.id} className="rounded-xl border border-line bg-surface overflow-hidden">
                {/* Team header */}
                <div className="flex items-center justify-between px-5 py-3.5">
                  <button
                    onClick={() => setExpandedTeam(expanded ? null : team.id)}
                    className="flex items-center gap-2 text-sm font-medium text-ink hover:text-brand transition"
                  >
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 text-muted" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted" />
                    )}
                    {team.name}
                    <span className="ml-1 rounded-full bg-line px-2 py-0.5 text-xs text-muted font-normal">
                      {athletes.length}
                    </span>
                  </button>
                  <button
                    onClick={() => deleteTeam(team.id)}
                    className="text-muted hover:text-red-500 transition p-1 rounded"
                    title="Delete team"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Expanded content */}
                {expanded && (
                  <div className="border-t border-line px-5 py-4 space-y-4">
                    {/* Athletes list */}
                    {athletes.length === 0 ? (
                      <p className="text-xs text-muted">No athletes yet. Add one below.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {athletes.map((a) => (
                          <li
                            key={a.ow_user_id}
                            className="flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2"
                          >
                            <span className="text-xs font-mono text-ink">{a.ow_user_id}</span>
                            <button
                              onClick={() => removeAthlete(team.id, a.ow_user_id)}
                              className="text-muted hover:text-red-500 transition p-0.5 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Add athlete */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newAthleteId[team.id] ?? ""}
                        onChange={(e) =>
                          setNewAthleteId((prev) => ({ ...prev, [team.id]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && addAthlete(team.id)}
                        placeholder="OW User ID (e.g. usr_abc123)"
                        className="flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition font-mono"
                      />
                      <button
                        onClick={() => addAthlete(team.id)}
                        disabled={athleteLoading === team.id || !newAthleteId[team.id]?.trim()}
                        className="inline-flex items-center gap-1 rounded-lg border border-brand text-brand px-3 py-2 text-xs font-medium hover:bg-brand hover:text-white disabled:opacity-50 transition"
                      >
                        {athleteLoading === team.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                        Add
                      </button>
                    </div>
                    <p className="text-xs text-muted">
                      Find the OW User ID on the athlete&apos;s profile page in the Open Wearables dashboard.
                    </p>
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
