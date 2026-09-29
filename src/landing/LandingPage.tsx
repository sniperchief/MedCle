import { SiteFooter } from "../components/SiteFooter";
import { TopBar, type NavLink } from "../components/TopBar";
import { ClaritySection } from "./ClaritySection";
import { LaunchButton } from "./LaunchButton";
import { ListenSection } from "./ListenSection";
import { ProblemSection } from "./ProblemSection";
import { SafetySection } from "./SafetySection";
import { Reveal } from "./Reveal";
import "./landing.css";

const SECTION_LINKS: NavLink[] = [
  { href: "#problem", label: "The problem" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#safety", label: "What it doesn't do" },
];

/** The marketing and education page at "/". The working tool lives at /app. */
export function LandingPage() {
  return (
    <>
      <TopBar links={SECTION_LINKS} actions={<LaunchButton />} />

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

      <SiteFooter />
    </>
  );
}
