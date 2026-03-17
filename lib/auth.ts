import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const localDemoUser = {
  id: "local-demo-user",
  app_metadata: { role: "coach" },
  user_metadata: { role: "coach", full_name: "Local Coach" },
  aud: "authenticated",
  created_at: "2026-03-11T00:00:00.000Z"
} as User;

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) {
    return localDemoUser;
  }

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
});

export const getCurrentRole = cache(async (): Promise<AppRole> => {
  const user = await getCurrentUser();
  const role = user?.app_metadata?.role ?? user?.user_metadata?.role;
  return role === "athlete" ? "athlete" : "coach";
});

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
