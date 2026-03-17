import { cn } from "@/lib/utils";

type PolarizedBarProps = {
  zones: {
    low: number;
    moderate: number;
    high: number;
  };
  compact?: boolean;
};

export function PolarizedBar({ zones, compact = false }: PolarizedBarProps) {
  return (
    <div className="min-w-28">
      <div className={cn("flex overflow-hidden rounded-full", compact ? "h-1.5" : "h-2")}>
        <div className="bg-blue" style={{ width: `${zones.low}%` }} />
        <div className="bg-warning" style={{ width: `${zones.moderate}%` }} />
        <div className="bg-danger" style={{ width: `${zones.high}%` }} />
      </div>
      {!compact ? (
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted">
          <span>Z1 {zones.low}%</span>
          <span>Z2 {zones.moderate}%</span>
          <span>Z3 {zones.high}%</span>
        </div>
      ) : null}
    </div>
  );
}
