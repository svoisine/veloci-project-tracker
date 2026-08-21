// FolderPath.jsx — a path you can act on, not just read.
//
// Telling someone "put the file at C:\Users\you\.vpt\service_account.json" and
// leaving them to go find it is the weakest moment in the whole setup. A web
// page can't open a file manager — `file://` links are blocked from an http://
// page — but VPT's backend runs on this machine and can, via
// POST /api/setup/reveal.
//
// Copy-to-clipboard is the fallback rather than an afterthought: on a headless
// or locked-down machine there may be no file manager to launch, and pasting
// the path into a save dialog works everywhere.

import { useState } from 'react';

import { post } from '../api.js';
import { useTheme } from '../theme.jsx';
import { FONT_BODY, FONT_MONO } from '../tokens.js';

export default function FolderPath({ path, note }) {
  const { T } = useTheme();
  const [status, setStatus] = useState(null); // {tone, text}

  const say = (tone, text) => {
    setStatus({ tone, text });
    setTimeout(() => setStatus(null), 6000);
  };

  const open = async () => {
    const json = await post('/api/setup/reveal');
    if (json.ok) say('ok', 'Opened the folder — drop your service_account.json in there.');
    else say('warn', `Couldn't open a file manager here. Copy the path instead. (${json.error || json.reason})`);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(path);
      say('ok', 'Path copied.');
    } catch {
      say('warn', 'Clipboard blocked by the browser — select the path above and copy it manually.');
    }
  };

  return (
    <div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          color: T.text,
          background: T.bg3,
          border: `1px solid ${T.line2}`,
          borderRadius: 6,
          padding: '7px 9px',
          margin: '6px 0 0',
          wordBreak: 'break-all',
          userSelect: 'all', // one click selects the whole path
        }}
      >
        {path}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
        <LinkButton T={T} onClick={open}>
          Open this folder
        </LinkButton>
        <LinkButton T={T} onClick={copy}>
          Copy path
        </LinkButton>
        {note ? (
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.text3 }}>{note}</span>
        ) : null}
      </div>

      {status ? (
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 11.5,
            lineHeight: 1.5,
            color: status.tone === 'ok' ? T.done : T.progress,
            marginTop: 6,
          }}
        >
          {status.text}
        </div>
      ) : null}
    </div>
  );
}

/** A button that reads as a link — it belongs inline with prose, not as a slab. */
function LinkButton({ T, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: FONT_BODY,
        fontSize: 11.5,
        fontWeight: 600,
        color: T.deep,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        textDecoration: 'underline',
        textUnderlineOffset: 3,
      }}
    >
      {children}
    </button>
  );
}
