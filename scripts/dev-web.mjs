import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

function baseEnv() {
  // Start from a minimal env so different instances don't leak NEXT_PUBLIC_* / CLERK_* / etc into each other.
  // Keep only what we need to run pnpm/node reliably.
  /** @type {Record<string, string>} */
  const keep = {};
  const passKeys = [
    "PATH",
    "HOME",
    "SHELL",
    "TMPDIR",
    "TEMP",
    "TMP",
    "TERM",
    "TERM_PROGRAM",
    "TERM_PROGRAM_VERSION",
    "USER",
    "LOGNAME",
    "LANG",
    "LC_ALL",
    "PNPM_HOME",
    "NVM_DIR",
    "NODE_OPTIONS",
  ];
  for (const k of passKeys) {
    const v = process.env[k];
    if (typeof v === "string" && v.length > 0) keep[k] = v;
  }
  return keep;
}

function usageAndExit(code = 1) {
  // eslint-disable-next-line no-console
  console.log(`
Usage:
  node scripts/dev-web.mjs regular
  node scripts/dev-web.mjs all4
  node scripts/dev-web.mjs student
  node scripts/dev-web.mjs student-demo
  node scripts/dev-web.mjs teacher
  node scripts/dev-web.mjs teacher-demo

Notes:
  - Reads root .env.* files (e.g. .env.student-demo) and injects them into each Next dev process.
  - This avoids reliance on Next's .env.local merging (you can keep app-level .env.local deleted).
`);
  process.exit(code);
}

function parseEnvFile(contents) {
  /** @type {Record<string, string>} */
  const out = {};
  const lines = contents.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const noExport = line.startsWith("export ") ? line.slice("export ".length) : line;
    const eq = noExport.indexOf("=");
    if (eq === -1) continue;
    const key = noExport.slice(0, eq).trim();
    let value = noExport.slice(eq + 1).trim();
    if (!key) continue;
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadEnv(envFileAbs) {
  const contents = fs.readFileSync(envFileAbs, "utf8");
  return parseEnvFile(contents);
}

function repoRoot() {
  // This file lives at <repo>/scripts/dev-web.mjs
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
}

function spawnNextDev({ name, cwd, port, env }) {
  const child = spawn("pnpm", ["exec", "next", "dev", "-p", String(port)], {
    cwd,
    env,
    stdio: "inherit",
  });
  child.on("exit", (code, signal) => {
    if (signal) return;
    if (typeof code === "number" && code !== 0) {
      // eslint-disable-next-line no-console
      console.log(`[${name}] exited with code ${code}`);
    }
  });
  return child;
}

const preset = process.argv[2];
if (!preset) usageAndExit(1);

const root = repoRoot();

/** @type {Record<string, Array<{name: string, appRel: string, envRel: string, port: number}>>} */
const PRESETS = {
  regular: [
    { name: "teacher", appRel: "apps/teacher-web", envRel: ".env.instructor", port: 3000 },
    { name: "student", appRel: "apps/student-web", envRel: ".env.student", port: 3001 },
  ],
  all4: [
    { name: "teacher", appRel: "apps/teacher-web", envRel: ".env.instructor", port: 3000 },
    { name: "student", appRel: "apps/student-web", envRel: ".env.student", port: 3001 },
    { name: "teacher-demo", appRel: "apps/teacher-web", envRel: ".env.instructor-demo", port: 3002 },
    { name: "student-demo", appRel: "apps/student-web", envRel: ".env.student-demo", port: 3003 },
  ],
  student: [{ name: "student", appRel: "apps/student-web", envRel: ".env.student", port: 3001 }],
  "student-demo": [
    { name: "student-demo", appRel: "apps/student-web", envRel: ".env.student-demo", port: 3003 },
  ],
  teacher: [{ name: "teacher", appRel: "apps/teacher-web", envRel: ".env.instructor", port: 3000 }],
  "teacher-demo": [
    { name: "teacher-demo", appRel: "apps/teacher-web", envRel: ".env.instructor-demo", port: 3002 },
  ],
};

const config = PRESETS[preset];
if (!config) usageAndExit(1);

/** @type {Array<import("node:child_process").ChildProcess>} */
const children = [];

for (const item of config) {
  const envPath = path.join(root, item.envRel);
  if (!fs.existsSync(envPath)) {
    // eslint-disable-next-line no-console
    console.error(`Missing env file: ${item.envRel}`);
    process.exit(1);
  }

  const envFromFile = loadEnv(envPath);
  const distDir = `.next-${item.name}-${item.port}`;
  const childEnv = {
    ...baseEnv(),
    ...envFromFile,
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_DIST_DIR: distDir,
  };
  const cwd = path.join(root, item.appRel);
  // eslint-disable-next-line no-console
  console.log(
    `[${item.name}] starting: ${item.appRel} on :${item.port} using ${item.envRel} (distDir ${distDir})`
  );
  children.push(spawnNextDev({ name: item.name, cwd, port: item.port, env: childEnv }));
}

function shutdown(code = 0) {
  for (const c of children) {
    try {
      c.kill("SIGINT");
    } catch {
      // ignore
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));


