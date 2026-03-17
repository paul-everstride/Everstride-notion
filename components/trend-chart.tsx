"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type TrendPoint = {
  label: string;
  value: number;
};

type TrendChartProps = {
  data: TrendPoint[];
  state?: "default" | "loading" | "empty" | "error";
  color?: string;
};

function computeDomain(values: number[]): [number, number] {
  if (values.length === 0) return [0, 100];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const pad = range < 1 ? Math.max(max * 0.2, 5) : range * 0.2;
  return [Math.floor(min - pad), Math.ceil(max + pad)];
}

function tickFmt(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}

export function TrendChart({ data, state = "default", color = "#e16b2b" }: TrendChartProps) {
  if (state === "loading") {
    return <div className="h-56 animate-pulse rounded-lg bg-surfaceStrong" />;
  }

  if (state === "empty") {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg bg-surface text-xs text-muted">
        No trend data
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg bg-surface text-xs text-muted">
        Failed to load
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const [yMin, yMax] = computeDomain(values);
  const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const latest = values[values.length - 1] ?? 0;
  const gradientId = `grad-${color.replace("#", "")}`;

  return (
    <div style={{ height: 220 }}>
      {/* Mini stat bar */}
      <div className="flex items-center gap-4 border-b border-line px-3 py-1.5">
        <span className="text-[10px] text-muted">
          Now <span className="text-ink font-semibold ml-0.5">{tickFmt(latest)}</span>
        </span>
        <span className="text-[10px] text-muted">
          Avg <span className="ml-0.5">{tickFmt(avg)}</span>
        </span>
        <span className="text-[10px] text-muted">
          Min <span className="ml-0.5">{tickFmt(Math.min(...values))}</span>
        </span>
        <span className="text-[10px] text-muted">
          Max <span className="ml-0.5">{tickFmt(Math.max(...values))}</span>
        </span>
      </div>

      <div style={{ height: 183 }} className="px-1 pt-2 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.12} />
                <stop offset="100%" stopColor={color} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              horizontal={true}
              stroke="#e9e9e7"
              strokeDasharray="0"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#9b9a97", fontSize: 10, fontFamily: "inherit" }}
            />
            <YAxis
              domain={[yMin, yMax]}
              tickFormatter={tickFmt}
              tickCount={5}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#9b9a97", fontSize: 10, fontFamily: "inherit" }}
              width={32}
            />
            <ReferenceLine
              y={avg}
              stroke={color}
              strokeOpacity={0.25}
              strokeDasharray="4 3"
              strokeWidth={1}
            />
            <Tooltip
              cursor={{ stroke: "#e9e9e7", strokeWidth: 1 }}
              contentStyle={{
                border: "1px solid #e9e9e7",
                background: "#ffffff",
                color: "#37352f",
                fontSize: 12,
                fontFamily: "inherit",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                padding: "6px 10px",
                borderRadius: "6px"
              }}
              labelStyle={{ color: "#9b9a97", fontSize: 10 }}
              formatter={(v: number) => [tickFmt(v), ""]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={{ r: 3, fill: color, stroke: "#ffffff", strokeWidth: 1.5 }}
              activeDot={{ r: 4.5, fill: color, stroke: "#ffffff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
