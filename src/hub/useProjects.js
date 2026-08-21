// hub/useProjects.js — the project list, and the two things you can do to it.
//
// Split out of Hub.jsx for the same reason as the dashboard's useBrief: the
// list, the create and the delete are edited for different reasons than the
// layout around them.

import { useCallback, useEffect, useState } from 'react';

import { del, get, post, projectPath } from '../api.js';

export function useProjects() {
  const [projects, setProjects] = useState(null);
  const [keyFile, setKeyFile] = useState(null); // 'present' | 'missing' | null
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [flash, setFlash] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const json = await get('/api/projects');

    // Anything but an array would break .every/.map during render, and a render
    // throw takes the page down — so coerce rather than trust.
    if (!json.ok && !Array.isArray(json.projects)) {
      setError(json.error || 'Could not list projects');
      setProjects([]);
      return;
    }

    setProjects(
      Array.isArray(json.projects) ? json.projects.filter((p) => p && typeof p === 'object') : []
    );
    setKeyFile(json.keyFile || null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const say = (tone, text) => {
    setFlash({ tone, text });
    setTimeout(() => setFlash(null), 7000);
  };

  const createProject = async (draft) => {
    const json = await post('/api/projects', draft);
    if (json.ok) {
      await load();
      say('ok', `Created "${json.project.name}". Share its sheet with the service account so VPT can read it.`);
    }
    return json; // the form renders field-level errors itself
  };

  const removeProject = async (project) => {
    setBusyId(project.id);
    const json = await del(projectPath(project.id));
    setBusyId(null);

    if (json.ok) {
      await load();
      say('ok', `Removed "${project.name}" from VPT. Its Google Sheet was not touched.`);
    } else {
      say('error', json.error || 'Could not remove that project.');
    }
  };

  return { projects, keyFile, error, busyId, flash, createProject, removeProject };
}
