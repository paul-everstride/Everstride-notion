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
  // Try fetching from the Season Planner API (works for both demo and production)
  const plannerUrl = process.env.NEXT_PUBLIC_PLANNER_URL;
  if (plannerUrl) {
    try {
      const res = await fetch(
        `${plannerUrl}/api/load-plan?coach_id=local-demo-user&athlete_id=${encodeURIComponent(athleteOwId)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.plan_data) return data as SeasonPlanData;
      }
    } catch {
      // Planner unavailable — fall through to other methods
    }
  }

  // Try Supabase (production)
  const supabase = createSupabaseServiceClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("season_plans")
      .select("*")
      .eq("athlete_ow_id", athleteOwId)
      .order("season_year", { ascending: false })
      .limit(1)
      .single();

    if (!error && data) return data as SeasonPlanData;
  }

  // Final fallback — return a locally generated demo plan
  return buildDemoSeasonPlan(athleteOwId);
}

// ── Demo season plan generator ─────────────────────────────���─────────────────

function monday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(m.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const DEMO_PHASES: { phase: string; macro: string; color: string; weeks: number; volRange: [number, number]; intRange: [number, number] }[] = [
  { phase: "Base 1",     macro: "Base",      color: "#3b82f6", weeks: 4, volRange: [2, 3], intRange: [1, 2] },
  { phase: "Base 2",     macro: "Base",      color: "#2563eb", weeks: 4, volRange: [3, 4], intRange: [2, 2] },
  { phase: "Build 1",    macro: "Build",     color: "#f59e0b", weeks: 3, volRange: [3, 4], intRange: [3, 3] },
  { phase: "Recovery",   macro: "Recovery",  color: "#10b981", weeks: 1, volRange: [1, 2], intRange: [1, 1] },
  { phase: "Build 2",    macro: "Build",     color: "#d97706", weeks: 3, volRange: [4, 5], intRange: [3, 4] },
  { phase: "Peak",       macro: "Peak",      color: "#ef4444", weeks: 2, volRange: [2, 3], intRange: [4, 5] },
  { phase: "Taper",      macro: "Taper",     color: "#8b5cf6", weeks: 2, volRange: [1, 2], intRange: [2, 3] },
  { phase: "Race",       macro: "Race",      color: "#dc2626", weeks: 1, volRange: [1, 1], intRange: [5, 5] },
  { phase: "Transition", macro: "Transition",color: "#6b7280", weeks: 2, volRange: [1, 2], intRange: [1, 1] },
];

const DEMO_EVENTS: Record<string, {
  mainRaces: { name: string; weekOffset: number }[];
  secondaryRaces: { name: string; weekOffset: number }[];
  trainingCamps: { name: string; weekOffset: number; days: number }[];
}> = {
  "demo-1": {
    mainRaces: [{ name: "Ironman 70.3 Mallorca", weekOffset: 19 }],
    secondaryRaces: [{ name: "Sprint Tri — Zurich", weekOffset: 10 }, { name: "Olympic Tri — Lucerne", weekOffset: 15 }],
    trainingCamps: [{ name: "Altitude Camp — Livigno", weekOffset: 6, days: 10 }],
  },
  "demo-2": {
    mainRaces: [{ name: "Tour des Flandres GF", weekOffset: 19 }],
    secondaryRaces: [{ name: "Strade Bianche GF", weekOffset: 11 }, { name: "Amstel Gold GF", weekOffset: 16 }],
    trainingCamps: [{ name: "Spring Camp — Girona", weekOffset: 5, days: 7 }],
  },
  "demo-3": {
    mainRaces: [{ name: "Berlin Marathon", weekOffset: 19 }],
    secondaryRaces: [{ name: "Hamburg Half", weekOffset: 10 }, { name: "Copenhagen 10K", weekOffset: 14 }],
    trainingCamps: [{ name: "Altitude Camp — St. Moritz", weekOffset: 7, days: 14 }],
  },
  "demo-4": {
    mainRaces: [{ name: "Maratona dles Dolomites", weekOffset: 19 }],
    secondaryRaces: [{ name: "Ötztaler Radmarathon Quali", weekOffset: 12 }],
    trainingCamps: [{ name: "Training Camp — Tenerife", weekOffset: 4, days: 10 }],
  },
  "demo-5": {
    mainRaces: [{ name: "European Track Championships", weekOffset: 19 }],
    secondaryRaces: [{ name: "Swedish Nationals 800m", weekOffset: 11 }, { name: "Diamond League — Stockholm", weekOffset: 16 }],
    trainingCamps: [{ name: "Speed Camp — Chula Vista", weekOffset: 8, days: 12 }],
  },
  "demo-6": {
    mainRaces: [{ name: "Cyclassics Hamburg", weekOffset: 19 }],
    secondaryRaces: [{ name: "Eschborn-Frankfurt GF", weekOffset: 9 }, { name: "Vatternrundan", weekOffset: 15 }],
    trainingCamps: [{ name: "Training Camp — Calpe", weekOffset: 5, days: 7 }],
  },
};

function buildDemoSeasonPlan(athleteId: string): SeasonPlanData {
  const now = new Date();
  // Season starts ~10 weeks ago so we're mid-build
  const seasonStart = monday(addDays(now, -10 * 7));
  const MN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const weeks: PlanWeek[] = [];
  let weekNum = 1;
  let cursor = new Date(seasonStart);

  for (const p of DEMO_PHASES) {
    for (let w = 0; w < p.weeks; w++) {
      const mon = new Date(cursor);
      const sun = addDays(mon, 6);
      const vol = p.volRange[0] + (w % 2 === 0 ? 0 : Math.min(1, p.volRange[1] - p.volRange[0]));
      const int = p.intRange[0] + (w % 2 === 1 ? 0 : Math.min(1, p.intRange[1] - p.intRange[0]));
      weeks.push({
        week: weekNum,
        phase: p.phase,
        micro: w === p.weeks - 1 && p.phase.startsWith("Build") ? "Recovery" : "Normal",
        volume: Math.min(5, vol),
        intensity: Math.min(5, int),
        monday: fmt(mon),
        sunday: fmt(sun),
        weekRangeShort: `${MN[mon.getMonth()]} ${mon.getDate()} – ${MN[sun.getMonth()]} ${sun.getDate()}`,
        color: p.color,
        macro: p.macro,
        hasMainRace: false,
        hasSecondaryRace: false,
        hasTrainingCamp: false,
        races: [],
        trainingCamps: [],
        tests: [],
        focusText: "",
        goalText: "",
      });
      weekNum++;
      cursor = addDays(mon, 7);
    }
  }

  const seasonEnd = addDays(cursor, -1);
  const events = DEMO_EVENTS[athleteId] ?? DEMO_EVENTS["demo-1"]!;

  const mainRaces = events.mainRaces.map(r => {
    const wk = Math.min(r.weekOffset, weeks.length) - 1;
    const date = weeks[wk]?.sunday ?? fmt(seasonEnd);
    if (weeks[wk]) { weeks[wk].hasMainRace = true; weeks[wk].races.push(r.name); }
    return { name: r.name, date };
  });

  const secondaryRaces = events.secondaryRaces.map(r => {
    const wk = Math.min(r.weekOffset, weeks.length) - 1;
    const date = weeks[wk]?.sunday ?? fmt(seasonEnd);
    if (weeks[wk]) { weeks[wk].hasSecondaryRace = true; weeks[wk].races.push(r.name); }
    return { name: r.name, date };
  });

  const trainingCamps = events.trainingCamps.map(r => {
    const wk = Math.min(r.weekOffset, weeks.length) - 1;
    const date = weeks[wk]?.monday ?? fmt(seasonStart);
    const endDate = fmt(addDays(new Date(date + "T12:00:00Z"), r.days));
    if (weeks[wk]) { weeks[wk].hasTrainingCamp = true; weeks[wk].trainingCamps.push(r.name); }
    return { name: r.name, date, endDate };
  });

  // Add FTP tests at start and mid-season
  if (weeks[0]) { weeks[0].tests.push("FTP Test"); }
  if (weeks[8]) { weeks[8].tests.push("FTP Re-test"); }

  return {
    id: `demo-plan-${athleteId}`,
    season_year: now.getFullYear(),
    season_start: fmt(seasonStart),
    season_end: fmt(seasonEnd),
    athlete_name: "",
    plan_data: weeks,
    form_payload: { mainRaces, secondaryRaces, trainingCamps },
    created_at: new Date(seasonStart).toISOString(),
    updated_at: now.toISOString(),
  };
}
