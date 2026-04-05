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

export async function getAllTrackConfigs(): Promise<TrackConfig[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("track_configs")
    .select("*")
    .order("track_name");
  if (error) return [];
  return (data ?? []) as TrackConfig[];
}

export async function upsertTrackConfig(
  config: Omit<TrackConfig, "updated_at">
): Promise<{ error?: string }> {
  const db = createServiceClient();
  const { error } = await db
    .from("track_configs")
    .upsert(
      {
        track_name: config.track_name,
        open_stretch: config.open_stretch,
        open_stretch_lanes: config.open_stretch_lanes,
        short_race_threshold: config.short_race_threshold,
        active: config.active,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "track_name" }
    );
  if (error) return { error: error.message };
  return {};
}
