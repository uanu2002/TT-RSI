/* TT-RSI project page — interactions, tables and charts */
(function () {
  const D = window.TTRSI_DATA;
  const C = window.Charts;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const f2 = (v) => v.toFixed(2);
  const COL = { teal: "#1295a6", coral: "#ef6a4c", violet: "#6a4ce2", amber: "#f2a600", magenta: "#ee7fac", neutralBar: "#c9cfd7" };

  /* ---------------- math ---------------- */
  if (window.renderMathInElement) {
    window.renderMathInElement(document.body, {
      delimiters: [{ left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }],
      throwOnError: false,
    });
  }

  /* ---------------- nav ---------------- */
  const nav = $("#nav"), bar = $("#progress");
  const onScroll = () => {
    const h = document.documentElement;
    nav.classList.toggle("scrolled", h.scrollTop > 8);
    bar.style.width = (100 * h.scrollTop) / Math.max(1, h.scrollHeight - h.clientHeight) + "%";
  };
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const links = new Map($$(".nav-links a").map((a) => [a.getAttribute("href").slice(1), a]));
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && links.has(e.target.id)) {
        links.forEach((a) => a.classList.remove("active"));
        links.get(e.target.id).classList.add("active");
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) secObs.observe(s); });

  /* ---------------- reveal ---------------- */
  const revObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); revObs.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  $$(".reveal").forEach((n) => revObs.observe(n));

  /* ---------------- lightbox ---------------- */
  const lb = $("#lightbox");
  $$(".figure-card img").forEach((img) => img.addEventListener("click", () => {
    const big = lb.querySelector("img");
    big.src = img.src; big.alt = img.alt;
    lb.classList.add("on");
  }));
  lb.addEventListener("click", () => lb.classList.remove("on"));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") lb.classList.remove("on"); });

  /* ---------------- copy ---------------- */
  $$(".copy-btn").forEach((b) => b.addEventListener("click", async () => {
    const src = document.getElementById(b.dataset.copy);
    try {
      await navigator.clipboard.writeText(src.innerText.trim());
      b.textContent = "Copied"; b.classList.add("done");
    } catch (_) {
      b.textContent = "Press Ctrl+C";
      const r = document.createRange(); r.selectNodeContents(src);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    }
    setTimeout(() => { b.textContent = "Copy"; b.classList.remove("done"); }, 1600);
  }));

  /* ---------------- tabs ---------------- */
  function segTabs(container, attr, onSelect) {
    const btns = $$("button", container);
    const isTab = btns[0] && btns[0].getAttribute("role") === "tab";
    const prop = isTab ? "aria-selected" : "aria-pressed";
    btns.forEach((b) => b.addEventListener("click", () => {
      btns.forEach((x) => x.setAttribute(prop, String(x === b)));
      onSelect(b.dataset[attr]);
    }));
    const cur = btns.find((b) => b.getAttribute(prop) === "true") || btns[0];
    onSelect(cur.dataset[attr]);
  }

  /* ---------------- Table 1 ---------------- */
  function rankMarks(rows, nCols) {
    const marks = rows.map(() => new Array(nCols).fill(""));
    for (let c = 0; c < nCols; c++) {
      const vals = [...new Set(rows.map((r) => r[c]))].sort((a, b) => b - a);
      rows.forEach((r, i) => {
        if (r[c] === vals[0]) marks[i][c] = "best";
        else if (vals.length > 1 && r[c] === vals[1]) marks[i][c] = "second";
      });
    }
    return marks;
  }
  function buildTable(table, head, groups) {
    table.replaceChildren();
    const tr = table.createTHead().insertRow();
    head.forEach((h) => { const th = document.createElement("th"); th.textContent = h; tr.appendChild(th); });
    const tb = table.createTBody();
    groups.forEach((g) => {
      if (g.title) {
        const r = tb.insertRow(); r.className = "group";
        const td = r.insertCell(); td.colSpan = head.length; td.textContent = g.title;
      }
      const marks = rankMarks(g.rows.map((r) => r.v), head.length - 1);
      g.rows.forEach((row, i) => {
        const r = tb.insertRow();
        if (row.ours) r.className = "ours";
        r.insertCell().textContent = row.m;
        row.v.forEach((v, c) => {
          const td = r.insertCell();
          td.textContent = f2(v);
          if (marks[i][c]) td.classList.add(marks[i][c]);
          if (c === row.v.length - 1 && row.gain != null) {
            const s = document.createElement("span"); s.className = "gain"; s.textContent = "+" + f2(row.gain);
            td.appendChild(s);
          }
        });
      });
    });
  }
  segTabs($("#t1-tabs"), "model", (model) => {
    const t = D.table1[model];
    buildTable($("#table1"), ["Method"].concat(D.benchmarks), [
      { title: "Label-free test-time training · first attempt", rows: t.train },
      { title: "Test-time scaling · same budget", rows: t.scale },
    ]);
  });

  /* ---------------- Efficiency: In-Context RSI vs Self-Consistency ---------------- */
  (function () {
    const ic = D.fig3.icrsi, sc = D.fig3.sc;
    const S = [
      { name: "In-Context RSI", color: COL.teal, shape: "circle", data: ic, unit: (i) => `attempt ${i + 1}` },
      { name: "Self-Consistency", color: COL.coral, shape: "square", data: sc, unit: (i) => `${i + 1} sample${i ? "s" : ""}` },
    ];
    C.legend($("#eff-legend"), S.map((s) => ({ name: s.name, color: s.color })));
    const allX = [...new Set(ic.map((p) => p[0]).concat(sc.map((p) => p[0])))].sort((a, b) => a - b);
    C.lineChart($("#eff-chart"), {
      height: 300,
      x: { min: 10, max: 185, ticks: [25, 75, 125, 175], fmt: (v) => v + "K", title: "Mean cumulative generated tokens" },
      y: { min: 52.5, max: 64.5, ticks: [54, 57, 60, 63], title: "Accuracy (%)" },
      series: S.map((s) => ({ name: s.name, color: s.color, shape: s.shape, data: s.data, r: 3.6 })),
      snapXs: allX,
      under(svg, sx, sy) {
        const NS = "http://www.w3.org/2000/svg";
        const y = sy(sc[9][1]) + 0.5, x0 = sx(ic[4][0]), x1 = sx(sc[9][0]);
        const g = document.createElementNS(NS, "g"); svg.appendChild(g);
        const ln = (a) => { const l = document.createElementNS(NS, "line"); for (const k in a) l.setAttribute(k, a[k]); g.appendChild(l); };
        ln({ x1: x0, x2: x1, y1: y, y2: y, stroke: "#0d1b2a", "stroke-width": 1, opacity: 0.55 });
        ln({ x1: x0, x2: x0, y1: y - 4, y2: y + 4, stroke: "#0d1b2a", "stroke-width": 1, opacity: 0.55 });
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", (x0 + x1) / 2); t.setAttribute("y", y - 7); t.setAttribute("text-anchor", "middle");
        t.setAttribute("class", "annot"); t.textContent = "68.6% fewer tokens, same accuracy";
        g.appendChild(t);
      },
      annotate(svg, sx, sy, plot) {
        const NS = "http://www.w3.org/2000/svg";
        const T = (x, y, s, a) => {
          const t = document.createElementNS(NS, "text");
          t.setAttribute("x", x); t.setAttribute("y", y); t.setAttribute("class", a.cls || "lbl");
          t.setAttribute("text-anchor", a.anchor || "start"); t.textContent = s; svg.appendChild(t);
        };
        T(sx(ic[4][0]) - 8, sy(ic[4][1]) - 9, "5th attempt", { anchor: "end", cls: "lbl-2" });
        T(sx(150), sy(63.75), "In-Context RSI", { anchor: "middle" });
        T(plot.right, sy(58.3), "Self-Consistency", { anchor: "end" });
      },
      hover(xv) {
        let best = allX[0];
        allX.forEach((x) => { if (Math.abs(x - xv) < Math.abs(best - xv)) best = x; });
        const rows = [], points = [];
        S.forEach((s) => {
          let j = 0;
          s.data.forEach((p, i) => { if (Math.abs(p[0] - best) < Math.abs(s.data[j][0] - best)) j = i; });
          const p = s.data[j];
          rows.push({ color: s.color, value: f2(p[1]) + "%", label: `${s.name} · ${s.unit(j)} · ${p[0].toFixed(0)}K` });
          points.push([p[0], p[1], s.color, s.shape]);
        });
        return { x: best, title: `≈ ${best.toFixed(0)}K tokens`, rows, points };
      },
      aria: "Accuracy versus cumulative generated tokens for In-Context RSI and Self-Consistency",
    });
  })();

  /* ---------------- Wrong-majority bars ---------------- */
  (function () {
    const rows = D.table5a.slice().sort((a, b) => b.wrong - a.wrong).map((r) => ({
      label: r.m, value: r.wrong, highlight: !!r.ours,
      extra: [{ color: "transparent", value: `${r.flips}/6`, label: "majorities correct (SC@64)" }],
    }));
    C.barChart($("#wrong-chart"), {
      rows, max: 14, fmt: (v) => f2(v) + "%", color: COL.teal, neutral: COL.neutralBar, labelW: 138,
      unit: "avg@64, wrong-majority", aria: "avg@64 on the six AIME26 questions whose base majority is wrong",
    });
  })();

  /* ---------------- Training curves ---------------- */
  (function () {
    const F = D.fig4;
    const style = {
      "In-Weight RSI (ours)": [COL.teal, "circle"], TTPO: [COL.coral, "square"], TTRL: [COL.violet, "triangle"],
      "OPSD-TTT": [COL.amber, "diamond"], "U-OPSD": [COL.magenta, "tri-down"],
    };
    const S = Object.keys(F.series).map((k) => ({
      name: k, color: style[k][0], shape: style[k][1], data: F.updates.map((u, i) => [u, F.series[k][i]]),
    }));
    C.legend($("#train-legend"), S.map((s) => ({ name: s.name, color: s.color })));
    C.lineChart($("#train-chart"), {
      height: 250,
      x: { min: 0, max: 100, ticks: [0, 25, 50, 75, 100], title: "Training updates" },
      y: { min: 51.5, max: 60.5, ticks: [52, 54, 56, 58, 60], title: "Accuracy (%)" },
      ref: { y: F.base, label: "Base" },
      series: S.slice().reverse(),
      snapXs: F.updates,
      annotate(svg, sx, sy, plot) {
        const NS = "http://www.w3.org/2000/svg";
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", plot.right - 8); t.setAttribute("y", sy(59.61) - 9);
        t.setAttribute("text-anchor", "end"); t.setAttribute("class", "lbl"); t.textContent = "59.61";
        svg.appendChild(t);
      },
      hover(xv) {
        let i = 0;
        F.updates.forEach((u, j) => { if (Math.abs(u - xv) < Math.abs(F.updates[i] - xv)) i = j; });
        const rows = S.map((s) => ({ color: s.color, value: f2(s.data[i][1]) + "%", label: s.name, v: s.data[i][1] }))
          .sort((a, b) => b.v - a.v);
        return { x: F.updates[i], title: `Update ${F.updates[i]}`, rows, points: S.map((s) => [s.data[i][0], s.data[i][1], s.color, s.shape]) };
      },
      aria: "First-attempt accuracy over 100 training updates for five methods",
    });
  })();

  /* ---------------- small HTML table for chart views ---------------- */
  function htmlTable(target, head, rows) {
    target.replaceChildren();
    const wrap = document.createElement("div"); wrap.className = "table-wrap";
    const t = document.createElement("table"); t.className = "data";
    const hr = t.createTHead().insertRow();
    head.forEach((h) => { const th = document.createElement("th"); th.textContent = h; hr.appendChild(th); });
    const tb = t.createTBody();
    rows.forEach((cells) => {
      const tr = tb.insertRow();
      cells.forEach((c) => { tr.insertCell().textContent = c; });
    });
    wrap.appendChild(t); target.appendChild(wrap);
  }

  /* ---------------- chart <-> table toggles ---------------- */
  $$(".view-toggle").forEach((b) => b.addEventListener("click", () => {
    const card = document.getElementById(b.dataset.toggle);
    const on = card.classList.toggle("show-table");
    b.textContent = on ? "Chart" : "Table";
  }));

  (function () {
    const ic = D.fig3.icrsi, sc = D.fig3.sc;
    const rows = [];
    for (let i = 0; i < Math.max(ic.length, sc.length); i++) {
      rows.push([
        String(i + 1),
        ic[i] ? `${ic[i][0].toFixed(1)}K` : "–", ic[i] ? f2(ic[i][1]) : "–",
        sc[i] ? `${sc[i][0].toFixed(1)}K` : "–", sc[i] ? f2(sc[i][1]) : "–",
      ]);
    }
    htmlTable($("#eff-table"), ["k", "IC-RSI tokens", "IC-RSI acc.", "SC tokens", "SC acc."], rows);
  })();

  (function () {
    htmlTable($("#wrong-table"), ["Method", "avg@64 (wrong maj.)", "SC correct"],
      D.table5a.slice().sort((a, b) => b.wrong - a.wrong).map((r) => [r.m, f2(r.wrong), `${r.flips}/6`]));
  })();

  (function () {
    const F = D.fig4, keys = Object.keys(F.series);
    htmlTable($("#train-table"), ["Update"].concat(keys),
      F.updates.map((u, i) => [String(u)].concat(keys.map((k) => f2(F.series[k][i])))));
  })();

  /* ---------------- fix / break explorer (Proposition 1) ---------------- */
  (function () {
    const fI = $("#fb-f"), bI = $("#fb-b"), aI = $("#fb-a");
    const K = 30;
    let chart;
    function model() {
      const f = +fI.value / 100, b = +bI.value / 100, a1 = +aI.value / 100;
      const A = f / (f + b);
      const pts = [];
      for (let k = 1; k <= K; k++) pts.push([k, 100 * (A + Math.pow(1 - f - b, k - 1) * (a1 - A))]);
      return { f, b, a1, A, pts };
    }
    function cfg() {
      const m = model();
      const vals = m.pts.map((p) => p[1]).concat([100 * m.A]);
      const span = Math.max(...vals) - Math.min(...vals);
      const step = span > 30 ? 10 : 5;
      const lo = Math.max(0, Math.floor((Math.min(...vals) - 2) / step) * step);
      const hi = Math.min(100, Math.ceil((Math.max(...vals) + 2) / step) * step);
      const ticks = []; for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v);
      const up = m.f * (1 - m.a1) > m.b * m.a1;
      const col = up ? COL.teal : COL.coral;
      return {
        height: 230,
        margin: { top: 26, right: 12 },
        x: { min: 1, max: K, ticks: [1, 10, 20, 30], title: "attempt k" },
        y: { min: lo, max: hi, ticks, title: "Accuracy (%)" },
        ref: { y: 100 * m.A, label: `balance ${f2(100 * m.A)}%` },
        series: [{ name: "acc", color: col, shape: "circle", data: m.pts, markers: false }],
        snapXs: m.pts.map((p) => p[0]),
        annotate(svg, sx, sy) {
          const NS = "http://www.w3.org/2000/svg";
          [[1, "a₁"], [11, "a₁₁"]].forEach(([k, lab]) => {
            const pt = m.pts[k - 1];
            C.marker(svg, "circle", sx(pt[0]), sy(pt[1]), col, 4.2);
            const t = document.createElementNS(NS, "text");
            const above = (k === 1) !== (pt[1] < 100 * m.A);
            t.setAttribute("x", sx(pt[0]) + (k === 1 ? 7 : 0));
            t.setAttribute("y", sy(pt[1]) + (above ? -8 : 15));
            t.setAttribute("text-anchor", k === 1 ? "start" : "middle");
            t.setAttribute("class", "lbl");
            t.textContent = `${lab} ${f2(pt[1])}%`;
            svg.appendChild(t);
          });
        },
        hover(xv) {
          const k = Math.max(1, Math.min(K, Math.round(xv)));
          const pt = m.pts[k - 1];
          return { x: k, title: `attempt ${k}`, rows: [{ color: col, value: f2(pt[1]) + "%", label: "predicted accuracy" }], points: [[pt[0], pt[1], col, "circle"]] };
        },
        aria: "Predicted accuracy across refinement attempts under the fix/break model",
        _m: m, _up: up,
      };
    }
    function refresh() {
      const c = cfg();
      $("#fb-f-o").textContent = (+fI.value).toFixed(2) + "%";
      $("#fb-b-o").textContent = (+bI.value).toFixed(2) + "%";
      $("#fb-a-o").textContent = (+aI.value).toFixed(0) + "%";
      if (!chart) chart = C.lineChart($("#fb-chart"), c); else chart.update(c);
      const m = c._m, ro = $("#fb-readout");
      ro.replaceChildren();
      const add = (html) => { const el = document.createElement("span"); el.innerHTML = html; ro.appendChild(el); };
      add(`limit <b>${f2(100 * m.A)}%</b>`);
      add(`after ten <b>${f2(m.pts[10][1])}%</b>`);
      const lhs = (100 * m.f * (1 - m.a1)).toFixed(2), rhs = (100 * m.b * m.a1).toFixed(2);
      add(c._up
        ? `<span class="pill-good">✓ f(1−acc₁) = ${lhs} &gt; b·acc₁ = ${rhs}</span>`
        : `<span class="pill-bad">✗ f(1−acc₁) = ${lhs} ≤ b·acc₁ = ${rhs}</span>`);
    }
    [fI, bI, aI].forEach((i) => i.addEventListener("input", refresh));
    refresh();
  })();

  /* ---------------- distillation explorer (Theorem 1 & Proposition 2) ---------------- */
  (function () {
    const N = 24, grid = $("#chain"), cells = [];
    for (let i = 1; i <= N; i++) {
      const c = document.createElement("div");
      c.className = "cell"; c.textContent = i;
      grid.appendChild(c); cells.push(c);
    }
    const pin = $("#acc-pin"), nI = $("#ch-n");
    function refresh() {
      const n = +nI.value;
      $("#ch-n-o").textContent = n;
      cells.forEach((c) => c.classList.remove("k1", "k2", "k3"));
      const idx = [1, 2, 3].map((k) => (n + 1) * k);
      idx.forEach((v, k) => { if (v <= N) cells[v - 1].classList.add("k" + (k + 1)); });
      const E = 1 + n + 0.5 * n * (n + 1) / 2;
      pin.style.left = (((E - 1) + 0.5) / N) * 100 + "%";
      pin.dataset.label = `≈ ${E % 1 ? E.toFixed(1) : E}`;
      const ro = $("#ch-readout");
      ro.replaceChildren();
      const add = (html) => { const el = document.createElement("span"); el.innerHTML = html; ro.appendChild(el); };
      add(`trained attempts 1, 2, 3 ≈ initial <b>${idx.slice(0, 2).join(", ")}</b>${idx[2] <= N ? `, <b>${idx[2]}</b>` : ""}`);
      add(`with acceleration, 1st ≈ initial <b>${E % 1 ? E.toFixed(1) : E}</b> on average`);
    }
    nI.addEventListener("input", refresh);
    refresh();
  })();
})();
