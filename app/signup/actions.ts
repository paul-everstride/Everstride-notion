"use server";

import { owRegisterCoach } from "@/lib/ow-client";

export async function registerCoachAction(email: string, name: string): Promise<void> {
  try {
    await owRegisterCoach(email, name || undefined);
  } catch {
    // Best-effort — don't block signup if OW registration fails
  }
}
