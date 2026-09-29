import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { MedicationRequest } from "../../shared/medication-request.ts";
import { compareMedicationRequests } from "../comparison/compare-medication-requests.ts";
import { mismatchWarning } from "./warning-text.ts";

const request = (overrides: Partial<MedicationRequest> = {}): MedicationRequest => ({
  medication: "amoxicillin",
  strength: "500 mg",
  quantity: null,
  form: null,
  ...overrides,
});
const warningFor = (customer: MedicationRequest, pharmacist: MedicationRequest) =>
  mismatchWarning(compareMedicationRequests(customer, pharmacist));

describe("mismatchWarning", () => {
  test("1. strength mismatch", () => {
    assert.equal(
      warningFor(request(), request({ strength: "50 mg" })),
      "There may be a difference in the strength. The customer said 500 milligrams, while the pharmacist said 50 milligrams. Please confirm.",
    );
  });

  test("2. medication mismatch", () => {
    assert.equal(
      warningFor(request(), request({ medication: "amlodipine" })),
      "There may be a difference in the medication. The customer said amoxicillin, while the pharmacist said amlodipine. Please confirm.",
    );
  });

  test("3. multiple mismatches include every difference", () => {
    assert.equal(
      warningFor(
        request({ quantity: "20 tablets" }),
        request({ medication: "amlodipine", strength: "50 mg", quantity: "2 tablets" }),
      ),
      "There may be differences in the medication, the strength and the quantity. " +
        "For the medication, the customer said amoxicillin, while the pharmacist said amlodipine. " +
        "For the strength, the customer said 500 milligrams, while the pharmacist said 50 milligrams. " +
        "For the quantity, the customer said 20 tablets, while the pharmacist said 2 tablets. " +
        "Please confirm.",
    );
  });

  test("4. match → no warning", () => {
    assert.equal(warningFor(request(), request({ medication: "Amoxicillin" })), null);
  });

  test("5. incomplete → no warning", () => {
    assert.equal(warningFor(request(), request({ strength: null })), null);
    const empty = { medication: null, strength: null, quantity: null, form: null };
    assert.equal(warningFor(empty, empty), null);
  });

  test("reads other units in full, with singular for one", () => {
    assert.equal(
      warningFor(request({ strength: "1 g" }), request({ strength: "0.5 ml" })),
      "There may be a difference in the strength. The customer said 1 gram, while the pharmacist said 0.5 millilitres. Please confirm.",
    );
  });

  test("never says which value is correct or gives advice", () => {
    const warning = warningFor(
      request({ quantity: "20 tablets", form: "tablet" }),
      request({ medication: "amlodipine", strength: "50 mg", quantity: "2 tablets", form: "syrup" }),
    )!;
    assert.doesNotMatch(warning, /\b(correct|wrong|incorrect|should|recommend|safe|instead)\b/i);
  });
});
