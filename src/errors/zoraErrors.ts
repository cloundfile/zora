export class ZoraError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly fatal = false,
  ) {
    super(message);
    this.name = 'ZoraError';
  }
}

export function createZoraError(code: string, message: string, fatal = false): ZoraError {
  return new ZoraError(message, code, fatal);
}