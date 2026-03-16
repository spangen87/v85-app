"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

export interface Bet {
  id: string;
  user_id: string;
  author_name: string;
  group_id: string;
  game_id: string;
  race_number: number | null;
  horse_name: string | null;
  bet_type: string;
  stake: number;
  payout: number | null;
  created_at: string;
}

export interface BetStats {
  user_id: string;
  author_name: string;
  total_stake: number;
  total_payout: number;
  bet_count: number;
  roi: number;
}

export async function addBet(
  groupId: string,
  gameId: string,
  raceNumber: number | null,
  horseName: string | null,
  betType: string,
  stake: number
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ej inloggad" };

  const db = createServiceClient();
  const { error } = await db.from("bets").insert({
    user_id: user.id,
    group_id: groupId,
    game_id: gameId,
    race_number: raceNumber,
    horse_name: horseName,
    bet_type: betType,
    stake,
  });

  if (error) return { error: error.message };
  return {};
}

export async function updateBetPayout(
  betId: string,
  payout: number
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ej inloggad" };

  const db = createServiceClient();
  const { error } = await db
    .from("bets")
    .update({ payout })
    .eq("id", betId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return {};
}

export async function deleteBet(betId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ej inloggad" };

  const db = createServiceClient();
  const { error } = await db
    .from("bets")
    .delete()
    .eq("id", betId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return {};
}

export async function getGroupBets(
  groupId: string,
  gameId?: string
): Promise<Bet[]> {
  const db = createServiceClient();

  let query = db
    .from("bets")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (gameId) {
    query = query.eq("game_id", gameId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Hämta display names
  const userIds = [...new Set(data.map((b) => b.user_id as string))];
  const { data: profiles } = await db
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  const nameMap = new Map<string, string>();
  for (const p of profiles ?? []) nameMap.set(p.id, p.display_name ?? "Okänd");

  return data.map((b) => ({
    id: b.id as string,
    user_id: b.user_id as string,
    author_name: nameMap.get(b.user_id as string) ?? "Okänd",
    group_id: b.group_id as string,
    game_id: b.game_id as string,
    race_number: b.race_number as number | null,
    horse_name: b.horse_name as string | null,
    bet_type: b.bet_type as string,
    stake: b.stake as number,
    payout: b.payout as number | null,
    created_at: b.created_at as string,
  }));
}

export async function getGroupBetStats(groupId: string): Promise<BetStats[]> {
  const db = createServiceClient();

  const { data, error } = await db
    .from("bets")
    .select("user_id, stake, payout")
    .eq("group_id", groupId);

  if (error || !data || data.length === 0) return [];

  // Aggregera per user
  const map = new Map<string, { stake: number; payout: number; count: number }>();
  for (const b of data) {
    const uid = b.user_id as string;
    const entry = map.get(uid) ?? { stake: 0, payout: 0, count: 0 };
    entry.stake += (b.stake as number) || 0;
    entry.payout += (b.payout as number) || 0;
    entry.count += 1;
    map.set(uid, entry);
  }

  // Hämta display names
  const userIds = [...map.keys()];
  const { data: profiles } = await db
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  const nameMap = new Map<string, string>();
  for (const p of profiles ?? []) nameMap.set(p.id, p.display_name ?? "Okänd");

  return userIds.map((uid) => {
    const entry = map.get(uid)!;
    const roi = entry.stake > 0
      ? Math.round(((entry.payout - entry.stake) / entry.stake) * 1000) / 10
      : 0;
    return {
      user_id: uid,
      author_name: nameMap.get(uid) ?? "Okänd",
      total_stake: entry.stake,
      total_payout: entry.payout,
      bet_count: entry.count,
      roi,
    };
  });
}
