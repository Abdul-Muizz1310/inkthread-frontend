/** The typed error union every API call maps its failures into. */

export class ConfigError extends Error {
  override readonly name = "ConfigError";
}
export class NetworkError extends Error {
  override readonly name = "NetworkError";
}
export class TimeoutError extends Error {
  override readonly name = "TimeoutError";
}
export class HttpError extends Error {
  override readonly name = "HttpError";
  readonly status: number;
  readonly code: string;
  readonly body: string;
  constructor(status: number, body: string, code?: string, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.status = status;
    this.body = body;
    this.code = code ?? `http_${status}`;
  }
}
export class ParseError extends Error {
  override readonly name = "ParseError";
  readonly path: string;
  constructor(message: string, path: string) {
    super(message);
    this.path = path;
  }
}
export type ApiError = ConfigError | NetworkError | TimeoutError | HttpError | ParseError;
