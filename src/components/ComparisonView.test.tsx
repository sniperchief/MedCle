import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { MedicationRequest } from "../../shared/medication-request";
import type { MedicationExtraction } from "../extraction/useMedicationExtraction";
import { ComparisonView } from "./ComparisonView";

const extracted = (overrides: Partial<MedicationRequest> = {}): MedicationExtraction => ({
  status: "success",
  request: { medication: "amoxicillin", strength: "500 mg", quantity: null, form: null, ...overrides },
});
const customer500 = extracted();
const pharmacist50 = extracted({ strength: "50 mg" });

function renderComparison(customer: MedicationExtraction, pharmacist: MedicationExtraction) {
  const onReviewAgain = vi.fn();
  const view = render(
    <ComparisonView customer={customer} pharmacist={pharmacist} onReviewAgain={onReviewAgain} />,
  );
  const rerender = (nextCustomer: MedicationExtraction, nextPharmacist: MedicationExtraction) =>
    view.rerender(
      <ComparisonView
        customer={nextCustomer}
        pharmacist={nextPharmacist}
        onReviewAgain={onReviewAgain}
      />,
    );
  return { rerender, onReviewAgain };
}

const confirmButton = () => screen.queryByRole("button", { name: "Confirm" });
const reviewButton = () => screen.queryByRole("button", { name: "Review again" });
const text = () => document.body.textContent ?? "";

afterEach(cleanup);

describe("mismatch confirmation", () => {
  test("1. match → no confirmation required", () => {
    renderComparison(customer500, extracted());
    expect(screen.getByText(/No differences detected/)).toBeTruthy();
    expect(confirmButton()).toBeNull();
    expect(reviewButton()).toBeNull();
  });

  test("2. mismatch → confirmation UI appears with both values", () => {
    renderComparison(customer500, pharmacist50);
    expect(text()).toContain("Possible mismatch");
    expect(text()).toContain("Customer: 500 mg");
    expect(text()).toContain("Pharmacist: 50 mg");
    expect(text()).toContain("Please confirm before proceeding.");
    expect(confirmButton()).toBeTruthy();
    expect(reviewButton()).toBeTruthy();
  });

  test("3. Confirm → mismatch confirmed, original values still shown", () => {
    renderComparison(customer500, pharmacist50);
    fireEvent.click(confirmButton()!);

    expect(text()).toContain("Mismatch confirmed");
    expect(text()).not.toContain("Possible mismatch");
    expect(text()).toContain("Customer: 500 mg");
    expect(text()).toContain("Pharmacist: 50 mg");
    expect(confirmButton()).toBeNull();
    expect(customer500).toEqual(extracted());
    expect(pharmacist50).toEqual(extracted({ strength: "50 mg" }));
  });

  test("4. Review again → mismatch back to unresolved, comparison still visible", () => {
    const { onReviewAgain } = renderComparison(customer500, pharmacist50);
    fireEvent.click(confirmButton()!);
    fireEvent.click(reviewButton()!);

    expect(text()).toContain("Possible mismatch");
    expect(text()).not.toContain("Mismatch confirmed");
    expect(text()).toContain("Customer: 500 mg");
    expect(text()).toContain("Pharmacist: 50 mg");
    expect(confirmButton()).toBeTruthy();
    expect(onReviewAgain).toHaveBeenCalledOnce();
  });

  test("5. a new recording clears the confirmation", () => {
    const { rerender } = renderComparison(customer500, pharmacist50);
    fireEvent.click(confirmButton()!);
    expect(text()).toContain("Mismatch confirmed");

    // Customer starts recording again: their extraction is reset while they speak.
    rerender({ status: "idle" }, pharmacist50);
    expect(text()).not.toContain("Mismatch confirmed");
    expect(text()).not.toContain("Possible mismatch");

    // The new recording yields the very same request; it still needs confirming.
    rerender(customer500, pharmacist50);
    expect(text()).toContain("Possible mismatch");
    expect(text()).not.toContain("Mismatch confirmed");
    expect(confirmButton()).toBeTruthy();
  });

  test("a retried extraction also clears the confirmation", () => {
    const { rerender } = renderComparison(customer500, pharmacist50);
    fireEvent.click(confirmButton()!);
    rerender(customer500, { status: "loading" });
    rerender(customer500, pharmacist50);
    expect(text()).not.toContain("Mismatch confirmed");
  });

  test("6. incomplete result → no confirmation button", () => {
    renderComparison(customer500, extracted({ strength: null }));
    expect(text()).toContain("More information needed");
    expect(confirmButton()).toBeNull();
    expect(reviewButton()).toBeNull();
  });

  test("7. extraction failure → no confirmation", () => {
    renderComparison(customer500, { status: "error" });
    expect(text()).toContain("couldn't be extracted");
    expect(text()).not.toContain("mismatch");
    expect(confirmButton()).toBeNull();
    expect(reviewButton()).toBeNull();
  });

  test("8. multiple mismatches are all shown", () => {
    renderComparison(
      extracted({ quantity: "20 tablets", form: "tablet" }),
      extracted({ medication: "amlodipine", strength: "50 mg", quantity: "2 tablets", form: "syrup" }),
    );
    const differences = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(differences).toEqual([
      "MedicationCustomer: amoxicillinPharmacist: amlodipine",
      "StrengthCustomer: 500 mgPharmacist: 50 mg",
      "QuantityCustomer: 20 tabletsPharmacist: 2 tablets",
      "FormCustomer: tabletPharmacist: syrup",
    ]);
    expect(confirmButton()).toBeTruthy();
  });
});
