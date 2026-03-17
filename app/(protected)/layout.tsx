import { Sidebar } from "@/components/sidebar";
import { getCurrentRole, requireAuthenticatedUser } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireAuthenticatedUser();
  const role = await getCurrentRole();

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar role={role} />
      <main className="min-h-screen lg:pl-56">{children}</main>
    </div>
  );
}
