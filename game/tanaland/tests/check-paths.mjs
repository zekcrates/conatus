// tanaland/tests/check-paths.mjs
// -----------------------------------------------------------------------------
// Verify the page is servable from tanaland/ as its web root.
//
// The interface lives in web/ but imports ../engine/. Serving web/ directly
// therefore 404s every engine module (this actually happened). This walks the
// real import graph from index.html, resolving each specifier the way a browser
// would, and fails if any target is missing or escapes the server root.
//
//   node tanaland/tests/check-paths.mjs
// -----------------------------------------------------------------------------
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..'); // tanaland/
const entry = resolve(root, 'web', 'index.html');

const problems = [];
const walked = new Set();

const inside = (p) => p === root || p.startsWith(root + sep);

function walkHtml(file) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|data:|#|mailto:)/.test(url)) continue;
    const target = resolve(dirname(file), url);
    if (!inside(target)) {
      problems.push(`escapes root: ${url} -> ${relative(root, target)}`);
    } else if (!existsSync(target)) {
      problems.push(`missing: ${url} -> ${relative(root, target)}`);
    } else if (target.endsWith('.js')) {
      walkJs(target);
    }
  }
}

function walkJs(file) {
  if (walked.has(file)) return;
  walked.add(file);
  if (!inside(file)) {
    problems.push(`escapes root: ${relative(root, file)}`);
    return;
  }
  const src = readFileSync(file, 'utf8');
  // static imports, re-exports and dynamic import()
  const specs = [
    ...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g),
    ...src.matchAll(/\bimport\s+['"]([^'"]+)['"]/g),
    ...src.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((m) => m[1]);

  for (const spec of specs) {
    if (!spec.startsWith('.')) continue; // bare specifier: not used here
    const target = resolve(dirname(file), spec);
    if (!existsSync(target)) {
      problems.push(`missing import: ${spec} (from ${relative(root, file)})`);
    } else if (!inside(target)) {
      problems.push(`import escapes root: ${spec} -> ${relative(root, target)}`);
    } else {
      walkJs(target);
    }
  }
}

walkHtml(entry);

console.log(`server root: ${root}`);
console.log(`modules reached from web/index.html: ${walked.size}`);
for (const f of [...walked].sort()) console.log('  ' + relative(root, f).replace(/\\/g, '/'));

console.log('');
if (problems.length) {
  console.log('PROBLEMS:');
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log('OK: every asset is present and inside the server root.');
