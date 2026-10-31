// tanaland/web/js/charts.js
// -----------------------------------------------------------------------------
// Tiny SVG line-chart renderer. No dependencies, no build step.
//
// Charts are the player's only window on the country, so their honest limits
// matter more than their beauty: we draw only what the Ministry would report,
// and we never draw groundwater or sod extent (H-16, low fidelity of feedback).
// -----------------------------------------------------------------------------

const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/**
 * Read a theme token. Charts must not carry colour literals: theme.css is the
 * single source of truth, so re-theming stays a one-file change.
 */
export function token(name, fallback = '#000') {
  if (typeof getComputedStyle !== 'function' || !document.documentElement) return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return (v || '').trim() || fallback;
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.mount
 * @param {{x:number,y:number}[]} opts.points
 * @param {number} [opts.height]
 * @param {string} [opts.color]
 * @param {string} [opts.fill]     colour under the line, or null
 * @param {number} [opts.yMin]
 * @param {number} [opts.yMax]
 * @param {number} [opts.threshold] optional dashed reference line at this y
 * @param {number} [opts.xMax]     force an x-axis maximum (so all charts align)
 * @param {string[]} [opts.bands]  shaded vertical session bands, as [x0,x1] pairs
 */
export function lineChart(opts) {
  const {
    mount,
    points,
    height = 130,
    color = token('--c-people', '#17795a'),
    fill = null,
    yMin,
    yMax,
    xMax,
    bands = [],
    showLast = true,
  } = opts;

  mount.innerHTML = '';
  const W = Math.max(220, mount.clientWidth || 320);
  const H = height;
  const padL = 6;
  const padR = 6;
  const padT = 10;
  const padB = 16;

  const svg = el('svg', {
    viewBox: `0 0 ${W} ${H}`,
    width: '100%',
    height: H,
    preserveAspectRatio: 'none',
    class: 'chart',
    role: 'img',
  });

  if (!points.length) {
    mount.appendChild(svg);
    return svg;
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = 0;
  const x1 = xMax || Math.max(...xs, 1);
  const lo = yMin !== undefined ? yMin : Math.min(...ys);
  const hi = yMax !== undefined ? yMax : Math.max(...ys);
  // Never let a flat series divide by zero.
  const span = hi - lo || Math.abs(hi) || 1;

  const px = (x) => padL + ((x - x0) / (x1 - x0 || 1)) * (W - padL - padR);
  const py = (y) => H - padB - ((y - lo) / span) * (H - padT - padB);

  // session bands (the six planning periods)
  for (const [b0, b1] of bands) {
    svg.appendChild(
      el('rect', {
        x: px(b0),
        y: padT,
        width: Math.max(0, px(b1) - px(b0)),
        height: H - padT - padB,
        fill: token('--c-band', 'rgba(23,33,28,.035)'),
      })
    );
  }

  // baseline
  svg.appendChild(
    el('line', {
      x1: padL,
      y1: H - padB,
      x2: W - padR,
      y2: H - padB,
      stroke: token('--c-grid', 'rgba(23,33,28,.10)'),
      'stroke-width': 1,
    })
  );

  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.x).toFixed(2)},${py(p.y).toFixed(2)}`).join(' ');

  if (fill) {
    const area = `${d} L${px(xs[xs.length - 1]).toFixed(2)},${H - padB} L${px(xs[0]).toFixed(2)},${H - padB} Z`;
    svg.appendChild(el('path', { d: area, fill, 'fill-opacity': '0.13', stroke: 'none' }));
  }

  svg.appendChild(
    el('path', {
      d,
      fill: 'none',
      stroke: color,
      'stroke-width': 1.8,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
      'vector-effect': 'non-scaling-stroke',
    })
  );

  // threshold line
  if (opts.threshold) {
    const ty = py(opts.threshold);
    if (ty > padT && ty < H - padB) {
      svg.appendChild(
        el('line', {
          x1: padL,
          y1: ty,
          x2: W - padR,
          y2: ty,
          stroke: token('--c-thresh', '#b03e2e'),
          'stroke-opacity': '0.45',
          'stroke-width': 1,
          'stroke-dasharray': '4 4',
        })
      );
    }
  }

  if (showLast) {
    const last = points[points.length - 1];
    svg.appendChild(
      el('circle', {
        cx: px(last.x),
        cy: py(last.y),
        r: 3,
        fill: color,
      })
    );
  }

  mount.appendChild(svg);
  return svg;
}

/** A compact sparkline sized for a stat tile. */
export function sparkline(mount, points, color = token('--c-people', '#17795a')) {
  return lineChart({ mount, points, height: 44, color, fill: color, showLast: true });
}
