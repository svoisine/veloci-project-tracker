// routes/brief.js — GET /api/brief?project=<id>
//
// Always 200, always valid JSON. The frontend's contract is that this endpoint
// cannot hang and cannot 500 — every failure path degrades to source:'cache'
// or source:'none' with a message.

import express from 'express';

import { buildBrief } from '../brief/index.js';
import { loadProject } from '../config/index.js';
import { emptyBrief, resolveProjectId } from '../http/respond.js';
import { loadProjectData } from '../sheets/index.js';

export const briefRoutes = express.Router();

briefRoutes.get('/brief', async (req, res) => {
  const projectId = resolveProjectId(req.query.project);

  let project;
  try {
    project = loadProject(projectId);
  } catch (err) {
    return res.json(
      emptyBrief(projectId, `Could not load project config: ${err.message}`, projectId, 'no_config')
    );
  }

  try {
    const data = await loadProjectData(project);
    return res.json(buildBrief(project, data));
  } catch (err) {
    // Belt and braces: loadProjectData already swallows its own failures, so
    // reaching here means a bug in the compute step. Still never 500.
    console.error(`[vpt] unexpected error building brief for "${projectId}":`, err);
    return res.json(emptyBrief(project.name, `Unexpected error: ${err.message}`, projectId, 'other'));
  }
});
