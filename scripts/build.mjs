import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { build as bundle } from "esbuild";
import { minifyAssetSource } from "../shared/dust-wave-platform/packages/build-core/src/site-assets.js";
import {
  validateCatalog,
  publicCatalog,
  mediaReferences,
  entryPath,
  termPath,
  esc,
  BIO_PDF_PATH,
} from "../lib/content.mjs";
import {
  archive,
  entryView,
  writingArchive,
  bio,
  shell,
} from "../lib/views.mjs";
export async function buildSite(
  input,
  {
    output = "dist",
    source = ".build",
    production = false,
    mediaRoot = ".",
    revision = "local-preview",
    admin = true,
  } = {},
) {
  const catalog = publicCatalog(validateCatalog(input, { production }));
  await rm(source, { recursive: true, force: true });
  await mkdir(source, { recursive: true });
  await cp("_layouts", `${source}/_layouts`, { recursive: true });
  const metadata = new Map();
  for (const path of mediaReferences(catalog, true)) {
    const target = `${source}${path}`;
    await mkdir(dirname(target), { recursive: true });
    // Development uploads live outside source control; fixture images remain in assets/media.
    let buffer;
    try {
      buffer = await readFile(`${mediaRoot}${path}`);
    } catch {
      buffer = await readFile(`.${path}`);
    }
    const meta = await sharp(buffer, {
      limitInputPixels: 40_000_000,
    }).metadata();
    if (!["jpeg", "png", "webp"].includes(meta.format))
      throw new Error(`Unsupported image: ${path}`);
    await writeFile(target, buffer);
    const thumb = path.replace(/\.[a-z]+$/, "-800.webp");
    await sharp(buffer)
      .rotate()
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(`${source}${thumb}`);
    metadata.set(path, { ...meta, thumb });
  }
  const imageDimensions = (html) =>
    html.replace(/<img\b[^>]*>/g, (tag) => {
      const src = tag.match(/\bsrc="([^"]+)"/)?.[1],
        m = metadata.get(src);
      if (!m) return tag;
      return tag
        .replace(/width="\d+"/g, `width="${m.width}"`)
        .replace(/height="\d+"/g, `height="${m.height}"`)
        .replace(
          " decoding=",
          ` srcset="${m.thumb} ${Math.min(m.width, 800)}w${m.width > 800 ? `, ${src} ${m.width}w` : ""}" decoding=`,
        );
    });
  const paths = [];
  async function page(path, title, body, description) {
    const html = imageDimensions(
      shell(catalog, { title, body, path, description }),
    );
    const target = path.endsWith(".html")
      ? `${source}${path}`
      : `${source}${path}index.html`;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(
      target,
      `---\nlayout: default\nrendered: ${JSON.stringify(html)}\n---\n`,
    );
    paths.push(path);
  }
  await page("/", catalog.profile.name, archive(catalog));
  await page("/bio/", "Bio", bio(catalog));
  for (const e of catalog.entries)
    await page(entryPath(e), e.title, entryView(catalog, e), e.intro);
  for (const kind of ["categories", "tags"])
    for (const term of catalog[kind])
      if (catalog.entries.some((e) => e[kind].includes(term.id)))
        await page(
          termPath(kind, term),
          term.label,
          archive(catalog, { term, taxonomy: kind, kind: "all" }),
        );
  await page("/writing/", "Writing", writingArchive(catalog));
  // Keep previously shared URLs working without duplicating pages.
  async function redirect(from, to, label = "Writing") {
    const target = `${source}${from}index.html`;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(
      target,
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${esc(to)}"><title>${esc(label)} — ${esc(catalog.profile.name)}</title>${catalog.profile.url ? `<link rel="canonical" href="${esc(catalog.profile.url + to)}">` : ""}</head><body><p>This page has moved to <a href="${esc(to)}">${esc(label)}</a>.</p></body></html>`,
    );
  }
  await redirect("/journal/", "/writing/");
  await redirect("/about/", "/bio/", "Bio");
  for (const entry of catalog.entries.filter((e) => e.kind === "post"))
    await redirect(`/journal/${entry.slug}/`, entryPath(entry));
  await page(
    "/404.html",
    "Page not found",
    '<section class="about"><h1>Nothing here.<br>Yet.</h1><p class="project-intro"><a href="/">Return to all work ↗</a></p></section>',
  );
  for (const path of ["css/site.css", "js/site.js"]) {
    await mkdir(`${source}/assets/${dirname(path)}`, { recursive: true });
    await writeFile(
      `${source}/assets/${path}`,
      await minifyAssetSource(
        await readFile(`assets/${path}`, "utf8"),
        `assets/${path}`,
      ),
    );
  }
  await cp("assets/favicon.svg", `${source}/assets/favicon.svg`);
  await mkdir(dirname(`${source}${BIO_PDF_PATH}`), { recursive: true });
  await cp(`.${BIO_PDF_PATH}`, `${source}${BIO_PDF_PATH}`);
  await writeFile(
    `${source}/robots.txt`,
    catalog.demo
      ? "User-agent: *\nDisallow: /\n"
      : `User-agent: *\nAllow: /\nSitemap: ${catalog.profile.url}/sitemap.xml\n`,
  );
  if (catalog.profile.url && !catalog.demo)
    await writeFile(
      `${source}/sitemap.xml`,
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths
        .filter((p) => p != "/404.html")
        .map((p) => `<url><loc>${esc(catalog.profile.url + p)}</loc></url>`)
        .join("")}</urlset>`,
    );
  await writeFile(
    `${source}/release.json`,
    JSON.stringify({
      revision,
      catalogHash: createHash("sha256")
        .update(JSON.stringify(catalog))
        .digest("hex"),
      demo: catalog.demo,
    }),
  );
  execFileSync(
    "bundle",
    [
      "exec",
      "jekyll",
      "build",
      "--source",
      source,
      "--destination",
      output,
      "--config",
      "_config.yml",
    ],
    { stdio: "pipe", env: { ...process.env, JEKYLL_ENV: "production" } },
  );
  if (admin) await buildAdmin();
  console.log(
    `Built ${catalog.entries.length} entries, ${paths.length} pages → ${output}`,
  );
  return { paths, revision };
}
export async function buildAdmin() {
  await mkdir(".admin-build/assets/css", { recursive: true });
  await mkdir(".admin-build/assets/js", { recursive: true });
  await cp("admin/index.html", ".admin-build/index.html");
  await cp("admin/admin.css", ".admin-build/assets/css/admin.css");
  await cp("assets/css/site.css", ".admin-build/assets/css/site.css");
  await cp("assets/js/site.js", ".admin-build/assets/js/site.js");
  await cp("assets/favicon.svg", ".admin-build/assets/favicon.svg");
  await bundle({
    entryPoints: ["admin/admin.mjs"],
    outfile: ".admin-build/assets/js/admin.js",
    bundle: true,
    format: "esm",
    target: "es2022",
    minify: true,
  });
  await mkdir(".admin-build/assets/media", { recursive: true });
  // Do not copy any content media into the publicly deployable admin asset bundle.
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await import("./check-pin.mjs");
  const input = JSON.parse(await readFile("content/catalog.json", "utf8"));
  await buildSite(input, {
    production: process.argv.includes("--production"),
    revision: process.env.BUILD_SHA || "local-preview",
  });
}
