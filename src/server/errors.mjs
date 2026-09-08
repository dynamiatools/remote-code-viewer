/**
 * Expected, client-visible failure. `message` is sent to the client verbatim, so it
 * must stay generic: no paths, no errnos, no stack traces (docs/security.md §6).
 */
export class HttpError extends Error {
  constructor(status, message, extra = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.extra = extra;
  }
}

export const badRequest = (m = 'invalid request') => new HttpError(400, m);
export const unauthorized = () => new HttpError(401, 'unauthorized');

/**
 * Denied and non-existent paths are deliberately indistinguishable: a different
 * response for "forbidden" turns the denylist into a filesystem-mapping oracle.
 */
export const notFound = () => new HttpError(404, 'not found');

export const tooLarge = (extra) => new HttpError(413, 'file too large', extra);
