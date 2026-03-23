import { BottomNav } from "@/components/BottomNav";
import { TopNav } from "@/components/TopNav";
import { InstallPrompt } from "@/components/InstallPrompt";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pb-16 md:pb-0">
      <TopNav />
      {children}
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
