import { createGitHubStore } from "./github-store.mjs";
import { handleApi, json, privateHeaders } from "./api.mjs";
import { authorize, handleAuth } from "./auth.mjs";
import { ContentError, isMediaPath, isPdfPath, isVideoPath } from "../lib/content.mjs";
export { authorize } from "./auth.mjs";

function allowedOrigin(request, env) {
  try {
    const url = new URL(env.ADMIN_ORIGIN);
    return url.protocol === "https:" && url.origin === env.ADMIN_ORIGIN && request.headers.get("origin") === url.origin ? url.origin : "";
  } catch { return ""; }
}
export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    let response;
    try {
      if (!origin) throw new ContentError("This request must come from the editor.", 403);
      const url = new URL(request.url);
      if (request.method === "OPTIONS") response = new Response(null, { status: 204 });
      else if (url.pathname.startsWith("/api/auth/")) response = json(await handleAuth(request, env));
      else {
        await authorize(request, env);
        if (url.pathname.startsWith("/api/"))
          response = await handleApi(request, await createGitHubStore(env), { production: true, editorOrigin: origin, publicOrigin: origin });
        else if (["GET", "HEAD"].includes(request.method) && (isMediaPath(url.pathname) || isPdfPath(url.pathname) || isVideoPath(url.pathname)))
          response = await (await createGitHubStore(env)).media(url.pathname, request);
        else response = json({ error: "Not found." }, 404);
      }
    } catch (error) {
      response = json({ error: error.status && error.status < 500 ? error.message : "Editor service is not configured or is temporarily unavailable." }, error.status || 503);
    }
    response = new Response(request.method === "HEAD" ? null : response.body, response);
    for (const [key, value] of Object.entries(privateHeaders)) response.headers.set(key, value);
    response.headers.set("vary", "Origin");
    if (origin) {
      response.headers.set("access-control-allow-origin", origin);
      response.headers.set("access-control-allow-methods", "GET, HEAD, POST, PUT, OPTIONS");
      response.headers.set("access-control-allow-headers", "Content-Type, Authorization, Range");
      response.headers.set("access-control-expose-headers", "Content-Length, Content-Range, Accept-Ranges");
    }
    return response;
  },
};
