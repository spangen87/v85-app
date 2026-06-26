/**
 * Delad laddningsgräns för alla skyddade sidor.
 *
 * Utan en loading.tsx blockerar Next.js hela vyväxlingen tills serverns
 * RSC-svar är klart — klick på en flik känns "fryst" under hela
 * datahämtningen. Med den här visas ett skelett omedelbart medan
 * navigeringen pågår, vilket ger en betydligt snabbare känsla.
 *
 * Navigeringen (TopNav/BottomNav) ligger i layouten och består, så bara
 * innehållsytan ersätts av skelettet.
 */
export default function Loading() {
  return (
    <main
      className="min-h-screen animate-pulse"
      style={{ background: "var(--tn-bg)", color: "var(--tn-text)" }}
      aria-busy="true"
      aria-label="Laddar"
    >
      {/* Header-platshållare */}
      <div
        className="sticky top-0 z-30 px-4 pt-3 pb-2"
        style={{ borderBottom: "1px solid var(--tn-border)" }}
      >
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 rounded" style={{ background: "var(--tn-border)" }} />
          <div className="h-7 w-7 rounded-full" style={{ background: "var(--tn-border)" }} />
        </div>
        <div className="mt-3 h-9 w-full rounded-lg" style={{ background: "var(--tn-border)" }} />
      </div>

      {/* Innehållsskelett: rader av kort */}
      <div className="px-4 lg:px-[5%] xl:px-[8%] py-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-20 w-full rounded-xl"
            style={{
              background: "var(--tn-bg-raised)",
              border: "1px solid var(--tn-border)",
            }}
          />
        ))}
      </div>
    </main>
  );
}
