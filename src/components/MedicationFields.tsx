import type { MedicationRequest } from "../../shared/medication-request";
import {
  MEDICATION_FIELDS,
  type MedicationField,
} from "../comparison/compare-medication-requests";
import { FIELD_LABELS } from "./field-labels";

interface MedicationFieldsProps {
  request: MedicationRequest;
  /** Shown for a field that was not stated. */
  missing?: string;
  /** Fields to mark as changed by the customer's correction. */
  corrected?: readonly MedicationField[];
}

/** The medication, strength, quantity and form, exactly as stated. */
export function MedicationFields({ request, missing = "Not stated", corrected = [] }: MedicationFieldsProps) {
  return (
    <dl className="extraction__fields">
      {MEDICATION_FIELDS.map((field) => (
        <div key={field} className="extraction__field">
          <dt>
            {FIELD_LABELS[field]}
            {corrected.includes(field) && <span className="extraction__corrected"> · Corrected</span>}
          </dt>
          <dd className={request[field] ? undefined : "extraction__missing"}>
            {request[field] ?? missing}
          </dd>
        </div>
      ))}
    </dl>
  );
}
