import { createHash } from "crypto";

/** Det som behövs av Supabase-klienten — gör funktionen testbar */
export interface CronTokenStore {
  from(table: "cron_tokens"): {
    select(columns: string): {
      eq(column: string, value: string): { limit(n: number): PromiseLike<{ data: unknown[] | null }> };
    };
  };
}

export function hashCronToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Får anropet köra ett schemalagt jobb? Två vägar in:
 *  - Vercel Cron skickar "Bearer <CRON_SECRET>" (miljövariabel).
 *  - Databasens jobb (pg_cron) skickar en egen nyckel som skapas i migration
 *    v17. Nyckeln ligger i Supabase Vault, och här jämförs bara dess
 *    SHA-256 mot tabellen cron_tokens. Den behöver alltså aldrig kopieras
 *    mellan Vercel och Supabase.
 */
export async function isAuthorizedCron(authorization: string | null, db: CronTokenStore): Promise<boolean> {
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return false;
  const secret = process.env.CRON_SECRET;
  if (secret && token === secret) return true;
  try {
    const { data } = await db.from("cron_tokens").select("name").eq("token_hash", hashCronToken(token)).limit(1);
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}
