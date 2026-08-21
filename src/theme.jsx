// theme.jsx — light/dark with a fixed time-of-day schedule (M2, Part C).
//
// Rules, exactly as specified:
//   · auto: light from 08:00, dark from 19:30 (local time)
//   · a manual toggle wins until the NEXT scheduled boundary, then auto resumes
//   · the schedule is re-evaluated while the app is open
//   · the last effective theme is persisted so a reload doesn't flash

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { THEMES } from './tokens.js';

export const LIGHT_START_MIN = 8 * 60; // 08:00
export const DARK_START_MIN = 19 * 60 + 30; // 19:30

const OVERRIDE_KEY = 'vpt.theme.override';
export const LAST_THEME_KEY = 'vpt.theme.last';

// How often we re-check the clock while the tab is open.
const TICK_MS = 30_000;

/** Which theme the schedule alone wants at this moment. */
export function autoThemeAt(date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= LIGHT_START_MIN && minutes < DARK_START_MIN ? 'light' : 'dark';
}

/** The next 08:00 or 19:30 strictly after `date`. */
export function nextBoundaryAfter(date) {
  const candidates = [];
  for (const dayOffset of [0, 1]) {
    for (const mins of [LIGHT_START_MIN, DARK_START_MIN]) {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + dayOffset);
      d.setMinutes(mins);
      if (d > date) candidates.push(d);
    }
  }
  candidates.sort((a, b) => a - b);
  return candidates[0];
}

/**
 * An override survives only until the first schedule boundary after the moment
 * it was made. Flip to light at 20:00 and it holds until 08:00; flip to dark at
 * 09:00 and it holds until 19:30.
 */
export function resolveTheme(override, now) {
  if (override && override.theme) {
    const at = new Date(override.at);
    if (!Number.isNaN(at.getTime())) {
      const expiresAt = nextBoundaryAfter(at);
      if (now < expiresAt) {
        return { theme: override.theme, overridden: true, until: expiresAt };
      }
    }
  }
  return { theme: autoThemeAt(now), overridden: false, until: nextBoundaryAfter(now) };
}

function readOverride() {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.theme ? parsed : null;
  } catch {
    return null;
  }
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [override, setOverride] = useState(readOverride);
  const [now, setNow] = useState(() => new Date());

  // Re-evaluate on a timer and whenever the user comes back to the tab, so a
  // dashboard left open overnight crosses 19:30 on its own.
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, TICK_MS);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  const resolved = useMemo(() => resolveTheme(override, now), [override, now]);
  const { theme, overridden, until } = resolved;

  // Drop a spent override so it can't be resurrected by a clock change.
  useEffect(() => {
    if (override && !overridden) {
      setOverride(null);
      try {
        localStorage.removeItem(OVERRIDE_KEY);
      } catch {
        /* storage disabled — the in-memory clear is enough */
      }
    }
  }, [override, overridden]);

  // Persist the effective theme and paint the page background, so the next
  // reload starts on the right colour instead of flashing.
  useEffect(() => {
    try {
      localStorage.setItem(LAST_THEME_KEY, theme);
    } catch {
      /* ignore */
    }
    const T = THEMES[theme];
    document.documentElement.dataset.theme = theme;
    document.body.style.background = T.bg;
    document.body.style.color = T.text;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    const next = { theme: theme === 'dark' ? 'light' : 'dark', at: new Date().toISOString() };
    setOverride(next);
    try {
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, [theme]);

  const value = useMemo(
    () => ({ theme, T: THEMES[theme], toggle, overridden, until }),
    [theme, toggle, overridden, until]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
