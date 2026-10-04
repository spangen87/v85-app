"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { InlineField } from "./InlineField";
import { updateProfile } from "@/lib/actions/groups";

export function ProfileForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const { error } = await updateProfile(name);
    setLoading(false);
    if (error) setError(error);
    else setMessage("Sparat.");
  }

  return (
    <form onSubmit={handleSubmit}>
      <InlineField label="Visningsnamn" value={name} onChange={setName} placeholder="Ditt visningsnamn" maxLength={40}
        error={error} message={message ?? "Syns för de andra i dina sällskap."}
        button={<Button type="submit" disabled={loading || !name.trim()}>{loading ? "Sparar …" : "Spara"}</Button>} />
    </form>
  );
}
