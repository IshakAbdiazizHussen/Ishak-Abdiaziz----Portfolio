/**
 * Typed HTTP error. Handlers throw these (or call `next(err)`); the central
 * error middleware maps them to a status + JSON body. `expose: false` hides the
 * message from the client (used for 5xx / infra failures).
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly expose: boolean = true,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (msg = "Bad request") => new AppError(400, msg);
export const unauthorized = (msg = "Unauthorized") => new AppError(401, msg);
export const payloadTooLarge = (msg = "Payload too large") => new AppError(413, msg);
export const tooManyRequests = (msg = "Too many requests") => new AppError(429, msg);
export const serviceUnavailable = (msg = "Service unavailable") => new AppError(503, msg, false);
