import { requireAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { owUpdateTeam, owGetTeams, owGetTeamMembers, owAddTeamMember, owDeleteTeam } from "@/lib/ow-client";
import { getDashboardData, getDemoTeams, getDemoTeamAthletes, IS_DEMO_DATA } from "@/lib/data";
import { TeamsClient } from "./teams-client";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const user = await requireAuthenticatedUser();
  const owFrontendUrl = process.env.OW_FRONTEND_URL ?? "https://connect.everstride.fit";

  // ── Demo mode: skip all Supabase/OW, use in-memory data ──
  if (IS_DEMO_DATA) {
    return (
      <div>
        <div className="border-b border-line bg-canvas px-6 py-5">
          <h1 className="text-xl font-semibold text-ink">Team Settings</h1>
          <p className="text-sm text-muted mt-0.5">
            Manage your teams and move athletes between them.
          </p>
        </div>
        <div className="px-6 py-6 max-w-6xl">
          <TeamsClient
            coachId={user.id}
            initialTeams={getDemoTeams()}
            initialAthletes={getDemoTeamAthletes()}
            owFrontendUrl={owFrontendUrl}
          />
        </div>
      </div>
    );
  }

  // ── Production mode: Supabase + OW ──
  const supabase = createSupabaseServerClient();

  let teams: { id: string; name: string; ow_team_id?: string | null }[] = [];
  let initialAthletes: Record<string, { ow_user_id: string; athlete_name?: string | null; athlete_email?: string | null; pairing_link?: string | null; avatar_url?: string | null; has_data?: boolean }[]> = {};

  const dashboardPromise = getDashboardData();

  if (supabase) {
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name, ow_team_id")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: true });

    teams = teamsData ?? [];

    if (teams.length > 0 && user.email) {
      await Promise.allSettled(
        teams
          .filter(t => t.ow_team_id)
          .map(t => owUpdateTeam(t.ow_team_id!, { name: t.name, coach_email: user.email! }))
      );
    }

    if (user.email) {
      const validOwTeamIds = new Set(teams.filter(t => t.ow_team_id).map(t => t.ow_team_id));
      try {
        const allOwTeams = await owGetTeams();
        const staleTeams = allOwTeams.filter(
          t => t.coach_email === user.email && !validOwTeamIds.has(t.id)
        );
        await Promise.allSettled(staleTeams.map(t => owDeleteTeam(t.id)));
      } catch { /* best-effort cleanup */ }
    }

    if (teams.length > 0) {
      const teamIds = teams.map(t => t.id);

      let athletesData: { team_id: string; ow_user_id: string; athlete_name?: string | null; athlete_email?: string | null; pairing_link?: string | null; avatar_url?: string | null }[] | null = null;

      const { data: withAvatar, error: avatarErr } = await supabase
        .from("team_athletes")
        .select("team_id, ow_user_id, athlete_name, athlete_email, pairing_link, avatar_url")
        .in("team_id", teamIds)
        .order("created_at", { ascending: false });

      if (!avatarErr) {
        athletesData = withAvatar;
      } else {
        const { data: withoutAvatar } = await supabase
          .from("team_athletes")
          .select("team_id, ow_user_id, athlete_name, athlete_email, pairing_link")
          .in("team_id", teamIds)
          .order("created_at", { ascending: false });
        athletesData = withoutAvatar;
      }

      for (const team of teams) {
        const supabaseAthletes = (athletesData ?? []).filter(a => a.team_id === team.id);
        const supabaseMap = new Map(supabaseAthletes.map(a => [a.ow_user_id, a]));
        let mergedAthletes: typeof supabaseAthletes = [];

        if (team.ow_team_id) {
          try {
            const owMembers = await owGetTeamMembers(team.ow_team_id);
            mergedAthletes = owMembers.map(m => {
              const supabaseRow = supabaseMap.get(m.id);
              const owName = [m.first_name, m.last_name].filter(Boolean).join(" ") || null;
              return {
                team_id: team.id,
                ow_user_id: m.id,
                athlete_name: supabaseRow?.athlete_name || owName,
                athlete_email: supabaseRow?.athlete_email || m.email || null,
                pairing_link: supabaseRow?.pairing_link || `${owFrontendUrl}/users/${m.id}/pair`,
                avatar_url: supabaseRow?.avatar_url ?? null,
              };
            });
            const owIds = new Set(owMembers.map(m => m.id));
            for (const sa of supabaseAthletes) {
              if (!owIds.has(sa.ow_user_id)) {
                mergedAthletes.push(sa);
                owAddTeamMember(team.ow_team_id!, sa.ow_user_id).catch(() => {});
              }
            }
          } catch {
            mergedAthletes = supabaseAthletes;
          }
        } else {
          mergedAthletes = supabaseAthletes;
        }

        initialAthletes[team.id] = mergedAthletes;
      }
    }

    try {
      const dashboard = await dashboardPromise;
      const withDataIds = new Set(dashboard.athletes.map(a => a.userId));
      for (const teamId of Object.keys(initialAthletes)) {
        initialAthletes[teamId] = initialAthletes[teamId].map(a => ({
          ...a,
          has_data: withDataIds.has(a.ow_user_id),
        }));
      }
    } catch { /* has_data is best-effort */ }
  }

  return (
    <div>
      <div className="border-b border-line bg-canvas px-6 py-5">
        <h1 className="text-xl font-semibold text-ink">Team Settings</h1>
        <p className="text-sm text-muted mt-0.5">
          Manage your teams and add athletes — pairing links are generated automatically.
        </p>
      </div>
      <div className="px-6 py-6 max-w-6xl">
        <TeamsClient
          coachId={user.id}
          initialTeams={teams}
          initialAthletes={initialAthletes}
          owFrontendUrl={owFrontendUrl}
        />
      </div>
    </div>
  );
}
