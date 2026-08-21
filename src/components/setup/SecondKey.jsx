import { useState } from 'react';

import { useTheme } from '../../theme.jsx';
import { FONT_BODY, FONT_MONO } from '../../tokens.js';

/**
 * The rare case, kept collapsed so it costs nothing to the many people it does
 * not apply to. Almost nobody needs a second key — but the person who does
 * needs to find the answer here rather than concluding VPT can't do it.
 */
export default function SecondKey() {
  const { T } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.line2}` }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          fontFamily: FONT_BODY,
          fontSize: 11.5,
          fontWeight: 600,
          color: T.text2,
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        {open ? '▾' : '▸'} Working with more than one Google account
      </button>

      {open ? (
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 11.5,
            color: T.text3,
            lineHeight: 1.7,
            marginTop: 8,
            paddingLeft: 11,
            borderLeft: `2px solid ${T.line}`,
          }}
        >
          <p style={{ margin: '0 0 8px' }}>
            <strong style={{ color: T.text2 }}>Usually you don't need a second key.</strong> A sheet
            owned by a different Google address is still reachable by your one service account —
            whoever owns it just adds your <code style={{ fontFamily: FONT_MONO }}>client_email</code> to
            its share list, exactly as in step 4.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            The one case that genuinely needs a second key is a sheet inside a{' '}
            <strong style={{ color: T.text2 }}>Google Workspace</strong> whose admin blocks sharing
            outside the organisation. Your service account counts as external there, so it cannot be
            added at all. In that case create a second service account <em>inside</em> that
            organisation, save its key next to the first one, and point one project at it by adding a{' '}
            <code style={{ fontFamily: FONT_MONO }}>keyFile</code> line to{' '}
            <code style={{ fontFamily: FONT_MONO }}>projects/&lt;id&gt;.json</code>:
          </p>
          <pre
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10.5,
              color: T.text2,
              background: T.bg3,
              border: `1px solid ${T.line2}`,
              borderRadius: 6,
              padding: '8px 10px',
              margin: '0 0 8px',
              overflowX: 'auto',
            }}
          >{`{
  "id": "work-tracker",
  "spreadsheetId": "…",
  "keyFile": "work_key.json"
}`}</pre>
          <p style={{ margin: '0 0 8px' }}>
            A bare filename is looked for in VPT's folder; an absolute path is used as given. Leave
            the line out and the project uses the default key — which is what every other project
            should do. Restart VPT after adding it.
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: T.text2 }}>Read-only alternative:</strong> make a sheet you own
            that mirrors the locked one with{' '}
            <code style={{ fontFamily: FONT_MONO }}>=IMPORTRANGE(…)</code>, and point VPT at yours. One
            key, no config. Note that <em>IMPORTRANGE cannot be written through</em>, so status and
            notes edits won't reach the original — use it for dashboards you only read.
          </p>
        </div>
      ) : null}
    </div>
  );
}
