/** Only bounded, application-owned codes belong in errors or logs. */
export class RaiAcceptError extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus?: number,
    readonly indeterminate = false,
  ) {
    super(code);
    this.name = "RaiAcceptError";
  }
}
