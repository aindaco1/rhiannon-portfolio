import { readFile, writeFile, mkdir, rename, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  ContentError,
  validateCatalog,
  publicCatalog,
  mediaReferences,
} from "../lib/content.mjs";
import { buildSite } from "./build.mjs";
export const revision = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export async function createLocalStore(root = ".local") {
  root = resolve(root);
  await mkdir(root, { recursive: true });
  let state;
  try {
    state = JSON.parse(await readFile(`${root}/state.json`, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const seed = JSON.parse(
      await readFile(
        process.env.SEED_CATALOG || "content/catalog.json",
        "utf8",
      ),
    );
    state = { catalog: seed, published: seed };
  }
  let tail = Promise.resolve();
  const serialize = (callback) => {
    const next = tail.then(callback, callback);
    tail = next.catch(() => {});
    return next;
  };
  const persist = async (next) => {
    await writeFile(`${root}/state.tmp`, JSON.stringify(next), { mode: 0o600 });
    await rename(`${root}/state.tmp`, `${root}/state.json`);
    state = next;
  };
  const snapshot = () => ({
    catalog: structuredClone(state.catalog),
    revision: revision(state.catalog),
    publishedRevision: revision(state.published),
    mode: "local",
  });
  const check = (draft, published) => {
    if (
      draft !== revision(state.catalog) ||
      published !== revision(state.published)
    )
      throw new ContentError(
        "Another save changed this portfolio. Your edits are preserved. Download a recovery copy before reloading.",
        409,
      );
  };
  await buildSite(state.published, {
    output: `${root}/live`,
    source: `${root}/build`,
    mediaRoot: root,
    revision: revision(state.published),
  });
  await persist(state);
  return {
    root,
    load: async () => snapshot(),
    save: (catalog, draft, published) =>
      serialize(async () => {
        check(draft, published);
        validateCatalog(catalog, { previous: state.catalog });
        await persist({ ...state, catalog });
        return snapshot();
      }),
    upload: async (path, bytes) => {
      const target = `${root}${path}`;
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, bytes, { mode: 0o600 });
    },
    publish: (draft, published) =>
      serialize(async () => {
        check(draft, published);
        const candidate = publicCatalog(validateCatalog(state.catalog));
        const hash = revision(candidate);
        // Build first. Failures never switch the live pointer or change the saved draft.
        await buildSite(candidate, {
          output: `${root}/next`,
          source: `${root}/build-next`,
          mediaRoot: root,
          revision: hash,
          admin: false,
        });
        await rm(`${root}/previous`, { recursive: true, force: true });
        await rename(`${root}/live`, `${root}/previous`);
        try {
          await rename(`${root}/next`, `${root}/live`);
          await persist({ ...state, published: candidate });
        } catch (error) {
          await rm(`${root}/live`, { recursive: true, force: true });
          await rename(`${root}/previous`, `${root}/live`);
          throw error;
        }
        return {
          ...snapshot(),
          commit: hash,
          status: "live",
          url: "http://127.0.0.1:" + String(process.env.PORT || 4321),
        };
      }),
    status: async (hash) => ({
      status: hash === revision(state.published) ? "live" : "unknown",
      commit: hash,
    }),
  };
}
