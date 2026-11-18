import { createBlockModel } from "../shared/dust-wave-platform/packages/admin-shell/src/block-editor.js";
import {
  escapeEditorAttribute,
  markdownToEditorHtml,
  RICH_TEXT_POLICY,
} from "../shared/dust-wave-platform/packages/admin-shell/src/editor-codec.js";

export const TYPES = ["text", "quote", "image", "gallery", "video", "divider"];
export const blockModel = createBlockModel({
  getTypes: () => TYPES,
  getVideoProviders: () => ["youtube", "vimeo", "local"],
  clearDecorativeAlt: true,
});
export const esc = (value) => escapeEditorAttribute(String(value ?? ""));
export const rich = (value) =>
  markdownToEditorHtml(String(value || ""), RICH_TEXT_POLICY);
// Catalog validation normalizes years and ranges. Stable sorting keeps the
// editor's chosen order for projects with the same starting year.
export const compareProjectYears = (a, b) =>
  Number.parseInt(b.year, 10) - Number.parseInt(a.year, 10);
export const slugify = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
export class ContentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const requireThat = (condition, message) => {
  if (!condition) throw new ContentError(message);
};
const text = (value, label, max = 200, required = false) => {
  requireThat(
    typeof value === "string" &&
      value.length <= max &&
      (!required || value.trim()),
    `${label} must be ${required ? "nonempty and " : ""}at most ${max} characters.`,
  );
  return value;
};
export const isMediaPath = (value) =>
  /^\/assets\/media\/[a-z0-9][a-z0-9-]*\.(jpg|jpeg|png|webp)$/.test(value);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
export const VIDEO_SIZE_MESSAGE = `Prepare an MP4 no larger than ${MAX_VIDEO_BYTES / (1024 * 1024)} MB.`;
export const isVideoPath = (value) =>
  typeof value === "string" && /^\/assets\/videos\/[a-f0-9]{64}\.mp4$/.test(value);
export function validateMp4(bytes) {
  if (bytes.length > MAX_VIDEO_BYTES)
    throw new ContentError(VIDEO_SIZE_MESSAGE, 413);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder(), boxes = new Set();
  let offset = 0;
  while (offset + 8 <= bytes.length) {
    const size = view.getUint32(offset);
    const type = decoder.decode(bytes.subarray(offset + 4, offset + 8));
    requireThat(size >= 8 && offset + size <= bytes.length, "Choose a complete MP4 file.");
    if (offset === 0)
      requireThat(type === "ftyp" && size >= 16 &&
        /^(isom|iso[2-9]|mp4[12]|avc1)$/.test(decoder.decode(bytes.subarray(8, 12))),
      "Choose a web-ready MP4 file (H.264 video with optional AAC audio).");
    boxes.add(type);
    offset += size;
  }
  requireThat(offset === bytes.length && boxes.has("ftyp") && boxes.has("moov") && boxes.has("mdat"),
    "Choose a complete MP4 file.");
}
export const MAX_PDF_BYTES = 5 * 1024 * 1024;
export const PDF_DOWNLOAD_HEADERS = {
  "content-type": "application/pdf",
  "content-disposition": 'attachment; filename="R-Barela-Bio-and-Resume.pdf"',
};
export const isPdfPath = (value) =>
  typeof value === "string" &&
  (value === BIO_PDF_PATH || /^\/assets\/documents\/[a-f0-9]{64}\.pdf$/.test(value));
export const bioPdf = (profile) =>
  profile.bioPdf ?? { src: BIO_PDF_PATH, name: "R-Barela-Bio-and-Resume.pdf" };
