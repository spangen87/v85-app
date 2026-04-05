"use server";

import { createServiceClient } from "@/lib/supabase/server";
import type { TrackConfig } from "@/lib/types";

export async function getTrackConfig(
  trackName: string
): Promise<TrackConfig | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("track_configs")
    .select("*")
    .eq("track_name", trackName)
    .single();
  if (error) return null;
  return data as TrackConfig;
}
