import type { MedicationExtraction } from "../extraction/useMedicationExtraction";
import { ComparisonView } from "./ComparisonView";
import { SpeakerPanel } from "./SpeakerPanel";
import { useSpeaker } from "./useSpeaker";

interface PharmacistReadBackProps {
  customer: MedicationExtraction;
  onHide(): void;
  onReviewAgain(): void;
}

/**
 * The optional second check: the pharmacist's panel and the comparison. It
 * owns the pharmacist's session, so hiding it (unmounting) stops any recording
 * or speech and discards the old read-back instead of comparing it later.
 */
export function PharmacistReadBack({ customer, onHide, onReviewAgain }: PharmacistReadBackProps) {
  const pharmacist = useSpeaker();

  return (
    <>
      <SpeakerPanel
        title="Pharmacist"
        eyebrow="02 · Optional · Repeats it back"
        speaker={pharmacist}
        onHide={onHide}
      />
      <ComparisonView
        customer={customer}
        pharmacist={pharmacist.extraction}
        onReviewAgain={onReviewAgain}
      />
    </>
  );
}
