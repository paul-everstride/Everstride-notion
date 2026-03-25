import { requireAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TeamsClient } from "./teams-client";

export default async function TeamsPage() {
  const user = await requireAuthenticatedUser();
  const supabase = createSupabaseServerClient();

  let teams: { id: string; name: string }[] = [];
  let teamAthletes: { team_id: string; ow_user_id: string }[] = [];

  if (supabase) {
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: true });

    teams = teamsData ?? [];

    if (teams.length > 0) {
      const teamIds = teams.map((t) => t.id);
      const { data: athletesData } = await supabase
        .from("team_athletes")
        .select("team_id, ow_user_id")
        .in("team_id", teamIds);
      teamAthletes = athletesData ?? [];
    }
  }

  return (
    <div>
      <div className="border-b border-line bg-canvas px-6 py-5">
        <h1 className="text-xl font-semibold text-ink">Teams</h1>
        <p className="text-sm text-muted mt-0.5">
          Manage your teams and assign athletes to them.
        </p>
      </div>
      <div className="px-6 py-6">
        <TeamsClient
          coachId={user.id}
          initialTeams={teams}
          initialTeamAthletes={teamAthletes}
        />
      </div>
    </div>
  );
}
