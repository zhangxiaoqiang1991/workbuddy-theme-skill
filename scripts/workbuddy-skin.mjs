#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CORE_VERSION = "0.2.0";
const CORE_PACKAGE = `@codedrobe/core@${CORE_VERSION}`;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const THEMES_DIR = path.join(ROOT, "themes");
const LOCAL_THEMES_DIR = path.join(ROOT, "local-themes");
const DIST_DIR = path.join(ROOT, "dist");
const LOCAL_DIST_DIR = path.join(ROOT, "local-dist");
const ART_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

function themeRecordsIn(directory, scope) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const themeDirectory = path.join(directory, entry.name);
      const manifestPath = path.join(themeDirectory, "theme.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const outputDirectory = scope === "local" ? LOCAL_DIST_DIR : DIST_DIR;
      return {
        id: manifest.id,
        name: manifest.displayName,
        version: manifest.version,
        scope,
        themeDirectory,
        manifestPath,
        packagePath: path.join(outputDirectory, `${manifest.id}-${manifest.version}.codedrobe-theme`),
      };
    });
}

function themeRecords() {
  const records = [
    ...themeRecordsIn(THEMES_DIR, "builtin"),
    ...themeRecordsIn(LOCAL_THEMES_DIR, "local"),
  ].sort((left, right) => left.id.localeCompare(right.id));
  const seen = new Set();
  for (const record of records) {
    if (seen.has(record.id)) {
      throw new Error(`Duplicate Skin id '${record.id}' in built-in and local collections.`);
    }
    seen.add(record.id);
  }
  return records;
}

function resolveTheme(id = "focus-night") {
  const record = themeRecords().find((theme) => theme.id === id);
  if (!record) {
    const available = themeRecords().map((theme) => theme.id).join(", ");
    throw new Error(`Unknown Skin '${id}'. Available Skins: ${available}`);
  }
  return record;
}

function runCore(args) {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    executable,
    ["--yes", `--package=${CORE_PACKAGE}`, "codedrobe", ...args],
    { cwd: ROOT, stdio: "inherit", shell: false },
  );
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function packTheme(theme) {
  fs.mkdirSync(path.dirname(theme.packagePath), { recursive: true });
  return runCore([
    "theme", "pack", theme.manifestPath,
    "--output", theme.packagePath,
    "--force",
  ]);
}

function ensurePackage(theme) {
  if (!fs.existsSync(theme.packagePath)) {
    const status = packTheme(theme);
    if (status !== 0) process.exit(status);
  }
}

function selectThemes(id) {
  if (!id || id === "all") return themeRecords();
  return [resolveTheme(id)];
}