export function validatePdf(bytes) {
  if (bytes.length > MAX_PDF_BYTES)
    throw new ContentError("Choose a PDF no larger than 5 MB.", 413);
  const decoder = new TextDecoder();
  requireThat(
    /^%PDF-\d\.\d[\r\n]/.test(decoder.decode(bytes.slice(0, 10))) &&
      /%%EOF\s*$/.test(decoder.decode(bytes.slice(-1024))),
    "Choose a complete PDF file. Export the document as PDF and try again.",
  );
}
export function parseVideo(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ContentError("Use a complete YouTube or Vimeo URL.");
  }
  requireThat(
    url.protocol === "https:" && !url.username && !url.password && !url.port,
    "Use a secure YouTube or Vimeo URL.",
  );
  const host = url.hostname.replace(/^(?:www|m)\./, "");
  const id =
    host === "youtu.be"
      ? url.pathname.slice(1)
      : host === "youtube.com"
        ? url.searchParams.get("v") ||
          url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1]
        : null;
  if (id && /^[\w-]{11}$/.test(id))
    return { provider: "youtube", video_id: id };
  if (host === "vimeo.com") {
    const match = url.pathname.match(
      /^\/(\d{6,12})(?:\/([a-f0-9]{6,32}))?\/?$/,
    );
    const hash = match?.[2] || url.searchParams.get("h");
    if (match && (!hash || /^[a-f0-9]{6,32}$/.test(hash)))
      return {
        provider: "vimeo",
        video_id: match[1],
        ...(hash ? { src: `https://vimeo.com/${match[1]}/${hash}` } : {}),
      };
  }
  throw new ContentError(
    "Use a YouTube watch/share URL or a Vimeo video link.",
  );
}
export const videoUrl = (b) =>
  b.provider === "vimeo"
    ? b.src || `https://vimeo.com/${b.video_id}`
    : `https://www.youtube.com/watch?v=${b.video_id}`;
export const bioBlocks = (profile) =>
  typeof profile.bio === "string"
    ? [{ type: "text", body: profile.bio, align: "left" }]
    : profile.bio;
