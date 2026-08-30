export type SafeEvent =
  | "server.ready"
  | "session.created"
  | "session.refreshed"
  | "session.closed"
  | "dictation.started"
  | "dictation.completed"
  | "request.rejected";

export type SafeErrorCode =
  | "internal_error"
  | "invalid_audio"
  | "invalid_message"
  | "invalid_request"
  | "invalid_sequence"
  | "limit_exceeded"
  | "unauthorized";

export interface SafeEventLogger {
  record(event: SafeEvent, errorCode?: SafeErrorCode): void;
}

const EVENTS = new Set<SafeEvent>([
  "server.ready",
  "session.created",
  "session.refreshed",
  "session.closed",
  "dictation.started",
  "dictation.completed",
  "request.rejected",
]);
const ERROR_CODES = new Set<SafeErrorCode>([
  "internal_error",
  "invalid_audio",
  "invalid_message",
  "invalid_request",
  "invalid_sequence",
  "limit_exceeded",
  "unauthorized",
]);

export function createSafeEventLogger(
  sink: (line: string) => void = () => undefined,
): SafeEventLogger {
  return {
    record(event: SafeEvent, errorCode?: SafeErrorCode) {
      if (!EVENTS.has(event)) throw new Error("Invalid safe event");
      if (errorCode !== undefined && !ERROR_CODES.has(errorCode)) {
        throw new Error("Invalid safe event");
      }
      sink(JSON.stringify(errorCode === undefined ? { event } : { errorCode, event }));
    },
  };
}
