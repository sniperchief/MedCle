import { ArrowLeftIcon } from "../components/icons";
import { MedicationFields } from "../components/MedicationFields";
import {
  REQUEST_STATUSES,
  type PharmacyRequest,
  type RequestStatus,
} from "../requests/pharmacy-requests";
import { formatDateTime, STATUS_LABELS } from "./format";

interface RequestDetailProps {
  request: PharmacyRequest;
  onBack(): void;
  onStatusChange(status: RequestStatus): void;
}

/**
 * One confirmed request next to the customer's own words, so the pharmacist
 * can compare the structured request with what was actually said.
 */
export function RequestDetail({ request, onBack, onStatusChange }: RequestDetailProps) {
  return (
    <section className="request-detail" aria-labelledby="request-detail-heading">
      <button type="button" className="button button--ghost button--small" onClick={onBack}>
        <ArrowLeftIcon />
        All requests
      </button>

      <div className="request-detail__card">
        <header className="request-detail__header">
          <div>
            <p className="eyebrow">Confirmed medication request</p>
            <h2 id="request-detail-heading" className="request-detail__title">
              {request.medication}
            </h2>
          </div>
          <span className={`request-status request-status--${request.status}`}>
            {STATUS_LABELS[request.status]}
          </span>
        </header>

        <MedicationFields request={request} missing="Not specified" />

        <dl className="request-detail__facts">
          <div>
            <dt className="label">Customer confirmation</dt>
            <dd>
              Confirmed by customer{" "}
              {request.confirmedBy === "voice"
                ? `by voice${request.confirmationReply ? `: “${request.confirmationReply}”` : ""}`
                : "with the confirm button"}
            </dd>
          </div>
          <div>
            <dt className="label">Requested</dt>
            <dd>
              <time dateTime={request.confirmedAt}>{formatDateTime(request.confirmedAt)}</time>
            </dd>
          </div>
        </dl>
      </div>

      <div className="request-detail__card">
        <h3 className="label">Original customer request</h3>
        <blockquote className="transcript transcript--final request-detail__quote">
          “{request.originalTranscript}”
        </blockquote>
        {request.corrections.length > 0 && (
          <>
            <h3 className="label">Corrections while confirming</h3>
            <ol className="request-detail__corrections">
              {request.corrections.map((correction, index) => (
                <li key={index} className="transcript">
                  “{correction}”
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      <div className="request-detail__card">
        <h3 id="request-status-heading" className="label">
          Status
        </h3>
        <div className="status-switch" role="group" aria-labelledby="request-status-heading">
          {REQUEST_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className="status-switch__option"
              aria-pressed={request.status === status}
              onClick={() => onStatusChange(status)}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
