import { requireAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { owUpdateTeam, owGetTeamMembers } from "@/lib/ow-client";
import { TeamsClient } from "./teams-client";

export default async function TeamsPage() {
  const user = await requireAuthenticatedUser();
  const supabase = createSupabaseServerClient();

  let teams: { id: string; name: string; ow_team_id?: string | null }[] = [];
  let initialAthletes: Record<string, { ow_user_id: string; athlete_name?: string | null; athlete_email?: string | null; pairing_link?: string | null; avatar_url?: string | null }[]> = {};

  if (supabase) {
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name, ow_team_id")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: true });

    teams = teamsData ?? [];

    // Backfill coach_email on OW teams that were created before this field existed
    if (teams.length > 0 && user.email) {
      await Promise.allSettled(
        teams
          .filter(t => t.ow_team_id)
          .map(t => owUpdateTeam(t.ow_team_id!, { coach_email: user.email! }))
      );
    }

    if (teams.length > 0) {
      const teamIds = teams.map(t => t.id);

      // Try with avatar_url first; fall back without it if the column doesn't exist yet
      let athletesData: { team_id: string; ow_user_id: string; athlete_name?: string | null; athlete_email?: string | null; pairing_link?: string | null; avatar_url?: string | null }[] | null = null;

      const { data: withAvatar, error: avatarErr } = await supabase
        .from("team_athletes")
        .select("team_id, ow_user_id, athlete_name, athlete_email, pairing_link, avatar_url")
        .in("team_id", teamIds)
        .order("created_at", { ascending: false });

      if (!avatarErr) {
        athletesData = withAvatar;
      } else {
        // avatar_url column not yet added — fall back to base columns
        const { data: withoutAvatar } = await supabase
          .from("team_athletes")
          .select("team_id, ow_user_id, athlete_name, athlete_email, pairing_link")
          .in("team_id", teamIds)
          .order("created_at", { ascending: false });
        athletesData = withoutAvatar;
      }

      // Merge Supabase athletes with athletes added directly in OW dashboard
      for (const team of teams) {
        const supabaseAthletes = (athletesData ?? []).filter(a => a.team_id === team.id);
        const supabaseIds = new Set(supabaseAthletes.map(a => a.ow_user_id));

        // Fetch live OW team members for athletes added via OW dashboard
        let owOnlyAthletes: typeof supabaseAthletes = [];
        if (team.ow_team_id) {
          try {
            const owMembers = await owGetTeamMembers(team.ow_team_id);
            owOnlyAthletes = owMembers
              .filter(m => !supabaseIds.has(m.id))
              .map(m => ({
                team_id: team.id,
                ow_user_id: m.id,
                athlete_name: [m.first_name, m.last_name].filter(Boolean).join(" ") || null,
                athlete_email: m.email ?? null,
                pairing_link: null,
                avatar_url: null,
              }));
          } catch {
            // OW unreachable — skip
          }
        }

        initialAthletes[team.id] = [...supabaseAthletes, ...owOnlyAthletes];
      }
    }
  }

  const owFrontendUrl = process.env.OW_FRONTEND_URL ?? "https://frontend-production-fdc3.up.railway.app";

  return (
    <div>
      <div className="border-b border-line bg-canvas px-6 py-5">
        <h1 className="text-xl font-semibold text-ink">Teams</h1>
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
