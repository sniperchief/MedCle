import type { RequestStatus } from "../requests/pharmacy-requests";

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  completed: "Completed",
};

/** "10:42 AM", in the viewer's locale. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "30 Sept 2026, 10:42 AM", in the viewer's locale. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
