import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JavaScriptObfuscator from "javascript-obfuscator";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "../..");
const sourceDirectory = path.join(projectRoot, "game", "eastern-front");
const outputDirectory = path.join(projectRoot, "client", "public", "play", "eastern-front");
const legacyOutputDirectory = path.join(projectRoot, "client", "public", "games", "eastern-front");

const estoniaSourceDirectory = path.join(projectRoot, "game", "estonia-1992");
const estoniaOutputDirectory = path.join(projectRoot, "client", "public", "play", "estonia-1992");

const lohhausenSourceDirectory = path.join(projectRoot, "game", "lohhausen", "web");
const lohhausenOutputDirectory = path.join(projectRoot, "client", "public", "play", "lohhausen");

const tanalandSourceDirectory = path.join(projectRoot, "game", "tanaland");
const tanalandOutputDirectory = path.join(projectRoot, "client", "public", "play", "tanaland");

const obfuscationOptions = {
  compact: true,
  simplify: true,
  identifierNamesGenerator: "hexadecimal",
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.75,
  splitStrings: true,
  splitStringsChunkLength: 8,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.15,
  deadCodeInjection: false,
  numbersToExpressions: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  sourceMap: false,
};

async function copyGameAssets() {
  await fs.cp(sourceDirectory, outputDirectory, {
    recursive: true,
    filter: (source) => {
      const relativePath = path.relative(sourceDirectory, source);
      if (!relativePath) return true;
      const parts = relativePath.split(path.sep);
      return !parts.includes("js") && !parts.includes("SOURCES.md") && !parts.includes("race_tmp.js") && !parts.includes(".gitignore");
    },
  });
}

async function buildGameBundle() {
  const sourceIndexPath = path.join(sourceDirectory, "index.html");
  const outputIndexPath = path.join(outputDirectory, "index.html");
  const sourceIndex = await fs.readFile(sourceIndexPath, "utf8");
  const scriptPattern = /<script\b([^>]*?)\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  const scripts = [];
  let match;

  while ((match = scriptPattern.exec(sourceIndex)) !== null) {
    const sourcePath = match[2].split("?", 1)[0];
    if (sourcePath.startsWith("js/") && sourcePath.endsWith(".js")) {
      scripts.push(await fs.readFile(path.join(sourceDirectory, sourcePath), "utf8"));
    }
  }

  if (scripts.length === 0) throw new Error("No local Eastern Front JavaScript files found.");

  const combinedSource = scripts.map((contents, index) => `\n/* source module ${index + 1} */\n${contents}`).join("\n;");
  const obfuscatedSource = JavaScriptObfuscator.obfuscate(combinedSource, obfuscationOptions).getObfuscatedCode();
  await fs.mkdir(path.join(outputDirectory, "js"), { recursive: true });
  await fs.writeFile(path.join(outputDirectory, "js", "game.bundle.js"), `${obfuscatedSource}\n`, "utf8");

  let insertedBundle = false;
  scriptPattern.lastIndex = 0;
  const releaseIndex = sourceIndex.replace(scriptPattern, (fullTag, _attributes, sourcePathWithQuery) => {
    const sourcePath = sourcePathWithQuery.split("?", 1)[0];
    if (!sourcePath.startsWith("js/") || !sourcePath.endsWith(".js")) return fullTag;
    if (insertedBundle) return "";
    insertedBundle = true;
    return "<script src=\"js/game.bundle.js\"></script>";
  });
  await fs.writeFile(outputIndexPath, releaseIndex, "utf8");
}

// Rewrite a relative module specifier across a copied game (used when a game's
// layout changes relative to its own server root).
async function rewriteModulePaths(directory, from, to) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await rewriteModulePaths(entryPath, from, to);
    } else if (entry.name.endsWith(".js")) {
      const contents = await fs.readFile(entryPath, "utf8");
      if (contents.includes(from)) await fs.writeFile(entryPath, contents.replaceAll(from, to), "utf8");
    }
  }
}

