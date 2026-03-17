import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function formatSleepDuration(totalMilliseconds: number) {
  const totalMinutes = Math.round(totalMilliseconds / 60000);
  return formatMinutes(totalMinutes);
}

export function formatWeight(weightKg: number) {
  return `${weightKg} kg`;
}

export function formatSignedNumber(value: number, suffix = "") {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value}${suffix}`;
}

export function getRecoveryTone(score: number) {
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "danger";
}
