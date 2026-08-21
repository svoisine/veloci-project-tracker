// setup/steps.jsx — the words of the Google-setup walkthrough.
//
// Content, not behaviour: five steps, each with a short version and a longer
// `detail` shown only when the reader asks for more. It is the biggest single
// thing in the setup guide and the part most likely to need rewording, so it
// lives apart from the panel that renders it — editing the prose should not
// mean scrolling past disclosure state and layout.
//
// Deliberately text + links, no screenshots. The Cloud Console redraws itself
// every year; a screenshot of it is wrong within months, whereas Google's own
// docs move with it. So the VPT-specific sequence is written here and the
// console specifics are linked, not mirrored.

import { useTheme } from '../../theme.jsx';
import { FONT_MONO } from '../../tokens.js';
import FolderPath from '../FolderPath.jsx';

const LINKS = {
  console: 'https://console.cloud.google.com/',
  enableSheets: 'https://console.cloud.google.com/apis/library/sheets.googleapis.com',
  enableApiDoc: 'https://support.google.com/googleapi/answer/6158841',
  serviceAccounts: 'https://cloud.google.com/iam/docs/service-accounts-create',
  keys: 'https://cloud.google.com/iam/docs/keys-create-delete',
  sharing: 'https://support.google.com/docs/answer/2494822',
  sheetsApi: 'https://developers.google.com/sheets/api/guides/concepts',
};

/**
 * The five steps. `detail` is only rendered once the user asks for more —
 * the short version is enough for anyone who has met a Cloud Console before.
 */
export function setupSteps(keyPath, isWindows) {
  return [
    {
      title: 'Create a Google Cloud project and turn on the Sheets API',
      short: (
        <>
          In the <A href={LINKS.console}>Google Cloud Console</A>, make a project (any name — it is
          just a container), then enable the{' '}
          <A href={LINKS.enableSheets}>Google Sheets API</A> for it.
        </>
      ),
      detail: (
        <>
          The project is free and exists only to own the service account. Once it is selected in the
          console's project picker, open the API Library, search for “Google Sheets API” and press
          Enable — or use the direct link above, which lands on that page with the API preselected.
          Google's own walkthrough is <A href={LINKS.enableApiDoc}>here</A>. You do not need billing
          enabled, and you do not need the Drive API. If you later see “API has not been used in
          project … before or it is disabled”, this is the step that was missed. Background on what
          the API does is in the <A href={LINKS.sheetsApi}>Sheets API concepts guide</A>.
        </>
      ),
    },
    {
      title: 'Create a service account and download its JSON key',
      short: (
        <>
          Still in that project, create a <A href={LINKS.serviceAccounts}>service account</A>, then{' '}
          <A href={LINKS.keys}>add a key</A> and choose <strong>JSON</strong>. Your browser downloads
          the file.
        </>
      ),
      detail: (
        <>
          A service account is a robot user with its own email address — it is how VPT reads your
          sheet without ever asking you to sign in. It needs no roles or permissions on the Cloud
          project itself; the only access that matters is the sheet you share with it in step 4. When
          you add the key, pick key type JSON (not P12). The file downloads once and Google keeps no
          copy — treat it like a password: anyone holding it can reach every sheet that account has
          been shared with. If you lose it, delete that key in the console and create a new one.
        </>
      ),
    },
    {
      title: 'Put the key where VPT looks for it',
      short: (
        <>
          Move the downloaded file to:
          <FolderPath path={keyPath} note="← opens on this machine" />
          <div style={{ marginTop: 6 }}>
            Rename it to <code style={{ fontFamily: FONT_MONO }}>service_account.json</code> — Google's
            filename has a random suffix.
          </div>
        </>
      ),
      detail: (
        <>
          That path is the one VPT resolved on <em>this</em> machine, so it is the literal place to
          put the file. VPT creates the folder for you on startup but will never create the key
          itself. To keep the key somewhere else, set the environment variable{' '}
          <code style={{ fontFamily: FONT_MONO }}>VPT_SERVICE_ACCOUNT</code> to its full path —{' '}
          <code style={{ fontFamily: FONT_MONO }}>
            {isWindows
              ? '$env:VPT_SERVICE_ACCOUNT="D:\\keys\\my_key.json"'
              : 'export VPT_SERVICE_ACCOUNT=/path/to/my_key.json'}
          </code>{' '}
          — or point <code style={{ fontFamily: FONT_MONO }}>VPT_HOME</code> at a different base folder to
          move the whole thing, caches included. Restart VPT after adding the key: it builds the
          Google client at startup.
        </>
      ),
    },
    {
      title: 'Share your sheet with the service-account email',
      short: (
        <>
          Open the JSON, copy the <code style={{ fontFamily: FONT_MONO }}>client_email</code> value, then{' '}
          <A href={LINKS.sharing}>share your Google Sheet</A> with it — <strong>Editor</strong> to
          save edits from VPT, <strong>Viewer</strong> for read-only.{' '}
          <strong>This is the one step you repeat for every sheet</strong>, always with the same
          email.
        </>
      ),
      detail: (
        <>
          The email looks like{' '}
          <code style={{ fontFamily: FONT_MONO }}>something@your-project.iam.gserviceaccount.com</code>.
          Paste it into the sheet's Share dialog exactly as it appears; Google will not suggest it in
          the picker, and it will not send anyone an email. This is the step people miss most often —
          if VPT says “this sheet is not shared with the service account”, come back here. Editor is
          required for the status/notes edits VPT writes back; with Viewer the dashboard still
          renders and saving is refused rather than silently failing. It does not matter which Google
          account <em>owns</em> the sheet: the service account is a guest on the share list, so a
          sheet owned by another address works the same way, as long as its owner can add your
          service-account email.
        </>
      ),
    },
    {
      title: 'Paste the sheet ID into the form',
      short: (
        <>
          From the sheet's URL, the ID is the part between{' '}
          <code style={{ fontFamily: FONT_MONO }}>/d/</code> and{' '}
          <code style={{ fontFamily: FONT_MONO }}>/edit</code>. You can paste the whole URL — VPT pulls
          the ID out of it.
        </>
      ),
      detail: (
        <>
          A sheet URL reads{' '}
          <code style={{ fontFamily: FONT_MONO }}>
            https://docs.google.com/spreadsheets/d/&lt;THE-ID&gt;/edit#gid=0
          </code>
          . Your tracker tab must be named <code style={{ fontFamily: FONT_MONO }}>Tracker</code> and use
          the template's column headers, or VPT will not find its columns — the CSV templates on the
          Add-Project screen give you both for free. A second tab named{' '}
          <code style={{ fontFamily: FONT_MONO }}>KN</code> for known issues is optional; leave the KN
          range blank in the form if you skip it.
        </>
      ),
    },
  ];
}

/** Links open in a new tab, and never leak the referrer. */
export function A({ href, children }) {
  const { T } = useTheme();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: T.deep, textDecoration: 'underline', textUnderlineOffset: 2 }}
    >
      {children}
    </a>
  );
}
