import React from 'react';
import { createRoot } from 'react-dom/client';
import Root from './Root.jsx';
import { ThemeProvider } from './theme.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

// The boundary sits OUTSIDE ThemeProvider so it still renders if the provider
// itself is what threw — a boundary that depends on the thing it is catching
// would go down with it.
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
