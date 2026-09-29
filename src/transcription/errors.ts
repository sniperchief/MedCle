export type TranscriptionErrorKind =
  | "unsupported-browser"
  | "microphone-permission"
  | "microphone-unavailable"
  | "microphone-busy"
  | "token"
  | "auth"
  | "connection"
  | "session-limit"
  | "service-busy"
  | "session-ended";

const USER_MESSAGES: Record<TranscriptionErrorKind, string> = {
  "unsupported-browser":
    "This browser can't record audio here. Use a current version of Chrome, Edge, Firefox or Safari.",
  "microphone-permission":
    "Microphone access was blocked. Allow microphone access for this site in your browser settings, then try again.",
  "microphone-unavailable": "No microphone was found. Connect a microphone and try again.",
  "microphone-busy":
    "The microphone couldn't be started. It may be in use by another application.",
  token: "The transcription service couldn't be started. Please try again.",
  auth: "The transcription service rejected the connection. Please contact your administrator.",
  connection:
    "Couldn't connect to the transcription service. Check your internet connection and try again.",
  "session-limit": "The recording reached its maximum length and was stopped.",
  "service-busy": "Too many recordings are running right now. Please wait a moment and try again.",
  "session-ended": "The transcription session ended unexpectedly. Please try again.",
};

/** A failure with a user-safe message; the technical details stay in `cause`. */
export class TranscriptionError extends Error {
  readonly kind: TranscriptionErrorKind;

  constructor(kind: TranscriptionErrorKind, options?: { cause?: unknown }) {
    super(USER_MESSAGES[kind], options);
    this.name = "TranscriptionError";
    this.kind = kind;
  }
}

/**
 * Maps a failure from the AssemblyAI SDK to a transcription error, using the
 * Streaming v3 close/error code the SDK attaches to it when there is one.
 */
export function fromStreamingError(error: unknown, fallback: TranscriptionErrorKind): TranscriptionError {
  // AssemblyAI reports the concurrency limit with the same 1008 code as an
  // authorization failure, so only the message tells them apart.
  if (/too many concurrent sessions/i.test(errorMessage(error))) {
    return new TranscriptionError("service-busy", { cause: error });
  }
  switch (streamingErrorCode(error)) {
    case 1008: // Unauthorized connection (invalid or expired token, account issue)
    case 4001: // Not authorized
    case 4002: // Insufficient funds
    case 4003: // Free-tier account
      return new TranscriptionError("auth", { cause: error });
    case 3008: // Maximum session duration exceeded
      return new TranscriptionError("session-limit", { cause: error });
    case 3009: // Too many concurrent sessions
    case 4029: // Rate limited
      return new TranscriptionError("service-busy", { cause: error });
    default:
      return new TranscriptionError(fallback, { cause: error });
  }
}

function errorMessage(error: unknown): string {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" ? message : "";
}

function streamingErrorCode(error: unknown): number | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "number" ? code : undefined;
}
