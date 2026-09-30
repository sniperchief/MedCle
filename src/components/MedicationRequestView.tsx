import type { MedicationExtraction } from "../extraction/useMedicationExtraction";
import { AlertIcon, RetryIcon } from "./icons";
import { MedicationFields } from "./MedicationFields";

interface MedicationRequestViewProps {
  title: string;
  extraction: MedicationExtraction;
  onRetry(): void;
}

/** Medication details extracted from the final transcript, shown beneath it. */
export function MedicationRequestView({ title, extraction, onRetry }: MedicationRequestViewProps) {
  if (extraction.status === "idle") return null;

  return (
    <section className="extraction" aria-label={`${title} request`} aria-live="polite">
      <h3 className="eyebrow">Extracted information · {title} request</h3>

      {extraction.status === "loading" && (
        <p className="extraction__message">
          <span className="loader" aria-hidden="true" />
          Extracting the request from the transcript…
        </p>
      )}

      {extraction.status === "error" && (
        <div className="notice extraction__message--error" role="alert">
          <AlertIcon />
          <span>Couldn't extract the request. The transcript above is unchanged.</span>
          <button type="button" className="button button--outline button--small" onClick={onRetry}>
            <RetryIcon />
            Retry
          </button>
        </div>
      )}

      {extraction.status === "success" && (
        <>
          <MedicationFields request={extraction.request} />
          <p className="extraction__note">
            Extracted automatically. The transcript is the record of what was said.
          </p>
        </>
      )}
    </section>
  );
}
