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

const DARK_THEME_IDS = new Set([
  "cyber-lobster",
  "focus-night",
  "magical-night",
  "mecha-core",
  "rose-glam",
  "stage-aurora",
]);

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(hex) {
  const channels = hexToRgb(hex).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

function cssHexVariable(css, name) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"));
  assert.ok(match, `missing --${name}`);
  return match[1];
}

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

    const background = cssHexVariable(css, "wbts-bg");
    const text = cssHexVariable(css, "wbts-text");
    const muted = cssHexVariable(css, "wbts-muted");
    assert.ok(contrastRatio(text, background) >= 7, `${directory}: primary text must reach WCAG AAA`);
    assert.ok(contrastRatio(muted, background) >= 4.5, `${directory}: muted text must reach WCAG AA`);

    if (DARK_THEME_IDS.has(directory)) {
      const panel = cssHexVariable(css, "wbts-panel-strong");
      assert.ok(contrastRatio(text, panel) >= 4.5, `${directory}: task surfaces must reach WCAG AA`);
      assert.match(css, /\.main-content--chat \.cb-assistant-message/);
      assert.match(css, /\.cb-markdown-table-wrapper/);
      assert.match(css, /\.artifact-slot-panel__card/);
      assert.match(css, /:has\(> :has\(> \[role="textbox"\]/);
    }
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
