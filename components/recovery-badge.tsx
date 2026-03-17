import { getRecoveryTone } from "@/lib/utils";
import { cn } from "@/lib/utils";

const toneClasses = {
  success: "text-success bg-successSoft",
  warning: "text-warning bg-warningSoft",
  danger:  "text-danger bg-dangerSoft"
} as const;

const toneLabels = {
  success: "Good",
  warning: "Moderate",
  danger:  "Low"
} as const;

export function RecoveryBadge({ score }: { score: number }) {
  const tone = getRecoveryTone(score);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tabular",
        toneClasses[tone]
      )}
    >
      {toneLabels[tone]} · {score}
    </span>
  );
}
