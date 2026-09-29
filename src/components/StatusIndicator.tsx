import type { TranscriptionStatus } from "../transcription/transcription-session";

const LABELS: Record<TranscriptionStatus, string> = {
  idle: "Ready",
  connecting: "Connecting…",
  listening: "Listening",
  stopping: "Finishing…",
  completed: "Done",
  error: "Error",
};

export function StatusIndicator({ status }: { status: TranscriptionStatus }) {
  return (
    <span className={`status status--${status}`} role="status">
      <span className="status__dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
