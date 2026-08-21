// sheets/a1.js — spreadsheet geometry. Pure string/index arithmetic, no I/O.
//
// Its own file because it is the piece with the highest ratio of subtle rules
// to lines (1-based columns, base-26 with no zero, sheet names that may contain
// quotes) and the lowest need for anything else in the server. It is also the
// piece a wrong answer from is most dangerous: resolveCell decides which cell a
// write lands in.

const norm = (s) => (s === undefined || s === null ? '' : String(s).trim());

/** "Tracker!A1:K1000" / "'My Sheet'!B2:K999" -> { sheetName, startCol, startRow } */
export function parseRange(range) {
  const m = /^(?:'((?:[^']|'')+)'|([^'!]+))!([A-Za-z]+)(\d+)/.exec(norm(range));
  if (!m) throw new Error(`Cannot parse range "${range}"`);
  return {
    sheetName: m[1] !== undefined ? m[1].replace(/''/g, "'") : m[2],
    startCol: colToIndex(m[3]),
    startRow: Number(m[4]),
  };
}

/** "A" -> 0, "Z" -> 25, "AA" -> 26. Base-26 with no zero digit. */
export function colToIndex(letters) {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** The inverse of colToIndex. */
export function indexToCol(index) {
  let s = '';
  let i = index + 1;
  while (i > 0) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

/** Sheet names only need quoting when they are not a bare identifier. */
export function quoteSheetName(name) {
  return /^[A-Za-z0-9_]+$/.test(name) ? name : `'${name.replace(/'/g, "''")}'`;
}

/**
 * Find the single cell holding `field` for step `id`, by header name — never by
 * hardcoded column letter, so re-ordering the sheet's columns can't cause a
 * write to land in the wrong place.
 *
 * @returns {{ a1: string, rowIdx: number, colIdx: number, current: string }}
 * rowIdx/colIdx are indices into the raw `values` array (not sheet numbers).
 */
export function resolveCell(project, values, id, field) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Tracker sheet returned no rows');
  }

  const header = (values[0] || []).map((h) => norm(h));
  const colIdx = header.indexOf(field);
  if (colIdx === -1) throw new Error(`Tracker sheet has no "${field}" column`);

  const idCol = header.indexOf('id');
  if (idCol === -1) throw new Error('Tracker sheet has no "id" column');

  let rowIdx = -1;
  for (let i = 1; i < values.length; i++) {
    if (norm((values[i] || [])[idCol]) === id) {
      rowIdx = i;
      break;
    }
  }
  if (rowIdx === -1) throw new Error(`No step with id "${id}" in the tracker`);

  const { sheetName, startCol, startRow } = parseRange(project.trackerRange);
  const a1 = `${quoteSheetName(sheetName)}!${indexToCol(startCol + colIdx)}${startRow + rowIdx}`;

  return { a1, rowIdx, colIdx, current: norm((values[rowIdx] || [])[colIdx]) };
}