const contentEntries = (catalog, publishedOnly) => [
  { blocks: bioBlocks(catalog.profile) },
  ...catalog.entries.filter((e) => !publishedOnly || e.status === "published"),
];
export function videoReferences(catalog, publishedOnly = false) {
  return [...new Set(contentEntries(catalog, publishedOnly).flatMap((entry) =>
    entry.blocks.filter((b) => b.type === "video" && b.provider === "local" && b.src).map((b) => b.src)))];
}
export function mediaReferences(catalog, publishedOnly = false) {
  const paths = new Set();
  const add = (value) => {
    if (value) paths.add(value);
  };
  add(catalog.profile.portrait);
  for (const entry of contentEntries(catalog, publishedOnly)) {
    add(entry.cover?.src);
    for (const block of entry.blocks) {
      if (block.type === "image") add(block.src);
      if (block.type === "gallery") block.images.forEach((i) => add(i.src));
      if (block.type === "video") add(block.poster);
    }
  }
  return [...paths];
}
export function publicCatalog(catalog) {
  return {
    ...catalog,
    entries: catalog.entries.filter((e) => e.status === "published"),
  };
}
function validateImage(img, required = false, title = "Image") {
  requireThat(img && typeof img === "object", "Image details are required.");
  text(img.src, "Image path", 200);
  text(img.alt, "Image description", 600);
  text(img.caption ?? "", "Caption", 1000);
  requireThat(
    !img.src || isMediaPath(img.src),
    "Images must be uploaded JPG, PNG or WebP files.",
  );
  requireThat(!required || !!img.src, `${title} needs a cover image.`);
  requireThat(
    !img.src || img.decorative === true || !!img.alt.trim(),
    "Describe each image, or mark it decorative.",
  );
}
function normalizeBlocks(blocks) {
  requireThat(
    Array.isArray(blocks) && blocks.length <= 100,
    "At most 100 blocks are supported.",
  );
  return blocks.map((block) => {
    requireThat(TYPES.includes(block?.type), "Unsupported content block.");
    if (block.type === "video")
      requireThat(
        ["youtube", "vimeo", "local"].includes(block.provider),
        "Choose YouTube, Vimeo or an uploaded MP4.",
      );
    const b = blockModel.normalize(block);
    for (const [key, value] of Object.entries(b))
      if (typeof value === "string")
        text(value, key, key === "body" || key === "text" ? 20000 : 1000);
    if (b.type === "image") validateImage(b);
    if (b.type === "gallery") {
      requireThat(
        b.images.length <= 30,
        "At most 30 gallery images are supported.",
      );
      b.images.forEach((i) => validateImage(i));
    }
    if (b.type === "video") {
      requireThat(
        !b.video_id || b.provider === "local" ||
          (b.provider === "youtube" ? /^[\w-]{11}$/ : /^\d{6,12}$/).test(
            b.video_id,
          ),
        "Invalid video ID.",
      );
      requireThat(
        !b.poster || isMediaPath(b.poster),
        "Choose an uploaded video poster.",
      );
      if (b.provider === "local") {
        requireThat(!b.src || isVideoPath(b.src), "Choose an uploaded MP4 video.");
        b.video_id = "";
      } else if (b.src) {
        const parsed = parseVideo(b.src);
        requireThat(
          parsed.provider === b.provider && parsed.video_id === b.video_id,
          "Video URL and ID must match.",
        );
        b.src = parsed.src || "";
      }
    }
    return b;
  });
}
export function validateCatalog(input, { previous, production = false } = {}) {
  requireThat(input?.schemaVersion === 1, "Unsupported content version.");
  const data = structuredClone(input);
  requireThat(
    typeof data.demo === "boolean",
    "Sample-content status is required.",
  );
  if (production)
    requireThat(
      data.demo === false,
      "Production is blocked while sample content is enabled.",
    );
  const p = data.profile;
  requireThat(p && typeof p === "object", "Profile is required.");
  for (const [field, max, required] of [
    ["name", 100, true],
    ["intro", 300, true],
    ["email", 200, false],
    ["instagram", 300, true],
    ["imdb", 300, true],
    ["url", 300, false],
    ["portrait", 200, false],
  ])
    text(p[field], field, max, required);
  if (typeof p.bio === "string") text(p.bio, "bio", 6000, true);
  else p.bio = normalizeBlocks(p.bio);
  if (p.bioPdf !== undefined) {
    requireThat(p.bioPdf && typeof p.bioPdf === "object", "PDF details are required.");
    requireThat(isPdfPath(p.bioPdf.src), "Choose an uploaded bio and résumé PDF.");
    text(p.bioPdf.name, "PDF filename", 200, true);
    p.bioPdf = { src: p.bioPdf.src, name: p.bioPdf.name };
  }
  requireThat(
    !p.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email),
    "Enter a valid public contact email.",
  );
  requireThat(
    !p.portrait || isMediaPath(p.portrait),
    "Choose an uploaded portrait.",
  );
  requireThat(
    /^https:\/\/www\.instagram\.com\/[\w.]+\/?$/.test(p.instagram),
    "Use an Instagram profile URL.",
  );
  requireThat(
    /^https:\/\/www\.imdb\.com\/name\/nm\d+\/$/.test(p.imdb),
    "Use an IMDb name URL.",
  );
  requireThat(
    !p.url || /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(p.url),
    "Site URL must be an HTTPS origin without a trailing slash.",
  );
  if (production)
    requireThat(
      p.url && p.email,
      "Set the real domain and contact email before production.",
    );
  for (const kind of ["categories", "tags"]) {
    requireThat(
      Array.isArray(data[kind]) && data[kind].length <= 100,
      `At most 100 ${kind} are supported.`,
    );
    const ids = new Set(),
      slugs = new Set();
    for (const term of data[kind]) {
      for (const field of ["id", "slug"])
        requireThat(
          typeof term[field] === "string" &&
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(term[field]) &&
            term[field].length <= 100,
          `Invalid ${kind} ${field}.`,
        );
      text(term.label, `${kind} label`, 60, true);
      requireThat(
        !ids.has(term.id) && !slugs.has(term.slug),
        `Duplicate ${kind}.`,
      );
      ids.add(term.id);
      slugs.add(term.slug);
      const old = previous?.[kind].find((t) => t.id === term.id);
      requireThat(
        !old || old.slug === term.slug,
        "Existing category and tag URLs must stay stable.",
      );
    }
  }
  requireThat(
    Array.isArray(data.entries) && data.entries.length <= 200,
    "At most 200 entries are supported.",
  );
  const ids = new Set(),
    urls = new Set();
  for (const e of data.entries) {
    requireThat(
      ["project", "post"].includes(e.kind) &&
        ["draft", "published"].includes(e.status),
      "Invalid entry type or visibility.",
    );
    for (const field of ["id", "slug"])
      requireThat(
        typeof e[field] === "string" &&
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e[field]) &&
          e[field].length <= 100,
        `Invalid project ${field}.`,
      );
    requireThat(
      !ids.has(e.id) && !urls.has(`${e.kind}/${e.slug}`),
      "Project IDs and URLs must be unique.",
    );
    ids.add(e.id);
    urls.add(`${e.kind}/${e.slug}`);
    const old = previous?.entries.find((item) => item.id === e.id);
    requireThat(
      !old || (old.slug === e.slug && old.kind === e.kind),
      "Existing entry URLs must stay stable.",
    );
    text(e.title, "Title", 150, true);
    text(e.intro, "Introduction", 1000);
    text(e.role, "Role", 150);
    text(e.credits, "Credits", 4000);
    const years = String(e.year).trim().match(/^(\d{4})(?:\s*[-–]\s*(\d{4}))?$/);
    requireThat(
      years && Number(years[1]) >= 1900 &&
        Number(years[2] || years[1]) <= 2100 &&
        Number(years[1]) <= Number(years[2] || years[1]),
      "Enter a year or ascending year range between 1900 and 2100.",
    );
    e.year = years[2] ? `${years[1]}–${years[2]}` : Number(years[1]);
    requireThat(
      /^\d{4}-\d{2}-\d{2}$/.test(e.date) && !Number.isNaN(Date.parse(e.date)),
      "Enter a publication date.",
    );
    requireThat(
      typeof e.sample === "boolean",
      "Entry sample status is required.",
    );
    if (production && e.status === "published")
      requireThat(!e.sample, `Replace sample project: ${e.title}.`);
    for (const kind of ["categories", "tags"]) {
      requireThat(
        Array.isArray(e[kind]) &&
          new Set(e[kind]).size === e[kind].length &&
          e[kind].every((id) => data[kind].some((t) => t.id === id)),
        `Reassign entries before removing a ${kind === "tags" ? "tag" : "category"}.`,
      );
    }
    if (e.status === "published" && e.kind === "project")
      requireThat(e.categories.length > 0, `${e.title} needs a category.`);
    validateImage(
      e.cover,
      e.status === "published" && e.kind === "project",
      e.title,
    );
    e.blocks = normalizeBlocks(e.blocks);
  }
  if (production)
    requireThat(
      !mediaReferences(data, true).some((path) =>
        path.startsWith("/assets/media/sample-"),
      ),
      "Replace the stock sample photographs before production.",
    );
  return data;
}

