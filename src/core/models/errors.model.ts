import { ErrorMessages } from '../config';

/**
 * Custom error classes with HTTP status codes
 * Used in repository and lambda to unify error handling
 */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends HttpError {
  constructor(message = ErrorMessages.VALIDATION_ERROR, details?: unknown) {
    super(400, message, details);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = ErrorMessages.BAD_REQUEST, details?: unknown) {
    super(400, message, details);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = ErrorMessages.NOT_FOUND, details?: unknown) {
    super(404, message, details);
  }
}

export class ConflictError extends HttpError {
  constructor(message = ErrorMessages.CONFLICT, details?: unknown) {
    super(409, message, details);
  }
}
