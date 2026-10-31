// lohhausen/web/js/charts.js — dependency-free SVG line charts (classic script).
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs = {}, parent) {
    const n = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  }

  // values: [{key,label,color,data:[[month,value],...],dashed,step,area}]
  function render(svg, opts) {
    const o = Object.assign({ months: 120, yMin: null, yMax: null, yFormat: v => String(Math.round(v)), pad: { l: 46, r: 12, t: 12, b: 22 } }, opts);
    const W = 720, H = 260;
    svg.innerHTML = '';
    const series = o.series.filter(s => s.data && s.data.length);
    if (!series.length) return;
    // y range across all series (and any explicit bounds)
    let lo = Infinity, hi = -Infinity;
    for (const s of series) for (const [, v] of s.data) { if (v == null || !isFinite(v)) continue; lo = Math.min(lo, v); hi = Math.max(hi, v); }
    if (o.yMin != null) lo = Math.min(lo, o.yMin);
    if (o.yMax != null) hi = Math.max(hi, o.yMax);
    if (lo === hi) { hi = lo + 1; }
    if (hi - lo < Math.abs(hi) * 0.08) {          // a flat line still deserves an axis
      const mid = (hi + lo) / 2, half = Math.max(Math.abs(mid) * 0.06, 0.5);
      lo = mid - half; hi = mid + half;
    }
    const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
    const x = m => o.pad.l + (m / o.months) * (W - o.pad.l - o.pad.r);
    const y = v => H - o.pad.b - ((v - lo) / (hi - lo)) * (H - o.pad.t - o.pad.b);

    // grid + y labels
    for (let i = 0; i <= 4; i++) {
      const v = lo + (hi - lo) * (i / 4), yy = y(v);
      el('line', { class: i === 0 ? 'grid' : 'grid dim', x1: o.pad.l, x2: W - o.pad.r, y1: yy, y2: yy }, svg);
      el('text', { class: 'axis', x: o.pad.l - 6, y: yy + 3, 'text-anchor': 'end' }, svg).textContent = o.yFormat(v);
    }
    // x ticks: every 24 months + session marks
    for (let m = 0; m <= o.months; m += 24) {
      el('line', { class: 'grid dim', x1: x(m), x2: x(m), y1: H - o.pad.b, y2: H - o.pad.b + 4 }, svg);
      el('text', { class: 'axis', x: x(m), y: H - o.pad.b + 16, 'text-anchor': 'middle' }, svg).textContent = `yr ${m / 12}`;
    }
    for (const m of (o.sessionMarks || [])) el('line', { class: 'session-line', x1: x(m), x2: x(m), y1: o.pad.t, y2: H - o.pad.b }, svg);

    for (const s of series) {
      if (s.area) {
        let d = `M ${x(s.data[0][0])} ${y(lo)} `;
        for (const [m, v] of s.data) d += `L ${x(m)} ${y(isFinite(v) ? v : lo)} `;
        d += `L ${x(s.data[s.data.length - 1][0])} ${y(lo)} Z`;
        el('path', { class: 'area', d, fill: s.color, stroke: 'none' }, svg);
      }
      let d = '';
      let prev = null;
      for (const [m, v] of s.data) {
        if (v == null || !isFinite(v)) { prev = null; continue; }
        if (prev === null) d += `M ${x(m)} ${y(v)} `;
        else if (s.step) d += `L ${x(m)} ${y(prev)} L ${x(m)} ${y(v)} `;
        else d += `L ${x(m)} ${y(v)} `;
        prev = v;
      }
      el('path', { class: 'series' + (s.dashed ? ' dashed' : ''), d, stroke: s.color }, svg);
      const last = s.data[s.data.length - 1];
      if (last && isFinite(last[1])) el('circle', { class: 'dot', cx: x(last[0]), cy: y(last[1]), r: 3.4, fill: s.color }, svg);
      if (s.labelEnd) {
        const t = el('text', { class: 'label-line', x: Math.min(W - o.pad.r - 2, x(s.data[s.data.length - 1][0]) + 6), y: y(s.data[s.data.length - 1][1]) - 6 }, svg);
        t.textContent = s.labelEnd;
      }
    }
  }

  window.LHCharts = { render };
})();
