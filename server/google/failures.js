// google/failures.js — turning a Google/network failure into something a person
// can act on.
//
// Two functions, one job each: sort the error into a KIND, and write the
// sentence for that kind. Kept apart from the fetch code because this is the
// module that gets edited when a new failure mode shows up in the wild, and
// because the UI branches on these kinds — they are effectively part of the API.

import { KEY_FILE } from '../paths.js';

/**
 * Sort a failure into a kind the UI can act on. The important one is
 * `permission`: adding a project whose sheet hasn't been shared with the
 * service account is the single most likely way for a new project to fail,
 * and "no data" is a useless thing to tell someone in that situation.
 */
export function classifyFailure(err) {
  if (err?.vptKind) return err.vptKind;

  const code = err?.code ?? err?.response?.status;
  const msg = String(err?.message || err || '');

  if (code === 403 || /permission|PERMISSION_DENIED|does not have access|forbidden/i.test(msg)) {
    return 'permission';
  }
  if (code === 404 || /not found|Requested entity was not found/i.test(msg)) return 'not_found';
  if (code === 400 || /Unable to parse range|Invalid range/i.test(msg)) return 'bad_range';
  if (/timed out/i.test(msg)) return 'timeout';
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|network|getaddrinfo/i.test(msg)) return 'offline';
  return 'other';
}

/**
 * A sentence the user can act on, per failure kind.
 * @param keyFile the key this project resolved to, so "no key" names the right path
 */
export function failureHint(kind, keyFile = KEY_FILE) {
  switch (kind) {
    case 'permission':
      return (
        'VPT can reach Google but this sheet is not shared with the service account. ' +
        'Open the sheet → Share → add the service-account email as Editor. ' +
        `The email is in ${keyFile} under "client_email".`
      );
    case 'not_found':
      return 'No sheet exists with that spreadsheetId. Check the id in the project settings — it is the part of the sheet URL between /d/ and /edit.';
    case 'bad_range':
      return 'The sheet was reached but a range did not resolve — check that the tab names in trackerRange / knRange match the tabs in this sheet.';
    case 'placeholder':
      return 'This project still has the placeholder spreadsheetId. Add the real sheet id to start pulling data.';
    case 'no_key':
      return (
        `No service-account key found at ${keyFile}. VPT cannot read sheets without one — ` +
        'create a Google service account, download its JSON key, and save it there ' +
        '(or point VPT_SERVICE_ACCOUNT at it).'
      );
    case 'bad_key':
      return (
        `There is a file at ${keyFile}, but it is not a usable service-account key. ` +
        'Re-download the JSON key from the Google Cloud console (Service Accounts → Keys → Add key → JSON) ' +
        'and replace it. This is not a sharing problem — VPT never got as far as your sheet.'
      );
    case 'timeout':
    case 'offline':
      return 'Could not reach Google. Check your connection — VPT will keep showing the last good pull.';
    default:
      return null;
  }
}
