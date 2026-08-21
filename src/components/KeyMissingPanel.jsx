// KeyMissingPanel.jsx — "VPT needs a key" as an invitation, not a wall.
//
// This is NOT an auth gate. VPT has no accounts and nothing to log into; the
// app keeps running with this panel on screen. It exists because "no data" is a
// useless thing to tell someone whose only problem is that they haven't
// downloaded a JSON file yet.
//
// Shown when the failure is specifically a missing key file. A sheet that
// isn't shared (403) or a dead network get their own, different messages —
// sending those users through this guide would be wrong.

import { useState } from 'react';

import { useTheme } from '../theme.jsx';
import { FONT_BODY } from '../tokens.js';
import { useSetup, keyPathFor } from '../setup.js';
import SetupGuide from './SetupGuide.jsx';
import FolderPath from './FolderPath.jsx';

export default function KeyMissingPanel({ compact = false }) {
  const { T } = useTheme();
  const setup = useSetup();
  const [showGuide, setShowGuide] = useState(false);

  const keyPath = keyPathFor(setup);
  const viaEnv = setup?.keySource === 'env';

  return (
    <section
      style={{
        background: T.progressSoft,
        border: `1px solid ${T.progress}44`,
        borderRadius: 12,
        padding: '15px 17px',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15 }}>🔑</span>
        <h2
          style={{
            fontFamily: FONT_BODY,
            fontSize: 13.5,
            fontWeight: 600,
            color: T.progress,
            margin: 0,
          }}
        >
          VPT needs a Google service-account key to read your sheets
        </h2>
      </div>

      <p
        style={{
          fontFamily: FONT_BODY,
          fontSize: 12.5,
          color: T.text2,
          lineHeight: 1.6,
          margin: '7px 0 0',
        }}
      >
        Set one up in a few minutes — it's a file you download from Google once and drop in place.
        There is no account to create with VPT and nothing to sign in to.
        {compact ? null : ' Everything else in the app keeps working in the meantime.'}
      </p>

      <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.text3, marginTop: 10 }}>
        VPT is looking for it here{viaEnv ? ' (set by VPT_SERVICE_ACCOUNT)' : ''}:
      </div>
      <FolderPath path={keyPath} />

      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 12 }}>
        <button
          type="button"
          onClick={() => setShowGuide((s) => !s)}
          aria-expanded={showGuide}
          style={{
            fontFamily: FONT_BODY,
            fontSize: 12,
            fontWeight: 600,
            color: T.bg,
            background: T.progress,
            border: 'none',
            borderRadius: 8,
            padding: '8px 14px',
            cursor: 'pointer',
          }}
        >
          {showGuide ? '✕ Hide the setup guide' : 'Set up Google access →'}
        </button>
      </div>

      {showGuide ? (
        <div style={{ marginTop: 12 }}>
          <SetupGuide defaultOpen title="Set up Google access" />
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.text3, marginTop: 9, lineHeight: 1.6 }}>
            Once the key is in place, restart VPT (the Google client is built at startup) and reload
            this page.
          </div>
        </div>
      ) : null}
    </section>
  );
}
