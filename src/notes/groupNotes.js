// notes/groupNotes.js — how the feed is arranged on screen.
//
// Pure functions, no React, no theme: given the items the backend sent and the
// filters the user has set, return the groups to render. Same reason the brief
// keeps its computation out of its components — the rules about what appears
// where are worth reading on their own, and this is the part with rules.
//
// The backend has already sorted items new → changed → unchanged, then by id.
// Grouping preserves that order, which is what puts new and changed at the top
// of every status group without a second sort.

import { STATUS_LABELS, STATUS_VALUES } from '../tokens.js';

/**
 * Group order, most-actionable-looking first. Done leads because the feature
 * exists for exactly that case: a note left on a step you have already ticked
 * off is the one nobody would otherwise ever see again.
 */
export const GROUP_ORDER = ['done', 'in_progress', 'blocked', 'skipped', 'todo'];

/**
 * A status VPT doesn't know reads as 'todo', the same fallback StatusChip
 * makes. A messy sheet full of "WIP" must not drop those notes out of every
 * group and off the page entirely.
 */
export const groupOf = (status) => (STATUS_VALUES.includes(status) ? status : 'todo');

export const labelOf = (status) => STATUS_LABELS[status] || status;

const asList = (v) => (Array.isArray(v) ? v : []);
const text = (v) => (v === undefined || v === null ? '' : String(v));

/** An item is unseen if it is new or changed — the two states the badge counts. */
export const isUnseen = (item) => item?.state === 'new' || item?.state === 'changed';

/**
 * @param {object[]} items      feed items from /api/notes
 * @param {object}   filters
 * @param {Set<string>} filters.statuses   which status groups to show
 * @param {boolean}  filters.unseenOnly    new & changed only, vs all notes
 * @param {string}   filters.query         free-text over title, note and id
 * @param {number}   filters.limit         cap on how many are actually rendered
 * @returns {{ groups, shown: number, matched: number, hidden: number, capped: boolean }}
 *
 * `matched` is how many passed the filters; `shown` is how many survived
 * `limit`. They differ only when the cap bites, which is what the panel needs
 * to know to say so.
 *
 * Empty groups are dropped rather than rendered as empty headings: five
 * headings over one note is a worse panel than one heading over one note.
 */
export function groupNotes(items, { statuses, unseenOnly = false, query = '', limit = Infinity } = {}) {
  const all = asList(items);
  const needle = text(query).trim().toLowerCase();

  const kept = all.filter((item) => {
    if (!item) return false;
    if (statuses && !statuses.has(groupOf(item.status))) return false;
    if (unseenOnly && !isUnseen(item)) return false;
    if (needle) {
      const hay = `${text(item.title)} ${text(item.notes)} ${text(item.id)}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  // The cap applies AFTER filtering and to the already-sorted list, so the
  // notes it keeps are the ones the user most needs (new, then changed) and
  // every filter still reaches the whole set. Counts and the header badge are
  // computed from the full feed, so nothing here changes what VPT reports —
  // only how much of it is put in the DOM at once.
  const shown = kept.length > limit ? kept.slice(0, limit) : kept;

  const groups = GROUP_ORDER.map((status) => ({
    status,
    label: labelOf(status),
    items: shown.filter((item) => groupOf(item.status) === status),
  })).filter((g) => g.items.length > 0);

  return {
    groups,
    shown: shown.length,
    matched: kept.length,
    hidden: all.length - kept.length,
    capped: kept.length > shown.length,
  };
}

/** How many notes sit under each status, ignoring every filter — for the chips. */
export function countsByStatus(items) {
  const counts = {};
  for (const status of GROUP_ORDER) counts[status] = 0;
  for (const item of asList(items)) {
    const status = groupOf(item?.status);
    counts[status] = (counts[status] || 0) + 1;
  }
  return counts;
}
