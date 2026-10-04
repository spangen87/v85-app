import { readFileSync } from "fs";

// Sidorna som gjordes om i designgrund del 2 läser bara de nya tokens och har inga emojis
const FILES = [
  "app/(authenticated)/evaluation/page.tsx",
  "app/(authenticated)/system/page.tsx",
  "app/(authenticated)/sallskap/[groupId]/SallskapPageClient.tsx",
  "components/EvaluationPanel.tsx",
  "components/BulkResultsButton.tsx",
  "components/SystemsPageClient.tsx",
  "components/NotificationToggle.tsx",
  "components/groups/SallskapOverview.tsx",
  "components/groups/GroupList.tsx",
  "components/groups/CreateGroupForm.tsx",
  "components/groups/JoinGroupForm.tsx",
  "components/groups/ProfileForm.tsx",
  "components/sallskap/TabBar.tsx",
  "components/sallskap/forum/ForumTab.tsx",
  "components/sallskap/forum/PostForm.tsx",
  "components/sallskap/forum/PostItem.tsx",
  "components/sallskap/forum/PostList.tsx",
  "components/sallskap/notes/NotesTab.tsx",
  "components/sallskap/spel/SpelTab.tsx",
  "components/sallskap/spel/SystemCard.tsx",
  "components/sallskap/spel/LeagueTable.tsx",
  "components/sallskap/spel/BetsSection.tsx",
  "components/sallskap/admin/AdminTab.tsx",
  "components/sallskap/admin/GroupNameForm.tsx",
  "components/sallskap/admin/AtgTeamUrlForm.tsx",
  "components/sallskap/admin/InviteLinkSection.tsx",
  "components/sallskap/admin/MemberList.tsx",
];

describe.each(FILES)("%s", (file) => {
  const src = readFileSync(file, "utf8");
  it("inga gamla --tn-variabler", () => expect(src).not.toMatch(/var\(--tn-/));
  it("inga emojis eller bocktecken", () => expect(src).not.toMatch(/[\u{1F300}-\u{1FAFF}✓⎘]/u));
  it("inga trafikljusfärger med rgba", () => expect(src).not.toMatch(/rgba\(/));
});
