// Term charts: draw any monthly series from the simulation over the full
// 24 months, in the ledger's paper idiom. Plain canvas, no dependencies.

import { monthLabel } from "./sim.js?v=76";

function seeded(seed) {
  let v = seed % 2147483647;
  return () => { v = (v * 16807) % 2147483647; return (v - 1) / 2147483646; };
}

// chart defs: key, label, colour, format
export const TERM_CHARTS = [
  {
    key: "inflation", tab: "Prices", title: "Inflation — how fast prices rise",
    sub: "annual inflation, %", color: "#b03e2e", hasHistory: true,
    hint: "This line must come down. A falling line means the currency reforms are working.",
    direction: "LOWER IS BETTER", fmt: (v) => `${Math.round(v)} %`
  },
  {
    key: "unemployment", tab: "Jobs", title: "Unemployment",
    sub: "official rate, % of the workforce", color: "#b5761a", hasHistory: true,
    hint: "Rises when factories close. Falls only when the new firms start hiring.",
    direction: "LOWER IS BETTER", fmt: (v) => `${v.toFixed(1)} %`
  },
  {
    key: "realWage", tab: "Wages", title: "Real wages — what a salary buys",
    sub: "index, 1991 = 100", color: "#17795a", hasHistory: true,
    hint: "Fell by half before you took office. Recovery here is slow, and it is the point of everything.",
    direction: "HIGHER IS BETTER", fmt: (v) => `${Math.round(v)}`
  },
  {
    key: "budget", tab: "Budget", title: "The state's monthly balance",
    sub: "revenue minus spending, millions of krooni", color: "#2f6b8f", hasHistory: false,
    hint: "Above zero means the state lives within its means. Below zero is borrowed.",
    direction: "ABOVE ZERO IS SAFE", fmt: (v) => `${v > 0 ? "+" : ""}${v.toFixed(0)} M kr`
  },
  {
    key: "enterprises", tab: "Firms", title: "New enterprises",
    sub: "registered businesses", color: "#3d9c78", hasHistory: true,
    hint: "The economy being born. Growth here is what replaces the dying factories.",
    direction: "HIGHER IS BETTER", fmt: (v) => Math.round(v).toLocaleString("en-US")
  }
];

function paper(ctx, w, h) {
  ctx.fillStyle = "#fbfaf7";
  ctx.fillRect(0, 0, w, h);
}

// The country before you took office: January 1990 → October 1992, roughly as
// the statistical office recorded it. Soviet decline, the 1991 price shock,
// the 1992 collapse — the ground your term is fought on.
const HISTORY_ANCHORS = [
  { m: 0,  inflation: 10,  output: 99, realWage: 100, unemployment: 0,   enterprises: 30 },
  { m: 11, inflation: 30,  output: 96, realWage: 100, unemployment: 0,   enterprises: 120 },
  { m: 14, inflation: 60,  output: 88, realWage: 100, unemployment: 0,   enterprises: 250 },
  { m: 16, inflation: 210, output: 84, realWage: 100, unemployment: 0,   enterprises: 300 },
  { m: 23, inflation: 250, output: 78, realWage: 100, unemployment: 0,   enterprises: 400 },
  { m: 24, inflation: 87,  output: 71, realWage: 88,  unemployment: 0.3, enterprises: 800 },
  { m: 27, inflation: 105, output: 68, realWage: 78,  unemployment: 0.8, enterprises: 1000 },
  { m: 30, inflation: 190, output: 65, realWage: 66,  unemployment: 2.2, enterprises: 1300 },
  { m: 33, inflation: 500, output: 62, realWage: 55,  unemployment: 3.8, enterprises: 1800 }
];
const HISTORY_KEYS = ["inflation", "output", "realWage", "unemployment", "enterprises"];
const MONTH_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export const TERM_HISTORY = (() => {
  const out = [];
  for (let m = 0; m < 34; m += 1) {
    const rec = { label: `${MONTH_SHORT[m % 12]} ${90 + Math.floor(m / 12)}` };
    HISTORY_KEYS.forEach((key) => {
      let a = HISTORY_ANCHORS[0], b = HISTORY_ANCHORS[HISTORY_ANCHORS.length - 1];
      for (let i = 0; i < HISTORY_ANCHORS.length - 1; i += 1) {
        if (m >= HISTORY_ANCHORS[i].m && m <= HISTORY_ANCHORS[i + 1].m) {
          a = HISTORY_ANCHORS[i]; b = HISTORY_ANCHORS[i + 1];
          break;
        }
      }
      const t = b.m === a.m ? 0 : (m - a.m) / (b.m - a.m);
      rec[key] = Math.round((a[key] + (b[key] - a[key]) * t) * 10) / 10;
    });
    out.push(rec);
  }
  return out;
})();

