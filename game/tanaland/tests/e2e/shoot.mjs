// tanaland/tests/e2e/shoot.mjs
// -----------------------------------------------------------------------------
// Drive the real page in headless Edge/Chrome and take screenshots at each
// stage, reporting any console error or uncaught exception.
//
//   node tanaland/tests/e2e/shoot.mjs
//
// Uses the DevTools protocol over a websocket we speak ourselves (the Node
// runtime here has no Playwright and the sandbox blocks piped stdio for some
// spawn styles, so we launch Edge detached and talk HTTP+WS to it).
// -----------------------------------------------------------------------------
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'shots');
mkdirSync(outDir, { recursive: true });

const EDGE_CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];

import { existsSync } from 'node:fs';
const browser = EDGE_CANDIDATES.find(existsSync);
if (!browser) {
  console.error('No Edge/Chrome found');
  process.exit(1);
}

const PAGE = 'file:///' + join(here, '..', '..', 'web', 'index.html').replace(/\\/g, '/');
const PORT = 9333;
const profile = join(here, '.profile');

const proc = spawn(
  browser,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${PORT}`,
    '--window-size=1400,1000',
    'about:blank',
  ],
  { stdio: 'ignore', detached: false }
);

async function waitForDevtools() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return await r.json();
    } catch {}
    await sleep(250);
  }
  throw new Error('devtools never came up');
}

const version = await waitForDevtools();

// --- minimal CDP client over WebSocket ---------------------------------------
class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', (e) => rej(e));
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    this.ws.close();
  }
}

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
let page = targets.find((t) => t.type === 'page');
if (!page) {
  page = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`)).json();
}

const cdp = new CDP(page.webSocketDebuggerUrl);
await cdp.ready;

const problems = [];
await cdp.send('Runtime.enable');
await cdp.send('Log.enable');
await cdp.send('Page.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', {
  width: 1400,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false,
});

cdp.ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.method === 'Runtime.exceptionThrown') {
    problems.push('EXCEPTION: ' + (msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text));
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    problems.push('CONSOLE ERROR: ' + msg.params.args.map((a) => a.value ?? a.description).join(' '));
  }
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    problems.push('LOG ERROR: ' + msg.params.entry.text);
  }
});

async function evalJs(expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}

async function shot(name) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  const path = join(outDir, `${name}.png`);
  writeFileSync(path, Buffer.from(r.data, 'base64'));
  console.log('shot:', path);
}

await cdp.send('Page.navigate', { url: PAGE });
await sleep(1200);

const t0 = await evalJs(`document.querySelector('h1')?.textContent || ''`);
console.log('intro heading:', JSON.stringify(t0));
await shot('01-intro');

// begin a fixed-seed game
await evalJs(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('fixed seed')).click(); true`);
await sleep(700);
console.log('after start, root class:', await evalJs(`document.querySelector('#app').firstElementChild.className`));
console.log('map svg present:', await evalJs(`!!document.querySelector('.map-svg')`));
console.log('measure tiles:', await evalJs(`document.querySelectorAll('.measure').length`));
await shot('02-game-start');

// set some measures and run a session
await evalJs(`
  (() => {
    const set = (label, v) => {
      const tile = [...document.querySelectorAll('.measure')].find(t => t.textContent.includes(label));
      if (!tile) return 'missing ' + label;
      const s = tile.querySelector('input[type=range]');
      s.value = String(v);
      s.dispatchEvent(new Event('input', {bubbles:true}));
      return 'ok';
    };
    return [set('Tsetse', 1), set('Deep wells', 1), set('Health service', 1)].join(',');
  })()
`);
console.log('sliders set:', await evalJs(`[...document.querySelectorAll('.slider')].map(s=>s.value).join(',')`));
await shot('03-measures-set');

await evalJs(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Commit')).click(); true`);
await sleep(900);
console.log('session after commit:', await evalJs(`document.querySelector('.clock-main')?.textContent`));
console.log('chart count:', await evalJs(`document.querySelectorAll('.chart-canvas svg').length`));
console.log('report lines:', await evalJs(`document.querySelectorAll('.report-line').length`));
await shot('04-session-2');

// run out the remaining sessions
for (let i = 0; i < 6; i++) {
  const hasCommit = await evalJs(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Commit'))`);
  const hasReport = await evalJs(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('final report'))`);
  if (hasReport) {
    await evalJs(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('final report')).click(); true`);
    await sleep(700);
    break;
  }
  if (hasCommit) {
    await evalJs(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Commit')).click(); true`);
    await sleep(700);
  } else break;
}

console.log('verdict:', await evalJs(`document.querySelector('.verdict-card h1')?.textContent || '(none)'`));
console.log('score:', await evalJs(`document.querySelector('.score-num')?.textContent || '(none)'`));
await shot('05-report');

const allChartsHaveNaNs = await evalJs(`
  [...document.querySelectorAll('path')].some(p => /NaN|Infinity/.test(p.getAttribute('d')||''))
`);
console.log('any NaN/Infinity in SVG paths:', allChartsHaveNaNs);

console.log('\n--- problems ---');
if (!problems.length) console.log('none');
else problems.forEach((p) => console.log(p));

cdp.close();
try { proc.kill(); } catch {}
process.exit(problems.length || allChartsHaveNaNs ? 1 : 0);
