import Link from "next/link";

export default function ManualPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition text-sm flex items-center gap-1"
        >
          ← Tillbaka
        </Link>
        <h1 className="text-xl font-bold">V85 Analys – Användarmanual</h1>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-12">

        {/* TOC */}
        <nav className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Innehåll</h2>
          <ol className="space-y-1 text-sm text-indigo-600 dark:text-indigo-400 list-decimal list-inside">
            <li><a href="#intro" className="hover:text-indigo-700 dark:hover:text-indigo-300 transition">Introduktion</a></li>
            <li><a href="#login" className="hover:text-indigo-700 dark:hover:text-indigo-300 transition">Komma igång – inloggning</a></li>
            <li><a href="#hamta" className="hover:text-indigo-700 dark:hover:text-indigo-300 transition">Hämta V85-omgång</a></li>
            <li><a href="#navigera" className="hover:text-indigo-700 dark:hover:text-indigo-300 transition">Navigera bland omgångar</a></li>
            <li><a href="#hastkort" className="hover:text-indigo-700 dark:hover:text-indigo-300 transition">Hästarnas informationskort</a></li>
            <li><a href="#analys" className="hover:text-indigo-700 dark:hover:text-indigo-300 transition">Analysverktyget</a></li>
            <li><a href="#grupper" className="hover:text-indigo-700 dark:hover:text-indigo-300 transition">Grupper och samarbete</a></li>
            <li><a href="#anteckningar" className="hover:text-indigo-700 dark:hover:text-indigo-300 transition">Anteckningar på hästar</a></li>
            <li><a href="#ordlista" className="hover:text-indigo-700 dark:hover:text-indigo-300 transition">Ordlista</a></li>
          </ol>
        </nav>

        {/* 1 Introduktion */}
        <section id="intro">
          <SectionHeading number="1" title="Introduktion" />
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            <strong className="text-gray-900 dark:text-white">V85 Analys</strong> är ett verktyg för dig som spelar V85 på ATG.
            Systemet hämtar aktuell tävlingsdata direkt från ATG, räknar ut sannolikheter baserat på
            form, odds och statistik, och låter dig dela anteckningar med dina spelvänner i en gemensam grupp.
          </p>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
            Appen är byggd för att ge dig ett bättre beslutsunderlag – den ersätter inte din egen bedömning,
            men hjälper dig hitta hästar vars oddsvärde kan vara bättre än marknadens.
          </p>
        </section>

        {/* 2 Inloggning */}
        <section id="login">
          <SectionHeading number="2" title="Komma igång – inloggning" />
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            Du möts av inloggningssidan om du inte redan är inloggad.
          </p>
          <Steps>
            <Step>Öppna appen i webbläsaren.</Step>
            <Step><strong className="text-gray-900 dark:text-white">Ny användare?</strong> Ange din e-postadress och ett lösenord och klicka på <Kbd>Registrera</Kbd>.</Step>
            <Step><strong className="text-gray-900 dark:text-white">Redan registrerad?</strong> Ange dina uppgifter och klicka på <Kbd>Logga in</Kbd>.</Step>
            <Step>Efter lyckad inloggning hamnar du på huvudsidan.</Step>
          </Steps>
          <Tip>Ditt visningsnamn kan ändras via din profil och syns för övriga medlemmar i dina grupper.</Tip>
        </section>

        {/* 3 Hämta */}
        <section id="hamta">
          <SectionHeading number="3" title="Hämta V85-omgång" />
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            Innan du kan analysera en omgång måste du hämta data från ATG.
          </p>
          <Steps>
            <Step>Klicka på knappen <Kbd>Hämta V85</Kbd> högst upp på sidan.</Step>
            <Step>En datumväljare visas. Du kan välja datum upp till <strong className="text-gray-900 dark:text-white">14 dagar bakåt eller framåt</strong> från dagens datum.</Step>
            <Step>Välj det datum då V85-omgången körs.</Step>
            <Step>Klicka på <Kbd>Hämta</Kbd> för att ladda ner alla lopp och hästar.</Step>
            <Step>Om hämtningen lyckas dyker omgången upp i listan omedelbart.</Step>
          </Steps>
          <Tip type="warning">Om ingen omgång finns för valt datum visas ett felmeddelande. Kontrollera att du valt rätt datum och att V85 körs den dagen.</Tip>
        </section>

        {/* 4 Navigera */}
        <section id="navigera">
          <SectionHeading number="4" title="Navigera bland omgångar" />
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            På huvudsidan ser du alla hämtade omgångar.
          </p>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
            <li className="flex gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5">▸</span>Välj omgång via <strong className="text-gray-900 dark:text-white">rullgardinsmenyn</strong> längst upp.</li>
            <li className="flex gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5">▸</span>Omgångens <strong className="text-gray-900 dark:text-white">åtta lopp</strong> visas under varandra.</li>
            <li className="flex gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5">▸</span>Klicka på ett lopp för att <strong className="text-gray-900 dark:text-white">expandera</strong> det och se alla startande hästar.</li>
            <li className="flex gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5">▸</span>Klicka igen för att fälla ihop loppet.</li>
          </ul>
        </section>

        {/* 5 Hästkort */}
        <section id="hastkort">
          <SectionHeading number="5" title="Hästarnas informationskort" />
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            När ett lopp är expanderat visas ett kort per häst. Varje kort innehåller:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  <th className="text-left px-4 py-2 font-semibold">Fält</th>
                  <th className="text-left px-4 py-2 font-semibold">Förklaring</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
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
                  <tr key={field} className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition">
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{field}</td>
                    <td className="px-4 py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-gray-900 dark:text-white font-semibold mt-6 mb-2">Formscore – hur räknas det?</h3>
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">
            Formscoren är ett samlat mått (0–100) som väger ihop fyra faktorer:
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["40 %", "Form från senaste 5 loppen"],
              ["20 %", "Vinstprocent innevarande år"],
              ["20 %", "Oddsindex"],
              ["20 %", "Bästa tid relativt fältet"],
            ].map(([pct, label]) => (
              <div key={pct} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-center">
                <p className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">{pct}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6 Analys */}
        <section id="analys">
          <SectionHeading number="6" title="Analysverktyget" />
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            Klicka på <Kbd>Visa analys</Kbd> inuti ett lopp för att öppna analyspanelen. Du ser en tabell med alla hästar:
          </p>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  <th className="text-left px-4 py-2 font-semibold">Kolumn</th>
                  <th className="text-left px-4 py-2 font-semibold">Förklaring</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {[
                  ["Häst", "Hästens namn och startnummer"],
                  ["Beräknad vinstchans", "Systemets estimerade sannolikhet att hästen vinner"],
                  ["Odds-impliserad chans", "Marknadens implicita sannolikhet (100 ÷ odds)"],
                  ["Differens", "Skillnaden mellan beräknad och odds-impliserad chans"],
                  ["Värde?", "Indikator om hästen verkar undervärderad av marknaden"],
                ].map(([col, desc]) => (
                  <tr key={col} className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition">
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{col}</td>
                    <td className="px-4 py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-gray-900 dark:text-white font-semibold mb-2">Beräkningsformel</h3>
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 font-mono text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <p>Vinstchans =</p>
            <p className="pl-4">40% × karriärvinstprocent</p>
            <p className="pl-4">+ 40% × senaste form-procent</p>
            <p className="pl-4">+ 20% × odds-impliserad sannolikhet</p>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            Resultatet justeras med en <strong className="text-gray-900 dark:text-white">distansfaktor</strong> baserad på hästens historiska prestation på aktuell distans och startmetod.
          </p>

          <h3 className="text-gray-900 dark:text-white font-semibold mt-6 mb-2">Tolka resultatet</h3>
          <div className="space-y-2">
            <div className="flex gap-3 items-start bg-green-950 border border-green-800 rounded-lg p-3 text-sm">
              <span className="text-green-400 font-bold shrink-0">+</span>
              <p className="text-green-200"><strong>Positiv differens</strong> – beräknad chans är högre än marknadens chans → hästen kan vara ett värdebet.</p>
            </div>
            <div className="flex gap-3 items-start bg-red-950 border border-red-800 rounded-lg p-3 text-sm">
              <span className="text-red-400 font-bold shrink-0">–</span>
              <p className="text-red-200"><strong>Negativ differens</strong> – hästen verkar övervärderad av marknaden.</p>
            </div>
          </div>
          <Tip>Analysen är ett komplement till din egen bedömning. Ta alltid hänsyn till faktorer som stallkänsla, tränarform och väder.</Tip>
        </section>

        {/* 7 Grupper */}
        <section id="grupper">
          <SectionHeading number="7" title="Grupper och samarbete" />
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            Grupper låter dig och dina spelvänner dela anteckningar och analyser om enskilda hästar.
            Klicka på ditt användarnamn (avataren uppe till höger) för att hantera grupper.
          </p>

          <h3 className="text-gray-900 dark:text-white font-semibold mb-2">Skapa en grupp</h3>
          <Steps>
            <Step>Klicka på din avatar uppe till höger och välj <Kbd>Hantera sällskap</Kbd>.</Step>
            <Step>Välj <Kbd>Skapa ny grupp</Kbd> och ange ett namn.</Step>
            <Step>Klicka på <Kbd>Skapa</Kbd>. Du blir automatiskt gruppens admin.</Step>
            <Step>En unik <strong className="text-gray-900 dark:text-white">inbjudningskod</strong> genereras – dela den med de du vill bjuda in.</Step>
          </Steps>

          <h3 className="text-gray-900 dark:text-white font-semibold mt-6 mb-2">Gå med i en grupp</h3>
          <Steps>
            <Step>Klicka på din avatar och välj <Kbd>Hantera sällskap</Kbd>.</Step>
            <Step>Välj <Kbd>Gå med i grupp</Kbd> och ange <strong className="text-gray-900 dark:text-white">inbjudningskoden</strong> du fått.</Step>
            <Step>Klicka på <Kbd>Gå med</Kbd>. Du kan nu se och skriva anteckningar i gruppen.</Step>
          </Steps>

          <h3 className="text-gray-900 dark:text-white font-semibold mt-6 mb-2">Administrera din grupp (admin)</h3>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
            <li className="flex gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5">▸</span>Se alla <strong className="text-gray-900 dark:text-white">medlemmar</strong> i gruppen.</li>
            <li className="flex gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5">▸</span><strong className="text-gray-900 dark:text-white">Ta bort medlemmar</strong> om det behövs.</li>
            <li className="flex gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5">▸</span>Se och dela den aktiva <strong className="text-gray-900 dark:text-white">inbjudningskoden</strong>.</li>
          </ul>
        </section>

        {/* 8 Anteckningar */}
        <section id="anteckningar">
          <SectionHeading number="8" title="Anteckningar på hästar" />
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            Anteckningar är kopplade till en specifik häst (inte ett lopp) och visas för alla i gruppen,
            oavsett vilket lopp hästen startar i.
          </p>

          <h3 className="text-gray-900 dark:text-white font-semibold mb-2">Skriva en anteckning</h3>
          <Steps>
            <Step>Öppna ett lopp och hitta hästen du vill kommentera.</Step>
            <Step>Klicka på <Kbd>Lägg till anteckning</Kbd> på hästkortet.</Step>
            <Step>Välj en <strong className="text-gray-900 dark:text-white">etikett</strong> (färgkod) för att kategorisera din notering.</Step>
            <Step>Skriv din text och klicka på <Kbd>Spara</Kbd>.</Step>
          </Steps>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mt-4">
            {[
              { color: "bg-green-500", label: "Grön", desc: "Favorit / stark chans" },
              { color: "bg-yellow-400", label: "Gul", desc: "Intressant / osäker" },
              { color: "bg-red-500", label: "Röd", desc: "Tveksam / stryk" },
              { color: "bg-gray-400", label: "Grå", desc: "Neutral notering" },
            ].map(({ color, label, desc }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex items-start gap-2">
                <span className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${color}`} />
                <div>
                  <p className="text-gray-900 dark:text-white text-sm font-medium">{label}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-gray-900 dark:text-white font-semibold mt-6 mb-2">Svara på en anteckning</h3>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            Klicka på <Kbd>Svara</Kbd> under en befintlig anteckning för att skriva ett svar i tråden.
            Svar visas indragna under originalanteckningen.
          </p>

          <h3 className="text-gray-900 dark:text-white font-semibold mt-6 mb-2">Viktigt att veta</h3>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
            <li className="flex gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5">▸</span>Anteckningar är synliga för <strong className="text-gray-900 dark:text-white">alla i din grupp</strong>.</li>
            <li className="flex gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5">▸</span>En anteckning på en häst följer med om samma häst dyker upp i en annan omgång.</li>
            <li className="flex gap-2"><span className="text-indigo-600 dark:text-indigo-400 mt-0.5">▸</span>Du kan bara redigera/ta bort dina <strong className="text-gray-900 dark:text-white">egna</strong> anteckningar.</li>
          </ul>
        </section>

        {/* 9 Ordlista */}
        <section id="ordlista">
          <SectionHeading number="9" title="Ordlista" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  <th className="text-left px-4 py-2 font-semibold">Term</th>
                  <th className="text-left px-4 py-2 font-semibold">Förklaring</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
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
                  <tr key={term} className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition">
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{term}</td>
                    <td className="px-4 py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-center text-gray-500 dark:text-gray-600 text-xs pt-4 border-t border-gray-200 dark:border-gray-800">
          Manual version 1.0 – V85 Analys
        </p>
      </div>
    </main>
  );
}

/* ── Hjälpkomponenter ────────────────────────────────────────── */

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-sm font-bold shrink-0">
        {number}
      </span>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
    </div>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-decimal list-inside">{children}</ol>;
}

function Step({ children }: { children: React.ReactNode }) {
  return <li className="leading-relaxed">{children}</li>;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-800 dark:text-gray-200 font-mono">
      {children}
    </kbd>
  );
}

function Tip({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" }) {
  const styles =
    type === "warning"
      ? "bg-yellow-950 border-yellow-800 text-yellow-200"
      : "bg-indigo-950 border-indigo-800 text-indigo-200";
  return (
    <div className={`mt-4 border rounded-lg px-4 py-3 text-sm ${styles}`}>
      <span className="font-semibold">{type === "warning" ? "OBS! " : "Tips: "}</span>
      {children}
    </div>
  );
}
