import fs from "fs";
import path from "path";
import GithubSlugger from "github-slugger";
import { GLOSSARY, isTermId, manualHref, type TermId } from "../glossary";
import { SKRALL_THRESHOLDS } from "../skrall";
import { EDGE_THRESHOLDS } from "../edge";

const NB = " ";

/** Rubrik-id som rehype-slug ger dem (samma algoritm som GitHub). */
function manualSlugs(): Set<string> {
  const md = fs.readFileSync(path.join(__dirname, "../../MANUAL.md"), "utf8");
  const slugger = new GithubSlugger();
  const out = new Set<string>();
  let inFence = false;
  for (const line of md.split("\n")) {
    if (line.startsWith("```")) inFence = !inFence;
    if (inFence) continue;
    const m = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (m) out.add(slugger.slug(m[1]));
  }
  return out;
}

const IDS: TermId[] = ["chans", "streck", "odds", "varde", "grund", "cs", "skrall", "signal", "oense", "form", "spar"];

describe("GLOSSARY", () => {
  it("har titel och förklaring för varje term", () => {
    for (const id of IDS) {
      expect(GLOSSARY[id].title.length).toBeGreaterThan(0);
      expect(GLOSSARY[id].what.length).toBeGreaterThan(20);
    }
  });

  it("varje ankare finns som rubrik i MANUAL.md", () => {
    const slugs = manualSlugs();
    for (const id of IDS) expect({ id, ok: slugs.has(GLOSSARY[id].anchor) }).toEqual({ id, ok: true });
  });

  it("skrälltexten stämmer med trösklarna", () => {
    const how = GLOSSARY.skrall.how ?? "";
    expect(how).toContain(`${SKRALL_THRESHOLDS.maxStreck}${NB}%`);
    expect(how).toContain(`${SKRALL_THRESHOLDS.minEdge} procentenheter`);
    expect(how).toContain(`topp ${SKRALL_THRESHOLDS.maxClassRank}`);
  });

  it("signaltexten stämmer med trösklarna", () => {
    const text = `${GLOSSARY.signal.what} ${GLOSSARY.signal.how}`;
    expect(text).toContain(`+${EDGE_THRESHOLDS.minEdgeScore}`);
    expect(text).toContain(`${EDGE_THRESHOLDS.maxRestDays} dagar`);
  });

  it("isTermId och manualHref", () => {
    expect(isTermId("grund")).toBe(true);
    expect(isTermId("okänd")).toBe(false);
    expect(manualHref("varde")).toBe("/manual#värde");
  });
});
