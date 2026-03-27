"use client";

import { useState, useMemo } from "react";
import { Settings2 } from "lucide-react";
import { AthleteTable, defaultAthleteColumns, type AthleteColumnKey } from "@/components/athlete-table";
import type { AthleteSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  athletes: AthleteSummary[];
  attentionIdList: string[];
  attentionCount: number;
  initialFlagged?: boolean;
};

export function AthleteTableControls({ athletes, attentionIdList, attentionCount, initialFlagged = false }: Props) {
  const [search, setSearch] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(initialFlagged);
  const [visibleColumns, setVisibleColumns] = useState<AthleteColumnKey[]>(defaultAthleteColumns);
  const [showFieldsEditor, setShowFieldsEditor] = useState(false);

  const attentionIds = useMemo(() => new Set(attentionIdList), [attentionIdList]);

  const filteredAthletes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return athletes.filter(athlete => {
      if (flaggedOnly && !attentionIds.has(athlete.id)) return false;
      if (!query) return true;
      return [athlete.name, athlete.email, athlete.team].some(v => v != null && v.toLowerCase().includes(query));
    });
  }, [athletes, attentionIds, flaggedOnly, search]);


  const toggleColumn = (key: string) => {
    setVisibleColumns(c =>
      c.includes(key as AthleteColumnKey) ? c.filter(v => v !== key) : [...c, key as AthleteColumnKey]
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            className="bg-surface border border-line rounded-md text-sm text-ink placeholder:text-muted outline-none px-3 py-1.5 w-52 focus:border-blue/50 focus:ring-2 focus:ring-blue/10 transition-all"
            placeholder="Search by name, team…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setFlaggedOnly(c => !c)}
            className={cn(
              "text-sm rounded-md border px-3 py-1.5 transition-colors duration-100",
              flaggedOnly
                ? "border-danger/30 bg-dangerSoft text-danger"
                : "border-line text-muted hover:border-danger/30 hover:text-danger"
            )}
          >
            {flaggedOnly ? "● " : "○ "}Flagged ({attentionCount})
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{filteredAthletes.length} rows</span>
          <button
            type="button"
            onClick={() => setShowFieldsEditor(true)}
            className="flex items-center gap-1.5 text-sm text-muted border border-line rounded-md px-3 py-1.5 hover:text-ink hover:border-ink/30 transition-colors duration-100"
          >
            <Settings2 size={14} />
            Columns
          </button>
        </div>
      </div>

      {/* Table */}
      <AthleteTable
        athletes={filteredAthletes}
        visibleColumns={visibleColumns}
        state={filteredAthletes.length ? "default" : "empty"}
      />

      {/* Column editor overlay */}
      {showFieldsEditor && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setShowFieldsEditor(false)}
        >
          <div
            className="bg-canvas border border-line rounded-xl shadow-xl p-5 w-72"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-ink mb-3">Visible columns</h3>
            <div className="flex flex-col gap-1.5">
              {defaultAthleteColumns.map(key => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(key)}
                    onChange={() => toggleColumn(key)}
                    className="accent-brand"
                  />
                  <span className="text-sm text-ink capitalize">{key}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowFieldsEditor(false)}
              className="mt-4 w-full text-sm text-muted border border-line rounded-md py-1.5 hover:text-ink hover:border-ink/30 transition-colors duration-100"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
