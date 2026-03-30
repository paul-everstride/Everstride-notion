import { requireAuthenticatedUser } from "@/lib/auth";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const user = await requireAuthenticatedUser();
  const name = user.user_metadata?.full_name ?? "";
  const email = user.email ?? "";

  return (
    <div className="min-h-screen bg-canvas">
      <div className="border-b border-line px-6 py-5">
        <h1 className="text-xl font-semibold text-ink">Coach Settings</h1>
        <p className="text-sm text-muted mt-0.5">Manage your profile</p>
      </div>
      <div className="px-6 py-6">
        <SettingsClient initialName={name} email={email} />
      </div>
    </div>
  );
}
