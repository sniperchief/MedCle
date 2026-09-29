import { useRef } from "react";
import { ComparisonView } from "./components/ComparisonView";
import { SpeakerPanel } from "./components/SpeakerPanel";
import { useSpeaker } from "./components/useSpeaker";

export function App() {
  const customer = useSpeaker();
  const pharmacist = useSpeaker();
  const panelsRef = useRef<HTMLDivElement>(null);

  return (
    <main className="app">
      <header className="app__header">
        <h1>MEDCLE</h1>
        <p className="app__tagline">Helping pharmacists and customers hear the same thing.</p>
      </header>
      <div className="app__panels" ref={panelsRef}>
        <SpeakerPanel title="Customer" speaker={customer} />
        <SpeakerPanel title="Pharmacist" speaker={pharmacist} />
      </div>
      <ComparisonView
        customer={customer.extraction}
        pharmacist={pharmacist.extraction}
        onReviewAgain={() => panelsRef.current?.scrollIntoView({ behavior: "smooth" })}
      />
    </main>
  );
}
