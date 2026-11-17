import {
  esc,
  rich,
  entryPath,
  termPath,
  renderBlocks,
  renderImage,
  BIO_PDF_PATH,
  bioBlocks,
} from "./content.mjs";
export function navigation(catalog, active = "") {
  const projects = catalog.entries.filter(
    (e) => e.kind === "project" && e.status === "published",
  );
  const link = (href, label, count, current) =>
    `<a href="${href}" ${current ? 'aria-current="page"' : ""}>${esc(label)} <sup>${count}</sup></a>`;
  return `<nav class="categories" aria-label="Disciplines">${link("/", "All work", projects.length, !active)}${catalog.categories
    .filter((t) => projects.some((e) => e.categories.includes(t.id)))
    .map((t) =>
      link(
        termPath("categories", t),
        t.label,
        projects.filter((e) => e.categories.includes(t.id)).length,
        active === t.id,
      ),
    )
    .join("")}</nav>`;
}
export const labels = (catalog, e, kind = "categories") =>
  catalog[kind].filter((t) => e[kind].includes(t.id));
export function cards(catalog, entries) {
  return `<div class="project-grid">${entries
    .map(
      (e, index) =>
        `<article class="project-card"><a href="${entryPath(e)}"><div class="card-image">${e.cover.src ? renderImage(e.cover, { lead: index < 3, sizes: "(max-width: 560px) 92vw, (max-width: 900px) 46vw, 31vw" }) : `<div class="card-note"><span>Writing</span><p>${esc(e.intro || e.title)}</p></div>`}<span class="card-arrow" aria-hidden="true">↗</span></div><div class="card-meta"><span>${labels(
          catalog,
          e,
        )
          .map((t) => esc(t.label))
          .join(
            " / ",
          )}</span><span>${e.year}</span></div><h2>${esc(e.title)}</h2></a></article>`,
    )
    .join("")}</div>`;
}
export function archive(
  catalog,
  { kind = "project", term = null, taxonomy = "categories" } = {},
) {
  const entries = catalog.entries.filter(
    (e) =>
      e.status === "published" &&
      (kind === "all" || e.kind === kind) &&
      (!term || e[taxonomy].includes(term.id)),
  );
  return `${kind !== "post" ? navigation(catalog, term?.id) : ""}<section class="archive"><div class="section-heading"><h1>${term ? esc(term.label) : kind === "post" ? "Writing" : "Selected work"}</h1><p>${String(entries.length).padStart(2, "0")} ${kind === "project" ? "projects" : "entries"}${catalog.demo ? " / Sample portfolio" : ""}</p></div>${cards(catalog, entries)}${!entries.length ? "<p>No entries here yet.</p>" : ""}</section>`;
}
export function project(catalog, e) {
  const others = catalog.entries.filter(
    (p) => p.id !== e.id && p.status === "published" && p.kind === "project",
  );
  const related = [
    ...others.filter((p) =>
      p.categories.some((id) => e.categories.includes(id)),
    ),
    ...others.filter(
      (p) => !p.categories.some((id) => e.categories.includes(id)),
    ),
  ].slice(0, 3);
  return `<article class="project"><a class="back-link" href="${e.kind === "post" ? "/writing/" : "/"}">← ${e.kind === "post" ? "Writing" : "All work"}</a><header class="project-heading"><p class="eyebrow">${labels(
    catalog,
    e,
  )
    .map((t) => `<a href="${termPath("categories", t)}">${esc(t.label)}</a>`)
    .join(
      " / ",
    )}${e.sample ? " <span>— Sample project</span>" : ""}</p><h1>${esc(e.title)}</h1><p class="project-intro">${esc(e.intro)}</p></header>${e.cover.src ? `<figure class="project-cover">${renderImage(e.cover, { lead: true, sizes: "92vw" })}${e.cover.caption ? `<figcaption>${esc(e.cover.caption)}</figcaption>` : ""}</figure>` : ""}<div class="project-story"><aside class="project-details"><dl><dt>${e.kind === "post" ? "Published" : "Year"}</dt><dd>${esc(e.kind === "post" ? e.date : e.year)}</dd><dt>Discipline</dt><dd>${labels(
    catalog,
    e,
  )
    .map((t) => `<a href="${termPath("categories", t)}">${esc(t.label)}</a>`)
    .join(
      "<br>",
    )}</dd>${e.role ? `<dt>${e.sample ? "Illustrative role" : "Role"}</dt><dd>${esc(e.role)}</dd>` : ""}${
    e.tags.length
      ? `<dt>Filed under</dt><dd class="tags">${labels(catalog, e, "tags")
          .map((t) => `<a href="${termPath("tags", t)}">${esc(t.label)}</a>`)
          .join("")}</dd>`
      : ""
  }</dl></aside><div class="project-body">${renderBlocks(e.blocks)}${e.credits ? `<section class="credits reading"><h2>${e.sample ? "About this sample" : "Credits"}</h2><p>${esc(e.credits)}</p></section>` : ""}</div></div></article>${related.length ? `<section class="related"><div class="section-heading"><h2>More work</h2><a href="/">View all ↗</a></div>${cards(catalog, related)}</section>` : ""}`;
}
export function bio(catalog) {
  const p = catalog.profile;
  return `<section class="about bio"><p class="eyebrow">Artist / Filmmaker</p><h1>Bio</h1><div class="about-body"><aside class="bio-summary" aria-label="Introduction and contact"><p class="about-lead">${esc(p.intro)}</p><p class="bio-download"><a href="${BIO_PDF_PATH}" download="R-Barela-Bio-and-Resume.pdf">Download bio & résumé <span>PDF ↓</span></a></p><section id="contact" class="contact"><h2>For projects and collaborations</h2>${p.email ? `<a class="contact-link" href="mailto:${esc(p.email)}">${esc(p.email)} ↗</a>` : `<a class="contact-link" href="${esc(p.instagram)}">Get in touch on Instagram ↗</a>`}<div class="social-links"><a href="${esc(p.instagram)}" target="_blank" rel="noopener noreferrer">Instagram ↗</a><a href="${esc(p.imdb)}" target="_blank" rel="noopener noreferrer">IMDb ↗</a></div></section></aside><div class="reading bio-reading">${renderBlocks(bioBlocks(p))}${p.portrait ? renderImage({ src: p.portrait, alt: `Portrait of ${p.name}` }) : ""}</div></div></section>`;
}
export function shell(
  catalog,
  {
    title,
    body,
    path = "/",
    description = catalog.profile.intro,
    preview = false,
    writingPage = path.startsWith("/writing/"),
  },
) {
  const p = catalog.profile;
  const canonical = p.url && !preview ? `${p.url}${path}` : "";
  const shareImage =
    catalog.entries.find((e) => entryPath(e) === path)?.cover ||
    (!writingPage
      ? catalog.entries.find((e) => e.status === "published")?.cover
      : null);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title === p.name ? title : `${title} — ${p.name}`)}</title><meta name="description" content="${esc(description)}">${catalog.demo || preview ? '<meta name="robots" content="noindex,nofollow">' : ""}${canonical ? `<link rel="canonical" href="${esc(canonical)}"><meta property="og:url" content="${esc(canonical)}">` : ""}<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website">${canonical && shareImage?.src ? `<meta property="og:image" content="${esc(p.url + shareImage.src)}"><meta property="og:image:alt" content="${esc(shareImage.alt)}">` : ""}<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/css/site.css">${preview ? "" : '<script src="/assets/js/site.js" defer></script>'}</head><body${writingPage ? ' class="page-writing"' : ""}><a class="skip-link" href="#main">Skip to content</a>${catalog.demo ? '<div class="sample-notice"><span>Preview edition</span> Sample projects & stock imagery — not R. Barela’s work.</div>' : ""}<header class="masthead"><div class="top-line"><a class="identity" href="/">${esc(p.name)}</a><nav aria-label="Main"><a href="/" ${path === "/" ? 'aria-current="page"' : ""}>Work</a><a href="/writing/" ${writingPage ? 'aria-current="page"' : ""}>Writing</a><a href="/bio/" ${path === "/bio/" ? 'aria-current="page"' : ""}>Bio</a></nav></div></header><main id="main">${body}</main><footer><a class="footer-name" href="/">${esc(p.name)}</a><p>Art / Makeup / Props / Sets / Film</p><div><a href="/bio/#contact">Get in touch ↗</a><a href="${esc(p.instagram)}">Instagram ↗</a><a href="${esc(p.imdb)}">IMDb ↗</a></div><small>${catalog.demo ? "Sample portfolio · Imagery: Pexels" : "© " + new Date().getFullYear() + " " + esc(p.name)}</small></footer></body></html>`;
}

export function writingEntries(catalog) {
  return catalog.entries
    .filter((e) => e.kind === "post" && e.status === "published")
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
const writtenDate = (date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date + "T12:00:00Z"));
export function readingTime(entry) {
  const words = entry.blocks
    .map((b) => b.body || b.text || "")
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}
function writingList(entries) {
  return `<div class="writing-list">${entries.map((e) => `<article class="writing-list-item"><p class="writing-date"><time datetime="${e.date}">${writtenDate(e.date)}</time><span>${readingTime(e)}</span></p><div><p class="eyebrow">${e.sample ? "Sample writing" : "Writing"}</p><h2><a href="${entryPath(e)}">${esc(e.title)} <span aria-hidden="true">↗</span></a></h2>${e.intro ? `<p class="writing-excerpt">${esc(e.intro)}</p>` : ""}</div></article>`).join("")}</div>`;
}
export function writingArchive(catalog) {
  const entries = writingEntries(catalog);
  return `<section class="writing-archive"><header class="writing-index-heading"><p class="eyebrow">A place for words</p><h1>Writing</h1><p>Notes, essays, and things in between.</p></header><div class="section-heading writing-section-heading"><h2>All writing</h2><p>${entries.length} ${entries.length === 1 ? "piece" : "pieces"}</p></div>${entries.length ? writingList(entries) : '<div class="writing-empty"><h2>A little space for a thought.</h2><p>New writing will appear here as it’s published.</p></div>'}</section>`;
}
export function writing(catalog, entry) {
  const topics = labels(catalog, entry),
    tags = labels(catalog, entry, "tags");
  const related = writingEntries(catalog)
    .filter((e) => e.id !== entry.id)
    .slice(0, 2);
  return `<article class="writing-article"><a class="back-link" href="/writing/">← All writing</a><div class="writing-article-grid"><header class="writing-heading"><p class="eyebrow"><span class="writing-label">Writing</span>${entry.sample ? " <span>Sample piece</span>" : ""}</p><h1>${esc(entry.title)}</h1>${entry.intro ? `<p class="writing-deck">${esc(entry.intro)}</p>` : ""}</header><aside class="writing-details" aria-label="About this writing"><dl><dt>${entry.sample ? "Text" : "Written by"}</dt><dd>${entry.sample ? "Demonstration copy" : esc(catalog.profile.name)}</dd><dt>Published</dt><dd><time datetime="${entry.date}">${writtenDate(entry.date)}</time></dd><dt>Reading time</dt><dd>${readingTime(entry)}</dd>${topics.length ? `<dt>Topics</dt><dd class="tags">${topics.map((t) => `<a href="${termPath("categories", t)}">${esc(t.label)}</a>`).join("")}</dd>` : ""}${tags.length ? `<dt>Filed under</dt><dd class="tags">${tags.map((t) => `<a href="${termPath("tags", t)}">${esc(t.label)}</a>`).join("")}</dd>` : ""}</dl></aside><div class="writing-body">${entry.cover.src ? `<figure class="writing-cover">${renderImage(entry.cover, { lead: true })}${entry.cover.caption ? `<figcaption>${esc(entry.cover.caption)}</figcaption>` : ""}</figure>` : ""}${renderBlocks(entry.blocks)}${entry.credits ? `<section class="credits reading"><h2>${entry.sample ? "About this sample" : "Notes"}</h2><p>${esc(entry.credits)}</p></section>` : ""}<p class="writing-end"><span aria-hidden="true">■</span> ${entry.sample ? "Sample text for layout review; not written by R. Barela." : esc(catalog.profile.name)}</p></div></div></article><section class="writing-more"><div class="section-heading writing-section-heading"><h2>${related.length ? "Keep reading" : "More writing"}</h2><a href="/writing/">All writing ↗</a></div>${related.length ? writingList(related) : "<p>More notes and essays will find a home here.</p>"}</section>`;
}
export const entryView = (catalog, entry) =>
  entry.kind === "post" ? writing(catalog, entry) : project(catalog, entry);
