import { hashCronToken, isAuthorizedCron, type CronTokenStore } from "../cronAuth";

function store(hashes: string[], fail = false): CronTokenStore {
  return {
    from: () => ({
      select: () => ({
        eq: (_c: string, value: string) => ({
          limit: async () => {
            if (fail) throw new Error("tabellen saknas");
            return { data: hashes.includes(value) ? [{ name: "pg_cron" }] : [] };
          },
        }),
      }),
    }),
  };
}

describe("isAuthorizedCron", () => {
  const old = process.env.CRON_SECRET;
  afterEach(() => { process.env.CRON_SECRET = old; });

  it("släpper in Vercels CRON_SECRET", async () => {
    process.env.CRON_SECRET = "vercel-hemlig";
    expect(await isAuthorizedCron("Bearer vercel-hemlig", store([]))).toBe(true);
    expect(await isAuthorizedCron("Bearer fel", store([]))).toBe(false);
  });

  it("släpper in databasens nyckel via dess hash, även utan CRON_SECRET", async () => {
    delete process.env.CRON_SECRET;
    const db = store([hashCronToken("db-nyckel")]);
    expect(await isAuthorizedCron("Bearer db-nyckel", db)).toBe(true);
    expect(await isAuthorizedCron("Bearer annan", db)).toBe(false);
  });

  it("nekar utan nyckel, med fel format och när tabellen saknas", async () => {
    delete process.env.CRON_SECRET;
    expect(await isAuthorizedCron(null, store([]))).toBe(false);
    expect(await isAuthorizedCron("Bearer ", store([hashCronToken("")]))).toBe(false);
    expect(await isAuthorizedCron("db-nyckel", store([hashCronToken("db-nyckel")]))).toBe(false);
    expect(await isAuthorizedCron("Bearer x", store([], true))).toBe(false);
  });
});
