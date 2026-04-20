"use client";

import { useState } from "react";

interface LinkItem {
  href: string;
  label: string;
  desc: string;
}

interface LinkGroup {
  heading: string;
  intro: string;
  links: LinkItem[];
}

const LINK_GROUPS: LinkGroup[] = [
  {
    heading: "Populära sidor för gratis travtips",
    intro: "Dessa länkar går till samlingssidorna där de senaste tipsen alltid ligger överst.",
    links: [
      { href: "https://travstugan.se", label: "Travstugan – V75/V85 Tips", desc: "En av de mest heltäckande sidorna. Analyser från flera experter, ranking och färdiga systemförslag." },
      { href: "https://minandel.se", label: "MinAndel – V85/V75 Tips", desc: "Tips och ranking specifikt under V85/V75-kategorin. Brukar ha \"sista minuten\"-tips och genomgångar av spikar och skrällar." },
      { href: "https://travnet.se", label: "Travnet – V75 Analyser", desc: "Publicerar \"V75-panelen\" och \"Erlands Hörna\" varje vecka. Bra för djupgående statistik." },
      { href: "https://rekatochklart.se", label: "Rekat och Klart – Trav", desc: "Bettingsida där experter (t.ex. DrTrav) lägger upp gratis rekningar och system inför lördagarna." },
      { href: "https://trav.se", label: "Trav.se – Systemförslag", desc: "Erbjuder konkreta systemförslag och rankningar för varje avdelning." },
      { href: "https://travcash.se", label: "Travcash – Tips & Analyser", desc: "Tips, analyser och systemförslag inför V75, V86 och V85. Bra genomgångar med fokus på spelvärde." },
    ],
  },
  {
    heading: "Tips från källan (ATG)",
    intro: "ATG själva har faktiskt några av de bästa gratistipsen om man vet var man ska leta:",
    links: [
      { href: "https://www.atg.se", label: "Björnkollen (ATG Play)", desc: "Stjärnkusken Björn Goops egna tankar. Sök på \"Björnkollen\" på ATG Play – publiceras oftast fredag kväll." },
      { href: "https://www.atg.se", label: "Fem Tippar (ATG)", desc: "Fyra experter och en gästtippare gör varsitt system. Klassisk läsning inför lördagen." },
    ],
  },
];

export function UsefulLinks() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--tn-border)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-left transition"
        style={{ background: "var(--tn-bg-card)", border: "none", cursor: "pointer" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--tn-bg-card-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--tn-bg-card)"; }}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm" style={{ color: "var(--tn-text)" }}>
            Nyttiga länktips
          </span>
          <span className="text-xs" style={{ color: "var(--tn-text-faint)" }}>
            Analyser, tips och systemförslag
          </span>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform duration-200 ml-2 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--tn-text-faint)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="px-5 py-4 space-y-6" style={{ background: "var(--tn-bg-raised)", borderTop: "1px solid var(--tn-border)" }}>
          {LINK_GROUPS.map((group) => (
            <div key={group.heading}>
              <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--tn-text)" }}>{group.heading}</h3>
              <p className="text-xs mb-3" style={{ color: "var(--tn-text-faint)" }}>{group.intro}</p>
              <div className="space-y-2">
                {group.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg transition group"
                    style={{ border: "1px solid var(--tn-border)", display: "flex" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--tn-accent-soft)";
                      e.currentTarget.style.background = "var(--tn-accent-faint)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--tn-border)";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span className="mt-0.5 shrink-0" style={{ color: "var(--tn-accent)" }}>&#128279;</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--tn-accent)" }}>{link.label}</p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--tn-text-faint)" }}>{link.desc}</p>
                    </div>
                    <span className="text-xs shrink-0 mt-0.5" style={{ color: "var(--tn-text-faint)" }}>↗</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
