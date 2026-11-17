import { rm } from "node:fs/promises";
await rm(".local/browser-tests", { recursive: true, force: true });
process.env.SEED_CATALOG = "tests/fixtures/catalog.json";
process.env.DATA_DIR = ".local/browser-tests";
process.env.PORT = "4325";
process.env.ADMIN_PORT = "4326";
await import("./dev.mjs");
