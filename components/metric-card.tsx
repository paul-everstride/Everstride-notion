import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  title: string;
  value: string;
  detail: string;
  accent?: boolean;
  state?: "default" | "loading" | "empty" | "error";
  children?: ReactNode;
};

export function MetricCard({
  title,
  value,
  detail,
  accent = false,
  state = "default",
  children
}: MetricCardProps) {
  if (state === "loading") {
    return (
      <div className="bg-canvas p-4 border border-line rounded-lg">
        <div className="h-2 w-20 skeleton mb-3" />
        <div className="h-7 w-16 skeleton mb-2" />
        <div className="h-2 w-32 skeleton" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border p-4 rounded-lg transition-colors duration-100",
        accent
          ? "border-brand/20 bg-brandSoft"
          : "border-line bg-canvas"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="m-0 text-xs font-medium text-muted">{title}</p>
          <p className={cn("mt-1.5 text-2xl font-semibold tabular tracking-tight", accent ? "text-brand" : "text-ink")}>
            {value}
          </p>
          <p className="mt-1 text-xs text-muted">
            {state === "empty" ? "No data" : state === "error" ? "Load error" : detail}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
