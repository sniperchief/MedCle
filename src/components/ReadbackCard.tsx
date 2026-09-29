import { useState } from "react";
import type { MedicationRequest } from "../../shared/medication-request";
import { useVoiceWarning } from "../voice/useVoiceWarning";
import { readbackText } from "../voice/warning-text";
import { CheckIcon, MicIcon, SpeakerIcon } from "./icons";

interface ReadbackCardProps {
  request: MedicationRequest;
  /** Starts a new recording so the customer can repeat the request. */
  onSayAgain(): void;
}

/**
 * MEDCLE reads the customer's request back ("I heard: …") so the customer can
 * confirm it was understood. Mounted only while the extraction is shown, so a
 * new recording resets it and stops its speech. It confirms understanding
 * only, never that the request is medically right.
 */
export function ReadbackCard({ request, onSayAgain }: ReadbackCardProps) {
  const [confirmed, setConfirmed] = useState(false);
  const text = readbackText(request);
  const voice = useVoiceWarning(text);
  const heardMedication = request.medication !== null;

  const confirm = () => {
    voice.stop();
    setConfirmed(true);
  };

  return (
    <section className={`readback${confirmed ? " readback--confirmed" : ""}`} aria-label="MEDCLE readback">
      <p className="readback__label">
        <SpeakerIcon />
        MEDCLE heard
      </p>
      <p className="readback__text">“{text}”</p>

      {confirmed && (
        <p className="readback__status" role="status">
          <CheckIcon />
          Confirmed by the customer.
        </p>
      )}

      <div className="readback__actions">
        {heardMedication && !confirmed && (
          <button type="button" className="button button--primary" onClick={confirm}>
            <CheckIcon />
            Yes, that's right
          </button>
        )}
        <button type="button" className="button button--outline" onClick={onSayAgain}>
          <MicIcon />
          Say it again
        </button>
        {voice.supported && (
          <button type="button" className="button button--ghost" onClick={voice.replay}>
            <SpeakerIcon />
            Replay
          </button>
        )}
      </div>
    </section>
  );
}
