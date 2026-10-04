"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { InlineField } from "./InlineField";
import { joinGroup } from "@/lib/actions/groups";
import type { Group } from "@/lib/types";

export function JoinGroupForm({ onJoined }: { onJoined: (group: Group) => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await joinGroup(code);
    setLoading(false);
    if (error) { setError(error); }
    else if (data) { setCode(""); onJoined(data); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <InlineField label="Inbjudningskod" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="T.ex. AB12CD" maxLength={10} error={error}
        inputStyle={{ letterSpacing: "0.08em" }}
        button={<Button type="submit" disabled={loading || !code.trim()}>{loading ? "Går med …" : "Gå med"}</Button>} />
    </form>
  );
}
