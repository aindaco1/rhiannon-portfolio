import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
export function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../../worker/migrations/0001_editor_sessions.sql", import.meta.url), "utf8"));
  const prepare = sql => {
    let values = [];
    return {
      bind(...args) { values = args; return this; },
      async first() { return sqlite.prepare(sql).get(...values) || null; },
      async run() { return sqlite.prepare(sql).run(...values); },
    };
  };
  let tail = Promise.resolve();
  return { sqlite, prepare, batch(items) {
    const run = async () => {
    sqlite.exec("BEGIN");
    try { const result = []; for (const item of items) result.push(await item.run()); sqlite.exec("COMMIT"); return result; }
    catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    };
    const result = tail.then(run, run); tail = result.catch(() => {}); return result;
  } };
}
