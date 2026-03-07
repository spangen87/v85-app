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
    intro:
      "Dessa länkar går till samlingssidorna där de senaste tipsen alltid ligger överst.",
    links: [
      {
        href: "https://travstugan.se",
        label: "Travstugan – V75/V85 Tips",
        desc: "En av de mest heltäckande sidorna. Analyser från flera experter, ranking och färdiga systemförslag.",
      },
      {
        href: "https://minandel.se",
        label: "MinAndel – V85/V75 Tips",
        desc: "Tips och ranking specifikt under V85/V75-kategorin. Brukar ha \"sista minuten\"-tips och genomgångar av spikar och skrällar.",
      },
      {
        href: "https://travnet.se",
        label: "Travnet – V75 Analyser",
        desc: "Publicerar \"V75-panelen\" och \"Erlands Hörna\" varje vecka. Bra för djupgående statistik.",
      },
      {
        href: "https://rekatochklart.se",
        label: "Rekat och Klart – Trav",
        desc: "Bettingsida där experter (t.ex. DrTrav) lägger upp gratis rekningar och system inför lördagarna.",
      },
      {
        href: "https://trav.se",
        label: "Trav.se – Systemförslag",
        desc: "Erbjuder konkreta systemförslag och rankningar för varje avdelning.",
      },
    ],
  },
  {
    heading: "Tips från källan (ATG)",
    intro:
      "ATG själva har faktiskt några av de bästa gratistipsen om man vet var man ska leta:",
    links: [
      {
        href: "https://www.atg.se",
        label: "Björnkollen (ATG Play)",
        desc: "Stjärnkusken Björn Goops egna tankar. Sök på \"Björnkollen\" på ATG Play – publiceras oftast fredag kväll.",
      },
      {
        href: "https://www.atg.se",
        label: "Fem Tippar (ATG)",
        desc: "Fyra experter och en gästtippare gör varsitt system. Klassisk läsning inför lördagen.",
      },
    ],
  },
];

export function UsefulLinks() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">&#128270;</span>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">
            Nyttiga länktips
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Analyser, tips och systemförslag
          </span>
        </div>
        <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="px-5 py-4 space-y-6 bg-white dark:bg-gray-950">
          {LINK_GROUPS.map((group) => (
            <div key={group.heading}>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                {group.heading}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {group.intro}
              </p>
              <div className="space-y-2">
                {group.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition group"
                  >
                    <span className="text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0">
                      &#128279;
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 group-hover:underline">
                        {link.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                        {link.desc}
                      </p>
                    </div>
                    <span className="text-gray-400 dark:text-gray-600 text-xs shrink-0 mt-0.5">
                      ↗
                    </span>
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
