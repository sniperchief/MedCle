import { ArrowRightIcon, MicIcon } from "../components/icons";
import { Reveal } from "./Reveal";

const SPOKEN = "I need amoxicillin, five hundred milligrams.";

/** Section 2: the customer just speaks; MEDCLE listens and extracts. */
export function ListenSection() {
  return (
    <section id="how-it-works" className="section" aria-labelledby="listen-heading">
      <div className="section__intro">
        <p className="eyebrow">How it works</p>
        <h2 id="listen-heading" className="headline">
          Just say what you need. <span className="brand-word">MEDCLE</span> listens.
        </h2>
        <p className="lede">
          No forms and no spelling it out. The customer speaks naturally at the counter, and MEDCLE
          transcribes the request as it is said.
        </p>
      </div>

      <Reveal className="flow">
        <article className="flow__step">
          <p className="flow__number">01</p>
          <h3 className="flow__title">
            <MicIcon />
            The customer speaks
          </h3>
          <div className="bubble bubble--customer">“{SPOKEN}”</div>
        </article>

        <span className="flow__arrow" aria-hidden="true">
          <ArrowRightIcon />
        </span>

        <article className="flow__step">
          <p className="flow__number">02</p>
          <h3 className="flow__title">MEDCLE listens</h3>
          <div className="demo-transcript">
            <span className="status status--listening">
              <span className="status__dot" aria-hidden="true" />
              Listening
            </span>
            <p aria-label={SPOKEN}>
              {SPOKEN.split(" ").map((word, index) => (
                <span
                  key={index}
                  className="demo-word"
                  aria-hidden="true"
                  style={{ animationDelay: `${0.25 + index * 0.22}s` }}
                >
                  {word}{" "}
                </span>
              ))}
            </p>
          </div>
        </article>

        <span className="flow__arrow" aria-hidden="true">
          <ArrowRightIcon />
        </span>

        <article className="flow__step">
          <p className="flow__number">03</p>
          <h3 className="flow__title">The request is extracted</h3>
          <dl className="demo-fields">
            <div>
              <dt>Medication</dt>
              <dd>amoxicillin</dd>
            </div>
            <div>
              <dt>Strength</dt>
              <dd>500 mg</dd>
            </div>
            <div>
              <dt>Quantity</dt>
              <dd className="demo-fields__missing">Not stated</dd>
            </div>
          </dl>
        </article>
      </Reveal>
      <p className="section__footnote">Example of a single request, shown for illustration.</p>
    </section>
  );
}
