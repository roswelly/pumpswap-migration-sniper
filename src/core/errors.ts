export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', 500, true);
  }
}

export class NetworkError extends AppError {
  constructor(message: string, public readonly originalError?: Error) {
    super(message, 'NETWORK_ERROR', 503, true);
  }
}

export class TransactionError extends AppError {
  constructor(
    message: string,
    public readonly transactionSignature?: string,
    public readonly originalError?: Error
  ) {
    super(message, 'TRANSACTION_ERROR', 500, true);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', 400, true);
  }
}

export class ErrorHandler {
  static handle(error: unknown, context?: string): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(
        error.message,
        'UNKNOWN_ERROR',
        500,
        false
      );
    }

    return new AppError(
      `Unexpected error${context ? ` in ${context}` : ''}`,
      'UNKNOWN_ERROR',
      500,
      false
    );
  }

  static isOperational(error: unknown): boolean {
    return error instanceof AppError && error.isOperational;
  }
}
