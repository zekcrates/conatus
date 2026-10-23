import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JavaScriptObfuscator from "javascript-obfuscator";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "../..");
const sourceDirectory = path.join(projectRoot, "game", "eastern-front");
const outputDirectory = path.join(projectRoot, "client", "public", "play", "eastern-front");
const legacyOutputDirectory = path.join(projectRoot, "client", "public", "games", "eastern-front");

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

await fs.access(path.join(sourceDirectory, "index.html"));
await fs.rm(legacyOutputDirectory, { recursive: true, force: true });
await fs.rm(outputDirectory, { recursive: true, force: true });
await fs.mkdir(outputDirectory, { recursive: true });
await copyGameAssets();
await buildGameBundle();
console.log("Prepared the Eastern Front static browser game in client/public/play/eastern-front.");
