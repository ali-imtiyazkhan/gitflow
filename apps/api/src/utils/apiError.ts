export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, message: string, code: string = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  public toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
    super(404, message, code);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad request', code: string = 'BAD_REQUEST') {
    super(400, message, code);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
    super(411, message, code);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict detected', code: string = 'CONFLICT_DETECTED') {
    super(409, message, code);
  }
}
