/**
 * Compile Oxygen CSS declarations into Tailwind utility classes.
 *
 * The old site's design is ~1,000 ID-based declaration blocks. Rather than
 * re-typing those values by eye into components (which is where visual drift
 * in a "pixel-for-pixel" port actually comes from), this reads each element's
 * declared style and emits the equivalent utilities. Fidelity is therefore a
 * property of the transform, not of anyone's attention to detail.
 *
 * Values that match a theme token emit the token's utility (`text-brand`);
 * everything else emits an arbitrary value (`text-[38px]`). A high arbitrary
 * ratio is a signal that a value should have become a token - the extractor
 * reports it.
 */

/** Theme tokens, kept in step with src/styles/theme.css. */
const COLOR = {
  "#fc0004": "brand",
  "#777474": "brand-hover",
  "#404040": "ink",
  "#52565a": "ink-muted",
  "#ffffff": "surface",
  "#fff": "surface",
  white: "surface",
  "#eeeeee": "surface-alt",
  "#e5e5e5": "surface-sunken",
  "#c9c9c9": "surface-edge",
};

const FONT = {
  roboto: "body",
  "noto sans jp": "heading",
  "nunito sans": "accent",
};

/** Oxygen max-width tiers -> the Tailwind min-width prefix that overrides them. */
export const BUCKET_PREFIX = { base: "", "max-1120": "xl:", "max-991": "lg:", "max-767": "md:", "max-479": "sm:" };

const px = (v) => {
  const m = String(v).trim().match(/^(-?[\d.]+)px$/);
  return m ? m[1] : null;
};

/** `0px` -> `0`, `30px` -> `[30px]`, `50%` -> `[50%]`. */
const len = (v) => {
  const p = px(v);
  if (p === "0") return "0";
  return `[${String(v).trim().replace(/\s+/g, "_")}]`;
};

/** Computed styles report colours as rgb()/rgba(); tokens are keyed by hex. */
const toHex = (v) => {
  const m = String(v).match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)\s*(?:[,/]\s*([\d.]+)\s*)?\)$/i);
  if (!m) return String(v).trim().toLowerCase();
  const a = m[4] === undefined ? 1 : Number(m[4]);
  if (a === 0) return "transparent";
  const hex = "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  return a === 1 ? hex : `rgba(${m[1]},${m[2]},${m[3]},${a})`;
};

const colorUtil = (prefix, v) => {
  const key = toHex(v);
  if (key === "transparent") return `${prefix}-transparent`;
  if (key === "currentcolor" || key === "initial") return null;
  const token = COLOR[key];
  return token ? `${prefix}-${token}` : `${prefix}-[${key.replace(/\s+/g, "")}]`;
};

const SIDES = { top: "t", right: "r", bottom: "b", left: "l" };

const FONT_WEIGHT = { 300: "light", 400: "normal", 500: "medium", 600: "semibold", 700: "bold", 800: "extrabold", 900: "black" };

/**
 * @param {Record<string,string>} decls one element's declarations
 * @returns {{classes: string[], unhandled: Record<string,string>}}
 */
