import { TopBar } from "../components/TopBar";
import { ClaritySection } from "./ClaritySection";
import { LaunchButton } from "./LaunchButton";
import { ListenSection } from "./ListenSection";
import { ProblemSection } from "./ProblemSection";
import { SafetySection } from "./SafetySection";
import { Reveal } from "./Reveal";
import "./landing.css";

/** The marketing and education page at "/". The working tool lives at /app. */
export function LandingPage() {
  return (
    <>
      <TopBar>
        <nav className="topbar__nav" aria-label="Sections">
          <a href="#problem">The problem</a>
          <a href="#how-it-works">How it works</a>
          <a href="#safety">What it doesn't do</a>
        </nav>
        <LaunchButton />
      </TopBar>

      <main className="landing">
        <ProblemSection />
        <ListenSection />
        <ClaritySection />
        <SafetySection />

        <section className="cta" aria-labelledby="cta-heading">
          <Reveal className="cta__inner">
            <h2 id="cta-heading" className="cta__title">
              Ready for the next customer at the counter.
            </h2>
            <p className="cta__text">
              Open MEDCLE, allow the microphone, and start a counter session. It runs in the browser.
            </p>
            <LaunchButton inverse />
          </Reveal>
        </section>
      </main>

      <footer className="landing-footer">
        <span className="logo__word">medcle</span>
        <p>
          MEDCLE is a communication aid for pharmacy counters. It does not prescribe, diagnose or
          recommend medication.
        </p>
      </footer>
    </>
  );
}
