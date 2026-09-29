import type { MedicationRequest } from "../../shared/medication-request";

export type MedicationField = keyof MedicationRequest;

/** One field as each side stated it, with the original wording untouched. */
export type FieldComparison = {
  field: MedicationField;
  customer: string | null;
  pharmacist: string | null;
};

export type MedicationComparison = {
  /**
   * match: nothing differs and both sides state the same fields.
   * mismatch: at least one field is stated differently by the two sides.
   * incomplete: nothing differs, but a medication or field is missing on one or both sides.
   */
  status: "match" | "mismatch" | "incomplete";
  /** Fields both sides stated, but differently. */
  mismatches: FieldComparison[];
  /** Fields only one side stated, so the other side did not confirm them. */
  unconfirmed: FieldComparison[];
};

export const MEDICATION_FIELDS: readonly MedicationField[] = [
  "medication",
  "strength",
  "quantity",
  "form",
];

/**
 * Compares what the customer and the pharmacist said, field by field. Only
 * case and whitespace are ignored: no medical knowledge is used, so differently
 * written names or doses are always reported as different.
 */
export function compareMedicationRequests(
  customer: MedicationRequest,
  pharmacist: MedicationRequest,
): MedicationComparison {
  const mismatches: FieldComparison[] = [];
  const unconfirmed: FieldComparison[] = [];

  for (const field of MEDICATION_FIELDS) {
    const entry = { field, customer: customer[field], pharmacist: pharmacist[field] };
    if (entry.customer === null && entry.pharmacist === null) continue;
    if (entry.customer === null || entry.pharmacist === null) {
      unconfirmed.push(entry);
    } else if (normalize(entry.customer) !== normalize(entry.pharmacist)) {
      mismatches.push(entry);
    }
  }

  let status: MedicationComparison["status"];
  if (mismatches.length > 0) {
    status = "mismatch";
  } else if (unconfirmed.length > 0 || customer.medication === null) {
    // customer.medication === null here means neither side named a medication.
    status = "incomplete";
  } else {
    status = "match";
  }
  return { status, mismatches, unconfirmed };
}

/** Ignores harmless formatting: letter case, spacing and Unicode width variants. */
function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}
