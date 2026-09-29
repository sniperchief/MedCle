/**
 * Medication details extracted from what one person said. Every field holds
 * the wording as stated, or null when it was not stated. It never replaces
 * the transcript, which stays the record of what was actually said.
 */
export type MedicationRequest = {
  medication: string | null;
  strength: string | null;
  quantity: string | null;
  form: string | null;
};
