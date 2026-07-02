export class McpValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpValidationError';
  }
}

export class McpSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpSessionError';
  }
}

export class McpToolExecutionError extends Error {
  details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'McpToolExecutionError';
    this.details = details;
  }
}