function titleFromId(id) {
  return id.split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function scaffoldOptions(args) {
  const options = { from: "focus-night", name: null, art: null };
  const allowed = new Map([
    ["--from", "from"],
    ["--name", "name"],
    ["--art", "art"],
  ]);
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const key = allowed.get(flag);
    if (!key) throw new Error(`Unknown scaffold option '${flag}'.`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Scaffold option '${flag}' requires a value.`);
    }
    options[key] = value;
  }
  return options;
}

function scaffoldTheme(id, args) {
  if (!id || id.startsWith("--")) throw new Error("Scaffold requires a new Skin id.");
  if (id.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error("Skin id must be 1-64 lowercase letters, digits, and single hyphens.");
  }
  if (themeRecords().some((theme) => theme.id === id)) {
    throw new Error(`Skin '${id}' already exists.`);
  }

  const options = scaffoldOptions(args);
  const base = resolveTheme(options.from);
  const baseManifest = JSON.parse(fs.readFileSync(base.manifestPath, "utf8"));
  const cssName = baseManifest.targets?.workbuddy?.css;
  if (!cssName || path.basename(cssName) !== cssName) {
    throw new Error(`Base Skin '${base.id}' has an unsafe CSS path.`);
  }

  let artSource = null;
  let artName = null;
  if (options.art) {
    artSource = path.resolve(process.cwd(), options.art);
    if (!fs.existsSync(artSource) || !fs.statSync(artSource).isFile()) {
      throw new Error(`Art file not found: ${artSource}`);
    }
    const extension = path.extname(artSource).toLowerCase();
    if (!ART_EXTENSIONS.has(extension)) {
      throw new Error(`Unsupported art format '${extension}'. Use PNG, JPEG, WebP, or GIF.`);
    }
    artName = `art${extension}`;
  }

  const targetDirectory = path.join(LOCAL_THEMES_DIR, id);
  fs.mkdirSync(LOCAL_THEMES_DIR, { recursive: true });
  if (fs.existsSync(targetDirectory)) throw new Error(`Skin directory already exists: ${targetDirectory}`);

  fs.mkdirSync(targetDirectory);
  try {
    const manifest = structuredClone(baseManifest);
    manifest.id = id;
    manifest.displayName = options.name || titleFromId(id);
    manifest.version = "1.0.0";
    delete manifest.art;
    if (artName) manifest.art = artName;

    fs.copyFileSync(path.join(base.themeDirectory, cssName), path.join(targetDirectory, cssName));
    if (artSource) fs.copyFileSync(artSource, path.join(targetDirectory, artName));
    fs.writeFileSync(
      path.join(targetDirectory, "theme.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );

    console.log(JSON.stringify({
      action: "scaffold",
      id,
      displayName: manifest.displayName,
      baseTheme: base.id,
      scope: "local-private",
      directory: targetDirectory,
      art: artName,
    }, null, 2));
  } catch (error) {
    fs.rmSync(targetDirectory, { recursive: true, force: true });
    throw error;
  }
}

function help() {
  console.log(`WorkBuddy Skin Skill

Usage:
  node scripts/workbuddy-skin.mjs list
  node scripts/workbuddy-skin.mjs doctor [--app-path <path>]
  node scripts/workbuddy-skin.mjs scaffold <new-id> [--from <skin-id>] [--name <display-name>] [--art <local-image>]
  node scripts/workbuddy-skin.mjs pack [skin-id|all]
  node scripts/workbuddy-skin.mjs inspect [skin-id|all]
  node scripts/workbuddy-skin.mjs probe [skin-id] [--port <port>]
  node scripts/workbuddy-skin.mjs apply [skin-id] [--port <port>] [--no-launch] [--restart-existing] [--watch]
  node scripts/workbuddy-skin.mjs verify [skin-id] [--port <port>] [--screenshot <absolute.png>]
  node scripts/workbuddy-skin.mjs restore [--port <port>]

Defaults:
  skin-id: focus-night
  scaffold output: local-themes/ and local-dist/ (gitignored)
  CodeDrobe Core: ${CORE_VERSION}
  WorkBuddy CDP port: 9336`);
}

const [command = "help", maybeTheme, ...rest] = process.argv.slice(2);

try {
  if (command === "help" || command === "--help" || command === "-h") {
    help();
    process.exit(0);
  }

  if (command === "list") {
    for (const theme of themeRecords()) {
      console.log(`${theme.id}\t${theme.version}\t${theme.name}\t${theme.scope}`);
    }
    process.exit(0);
  }

  if (command === "scaffold") {
    scaffoldTheme(maybeTheme, rest);
    process.exit(0);
  }

  if (command === "doctor") {
    const flags = [maybeTheme, ...rest].filter(Boolean);
    const appsStatus = runCore(["apps"]);
    if (appsStatus !== 0) process.exit(appsStatus);
    process.exit(runCore(["detect", "--app", "workbuddy", ...flags]));
  }

  if (command === "pack") {
    for (const theme of selectThemes(maybeTheme)) {
      const status = packTheme(theme);
      if (status !== 0) process.exit(status);
    }
    process.exit(0);
  }

  if (command === "inspect") {
    for (const theme of selectThemes(maybeTheme)) {
      ensurePackage(theme);
      const status = runCore(["theme", "inspect", theme.packagePath]);
      if (status !== 0) process.exit(status);
    }
    process.exit(0);
  }

  if (command === "restore") {
    const flags = [maybeTheme, ...rest].filter(Boolean);
    process.exit(runCore(["restore", "--app", "workbuddy", ...flags]));
  }

  const themeId = maybeTheme && !maybeTheme.startsWith("--") ? maybeTheme : "focus-night";
  const flags = themeId === maybeTheme ? rest : [maybeTheme, ...rest].filter(Boolean);
  const theme = resolveTheme(themeId);
  ensurePackage(theme);

  if (command === "probe") {
    process.exit(runCore(["probe", "--app", "workbuddy", "--theme", theme.packagePath, ...flags]));
  }

  if (command === "apply") {
    process.exit(runCore(["apply", "--app", "workbuddy", "--theme", theme.packagePath, ...flags]));
  }

  if (command === "verify") {
    process.exit(runCore(["verify", "--app", "workbuddy", "--theme", theme.packagePath, ...flags]));
  }

  throw new Error(`Unknown command '${command}'. Run with --help.`);
} catch (error) {
  console.error(`[workbuddy-skin] ${error.message}`);
  process.exit(1);
}
