import { BottomNav } from "@/components/BottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pb-16 md:pb-0">
      {children}
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
