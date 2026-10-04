"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { InlineField } from "./InlineField";
import { createGroup } from "@/lib/actions/groups";
import type { Group } from "@/lib/types";

export function CreateGroupForm({ onCreated }: { onCreated: (group: Group) => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await createGroup(name);
    setLoading(false);
    if (error) { setError(error); }
    else if (data) { setName(""); onCreated(data); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <InlineField label="Nytt sällskap" value={name} onChange={setName} placeholder="Namn, t.ex. Lunchgänget" maxLength={50} error={error}
        button={<Button type="submit" disabled={loading || !name.trim()}>{loading ? "Skapar …" : "Skapa"}</Button>} />
    </form>
  );
}