// Draw one series chart. series = sim.series; def = TERM_CHARTS entry.
// markers = [{ month }] — decisions, drawn as dashed rules where they landed.
export function drawTermChart(ctx, w, h, series, def, markers = [], history = null) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  const left = 110;
  const right = w - 44;
  const top = 140;
  const bottom = h - 66;

  const full = history ? history.concat(series) : series;
  const boundary = history ? history.length : 0;

  // header: the series name, and its latest reading
  ctx.textAlign = "left";
  ctx.fillStyle = "#161a17";
  ctx.font = "650 22px Inter, system-ui, sans-serif";
  ctx.fillText(def.title, 34, 44);
  ctx.fillStyle = "#78837b";
  ctx.font = "500 14px ui-monospace, Menlo, monospace";
  ctx.fillText(def.sub.toUpperCase(), 34, 72);
  ctx.fillStyle = "#3f4a43";
  ctx.font = "italic 16px Inter, system-ui, sans-serif";
  ctx.fillText(def.hint, 34, 106);
  if (!series.length) {
    ctx.fillStyle = "#a3aba3";
    ctx.font = "italic 14px Georgia, serif";
    ctx.fillText("The term has not begun.", left, (top + bottom) / 2);
    return;
  }

  const values = full.map((r) => r[def.key]);
  const last = values[values.length - 1];
  ctx.textAlign = "right";
  ctx.fillStyle = def.color;
  ctx.font = "700 24px Inter, system-ui, sans-serif";
  ctx.fillText(def.fmt(last), w - 34, 52);
  ctx.fillStyle = "#a3aba3";
  ctx.font = "620 12px ui-monospace, Menlo, monospace";
  ctx.fillText(def.direction, w - 34, 76);

  const maxV = Math.max(...values, 1);
  const minV = Math.min(...values, 0);
  const span = (maxV - minV) || 1;
  const hi = maxV + span * 0.14;
  const lo = Math.max(0, minV - span * 0.1);

  // gridlines: few and faint, labelled on the left
  ctx.font = "500 13px ui-monospace, Menlo, monospace";
  for (let i = 0; i <= 4; i += 1) {
    const y = top + ((bottom - top) * i) / 4;
    ctx.strokeStyle = "rgba(22,26,23,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.fillStyle = "#a3aba3";
    ctx.textAlign = "right";
    ctx.fillText(def.fmt(hi - ((hi - lo) * i) / 4), left - 8, y + 3);
  }

  const pointAt = (i) => ({
    x: left + ((right - left) * i) / Math.max(1, values.length - 1),
    y: bottom - ((values[i] - lo) / (hi - lo)) * (bottom - top)
  });
  const labelOf = (i) => full[i].label || (() => { const l = monthLabel(full[i].month); return `${l.slice(0, 3).toUpperCase()} ${l.slice(-4)}`; })();

  // ticks on the floor, every six months
  ctx.textAlign = "center";
  for (let i = 0; i < values.length; i += 6) {
    const p = pointAt(i);
    ctx.strokeStyle = "rgba(22,26,23,0.05)";
    ctx.beginPath();
    ctx.moveTo(p.x, top);
    ctx.lineTo(p.x, bottom);
    ctx.stroke();
    ctx.fillStyle = "#a3aba3";
    ctx.fillText(labelOf(i), p.x, bottom + 34);
  }
  ctx.textAlign = "left";

  // the take-office boundary: everything left of it is history
  if (history && boundary > 0 && boundary < values.length) {
    const p = pointAt(boundary);
    ctx.strokeStyle = "rgba(22,26,23,0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(p.x, top - 10);
    ctx.lineTo(p.x, bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#78837b";
    ctx.font = "620 12px ui-monospace, Menlo, monospace";
    ctx.textAlign = "left";
    ctx.fillText("YOU TAKE OFFICE", p.x + 5, top - 2);
  }

  // decision markers: the months the calendar forced a choice
  for (const marker of markers) {
    let idx = series.findIndex((r) => r.month >= marker.month);
    if (idx === -1) idx = series.length - 1;
    if (idx < 0) continue;
    const p = pointAt(idx);
    const atEnd = idx === series.length - 1;
    const x = atEnd ? p.x + 8 : p.x; // a pending decision sits just past the line
    ctx.strokeStyle = "rgba(22,26,23,0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, top - 4);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#161a17";
    ctx.beginPath();
    ctx.moveTo(x - 4, top - 8);
    ctx.lineTo(x + 4, top - 8);
    ctx.lineTo(x, top - 2);
    ctx.closePath();
    ctx.fill();
  }

  // the history segment: thinner, quieter
  const histEnd = history ? boundary - 1 : -1;
  if (histEnd >= 1) {
    ctx.strokeStyle = def.color + "66";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i <= histEnd; i += 1) {
      const p = pointAt(i);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  // the term segment: the area under it, barely there, then the line
  const termStart = history ? boundary - 1 : 0;
  ctx.beginPath();
  for (let i = termStart; i < values.length; i += 1) {
    const p = pointAt(i);
    if (i === termStart) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  const lastP = pointAt(values.length - 1);
  const firstP = pointAt(termStart);
  ctx.lineTo(lastP.x, bottom);
  ctx.lineTo(firstP.x, bottom);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, top, 0, bottom);
  grad.addColorStop(0, def.color + "1f");
  grad.addColorStop(1, def.color + "05");
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = def.color;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = termStart; i < values.length; i += 1) {
    const p = pointAt(i);
    if (i === termStart) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  // one dot: where we are now
  ctx.beginPath();
  ctx.arc(lastP.x, lastP.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = def.color;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function termChartUrl(series, def, w = 760, h = 300, markers = [], history = null) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  drawTermChart(canvas.getContext("2d"), w, h, series, def, markers, history);
  return canvas.toDataURL("image/png");
}

// ── the long view: GDP per person, 1993 – today, current US dollars ──
// Roughly as the World Bank tells it. Finland is the yardstick across the Gulf.
export const HISTORY_YEARS = [1993, 1998, 2003, 2008, 2013, 2018, 2023];
export const HISTORY_GDP = [
  { name: "ESTONIA", color: "#b03e2e", width: 5, values: [705, 3900, 5650, 18800, 19100, 23300, 30150] },
  { name: "LATVIA", color: "#78837b", width: 2.5, values: [690, 2560, 4150, 15400, 15300, 18000, 22420] },
  { name: "LITHUANIA", color: "#3d9c78", width: 2.5, values: [850, 3100, 4900, 17400, 19700, 20600, 27100] },
  { name: "FINLAND", color: "#2f6b8f", width: 2.5, values: [16900, 25700, 39600, 51300, 49800, 53700, 53700] }
];

export function drawHistoryChart(ctx, width, height, options = {}) {
  const ink = options.ink || "#ece4d2";
  const faint = options.faint || "#9a917c";
  const left = 96;
  const right = width - 150;
  const top = options.title === false ? 60 : 150;
  const bottom = height - 80;
  const max = 55000;

  if (options.title !== false) {
    ctx.fillStyle = ink;
    ctx.font = "bold 30px Georgia";
    ctx.fillText("WHERE IT LED", 44, 62);
    ctx.font = "14px monospace";
    ctx.fillStyle = faint;
    ctx.fillText("GDP PER PERSON, 1993 – TODAY · CURRENT DOLLARS · WORLD BANK", 44, 90);
    ctx.strokeStyle = "#3b382c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(44, 112);
    ctx.lineTo(width - 44, 112);
    ctx.stroke();
  }

  ctx.font = "12px monospace";
  for (let v = 0; v <= max; v += 10000) {
    const y = bottom - (v / max) * (bottom - top);
    ctx.strokeStyle = "rgba(23,33,28,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.fillStyle = faint;
    ctx.textAlign = "right";
    ctx.fillText(v === 0 ? "0" : `$${v / 1000}k`, left - 10, y + 4);
  }

  const pointAt = (values, index) => ({
    x: left + ((right - left) * index) / (HISTORY_YEARS.length - 1),
    y: bottom - (values[index] / max) * (bottom - top)
  });

  ctx.textAlign = "center";
  HISTORY_YEARS.forEach((year, index) => {
    const x = left + ((right - left) * index) / (HISTORY_YEARS.length - 1);
    ctx.strokeStyle = "rgba(23,33,28,0.07)";
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.fillStyle = faint;
    ctx.fillText(String(year), x, bottom + 22);
  });
  ctx.textAlign = "left";

  HISTORY_GDP.forEach((series) => {
    ctx.strokeStyle = series.color;
    ctx.lineWidth = series.width;
    ctx.lineJoin = "round";
    ctx.beginPath();
    series.values.forEach((_, index) => {
      const p = pointAt(series.values, index);
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    const last = pointAt(series.values, series.values.length - 1);
    ctx.beginPath();
    ctx.arc(last.x, last.y, series.width + 2, 0, Math.PI * 2);
    ctx.fillStyle = series.color;
    ctx.fill();
    ctx.fillStyle = series.color;
    ctx.font = `bold ${series.width >= 5 ? 15 : 12}px monospace`;
    ctx.fillText(series.name, Math.min(last.x + 12, width - 60), last.y - 6);
  });

  const first = pointAt(HISTORY_GDP[0].values, 0);
  ctx.fillStyle = "#b03e2e";
  ctx.font = "bold 13px monospace";
  ctx.fillText("$705", first.x + 8, first.y - 8);
}

export function historyChartUrl(width = 1080, height = 580) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fbfaf7";
  ctx.fillRect(0, 0, width, height);
  drawHistoryChart(ctx, width, height, { ink: "#17211c", faint: "#78837b", title: true });
  return canvas.toDataURL("image/png");
}
