import { AdminApiClient } from "../shared/dust-wave-platform/packages/admin-shell/src/api-client.js";
import { isMediaPath, isPdfPath, isVideoPath, esc } from "../lib/content.mjs";
const tokenKey = "r-barela-editor-session-v1";
const endpoint = document.body.dataset.apiBase || "";
export const hosted = !!endpoint;
const local = location.hostname === "127.0.0.1" || location.hostname === "localhost";
if (!hosted && !local) throw new Error("Hosted editor API is not configured.");
const apiOrigin = hosted ? new URL(endpoint).origin : location.origin;
if (hosted && (new URL(endpoint).protocol !== "https:" || endpoint !== apiOrigin)) throw new Error("Invalid editor API configuration.");
let session;
try { session = JSON.parse(sessionStorage.getItem(tokenKey)); } catch { session = null; }
const objects = new Map();
const pending = new Map();
let generation = 0, signedOut = () => {};
function token() { return session?.expiresAt > Date.now() ? session.accessToken : ""; }
function showLogin(message = "") {
  document.querySelector("#login").hidden = false;
  document.querySelector("#login-message").textContent = message;
  document.querySelector(".admin-layout").hidden = true;
  document.querySelector(".save-bar").hidden = true;
  document.querySelector("#sign-out").hidden = true;
}
function clearSession() {
  session = null;
  sessionStorage.removeItem(tokenKey);
  generation++;
  for (const url of objects.values()) URL.revokeObjectURL(url);
  objects.clear(); pending.clear();
  signedOut();
}
async function authorizedFetch(url, options = {}) {
  const requestGeneration = generation;
  const headers = new Headers(options.headers);
  if (hosted && token()) headers.set("authorization", `Bearer ${token()}`);
  const response = await fetch(url, { ...options, headers, credentials: hosted ? "omit" : "include", cache: "no-store" });
  if (hosted && requestGeneration === generation && response.status === 401 && !String(url).includes("/auth/")) {
    clearSession();
    showLogin("Your session expired. Sign in again; your recovery copy is preserved.");
  }
  return response;
}
export const api = new AdminApiClient({ baseUrl: apiOrigin + "/api", credentials: hosted ? "omit" : "include", fetchImpl: authorizedFetch });
const isPrivate = path => isMediaPath(path) || isPdfPath(path) || isVideoPath(path);
export function mediaAttribute(path, attribute = "src") {
  // Paths are validated content paths; this also avoids an anonymous media request before hydration.
  return `${hosted ? "data-private-" : ""}${attribute}="${esc(path)}"`;
}
export async function mediaURL(path) {
  if (!hosted || !isPrivate(path)) return path;
  if (objects.has(path)) return objects.get(path);
  if (!pending.has(path)) {
    const currentGeneration = generation;
    const result = (async () => {
      const response = await authorizedFetch(apiOrigin + path, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error("Private media could not load. Sign in again or retry.");
      const blob = await response.blob();
      if (currentGeneration !== generation) throw new Error("The editor session changed.");
      const url = URL.createObjectURL(blob);
      objects.set(path, url);
      return url;
    })();
    pending.set(path, result);
    result.finally(() => { if (pending.get(path) === result) pending.delete(path); }).catch(() => {});
  }
  return pending.get(path);
}
async function hydrate(node) {
  for (const attribute of ["src", "poster", "href"]) {
    const marker = `data-private-${attribute}`, path = node.getAttribute(marker);
    if (!path || node.hasAttribute(`data-loading-${attribute}`)) continue;
    node.setAttribute(`data-loading-${attribute}`, "");
    try {
      const url = await mediaURL(path);
      if (node.isConnected && node.getAttribute(marker) === path) node.setAttribute(attribute, url);
    } catch {
      node.setAttribute("title", "Private media could not load. Reload the saved version to retry.");
    } finally { node.removeAttribute(`data-loading-${attribute}`); }
  }
}
export async function privatePreview(html) {
  if (!hosted) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  await Promise.all([...doc.querySelectorAll("[src],[href],[poster]")].map(async node => {
    for (const attribute of ["src", "poster", "href"]) {
      const path = node.getAttribute(attribute);
      if (path && isPrivate(path)) node.setAttribute(attribute, await mediaURL(path));
    }
  }));
  return "<!doctype html>" + doc.documentElement.outerHTML;
}
export async function startSession(load, { onSignOut, confirmSignOut } = {}) {
  signedOut = onSignOut || signedOut;
  if (!hosted) { document.querySelector("#login").remove(); return load(); }
  const observer = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType !== 1) continue;
      hydrate(node);
      node.querySelectorAll("[data-private-src],[data-private-poster],[data-private-href]").forEach(hydrate);
    }
  });
  observer.observe(document.querySelector("#view"), { childList: true, subtree: true });
  const open = async () => {
    await load();
    document.querySelector("#login").hidden = true;
    document.querySelector(".admin-layout").hidden = false;
    document.querySelector(".save-bar").hidden = false;
    document.querySelector("#sign-out").hidden = false;
  };
  document.querySelector("#sign-out").onclick = async () => {
    if (confirmSignOut && !confirmSignOut()) return;
    try { await api.request("/auth/logout", { method: "POST" }); }
    catch (error) { if (error.status !== 401) { document.querySelector("#feedback").textContent = "Could not sign out on the server. Please try again."; return; } }
    clearSession(); showLogin("Signed out.");
  };
  document.querySelector("#login-form").onsubmit = async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button"), message = document.querySelector("#login-message");
    button.disabled = true; message.textContent = "Requesting your sign-in link…";
    try { message.textContent = (await api.request("/auth/login", { method: "POST", body: { email: document.querySelector("#login-email").value } })).message; }
    catch (error) { message.textContent = error.message; }
    finally { button.disabled = false; }
  };
  showLogin();
  let exchanging = false;
  const finishSignIn = async () => {
    if (exchanging) return;
    exchanging = true;
    const linkToken = new URLSearchParams(location.hash.slice(1)).get("token");
    if (location.hash) window.history.replaceState(null, "", location.pathname + location.search);
    try {
      if (linkToken) {
        session = await api.request("/auth/verify", { method: "POST", body: { token: linkToken } });
        sessionStorage.setItem(tokenKey, JSON.stringify(session));
      }
      if (token()) await open();
    } catch (error) { showLogin(error.message); }
    finally { exchanging = false; }
  };
  window.addEventListener("hashchange", finishSignIn);
  await finishSignIn();
}
