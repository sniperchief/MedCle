import { LaunchButton } from "./LaunchButton";
import { Reveal } from "./Reveal";

const HARD_NAMES = ["amoxicillin", "levothyroxine", "hydrochlorothiazide", "metoclopramide"];

/** Section 1: medication names are hard for customers to say. */
export function ProblemSection() {
  return (
    <section id="problem" className="section section--hero" aria-labelledby="problem-heading">
      <div className="section__copy">
        <p className="tag">For the pharmacy counter</p>
        <h1 id="problem-heading" className="display">
          Medication names aren't always easy to say.
        </h1>
        <p className="lede">
          Customers aren't pharmacists. Generic names are long, unfamiliar and easy to mispronounce,
          so requests at the counter often come out half-said or unclear. MEDCLE helps turn what a
          customer says into a request the pharmacist can clearly understand.
        </p>
        <div className="section__actions">
          <LaunchButton />
          <a href="#how-it-works" className="button button--outline">
            See how it works
          </a>
        </div>
      </div>

      <Reveal className="illustration">
        <div className="scene">
          <p className="scene__label">Example · at the counter</p>
          <div className="bubble bubble--customer">
            <span className="bubble__who">Customer</span>
            Hi, I need the amoxic… amoxi… the amoxy one? Five hundred, I think.
          </div>
          <div className="bubble bubble--pharmacist">
            <span className="bubble__who">Pharmacist</span>
            Sorry, which medication was that, and which strength?
          </div>
        </div>
        <div className="names">
          <p className="label">Names customers often find hard to say</p>
          <ul className="names__list">
            {HARD_NAMES.map((name) => (
              <li key={name} className="chip">
                {name}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
