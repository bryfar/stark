#!/usr/bin/env node
import { execSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC_TAURI = join(ROOT, "src-tauri");

function run(cmd, cwd = ROOT) {
  console.log(`\n==> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd });
}

function parsePkg() {
  return JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
}

function writePkg(pkg) {
  writeFileSync(
    join(ROOT, "package.json"),
    JSON.stringify(pkg, null, 2) + "\n"
  );
}

console.log("== Crafter init ==\n");

// 1. Dependencias
run("bun install");

// 2. Pre-commit hooks (husky + lint-staged + prettier)
run("bun add -d husky lint-staged prettier");
run("bunx husky init");

const preCommit = ["bunx lint-staged", "bun run test", ""].join("\n");
const hookPath = join(ROOT, ".husky", "pre-commit");
if (!existsSync(hookPath) || readFileSync(hookPath, "utf8") !== preCommit) {
  writeFileSync(hookPath, preCommit);
  console.log("OK  .husky/pre-commit");
}
chmodSync(hookPath, 0o755);

writeFileSync(
  join(ROOT, ".lintstagedrc"),
  JSON.stringify({ "*": "prettier --ignore-unknown --write" }, null, 2) + "\n"
);
console.log("OK  .lintstagedrc");

if (!existsSync(join(ROOT, ".prettierrc"))) {
  writeFileSync(
    join(ROOT, ".prettierrc"),
    JSON.stringify(
      {
        useTabs: false,
        tabWidth: 2,
        printWidth: 80,
        singleQuote: false,
        trailingComma: "es5",
        semi: true,
        arrowParens: "always",
      },
      null,
      2
    ) + "\n"
  );
  console.log("OK  .prettierrc");
}
const pkg = parsePkg();
if (pkg.scripts?.prepare !== "husky") {
  pkg.scripts = { ...pkg.scripts, prepare: "husky" };
  writePkg(pkg);
  console.log('OK  package.json "prepare": "husky"');
}

// 3. Compila el binario Rust (debug)
run("cargo build", SRC_TAURI);

// 4. Verificacion completa
run("bun run build");
run("cargo check", SRC_TAURI);
run("cargo test", SRC_TAURI);
run("bun run test");

console.log("\n== Crafter init completo. Todo en verde ==");
