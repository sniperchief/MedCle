import { MEDICATION_FIELDS } from "../comparison/compare-medication-requests";
import type { MedicationExtraction } from "../extraction/useMedicationExtraction";
import { FIELD_LABELS } from "./field-labels";

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
      <h3 className="extraction__title">Extracted information · {title} request</h3>

      {extraction.status === "loading" && (
        <p className="extraction__message">Extracting the request from the transcript…</p>
      )}

      {extraction.status === "error" && (
        <div className="extraction__message extraction__message--error" role="alert">
          <span>Couldn't extract the request. The transcript above is unchanged.</span>
          <button type="button" className="button button--retry" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {extraction.status === "success" && (
        <>
          <dl className="extraction__fields">
            {MEDICATION_FIELDS.map((field) => (
              <div key={field} className="extraction__field">
                <dt>{FIELD_LABELS[field]}</dt>
                <dd className={extraction.request[field] ? undefined : "extraction__missing"}>
                  {extraction.request[field] ?? "Not stated"}
                </dd>
              </div>
            ))}
          </dl>
          <p className="extraction__note">
            Extracted automatically. The transcript is the record of what was said.
          </p>
        </>
      )}
    </section>
  );
}
