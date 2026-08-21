// Root.jsx — which view is on screen.
//
// M1/M2 were a single view, so there was no router and M3 doesn't add one: the
// app has exactly two states (the hub, or one open project) and a project id.
// Keeping it as state rather than routes means no new dependency and no URL
// handling for what is a local single-user tool.

import { useCallback, useEffect, useState } from 'react';

import App from './App.jsx';
import Hub from './Hub.jsx';

const LAST_PROJECT_KEY = 'vpt.lastProject';

function readLastProject() {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY) || null;
  } catch {
    return null;
  }
}

export default function Root() {
  // The hub is home base — we remember the last project and badge it there,
  // but we don't auto-open it. Landing somewhere you didn't choose is worse
  // than one extra click.
  const [open, setOpen] = useState(null); // { id, name } | null
  const [lastProjectId, setLastProjectId] = useState(readLastProject);

  const openProject = useCallback((project) => {
    setOpen({ id: project.id, name: project.name });
    setLastProjectId(project.id);
    try {
      localStorage.setItem(LAST_PROJECT_KEY, project.id);
    } catch {
      /* storage disabled — in-memory is enough for this session */
    }
  }, []);

  const backToHub = useCallback(() => setOpen(null), []);

  // Escape returns to the hub, matching the "← All projects" control.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && e.target === document.body) backToHub();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, backToHub]);

  if (!open) return <Hub onOpen={openProject} lastProjectId={lastProjectId} />;

  return (
    <App
      key={open.id} // a different project is a different dashboard, not a re-render
      projectId={open.id}
      projectName={open.name}
      onBack={backToHub}
    />
  );
}
