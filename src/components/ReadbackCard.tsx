import type { ConfirmationState } from "../confirmation/confirmation-flow";
import type { Confirmation } from "../confirmation/useConfirmationFlow";
import { isSpeechSupported } from "../voice/speech";
import { readbackText } from "../voice/warning-text";
import { AlertIcon, CheckIcon, MicIcon, SpeakerIcon } from "./icons";
import { MedicationFields } from "./MedicationFields";
import { RequestConfirmed } from "./RequestConfirmed";

interface ReadbackCardProps {
  confirmation: Confirmation;
  /** Starts a new recording so the customer can repeat the request. */
  onSayAgain(): void;
}

/**
 * MEDCLE reads the customer's request back ("I heard: …") and listens for the
 * answer: a yes confirms it, a correction updates it and reads it back again.
 * The buttons do the same by touch. It confirms what the customer asked for,
 * never that the request is medically right.
 */
export function ReadbackCard({ confirmation, onSayAgain }: ReadbackCardProps) {
  const { state, confirm, replay } = confirmation;
  if (state.confirmed) {
    return <RequestConfirmed request={state.confirmed} onNewRequest={onSayAgain} />;
  }

  const readback = readbackText(state.request);
  const heardMedication = state.phase !== "unheard";
  const canConfirm = heardMedication && state.phase !== "updating";

  return (
    <section className={`readback readback--${state.phase}`} aria-label="MEDCLE readback">
      <p className="readback__label">
        <SpeakerIcon />
        MEDCLE heard
      </p>
      <p className="readback__text">“{readback}”</p>

      {heardMedication && (
        <>
          <MedicationFields request={state.request} corrected={state.corrected} />
          <p className="extraction__note">
            Extracted automatically. The transcript is the record of what was said.
          </p>
        </>
      )}

      {state.prompt !== readback && state.phase !== "paused" && (
        <p className="readback__prompt">“{state.prompt}”</p>
      )}
      {state.reply && (
        <p className="readback__reply">
          <span className="label">Customer said</span>“{state.reply}”
        </p>
      )}
      <PhaseStatus state={state} />

      <div className="readback__actions">
        {canConfirm && (
          <button type="button" className="button button--primary" onClick={confirm}>
            <CheckIcon />
            Yes, that's right
          </button>
        )}
        <button type="button" className="button button--outline" onClick={onSayAgain}>
          <MicIcon />
          Say it again
        </button>
        {state.phase === "paused" ? (
          <button type="button" className="button button--ghost" onClick={replay}>
            <MicIcon />
            Answer by voice
          </button>
        ) : (
          heardMedication &&
          isSpeechSupported() && (
            <button
              type="button"
              className="button button--ghost"
              onClick={replay}
              disabled={state.phase === "updating"}
            >
              <SpeakerIcon />
              Replay
            </button>
          )
        )}
      </div>
    </section>
  );
}

/** What is happening in the conversation right now. */
function PhaseStatus({ state }: { state: ConfirmationState }) {
  let content;
  switch (state.phase) {
    case "speaking":
      content = (
        <>
          <SpeakerIcon /> MEDCLE is speaking…
        </>
      );
      break;
    case "listening":
      content = (
        <>
          <span className="readback__listening" aria-hidden="true" />
          {state.awaiting === "correction"
            ? "Listening for what to change…"
            : "Listening for your confirmation… Say “yes”, or say what to change."}
        </>
      );
      break;
    case "updating":
      content = (
        <>
          <span className="loader" aria-hidden="true" /> Updating the request…
        </>
      );
      break;
    case "paused":
      content = (
        <>
          <AlertIcon />
          <span>
            {state.notice} Answer by voice again, or use the buttons below.
          </span>
        </>
      );
      break;
    default:
      return null;
  }
  return (
    <p className={`readback__status readback__status--${state.phase}`} role="status">
      {content}
    </p>
  );
}
