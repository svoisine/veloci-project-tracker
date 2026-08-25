// App.jsx — one project's dashboard.
//
// Layout only. The data — fetching the brief, the optimistic write and its
// rollback, the toast — lives in dashboard/useBrief.js, and each block of the
// page is its own component. What is left here is the ORDER things appear in
// and the conditions under which they appear at all, which is what you actually
// come to this file to change.

import { useCallback, useState } from 'react';

import { useTheme } from './theme.jsx';
import { FONT_BODY } from './tokens.js';
import { page, shell } from './styles.js';
import { asList, asProgress, useBrief } from './dashboard/useBrief.js';
import CurrentWeekCard from './dashboard/CurrentWeekCard.jsx';
import StepList from './dashboard/StepList.jsx';
import Header from './components/Header.jsx';
import ProgressRing from './components/ProgressRing.jsx';
import MilestoneBar from './components/MilestoneBar.jsx';
import LaneColumn from './components/LaneColumn.jsx';
import BlockedList from './components/BlockedList.jsx';
import KnList from './components/KnList.jsx';
import ScheduleEditor from './components/ScheduleEditor.jsx';
import KeyMissingPanel from './components/KeyMissingPanel.jsx';
import NotesPanel from './notes/NotesPanel.jsx';
import { useNotesFeed } from './notes/useNotesFeed.js';
import Notice from './ui/Notice.jsx';
import Toast from './ui/Toast.jsx';
import { DashboardSkeleton } from './ui/Skeleton.jsx';

const TOP_ROW = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 16,
  marginBottom: 16,
};

/**
 * A4: name the actual problem. "No data" is useless when the real answer is
 * "you haven't shared the sheet with the service account yet".
 */
function noticeTitle(source, failureKind) {
  switch (failureKind) {
    case 'permission':
      return 'This sheet is not shared with the service account';
    case 'not_found':
      return 'No sheet found with that ID';
    case 'bad_range':
      return "The sheet's tabs don't match this project's ranges";
    case 'placeholder':
      return 'This project still needs a sheet ID';
    case 'no_key':
      // The setup panel above already says the key is missing; here, only the
      // consequence for the data on screen is worth repeating.
      return source === 'cache' ? 'Showing cached data — editing is off' : 'No service-account key found';
    case 'no_config':
      return 'Project config could not be loaded';
    default:
      return source === 'cache' ? 'Showing cached data — editing is off' : 'No data';
  }
}

