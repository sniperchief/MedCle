import { useRef, useState } from "react";
import { PharmacistReadBack } from "./components/PharmacistReadBack";
import { ReadBackOffer } from "./components/ReadBackOffer";
import { ReadbackCard } from "./components/ReadbackCard";
import { SiteFooter } from "./components/SiteFooter";
import { SpeakerPanel } from "./components/SpeakerPanel";
import { TopBar } from "./components/TopBar";
import { useSpeaker } from "./components/useSpeaker";
import { useConfirmationFlow } from "./confirmation/useConfirmationFlow";
import { Link, PHARMACY_PATH } from "./router";

/**
 * The counter tool at /app. The customer speaks, MEDCLE reads the request
 * back, and the customer confirms by voice; the confirmed request goes to the
 * pharmacy queue. The pharmacist read-back and the comparison are an optional
 * second check.
 */
export function App() {
  const customer = useSpeaker();
  const { transcription, extraction } = customer;
  const confirmation = useConfirmationFlow(
    extraction.status === "success" ? extraction.request : null,
    transcription.finalTranscript,
  );
  const [readBackEnabled, setReadBackEnabled] = useState(false);
  const panelsRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <TopBar
        actions={
          <>
            <Link to={PHARMACY_PATH} className="topbar__link">
              Pharmacy requests
            </Link>
            <Link to="/" className="topbar__link">
              About MEDCLE
            </Link>
          </>
        }
      />

      <main className="page">
        <header className="session">
          <p className="eyebrow">Counter session</p>
          <h1 className="session__title">Listen and read back.</h1>
          <p className="session__intro">
            The customer speaks and MEDCLE reads back what it heard. The customer answers “yes” to
            confirm, or says what to change, and the confirmed request goes to the pharmacy for
            review. For a second check, the pharmacist can repeat it back and MEDCLE points out any
            difference.
          </p>
        </header>

        <div className="panels" ref={panelsRef}>
          <SpeakerPanel
            title="Customer"
            eyebrow="01 · Speaks naturally"
            speaker={customer}
            confirmation={
              confirmation && (
                <ReadbackCard confirmation={confirmation} onSayAgain={transcription.start} />
              )
            }
          />
          {readBackEnabled ? (
            <PharmacistReadBack
              // Compare against the request as the customer corrected it.
              customer={
                confirmation ? { status: "success", request: confirmation.state.request } : extraction
              }
              onHide={() => setReadBackEnabled(false)}
              onReviewAgain={() => panelsRef.current?.scrollIntoView({ behavior: "smooth" })}
            />
          ) : (
            <ReadBackOffer onAdd={() => setReadBackEnabled(true)} />
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