export const BIO_PDF_PATH = "/assets/documents/r-barela-bio-resume.pdf";
export const entryPath = (e) =>
  `/${e.kind === "post" ? "writing" : "work"}/${e.slug}/`;
export const termPath = (kind, t) =>
  `/${kind === "categories" ? "category" : "tag"}/${t.slug}/`;
export function renderImage(
  img,
  { lead = false, sizes = "(max-width: 900px) 92vw, 70vw" } = {},
) {
  if (!img.src) return "";
  return `<img src="${esc(img.src)}" ${lead ? 'fetchpriority="high"' : 'loading="lazy"'} sizes="${esc(sizes)}" decoding="async" alt="${esc(img.decorative ? "" : img.alt)}" width="1600" height="1200">`;
}
export function renderBlocks(blocks) {
  return blocks
    .map((b) => {
      const alignment = ["left", "center", "right", "justify"].includes(b.align)
        ? b.align
        : "left";
      const cls = `block block--${b.type} align-${alignment}`;
      switch (b.type) {
        case "text":
          return `<div class="${cls} reading">${rich(b.body)}</div>`;
        case "quote":
          return `<blockquote class="${cls} reading">${rich(b.text)}${b.author ? `<cite>${esc(b.author)}</cite>` : ""}</blockquote>`;
        case "image":
          return b.src
            ? `<figure class="${cls}">${renderImage(b)}${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""}</figure>`
            : "";
        case "gallery":
          return `<figure class="${cls} ${b.layout === "carousel" ? "gallery--carousel" : ""}"><div class="gallery-images" ${b.layout === "carousel" ? 'tabindex="0" role="group" aria-label="Image gallery; scroll to see more"' : ""}>${b.images
            .filter((i) => i.src)
            .map(
              (i) =>
                `<figure>${renderImage(i)}${i.caption ? `<figcaption>${esc(i.caption)}</figcaption>` : ""}</figure>`,
            )
            .join(
              "",
            )}</div>${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""}</figure>`;
        case "video":
          if (b.provider === "local")
            return b.src ? `<figure class="${cls}"><video class="video-file" controls playsinline loop preload="none" width="1280" height="720" aria-label="${esc(b.caption || "Video loop")}"${b.poster ? ` poster="${esc(b.poster)}"` : ""}><source src="${esc(b.src)}" type="video/mp4"><a href="${esc(b.src)}">Download video</a></video>${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""}</figure>` : "";
          return b.video_id
            ? `<figure class="${cls}"><div class="video" data-video-provider="${b.provider}" data-video-id="${esc(b.video_id)}" data-video-hash="${esc(b.src ? b.src.split("/").at(-1) : "")}">${b.poster ? renderImage({ src: b.poster, alt: "" }) : ""}<a class="video-play" href="${esc(videoUrl(b))}" target="_blank" rel="noopener noreferrer">Play film ↗ <span>Loads ${b.provider === "youtube" ? "YouTube" : "Vimeo"}</span></a></div>${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""}</figure>`
            : "";
        case "divider":
          return '<hr class="reading block-divider">';
        default:
          return "";
      }
    })
    .join("\n");
}
