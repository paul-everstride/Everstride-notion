"use server";

import { requireAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { owCreateTeam, owGetTeams, owCreateUser, owAddTeamMember, owDeleteTeam, owDeleteUser, owUpdateUser } from "@/lib/ow-client";
import { sendPairingEmail } from "@/lib/email";
import { revalidatePath, revalidateTag } from "next/cache";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

    // Create in OW — pass coach email so it's visible in OW dashboard
    const owTeam = await owCreateTeam(name, user.email ?? undefined);

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
    const coach = await requireAuthenticatedUser();
    const supabase = createSupabaseServiceClient();
    if (!supabase) return { success: false, error: "DB not configured" };

    // Get the OW team ID + team name for this Supabase team
    const { data: team } = await supabase
      .from("teams")
      .select("ow_team_id, name")
      .eq("id", supabaseTeamId)
      .single();

    // Create user in OW
    const owUser = await owCreateUser(data);

    // Add to OW team if we have the mapping
    if (team?.ow_team_id) {
      await owAddTeamMember(team.ow_team_id, owUser.id);
    }

    const athleteName = `${data.first_name} ${data.last_name}`.trim();
    const pairingLink = `${process.env.OW_FRONTEND_URL ?? "https://connect.everstride.fit"}/users/${owUser.id}/pair`;

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

    // Send pairing email to athlete (best-effort — don't fail if email fails)
    await sendPairingEmail({
      to: data.email,
      athleteName,
      coachName: coach.user_metadata?.full_name ?? coach.email ?? null,
      teamName: team?.name ?? "your team",
      pairingLink,
    }).catch(() => {});

    revalidatePath("/teams");
    return { success: true, userId: owUser.id, pairingLink };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function renameTeamAction(supabaseTeamId: string, newName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createSupabaseServiceClient();
    if (!supabase) return { success: false, error: "DB not configured" };

    const { error } = await supabase
      .from("teams")
      .update({ name: newName.trim() })
      .eq("id", supabaseTeamId)
      .eq("coach_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/teams");
    revalidateTag("dashboard-athletes");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteTeamAction(supabaseTeamId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createSupabaseServiceClient();
    if (!supabase) return { success: false, error: "DB not configured" };

    // Get OW team ID and all athletes in this team
    const { data: team } = await supabase
      .from("teams")
      .select("ow_team_id")
      .eq("id", supabaseTeamId)
      .eq("coach_id", user.id)
      .single();

    const { data: athletes } = await supabase
      .from("team_athletes")
      .select("ow_user_id")
      .eq("team_id", supabaseTeamId);

    // Delete each athlete from OW
    if (athletes) {
      await Promise.all(athletes.map(a => owDeleteUser(a.ow_user_id)));
    }

    // Delete the OW team (cascades member associations)
    if (team?.ow_team_id) await owDeleteTeam(team.ow_team_id);

    // Delete from Supabase (cascades team_athletes)
    const { error } = await supabase.from("teams").delete().eq("id", supabaseTeamId).eq("coach_id", user.id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/teams");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function uploadAvatarAction(
  owUserId: string,
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createSupabaseServiceClient();
    if (!supabase) return { success: false, error: "DB not configured" };

    const file = formData.get("file") as File | null;
    if (!file) return { success: false, error: "No file selected." };

    // Validate type
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      return { success: false, error: `Unsupported file type (${file.type || "unknown"}). Please use JPG, PNG, WebP or GIF.` };
    }

    // Validate size
    if (file.size > MAX_AVATAR_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      return { success: false, error: `File is ${mb} MB — maximum allowed size is 5 MB. Please compress or resize the image first.` };
    }

    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${user.id}/${owUserId}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, buffer, { upsert: true, contentType: file.type });

    if (upErr) return { success: false, error: `Upload failed: ${upErr.message}` };

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return { success: true, url: data.publicUrl };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Persists avatar_url immediately after upload — no need to click Save separately.
 *  Uses select-then-update-or-insert to avoid needing a unique constraint.
 *  OW-only athletes (no existing row) get a minimal row created for avatar storage. */
export async function saveAvatarUrlAction(
  supabaseTeamId: string,
  owUserId: string,
  avatarUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseServiceClient();
    if (!supabase) return { success: false, error: "DB not configured" };

    // Check if a row already exists
    const { data: existing } = await supabase
      .from("team_athletes")
      .select("ow_user_id")
      .eq("team_id", supabaseTeamId)
      .eq("ow_user_id", owUserId)
      .limit(1);

    if (existing && existing.length > 0) {
      // Row exists — update avatar_url in-place
      const { error } = await supabase
        .from("team_athletes")
        .update({ avatar_url: avatarUrl })
        .eq("team_id", supabaseTeamId)
        .eq("ow_user_id", owUserId);
      if (error) return { success: false, error: error.message };
    } else {
      // No row yet (OW-only athlete) — create a minimal row for avatar storage
      // The teams page always merges OW name/email on top of this row
      const { error } = await supabase
        .from("team_athletes")
        .insert({ team_id: supabaseTeamId, ow_user_id: owUserId, avatar_url: avatarUrl });
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/teams");
    revalidatePath("/athletes", "layout");
    revalidatePath("/", "layout");
    revalidateTag("dashboard-athletes");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateAthleteAction(
  supabaseTeamId: string,
  owUserId: string,
  data: { athlete_name: string; athlete_email: string; avatar_url?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseServiceClient();
    if (!supabase) return { success: false, error: "DB not configured" };
    const updateData: Record<string, string> = {
      athlete_name: data.athlete_name,
      athlete_email: data.athlete_email,
    };
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;

    // Write to Supabase — select-then-update-or-insert (no unique constraint required)
    const { data: existing } = await supabase
      .from("team_athletes")
      .select("ow_user_id")
      .eq("team_id", supabaseTeamId)
      .eq("ow_user_id", owUserId)
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from("team_athletes")
        .update(updateData)
        .eq("team_id", supabaseTeamId)
        .eq("ow_user_id", owUserId);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase
        .from("team_athletes")
        .insert({ team_id: supabaseTeamId, ow_user_id: owUserId, ...updateData });
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/teams");
    revalidatePath("/athletes", "layout");
    revalidatePath("/", "layout");
    revalidateTag("dashboard-athletes");

    // Sync name + email to OW best-effort — never blocks the DB save
    try {
      const nameParts = data.athlete_name.trim().split(/\s+/);
      await owUpdateUser(owUserId, {
        first_name: nameParts[0] ?? "",
        last_name: nameParts.slice(1).join(" ") || "",
        email: data.athlete_email,
      });
    } catch { /* OW sync failure is non-fatal */ }

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteAthleteAction(
  supabaseTeamId: string,
  owUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseServiceClient();
    if (!supabase) return { success: false, error: "DB not configured" };

    // Delete from OW
    await owDeleteUser(owUserId);

    // Delete from Supabase team_athletes
    const { error } = await supabase
      .from("team_athletes")
      .delete()
      .eq("team_id", supabaseTeamId)
      .eq("ow_user_id", owUserId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/teams");
    return { success: true };
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

/**
 * Update an athlete's name and/or avatar from the athlete detail page.
 * Automatically resolves the correct team by looking up the coach's teams.
 */
export async function updateAthleteProfileAction(
  owUserId: string,
  data: { athlete_name?: string; avatar_url?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createSupabaseServiceClient();
    if (!supabase) return { success: false, error: "DB not configured" };

    // Find all teams belonging to this coach
    const { data: teams } = await supabase
      .from("teams")
      .select("id")
      .eq("coach_id", user.id);
    if (!teams?.length) return { success: false, error: "No teams found" };

    const teamIds = teams.map((t: { id: string }) => t.id);

    // Find the team this athlete is already associated with
    const { data: existing } = await supabase
      .from("team_athletes")
      .select("team_id")
      .eq("ow_user_id", owUserId)
      .in("team_id", teamIds)
      .limit(1)
      .maybeSingle();

    const teamId = existing?.team_id ?? teams[0].id;

    const { error } = await supabase
      .from("team_athletes")
      .upsert(
        { team_id: teamId, ow_user_id: owUserId, ...data },
        { onConflict: "team_id,ow_user_id" }
      );
    if (error) return { success: false, error: error.message };

    // Best-effort OW name sync
    if (data.athlete_name) {
      try {
        const parts = data.athlete_name.trim().split(/\s+/);
        await owUpdateUser(owUserId, {
          first_name: parts[0] ?? "",
          last_name: parts.slice(1).join(" ") || "",
        });
      } catch { /* non-fatal */ }
    }

    revalidatePath(`/athletes/${owUserId}`);
    revalidateTag("dashboard-athletes");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
