import type {
  FieldComparison,
  MedicationComparison,
  MedicationField,
} from "../comparison/compare-medication-requests";

const FIELD_NOUNS: Record<MedicationField, string> = {
  medication: "the medication",
  strength: "the strength",
  quantity: "the quantity",
  form: "the form",
};

// Unit abbreviations as extraction writes them, read out in full.
const SPOKEN_UNITS: Record<string, [singular: string, plural: string]> = {
  mg: ["milligram", "milligrams"],
  g: ["gram", "grams"],
  mcg: ["microgram", "micrograms"],
  ml: ["millilitre", "millilitres"],
};

/**
 * The spoken warning for a comparison: only for a mismatch, built only from
 * the values both sides stated. It never says which value is correct.
 */
export function mismatchWarning(comparison: MedicationComparison): string | null {
  const { status, mismatches } = comparison;
  if (status !== "mismatch" || mismatches.length === 0) return null;

  if (mismatches.length === 1) {
    const [mismatch] = mismatches;
    return `There may be a difference in ${FIELD_NOUNS[mismatch.field]}. ${statedValues(mismatch)} Please confirm.`;
  }

  const fields = mismatches.map((mismatch) => FIELD_NOUNS[mismatch.field]);
  const details = mismatches.map(
    (mismatch) => `For ${FIELD_NOUNS[mismatch.field]}, ${lowerFirst(statedValues(mismatch))}`,
  );
  return `There may be differences in ${joinWithAnd(fields)}. ${details.join(" ")} Please confirm.`;
}

function statedValues({ customer, pharmacist }: FieldComparison): string {
  return `The customer said ${spoken(customer)}, while the pharmacist said ${spoken(pharmacist)}.`;
}

/** Reads unit abbreviations after a number in full ("500 mg" → "500 milligrams"). */
function spoken(value: string | null): string {
  return (value ?? "nothing").replace(/(\d+(?:\.\d+)?)\s*(mg|mcg|ml|g)\b/gi, (match, amount: string, unit: string) => {
    const words = SPOKEN_UNITS[unit.toLowerCase()];
    return words ? `${amount} ${Number(amount) === 1 ? words[0] : words[1]}` : match;
  });
}

function joinWithAnd(items: string[]): string {
  return items.length <= 2
    ? items.join(" and ")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
