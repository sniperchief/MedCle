import { AlertIcon, CheckIcon, SpeakerIcon } from "../components/icons";
import { Reveal } from "./Reveal";

/** Section 3: from a half-said name to a clear, read-back request. */
export function ClaritySection() {
  return (
    <section className="section" aria-labelledby="clarity-heading">
      <div className="section__intro">
        <p className="eyebrow">Making the request clear</p>
        <h2 id="clarity-heading" className="headline">
          From a half-said name to a request the pharmacist can read.
        </h2>
        <p className="lede">
          MEDCLE reads back what it heard so the customer can confirm it, then hands the pharmacist
          a clear request. If a word is unclear, MEDCLE shows it exactly as heard. It never guesses a
          medication name or corrects a dose.
        </p>
      </div>

      <Reveal className="clarity">
        <article className="clarity__card">
          <p className="label">What the customer said</p>
          <p className="clarity__quote">“I need amoxic… amoxicillin five hundred.”</p>
        </article>

        <article className="clarity__card clarity__card--medcle">
          <p className="clarity__speaker">
            <SpeakerIcon />
            MEDCLE reads it back
            <span className="voice-bars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
          </p>
          <p className="clarity__readback">“I heard: amoxicillin, 500 milligrams. Is that correct?”</p>
          <p className="clarity__reply">
            <CheckIcon />
            Customer: “Yes.”
          </p>
        </article>

        <article className="clarity__card">
          <p className="label">For the pharmacist</p>
          <dl className="demo-fields">
            <div>
              <dt>Medication</dt>
              <dd>amoxicillin</dd>
            </div>
            <div>
              <dt>Strength</dt>
              <dd>500 mg</dd>
            </div>
          </dl>
          <p className="clarity__confirmed">
            <CheckIcon />
            Confirmed by the customer
          </p>
        </article>
      </Reveal>

      <Reveal className="compare-example">
        <div className="compare-example__copy">
          <p className="eyebrow">Optional double-check</p>
          <h3 className="compare-example__title">
            If what the pharmacist heard is different, MEDCLE says so.
          </h3>
          <p>
            For a second check, the pharmacist can repeat the request back. MEDCLE compares the two
            field by field. It doesn't pick a side; it points out the difference so both people can
            check before anything is handed over.
          </p>
        </div>
        <div className="mini-mismatch">
          <p className="mini-mismatch__title">
            <AlertIcon />
            Possible difference
          </p>
          <p className="mini-mismatch__field">Strength</p>
          <dl className="mini-mismatch__values">
            <div>
              <dt>Customer</dt>
              <dd>500 mg</dd>
            </div>
            <div>
              <dt>Pharmacist</dt>
              <dd>50 mg</dd>
            </div>
          </dl>
          <p className="mini-mismatch__prompt">Please confirm.</p>
        </div>
      </Reveal>
      <p className="section__footnote">Examples shown for illustration.</p>
    </section>
  );
}
