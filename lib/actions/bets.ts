"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser, isGroupMember } from "@/lib/supabase/guards";
import { getRowPrice } from "@/lib/atg";

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
  /** Kopplat system (om insatsen registrerades från ett systemkort) */
  system_id: string | null;
  system_name: string | null;
  system_score: number | null;
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
  const user = await getAuthUser();
  if (!user) return { error: "Ej inloggad" };
  if (!(await isGroupMember(user.id, groupId))) {
    return { error: "Du är inte medlem i detta sällskap" };
  }

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

/**
 * Registrerar en insats direkt från ett sparat system: insatsen (rader ×
 * radpris) fylls i automatiskt och kopplas till systemet. Idempotent — samma
 * användare kan inte logga samma system två gånger. Endast sällskapssystem
 * (group_id satt, ej utkast) kan loggas.
 */
export async function addBetFromSystem(
  systemId: string
): Promise<{ error?: string; alreadyLogged?: boolean }> {
  const user = await getAuthUser();
  if (!user) return { error: "Ej inloggad" };

  const db = createServiceClient();
  const { data: system } = await db
    .from("game_systems")
    .select("id, group_id, game_id, total_rows, is_draft, games(game_type)")
    .eq("id", systemId)
    .single();

  if (!system) return { error: "Systemet hittades inte" };
  if (system.is_draft || !system.group_id) {
    return { error: "Bara sparade sällskapssystem kan registreras som spel" };
  }
  if (!(await isGroupMember(user.id, system.group_id as string))) {
    return { error: "Du är inte medlem i detta sällskap" };
  }

  // Idempotent: redan loggat av denna användare?
  const { data: existing } = await db
    .from("bets")
    .select("id")
    .eq("user_id", user.id)
    .eq("system_id", systemId)
    .maybeSingle();
  if (existing) return { alreadyLogged: true };

  const gameRel = system.games as unknown as { game_type: string } | { game_type: string }[] | null;
  const gameType =
    (Array.isArray(gameRel) ? gameRel[0]?.game_type : gameRel?.game_type) ?? "V85";
  const stake = Math.round((system.total_rows as number) * getRowPrice(gameType));

  const { error } = await db.from("bets").insert({
    user_id: user.id,
    group_id: system.group_id,
    game_id: system.game_id,
    bet_type: gameType,
    stake,
    system_id: systemId,
  });

  if (error) return { error: error.message };
  return {};
}

/** System-id som den inloggade användaren redan registrerat insats för i sällskapet. */
export async function getMyLoggedSystemIds(groupId: string): Promise<string[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const db = createServiceClient();
  const { data } = await db
    .from("bets")
    .select("system_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .not("system_id", "is", null);

  return (data ?? []).map((b) => b.system_id as string);
}

export async function updateBetPayout(
  betId: string,
  payout: number
): Promise<{ error?: string }> {
  const user = await getAuthUser();
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
  const user = await getAuthUser();
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
  const user = await getAuthUser();
  if (!user || !(await isGroupMember(user.id, groupId))) return [];

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

  // Hämta namn/score för kopplade system
  const systemIds = [...new Set(data.map((b) => b.system_id as string | null).filter((id): id is string => id != null))];
  const systemMap = new Map<string, { name: string; score: number | null }>();
  if (systemIds.length > 0) {
    const { data: systems } = await db
      .from("game_systems")
      .select("id, name, score")
      .in("id", systemIds);
    for (const s of systems ?? []) {
      systemMap.set(s.id as string, { name: s.name as string, score: s.score as number | null });
    }
  }

  return data.map((b) => {
    const sys = b.system_id ? systemMap.get(b.system_id as string) : undefined;
    return {
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
      system_id: (b.system_id as string | null) ?? null,
      system_name: sys?.name ?? null,
      system_score: sys?.score ?? null,
    };
  });
}

export async function getGroupBetStats(groupId: string): Promise<BetStats[]> {
  const user = await getAuthUser();
  if (!user || !(await isGroupMember(user.id, groupId))) return [];

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
