import { CheckIcon, MinusIcon } from "../components/icons";
import { Reveal } from "./Reveal";

const DOES = [
  "Captures what the customer says",
  "Transcribes the conversation as it happens",
  "Extracts the medication details that were explicitly stated",
  "Reads the request back so it is easier to understand",
  "Optionally compares the request with what the pharmacist heard",
  "Flags any difference for both people to confirm",
];

const DOES_NOT = [
  "Prescribe",
  "Diagnose",
  "Recommend medication",
  "Decide which dosage is correct",
  "Replace the pharmacist",
];

/** Section 4: what MEDCLE does and, just as clearly, what it does not. */
export function SafetySection() {
  return (
    <section id="safety" className="section" aria-labelledby="safety-heading">
      <div className="section__intro">
        <p className="eyebrow">A communication safety layer</p>
        <h2 id="safety-heading" className="headline">
          Clearer communication. The medical decisions stay with the pharmacist.
        </h2>
      </div>

      <Reveal className="safety">
        <div className="safety__card safety__card--does">
          <h3 className="safety__title">MEDCLE does</h3>
          <ul className="safety__list">
            {DOES.map((item) => (
              <li key={item}>
                <span className="safety__icon">
                  <CheckIcon />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="safety__card safety__card--does-not">
          <h3 className="safety__title">MEDCLE does not</h3>
          <ul className="safety__list">
            {DOES_NOT.map((item) => (
              <li key={item}>
                <span className="safety__icon">
                  <MinusIcon />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="safety__note">
            The pharmacist remains responsible for every medical decision.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
