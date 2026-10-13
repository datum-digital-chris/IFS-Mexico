/**
 * Apply the client's requested wording changes (cfg.copyEdits) to extracted
 * content.
 *
 * Applied to every string the extractor writes, so a page title, a nav label
 * and a sentence in the body all change together. Only words a reader sees are
 * changed, never an address:
 *
 * - fields that hold an address or an identifier (href, src, image, path, slug,
 *   key, id, className) are skipped outright;
 * - inside HTML, only the text between tags and the readable attributes (alt,
 *   title, aria-label) are edited, so an href or a file name in markup is left
 *   alone;
 * - a word joined to `-`, `_`, `/`, `#` or another letter is not a whole word
 *   and is not matched, which covers slugs and anchors in plain text too.
 *
 * Renaming any of those would break URLs the old site already published.
 *
 * compare-content applies the same edits to the old copy before comparing, so
 * an approved edit reads as the copy surviving rather than as copy lost.
 */
import cfg from "../site.config.mjs";

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const EDITS = (cfg.copyEdits ?? []).map(({ from, to }) => ({
  pattern: new RegExp(`(?<![\\p{L}\\p{N}/#_-])${escape(from)}(?![\\p{L}\\p{N}/_-])`, "gu"),
  to,
}));

/** Keys whose value is an address or an identifier, never reader-facing copy. */
const SKIP_KEY = /^(href|src|path|slug|key|id|className|url)$|Image$|Href$/;

const READABLE_ATTR = /(\s(?:alt|title|aria-label)=")([^"]*)(")/g;

const editWords = (text) => EDITS.reduce((out, { pattern, to }) => out.replace(pattern, to), text);

/** Apply every edit to one run of text or HTML. */
export function editText(text) {
  return text
    .split(/(<[^>]*>)/)
    .map((part, i) =>
      i % 2 === 0
        ? editWords(part)
        : part.replace(READABLE_ATTR, (_, a, v, b) => a + editWords(v) + b),
    )
    .join("");
}

/** Apply every edit to each reader-facing string in a JSON-shaped value. */
export function editContent(value, key = "") {
  if (SKIP_KEY.test(key)) return value;
  if (typeof value === "string") return editText(value);
  if (Array.isArray(value)) return value.map((v) => editContent(v));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, editContent(v, k)]));
  }
  return value;
}
