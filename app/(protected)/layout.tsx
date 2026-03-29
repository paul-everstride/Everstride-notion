import { Sidebar } from "@/components/sidebar";
import { getCurrentRole, requireAuthenticatedUser } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthenticatedUser();
  const role = await getCurrentRole();
  const coachName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "";

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar role={role} coachId={user.id} coachName={coachName} />
      <main className="min-h-screen lg:pl-56">{children}</main>
    </div>
  );
}
