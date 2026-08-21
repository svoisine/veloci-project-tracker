// tokens.js — VPT's own warm visual identity (M2).
//
// Two complete token sets with identical keys, so components just read from the
// active theme's object. Nothing here is cool-toned: backgrounds carry an
// orange undertone in both modes, and no pure #000 / #fff appears anywhere.
//
// Accent hues are spread across the warm range so the lanes stay tellable
// apart: coral (deep) · gold (gap) · amber (in progress) · olive (done) ·
// rust (blocked).

export const DARK = {
  // deep warm charcoal-brown, not black
  bg: '#16100C',
  bg2: '#1F1712',
  bg3: '#2A1F18',

  line: 'rgba(255,226,199,.11)',
  line2: 'rgba(255,226,199,.06)',

  text: '#F8F0E7',
  text2: 'rgba(248,240,231,.62)',
  // .48 not .40 — tertiary labels (eyebrows, week tags, empty states) still
  // need to clear ~4.5:1 against bg2 to stay readable, not just recede.
  text3: 'rgba(248,240,231,.48)',

  deep: '#F0855F',
  gap: '#D9B23C',
  done: '#9FC46A',
  progress: '#F2A93B',
  blocked: '#E85F52',
  muted: 'rgba(248,240,231,.55)',

  deepSoft: 'rgba(240,133,95,.14)',
  gapSoft: 'rgba(217,178,60,.14)',
  doneSoft: 'rgba(159,196,106,.14)',
  progressSoft: 'rgba(242,169,59,.14)',
  blockedSoft: 'rgba(232,95,82,.15)',
  mutedSoft: 'rgba(248,240,231,.07)',

  // the ring track, and the faint wash behind the page
  track: 'rgba(255,226,199,.08)',
  wash: 'radial-gradient(1200px 500px at 50% -10%, rgba(242,169,59,.10), transparent 70%)',
  shadow: '0 1px 2px rgba(0,0,0,.4)',
};

export const LIGHT = {
  // warm cream, not white
  bg: '#FBF4E9',
  bg2: '#FFFCF6',
  bg3: '#F4E9D9',

  line: 'rgba(94,62,38,.16)',
  line2: 'rgba(94,62,38,.09)',

  text: '#2B1D12',
  text2: 'rgba(43,29,18,.68)',
  // Cream is a bright backdrop, so tertiary ink needs more weight here than in
  // dark mode: at .46 this measured 2.88:1, under even the large-text floor.
  text3: 'rgba(43,29,18,.62)',

  // darkened against cream so body text clears ~4.5:1
  deep: '#B04A24',
  gap: '#8A6410',
  done: '#4E7A2A',
  progress: '#9A6008',
  blocked: '#B33A2B',
  muted: 'rgba(43,29,18,.62)',

  deepSoft: 'rgba(176,74,36,.10)',
  gapSoft: 'rgba(138,100,16,.11)',
  doneSoft: 'rgba(78,122,42,.11)',
  progressSoft: 'rgba(154,96,8,.11)',
  blockedSoft: 'rgba(179,58,43,.10)',
  mutedSoft: 'rgba(94,62,38,.07)',

  track: 'rgba(94,62,38,.13)',
  wash: 'radial-gradient(1200px 500px at 50% -10%, rgba(242,169,59,.16), transparent 70%)',
  shadow: '0 1px 2px rgba(94,62,38,.10)',
};

export const THEMES = { light: LIGHT, dark: DARK };

// amber -> coral. Shared by both themes.
export const GRADIENT_FROM = '#F5B54A';
export const GRADIENT_TO = '#F2705C';
export const BRAND_GRADIENT = `linear-gradient(90deg,${GRADIENT_FROM},${GRADIENT_TO})`;

export const FONT_DISPLAY = "'Barlow Condensed', system-ui, sans-serif";
export const FONT_BODY = "'Space Grotesk', system-ui, sans-serif";
// Ids, sheet ranges, dates and file paths — anything the user might compare
// character by character. Nine components had their own copy of this string.
export const FONT_MONO = "ui-monospace, SFMono-Regular, 'Cascadia Mono', Consolas, monospace";

// The status vocabulary is the SERVER's, so it is defined once in
// shared/contract.js and re-exported here: a component asking tokens.js for it
// cannot end up a value out of step with what /api/step will accept.
export { STATUS_VALUES } from '../shared/contract.js';

export const STATUS_LABELS = {
  todo: 'To do',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
  skipped: 'Skipped',
};

/** Foreground + chip background for a status, in the active theme. */
export function statusColors(T, status) {
  switch (status) {
    case 'done':
      return { fg: T.done, bg: T.doneSoft };
    case 'in_progress':
      return { fg: T.progress, bg: T.progressSoft };
    case 'blocked':
      return { fg: T.blocked, bg: T.blockedSoft };
    case 'skipped':
      return { fg: T.muted, bg: T.mutedSoft };
    default:
      return { fg: T.text2, bg: T.mutedSoft };
  }
}
