import {
  compareMedicationRequests,
  type FieldComparison,
  type MedicationComparison,
} from "../comparison/compare-medication-requests";
import type { MedicationExtraction } from "../extraction/useMedicationExtraction";
import { FIELD_LABELS } from "./field-labels";
import { MismatchConfirmation } from "./MismatchConfirmation";

interface ComparisonViewProps {
  customer: MedicationExtraction;
  pharmacist: MedicationExtraction;
  /** Takes the user back to the transcripts and extracted requests. */
  onReviewAgain(): void;
}

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
      <p className="comparison__message">
        Can't compare yet: the {failed} request couldn't be extracted. Retry the extraction above.
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
      <h2 id="comparison-heading">Request comparison</h2>
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
        <p className="comparison__verdict comparison__verdict--match">
          <span aria-hidden="true">✓</span> No differences detected
        </p>
      )}
      {comparison.status === "incomplete" && (
        <p className="comparison__verdict comparison__verdict--incomplete">
          More information needed to compare the request.
        </p>
      )}
      {comparison.status === "mismatch" && (
        <MismatchConfirmation comparison={comparison} onReviewAgain={onReviewAgain} />
      )}
      {comparison.unconfirmed.length > 0 && (
        <ul className="comparison__unconfirmed">
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
