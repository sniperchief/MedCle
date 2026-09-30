import { requestDetails, type PharmacyRequest } from "../requests/pharmacy-requests";
import { Link, PHARMACY_PATH } from "../router";
import { CheckIcon, MicIcon } from "./icons";

interface RequestConfirmedProps {
  request: PharmacyRequest;
  /** Starts a new recording for the next request. */
  onNewRequest(): void;
}

/**
 * What the customer sees once they confirmed. It says only what MEDCLE knows:
 * the request was confirmed and sent, not that it is approved or available.
 */
export function RequestConfirmed({ request, onNewRequest }: RequestConfirmedProps) {
  const details = requestDetails(request);
  return (
    <section className="request-confirmed" aria-labelledby="request-confirmed-heading">
      <h3 id="request-confirmed-heading" className="request-confirmed__title">
        <CheckIcon size={22} />
        Request confirmed
      </h3>
      <p className="request-confirmed__text">Your medication request has been sent to the pharmacy.</p>

      <div className="request-confirmed__summary">
        <p className="request-confirmed__medication">{request.medication}</p>
        <p className="request-confirmed__details">{details || "No strength or quantity stated"}</p>
      </div>

      <p className="request-confirmed__status">
        Status: <strong>Awaiting pharmacist review</strong>
      </p>

      <div className="readback__actions">
        <button type="button" className="button button--outline" onClick={onNewRequest}>
          <MicIcon />
          Start a new request
        </button>
        <Link to={PHARMACY_PATH} className="button button--ghost">
          View pharmacy requests
        </Link>
      </div>
    </section>
  );
}
