export class AlmaApiError extends Error {
  response: { status: number, statusText: string };
  data: string;

  constructor(error: any, ...params) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(...params);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AlmaApiError);
    }

    this.name = 'AlmaApiError';
    // Custom debugging information
    this.response = {
      status: error.response ? error.response.status : undefined,
      statusText: error.response ? error.response.statusText : undefined
    };
    this.data = error.response ? error.response.data : undefined;
  }
}
