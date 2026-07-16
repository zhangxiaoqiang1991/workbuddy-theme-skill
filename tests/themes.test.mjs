import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THEMES_DIR = path.join(ROOT, "themes");

function themeDirectories() {
  return fs.readdirSync(THEMES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

test("ships three WorkBuddy themes", () => {
  assert.deepEqual(themeDirectories(), ["cyber-lobster", "focus-night", "warm-paper"]);
});

for (const directory of themeDirectories()) {
  test(`${directory} has a safe manifest and scoped CSS`, () => {
    const base = path.join(THEMES_DIR, directory);
    const manifest = JSON.parse(fs.readFileSync(path.join(base, "theme.json"), "utf8"));
    const css = fs.readFileSync(path.join(base, "workbuddy.css"), "utf8");

    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.id, directory);
    assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
    assert.deepEqual(Object.keys(manifest.targets), ["workbuddy"]);
    assert.equal(manifest.targets.workbuddy.css, "workbuddy.css");
    assert.match(css, /html\.codedrobe-host-workbuddy/);
    assert.doesNotMatch(css, /@import\s/i);
    assert.doesNotMatch(css, /url\s*\(/i);
    assert.doesNotMatch(css, /javascript:/i);
  });
}

test("wrapper lists all themes", () => {
  const result = spawnSync(process.execPath, ["scripts/workbuddy-theme.mjs", "list"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  for (const id of themeDirectories()) assert.match(result.stdout, new RegExp(id));
});
