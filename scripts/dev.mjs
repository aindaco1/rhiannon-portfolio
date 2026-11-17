import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createLocalStore } from "./local-store.mjs";
import { handleApi, privateHeaders } from "../worker/api.mjs";
import { isMediaPath } from "../lib/content.mjs";
const port = Number(process.env.PORT || 4321),
  adminPort = Number(process.env.ADMIN_PORT || 4322);
const store = await createLocalStore(process.env.DATA_DIR || ".local");
const token = randomBytes(32).toString("hex");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
};
async function staticFile(root, path) {
  const base = resolve(root);
  let file = resolve(base, "." + decodeURIComponent(path));
  if (!file.startsWith(base + sep) && file !== base)
    return new Response("Not found", { status: 404 });
  try {
    if ((await stat(file)).isDirectory()) file += "/index.html";
    const body = await readFile(file);
    return new Response(body, {
      headers: {
        "content-type": types[extname(file)] || "application/octet-stream",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
function serve(isAdmin) {
  return createServer(async (req, res) => {
    try {
      const expected = `127.0.0.1:${isAdmin ? adminPort : port}`;
      if (req.headers.host !== expected) {
        res.writeHead(403);
        return res.end("Use the loopback URL printed in the terminal.");
      }
      const request = new Request(`http://${expected}${req.url}`, {
        method: req.method,
        headers: req.headers,
        ...(!["GET", "HEAD"].includes(req.method)
          ? { body: req, duplex: "half" }
          : {}),
      });
      const url = new URL(request.url);
      let response;
      if (!isAdmin) {
        if (!["GET", "HEAD"].includes(req.method))
          response = new Response("Method not allowed", { status: 405 });
        else {
          response = await staticFile(`${store.root}/live`, url.pathname);
          if (response.status === 404) {
            const missing = await staticFile(`${store.root}/live`, "/404.html");
            response = new Response(missing.body, {
              status: 404,
              headers: missing.headers,
            });
          }
        }
      } else {
        const cookie = (req.headers.cookie || "")
          .split("; ")
          .find((c) => c.startsWith("portfolio_local="))
          ?.slice(16);
        const signedIn =
          !!cookie &&
          cookie.length === token.length &&
          timingSafeEqual(Buffer.from(cookie), Buffer.from(token));
        if (url.pathname === "/admin/" || url.pathname === "/") {
          if (
            req.method !== "GET" ||
            request.headers.get("sec-fetch-site") === "cross-site"
          )
            response = new Response("Forbidden", { status: 403 });
          else {
            response = await staticFile(".admin-build", "/index.html");
            response.headers.set(
              "set-cookie",
              `portfolio_local=${token}; HttpOnly; SameSite=Strict; Path=/`,
            );
          }
        } else if (!signedIn)
          response = new Response("Open the local editor to start a session.", {
            status: 401,
          });
        else if (url.pathname.startsWith("/api/"))
          response = await handleApi(request, store, {
            publicOrigin: `http://127.0.0.1:${port}`,
          });
        else if (isMediaPath(url.pathname)) {
          response = await staticFile(store.root, url.pathname);
          if (response.status === 404)
            response = await staticFile(".", url.pathname);
        } else response = await staticFile(".admin-build", url.pathname);
        for (const [key, value] of Object.entries(privateHeaders))
          response.headers.set(key, value);
        response.headers.set(
          "content-security-policy",
          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        );
      }
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(
        req.method === "HEAD"
          ? undefined
          : Buffer.from(await response.arrayBuffer()),
      );
    } catch (error) {
      console.error(error.message);
      res.writeHead(500);
      res.end("Local server error.");
    }
  }).listen(isAdmin ? adminPort : port, "127.0.0.1");
}
const publicServer = serve(false),
  adminServer = serve(true);
console.log(
  `Portfolio: http://127.0.0.1:${port}\nEditor: http://127.0.0.1:${adminPort}/admin/\nLocal development only. Content is stored in ${store.root}.`,
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    publicServer.close();
    adminServer.close();
    process.exit(0);
  });
