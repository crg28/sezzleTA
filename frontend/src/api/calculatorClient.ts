import type { CalculateRequest } from '../types';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type CalculateFn = (req: CalculateRequest) => Promise<number>;

interface ErrorPayload {
  error?: { code?: string; message?: string };
}

/**
 * Friendly copy per stable backend error code. Unknown codes fall back to the
 * server's own message.
 */
const FRIENDLY_MESSAGES: Record<string, string> = {
  division_by_zero: "You can't divide by zero.",
  negative_sqrt: "You can't take the square root of a negative number.",
  result_not_representable: 'The result is too large or undefined.',
};

function toApiError(payload: ErrorPayload): ApiError {
  const code = payload.error?.code || 'unexpected_response';
  const friendly = FRIENDLY_MESSAGES[code];
  if (friendly) {
    return new ApiError(code, friendly);
  }
  return new ApiError(code, payload.error?.message || 'Something went wrong.');
}

export const calculate: CalculateFn = async (req) => {
  let response: Response;
  try {
    response = await fetch('/api/v1/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  } catch {
    throw new ApiError('network_error', 'Could not reach the server. Please try again.');
  }

  let payload: { result?: unknown } & ErrorPayload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('unexpected_response', 'The server sent an unexpected response.');
  }

  if (!response.ok) {
    throw toApiError(payload);
  }
  if (typeof payload.result !== 'number') {
    throw new ApiError('unexpected_response', 'The server sent an unexpected response.');
  }
  return payload.result;
};
