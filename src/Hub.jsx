// Hub.jsx — the landing view: every project VPT knows about.
//
// Renders entirely from GET /api/projects, which reads config files and never
// touches Google. That is the whole point: one unreachable sheet must not be
// able to stall the list, so nothing here waits on a live fetch. A card's
// progress number, when present, comes from that project's cache.
//
// The list and its create/delete calls live in hub/useProjects.js; this file is
// the layout.

import { useState } from 'react';

import { useTheme } from './theme.jsx';
import { FONT_BODY } from './tokens.js';
import { page, shell } from './styles.js';
import { useProjects } from './hub/useProjects.js';
import HubHeader from './hub/HubHeader.jsx';
import EmptyState from './hub/EmptyState.jsx';
import ProjectCard from './components/ProjectCard.jsx';
import NewProjectForm from './components/NewProjectForm.jsx';
import KeyMissingPanel from './components/KeyMissingPanel.jsx';
import Notice from './ui/Notice.jsx';
import { CardGridSkeleton } from './ui/Skeleton.jsx';

// The shipped example config is a starting point, not somebody's project. Once
// a real sheet id is pasted into it, it stops counting as one.
const EXAMPLE_ID = 'example-project';
const isUntouchedExample = (p) => p.id === EXAMPLE_ID && p.needsSheetId;

const CARD_GRID = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: 16,
};

export default function Hub({ onOpen, lastProjectId }) {
  const { T } = useTheme();
  const { projects, keyFile, error, busyId, flash, createProject, removeProject } = useProjects();
  const [creating, setCreating] = useState(false);

  const handleCreate = async (draft) => {
    const json = await createProject(draft);
    if (json.ok) setCreating(false);
    return json;
  };

  const onlyExample = projects !== null && projects.every(isUntouchedExample);

  return (
    <div style={page(T)}>
      <div style={shell}>
        <HubHeader
          count={projects === null ? null : projects.length}
          creating={creating}
          onToggleCreate={() => setCreating((c) => !c)}
        />

        {flash ? <Notice tone={flash.tone} body={flash.text} style={{ padding: '12px 16px' }} /> : null}

        {error ? (
          <Notice
            tone="error"
            title="Can't reach the VPT backend"
            body={
              <>
                {error}. Start it with <code>npm run dev</code> (or <code>npm start</code>) from the
                project folder, then reload this page.
              </>
            }
          />
        ) : null}

        {/* Help, not a gate: the hub renders normally either way. */}
        {keyFile === 'missing' && !creating ? <KeyMissingPanel /> : null}

        {creating ? (
          <div style={{ marginBottom: 20 }}>
            <NewProjectForm
              existingIds={(projects || []).map((p) => p.id)}
              onCancel={() => setCreating(false)}
              onCreate={handleCreate}
            />
          </div>
        ) : null}

        {projects === null ? (
          <CardGridSkeleton />
        ) : (
          <>
            {!creating && onlyExample ? (
              <EmptyState onCreate={() => setCreating(true)} hasExample={projects.length > 0} />
            ) : null}

            {projects.length > 0 ? (
              <div style={{ ...CARD_GRID, marginTop: onlyExample && !creating ? 16 : 0 }}>
                {projects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    isLast={p.id === lastProjectId}
                    busy={busyId === p.id}
                    onOpen={() => onOpen(p)}
                    onDelete={() => removeProject(p)}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}

        <footer
          style={{
            fontFamily: FONT_BODY,
            fontSize: 11.5,
            color: T.text3,
            textAlign: 'center',
            marginTop: 32,
            paddingTop: 18,
            borderTop: `1px solid ${T.line2}`,
          }}
        >
          each project is one Google Sheet · removing a project here never touches its sheet
        </footer>
      </div>
    </div>
  );
}
