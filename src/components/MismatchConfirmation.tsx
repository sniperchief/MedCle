import { useState } from "react";
import type { MedicationComparison } from "../comparison/compare-medication-requests";
import { useVoiceWarning } from "../voice/useVoiceWarning";
import { mismatchWarning } from "../voice/warning-text";
import { FIELD_LABELS } from "./field-labels";

interface MismatchConfirmationProps {
  comparison: MedicationComparison;
  onReviewAgain(): void;
}

/**
 * A possible mismatch that stays unresolved until someone confirms it. The
 * confirmation lives only as long as this component: it is unmounted whenever
 * either side records again or re-extracts, so it can never carry over to a
 * new request. Confirming never changes or chooses between the two values.
 *
 * The warning is spoken once when the mismatch appears; unmounting (a new
 * recording) or confirming stops it, and Replay repeats it on request.
 */
export function MismatchConfirmation({ comparison, onReviewAgain }: MismatchConfirmationProps) {
  const [confirmed, setConfirmed] = useState(false);
  const voice = useVoiceWarning(mismatchWarning(comparison));

  const confirm = () => {
    voice.stop();
    setConfirmed(true);
  };

  const reviewAgain = () => {
    setConfirmed(false);
    onReviewAgain();
  };

  return (
    <div className={`mismatch${confirmed ? " mismatch--confirmed" : ""}`}>
      {confirmed ? (
        <p className="comparison__verdict comparison__verdict--confirmed" role="status">
          <span aria-hidden="true">✓</span> Mismatch confirmed
        </p>
      ) : (
        <p className="comparison__verdict comparison__verdict--mismatch" role="alert">
          <span aria-hidden="true">⚠</span> Possible mismatch
        </p>
      )}

      <ul className="comparison__differences">
        {comparison.mismatches.map((mismatch) => (
          <li key={mismatch.field} className="comparison__difference">
            <strong>{FIELD_LABELS[mismatch.field]}</strong>
            <span>Customer: {mismatch.customer}</span>
            <span>Pharmacist: {mismatch.pharmacist}</span>
          </li>
        ))}
      </ul>

      <p className="comparison__confirm">
        {confirmed
          ? "The difference was acknowledged. Neither value was changed."
          : "Please confirm before proceeding."}
      </p>

      <div className="mismatch__actions">
        {!confirmed && (
          <button type="button" className="button button--start" onClick={confirm}>
            Confirm
          </button>
        )}
        <button type="button" className="button button--secondary" onClick={reviewAgain}>
          Review again
        </button>
        {voice.supported && (
          <button type="button" className="button button--secondary" onClick={voice.replay}>
            <span aria-hidden="true">🔊</span> Replay
          </button>
        )}
      </div>
    </div>
  );
}
