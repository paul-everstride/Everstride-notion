"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { updateCoachNameAction } from "./actions";

export function SettingsClient({ initialName, email }: { initialName: string; email: string }) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = name.trim() !== initialName;

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await updateCoachNameAction(name.trim());
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(result.error ?? "Failed to save");
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted uppercase tracking-wider">Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && hasChanges) handleSave(); }}
          className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-canvas text-ink focus:outline-none focus:border-brand transition-colors"
          placeholder="Your name"
        />
      </div>

      {/* Email (read-only) */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted uppercase tracking-wider">Email</label>
        <input
          type="text"
          value={email}
          readOnly
          className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-surfaceStrong text-muted cursor-not-allowed"
        />
        <p className="text-xs text-muted">Email cannot be changed.</p>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed bg-ink text-white hover:bg-ink/80"
        >
          {saving ? (
            <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</span>
          ) : saved ? (
            <span className="flex items-center gap-2"><Check className="h-3.5 w-3.5" /> Saved</span>
          ) : (
            "Save Changes"
          )}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
