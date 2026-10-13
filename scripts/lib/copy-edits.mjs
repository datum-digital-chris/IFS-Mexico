/**
 * Apply the client's requested wording changes (cfg.copyEdits) to extracted
 * content.
 *
 * Applied to every string the extractor writes, so a page title, a nav label
 * and a sentence in the body all change together. A word joined to a hyphen or
 * a slash is left alone: that is a slug, an anchor or a file name, and renaming
 * those would break URLs the old site already published.
 *
 * compare-content applies the same edits to the old copy before comparing, so
 * an approved edit reads as the copy surviving rather than as copy lost.
 */
import cfg from "../site.config.mjs";

const EDITS = (cfg.copyEdits ?? []).map(({ from, to }) => ({
  pattern: new RegExp(`(?<![\\p{L}\\p{N}/-])${from}(?![\\p{L}\\p{N}/-])`, "gu"),
  to,
}));

/** Apply every edit to one run of text. */
export function editText(text) {
  return EDITS.reduce((out, { pattern, to }) => out.replace(pattern, to), text);
}

/** Apply every edit to each string in a JSON-shaped value. */
export function editContent(value) {
  if (typeof value === "string") return editText(value);
  if (Array.isArray(value)) return value.map(editContent);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, editContent(v)]));
  }
  return value;
}
