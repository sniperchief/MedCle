import { MicIcon } from "./icons";

/** Offers the optional pharmacist read-back in place of the pharmacist panel. */
export function ReadBackOffer({ onAdd }: { onAdd(): void }) {
  return (
    <section className="offer" aria-labelledby="offer-heading">
      <p className="eyebrow">02 · Optional double-check</p>
      <h2 id="offer-heading" className="offer__title">
        Pharmacist read-back
      </h2>
      <p className="offer__text">
        The customer's request appears clearly on the left. For a second check, the pharmacist can
        repeat it back, and MEDCLE points out any difference between what the customer said and
        what the pharmacist heard.
      </p>
      <p className="offer__text">
        Useful when the counter is busy or noisy, or when the pharmacist isn't looking at the
        screen.
      </p>
      <button type="button" className="button button--outline" onClick={onAdd}>
        <MicIcon />
        Add pharmacist read-back
      </button>
    </section>
  );
}
