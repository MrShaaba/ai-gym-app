export class ApiError extends Error {
  constructor(status, message, code = 'invalid_request') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function requireThat(condition, message, status = 400, code) {
  if (!condition) throw new ApiError(status, message, code);
}

export function found(
  value,
  message = 'This item does not exist or is not available to your account.',
) {
  requireThat(value, message, 404, 'not_found');
  return value;
}

export function permitted(
  condition,
  message = 'You do not have permission to do that.',
) {
  requireThat(condition, message, 403, 'forbidden');
}
