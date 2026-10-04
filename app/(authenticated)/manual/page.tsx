import fs from "fs";
import path from "path";
import { ManualContent } from "@/components/ManualContent";

// Byggs vid deploy — MANUAL.md läses en gång, inte vid varje besök
export const dynamic = "force-static";

export default function ManualPage() {
  const markdown = fs.readFileSync(path.join(process.cwd(), "MANUAL.md"), "utf8");
  return (
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <ManualContent markdown={markdown} />
      </div>
    </main>
  );
}
