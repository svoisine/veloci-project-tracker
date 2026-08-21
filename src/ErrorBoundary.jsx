// ErrorBoundary.jsx — the last thing standing between a render bug and a white screen.
//
// React unmounts the entire tree when a render throws, which leaves the user
// staring at a blank page with no way back and no idea what happened. Every
// individual read is guarded, but "every read is guarded" is a claim that has
// to stay true forever; this makes the failure mode survivable even when it
// isn't.
//
// Deliberately a class: error boundaries have no hook equivalent in React 19.

import React from 'react';

import { DARK, FONT_BODY, FONT_DISPLAY, FONT_MONO, LIGHT } from './tokens.js';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the detail in the console for whoever is debugging; the panel below
    // stays short enough to actually read.
    console.error('[vpt] render error caught by the boundary:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    // The theme provider may itself be the thing that died, so this panel reads
    // the document attribute directly instead of going through context.
    const dark = document.documentElement.dataset.theme !== 'light';
    const T = dark ? DARK : LIGHT;

    return (
      <div
        style={{
          minHeight: '100%',
          background: T.bg,
          padding: '48px 32px',
          fontFamily: FONT_BODY,
          color: T.text,
        }}
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🦖</div>
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              color: T.blocked,
              margin: '0 0 10px',
            }}
          >
            Something in the page broke
          </h1>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: T.text2, margin: '0 0 14px' }}>
            This is a bug in VPT, not something you did — and nothing was written to your Google
            Sheet. Your data is in the sheet; VPT only reads and displays it, so reloading is always
            safe.
          </p>

          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11.5,
              color: T.text,
              background: T.bg2,
              border: `1px solid ${T.line}`,
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 16,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                fontFamily: FONT_BODY,
                fontSize: 13,
                fontWeight: 600,
                color: T.bg,
                background: T.deep,
                border: 'none',
                borderRadius: 9,
                padding: '10px 20px',
                cursor: 'pointer',
              }}
            >
              Reload VPT
            </button>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              style={{
                fontFamily: FONT_BODY,
                fontSize: 13,
                color: T.text2,
                background: 'transparent',
                border: `1px solid ${T.line}`,
                borderRadius: 9,
                padding: '10px 20px',
                cursor: 'pointer',
              }}
            >
              Try again without reloading
            </button>
          </div>

          <p style={{ fontSize: 11.5, lineHeight: 1.6, color: T.text3, marginTop: 16 }}>
            The full stack is in your browser console (F12). If it happens every time, the backend
            may be sending a shape this build does not expect — restarting VPT so the server and the
            built UI match is usually the fix.
          </p>
        </div>
      </div>
    );
  }
}
