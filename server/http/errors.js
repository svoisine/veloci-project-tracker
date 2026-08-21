// http/errors.js — the two handlers that keep /api's promise.
//
// Both are registered after every API route and before the SPA catch-all, so
// neither can shadow a real route.

/**
 * Anything under /api that matched no route — a typo, a wrong verb, a stale
 * client. Express's default handler answers those with an HTML error page,
 * which breaks the one promise the frontend relies on: everything under /api is
 * JSON it can read.
 *
 * 404 rather than 200: this mirrors the missing-template route, which is the
 * existing precedent for "this thing genuinely does not exist" — the contract
 * that matters is the JSON envelope, not the status code.
 */
export function apiNotFound(req, res) {
  res.status(404).json({
    ok: false,
    reason: 'unknown_route',
    error: `No API route for ${req.method} ${req.originalUrl}.`,
  });
}

/**
 * Last line of defence for /api. Every route already catches its own failures,
 * so reaching here means a bug — but a bug must still not hand the frontend an
 * HTML error page, which is what Express does by default. Malformed JSON bodies
 * land here too (express.json throws a SyntaxError before any route runs).
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
export function apiError(err, req, res, next) {
  const badJson = err?.type === 'entity.parse.failed' || err instanceof SyntaxError;
  const tooBig = err?.type === 'entity.too.large';

  if (!badJson && !tooBig) console.error(`[vpt] unhandled error on ${req.method} ${req.originalUrl}:`, err);

  res.status(badJson || tooBig ? 400 : 500).json({
    ok: false,
    reason: badJson ? 'bad_json' : tooBig ? 'too_large' : 'unexpected',
    error: badJson
      ? 'Request body is not valid JSON.'
      : tooBig
        ? 'Request body is too large (the cap is 64kb).'
        : err?.message || String(err),
  });
}
