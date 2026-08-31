/**
 * Minimal forward-only migration runner. Applies `db/*.sql` in filename order,
 * each in its own transaction, recording applied files in `schema_migrations`.
 * Re-running is safe: already-applied files are skipped.
 *
 *   npm run migrate         (local, via tsx)
 *   npm run migrate:prod    (compiled, for the deploy release step)
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";
import { config } from "../config";

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(config.DATABASE_URL);

const sql = postgres(config.DATABASE_URL, {
  ssl: isLocal ? false : "require",
  max: 1,
  onnotice: () => {},
});

async function main(): Promise<void> {
  const dir = join(process.cwd(), "db");

  await sql`
    create table if not exists schema_migrations (
      filename   text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const appliedRows = await sql<{ filename: string }[]>`select filename from schema_migrations`;
  const applied = new Set(appliedRows.map((r) => r.filename));

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip    ${file}`);
      continue;
    }
    const contents = await readFile(join(dir, file), "utf8");
    console.log(`apply   ${file}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(contents);
      await tx`insert into schema_migrations (filename) values (${file})`;
    });
    ran += 1;
  }

  console.log(ran === 0 ? "nothing to apply" : `applied ${ran} migration(s)`);
  await sql.end();
}

main().catch(async (err) => {
  console.error("migration failed:", err);
  await sql.end({ timeout: 5 });
  process.exit(1);
});
