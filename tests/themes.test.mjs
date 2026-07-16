import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THEMES_DIR = path.join(ROOT, "themes");
const EXPECTED_THEME_IDS = [
  "cyber-lobster",
  "focus-night",
  "magical-night",
  "mecha-core",
  "pixel-campus",
  "rose-glam",
  "sakura-dream",
  "silver-idol",
  "stage-aurora",
  "warm-paper",
];

function themeDirectories() {
  return fs.readdirSync(THEMES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

test("ships ten WorkBuddy Skins", () => {
  assert.deepEqual(themeDirectories(), EXPECTED_THEME_IDS);
});

for (const directory of themeDirectories()) {
  test(`${directory} has a safe Skin manifest and scoped CSS`, () => {
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

test("wrapper lists all Skins", () => {
  const result = spawnSync(process.execPath, ["scripts/workbuddy-skin.mjs", "list"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  for (const id of themeDirectories()) assert.match(result.stdout, new RegExp(id));
});

test("scaffold creates a gitignored local Skin with optional art", () => {
  const id = "test-uploaded-skin";
  const localRoot = path.join(ROOT, "local-themes");
  const target = path.join(localRoot, id);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "workbuddy-skin-"));
  const artPath = path.join(temporary, "reference.png");
  const onePixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );

  fs.writeFileSync(artPath, onePixelPng);
  try {
    const result = spawnSync(process.execPath, [
      "scripts/workbuddy-skin.mjs",
      "scaffold",
      id,
      "--from",
      "stage-aurora",
      "--name",
      "Test Uploaded Skin",
      "--art",
      artPath,
    ], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);

    const manifest = JSON.parse(fs.readFileSync(path.join(target, "theme.json"), "utf8"));
    assert.equal(manifest.id, id);
    assert.equal(manifest.displayName, "Test Uploaded Skin");
    assert.equal(manifest.version, "1.0.0");
    assert.equal(manifest.art, "art.png");
    assert.equal(fs.existsSync(path.join(target, "art.png")), true);
    assert.equal(fs.existsSync(path.join(target, "workbuddy.css")), true);

    const list = spawnSync(process.execPath, ["scripts/workbuddy-skin.mjs", "list"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(list.status, 0, list.stderr);
    assert.match(list.stdout, /test-uploaded-skin\s+1\.0\.0\s+Test Uploaded Skin\s+local/);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
    fs.rmSync(temporary, { recursive: true, force: true });
    if (fs.existsSync(localRoot) && fs.readdirSync(localRoot).length === 0) fs.rmdirSync(localRoot);
  }
});
