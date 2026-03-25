"use server";

import { requireAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { owCreateTeam, owGetTeams, owCreateUser, owAddTeamMember } from "@/lib/ow-client";
import { revalidatePath } from "next/cache";

export interface CreateTeamResult {
  success: boolean;
  teamId?: string;
  error?: string;
}

export interface CreateAthleteResult {
  success: boolean;
  userId?: string;
  pairingLink?: string;
  error?: string;
}

export async function createTeamAction(name: string): Promise<CreateTeamResult> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createSupabaseServiceClient();
    if (!supabase) return { success: false, error: "DB not configured" };

    // Create in OW (handles duplicate names automatically with suffix)
    const owTeam = await owCreateTeam(name);

    // Store in Supabase with the coach's original name
    const { data, error } = await supabase
      .from("teams")
      .insert({ name, coach_id: user.id, ow_team_id: owTeam.id })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/teams");
    return { success: true, teamId: data.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function createAthleteAction(
  supabaseTeamId: string,
  data: { first_name: string; last_name: string; email: string; external_user_id: string }
): Promise<CreateAthleteResult> {
  try {
    const supabase = createSupabaseServiceClient();
    if (!supabase) return { success: false, error: "DB not configured" };

    // Get the OW team ID for this Supabase team
    const { data: team } = await supabase
      .from("teams")
      .select("ow_team_id")
      .eq("id", supabaseTeamId)
      .single();

    // Create user in OW
    const owUser = await owCreateUser(data);

    // Add to OW team if we have the mapping
    if (team?.ow_team_id) {
      await owAddTeamMember(team.ow_team_id, owUser.id);
    }

    const athleteName = `${data.first_name} ${data.last_name}`.trim();
    const pairingLink = `${process.env.OW_FRONTEND_URL ?? "https://frontend-production-fdc3.up.railway.app"}/users/${owUser.id}/pair`;

    // Store in Supabase team_athletes with name, email and pairing link
    const { error: insertError } = await supabase
      .from("team_athletes")
      .insert({
        team_id: supabaseTeamId,
        ow_user_id: owUser.id,
        athlete_name: athleteName,
        athlete_email: data.email,
        pairing_link: pairingLink,
      });

    if (insertError) return { success: false, error: `DB error: ${insertError.message}` };

    revalidatePath("/teams");
    return { success: true, userId: owUser.id, pairingLink };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function getTeamAthletesAction(supabaseTeamId: string) {
  try {
    const supabase = createSupabaseServiceClient();
    if (!supabase) return [];

    const { data } = await supabase
      .from("team_athletes")
      .select("ow_user_id, created_at, athlete_name, athlete_email, pairing_link")
      .eq("team_id", supabaseTeamId)
      .order("created_at", { ascending: false });

    return data ?? [];
  } catch {
    return [];
  }
}