export default function App({ projectId, projectName, onBack }) {
  const { T } = useTheme();

  // The notes feed is deliberately its own hook and its own endpoint rather
  // than another field on the brief: it is additive and read-only, and keeping
  // it off the dashboard's data path is what stops it regressing anything.
  const notes = useNotesFeed(projectId);
  const [notesOpen, setNotesOpen] = useState(false);

  const {
    brief,
    loading,
    refreshing,
    fetchError,
    toast,
    dismissToast,
    refresh,
    editStep,
    showSchedule,
    projectConfig,
    openSchedule,
    closeSchedule,
    onScheduleSaved,
  } = useBrief(projectId);

  // Refreshing the dashboard refreshes the feed alongside it, and OPENING the
  // panel reloads it too — a note edited through the per-step editor since this
  // page loaded must never be read here in its old wording.
  const refreshAll = useCallback(() => {
    refresh();
    notes.reload();
  }, [refresh, notes.reload]);

  const openNotes = useCallback(() => {
    setNotesOpen(true);
    notes.reload();
  }, [notes.reload]);

  const closeNotes = useCallback(() => setNotesOpen(false), []);

  if (loading) {
    return (
      <div style={page(T)}>
        <div style={shell}>
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (fetchError && !brief) {
    return (
      <div style={page(T)}>
        <div style={shell}>
          <Header
            project={projectName || projectId}
            source="none"
            onRefresh={refresh}
            refreshing={refreshing}
            onBack={onBack}
          />
          <Notice
            tone="error"
            title="Can't reach the VPT backend"
            body={`${fetchError}. Is it running? Start it with "npm run dev" (or "npm start") from the project folder, then reload this page.`}
          />
        </div>
      </div>
    );
  }

  // Destructuring defaults only fire for `undefined`, so a field that arrives as
  // `null` — or a `progress` object that is missing entirely — would throw
  // during render and take the whole app down with it. The backend always sends
  // these, but a stale bundle talking to a newer server (or the reverse) is
  // exactly the case where a dashboard should degrade, not disappear.
  const { project, source, generatedAt, cachedAt, currentWeek, nextMilestone, message, failureKind, hint, hasSchedule } =
    brief;

  const progress = asProgress(brief.progress);
  const inProgress = asList(brief.inProgress);
  const pullAhead = asList(brief.pullAhead);

  // Writes need live data — the row is located by a live read, so editing is
  // offered only when we actually have the sheet.
  const canEdit = source === 'live';

  return (
    <div style={page(T)}>
      <div style={shell}>
        <Header
          project={project}
          source={source}
          generatedAt={generatedAt}
          cachedAt={cachedAt}
          onRefresh={refreshAll}
          refreshing={refreshing || notes.refreshing}
          onBack={onBack}
          onEditSchedule={showSchedule ? closeSchedule : openSchedule}
          scheduleOpen={showSchedule}
          onOpenNotes={openNotes}
          notesOpen={notesOpen}
          notesUnseen={notes.unseen}
          notesTotal={notes.counts.total}
        />

        {/* A refresh that could not reach the backend at all, while we still
            hold an earlier brief. Without this the page keeps rendering the old
            data — badge and timestamp included — with no hint that it is stale,
            which is the one failure state that silently lies to the user. */}
        {fetchError ? (
          <Notice
            tone="warn"
            title="Couldn't reach the VPT backend just now"
            body={`${fetchError}. This page is still showing the data it loaded at ${new Date(generatedAt || Date.now()).toLocaleTimeString()}. Start VPT again, then hit Refresh.`}
          />
        ) : null}

        {/* A missing key is a setup step, not a failure — so it gets the guide
            rather than a red "no data". Every other cause keeps the notice,
            which already names what actually went wrong (unshared sheet,
            wrong ranges, offline …). */}
        {failureKind === 'no_key' ? <KeyMissingPanel /> : null}

        {source !== 'live' && message && !(failureKind === 'no_key' && source === 'none') ? (
          <Notice
            tone={source === 'cache' ? 'warn' : 'error'}
            title={noticeTitle(source, failureKind)}
            body={message}
            hint={hint}
          />
        ) : null}

        {showSchedule ? (
          <ScheduleEditor
            projectId={projectId}
            project={projectConfig}
            onSaved={onScheduleSaved}
            onClose={closeSchedule}
          />
        ) : null}

        <div style={TOP_ROW}>
          <ProgressRing done={progress.done} total={progress.total} pct={progress.pct} />
          <MilestoneBar
            milestone={nextMilestone}
            projectId={brief.projectId || projectId}
            onEditSchedule={openSchedule}
          />
          <CurrentWeekCard
            currentWeek={currentWeek}
            hasSchedule={hasSchedule}
            onEditSchedule={openSchedule}
          />
        </div>

        {inProgress.length > 0 ? (
          <StepList
            title="In Progress"
            accent={T.progress}
            accentSoft={T.progressSoft}
            steps={inProgress}
            marker="▸"
            canEdit={canEdit}
            onEdit={editStep}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <LaneColumn
            title="Ready Now — Deep"
            subtitle="evening / weekend · ML, backend, data"
            accent={T.deep}
            accentSoft={T.deepSoft}
            steps={asList(brief.readyDeep)}
            emptyText="Nothing ready in this lane — clear a prereq or a blocker."
            canEdit={canEdit}
            onEdit={editStep}
          />
          <LaneColumn
            title="Ready Now — Gap"
            subtitle="campus gaps · modular, frontend, checks"
            accent={T.gap}
            accentSoft={T.gapSoft}
            steps={asList(brief.readyGap)}
            emptyText="Nothing ready in this lane — clear a prereq or a blocker."
            canEdit={canEdit}
            onEdit={editStep}
          />
        </div>

        {pullAhead.length > 0 ? (
          <StepList
            title="Pull Ahead"
            subtitle="Current week is nearly clear — next up."
            accent={T.text3}
            accentSoft={T.mutedSoft}
            headingColor={T.text2}
            steps={pullAhead}
            marker="»"
            dim
            showCount={false}
            canEdit={canEdit}
            onEdit={editStep}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <div style={{ marginBottom: 16 }}>
          <BlockedList items={asList(brief.blocked)} canEdit={canEdit} onEdit={editStep} />
        </div>

        <KnList items={asList(brief.openKNs)} />

        <footer
          style={{
            fontFamily: FONT_BODY,
            fontSize: 11.5,
            color: T.text3,
            textAlign: 'center',
            marginTop: 28,
            paddingTop: 18,
            borderTop: `1px solid ${T.line2}`,
          }}
        >
          the sheet is truth · edits here are written straight back to it
        </footer>
      </div>

      {notesOpen ? <NotesPanel feed={notes} onClose={closeNotes} /> : null}

      {toast ? <Toast toast={toast} onClose={dismissToast} /> : null}
    </div>
  );
}
