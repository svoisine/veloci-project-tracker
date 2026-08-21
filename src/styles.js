// styles.js — the style objects more than one component needs.
//
// VPT styles inline rather than with a CSS framework, which is fine until the
// same twelve-line object is retyped in nine files: the app then has nine
// slightly different buttons and no way to restyle them at once. Anything
// shared lives here; anything genuinely one-off stays inline where it is used.
//
// Every function takes the active theme `T` (from useTheme) and returns a plain
// style object, so callers can spread and override:
//
//   style={{ ...primary(T), marginTop: 8 }}

import { FONT_BODY, FONT_DISPLAY } from './tokens.js';

// ------------------------------------------------------------------- surfaces

/** The page itself: warm background plus the radial wash. */
export const page = (T) => ({
  minHeight: '100%',
  background: T.bg,
  backgroundImage: T.wash,
  padding: '36px 32px 56px',
});

/** The centred column every view is laid out in. */
export const shell = { maxWidth: 1180, margin: '0 auto' };

/** The standard raised panel. Every section on the dashboard is one of these. */
export const card = (T) => ({
  background: T.bg2,
  border: `1px solid ${T.line}`,
  borderRadius: 14,
  padding: '18px 20px',
  boxShadow: T.shadow,
});

// --------------------------------------------------------------------- type

/** The small uppercase label above a figure ("PROGRESS", "NEXT MILESTONE"). */
export const eyebrow = (T) => ({
  fontFamily: FONT_BODY,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: T.text3,
});

/** The even smaller uppercase label above a form control. */
export const fieldLabel = (T) => ({
  fontFamily: FONT_BODY,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '.13em',
  textTransform: 'uppercase',
  color: T.text3,
  marginBottom: 5,
});

/** A section's <h2>. `color` is the section's accent. */
export const sectionHeading = (color) => ({
  fontFamily: FONT_DISPLAY,
  fontSize: 20,
  fontWeight: 600,
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  color,
  margin: 0,
  flex: 1,
});

/** A panel's <h2> — used by the editor and the new-project form. */
export const panelHeading = (T) => ({
  fontFamily: FONT_DISPLAY,
  fontSize: 22,
  fontWeight: 600,
  letterSpacing: '.05em',
  textTransform: 'uppercase',
  color: T.deep,
  margin: 0,
});

/** The muted explanatory line under a heading. */
export const hintText = (T) => ({
  fontFamily: FONT_BODY,
  fontSize: 11.5,
  color: T.text3,
});

export const bodyText = (T) => ({
  fontFamily: FONT_BODY,
  fontSize: 12.5,
  color: T.text2,
  lineHeight: 1.5,
});

// ------------------------------------------------------------------ fragments

/** The little square that colour-codes a section heading. */
export const dot = (color) => ({
  width: 7,
  height: 7,
  borderRadius: 2,
  background: color,
  flexShrink: 0,
});

/** The pill holding a section's item count. */
export const countChip = (fg, bg) => ({
  fontFamily: FONT_DISPLAY,
  fontSize: 15,
  fontWeight: 600,
  color: fg,
  background: bg,
  borderRadius: 999,
  padding: '1px 10px',
  minWidth: 28,
  textAlign: 'center',
});

/** The hairline a section's list sits below. */
export const listDivider = (T) => ({ borderTop: `1px solid ${T.line2}`, paddingTop: 6 });

export const emptyLine = (T) => ({
  fontFamily: FONT_BODY,
  fontSize: 12.5,
  color: T.text3,
  padding: '12px 0',
});

// -------------------------------------------------------------------- controls

/** Text input / textarea. `size` picks the roomier form variant. */
export function input(T, { size = 'compact', ...extra } = {}) {
  const roomy = size === 'roomy';
  return {
    width: '100%',
    fontFamily: FONT_BODY,
    fontSize: roomy ? 13 : 12.5,
    lineHeight: 1.5,
    color: T.text,
    background: T.bg,
    border: `1px solid ${T.line}`,
    borderRadius: 8,
    padding: roomy ? '9px 11px' : '8px 10px',
    outline: 'none',
    ...extra,
  };
}

/**
 * A filled button. `color` is the accent it fills with (T.deep for "go on",
 * T.done for "save"); a disabled button drops to the muted pair rather than
 * relying on opacity, which reads as broken on a warm background.
 */
export function primary(T, { color = T.deep, disabled = false, size = 'sm' } = {}) {
  const lg = size === 'lg';
  return {
    fontFamily: FONT_BODY,
    fontSize: lg ? 12.5 : 11.5,
    fontWeight: 600,
    letterSpacing: lg ? '.03em' : undefined,
    color: disabled ? T.text3 : T.bg,
    background: disabled ? T.mutedSoft : color,
    border: 'none',
    borderRadius: lg ? 9 : 7,
    padding: lg ? '9px 18px' : '6px 14px',
    cursor: disabled ? 'default' : 'pointer',
  };
}

/** An outlined, low-emphasis button: Cancel, Close, Clear all. */
export function ghost(T, { size = 'sm', disabled = false } = {}) {
  const lg = size === 'lg';
  return {
    fontFamily: FONT_BODY,
    fontSize: lg ? 12.5 : 11.5,
    fontWeight: lg ? 600 : undefined,
    letterSpacing: lg ? '.03em' : undefined,
    color: disabled ? T.text3 : T.text2,
    background: 'transparent',
    border: `1px solid ${T.line}`,
    borderRadius: lg ? 9 : 7,
    padding: lg ? '8px 14px' : '6px 12px',
    cursor: disabled ? 'default' : 'pointer',
  };
}

// ----------------------------------------------------------------------- tone

/**
 * ok / warn / error -> the accent pair that says it. Used by notices, toasts
 * and inline flashes so a warning is the same amber everywhere.
 */
export function toneColors(T, tone) {
  if (tone === 'ok') return { fg: T.done, bg: T.doneSoft };
  if (tone === 'warn') return { fg: T.progress, bg: T.progressSoft };
  return { fg: T.blocked, bg: T.blockedSoft };
}
