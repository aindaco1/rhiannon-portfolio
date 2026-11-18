import {
  readJsonObject,
  readBoundedBytes,
} from "../shared/dust-wave-platform/packages/worker-core/src/request-validation.js";
import {
  ContentError,
  validateCatalog,
  isPdfPath,
  validatePdf,
  MAX_PDF_BYTES,
  entryPath,
} from "../lib/content.mjs";
import { shell, entryView, bio } from "../lib/views.mjs";
export const MAX_UPLOAD = 5 * 1024 * 1024;
export const privateHeaders = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow",
  "referrer-policy": "same-origin",
};
export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...privateHeaders,
      "content-type": "application/json; charset=utf-8",
    },
  });
export function assertSameOrigin(request) {
  const url = new URL(request.url);
  if (
    request.headers.get("origin") !== url.origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new ContentError("This request must come from the editor.", 403);
}
export function imageType(bytes) {
  if (bytes.length < 12)
    throw new ContentError("This is not a supported image.");
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return { ext: "jpg", type: "image/jpeg" };
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v))
    return { ext: "png", type: "image/png" };
  const s = new TextDecoder().decode(bytes.slice(0, 12));
  if (s.startsWith("RIFF") && s.endsWith("WEBP"))
    return { ext: "webp", type: "image/webp" };
  throw new ContentError(
    "Upload a JPG, PNG or WebP photo. SVG, camera originals and video files are not supported.",
  );
}
export async function handleApi(
  request,
  store,
  { production = false, publicOrigin = "" } = {},
) {
  const url = new URL(request.url);
  try {
    if (!["GET", "HEAD"].includes(request.method)) assertSameOrigin(request);
    if (url.pathname === "/api/state" && request.method === "GET")
      return json(await store.load());
    if (url.pathname === "/api/draft" && request.method === "PUT") {
      const input = await readJsonObject(request, 2 * 1024 * 1024),
        state = await store.load();
      const catalog = validateCatalog(input.catalog, {
        previous: state.catalog,
      });
      return json(
        await store.save(catalog, input.revision, input.publishedRevision),
      );
    }
    if (url.pathname === "/api/publish" && request.method === "POST") {
      const input = await readJsonObject(request, 1024),
        state = await store.load();
      validateCatalog(state.catalog, { production });
      return json(await store.publish(input.revision, input.publishedRevision));
    }
    if (url.pathname === "/api/preview" && request.method === "POST") {
      const input = await readJsonObject(request, 2 * 1024 * 1024),
        catalog = validateCatalog(input.catalog),
        entry = catalog.entries.find((e) => e.id === input.id);
      const isBio = input.page === "bio";
      if (!isBio && !entry)
        throw new ContentError("Choose an entry to preview.");
      return json({
        html: shell(catalog, {
          title: isBio ? "Bio" : entry.title,
          body: isBio ? bio(catalog) : entryView(catalog, entry),
          path: isBio ? "/bio/" : entryPath(entry),
          preview: true,
        }).replace(
          /(<a\b[^>]*\bhref=")(\/[^"]*)/g,
          (match, prefix, path) => isPdfPath(path) ? match :
            prefix.replace(
              "<a",
              '<a target="_blank" rel="noopener noreferrer"',
            ) +
            (publicOrigin || catalog.profile.url) +
            path,
        ),
      });
    }
    if (["/api/media", "/api/documents"].includes(url.pathname) && request.method === "POST") {
      const document = url.pathname === "/api/documents";
      const bytes = await readBoundedBytes(request, document ? MAX_PDF_BYTES : MAX_UPLOAD, document ? "PDF" : "Photo");
      if (document) validatePdf(bytes);
      const type = document ? { ext: "pdf" } : imageType(bytes);
      const digest = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        (n) => n.toString(16).padStart(2, "0"),
      ).join("");
      const path = `/assets/${document ? "documents" : "media"}/${digest}.${type.ext}`;
      await store.upload(path, bytes);
      return json({ src: path }, 201);
    }
    if (url.pathname === "/api/status" && request.method === "GET")
      return json(await store.status(url.searchParams.get("revision")));
    return json({ error: "Not found." }, 404);
  } catch (error) {
    const status = error.status || 500;
    return json(
      {
        error:
          status >= 500
            ? "The operation could not finish. Your draft is preserved; try again."
            : error.message,
      },
      status,
    );
  }
}
