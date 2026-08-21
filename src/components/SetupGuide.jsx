// SetupGuide.jsx — "First time? Set up Google access".
//
// The one thing VPT genuinely cannot do for you is issue a Google
// service-account key, so this explains how to get one. It is a HELP panel,
// not a login: nothing about it blocks the app, and it stays collapsed for
// anyone who is already set up.
//
// This file is the panel: two disclosure states (open, and detailed) and the
// list layout. The words are in setup/steps.jsx and the multi-account case is
// setup/SecondKey.jsx.

import { useState } from 'react';

import { useTheme } from '../theme.jsx';
import { FONT_BODY } from '../tokens.js';
import { useSetup, keyPathFor } from '../setup.js';
import { setupSteps } from './setup/steps.jsx';
import SecondKey from './setup/SecondKey.jsx';

export default function SetupGuide({ defaultOpen = false, title = 'First time? Set up Google access' }) {
  const { T } = useTheme();
  const setup = useSetup();

  const [open, setOpen] = useState(defaultOpen);
  const [detailed, setDetailed] = useState(false);

  const items = setupSteps(keyPathFor(setup), setup?.platform === 'win32');

  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 10, background: T.bg, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: FONT_BODY,
          fontSize: 12.5,
          fontWeight: 600,
          color: T.text2,
          background: 'transparent',
          border: 'none',
          padding: '11px 13px',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ color: T.deep }}>{open ? '▾' : '▸'}</span>
        <span style={{ flex: 1 }}>{title}</span>
        {!open && setup && setup.keyPresent === false ? (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: T.progress,
              background: T.progressSoft,
              borderRadius: 999,
              padding: '2px 8px',
            }}
          >
            no key yet
          </span>
        ) : null}
      </button>

      {open ? (
        <div style={{ padding: '2px 15px 15px' }}>
          <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.text2, lineHeight: 1.6, margin: '0 0 10px' }}>
            VPT reads your sheets through a Google <strong>service account</strong> — a key file that
            lives on this machine. There is no VPT account and nothing to sign in to; this is a
            one-time, five-minute setup.
          </p>

          {/* The single most useful thing to know, and the thing people most
              often get wrong: they assume a key is per-sheet. */}
          <div
            style={{
              background: T.doneSoft,
              border: `1px solid ${T.done}33`,
              borderRadius: 8,
              padding: '10px 12px',
              margin: '0 0 14px',
              fontFamily: FONT_BODY,
              fontSize: 12,
              color: T.text2,
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: T.done }}>One key covers every project.</strong> A service account
            is an <em>identity</em>, not a per-sheet password — the same key can read and write any
            number of sheets. You do steps 1–3 once, ever. After that, each new project is just:
            share the sheet with the same email (step 4) and paste its ID (step 5).
          </div>

          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 12 }}>
            {items.map((step, i) => (
              <Step key={step.title} step={step} n={i + 1} detailed={detailed} />
            ))}
          </ol>

          <button
            type="button"
            onClick={() => setDetailed((d) => !d)}
            aria-expanded={detailed}
            style={{
              fontFamily: FONT_BODY,
              fontSize: 11.5,
              fontWeight: 600,
              color: T.deep,
              background: T.deepSoft,
              border: 'none',
              borderRadius: 7,
              padding: '7px 12px',
              cursor: 'pointer',
              marginTop: 14,
            }}
          >
            {detailed ? '− Hide the detailed steps' : '+ Show detailed step-by-step'}
          </button>

          <SecondKey />

          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 11.5,
              color: T.text3,
              lineHeight: 1.6,
              marginTop: 12,
              paddingTop: 10,
              borderTop: `1px solid ${T.line2}`,
            }}
          >
            The key never leaves this machine and is never sent to VPT, to a server, or into the
            repo. VPT only reads it — it will not create one for you.
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** One numbered step, with its detail paragraph when the reader asked for it. */
function Step({ step, n, detailed }) {
  const { T } = useTheme();

  return (
    <li style={{ display: 'flex', gap: 10 }}>
      <span
        style={{
          flexShrink: 0,
          width: 20,
          height: 20,
          borderRadius: 999,
          background: T.deepSoft,
          color: T.deep,
          fontFamily: FONT_BODY,
          fontSize: 11,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        }}
      >
        {n}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: T.text, marginBottom: 3 }}>
          {step.title}
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.text2, lineHeight: 1.65 }}>
          {step.short}
        </div>
        {detailed ? (
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 11.5,
              color: T.text3,
              lineHeight: 1.7,
              marginTop: 7,
              paddingLeft: 11,
              borderLeft: `2px solid ${T.line}`,
            }}
          >
            {step.detail}
          </div>
        ) : null}
      </div>
    </li>
  );
}
