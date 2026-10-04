"use client";

import { useState } from "react";
import { updateGroup } from "@/lib/actions/groups";
import { Button } from "@/components/ui";
import { InlineField } from "@/components/groups/InlineField";

interface GroupNameFormProps {
  groupId: string;
  initialName: string;
  onUpdated: (name: string) => void;
}

export function GroupNameForm({ groupId, initialName, onUpdated }: GroupNameFormProps) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const { error } = await updateGroup(groupId, { name: name.trim() });
    setLoading(false);
    if (error) { setError(error); }
    else { setMessage("Sparat."); onUpdated(name.trim()); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <InlineField label="Sällskapets namn" value={name} onChange={setName} maxLength={60} error={error} message={message}
        button={<Button type="submit" disabled={loading || !name.trim()}>{loading ? "Sparar …" : "Spara"}</Button>} />
    </form>
  );
}
