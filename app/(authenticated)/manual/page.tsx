export default function ManualPage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--tn-bg)", color: "var(--tn-text)" }}>
      <header
        className="sticky top-0 z-30 px-4 py-3"
        style={{ background: "var(--tn-bg)", borderBottom: "1px solid var(--tn-border)" }}
      >
        <h1 className="text-lg font-bold">Användarmanual</h1>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-12">

        {/* TOC */}
        <nav
          className="rounded-xl p-6"
          style={{ background: "var(--tn-bg-card)", border: "1px solid var(--tn-border)" }}
        >
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--tn-text)" }}>Innehåll</h2>
          <ol className="space-y-1 text-sm list-decimal list-inside">
            <li><a href="#intro" className="hover:underline transition" style={{ color: "var(--tn-accent)" }}>Introduktion</a></li>
            <li><a href="#login" className="hover:underline transition" style={{ color: "var(--tn-accent)" }}>Komma igång – inloggning</a></li>
            <li><a href="#hamta" className="hover:underline transition" style={{ color: "var(--tn-accent)" }}>Hämta V85-omgång</a></li>
            <li><a href="#navigera" className="hover:underline transition" style={{ color: "var(--tn-accent)" }}>Navigera bland omgångar</a></li>
            <li><a href="#hastkort" className="hover:underline transition" style={{ color: "var(--tn-accent)" }}>Hästarnas informationskort</a></li>
            <li><a href="#analys" className="hover:underline transition" style={{ color: "var(--tn-accent)" }}>Analysverktyget</a></li>
            <li><a href="#grupper" className="hover:underline transition" style={{ color: "var(--tn-accent)" }}>Grupper och samarbete</a></li>
            <li><a href="#anteckningar" className="hover:underline transition" style={{ color: "var(--tn-accent)" }}>Anteckningar på hästar</a></li>
            <li><a href="#ordlista" className="hover:underline transition" style={{ color: "var(--tn-accent)" }}>Ordlista</a></li>
          </ol>
        </nav>

        {/* 1 Introduktion */}
        <section id="intro">
          <SectionHeading number="1" title="Introduktion" />
          <p className="leading-relaxed" style={{ color: "var(--tn-text-dim)" }}>
            <strong style={{ color: "var(--tn-text)" }}>V85 Analys</strong> är ett verktyg för dig som spelar V85 på ATG.
            Systemet hämtar aktuell tävlingsdata direkt från ATG, räknar ut sannolikheter baserat på
            form, odds och statistik, och låter dig dela anteckningar med dina spelvänner i en gemensam grupp.
          </p>
          <p className="leading-relaxed mt-3" style={{ color: "var(--tn-text-dim)" }}>
            Appen är byggd för att ge dig ett bättre beslutsunderlag – den ersätter inte din egen bedömning,
            men hjälper dig hitta hästar vars oddsvärde kan vara bättre än marknadens.
          </p>
        </section>

        {/* 2 Inloggning */}
        <section id="login">
          <SectionHeading number="2" title="Komma igång – inloggning" />
          <p className="leading-relaxed mb-4" style={{ color: "var(--tn-text-dim)" }}>
            Du möts av inloggningssidan om du inte redan är inloggad.
          </p>
          <Steps>
            <Step>Öppna appen i webbläsaren.</Step>
            <Step><strong style={{ color: "var(--tn-text)" }}>Ny användare?</strong> Ange din e-postadress och ett lösenord och klicka på <Kbd>Registrera</Kbd>.</Step>
            <Step><strong style={{ color: "var(--tn-text)" }}>Redan registrerad?</strong> Ange dina uppgifter och klicka på <Kbd>Logga in</Kbd>.</Step>
            <Step>Efter lyckad inloggning hamnar du på huvudsidan.</Step>
          </Steps>
          <Tip>Ditt visningsnamn kan ändras via din profil och syns för övriga medlemmar i dina grupper.</Tip>
        </section>

        {/* 3 Hämta */}
        <section id="hamta">
          <SectionHeading number="3" title="Hämta V85-omgång" />
          <p className="leading-relaxed mb-4" style={{ color: "var(--tn-text-dim)" }}>
            Innan du kan analysera en omgång måste du hämta data från ATG.
          </p>
          <Steps>
            <Step>Klicka på knappen <Kbd>Hämta V85</Kbd> högst upp på sidan.</Step>
            <Step>En datumväljare visas. Du kan välja datum upp till <strong style={{ color: "var(--tn-text)" }}>14 dagar bakåt eller framåt</strong> från dagens datum.</Step>
            <Step>Välj det datum då V85-omgången körs.</Step>
            <Step>Klicka på <Kbd>Hämta</Kbd> för att ladda ner alla lopp och hästar.</Step>
            <Step>Om hämtningen lyckas dyker omgången upp i listan omedelbart.</Step>
          </Steps>
          <Tip type="warning">Om ingen omgång finns för valt datum visas ett felmeddelande. Kontrollera att du valt rätt datum och att V85 körs den dagen.</Tip>
        </section>

        {/* 4 Navigera */}
        <section id="navigera">
          <SectionHeading number="4" title="Navigera bland omgångar" />
          <p className="leading-relaxed mb-4" style={{ color: "var(--tn-text-dim)" }}>
            På huvudsidan ser du alla hämtade omgångar.
          </p>
          <ul className="space-y-2 text-sm" style={{ color: "var(--tn-text-dim)" }}>
            <li className="flex gap-2"><span className="mt-0.5" style={{ color: "var(--tn-accent)" }}>▸</span>Välj omgång via <strong style={{ color: "var(--tn-text)" }}>rullgardinsmenyn</strong> längst upp.</li>
            <li className="flex gap-2"><span className="mt-0.5" style={{ color: "var(--tn-accent)" }}>▸</span>Omgångens <strong style={{ color: "var(--tn-text)" }}>åtta lopp</strong> visas under varandra.</li>
            <li className="flex gap-2"><span className="mt-0.5" style={{ color: "var(--tn-accent)" }}>▸</span>Klicka på ett lopp för att <strong style={{ color: "var(--tn-text)" }}>expandera</strong> det och se alla startande hästar.</li>
            <li className="flex gap-2"><span className="mt-0.5" style={{ color: "var(--tn-accent)" }}>▸</span>Klicka igen för att fälla ihop loppet.</li>
          </ul>
        </section>

        {/* 5 Hästkort */}
        <section id="hastkort">
          <SectionHeading number="5" title="Hästarnas informationskort" />
          <p className="leading-relaxed mb-4" style={{ color: "var(--tn-text-dim)" }}>
            När ett lopp är expanderat visas ett kort per häst. Varje kort innehåller:
          </p>
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--tn-border)" }}
            >
              <thead>
                <tr style={{ background: "var(--tn-bg-chip)", color: "var(--tn-text-dim)" }}>
                  <th className="text-left px-4 py-2 font-semibold">Fält</th>
                  <th className="text-left px-4 py-2 font-semibold">Förklaring</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Namn", "Hästens namn"],
                  ["Nr", "Startnummer"],
                  ["Förare", "Kusk/ryttare"],
                  ["Odds", "Aktuellt odds från ATG (uppdateras vid hämtning)"],
                  ["Formscore", "Sammansatt poäng 0–100 baserat på form, odds och tider"],
                  ["Ålder / Kön / Färg", "Grundfakta om hästen"],
                  ["Ras / Hemmaplan", "Härstamning och hemmaträning"],
                  ["Skosättning", "Ev. ändring av skor inför loppet"],
                  ["Sulky", "Typ av vagn som används"],
                  ["Karriärstatistik", "Totalt antal starter, vinster och bästa tid"],
                  ["Vinst % per år", "Vinstprocent för innevarande och föregående år"],
                  ["Senaste 5 lopp", "Placeringar: guld = 1:a, silver = 2:a, brons = 3:a"],
                ].map(([field, desc]) => (
                  <tr key={field} style={{ borderTop: "1px solid var(--tn-border)" }}>
                    <td className="px-4 py-2 font-medium whitespace-nowrap" style={{ color: "var(--tn-text)" }}>{field}</td>
                    <td className="px-4 py-2" style={{ color: "var(--tn-text-dim)" }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="font-semibold mt-6 mb-2" style={{ color: "var(--tn-text)" }}>Formscore – hur räknas det?</h3>
          <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--tn-text-dim)" }}>
            Formscoren är ett samlat mått (0–100) som väger ihop fyra faktorer:
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["40 %", "Form från senaste 5 loppen"],
              ["20 %", "Vinstprocent innevarande år"],
              ["20 %", "Oddsindex"],
              ["20 %", "Bästa tid relativt fältet"],
            ].map(([pct, label]) => (
              <div
                key={pct}
                className="rounded-lg p-3 text-center"
                style={{ background: "var(--tn-bg-card)", border: "1px solid var(--tn-border)" }}
              >
                <p className="font-bold text-lg" style={{ color: "var(--tn-accent)" }}>{pct}</p>
                <p className="text-xs mt-1" style={{ color: "var(--tn-text-faint)" }}>{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6 Analys */}
        <section id="analys">
          <SectionHeading number="6" title="Analysverktyget" />
          <p className="leading-relaxed mb-4" style={{ color: "var(--tn-text-dim)" }}>
            Klicka på <Kbd>Visa analys</Kbd> inuti ett lopp för att öppna analyspanelen. Du ser en tabell med alla hästar:
          </p>
          <div className="overflow-x-auto mb-6">
            <table
              className="w-full text-sm rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--tn-border)" }}
            >
              <thead>
                <tr style={{ background: "var(--tn-bg-chip)", color: "var(--tn-text-dim)" }}>
                  <th className="text-left px-4 py-2 font-semibold">Kolumn</th>
                  <th className="text-left px-4 py-2 font-semibold">Förklaring</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Häst", "Hästens namn och startnummer"],
                  ["Beräknad vinstchans", "Systemets estimerade sannolikhet att hästen vinner"],
                  ["Odds-impliserad chans", "Marknadens implicita sannolikhet (100 ÷ odds)"],
                  ["Differens", "Skillnaden mellan beräknad och odds-impliserad chans"],
                  ["Värde?", "Indikator om hästen verkar undervärderad av marknaden"],
                ].map(([col, desc]) => (
                  <tr key={col} style={{ borderTop: "1px solid var(--tn-border)" }}>
                    <td className="px-4 py-2 font-medium whitespace-nowrap" style={{ color: "var(--tn-text)" }}>{col}</td>
                    <td className="px-4 py-2" style={{ color: "var(--tn-text-dim)" }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="font-semibold mb-2" style={{ color: "var(--tn-text)" }}>Beräkningsformel</h3>
          <div
            className="rounded-xl p-4 tn-mono text-sm space-y-1"
            style={{ background: "var(--tn-bg-chip)", border: "1px solid var(--tn-border)", color: "var(--tn-text-dim)" }}
          >
            <p>Vinstchans =</p>
            <p className="pl-4">40% × karriärvinstprocent</p>
            <p className="pl-4">+ 40% × senaste form-procent</p>
            <p className="pl-4">+ 20% × odds-impliserad sannolikhet</p>
          </div>
          <p className="text-sm mt-2" style={{ color: "var(--tn-text-faint)" }}>
            Resultatet justeras med en <strong style={{ color: "var(--tn-text)" }}>distansfaktor</strong> baserad på hästens historiska prestation på aktuell distans och startmetod.
          </p>

          <h3 className="font-semibold mt-6 mb-2" style={{ color: "var(--tn-text)" }}>Tolka resultatet</h3>
          <div className="space-y-2">
            <div
              className="flex gap-3 items-start rounded-lg p-3 text-sm"
              style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}
            >
              <span className="font-bold shrink-0" style={{ color: "var(--tn-value-high)" }}>+</span>
              <p style={{ color: "var(--tn-text-dim)" }}><strong style={{ color: "var(--tn-text)" }}>Positiv differens</strong> – beräknad chans är högre än marknadens chans → hästen kan vara ett värdebet.</p>
            </div>
            <div
              className="flex gap-3 items-start rounded-lg p-3 text-sm"
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}
            >
              <span className="font-bold shrink-0" style={{ color: "var(--tn-value-low)" }}>–</span>
              <p style={{ color: "var(--tn-text-dim)" }}><strong style={{ color: "var(--tn-text)" }}>Negativ differens</strong> – hästen verkar övervärderad av marknaden.</p>
            </div>
          </div>
          <Tip>Analysen är ett komplement till din egen bedömning. Ta alltid hänsyn till faktorer som stallkänsla, tränarform och väder.</Tip>
        </section>

        {/* 7 Grupper */}
        <section id="grupper">
          <SectionHeading number="7" title="Grupper och samarbete" />
          <p className="leading-relaxed mb-6" style={{ color: "var(--tn-text-dim)" }}>
            Grupper låter dig och dina spelvänner dela anteckningar och analyser om enskilda hästar.
            Klicka på ditt användarnamn (avataren uppe till höger) för att hantera grupper.
          </p>

          <h3 className="font-semibold mb-2" style={{ color: "var(--tn-text)" }}>Skapa en grupp</h3>
          <Steps>
            <Step>Klicka på din avatar uppe till höger och välj <Kbd>Hantera sällskap</Kbd>.</Step>
            <Step>Välj <Kbd>Skapa ny grupp</Kbd> och ange ett namn.</Step>
            <Step>Klicka på <Kbd>Skapa</Kbd>. Du blir automatiskt gruppens admin.</Step>
            <Step>En unik <strong style={{ color: "var(--tn-text)" }}>inbjudningskod</strong> genereras – dela den med de du vill bjuda in.</Step>
          </Steps>

          <h3 className="font-semibold mt-6 mb-2" style={{ color: "var(--tn-text)" }}>Gå med i en grupp</h3>
          <Steps>
            <Step>Klicka på din avatar och välj <Kbd>Hantera sällskap</Kbd>.</Step>
            <Step>Välj <Kbd>Gå med i grupp</Kbd> och ange <strong style={{ color: "var(--tn-text)" }}>inbjudningskoden</strong> du fått.</Step>
            <Step>Klicka på <Kbd>Gå med</Kbd>. Du kan nu se och skriva anteckningar i gruppen.</Step>
          </Steps>

          <h3 className="font-semibold mt-6 mb-2" style={{ color: "var(--tn-text)" }}>Administrera din grupp (admin)</h3>
          <ul className="space-y-2 text-sm" style={{ color: "var(--tn-text-dim)" }}>
            <li className="flex gap-2"><span className="mt-0.5" style={{ color: "var(--tn-accent)" }}>▸</span>Se alla <strong style={{ color: "var(--tn-text)" }}>medlemmar</strong> i gruppen.</li>
            <li className="flex gap-2"><span className="mt-0.5" style={{ color: "var(--tn-accent)" }}>▸</span><strong style={{ color: "var(--tn-text)" }}>Ta bort medlemmar</strong> om det behövs.</li>
            <li className="flex gap-2"><span className="mt-0.5" style={{ color: "var(--tn-accent)" }}>▸</span>Se och dela den aktiva <strong style={{ color: "var(--tn-text)" }}>inbjudningskoden</strong>.</li>
          </ul>
        </section>

        {/* 8 Anteckningar */}
        <section id="anteckningar">
          <SectionHeading number="8" title="Anteckningar på hästar" />
          <p className="leading-relaxed mb-4" style={{ color: "var(--tn-text-dim)" }}>
            Anteckningar är kopplade till en specifik häst (inte ett lopp) och visas för alla i gruppen,
            oavsett vilket lopp hästen startar i.
          </p>

          <h3 className="font-semibold mb-2" style={{ color: "var(--tn-text)" }}>Skriva en anteckning</h3>
          <Steps>
            <Step>Öppna ett lopp och hitta hästen du vill kommentera.</Step>
            <Step>Klicka på <Kbd>Lägg till anteckning</Kbd> på hästkortet.</Step>
            <Step>Välj en <strong style={{ color: "var(--tn-text)" }}>etikett</strong> (färgkod) för att kategorisera din notering.</Step>
            <Step>Skriv din text och klicka på <Kbd>Spara</Kbd>.</Step>
          </Steps>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mt-4">
            {[
              { hex: "#22c55e", label: "Grön", desc: "Favorit / stark chans" },
              { hex: "#eab308", label: "Gul", desc: "Intressant / osäker" },
              { hex: "#ef4444", label: "Röd", desc: "Tveksam / stryk" },
              { hex: "#6b7280", label: "Grå", desc: "Neutral notering" },
            ].map(({ hex, label, desc }) => (
              <div
                key={label}
                className="rounded-lg p-3 flex items-start gap-2"
                style={{ background: "var(--tn-bg-card)", border: "1px solid var(--tn-border)" }}
              >
                <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ background: hex }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--tn-text)" }}>{label}</p>
                  <p className="text-xs" style={{ color: "var(--tn-text-faint)" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="font-semibold mt-6 mb-2" style={{ color: "var(--tn-text)" }}>Svara på en anteckning</h3>
          <p className="text-sm" style={{ color: "var(--tn-text-dim)" }}>
            Klicka på <Kbd>Svara</Kbd> under en befintlig anteckning för att skriva ett svar i tråden.
            Svar visas indragna under originalanteckningen.
          </p>

          <h3 className="font-semibold mt-6 mb-2" style={{ color: "var(--tn-text)" }}>Viktigt att veta</h3>
          <ul className="space-y-2 text-sm" style={{ color: "var(--tn-text-dim)" }}>
            <li className="flex gap-2"><span className="mt-0.5" style={{ color: "var(--tn-accent)" }}>▸</span>Anteckningar är synliga för <strong style={{ color: "var(--tn-text)" }}>alla i din grupp</strong>.</li>
            <li className="flex gap-2"><span className="mt-0.5" style={{ color: "var(--tn-accent)" }}>▸</span>En anteckning på en häst följer med om samma häst dyker upp i en annan omgång.</li>
            <li className="flex gap-2"><span className="mt-0.5" style={{ color: "var(--tn-accent)" }}>▸</span>Du kan bara redigera/ta bort dina <strong style={{ color: "var(--tn-text)" }}>egna</strong> anteckningar.</li>
          </ul>
        </section>

        {/* 9 Ordlista */}
        <section id="ordlista">
          <SectionHeading number="9" title="Ordlista" />
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--tn-border)" }}
            >
              <thead>
                <tr style={{ background: "var(--tn-bg-chip)", color: "var(--tn-text-dim)" }}>
                  <th className="text-left px-4 py-2 font-semibold">Term</th>
                  <th className="text-left px-4 py-2 font-semibold">Förklaring</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["V85", "Spelform på ATG där du ska pricka vinnaren i 8 lopp"],
                  ["ATG", "AB Trav och Galopp – den svenska speloperatören för travsport"],
                  ["Streckning / Odds", "ATG:s odds på hästen att vinna loppet"],
                  ["Formscore", "Systemets samlade formpoäng (0–100)"],
                  ["Värdebet", "En häst vars verkliga chanser bedöms vara högre än vad oddset indikerar"],
                  ["Voltstart", "Loppet startas bakom en bil, alla hästar startar på samma gång"],
                  ["Autostart", "Hästar startar från banden med individuella startnummer"],
                  ["Distansfaktor", "Justering baserad på hästens historiska prestation på aktuell distans"],
                  ["Inbjudningskod", "Unik kod för att gå med i en grupp"],
                  ["Admin", "Gruppens skapare med extra rättigheter att hantera medlemmar"],
                ].map(([term, desc]) => (
                  <tr key={term} style={{ borderTop: "1px solid var(--tn-border)" }}>
                    <td className="px-4 py-2 font-medium whitespace-nowrap" style={{ color: "var(--tn-text)" }}>{term}</td>
                    <td className="px-4 py-2" style={{ color: "var(--tn-text-dim)" }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p
          className="text-center text-xs pt-4"
          style={{ color: "var(--tn-text-faint)", borderTop: "1px solid var(--tn-border)" }}
        >
          Manual version 1.0 – Travappen
        </p>
      </div>
    </main>
  );
}

/* ── Hjälpkomponenter ────────────────────────────────────────── */

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ background: "var(--tn-accent)", color: "#fff" }}
      >
        {number}
      </span>
      <h2 className="text-xl font-bold" style={{ color: "var(--tn-text)" }}>{title}</h2>
    </div>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return (
    <ol className="space-y-2 text-sm list-decimal list-inside" style={{ color: "var(--tn-text-dim)" }}>
      {children}
    </ol>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  return <li className="leading-relaxed">{children}</li>;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="px-1.5 py-0.5 text-xs rounded tn-mono"
      style={{
        background: "var(--tn-bg-chip)",
        border: "1px solid var(--tn-border)",
        color: "var(--tn-text)",
      }}
    >
      {children}
    </kbd>
  );
}

function Tip({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" }) {
  const isWarning = type === "warning";
  return (
    <div
      className="mt-4 rounded-lg px-4 py-3 text-sm"
      style={{
        background: isWarning ? "rgba(251,191,36,0.08)" : "rgba(59,130,246,0.08)",
        border: isWarning ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(59,130,246,0.3)",
        color: isWarning ? "var(--tn-warn)" : "var(--tn-accent)",
      }}
    >
      <span className="font-semibold">{isWarning ? "OBS! " : "Tips: "}</span>
      <span style={{ color: "var(--tn-text-dim)" }}>{children}</span>
    </div>
  );
}
