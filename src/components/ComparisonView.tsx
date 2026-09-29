import {
  compareMedicationRequests,
  type FieldComparison,
  type MedicationComparison,
} from "../comparison/compare-medication-requests";
import type { MedicationExtraction } from "../extraction/useMedicationExtraction";
import { FIELD_LABELS } from "./field-labels";
import { AlertIcon, CheckIcon } from "./icons";
import { MismatchConfirmation } from "./MismatchConfirmation";

interface ComparisonViewProps {
  customer: MedicationExtraction;
  pharmacist: MedicationExtraction;
  /** Takes the user back to the transcripts and extracted requests. */
  onReviewAgain(): void;
}

const SIDE_STATUS: Record<MedicationExtraction["status"], string> = {
  idle: "Waiting for recording",
  loading: "Extracting…",
  success: "Request extracted",
  error: "Extraction failed",
};

/**
 * Compares the two extracted requests once both are available. It is derived
 * from the current extractions, so a new recording on either side clears it,
 * along with any mismatch confirmation.
 */
export function ComparisonView({ customer, pharmacist, onReviewAgain }: ComparisonViewProps) {
  let content;
  if (customer.status === "error" || pharmacist.status === "error") {
    const failed = customer.status === "error" ? "customer's" : "pharmacist's";
    content = (
      <p className="notice">
        <AlertIcon />
        <span>
          Can't compare yet: the {failed} request couldn't be extracted. Retry the extraction above.
        </span>
      </p>
    );
  } else if (customer.status !== "success" || pharmacist.status !== "success") {
    content = (
      <p className="comparison__message">
        Waiting for both requests. The comparison runs once the customer and the pharmacist have
        both finished recording.
      </p>
    );
  } else {
    content = (
      <ComparisonResult
        comparison={compareMedicationRequests(customer.request, pharmacist.request)}
        onReviewAgain={onReviewAgain}
      />
    );
  }

  return (
    <section className="comparison" aria-labelledby="comparison-heading" aria-live="polite">
      <header className="comparison__header">
        <div>
          <p className="eyebrow">03 · Comparison</p>
          <h2 id="comparison-heading" className="comparison__title">
            Request comparison
          </h2>
        </div>
        <ul className="sides" aria-label="Extraction status">
          {(
            [
              ["Customer", customer.status],
              ["Pharmacist", pharmacist.status],
            ] as const
          ).map(([side, status]) => (
            <li key={side} className={`side side--${status}`}>
              <span className="side__dot" aria-hidden="true" />
              {side} · {SIDE_STATUS[status]}
            </li>
          ))}
        </ul>
      </header>
      {content}
    </section>
  );
}

interface ComparisonResultProps {
  comparison: MedicationComparison;
  onReviewAgain(): void;
}

function ComparisonResult({ comparison, onReviewAgain }: ComparisonResultProps) {
  return (
    <>
      {comparison.status === "match" && (
        <div className="verdict verdict--match">
          <span className="verdict__icon">
            <CheckIcon size={22} />
          </span>
          <div>
            <p className="verdict__title">No differences detected</p>
            <p className="verdict__detail">The customer and the pharmacist stated the same request.</p>
          </div>
        </div>
      )}
      {comparison.status === "incomplete" && (
        <div className="verdict verdict--incomplete">
          <span className="verdict__icon">
            <AlertIcon size={22} />
          </span>
          <div>
            <p className="verdict__title">More information needed to compare the request.</p>
            <p className="verdict__detail">Nothing differs, but not everything was stated by both.</p>
          </div>
        </div>
      )}
      {comparison.status === "mismatch" && (
        <MismatchConfirmation comparison={comparison} onReviewAgain={onReviewAgain} />
      )}
      {comparison.unconfirmed.length > 0 && (
        <ul className="unconfirmed">
          {comparison.unconfirmed.map((entry) => (
            <li key={entry.field}>{describeUnconfirmed(entry)}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function describeUnconfirmed({ field, customer, pharmacist }: FieldComparison): string {
  const label = FIELD_LABELS[field];
  return customer !== null
    ? `${label} "${customer}" was stated by the customer but not confirmed by the pharmacist.`
    : `${label} "${pharmacist}" was stated by the pharmacist but not by the customer.`;
}
