/**
 * One-shot Log seed. Replaces ALL rows in `log_entries` with the canonical
 * launch set, newest first.
 *
 *   npm run seed
 *
 * Destructive on purpose: it truncates the table first so the feed matches the
 * intended content exactly. Re-run any time. `image_url` is left blank — the
 * frontend renders its hatch placeholder until a real image is uploaded via
 * /admin/log.
 */
import postgres from "postgres";
import { config } from "../config";

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(config.DATABASE_URL);

const sql = postgres(config.DATABASE_URL, {
  ssl: isLocal ? false : "require",
  max: 1,
  onnotice: () => {},
});

interface SeedEntry {
  title: string;
  description: string;
  date: string;
}

const entries: SeedEntry[] = [
  {
    title: "Probability breakdown shipped to the classifier UI",
    description:
      "Replaced the single-label result with the full ten-class distribution and moved the " +
      "runner-up probability into the primary result. Uncertain predictions now look uncertain.",
    date: "2026-08-24",
  },
  {
    title: "Retrieval budget capped in Research-Agent",
    description:
      "Swapped open-ended tool looping for a fixed number of retrieval rounds plus a " +
      "claim-verification pass. Cost per run became predictable; unsupported sentences get " +
      "dropped instead of published.",
    date: "2026-08-05",
  },
  {
    title: "Out-of-domain audit on the classifier",
    description:
      "Fed it 200 images from outside the ten classes to see what it would claim. It answered " +
      "confidently on many of them — the finding that pushed calibration onto the roadmap and " +
      "the caveat onto the project page.",
    date: "2026-07-18",
  },
  {
    title: "Inference moved to ONNX Runtime",
    description:
      "Exported the trained model and served it through ONNX Runtime to cut CPU latency and " +
      "drop the Torch dependency from the production image. Verified parity on the full test " +
      "set before switching over.",
    date: "2026-06-29",
  },
  {
    title: "Ai-image-classifier deployed",
    description:
      "First public version live: PyTorch model behind FastAPI, Next.js client, containerised. " +
      "78.2% accuracy and macro F1 0.78 on the held-out set, published on day one rather than " +
      "after tuning the story.",
    date: "2026-05-11",
  },
];

async function main(): Promise<void> {
  await sql`truncate table log_entries`;

  for (const entry of entries) {
    await sql`
      insert into log_entries (title, description, date, image_url, tags)
      values (${entry.title}, ${entry.description}, ${entry.date}::date, '', '{}')
    `;
  }

  console.log(`seeded ${entries.length} log entries`);
  await sql.end();
}

main().catch(async (err) => {
  console.error("seed failed:", err);
  await sql.end({ timeout: 5 });
  process.exit(1);
});
