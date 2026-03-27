"use client";

import { useState, useRef } from "react";
import { Camera, Pencil, Check, X, Loader2 } from "lucide-react";
import { uploadAvatarAction, updateAthleteProfileAction } from "@/app/(protected)/teams/actions";

interface Props {
  athleteId: string;
  initialName: string;
  initialAvatarUrl: string | null;
  email: string | null;
  team: string;
}

export function AthleteHeaderClient({ athleteId, initialName, initialAvatarUrl, email, team }: Props) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(initialName);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = name.split(" ").map((w: string) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  async function handlePhoto(file: File) {
    setError(null);
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { setError("Unsupported file type. Use JPG, PNG or WebP."); return; }
    if (file.size > 5 * 1024 * 1024) { setError(`File too large (max 5 MB).`); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadAvatarAction(athleteId, fd);
    if (result.success && result.url) {
      const bustedUrl = `${result.url}?t=${Date.now()}`;
      const save = await updateAthleteProfileAction(athleteId, { avatar_url: bustedUrl });
      if (save.success) { setAvatarUrl(bustedUrl); }
      else setError(save.error ?? "Failed to save photo.");
    } else {
      setError(result.error ?? "Upload failed.");
    }
    setUploading(false);
  }

  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    const result = await updateAthleteProfileAction(athleteId, { athlete_name: trimmed });
    setSaving(false);
    if (result.success) { setName(trimmed); setEditingName(false); }
    else setError(result.error ?? "Failed to save name.");
  }

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {/* Avatar — hover to change photo */}
      <div
        className="relative group cursor-pointer shrink-0"
        onClick={() => !uploading && fileRef.current?.click()}
        title="Change photo"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-10 h-10 rounded-full object-cover border border-line" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-surfaceStrong border border-line flex items-center justify-center">
            <span className="text-sm font-semibold text-muted">{initials}</span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {uploading
            ? <Loader2 className="h-4 w-4 text-white animate-spin" />
            : <Camera className="h-3.5 w-3.5 text-white" />}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.target.value = ""; }}
      />

      {/* Name + inline edit */}
      <div className="min-w-0">
        {editingName ? (
          <div className="flex items-center gap-1.5">
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") { setEditingName(false); setNameInput(name); }
              }}
              autoFocus
              className="text-xl font-semibold text-ink bg-transparent border-b-2 border-brand outline-none min-w-0 w-48"
            />
            <button
              onClick={saveName}
              disabled={saving}
              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition shrink-0"
              title="Save"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => { setEditingName(false); setNameInput(name); setError(null); }}
              className="p-1 rounded text-muted hover:text-ink hover:bg-surfaceStrong transition shrink-0"
              title="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 group/name">
            <h1 className="text-xl font-semibold text-ink truncate">{name}</h1>
            <button
              onClick={() => { setEditingName(true); setNameInput(name); }}
              className="opacity-0 group-hover/name:opacity-100 transition-opacity p-1 rounded text-muted hover:text-ink hover:bg-surfaceStrong shrink-0"
              title="Edit name"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
        {error
          ? <p className="text-xs text-red-500 mt-0.5 truncate">{error}</p>
          : <p className="text-sm text-muted mt-0.5 truncate">{email ?? team}</p>
        }
      </div>
    </div>
  );
}
