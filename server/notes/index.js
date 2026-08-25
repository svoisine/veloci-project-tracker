// notes/ — the notes activity feed.
//
//   feed.js      the diff itself (pure — no I/O, same rule as brief/)
//   snapshot.js  the per-project "what this machine last saw" file
//
// READ-ONLY with respect to the user's data. Nothing under notes/ holds a
// Sheets client, so no function here can reach the Google Sheet: the feed reads
// rows that sheets/ already loaded, and writes only to VPT_HOME. It adds no
// column, no authorship and no new write path — the existing per-step editor
// remains the only way a note is ever changed.

export { buildNotesFeed, countsOf, snapshotSteps } from './feed.js';
export { promoteSeen, readSnapshot, recordCurrent, removeSnapshot } from './snapshot.js';
