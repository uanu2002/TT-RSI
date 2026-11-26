/* Minimal SVG chart helpers for the TT-RSI page (no dependencies).
   Specs: hairline grid/axes, 2px lines, >=8px markers with a 2px surface ring,
   bars <=24px with 4px rounded data-end, crosshair + tooltip on hover/focus,
   text in ink tokens (never series colors). */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const SURFACE = "#ffffff";

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function text(parent, x, y, str, attrs) {
    const t = el("text", Object.assign({ x, y }, attrs || {}), parent);
    t.textContent = str;
    return t;
  }
  function scale(d0, d1, r0, r1) {
    const f = (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
    f.invert = (p) => d0 + ((p - r0) / (r1 - r0)) * (d1 - d0);
    return f;
  }
  function marker(parent, shape, x, y, color, r) {
    r = r || 4.5;
    const ring = { stroke: SURFACE, "stroke-width": 2, fill: color, "paint-order": "stroke" };
    if (shape === "square") return el("rect", Object.assign({ x: x - r, y: y - r, width: 2 * r, height: 2 * r, rx: 1.5 }, ring), parent);
    if (shape === "diamond") {
      const d = r * 1.3;
      return el("path", Object.assign({ d: `M${x},${y - d}L${x + d},${y}L${x},${y + d}L${x - d},${y}Z` }, ring), parent);
    }
    if (shape === "triangle" || shape === "tri-down") {
      const s = shape === "triangle" ? 1 : -1, d = r * 1.35;
      return el("path", Object.assign({ d: `M${x},${y - s * d}L${x + d},${y + s * d * 0.75}L${x - d},${y + s * d * 0.75}Z` }, ring), parent);
    }
    return el("circle", Object.assign({ cx: x, cy: y, r }, ring), parent);
  }

  /* ---------- tooltip ---------- */
  function makeTooltip(container) {
    const tt = document.createElement("div");
    tt.className = "tooltip";
    tt.setAttribute("role", "status");
    container.appendChild(tt);
    return tt;
  }
  function fillTooltip(tt, title, rows) {
    tt.replaceChildren();
    if (title) {
      const h = document.createElement("div");
      h.className = "tt-title";
      h.textContent = title;
      tt.appendChild(h);
    }
    rows.forEach((r) => {
      const row = document.createElement("div");
      row.className = "tt-row";
      const k = document.createElement("span");
      k.className = "k" + (r.rect ? " rect" : "");
      k.style.background = r.color;
      const v = document.createElement("b");
      v.textContent = r.value;
      const l = document.createElement("span");
      l.textContent = r.label;
      row.append(k, v, l);
      tt.appendChild(row);
    });
  }
  function placeTooltip(tt, container, px, py) {
    const cw = container.clientWidth;
    tt.classList.add("on");
    const w = tt.offsetWidth;
    let left = px + 16;
    if (left + w > cw) left = px - w - 16;
    tt.style.left = Math.max(0, left) + "px";
    tt.style.top = Math.max(0, py - 10) + "px";
  }

  function onResize(container, fn) {
    let last = 0;
    const ro = new ResizeObserver(() => {
      const w = Math.round(container.clientWidth);
      if (w && w !== last) { last = w; fn(w); }
    });
    ro.observe(container);
  }

  function legend(target, items) {
    if (!target) return;
    target.replaceChildren();
    items.forEach((it) => {
      const s = document.createElement("span");
      const k = document.createElement("i");
      k.className = it.rect ? "k-rect" : "k-line";
      k.style.background = it.color;
      const t = document.createElement("span");
      t.textContent = it.name;
      s.append(k, t);
      target.appendChild(s);
    });
  }

  /* ---------- line chart ---------- */
  // opts: {height, x:{min,max,ticks,fmt,title}, y:{...}, series:[{name,color,data:[[x,y]],shape}],
  //        ref:{y,label}, annotate(g, sx, sy, plot), hover(xValue) -> {x, title, rows, points:[[x,y,color,shape]]}}
  function lineChart(container, opts) {
    let state = opts;
    const tt = makeTooltip(container);
    let svg;
    function render(width) {
      const o = state;
      if (svg) svg.remove();
      const H = o.height || 280;
      const m = Object.assign({ top: o.y.title ? 30 : 14, right: 16, bottom: o.x.title ? 44 : 28, left: 44 }, o.margin || {});
      const W = width;
      svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": o.aria || "" });
      container.insertBefore(svg, tt);
      const sx = scale(o.x.min, o.x.max, m.left, W - m.right);
      const sy = scale(o.y.min, o.y.max, H - m.bottom, m.top);
      const plot = { left: m.left, right: W - m.right, top: m.top, bottom: H - m.bottom, W, H };

      const grid = el("g", { class: "grid" }, svg);
      const yt = el("g", { class: "tick" }, svg);
      o.y.ticks.forEach((v) => {
        const y = Math.round(sy(v)) + 0.5;
        el("line", { x1: plot.left, x2: plot.right, y1: y, y2: y }, grid);
        text(yt, plot.left - 8, y + 4, o.y.fmt ? o.y.fmt(v) : v, { "text-anchor": "end" });
      });
      el("line", { class: "baseline", x1: plot.left, x2: plot.right, y1: plot.bottom + 0.5, y2: plot.bottom + 0.5 }, svg);
      const xt = el("g", { class: "tick" }, svg);
      o.x.ticks.forEach((v) => text(xt, sx(v), plot.bottom + 18, o.x.fmt ? o.x.fmt(v) : v, { "text-anchor": "middle" }));
      if (o.x.title) text(svg, (plot.left + plot.right) / 2, H - 6, o.x.title, { class: "axis-title", "text-anchor": "middle" });
      if (o.y.title) text(svg, Math.max(2, plot.left - 34), 13, o.y.title, { class: "axis-title" });

      if (o.ref) {
        const y = Math.round(sy(o.ref.y)) + 0.5;
        el("line", { x1: plot.left, x2: plot.right, y1: y, y2: y, stroke: "#9aa3ae", "stroke-width": 1 }, svg);
        if (o.ref.label) text(svg, plot.right - 2, y + 14, o.ref.label, { class: "lbl-2", "text-anchor": "end" });
      }
      if (o.under) o.under(svg, sx, sy, plot);

      o.series.forEach((s) => {
        const d = s.data.map((p, i) => (i ? "L" : "M") + sx(p[0]).toFixed(1) + "," + sy(p[1]).toFixed(1)).join("");
        el("path", { d, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
      });
      o.series.forEach((s) => {
        if (s.markers === false) return;
        const g = el("g", {}, svg);
        s.data.forEach((p) => marker(g, s.shape, sx(p[0]), sy(p[1]), s.color, s.r || 4));
      });
      if (o.annotate) o.annotate(svg, sx, sy, plot);

      // hover layer
      if (o.hover) {
        const cross = el("line", { class: "crosshair", y1: plot.top, y2: plot.bottom, visibility: "hidden" }, svg);
        const hl = el("g", {}, svg);
        const hit = el("rect", { class: "hit", x: plot.left - 10, y: 0, width: plot.right - plot.left + 20, height: H, tabindex: 0 }, svg);
        const show = (xv, py) => {
          const r = o.hover(xv);
          if (!r) return;
          const cx = sx(r.x);
          cross.setAttribute("x1", cx);
          cross.setAttribute("x2", cx);
          cross.setAttribute("visibility", "visible");
          hl.replaceChildren();
          (r.points || []).forEach((p) => marker(hl, p[3], sx(p[0]), sy(p[1]), p[2], 6));
          fillTooltip(tt, r.title, r.rows);
          placeTooltip(tt, container, cx, py == null ? plot.top : py);
        };
        const hide = () => {
          cross.setAttribute("visibility", "hidden");
          hl.replaceChildren();
          tt.classList.remove("on");
        };
        hit.addEventListener("pointermove", (e) => {
          const b = svg.getBoundingClientRect();
          const px = ((e.clientX - b.left) / b.width) * W;
          const py = ((e.clientY - b.top) / b.height) * H;
          show(sx.invert(px), py);
        });
        hit.addEventListener("pointerleave", hide);
        let kx = null;
        hit.addEventListener("focus", () => { kx = o.x.min; show(kx); });
        hit.addEventListener("blur", hide);
        hit.addEventListener("keydown", (e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          const xs = o.snapXs || [];
          if (!xs.length) return;
          let i = xs.findIndex((v) => v >= (kx == null ? o.x.min : kx) - 1e-9);
          if (i < 0) i = 0;
          i = Math.max(0, Math.min(xs.length - 1, i + (e.key === "ArrowRight" ? 1 : -1)));
          kx = xs[i];
          show(kx);
        });
      }
    }
    onResize(container, render);
    return {
      update(next) { state = Object.assign({}, state, next); render(container.clientWidth); },
    };
  }

  /* ---------- horizontal bar chart (single series, emphasis) ---------- */
  // opts: {rows:[{label,value,highlight,tip}], max, fmt, color, neutral, labelW}
  function barChart(container, opts) {
    let state = opts;
    const tt = makeTooltip(container);
    let svg;
    function render(W) {
      const o = state;
      if (svg) svg.remove();
      const rowH = 30, bh = Math.min(18, rowH - 10);
      const labelW = o.labelW || 150;
      const m = { top: 4, right: 92, bottom: 6, left: labelW };
      const H = m.top + m.bottom + o.rows.length * rowH;
      svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": o.aria || "" });
      container.insertBefore(svg, tt);
      const sx = scale(0, o.max, m.left, W - m.right);
      el("line", { class: "baseline", x1: m.left + 0.5, x2: m.left + 0.5, y1: m.top, y2: H - m.bottom }, svg);
      o.rows.forEach((r, i) => {
        const y = m.top + i * rowH + (rowH - bh) / 2;
        text(svg, m.left - 10, y + bh / 2 + 4, r.label, { class: r.highlight ? "lbl" : "lbl-2", "text-anchor": "end" });
        const x0 = m.left + 1, x1 = Math.max(x0 + 2, sx(r.value));
        const rr = Math.min(4, (x1 - x0) / 2);
        const d = `M${x0},${y}H${x1 - rr}Q${x1},${y} ${x1},${y + rr}V${y + bh - rr}Q${x1},${y + bh} ${x1 - rr},${y + bh}H${x0}Z`;
        const bar = el("path", { d, fill: r.highlight ? o.color : o.neutral }, svg);
        text(svg, x1 + 7, y + bh / 2 + 4, r.tip || o.fmt(r.value), { class: r.highlight ? "lbl" : "lbl-2" });
        const hit = el("rect", { class: "bar-hit", x: 0, y: m.top + i * rowH, width: W, height: rowH, tabindex: 0, "aria-label": `${r.label}: ${o.fmt(r.value)}` }, svg);
        const show = () => {
          bar.setAttribute("opacity", 0.8);
          fillTooltip(tt, r.label, [{ color: r.highlight ? o.color : o.neutral, rect: true, value: o.fmt(r.value), label: o.unit || "" }].concat(r.extra || []));
          placeTooltip(tt, container, x1, y);
        };
        const hide = () => { bar.removeAttribute("opacity"); tt.classList.remove("on"); };
        hit.addEventListener("pointerenter", show);
        hit.addEventListener("pointerleave", hide);
        hit.addEventListener("focus", show);
        hit.addEventListener("blur", hide);
      });
    }
    onResize(container, render);
    return { update(next) { state = Object.assign({}, state, next); render(container.clientWidth); } };
  }

  window.Charts = { lineChart, barChart, legend, marker };
})();
