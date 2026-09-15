/**
 * Colour Wheel — a drop-in colour browser for coatings catalogues.
 *
 * A concentric dial: the outer ring carries every colour family at once, each
 * arc sized to how many shades it holds, so the shape of the range is visible
 * before you pick anything. The inner wheel spins that family's shades under a
 * fixed pointer. Selecting a family turns the ring so it centres under the same
 * pointer, and both rings read through one line.
 *
 * No framework, no build step, no dependencies. Drop the file on a page, give
 * it a container and some JSON, and it runs — WordPress, plain HTML, Astro,
 * anything.
 *
 *   <div data-color-wheel data-shades="/data/shades.json"></div>
 *   <script src="/assets/color-wheel/color-wheel.js" defer></script>
 *
 * See README.md for the data contract and the options. Built for IFS Coatings
 * and Polychem Coatings; nothing in here is specific to either.
 *
 * @license MIT
 */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  /* ------------------------------------------------------------------ *
   * Defaults
   * ------------------------------------------------------------------ */

  var DEFAULTS = {
    /** RAL Classic's nine hue series, used when a shade has no family of its own. */
    series: [
      { digit: "1", name: "Yellows" },
      { digit: "2", name: "Oranges" },
      { digit: "3", name: "Reds" },
      { digit: "4", name: "Violets" },
      { digit: "5", name: "Blues" },
      { digit: "6", name: "Greens" },
      { digit: "7", name: "Grays" },
      { digit: "8", name: "Browns" },
      { digit: "9", name: "Whites & Blacks" },
    ],
    /** Family order when families come from the data rather than RAL codes. */
    familyOrder: null,
    /** Show the card for the selected shade. */
    card: true,
    /** Show the grid of every shade in the family, with an "all" switch. */
    grid: false,
    /** Show the jump-to-a-code field. */
    search: true,
    /** Wording, so the asset can be dropped into a non-English site. */
    text: {
      searchPlaceholder: "Jump to a code or name",
      searchLabel: "Jump to a colour code or name",
      previous: "Previous",
      next: "Next",
      of: "of",
      shades: "shades",
      shade: "shade",
      hint: "Drag the wheel, or use the arrow keys once it has focus.",
      all: "All colours",
      everyColour: "Every colour",
      viewShade: "View this colour",
      tds: "TDS",
    },
  };

  /** A wedge's visual gap, in degrees, taken evenly off both of its edges. */
  var WEDGE_GAP = 0.8;
  /** Ring geometry, in the SVG's own units. The drawing scales to its box. */
  var SIZE = 520;
  var CENTRE = SIZE / 2;
  var OUTER_R = 242;
  var RING_W = 34;
  var RING_GAP = 10;
  var WHEEL_OUTER = OUTER_R - RING_W - RING_GAP;
  var WHEEL_INNER = 92;
  /** Grow a hovered wedge this far past the rim; the size change is the cue. */
  var HOVER_GROW = 8;
  var HOVER_GROW_RING = 5;

  /* ------------------------------------------------------------------ *
   * Colour helpers
   * ------------------------------------------------------------------ */

  function clamp255(v) {
    return Math.max(0, Math.min(255, Math.round(v)));
  }

  function parseHex(hex) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m) return null;
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function toHex(rgb) {
    return (
      "#" +
      rgb
        .map(function (v) {
          return clamp255(v).toString(16).padStart(2, "0");
        })
        .join("")
        .toUpperCase()
    );
  }

  /** Relative luminance, for deciding whether a label reads in black or white. */
  function luminance(hex) {
    var rgb = parseHex(hex);
    if (!rgb) return 0;
    var lin = rgb.map(function (v) {
      var s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }

  function readableInk(hex) {
    return luminance(hex) > 0.36 ? "#000000" : "#FFFFFF";
  }

  /** Average of a family's shades, for an arc that has no colour of its own. */
  function averageHex(shades) {
    var sum = [0, 0, 0];
    var n = 0;
    shades.forEach(function (s) {
      var rgb = parseHex(s.hex);
      if (!rgb) return;
      sum[0] += rgb[0];
      sum[1] += rgb[1];
      sum[2] += rgb[2];
      n++;
    });
    if (!n) return "#9CA3AF";
    return toHex([sum[0] / n, sum[1] / n, sum[2] / n]);
  }

  /* ------------------------------------------------------------------ *
   * Geometry
   * ------------------------------------------------------------------ */

  function polar(cx, cy, r, deg) {
    var rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }

  /** Annular sector — the wedge shape both rings are built from. */
  function arcPath(cx, cy, rInner, rOuter, startDeg, endDeg) {
    var large = endDeg - startDeg > 180 ? 1 : 0;
    var a = polar(cx, cy, rOuter, startDeg);
    var b = polar(cx, cy, rOuter, endDeg);
    var c = polar(cx, cy, rInner, endDeg);
    var d = polar(cx, cy, rInner, startDeg);
    return (
      "M " + a[0] + " " + a[1] +
      " A " + rOuter + " " + rOuter + " 0 " + large + " 1 " + b[0] + " " + b[1] +
      " L " + c[0] + " " + c[1] +
      " A " + rInner + " " + rInner + " 0 " + large + " 0 " + d[0] + " " + d[1] +
      " Z"
    );
  }

  /** Just the arc, for a label to run along. */
  function arcLine(cx, cy, r, startDeg, endDeg, sweep) {
    var a = polar(cx, cy, r, startDeg);
    var b = polar(cx, cy, r, endDeg);
    var large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    return "M " + a[0] + " " + a[1] + " A " + r + " " + r + " 0 " + large + " " + sweep + " " + b[0] + " " + b[1];
  }

  /** Shortest signed distance from a to b in degrees, so nothing unwinds. */
  function shortestDelta(a, b) {
    return ((((b - a) % 360) + 540) % 360) - 180;
  }

  /* ------------------------------------------------------------------ *
   * DOM helpers
   * ------------------------------------------------------------------ */

  function svgEl(tag, attrs, text) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var key in attrs) {
      if (attrs[key] !== null && attrs[key] !== undefined) node.setAttribute(key, attrs[key]);
    }
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function htmlEl(tag, attrs, text) {
    var node = document.createElement(tag);
    for (var key in attrs) {
      if (key === "class") node.className = attrs[key];
      else if (attrs[key] !== null && attrs[key] !== undefined) node.setAttribute(key, attrs[key]);
    }
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ------------------------------------------------------------------ *
   * Styles — injected once, everything themable from outside
   * ------------------------------------------------------------------ */

  var STYLE_ID = "color-wheel-styles";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      ".cw{--cw-accent:#E21E24;--cw-ink:#111827;--cw-muted:#6B7280;--cw-rule:#E5E7EB;",
      "--cw-surface:#ffffff;--cw-font:inherit;--cw-radius:0;",
      "font-family:var(--cw-font);color:var(--cw-ink);box-sizing:border-box}",
      ".cw *,.cw *::before,.cw *::after{box-sizing:inherit}",
      ".cw__layout{display:grid;gap:2rem;align-items:start}",
      "@media(min-width:900px){.cw__layout{grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:3rem}}",
      ".cw__search{position:relative;max-width:24rem;margin:0 0 1.5rem}",
      ".cw__input{width:100%;padding:.75rem 1rem;font:inherit;font-size:.875rem;",
      "border:1px solid #D1D5DB;border-radius:var(--cw-radius);background:var(--cw-surface);color:var(--cw-ink)}",
      ".cw__input:focus{outline:none;border-color:var(--cw-accent)}",
      ".cw__results{position:absolute;inset-inline:0;top:100%;z-index:20;margin:0;padding:0;list-style:none;",
      "max-height:18rem;overflow-y:auto;background:var(--cw-surface);border:1px solid #D1D5DB;border-top:0}",
      ".cw__result{display:flex;width:100%;gap:.75rem;align-items:center;padding:.5rem .75rem;",
      "background:none;border:0;font:inherit;text-align:left;cursor:pointer;color:inherit}",
      ".cw__result:hover,.cw__result:focus-visible{background:#F9FAFB}",
      ".cw__chip{width:1.75rem;height:1.75rem;flex:none;border:1px solid var(--cw-rule)}",
      ".cw__wheel{width:100%;max-width:520px;margin-inline:auto}",
      ".cw__wheel:focus-visible{outline:2px solid var(--cw-accent);outline-offset:2px}",
      ".cw__svg{display:block;width:100%;height:auto;touch-action:none;user-select:none;cursor:grab}",
      ".cw__svg--drag{cursor:grabbing}",
      ".cw__hub{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;",
      "justify-content:center;text-align:center;pointer-events:none}",
      ".cw__hub-code{margin:0;font-size:1.25rem;font-weight:800;letter-spacing:-.01em}",
      ".cw__hub-family{margin:.25rem 0 0;font-size:.75rem;font-weight:700;letter-spacing:.1em;",
      "text-transform:uppercase;color:var(--cw-muted);max-width:72%}",
      ".cw__stage{position:relative}",
      ".cw__stepper{display:flex;align-items:stretch;justify-content:space-between;gap:1px;",
      "background:var(--cw-rule);max-width:520px;margin:1.25rem auto 0}",
      ".cw__step{display:flex;align-items:center;gap:.5rem;padding:.75rem 1.25rem;background:var(--cw-surface);",
      "border:0;font:inherit;font-size:.875rem;font-weight:600;cursor:pointer;color:inherit}",
      ".cw__step:hover{color:var(--cw-accent)}",
      ".cw__step:focus-visible{outline:2px solid var(--cw-accent);outline-offset:-2px}",
      ".cw__position{display:flex;flex:1;align-items:center;justify-content:center;background:var(--cw-surface);",
      "font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--cw-muted)}",
      ".cw__hint{margin:.75rem auto 0;max-width:520px;text-align:center;font-size:.75rem;line-height:1.6;color:var(--cw-muted)}",
      ".cw__card{border-top:4px solid var(--cw-accent);background:var(--cw-surface);max-width:22rem}",
      ".cw__card-media{aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;padding:10%;background:#F3F4F6}",
      ".cw__card-media img{max-width:100%;max-height:100%;object-fit:contain}",
      ".cw__card-body{padding:1.25rem}",
      ".cw__card-code{margin:0;font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--cw-muted)}",
      ".cw__card-name{margin:.5rem 0 0;font-size:1.25rem;font-weight:800;letter-spacing:-.01em}",
      ".cw__card-product{margin:.25rem 0 0;font-size:.875rem;font-weight:700;color:var(--cw-accent)}",
      ".cw__card-links{display:flex;flex-wrap:wrap;gap:1rem;margin-top:1.25rem}",
      ".cw__link{font-size:.875rem;font-weight:700;color:var(--cw-accent);text-underline-offset:3px}",
      ".cw__grid-head{display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-end;justify-content:space-between;",
      "margin:3rem 0 1.5rem;padding-top:2.5rem;border-top:1px solid var(--cw-rule)}",
      ".cw__grid-title{margin:0;font-size:1.5rem;font-weight:800;letter-spacing:-.01em}",
      ".cw__grid-count{margin:.5rem 0 0;font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--cw-muted)}",
      ".cw__toggle{display:flex;border:1px solid #D1D5DB;background:var(--cw-surface)}",
      ".cw__toggle button{padding:.75rem 1.25rem;border:0;background:none;font:inherit;font-size:.875rem;",
      "font-weight:600;cursor:pointer;color:inherit}",
      ".cw__toggle button[aria-checked='true']{background:var(--cw-accent);color:#fff}",
      ".cw__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.5rem}",
      "@media(min-width:640px){.cw__grid{grid-template-columns:repeat(3,minmax(0,1fr))}}",
      "@media(min-width:1024px){.cw__grid{grid-template-columns:repeat(6,minmax(0,1fr))}}",
      ".cw__sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;",
      "clip:rect(0,0,0,0);white-space:nowrap;border:0}",
      "@media(prefers-reduced-motion:reduce){.cw__spin{transition:none!important}}",
    ].join("");
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ------------------------------------------------------------------ *
   * Data
   * ------------------------------------------------------------------ */

  /** "RAL 9010" → "9". Anything without a leading digit has no series. */
  function seriesDigit(code) {
    var m = /(\d)/.exec(String(code || ""));
    return m ? m[1] : "";
  }

  /**
   * Group shades into families.
   *
   * A shade's own `family` wins. Failing that the code's first digit is used,
   * which is how RAL Classic is organised and how a physical fan deck is laid
   * out. Grouping on the code also keeps a range whole where a catalogue has
   * filed it by appearance — RAL's 9000s are the usual casualty, with the
   * whites, blacks and silvers scattered across three families.
   */
  function groupShades(shades, options) {
    var hasOwnFamilies = shades.some(function (s) {
      return s.family;
    });
    var buckets = {};
    var order = [];

    shades.forEach(function (shade) {
      var key;
      if (hasOwnFamilies) {
        key = shade.family || "Other";
      } else {
        var digit = seriesDigit(shade.code);
        var entry = options.series.filter(function (s) {
          return s.digit === digit;
        })[0];
        key = entry ? entry.name : "Other";
      }
      if (!buckets[key]) {
        buckets[key] = [];
        order.push(key);
      }
      buckets[key].push(shade);
    });

    if (hasOwnFamilies && options.familyOrder) {
      order = options.familyOrder
        .filter(function (name) {
          return buckets[name];
        })
        .concat(
          order.filter(function (name) {
            return options.familyOrder.indexOf(name) === -1;
          }),
        );
    } else if (!hasOwnFamilies) {
      order = options.series
        .map(function (s) {
          return s.name;
        })
        .filter(function (name) {
          return buckets[name];
        })
        .concat(buckets["Other"] ? ["Other"] : []);
    }

    return order.map(function (name) {
      var list = buckets[name].slice().sort(function (a, b) {
        return String(a.code).localeCompare(String(b.code), undefined, { numeric: true });
      });
      return { name: name, shades: list, swatch: averageHex(list) };
    });
  }

  /* ------------------------------------------------------------------ *
   * The widget
   * ------------------------------------------------------------------ */

  function ColorWheel(container, shades, options) {
    var opts = Object.assign({}, DEFAULTS, options || {});
    opts.text = Object.assign({}, DEFAULTS.text, (options && options.text) || {});

    var families = groupShades(shades, opts);
    if (!families.length) return;

    var state = {
      familyIndex: 0,
      shadeIndex: 0,
      rotation: 0,
      ringRotation: 0,
      hoverShade: -1,
      hoverFamily: -1,
      dragging: false,
      gridScope: "family",
      scale: 1,
    };

    var total = shades.length;
    var arcs = [];
    var cursor = 0;
    families.forEach(function (f) {
      var sweep = (f.shades.length / total) * 360;
      arcs.push({ start: cursor, end: cursor + sweep, mid: cursor + sweep / 2, sweep: sweep });
      cursor += sweep;
    });

    function family() {
      return families[state.familyIndex];
    }
    function list() {
      return family().shades;
    }
    function selected() {
      return list()[state.shadeIndex];
    }
    function wedgeAngle() {
      return 360 / Math.max(1, list().length);
    }
    /** Rotation that puts the CENTRE of wedge i under the pointer at twelve. */
    function rotationFor(i) {
      return -(i * wedgeAngle() + wedgeAngle() / 2);
    }

    /* -- Scaffolding ------------------------------------------------- */

    injectStyles();
    container.classList.add("cw");
    container.innerHTML = "";

    var searchWrap = null;
    var searchInput = null;
    var resultsList = null;
    if (opts.search) {
      searchWrap = htmlEl("div", { class: "cw__search" });
      var label = htmlEl("label", { class: "cw__sr", for: uid("cw-search") }, opts.text.searchLabel);
      searchInput = htmlEl("input", {
        class: "cw__input",
        id: label.getAttribute("for"),
        type: "text",
        role: "combobox",
        "aria-autocomplete": "list",
        "aria-expanded": "false",
        autocomplete: "off",
        placeholder: opts.text.searchPlaceholder,
      });
      resultsList = htmlEl("ul", { class: "cw__results", hidden: "hidden" });
      searchWrap.appendChild(label);
      searchWrap.appendChild(searchInput);
      searchWrap.appendChild(resultsList);
      container.appendChild(searchWrap);
    }

    var layout = htmlEl("div", { class: "cw__layout" });
    container.appendChild(layout);

    var wheelCol = htmlEl("div", {});
    var stage = htmlEl("div", { class: "cw__stage" });
    var wheelBox = htmlEl("div", {
      class: "cw__wheel",
      tabindex: "0",
      role: "listbox",
      "aria-label": opts.text.shades,
    });
    var svg = svgEl("svg", { class: "cw__svg", viewBox: "0 0 " + SIZE + " " + SIZE, role: "presentation" });
    wheelBox.appendChild(svg);
    stage.appendChild(wheelBox);

    var hub = htmlEl("div", { class: "cw__hub", "aria-hidden": "true" });
    var hubCode = htmlEl("p", { class: "cw__hub-code" });
    var hubFamily = htmlEl("p", { class: "cw__hub-family" });
    hub.appendChild(hubCode);
    hub.appendChild(hubFamily);
    stage.appendChild(hub);
    wheelCol.appendChild(stage);

    var stepper = htmlEl("div", { class: "cw__stepper" });
    var prevBtn = htmlEl("button", { class: "cw__step", type: "button", "aria-label": opts.text.previous });
    prevBtn.appendChild(chevron(-1));
    prevBtn.appendChild(document.createTextNode(opts.text.previous));
    var position = htmlEl("p", { class: "cw__position" });
    var nextBtn = htmlEl("button", { class: "cw__step", type: "button", "aria-label": opts.text.next });
    nextBtn.appendChild(document.createTextNode(opts.text.next));
    nextBtn.appendChild(chevron(1));
    stepper.appendChild(prevBtn);
    stepper.appendChild(position);
    stepper.appendChild(nextBtn);
    wheelCol.appendChild(stepper);
    wheelCol.appendChild(htmlEl("p", { class: "cw__hint" }, opts.text.hint));
    layout.appendChild(wheelCol);

    var cardCol = htmlEl("div", {});
    layout.appendChild(cardCol);

    var gridHead = null;
    var gridTitle = null;
    var gridCount = null;
    var gridEl = null;
    if (opts.grid) {
      gridHead = htmlEl("div", { class: "cw__grid-head" });
      var gridText = htmlEl("div", {});
      gridTitle = htmlEl("h3", { class: "cw__grid-title" });
      gridCount = htmlEl("p", { class: "cw__grid-count" });
      gridText.appendChild(gridTitle);
      gridText.appendChild(gridCount);
      var toggle = htmlEl("div", { class: "cw__toggle", role: "radiogroup" });
      var famBtn = htmlEl("button", { type: "button", role: "radio" });
      var allBtn = htmlEl("button", { type: "button", role: "radio" }, opts.text.all);
      famBtn.addEventListener("click", function () {
        state.gridScope = "family";
        renderGrid();
      });
      allBtn.addEventListener("click", function () {
        state.gridScope = "all";
        renderGrid();
      });
      toggle.appendChild(famBtn);
      toggle.appendChild(allBtn);
      gridHead.appendChild(gridText);
      gridHead.appendChild(toggle);
      gridEl = htmlEl("div", { class: "cw__grid" });
      container.appendChild(gridHead);
      container.appendChild(gridEl);
      gridHead._famBtn = famBtn;
      gridHead._allBtn = allBtn;
    }

    var live = htmlEl("p", { class: "cw__sr", "aria-live": "polite" });
    container.appendChild(live);

    /* -- SVG layers -------------------------------------------------- */

    var defs = svgEl("defs");
    svg.appendChild(defs);
    var ringGroup = svgEl("g", { class: "cw__spin" });
    var wheelGroup = svgEl("g", { class: "cw__spin" });
    svg.appendChild(ringGroup);
    svg.appendChild(wheelGroup);

    var hubDisc = svgEl("circle", {
      cx: CENTRE, cy: CENTRE, r: WHEEL_INNER - 6,
      fill: "var(--cw-surface,#fff)", stroke: "var(--cw-rule,#E5E7EB)", "stroke-width": "1",
      "pointer-events": "none",
    });
    svg.appendChild(hubDisc);
    svg.appendChild(
      svgEl("polygon", {
        points:
          CENTRE - 10 + "," + (CENTRE - OUTER_R - 17) + " " +
          (CENTRE + 10) + "," + (CENTRE - OUTER_R - 17) + " " +
          CENTRE + "," + (CENTRE - OUTER_R - 3),
        fill: "var(--cw-accent,#E21E24)",
        "pointer-events": "none",
      }),
    );

    /* -- Rendering --------------------------------------------------- */

    function plural(n) {
      return n === 1 ? opts.text.shade : opts.text.shades;
    }

    function labelUnits() {
      // The drawing scales with its container, so type measured in user units
      // shrinks with it. At phone width that put 11 units near 7px; this keeps
      // a label at 12px however small the wheel is drawn.
      return Math.max(11, 12 / state.scale);
    }

    function renderRing() {
      ringGroup.innerHTML = "";
      ringGroup.setAttribute("transform", "rotate(" + state.ringRotation + " " + CENTRE + " " + CENTRE + ")");
      ringGroup.style.transition = state.dragging ? "none" : "transform 320ms cubic-bezier(.4,0,.2,1)";

      var units = labelUnits();
      families.forEach(function (f, i) {
        var arc = arcs[i];
        var active = i === state.familyIndex;
        var hovered = state.hoverFamily === i && !state.dragging;
        var outer = OUTER_R + (hovered ? HOVER_GROW_RING : 0);
        var path = svgEl("path", {
          d: arcPath(CENTRE, CENTRE, OUTER_R - RING_W, outer, arc.start + 0.3, arc.end - 0.3),
          fill: f.swatch,
          stroke: active || hovered ? "#111827" : "#ffffff",
          "stroke-width": active ? 2 : hovered ? 1.25 : 0.75,
          style: "cursor:pointer",
        });
        path.appendChild(svgEl("title", {}, f.name + " — " + f.shades.length + " " + plural(f.shades.length)));
        path.addEventListener("click", function () {
          selectFamily(i);
        });
        path.addEventListener("pointerenter", function () {
          state.hoverFamily = i;
          renderRing();
        });
        path.addEventListener("pointerleave", function () {
          if (state.hoverFamily === i) state.hoverFamily = -1;
          renderRing();
        });
        ringGroup.appendChild(path);

        // Room for the word, measured along the arc it sits on in rendered
        // pixels rather than degrees, so a label is dropped when it would not
        // fit rather than overflowing its own sector.
        var labelR = OUTER_R - RING_W / 2;
        var arcPx = ((arc.sweep * Math.PI) / 180) * labelR * state.scale;
        var textPx = f.name.length * units * state.scale * 0.58;
        if (arcPx < textPx + 10) return;

        // Text on a path sits on the baseline with its glyphs to one side, and
        // which side depends on the direction the path runs. Below the horizon
        // the baseline is drawn backwards, so each is shifted half a cap height
        // against its own glyph direction to sit centred in the band.
        var onScreenMid = (((arc.mid + state.ringRotation) % 360) + 360) % 360;
        var flipped = onScreenMid > 90 && onScreenMid < 270;
        var pathId = uid("cw-label");
        var baseline = svgEl("path", {
          id: pathId,
          d: flipped
            ? arcLine(CENTRE, CENTRE, labelR + units * 0.36, arc.end, arc.start, 0)
            : arcLine(CENTRE, CENTRE, labelR - units * 0.36, arc.start, arc.end, 1),
          fill: "none",
          "pointer-events": "none",
        });
        var text = svgEl("text", {
          "font-size": units,
          "font-weight": "700",
          fill: readableInk(f.swatch),
          "pointer-events": "none",
        });
        var textPath = svgEl("textPath", { startOffset: "50%", "text-anchor": "middle" }, f.name);
        textPath.setAttribute("href", "#" + pathId);
        textPath.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#" + pathId);
        text.appendChild(textPath);
        ringGroup.appendChild(baseline);
        ringGroup.appendChild(text);
      });
    }

    function renderWheel() {
      wheelGroup.innerHTML = "";
      wheelGroup.setAttribute("transform", "rotate(" + state.rotation + " " + CENTRE + " " + CENTRE + ")");
      wheelGroup.style.transition = state.dragging ? "none" : "transform 320ms cubic-bezier(.4,0,.2,1)";

      // A filled disc keeps the drag alive over the gaps between wedges.
      wheelGroup.appendChild(
        svgEl("circle", { cx: CENTRE, cy: CENTRE, r: WHEEL_OUTER + HOVER_GROW, fill: "var(--cw-surface,#fff)" }),
      );

      var shadesNow = list();
      var angle = wedgeAngle();
      var gap = shadesNow.length > 24 ? WEDGE_GAP / 2 : WEDGE_GAP;

      shadesNow.forEach(function (shade, i) {
        var active = i === state.shadeIndex;
        var hovered = state.hoverShade === i && !state.dragging;
        var path = svgEl("path", {
          d: arcPath(
            CENTRE, CENTRE, WHEEL_INNER, WHEEL_OUTER + (hovered ? HOVER_GROW : 0),
            i * angle + gap / 2, (i + 1) * angle - gap / 2,
          ),
          fill: shade.hex || "#D1D5DB",
          stroke: active || hovered ? "#111827" : "#ffffff",
          "stroke-width": active ? 2.5 : hovered ? 1.5 : 0.5,
          role: "option",
          "aria-selected": active ? "true" : "false",
          "aria-label": (shade.code || "") + " " + (shade.name || ""),
          style: "cursor:pointer",
        });
        path.appendChild(svgEl("title", {}, (shade.code || "") + " — " + (shade.name || "")));
        path.addEventListener("click", function () {
          if (dragTravel < 2) select(i);
        });
        path.addEventListener("pointerenter", function () {
          state.hoverShade = i;
          renderWheel();
        });
        path.addEventListener("pointerleave", function () {
          if (state.hoverShade === i) state.hoverShade = -1;
          renderWheel();
        });
        wheelGroup.appendChild(path);
      });
    }

    function renderCard() {
      if (!opts.card) return;
      cardCol.innerHTML = "";
      var shade = selected();
      if (!shade) return;
      var card = htmlEl("div", { class: "cw__card" });
      if (shade.image) {
        var media = htmlEl("div", { class: "cw__card-media" });
        if (shade.hex) media.style.backgroundColor = "transparent";
        var img = htmlEl("img", { src: shade.image, alt: "", loading: "lazy" });
        media.appendChild(img);
        card.appendChild(media);
      } else if (shade.hex) {
        var block = htmlEl("div", { class: "cw__card-media" });
        block.style.background = shade.hex;
        card.appendChild(block);
      }
      var body = htmlEl("div", { class: "cw__card-body" });
      body.appendChild(htmlEl("p", { class: "cw__card-code" }, shade.code || ""));
      body.appendChild(htmlEl("p", { class: "cw__card-name" }, shade.name || ""));
      if (shade.productCode) body.appendChild(htmlEl("p", { class: "cw__card-product" }, shade.productCode));
      var links = htmlEl("div", { class: "cw__card-links" });
      if (shade.href) links.appendChild(htmlEl("a", { class: "cw__link", href: shade.href }, opts.text.viewShade));
      if (shade.tds)
        links.appendChild(
          htmlEl("a", { class: "cw__link", href: shade.tds, target: "_blank", rel: "noopener noreferrer" }, opts.text.tds),
        );
      if (links.childNodes.length) body.appendChild(links);
      card.appendChild(body);
      cardCol.appendChild(card);
    }

    function renderGrid() {
      if (!opts.grid) return;
      var all = state.gridScope === "all";
      var items = all
        ? shades.slice().sort(function (a, b) {
            return String(a.code).localeCompare(String(b.code), undefined, { numeric: true });
          })
        : list();
      gridTitle.textContent = all ? opts.text.everyColour : family().name;
      gridCount.textContent = items.length + " " + plural(items.length);
      gridHead._famBtn.textContent = family().name;
      gridHead._famBtn.setAttribute("aria-checked", all ? "false" : "true");
      gridHead._allBtn.setAttribute("aria-checked", all ? "true" : "false");

      gridEl.innerHTML = "";
      items.forEach(function (shade) {
        var card = htmlEl(shade.href ? "a" : "div", shade.href ? { class: "cw__card", href: shade.href } : { class: "cw__card" });
        card.style.textDecoration = "none";
        card.style.color = "inherit";
        var media = htmlEl("div", { class: "cw__card-media" });
        if (shade.image) media.appendChild(htmlEl("img", { src: shade.image, alt: "", loading: "lazy" }));
        else media.style.background = shade.hex || "#E5E7EB";
        card.appendChild(media);
        var body = htmlEl("div", { class: "cw__card-body" });
        body.appendChild(htmlEl("p", { class: "cw__card-code" }, shade.code || ""));
        body.appendChild(htmlEl("p", { class: "cw__card-name" }, shade.name || ""));
        card.appendChild(body);
        gridEl.appendChild(card);
      });
    }

    function renderReadouts() {
      var shade = selected();
      hubCode.textContent = shade ? shade.code || "" : "";
      hubFamily.textContent = family().name;
      position.textContent =
        (shade ? shade.code + " · " : "") + (state.shadeIndex + 1) + " " + opts.text.of + " " + list().length;
      live.textContent = shade ? shade.code + ", " + shade.name + ", " + family().name : "";
      wheelBox.setAttribute("aria-label", family().name + " " + opts.text.shades);
    }

    function renderAll() {
      renderRing();
      renderWheel();
      renderCard();
      renderGrid();
      renderReadouts();
    }

    /* -- Selection --------------------------------------------------- */

    function select(i) {
      var n = list().length;
      state.shadeIndex = ((i % n) + n) % n;
      state.rotation += shortestDelta(state.rotation, rotationFor(state.shadeIndex));
      renderWheel();
      renderCard();
      renderReadouts();
    }

    function selectFamily(i) {
      state.familyIndex = ((i % families.length) + families.length) % families.length;
      state.shadeIndex = 0;
      state.gridScope = "family";
      state.ringRotation += shortestDelta(state.ringRotation, -(arcs[state.familyIndex].mid));
      state.rotation += shortestDelta(state.rotation, rotationFor(0));
      renderAll();
    }

    function step(delta) {
      select(state.shadeIndex + delta);
    }

    prevBtn.addEventListener("click", function () {
      step(-1);
    });
    nextBtn.addEventListener("click", function () {
      step(1);
    });

    wheelBox.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); step(1); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); step(-1); }
      else if (e.key === "Home") { e.preventDefault(); select(0); }
      else if (e.key === "End") { e.preventDefault(); select(list().length - 1); }
      else if (e.key === "PageDown") { e.preventDefault(); selectFamily(state.familyIndex + 1); }
      else if (e.key === "PageUp") { e.preventDefault(); selectFamily(state.familyIndex - 1); }
    });

    /* -- Dragging ---------------------------------------------------- */

    var drag = null;
    var dragTravel = 0;

    function angleFrom(clientX, clientY) {
      var box = svg.getBoundingClientRect();
      var dx = clientX - (box.left + box.width / 2);
      var dy = clientY - (box.top + box.height / 2);
      return (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    }

    wheelGroup.addEventListener("pointerdown", function (e) {
      if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
      drag = { angle: angleFrom(e.clientX, e.clientY), rotation: state.rotation };
      dragTravel = 0;
      state.dragging = true;
      svg.classList.add("cw__svg--drag");
      wheelGroup.style.transition = "none";
    });

    wheelGroup.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var travelled = shortestDelta(drag.angle, angleFrom(e.clientX, e.clientY));
      dragTravel = Math.max(dragTravel, Math.abs(travelled));
      state.rotation = drag.rotation + travelled;
      wheelGroup.setAttribute("transform", "rotate(" + state.rotation + " " + CENTRE + " " + CENTRE + ")");
    });

    function endDrag() {
      if (!drag) return;
      drag = null;
      state.dragging = false;
      svg.classList.remove("cw__svg--drag");
      // Whichever wedge centre is nearest the pointer wins, and the wheel
      // settles exactly on it rather than wherever the finger stopped.
      var angle = wedgeAngle();
      var steps = Math.round((-state.rotation - angle / 2) / angle);
      select(steps);
    }

    wheelGroup.addEventListener("pointerup", endDrag);
    wheelGroup.addEventListener("pointercancel", endDrag);

    /* -- Search ------------------------------------------------------ */

    if (opts.search) {
      searchInput.addEventListener("input", function () {
        var q = searchInput.value.trim().toLowerCase();
        resultsList.innerHTML = "";
        if (!q) {
          resultsList.hidden = true;
          searchInput.setAttribute("aria-expanded", "false");
          return;
        }
        var digits = q.replace(/\D/g, "");
        var matches = shades
          .map(function (shade) {
            var code = String(shade.code || "").toLowerCase();
            var codeDigits = code.replace(/\D/g, "");
            var name = String(shade.name || "").toLowerCase();
            var rank = -1;
            if (digits && codeDigits === digits) rank = 0;
            else if (digits && codeDigits.indexOf(digits) === 0) rank = 1;
            else if (name.indexOf(q) === 0) rank = 2;
            else if (name.indexOf(q) > -1) rank = 3;
            else if (String(shade.productCode || "").toLowerCase().indexOf(q) > -1) rank = 4;
            return { shade: shade, rank: rank };
          })
          .filter(function (m) { return m.rank >= 0; })
          .sort(function (a, b) { return a.rank - b.rank; })
          .slice(0, 6);

        matches.forEach(function (m) {
          var li = htmlEl("li", {});
          var btn = htmlEl("button", { class: "cw__result", type: "button" });
          var chip = htmlEl("span", { class: "cw__chip", "aria-hidden": "true" });
          chip.style.background = m.shade.hex || "#E5E7EB";
          var textWrap = htmlEl("span", {});
          textWrap.appendChild(htmlEl("span", { style: "display:block;font-size:.875rem;font-weight:700" }, m.shade.code || ""));
          textWrap.appendChild(htmlEl("span", { style: "display:block;font-size:.75rem;color:var(--cw-muted)" }, m.shade.name || ""));
          btn.appendChild(chip);
          btn.appendChild(textWrap);
          btn.addEventListener("click", function () {
            jumpTo(m.shade);
          });
          li.appendChild(btn);
          resultsList.appendChild(li);
        });
        resultsList.hidden = matches.length === 0;
        searchInput.setAttribute("aria-expanded", matches.length ? "true" : "false");
      });

      searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          var first = resultsList.querySelector("button");
          if (first) { e.preventDefault(); first.click(); }
        } else if (e.key === "Escape") {
          searchInput.value = "";
          resultsList.innerHTML = "";
          resultsList.hidden = true;
        }
      });
    }

    function jumpTo(shade) {
      for (var f = 0; f < families.length; f++) {
        var i = families[f].shades.indexOf(shade);
        if (i > -1) {
          state.familyIndex = f;
          state.ringRotation += shortestDelta(state.ringRotation, -(arcs[f].mid));
          state.shadeIndex = i;
          state.rotation += shortestDelta(state.rotation, rotationFor(i));
          state.gridScope = "family";
          renderAll();
          break;
        }
      }
      if (searchInput) {
        searchInput.value = "";
        resultsList.innerHTML = "";
        resultsList.hidden = true;
        searchInput.setAttribute("aria-expanded", "false");
      }
    }

    /* -- Scale watch, so labels keep their size ---------------------- */

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(function (entries) {
        var width = entries[0] && entries[0].contentRect.width;
        if (!width) return;
        var next = width / SIZE;
        if (Math.abs(next - state.scale) < 0.01) return;
        state.scale = next;
        renderRing();
      }).observe(svg);
    }

    /* -- Go ---------------------------------------------------------- */

    state.ringRotation = -(arcs[0].mid);
    state.rotation = rotationFor(0);
    renderAll();

    return {
      element: container,
      select: select,
      selectFamily: selectFamily,
      jumpTo: jumpTo,
      get selected() {
        return selected();
      },
    };
  }

  /* ------------------------------------------------------------------ *
   * Plumbing
   * ------------------------------------------------------------------ */

  var uidCounter = 0;
  function uid(prefix) {
    uidCounter += 1;
    return prefix + "-" + uidCounter;
  }

  function chevron(direction) {
    var path =
      direction < 0
        ? "M10.72 2.22a.75.75 0 0 1 0 1.06L6 8l4.72 4.72a.75.75 0 1 1-1.06 1.06l-5.25-5.25a.75.75 0 0 1 0-1.06l5.25-5.25a.75.75 0 0 1 1.06 0Z"
        : "M5.28 2.22a.75.75 0 0 0 0 1.06L10 8l-4.72 4.72a.75.75 0 1 0 1.06 1.06l5.25-5.25a.75.75 0 0 0 0-1.06L6.34 2.22a.75.75 0 0 0-1.06 0Z";
    var svgIcon = svgEl("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "currentColor", "aria-hidden": "true" });
    svgIcon.appendChild(svgEl("path", { d: path }));
    return svgIcon;
  }

  /** Options from data- attributes, so a page needs no JavaScript of its own. */
  function readOptions(el) {
    var opts = {};
    if (el.dataset.grid !== undefined) opts.grid = el.dataset.grid !== "false";
    if (el.dataset.card !== undefined) opts.card = el.dataset.card !== "false";
    if (el.dataset.search !== undefined) opts.search = el.dataset.search !== "false";
    if (el.dataset.familyOrder) opts.familyOrder = el.dataset.familyOrder.split(",").map(function (s) { return s.trim(); });
    if (el.dataset.series) {
      // Renaming the ranges is how the wheel speaks another language when the
      // families are derived from codes rather than carried by the data.
      try { opts.series = JSON.parse(el.dataset.series); } catch (e) { console.error("[color-wheel] data-series is not valid JSON:", e); }
    }
    if (el.dataset.text) {
      try { opts.text = JSON.parse(el.dataset.text); } catch (e) { /* ignore malformed */ }
    }
    return opts;
  }

  function mount(el) {
    if (el._colorWheel) return el._colorWheel;
    var opts = readOptions(el);
    var inline = el.querySelector("script[type='application/json']");
    if (inline) {
      try {
        el._colorWheel = ColorWheel(el, JSON.parse(inline.textContent), opts);
      } catch (e) {
        console.error("[color-wheel] inline JSON is not valid:", e);
      }
      return el._colorWheel;
    }
    var url = el.dataset.shades;
    if (!url) {
      console.error("[color-wheel] needs data-shades, or an inline application/json script");
      return null;
    }
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status + " " + r.statusText);
        return r.json();
      })
      .then(function (data) {
        var shades = Array.isArray(data) ? data : data.shades;
        if (!Array.isArray(shades)) throw new Error("expected an array, or an object with a shades array");
        el._colorWheel = ColorWheel(el, shades, opts);
        el.dispatchEvent(new CustomEvent("color-wheel:ready", { detail: el._colorWheel }));
      })
      .catch(function (e) {
        console.error("[color-wheel] could not load " + url + ":", e);
      });
    return null;
  }

  function mountAll(root) {
    (root || document).querySelectorAll("[data-color-wheel]").forEach(mount);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { mountAll(); });
  } else {
    mountAll();
  }

  window.ColorWheel = { create: ColorWheel, mount: mount, mountAll: mountAll, defaults: DEFAULTS };
})();
