import { useRef, useState } from "react";
import { PharmacistReadBack } from "./components/PharmacistReadBack";
import { ReadBackOffer } from "./components/ReadBackOffer";
import { SiteFooter } from "./components/SiteFooter";
import { SpeakerPanel } from "./components/SpeakerPanel";
import { TopBar } from "./components/TopBar";
import { useSpeaker } from "./components/useSpeaker";
import { Link } from "./router";

/**
 * The counter tool at /app. The customer speaks and MEDCLE reads the request
 * back; the pharmacist read-back and the comparison are an optional second check.
 */
export function App() {
  const customer = useSpeaker();
  const [readBackEnabled, setReadBackEnabled] = useState(false);
  const panelsRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <TopBar
        actions={
          <Link to="/" className="topbar__link">
            About MEDCLE
          </Link>
        }
      />

      <main className="page">
        <header className="session">
          <p className="eyebrow">Counter session</p>
          <h1 className="session__title">Listen and read back.</h1>
          <p className="session__intro">
            The customer speaks and MEDCLE reads back what it heard, so both of you can be sure of
            the request. For a second check, the pharmacist can repeat it back and MEDCLE points out
            any difference.
          </p>
        </header>

        <div className="panels" ref={panelsRef}>
          <SpeakerPanel
            title="Customer"
            eyebrow="01 · Speaks naturally"
            speaker={customer}
            readback
          />
          {readBackEnabled ? (
            <PharmacistReadBack
              customer={customer.extraction}
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
