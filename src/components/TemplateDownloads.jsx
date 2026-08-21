// TemplateDownloads.jsx — hand the user a sheet that will parse on first connect.
//
// VPT finds its columns by header name, so a sheet built from scratch usually
// fails on the first pull for a boring reason (a renamed tab, a missing
// column). Shipping the exact CSV removes that whole class of first-run
// failure.
//
// Fetched rather than linked directly so a missing templates/ file shows a
// sentence in the panel instead of dumping JSON into a browser tab.

import { useState } from 'react';

import { useTheme } from '../theme.jsx';
import { FONT_BODY, FONT_MONO } from '../tokens.js';

const FILES = {
  tracker: { url: '/api/template/tracker.csv', name: 'VPT_Tracker_Template.csv', label: 'Tracker template' },
  kn: { url: '/api/template/kn.csv', name: 'VPT_KN_Template.csv', label: 'KN template' },
};

// The one call in the app that does NOT go through api.js: this wants the CSV
// bytes, not a JSON envelope. It still has to read the backend's JSON when the
// download FAILS, since that is how a missing template explains itself.
async function download(which) {
  const { url, name } = FILES[which];

  const res = await fetch(url);
  if (!res.ok) {
    // The backend answers a missing template with JSON we can read out loud.
    let message = `Could not download the template (${res.status}).`;
    try {
      const json = await res.json();
      if (json?.error) message = json.error;
    } catch {
      /* not JSON — keep the status-based message */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the save before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(href), 10000);
}

export default function TemplateDownloads() {
  const { T } = useTheme();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const get = async (which) => {
    setBusy(which);
    setError(null);
    setDone(null);
    try {
      await download(which);
      setDone(which);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      style={{
        background: T.deepSoft,
        border: `1px solid ${T.deep}33`,
        borderRadius: 9,
        padding: '11px 13px',
        marginTop: 14,
      }}
    >
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.deep, marginBottom: 3 }}>
        Start from the template
      </div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.text2, lineHeight: 1.55 }}>
        Import this into Google Sheets (<strong>File → Import</strong>), name the tab{' '}
        <code style={{ fontFamily: FONT_MONO }}>Tracker</code>, and optionally add a second tab{' '}
        <code style={{ fontFamily: FONT_MONO }}>KN</code> from the KN template. The headers are what VPT
        reads, so keeping them is what makes the first connect work.
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {Object.keys(FILES).map((which) => (
          <button
            key={which}
            type="button"
            onClick={() => get(which)}
            disabled={busy !== null}
            style={{
              fontFamily: FONT_BODY,
              fontSize: 11.5,
              fontWeight: 600,
              color: T.bg,
              background: which === 'tracker' ? T.deep : T.gap,
              border: 'none',
              borderRadius: 7,
              padding: '7px 12px',
              cursor: busy !== null ? 'progress' : 'pointer',
              opacity: busy !== null && busy !== which ? 0.55 : 1,
            }}
          >
            {busy === which ? 'Downloading…' : `↓ ${FILES[which].label} (CSV)`}
          </button>
        ))}
      </div>

      {done ? (
        <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.done, marginTop: 8 }}>
          Saved {FILES[done].name} — check your downloads folder.
        </div>
      ) : null}

      {error ? (
        <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.blocked, marginTop: 8, lineHeight: 1.55 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
