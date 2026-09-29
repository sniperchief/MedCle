import { useState } from "react";
import type { MedicationComparison } from "../comparison/compare-medication-requests";
import { useVoiceWarning } from "../voice/useVoiceWarning";
import { mismatchWarning } from "../voice/warning-text";
import { FIELD_LABELS } from "./field-labels";
import { AlertIcon, CheckIcon, SpeakerIcon } from "./icons";

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
    <div className={`mismatch ${confirmed ? "mismatch--confirmed" : "mismatch--open"}`}>
      {confirmed ? (
        <p className="mismatch__title" role="status">
          <CheckIcon size={24} />
          Mismatch confirmed
        </p>
      ) : (
        <p className="mismatch__title" role="alert">
          <AlertIcon size={24} />
          Possible mismatch
        </p>
      )}

      <ul className="differences">
        {comparison.mismatches.map((mismatch) => (
          <li key={mismatch.field} className="difference">
            <span className="difference__field">{FIELD_LABELS[mismatch.field]}</span>
            <dl className="difference__values">
              <div>
                <dt>Customer</dt>
                <dd>{mismatch.customer}</dd>
              </div>
              <div>
                <dt>Pharmacist</dt>
                <dd>{mismatch.pharmacist}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <p className="mismatch__prompt">
        {confirmed
          ? "The difference was acknowledged. Neither value was changed."
          : "Please confirm before proceeding."}
      </p>

      <div className="mismatch__actions">
        {!confirmed && (
          <button type="button" className="button button--inverse" onClick={confirm}>
            Confirm
          </button>
        )}
        <button type="button" className="button button--outline" onClick={reviewAgain}>
          Review again
        </button>
        {voice.supported && (
          <button type="button" className="button button--ghost" onClick={voice.replay}>
            <SpeakerIcon />
            Replay
          </button>
        )}
      </div>
    </div>
  );
}
