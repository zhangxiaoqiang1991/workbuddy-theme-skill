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
const DIST_DIR = path.join(ROOT, "dist");

function themeRecords() {
  return fs.readdirSync(THEMES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const manifestPath = path.join(THEMES_DIR, entry.name, "theme.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      return {
        id: manifest.id,
        name: manifest.displayName,
        version: manifest.version,
        manifestPath,
        packagePath: path.join(DIST_DIR, `${manifest.id}-${manifest.version}.codedrobe-theme`),
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function resolveTheme(id = "focus-night") {
  const record = themeRecords().find((theme) => theme.id === id);
  if (!record) {
    const available = themeRecords().map((theme) => theme.id).join(", ");
    throw new Error(`Unknown theme '${id}'. Available themes: ${available}`);
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
  fs.mkdirSync(DIST_DIR, { recursive: true });
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

function help() {
  console.log(`WorkBuddy Theme Skill

Usage:
  node scripts/workbuddy-theme.mjs list
  node scripts/workbuddy-theme.mjs doctor [--app-path <path>]
  node scripts/workbuddy-theme.mjs pack [theme-id|all]
  node scripts/workbuddy-theme.mjs inspect [theme-id|all]
  node scripts/workbuddy-theme.mjs probe [theme-id] [--port <port>]
  node scripts/workbuddy-theme.mjs apply [theme-id] [--port <port>] [--no-launch] [--restart-existing] [--watch]
  node scripts/workbuddy-theme.mjs verify [theme-id] [--port <port>] [--screenshot <absolute.png>]
  node scripts/workbuddy-theme.mjs restore [--port <port>]

Defaults:
  theme-id: focus-night
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
      console.log(`${theme.id}\t${theme.version}\t${theme.name}`);
    }
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
  console.error(`[workbuddy-theme] ${error.message}`);
  process.exit(1);
}
