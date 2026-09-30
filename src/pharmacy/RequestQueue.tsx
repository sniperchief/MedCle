import {
  REQUEST_STATUSES,
  requestDetails,
  type PharmacyRequest,
} from "../requests/pharmacy-requests";
import { formatTime, STATUS_LABELS } from "./format";

interface RequestQueueProps {
  requests: readonly PharmacyRequest[];
  onOpen(id: string): void;
}

/** Confirmed requests grouped by status, newest first. */
export function RequestQueue({ requests, onOpen }: RequestQueueProps) {
  return (
    <div className="queue">
      {REQUEST_STATUSES.map((status) => {
        const group = requests.filter((request) => request.status === status);
        // New is always shown, so an empty queue says so.
        if (group.length === 0 && status !== "new") return null;
        const headingId = `queue-${status}`;
        return (
          <section key={status} className="queue__group" aria-labelledby={headingId}>
            <h2 id={headingId} className="queue__heading">
              {STATUS_LABELS[status]} <span className="queue__count">{group.length}</span>
            </h2>
            {group.length === 0 ? (
              <p className="queue__empty">
                No new requests. When a customer confirms a request at the counter, it appears here.
              </p>
            ) : (
              <ul className="queue__list">
                {group.map((request) => (
                  <li key={request.id}>
                    <RequestCard request={request} onOpen={() => onOpen(request.id)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function RequestCard({ request, onOpen }: { request: PharmacyRequest; onOpen(): void }) {
  const details = requestDetails(request);
  return (
    <button type="button" className={`request-card request-card--${request.status}`} onClick={onOpen}>
      <span className="request-card__medication">{request.medication}</span>
      <span className={`request-card__details${details ? "" : " request-card__details--missing"}`}>
        {details || "No strength or quantity stated"}
      </span>
      <span className="request-card__meta">
        Confirmed by customer ·{" "}
        <time dateTime={request.confirmedAt}>{formatTime(request.confirmedAt)}</time>
      </span>
    </button>
  );
}
