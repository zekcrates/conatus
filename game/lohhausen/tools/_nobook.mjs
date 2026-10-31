// tools/_nobook.mjs — strip every reference to the book / the manual from the
// text the player reads. The citations stay in docs/ and research/.
import { readFileSync, writeFileSync } from 'node:fs';

const strip = (s) => s
  // parenthetical citations of any shape
  .replace(/\((?:book|LoF|manual|M)[^)]*\)/g, '')
  .replace(/\((?:book|LoF)[^)]*$/g, '')
  // phrases that talk about the book's people
  .replace(/The mayor in the book never asked why the factory was slow\. The machines were the answer\.?/g, 'The machines are the real reason the factory makes too little — ask why, not who.')
  .replace(/One mayor read “tourism pays” from a single lucky year, spent everything on it later, and got nothing\.?/g, 'One lucky summer is not a business plan: conditions change, and the money follows them.')
  .replace(/The good mayors checked their ideas\. The bad ones believed them\.?/g, 'Good mayors check their ideas. Bad ones believe them.')
  .replace(/The mayors in the book ruled alone — and their citizens noticed everything\.?/g, 'You rule alone — and the citizens still notice everything.')
  .replace(/The book’s participants mostly landed here\./g, 'Most terms end up here.')
  .replace(/the book’s “good mayor”/g, 'the good mayor')
  .replace(/the book’s “bad mayor”/g, 'the bad mayor')
  .replace(/The book counted the same things\./g, 'The same things were counted in the original study.')
  .replace(/\s{2,}/g, ' ')
  .replace(/ ([.,;])/g, '$1')
  .trim();

for (const f of ['engine/game.js', 'engine/sim.js', 'web/js/ui.js']) {
  let src = readFileSync(f, 'utf8');
  const before = src;
  // only rewrite the *string literals and template literals* that the player sees
  src = src.replace(/('[^'\n]{0,400}?')/g, (m) => (/book|LoF|manual|\bM\b\s*9\.|\(M\)/.test(m) ? "'" + strip(m.slice(1, -1)) .replace(/'/g, "\\'") + "'" : m));
  src = src.replace(/(`[^`]{0,600}?`)/g, (m) => (/book|LoF|manual|fig\./.test(m) ? '`' + strip(m.slice(1, -1)) + '`' : m));
  if (src !== before) { writeFileSync(f, src); console.log('cleaned: ' + f); } else console.log('no change: ' + f);
}

// index.html: the one hint line
let html = readFileSync('web/index.html', 'utf8');
html = html.replace(' <span class="hint">(the five numbers the book follows)</span>', '');
writeFileSync('web/index.html', html);
console.log('index.html: hint removed');