// These games are plain ES modules, so a wrong relative specifier is a 404 at play
// time rather than a build error. Walk what a browser would fetch and fail loudly.
async function checkRelativeModules(rootDirectory) {
  const queue = [path.join(rootDirectory, "index.html")];
  const visited = new Set();
  while (queue.length > 0) {
    const filePath = queue.pop();
    if (visited.has(filePath)) continue;
    visited.add(filePath);
    const contents = await fs.readFile(filePath, "utf8");
    const specifiers = [...contents.matchAll(/(?:\bfrom\s*|import\s*\(?\s*|(?:src|href)=)["']([^"']+)["']/g)].map((match) => match[1]);
    for (const specifier of specifiers) {
      if (!specifier.startsWith("./") && !specifier.startsWith("../")) continue;
      const target = path.resolve(path.dirname(filePath), specifier.split(/[?#]/, 1)[0]);
      const origin = path.relative(rootDirectory, filePath);
      if (!target.startsWith(rootDirectory)) throw new Error(`${origin} imports ${specifier}, which leaves the play directory.`);
      try {
        await fs.access(target);
      } catch {
        throw new Error(`${origin} imports ${specifier}, which does not exist.`);
      }
      if (target.endsWith(".js")) queue.push(target);
    }
  }
}

await fs.access(path.join(sourceDirectory, "index.html"));
await fs.rm(legacyOutputDirectory, { recursive: true, force: true });
await fs.rm(outputDirectory, { recursive: true, force: true });
await fs.mkdir(outputDirectory, { recursive: true });
await copyGameAssets();
await buildGameBundle();
console.log("Prepared the Eastern Front static browser game in client/public/play/eastern-front.");

// Estonia 1992 is shipped as a static module-based game (no obfuscation).
try {
  await fs.access(path.join(estoniaSourceDirectory, "index.html"));
  await fs.rm(estoniaOutputDirectory, { recursive: true, force: true });
  await fs.mkdir(estoniaOutputDirectory, { recursive: true });
  await fs.cp(estoniaSourceDirectory, estoniaOutputDirectory, { recursive: true });
  console.log("Prepared the Estonia 1992 static browser game in client/public/play/estonia-1992.");
} catch (error) {
  console.log("Skipped Estonia 1992 build:", error.message);
}

// Lohhausen 1981 ships as classic scripts (the engine is bundled into
// web/js/engine.bundle.js by the game's own tools/bundle.mjs), so web/ is copied
// verbatim and the play URL stays /play/lohhausen/index.html.
await fs.access(path.join(lohhausenSourceDirectory, "index.html"));
await fs.rm(lohhausenOutputDirectory, { recursive: true, force: true });
await fs.mkdir(lohhausenOutputDirectory, { recursive: true });
await fs.cp(lohhausenSourceDirectory, lohhausenOutputDirectory, { recursive: true });
await checkRelativeModules(lohhausenOutputDirectory);
console.log("Prepared the Lohhausen static browser game in client/public/play/lohhausen.");

// Tanaland ships as ES modules with web/ as the entry and engine/ beside it, one
// level up. Flattening web/ to the play root keeps the /play/<game>/index.html
// convention, so the app's engine imports move up with it.
await fs.access(path.join(tanalandSourceDirectory, "web", "index.html"));
await fs.rm(tanalandOutputDirectory, { recursive: true, force: true });
await fs.mkdir(tanalandOutputDirectory, { recursive: true });
await fs.cp(path.join(tanalandSourceDirectory, "web"), tanalandOutputDirectory, { recursive: true });
await fs.cp(path.join(tanalandSourceDirectory, "engine"), path.join(tanalandOutputDirectory, "engine"), { recursive: true });
await rewriteModulePaths(path.join(tanalandOutputDirectory, "js"), "../../engine/", "../engine/");
await checkRelativeModules(tanalandOutputDirectory);
console.log("Prepared the Tanaland static browser game in client/public/play/tanaland.");
