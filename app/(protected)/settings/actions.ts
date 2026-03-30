"use server";

import { requireAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export async function updateCoachNameAction(name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createSupabaseServiceClient();
    if (!supabase) return { success: false, error: "DB not configured" };

    // Update Supabase Auth user metadata
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, full_name: name.trim() },
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/settings");
    revalidatePath("/teams");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
