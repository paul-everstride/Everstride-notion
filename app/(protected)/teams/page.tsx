import { requireAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { owUpdateTeam, owGetTeamMembers, owAddTeamMember } from "@/lib/ow-client";
import { getDashboardData } from "@/lib/data";
import { TeamsClient } from "./teams-client";

export default async function TeamsPage() {
  const user = await requireAuthenticatedUser();
  const supabase = createSupabaseServerClient();
  const owFrontendUrl = process.env.OW_FRONTEND_URL ?? "https://connect.everstride.fit";

  let teams: { id: string; name: string; ow_team_id?: string | null }[] = [];
  let initialAthletes: Record<string, { ow_user_id: string; athlete_name?: string | null; athlete_email?: string | null; pairing_link?: string | null; avatar_url?: string | null; has_data?: boolean }[]> = {};

  // Fetch dashboard data in parallel — it's cached so this adds no latency on repeat loads.
  // We use it purely to mark which athletes already have wearable data connected.
  const dashboardPromise = getDashboardData();

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

      // Merge Supabase athletes with athletes added directly in OW dashboard.
      // Strategy: OW is always the source of truth for names/emails.
      // Supabase is the source of truth for avatar_url and any manual overrides.
      for (const team of teams) {
        const supabaseAthletes = (athletesData ?? []).filter(a => a.team_id === team.id);
        // Build a lookup map from ow_user_id → supabase row (for avatar + manual edits)
        const supabaseMap = new Map(supabaseAthletes.map(a => [a.ow_user_id, a]));

        let mergedAthletes: typeof supabaseAthletes = [];

        if (team.ow_team_id) {
          try {
            const owMembers = await owGetTeamMembers(team.ow_team_id);
            // For every OW member: use OW for name/email, Supabase for avatar + overrides
            mergedAthletes = owMembers.map(m => {
              const supabaseRow = supabaseMap.get(m.id);
              const owName = [m.first_name, m.last_name].filter(Boolean).join(" ") || null;
              return {
                team_id: team.id,
                ow_user_id: m.id,
                // Prefer Supabase name if manually set, otherwise use OW name
                athlete_name: supabaseRow?.athlete_name || owName,
                athlete_email: supabaseRow?.athlete_email || m.email || null,
                pairing_link: supabaseRow?.pairing_link || `${owFrontendUrl}/users/${m.id}/pair`,
                // Always use Supabase avatar_url — this is where uploads are stored
                avatar_url: supabaseRow?.avatar_url ?? null,
              };
            });
            // Sync Supabase-only athletes to OW team (keeps OW in sync with Everstride)
            const owIds = new Set(owMembers.map(m => m.id));
            for (const sa of supabaseAthletes) {
              if (!owIds.has(sa.ow_user_id)) {
                mergedAthletes.push(sa);
                // Best-effort: add missing athlete to the OW team so dashboards stay in sync
                owAddTeamMember(team.ow_team_id!, sa.ow_user_id).catch(() => {});
              }
            }
          } catch {
            // OW unreachable — fall back to Supabase data only
            mergedAthletes = supabaseAthletes;
          }
        } else {
          mergedAthletes = supabaseAthletes;
        }

        initialAthletes[team.id] = mergedAthletes;
      }
    }

    // Resolve dashboard data and stamp has_data on each athlete
    try {
      const dashboard = await dashboardPromise;
      const withDataIds = new Set(dashboard.athletes.map(a => a.userId));
      for (const teamId of Object.keys(initialAthletes)) {
        initialAthletes[teamId] = initialAthletes[teamId].map(a => ({
          ...a,
          has_data: withDataIds.has(a.ow_user_id),
        }));
      }
    } catch { /* has_data is best-effort — cards still render without it */ }
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
