"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export interface SeasonPlanData {
  id: string;
  season_year: number;
  season_start: string;
  season_end: string;
  athlete_name: string;
  plan_data: PlanWeek[];
  form_payload: {
    mainRaces?: { name: string; date: string; endDate?: string }[];
    secondaryRaces?: { name: string; date: string; endDate?: string }[];
    trainingCamps?: { name: string; date: string; endDate?: string }[];
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
}

export interface PlanWeek {
  week: number;
  phase: string;
  micro: string;
  volume: number;
  intensity: number;
  monday: string;
  sunday: string;
  weekRangeShort: string;
  color: string;
  macro: string;
  hasMainRace: boolean;
  hasSecondaryRace: boolean;
  hasTrainingCamp: boolean;
  races: string[];
  trainingCamps: string[];
  tests: string[];
  focusText: string;
  goalText: string;
}

export async function getSeasonPlan(athleteOwId: string): Promise<SeasonPlanData | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("season_plans")
    .select("*")
    .eq("athlete_ow_id", athleteOwId)
    .order("season_year", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as SeasonPlanData;
}
