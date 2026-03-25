import { requireAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TeamsClient } from "./teams-client";

export default async function TeamsPage() {
  const user = await requireAuthenticatedUser();
  const supabase = createSupabaseServerClient();

  let teams: { id: string; name: string; ow_team_id?: string | null }[] = [];
  let initialAthletes: Record<string, { ow_user_id: string; athlete_name?: string | null; athlete_email?: string | null; pairing_link?: string | null }[]> = {};

  if (supabase) {
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name, ow_team_id")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: true });

    teams = teamsData ?? [];

    if (teams.length > 0) {
      const teamIds = teams.map(t => t.id);
      const { data: athletesData } = await supabase
        .from("team_athletes")
        .select("team_id, ow_user_id, athlete_name, athlete_email, pairing_link")
        .in("team_id", teamIds)
        .order("created_at", { ascending: false });

      for (const team of teams) {
        initialAthletes[team.id] = (athletesData ?? [])
          .filter(a => a.team_id === team.id);
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
      <div className="px-6 py-6">
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
