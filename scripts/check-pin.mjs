import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const pin = JSON.parse(await readFile("platform.json", "utf8"));
const actual = execFileSync(
  "git",
  ["-C", "shared/dust-wave-platform", "rev-parse", "HEAD"],
  { encoding: "utf8" },
).trim();
if (actual !== pin.commit) throw new Error(`Platform pin mismatch: ${actual}`);
for (const [name, version] of Object.entries(pin.packages)) {
  const pkg = JSON.parse(
    await readFile(
      `shared/dust-wave-platform/packages/${name}/package.json`,
      "utf8",
    ),
  );
  if (pkg.version !== version) throw new Error(`${name} version mismatch`);
}
console.log(`Platform ${pin.release}: ${actual}`);