export function declsToTw(decls) {
  const out = [];
  const unhandled = {};

  for (const [rawProp, rawVal] of Object.entries(decls)) {
    const prop = rawProp.trim().toLowerCase();
    const important = /!important\s*$/.test(String(rawVal));
    const val = String(rawVal).replace(/\s*!important\s*$/, "").trim();
    const v = val.toLowerCase();
    let c = null;

    switch (true) {
      case prop === "color":
        c = colorUtil("text", v);
        break;
      case prop === "background-color":
        c = colorUtil("bg", v);
        break;
      case prop === "font-size":
        c = `text-${len(val)}`;
        break;
      case prop === "font-weight":
        c = FONT_WEIGHT[v] ? `font-${FONT_WEIGHT[v]}` : `font-[${v}]`;
        break;
      case prop === "font-family": {
        const key = v.replace(/['"]/g, "").split(",")[0].trim();
        c = FONT[key] ? `font-${FONT[key]}` : `font-[${key.replace(/\s+/g, "_")}]`;
        break;
      }
      case prop === "font-style":
        c = v === "italic" ? "italic" : "not-italic";
        break;
      case prop === "text-align":
        c = ["left", "center", "right", "justify"].includes(v) ? `text-${v}` : null;
        break;
      case prop === "text-decoration" || prop === "text-decoration-line":
        c = v.includes("underline") ? "underline" : v.includes("line-through") ? "line-through" : "no-underline";
        break;
      case prop === "text-transform":
        c = ["uppercase", "lowercase", "capitalize"].includes(v) ? v : "normal-case";
        break;
      case prop === "line-height":
        c = `leading-${len(val)}`;
        break;
      case prop === "letter-spacing":
        c = `tracking-${len(val)}`;
        break;

      case prop === "margin":
        c = `m-${len(val)}`;
        break;
      case prop === "padding":
        c = `p-${len(val)}`;
        break;
      case /^margin-(top|right|bottom|left)$/.test(prop):
        c = `m${SIDES[prop.split("-")[1]]}-${len(val)}`;
        break;
      case /^padding-(top|right|bottom|left)$/.test(prop):
        c = `p${SIDES[prop.split("-")[1]]}-${len(val)}`;
        break;

      case prop === "width":
        c = v === "100%" ? "w-full" : `w-${len(val)}`;
        break;
      case prop === "height":
        c = v === "100%" ? "h-full" : `h-${len(val)}`;
        break;
      case prop === "min-height":
        c = `min-h-${len(val)}`;
        break;
      case prop === "max-width":
        c = v === "100%" ? "max-w-full" : `max-w-${len(val)}`;
        break;
      case prop === "min-width":
        c = `min-w-${len(val)}`;
        break;

      case prop === "display":
        c = { block: "block", flex: "flex", "inline-block": "inline-block", inline: "inline", none: "hidden", grid: "grid" }[v] ?? null;
        break;
      case prop === "flex-direction":
        c = { row: "flex-row", column: "flex-col", "row-reverse": "flex-row-reverse", "column-reverse": "flex-col-reverse" }[v] ?? null;
        break;
      case prop === "flex-wrap":
        c = { wrap: "flex-wrap", nowrap: "flex-nowrap", "wrap-reverse": "flex-wrap-reverse" }[v] ?? null;
        break;
      case prop === "align-items":
        c = { "flex-start": "items-start", "flex-end": "items-end", center: "items-center", stretch: "items-stretch", baseline: "items-baseline" }[v] ?? null;
        break;
      case prop === "justify-content":
        c = { "flex-start": "justify-start", "flex-end": "justify-end", center: "justify-center", "space-between": "justify-between", "space-around": "justify-around" }[v] ?? null;
        break;
      case prop === "gap":
        c = `gap-${len(val)}`;
        break;

      // Oxygen writes borders as a shorthand or as split width/style/colour
      // parts. Widths arrive unitless ("2") as well as in px.
      case prop === "border": {
        if (v === "none" || v === "0") { c = "border-0"; break; }
        const m = val.match(/^([\d.]+)px\s+(\w+)\s+(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))$/);
        if (m) {
          out.push(m[1] === "1" ? "border" : `border-${len(m[1] + "px")}`);
          if (m[2] !== "solid") out.push(`border-${m[2]}`);
          const bc = colorUtil("border", m[3]);
          if (bc) out.push(bc);
        } else {
          out.push(`border-[${val.replace(/\s+/g, "_")}]`);
        }
        break;
      }
      case /^border-(top|right|bottom|left)-width$/.test(prop): {
        const side = SIDES[prop.split("-")[1]];
        const w = /^[\d.]+$/.test(v) ? `${v}px` : val;
        c = w === "1px" ? `border-${side}` : `border-${side}-${len(w)}`;
        break;
      }
      case /^border-(top|right|bottom|left)-color$/.test(prop):
        c = colorUtil(`border-${SIDES[prop.split("-")[1]]}`, v);
        break;
      case /^border-(top|right|bottom|left)-style$/.test(prop):
        c = v === "none" ? `border-${SIDES[prop.split("-")[1]]}-0` : null;
        break;
      case prop === "border-width":
        c = /^[\d.]+$/.test(v) ? `border-${len(v + "px")}` : `border-${len(val)}`;
        break;
      case prop === "border-color":
        c = colorUtil("border", v);
        break;
      case prop === "border-style":
        c = ["solid", "dashed", "dotted", "double", "none"].includes(v) ? (v === "none" ? "border-0" : `border-${v}`) : null;
        break;
      case prop === "transition-property":
        c = v === "all" ? "transition-all" : v === "none" ? "transition-none" : `transition-[${v.replace(/\s+/g, "")}]`;
        break;
      case prop === "transition-duration":
        c = `duration-[${v.replace(/\s+/g, "")}]`;
        break;
      case prop === "transition-timing-function":
        c = { ease: "ease-in-out", linear: "ease-linear", "ease-in": "ease-in", "ease-out": "ease-out", "ease-in-out": "ease-in-out" }[v] ?? `ease-[${v.replace(/\s+/g, "")}]`;
        break;
      case prop === "cursor":
        c = `cursor-${v}`;
        break;
      case /^border-(top|bottom)-(left|right)-radius$/.test(prop): {
        const [, edge, side] = prop.match(/^border-(top|bottom)-(left|right)-radius$/);
        c = `rounded-${edge === "top" ? "t" : "b"}${side === "left" ? "l" : "r"}-${len(val)}`;
        break;
      }
      case prop === "border-radius":
        c = `rounded-${len(val)}`;
        break;
      case prop === "box-shadow":
        c = v === "none" ? "shadow-none" : `shadow-[${val.replace(/\s+/g, "_")}]`;
        break;
      case prop === "opacity":
        c = `opacity-[${v}]`;
        break;
      case prop === "overflow":
        c = ["hidden", "auto", "scroll", "visible"].includes(v) ? `overflow-${v}` : null;
        break;
      case prop === "position":
        c = ["relative", "absolute", "fixed", "sticky", "static"].includes(v) ? v : null;
        break;
      case prop === "z-index":
        c = `z-${len(val)}`;
        break;

      // Background images are resolved to local assets by the extractor and
      // bound as a CSS custom property, so they are not compiled here.
      case prop === "background-image":
      case prop === "background-size":
      case prop === "background-position":
      case prop === "background-repeat":
      case prop === "background-blend-mode":
        break;

      default:
        unhandled[prop] = val;
    }

    if (c) out.push(important ? `${c}!` : c);
  }

  return { classes: [...new Set(out)], unhandled };
}

/**
 * Compile an element's full bucket map into one ordered class string.
 *
 * Oxygen is desktop-first (`@media (max-width:991px)` overrides downward);
 * Tailwind is mobile-first (`lg:` applies upward). Emitting one for the other
 * directly inverts the design - the desktop value lands on mobile. So the
 * effective value is resolved per viewport range first, then a class is emitted
 * only where the value actually changes going up the ranges.
 *
 * Ranges, narrowest first, with the Tailwind prefix that starts each:
 *   0-479 ""  480-767 "sm:"  768-991 "md:"  992-1120 "lg:"  1121+ "xl:"
 *
 * `defaults` carries the Oxygen component-class base style (e.g.
 * `.ct-new-columns{flex-direction:row}`). Without it an element that only
 * overrides a property at a narrow breakpoint never regains its wide value,
 * because the wide value was never in its own ID rule.
 *
 * @param {Record<string, Record<string,string>>} buckets
 * @param {Record<string,string>} [defaults] component-class base declarations
 */
export function elementToTw(buckets, defaults = {}, orders = null) {
  buckets = { ...buckets, base: { ...defaults, ...(buckets.base ?? {}) } };

  // Oxygen marks its mobile stacking rules `!important` inside a max-width
  // query, so importance is scoped to narrow screens. Translated mobile-first
  // that class sits in the base layer, where `!important` would beat the wide
  // restore at every width. Importance therefore has to apply to every
  // breakpoint of that property, not only the one that declared it.
  const importantProps = new Set();
  for (const decls of Object.values(buckets)) {
    for (const [prop, val] of Object.entries(decls)) {
      if (/!important\s*$/.test(String(val))) importantProps.add(prop);
    }
  }
  if (importantProps.size) {
    buckets = Object.fromEntries(
      Object.entries(buckets).map(([bucket, decls]) => [
        bucket,
        Object.fromEntries(
          Object.entries(decls).map(([prop, val]) => {
            if (!importantProps.has(prop)) return [prop, val];
            return [prop, `${String(val).replace(/\s*!important\s*$/, "")} !important`];
          }),
        ),
      ]),
    );
  }
  // Which Oxygen buckets are in force in each range, narrowest override first.
  const RANGES = [
    { prefix: "", from: ["max-479", "max-767", "max-991", "max-1120", "base"] },
    { prefix: "sm:", from: ["max-767", "max-991", "max-1120", "base"] },
    { prefix: "md:", from: ["max-991", "max-1120", "base"] },
    { prefix: "lg:", from: ["max-1120", "base"] },
    { prefix: "xl:", from: ["base"] },
  ];

  const unhandled = {};
  const props = new Set();
  for (const b of Object.values(buckets)) for (const k of Object.keys(b)) props.add(k);

  // Effective declarations per range. Where several buckets that apply to the
  // range set the same property, CSS resolves by source order, so the latest
  // declaration wins - not the narrowest media query. `from` is listed
  // narrowest-first, so when no source order is known the implicit rank keeps
  // the narrower bucket ahead.
  const resolved = RANGES.map(({ from }) => {
    const decls = {};
    for (const prop of props) {
      let bestRank = -Infinity;
      let bestVal;
      from.forEach((bucket, i) => {
        const v = buckets[bucket]?.[prop];
        if (v === undefined) return;
        const rank = orders?.[bucket]?.[prop] ?? from.length - i;
        if (rank > bestRank) {
          bestRank = rank;
          bestVal = v;
        }
      });
      if (bestVal !== undefined) decls[prop] = bestVal;
    }
    return decls;
  });

  const classes = [];
  let previous = null;
  RANGES.forEach(({ prefix }, i) => {
    // Only declarations that differ from the next-narrower range need a class.
    const decls = {};
    for (const [prop, val] of Object.entries(resolved[i])) {
      if (previous && previous[prop] === val) continue;
      decls[prop] = val;
    }
    previous = resolved[i];
    if (!Object.keys(decls).length) return;
    const r = declsToTw(decls);
    classes.push(...r.classes.map((c) => (prefix ? `${prefix}${c}` : c)));
    Object.assign(unhandled, r.unhandled);
  });

  return { className: classes.join(" "), unhandled };
}

/**
 * Base styles Oxygen applies through its component classes, read from
 * universal.css. Merged into an element's base bucket by the extractor.
 */
export const COMPONENT_DEFAULTS = {
  section: { width: "100%" },
  div_block: { display: "flex", "flex-wrap": "nowrap", "flex-direction": "column", "align-items": "flex-start" },
  new_columns: { display: "flex", width: "100%", "flex-direction": "row", "align-items": "stretch", "justify-content": "center", "flex-wrap": "wrap" },
  link_button: { display: "inline-block", "text-align": "center", "border-radius": "3px" },
};
