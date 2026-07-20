/* The growing code — hand-rolled SVG charts, no libraries. */

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const el = (n, a = {}) => {
  const e = document.createElementNS(NS, n);
  for (const k in a) e.setAttribute(k, a[k]);
  return e;
};
const fmt = n => n.toLocaleString('en-US');
const tip = $('tip');

function showTip(evt, html) {
  tip.innerHTML = html;
  tip.classList.add('on');
  const r = tip.getBoundingClientRect();
  let x = evt.clientX + 16, y = evt.clientY - r.height / 2;
  if (x + r.width > innerWidth - 10) x = evt.clientX - r.width - 16;
  y = Math.max(8, Math.min(y, innerHeight - r.height - 8));
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}
const hideTip = () => tip.classList.remove('on');

/* Choose ~5 round tick values spanning [lo, hi]. */
function ticks(lo, hi, want = 5) {
  const span = hi - lo || 1;
  const raw = span / want;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || 10 * mag;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/* ---------------- line chart ---------------- */

function lineChart(mount, opts) {
  const { series, W = 760, H = 340, pad = { t: 16, r: 74, b: 34, l: 56 },
          zeroBase = false, baseline = null, valueKey = 'value',
          fmtVal = fmt, directLabels = true, yLabel = '' } = opts;

  mount.innerHTML = '';
  const years = [...new Set(series.flatMap(s => s.points.map(p => p.year)))].sort();
  const x0 = Math.min(...years), x1 = Math.max(...years);
  const all = series.flatMap(s => s.points.map(p => p[valueKey]));
  let lo = zeroBase ? 0 : Math.min(...all), hi = Math.max(...all);
  const padY = (hi - lo) * 0.08 || 1;
  if (!zeroBase) lo -= padY;
  hi += padY;
  if (zeroBase) lo = 0;

  const X = y => pad.l + (y - x0) / ((x1 - x0) || 1) * (W - pad.l - pad.r);
  const Y = v => H - pad.b - (v - lo) / ((hi - lo) || 1) * (H - pad.t - pad.b);

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img' });
  svg.appendChild(el('title')).textContent = opts.a11y || 'Line chart';

  ticks(lo, hi).forEach(v => {
    svg.appendChild(el('line', { class: 'grid-line', x1: pad.l, x2: W - pad.r, y1: Y(v), y2: Y(v) }));
    const t = el('text', { class: 'tick', x: pad.l - 9, y: Y(v) + 3.5, 'text-anchor': 'end' });
    t.textContent = fmtVal(v);
    svg.appendChild(t);
  });
  if (baseline != null && baseline >= lo && baseline <= hi)
    svg.appendChild(el('line', { class: 'base-line', x1: pad.l, x2: W - pad.r, y1: Y(baseline), y2: Y(baseline) }));

  svg.appendChild(el('line', { class: 'axis-line', x1: pad.l, x2: W - pad.r, y1: H - pad.b, y2: H - pad.b }));

  const step = years.length > 18 ? 5 : years.length > 8 ? 2 : 1;
  years.forEach((y, i) => {
    if (i % step && y !== x1) return;
    const t = el('text', { class: 'tick', x: X(y), y: H - pad.b + 16, 'text-anchor': 'middle' });
    t.textContent = String(y);
    svg.appendChild(t);
  });

  series.forEach(s => {
    const pts = s.points.filter(p => p[valueKey] != null);
    svg.appendChild(el('path', {
      class: 'series-line', stroke: s.color,
      d: pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.year).toFixed(1)},${Y(p[valueKey]).toFixed(1)}`).join('')
    }));
    const last = pts[pts.length - 1];
    svg.appendChild(el('circle', { class: 'series-dot', cx: X(last.year), cy: Y(last[valueKey]), r: 4.5, fill: s.color }));
    if (directLabels) {
      const t = el('text', { class: 'direct-label', x: X(last.year) + 10, y: Y(last[valueKey]) + 4, fill: s.color });
      t.textContent = s.label;
      svg.appendChild(t);
    }
  });

  /* crosshair + tooltip */
  const cross = el('line', { class: 'crosshair', y1: pad.t, y2: H - pad.b, x1: 0, x2: 0, opacity: 0 });
  svg.appendChild(cross);
  const dots = el('g');
  svg.appendChild(dots);
  const hit = el('rect', { x: pad.l, y: pad.t, width: W - pad.l - pad.r, height: H - pad.t - pad.b, fill: 'transparent' });
  svg.appendChild(hit);

  function move(evt) {
    const box = svg.getBoundingClientRect();
    const px = (evt.clientX - box.left) / box.width * W;
    const yr = Math.round(x0 + (px - pad.l) / ((W - pad.l - pad.r) || 1) * (x1 - x0));
    const year = Math.max(x0, Math.min(x1, yr));
    cross.setAttribute('x1', X(year));
    cross.setAttribute('x2', X(year));
    cross.setAttribute('opacity', 1);
    dots.innerHTML = '';
    let rows = '';
    series.forEach(s => {
      const p = s.points.find(q => q.year === year);
      if (!p || p[valueKey] == null) return;
      dots.appendChild(el('circle', { class: 'series-dot', cx: X(year), cy: Y(p[valueKey]), r: 4.5, fill: s.color }));
      rows += `<div class="tip-row"><span class="swatch" style="background:${s.color}"></span>${s.label}<b>${fmtVal(p[valueKey])}</b></div>`;
    });
    if (!rows) return;
    showTip(evt, `<span class="tip-yr">${year}${yLabel}</span>${rows}`);
  }
  hit.addEventListener('mousemove', move);
  hit.addEventListener('mouseleave', () => { cross.setAttribute('opacity', 0); dots.innerHTML = ''; hideTip(); });

  mount.appendChild(svg);
}

/* ---------------- stacked bars ---------------- */

function stackedBars(mount, rows, keys, W = 760, H = 360) {
  const pad = { t: 16, r: 14, b: 34, l: 60 };
  mount.innerHTML = '';
  const hi = Math.max(...rows.map(r => keys.reduce((a, k) => a + r[k.key], 0))) * 1.05;
  const bw = (W - pad.l - pad.r) / rows.length;
  const Y = v => H - pad.b - v / hi * (H - pad.t - pad.b);

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img' });
  svg.appendChild(el('title')).textContent = 'Federal Register pages by document category, 2000 to 2025, stacked bars';

  ticks(0, hi).forEach(v => {
    svg.appendChild(el('line', { class: 'grid-line', x1: pad.l, x2: W - pad.r, y1: Y(v), y2: Y(v) }));
    const t = el('text', { class: 'tick', x: pad.l - 9, y: Y(v) + 3.5, 'text-anchor': 'end' });
    t.textContent = v >= 1000 ? (v / 1000) + 'k' : v;
    svg.appendChild(t);
  });
  svg.appendChild(el('line', { class: 'axis-line', x1: pad.l, x2: W - pad.r, y1: H - pad.b, y2: H - pad.b }));

  rows.forEach((r, i) => {
    const x = pad.l + i * bw + bw * 0.14;
    const w = bw * 0.72;
    let acc = 0;
    const g = el('g');
    keys.forEach(k => {
      const v = r[k.key];
      const y = Y(acc + v), h = Math.max(0, Y(acc) - Y(acc + v) - 2); /* 2px surface gap */
      if (h > 0) g.appendChild(el('rect', { x, y, width: w, height: h, fill: k.color, rx: 1.5 }));
      acc += v;
    });
    const total = acc;
    const hit = el('rect', { x: pad.l + i * bw, y: pad.t, width: bw, height: H - pad.t - pad.b, fill: 'transparent' });
    hit.addEventListener('mousemove', e => showTip(e,
      `<span class="tip-yr">${r.year}</span>` +
      keys.map(k => `<div class="tip-row"><span class="swatch block" style="background:${k.color}"></span>${k.label}<b>${fmt(r[k.key])}</b></div>`).join('') +
      `<div class="tip-row" style="border-top:1px solid #4a443a;margin-top:5px;padding-top:5px">Total<b>${fmt(total)}</b></div>`));
    hit.addEventListener('mouseleave', hideTip);
    g.appendChild(hit);
    svg.appendChild(g);

    if (i % 5 === 0 || i === rows.length - 1) {
      const t = el('text', { class: 'tick', x: pad.l + i * bw + bw / 2, y: H - pad.b + 16, 'text-anchor': 'middle' });
      t.textContent = String(r.year);
      svg.appendChild(t);
    }
  });
  mount.appendChild(svg);
}

/* ---------------- tables ---------------- */

function table(mount, head, rows) {
  mount.innerHTML = '';
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr>' + head.map(h => `<th>${h}</th>`).join('') + '</tr>';
  const tbody = document.createElement('tbody');
  tbody.innerHTML = rows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('');
  const tab = document.createElement('table');
  tab.appendChild(thead); tab.appendChild(tbody);
  mount.appendChild(tab);
}

/* ---------------- build ---------------- */

(async function () {
  const D = await (await fetch('data/data.json')).json();
  const F = D.flow;
  const order = ['nyc', 'nys', 'fed'];

  /* --- 1. indexed --- */
  const idxSeries = order.map(k => ({
    label: F[k].label, color: F[k].color,
    points: F[k].series.map(p => ({ year: p.year, value: p.index }))
  }));
  $('legendIndex').innerHTML = order.map(k =>
    `<span><i class="swatch" style="background:${F[k].color}"></i>${F[k].label} &mdash; ${F[k].sublabel}</span>`).join('');

  /* Always zero-based: the lowest index value in the data is ~17, so a non-zero
     baseline would land on the same ticks and the toggle would do nothing. */
  const drawIndex = () => lineChart($('chartIndex'), {
    series: idxSeries, zeroBase: true, baseline: 100,
    fmtVal: v => Math.round(v), yLabel: '  ·  index, 2000 = 100',
    a11y: 'Laws enacted per year indexed to 2000 equals 100, for New York City, New York state and the federal government'
  });
  drawIndex();

  const allYears = [...new Set(order.flatMap(k => F[k].series.map(p => p.year)))].sort();
  const at = (k, y, f) => { const p = F[k].series.find(q => q.year === y); return p ? f(p) : '—'; };
  $('btnIndexTable').addEventListener('click', e => {
    const on = $('tableIndex').hidden;
    $('tableIndex').hidden = !on;
    e.currentTarget.setAttribute('aria-pressed', String(on));
    if (on) table($('tableIndex'),
      ['Year', 'NYC laws', 'NYC index', 'NYS laws', 'NYS index', 'Federal laws', 'Federal index'],
      allYears.map(y => [y,
        at('nyc', y, p => fmt(p.value)), at('nyc', y, p => p.index),
        at('nys', y, p => fmt(p.value)), at('nys', y, p => p.index),
        at('fed', y, p => fmt(p.value)), at('fed', y, p => p.index)]));
  });

  /* --- 2. small multiples --- */
  $('smalls').innerHTML = order.map(k =>
    `<div class="small">
       <h3>${F[k].label}</h3>
       <p class="small-sub">${F[k].sublabel} per year</p>
       <p class="small-delta" style="color:${F[k].color}">${deltaText(F[k])}</p>
       <div id="sm_${k}"></div>
     </div>`).join('');
  order.forEach(k => lineChart($('sm_' + k), {
    series: [{ label: '', color: F[k].color, points: F[k].series }],
    W: 400, H: 210, pad: { t: 12, r: 14, b: 30, l: 44 },
    zeroBase: true, directLabels: false,
    a11y: `${F[k].label}, ${F[k].sublabel} per year, 2000 to ${F[k].last_year}`
  }));

  function deltaText(s) {
    const avg = (a, b) => {
      const v = s.series.filter(p => p.year >= a && p.year <= b).map(p => p.value);
      return v.reduce((x, y) => x + y, 0) / v.length;
    };
    const e = avg(2000, 2004), l = avg(2020, 2024);
    const pct = Math.round((l / e - 1) * 100);
    return `${Math.round(e)}/yr in 2000–04 → ${Math.round(l)}/yr in 2020–24 (${pct > 0 ? '+' : ''}${pct}%)`;
  }

  /* --- 3. stock vs flow --- */
  const S = D.stock_vs_flow;
  let cfrZero = false, frZero = false;
  const drawCfr = () => lineChart($('chartCfr'), {
    series: [{ label: '', color: '#3a5aa8', points: S.cfr.series }],
    W: 480, H: 280, pad: { t: 14, r: 18, b: 32, l: 58 },
    zeroBase: cfrZero, directLabels: false,
    fmtVal: v => v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v),
    yLabel: '  ·  pages in the code',
    a11y: 'Total pages in the Code of Federal Regulations, 2000 to 2024'
  });
  const drawFr = () => lineChart($('chartFrp'), {
    series: [{ label: '', color: '#9c2226', points: S.frp.series }],
    W: 480, H: 280, pad: { t: 14, r: 18, b: 32, l: 58 },
    zeroBase: frZero, directLabels: false,
    fmtVal: v => v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v),
    yLabel: '  ·  pages published',
    a11y: 'Federal Register pages published per year, 2000 to 2025'
  });
  drawCfr(); drawFr();
  $('btnCfrZero').addEventListener('click', e => {
    cfrZero = !cfrZero; e.currentTarget.setAttribute('aria-pressed', String(cfrZero)); drawCfr();
  });
  $('btnFrZero').addEventListener('click', e => {
    frZero = !frZero; e.currentTarget.setAttribute('aria-pressed', String(frZero)); drawFr();
  });

  /* --- 4. categories --- */
  const P = D.palette;
  const keys = [
    { key: 'notices', label: 'Notices', color: P.cat_notices },
    { key: 'rules', label: 'Rules', color: P.cat_rules },
    { key: 'proposed_rules', label: 'Proposed rules', color: P.cat_proposed },
    { key: 'presidential', label: 'Presidential documents', color: P.cat_presidential }
  ];
  $('legendCat').innerHTML = keys.map(k =>
    `<span><i class="swatch block" style="background:${k.color}"></i>${k.label}</span>`).join('');
  stackedBars($('chartCat'), D.fr_categories.series, keys);

  lineChart($('chartPres'), {
    series: [{ label: '', color: P.cat_presidential,
               points: D.fr_categories.series.map(r => ({ year: r.year, value: r.presidential })) }],
    W: 760, H: 220, pad: { t: 14, r: 18, b: 32, l: 50 },
    zeroBase: true, directLabels: false,
    yLabel: '  ·  pages of presidential documents',
    a11y: 'Pages of presidential documents in the Federal Register per year, 2000 to 2025'
  });
  $('btnCatTable').addEventListener('click', e => {
    const on = $('tableCat').hidden;
    $('tableCat').hidden = !on;
    e.currentTarget.setAttribute('aria-pressed', String(on));
    if (on) table($('tableCat'),
      ['Year', ...keys.map(k => k.label), 'Total'],
      D.fr_categories.series.map(r => [r.year, ...keys.map(k => fmt(r[k.key])), fmt(keys.reduce((a, k) => a + r[k.key], 0))]));
  });

  /* --- AI caution popover --- */
  $('aiCautionBtn').addEventListener('click', () => {
    $('aiCautionPop').hidden = !$('aiCautionPop').hidden;
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.ai-caution-pop') && !e.target.closest('.ai-caution-btn'))
      $('aiCautionPop').hidden = true;
  });

  addEventListener('resize', () => { drawIndex(); drawCfr(); drawFr(); });
})();
