import { redirect } from "next/navigation";
import { getAuthUser, isAdmin } from "@/lib/supabase/guards";
import { getAllTrackConfigs } from "@/lib/actions/tracks";
import { TrackConfigRow } from "@/components/admin/TrackConfigRow";

export default async function AdminPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.id)) redirect("/");

  const configs = await getAllTrackConfigs();

  return (
    <main className="px-4 py-5 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-bold mb-1" style={{ color: "var(--tn-text)" }}>
          Bankonfiguration
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--tn-text-faint)" }}>
          Redigera spårfaktorer per bana.
        </p>
      </div>

      {configs.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--tn-text-faint)" }}>
          Inga banor konfigurerade.
        </p>
      ) : (
        <div className="space-y-6">
          {configs.map((config) => (
            <TrackConfigRow key={config.track_name} initialConfig={config} />
          ))}
        </div>
      )}
    </main>
  );
}
