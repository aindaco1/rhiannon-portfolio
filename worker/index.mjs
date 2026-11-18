import { createRemoteJWKSet, jwtVerify } from "jose";
import { createGitHubStore } from "./github-store.mjs";
import { handleApi, json, privateHeaders, assertSameOrigin } from "./api.mjs";
import { ContentError, isMediaPath, isPdfPath, isVideoPath } from "../lib/content.mjs";
const keySets = new Map();
export async function authorize(request, env) {
  if (!env.ADMIN_ORIGIN || new URL(request.url).origin !== env.ADMIN_ORIGIN)
    throw new ContentError("This editor origin is not configured.", 403);
  if (
    !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(
      env.ACCESS_TEAM_DOMAIN || "",
    ) ||
    !env.ACCESS_AUD ||
    !env.EDITOR_EMAILS
  )
    throw new ContentError("Editor access is not configured.", 403);
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) throw new ContentError("Sign in to edit this portfolio.", 401);
  if (!keySets.has(env.ACCESS_TEAM_DOMAIN))
    keySets.set(
      env.ACCESS_TEAM_DOMAIN,
      createRemoteJWKSet(
        new URL(`${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`),
      ),
    );
  let payload;
  try {
    ({ payload } = await jwtVerify(token, keySets.get(env.ACCESS_TEAM_DOMAIN), {
      issuer: env.ACCESS_TEAM_DOMAIN,
      audience: env.ACCESS_AUD,
      algorithms: ["RS256"],
    }));
  } catch {
    throw new ContentError("Your editor session is invalid or expired.", 401);
  }
  if (
    typeof payload.email !== "string" ||
    !env.EDITOR_EMAILS.split(",")
      .map((v) => v.trim().toLowerCase())
      .includes(payload.email.toLowerCase())
  )
    throw new ContentError("This account does not have editor access.", 403);
  return payload.email;
}
export default {
  async fetch(request, env) {
    try {
      await authorize(request, env);
      const url = new URL(request.url);
      if (!["GET", "HEAD"].includes(request.method)) assertSameOrigin(request);
      let response;
      if (url.pathname.startsWith("/api/"))
        response = await handleApi(request, await createGitHubStore(env), {
          production: true,
        });
      else if (isMediaPath(url.pathname) || isPdfPath(url.pathname) || isVideoPath(url.pathname))
        response = await (await createGitHubStore(env)).media(url.pathname, request);
      else if (["GET", "HEAD"].includes(request.method)) {
        const assetURL = new URL(request.url);
        if (["/", "/admin/"].includes(url.pathname))
          assetURL.pathname = "/index.html";
        response = await env.ASSETS.fetch(new Request(assetURL, request));
      } else response = json({ error: "Method not allowed." }, 405);
      response = new Response(response.body, response);
      for (const [key, value] of Object.entries(privateHeaders))
        response.headers.set(key, value);
      response.headers.set(
        "content-security-policy",
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      );
      return response;
    } catch (error) {
      return json(
        {
          error:
            error.status && error.status < 500
              ? error.message
              : "Editor service is not configured or is temporarily unavailable.",
        },
        error.status || 503,
      );
    }
  },
};
