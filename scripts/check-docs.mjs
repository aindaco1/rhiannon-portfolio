// Small Markdown-contract check, following ZEMA's handbook checker approach.
// Historical task evidence is linked from the index but is not rewritten/enforced.
import { readFileSync, statSync } from "node:fs";
import { resolve, dirname, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const maintained = [
  "README.md", "AGENTS.md", "docs/README.md", "docs/PROJECT.md",
  "docs/DEVELOPMENT.md", "docs/EDITOR_GUIDE.md", "docs/ARCHITECTURE.md",
  "docs/CONTENT_MODEL.md", "docs/MEDIA_PIPELINE.md", "docs/API.md",
  "docs/DEPLOYMENT.md", "docs/OPERATIONS.md", "docs/QUALITY_ASSURANCE.md",
];
const files = process.argv.slice(2).length ? process.argv.slice(2) : maintained;
const failures = [];
const label = file => relative(root, file);
const slug = text => text.toLowerCase().replace(/<[^>]*>/g, "")
  .replace(/[`*_~]/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s/g, "-");
function prose(source, file) {
  let fence = "";
  const lines = source.split("\n").map(line => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = "";
      return "";
    }
    return fence ? "" : line;
  });
  if (fence) failures.push(`${label(file)}: unclosed code fence`);
  return lines.join("\n");
}
function headings(source) {
  return [...source.matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)].map(match => slug(match[1]));
}
for (const name of files) {
  const file = resolve(root, name);
  let source;
  try { source = readFileSync(file, "utf8"); }
  catch { failures.push(`${name}: missing document`); continue; }
  const text = prose(source, file), ids = headings(text);
  if ((text.match(/^#\s+/gm) || []).length !== 1) failures.push(`${name}: expected one H1 title`);
  if (new Set(ids).size !== ids.length) failures.push(`${name}: duplicate heading anchors`);
  source.split("\n").forEach((line, i) => {
    if (/[\t ]+$/.test(line)) failures.push(`${name}:${i + 1}: trailing whitespace`);
  });
  for (const match of text.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1].replace(/^<|>$/g, "");
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("//")) continue;
    try {
      const [path, anchor] = target.split("#");
      if (isAbsolute(path)) throw new Error("use a repository-relative link");
      const destination = path ? resolve(dirname(file), decodeURIComponent(path)) : file;
      if (relative(root, destination).startsWith("..")) throw new Error("link leaves the repository");
      const info = statSync(destination);
      if (anchor && destination.endsWith(".md") && info.isFile()) {
        const content = prose(readFileSync(destination, "utf8"), destination);
        if (!headings(content).includes(decodeURIComponent(anchor))) throw new Error("missing heading anchor");
      }
    } catch (error) {
      failures.push(`${name}: ${target}: ${error.code === "ENOENT" ? "missing link target" : error.message}`);
    }
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else console.log(`Documentation check passed: ${files.length} guides and their relative links.`);
