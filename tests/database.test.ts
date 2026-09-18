import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { demoState } from "./fixtures/school";
import { ranking } from "../src/lib/engine";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    grant usage on schema public to anon,authenticated,service_role;`);
  for (const file of [
    "001_initial.sql",
    "002_ranking.sql",
    "003_profile_photos.sql",
    "004_scoring_criteria.sql",
  ])
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
}, 60000);
afterAll(async () => {
  await db?.close();
});
describe("PostgreSQL migration and access", () => {
  it("refuse direct client reads and writes", async () => {
    await db.exec("set role authenticated");
    await expect(db.query("select * from school_state")).rejects.toThrow(
      "permission denied",
    );
    await expect(
      db.query("update school_state set data='{}'::jsonb"),
    ).rejects.toThrow("permission denied");
    await db.exec("reset role");
  });
  it("commit exactly once for the same revision", async () => {
    await db.exec("set role service_role");
    const first = await db.query<{ ok: boolean }>(
      "select commit_school_state(0,(select data from school_state)) ok",
    );
    expect(first.rows[0].ok).toBe(true);
    const second = await db.query<{ ok: boolean }>(
      "select commit_school_state(0,(select data from school_state)) ok",
    );
    expect(second.rows[0].ok).toBe(false);
    await db.exec("reset role");
  });
  it("SQL ranking matches domain ranking, including ties and empty months", async () => {
    const state = demoState();
    const month = state.rules[0].month;
    for (const period of [month, "2099-01"]) {
      const sql = await db.query<{ rows: unknown[] }>(
        "select monthly_ranking($1::jsonb,$2) rows",
        [JSON.stringify(state), period],
      );
      const expected = ranking(state, period).sort((a, b) =>
        a.id.localeCompare(b.id),
      );
      const actual = (sql.rows[0].rows as { id: string }[]).sort((a, b) =>
        a.id.localeCompare(b.id),
      );
      expect(actual).toEqual(expected);
    }
  });
  it("rejects duplicate attendance atomically", async () => {
    const state = demoState();
    state.attendance.push({ ...state.attendance[0], id: "duplicate" });
    await expect(
      db.query("select commit_school_state(1,$1::jsonb)", [
        JSON.stringify(state),
      ]),
    ).rejects.toThrow("Duplicate attendance");
    const check = await db.query<{ revision: number }>(
      "select revision from school_state",
    );
    expect(Number(check.rows[0].revision)).toBe(1);
  });
  it("preserves legacy scoring and keeps profile photos private", async () => {
    const state = demoState();
    for (const rules of state.rules) {
      delete rules.criteria;
      rules.activity = 5;
      rules.skill = 5;
    }
    const result = await db.query<{ rows: { id: string }[] }>(
      "select monthly_ranking($1::jsonb,$2) rows",
      [JSON.stringify(state), state.rules[0].month],
    );
    expect(
      result.rows[0].rows.sort((a, b) => a.id.localeCompare(b.id)),
    ).toEqual(
      ranking(state, state.rules[0].month).sort((a, b) =>
        a.id.localeCompare(b.id),
      ),
    );
    const bucket = await db.query(
      "select public, file_size_limit, allowed_mime_types from storage.buckets where id='avatars'",
    );
    expect(bucket.rows[0]).toMatchObject({
      public: false,
      file_size_limit: 2097152,
      allowed_mime_types: ["image/jpeg"],
    });
  });
  it("rejects duplicate member numbers atomically", async () => {
    const state = demoState();
    state.members.push({ ...state.members[0], id: "duplicate" });
    await expect(
      db.query("select commit_school_state(1,$1::jsonb)", [
        JSON.stringify(state),
      ]),
    ).rejects.toThrow("Duplicate member number");
  });
});
