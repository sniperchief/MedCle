import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { MedicationRequest } from "../../shared/medication-request";
import type { MedicationExtraction } from "../extraction/useMedicationExtraction";
import { ComparisonView } from "./ComparisonView";

const STRENGTH_WARNING =
  "There may be a difference in the strength. The customer said 500 milligrams, while the pharmacist said 50 milligrams. Please confirm.";

// jsdom has no speech synthesis: record what MEDCLE would say instead.
const synth = { speak: vi.fn(), cancel: vi.fn() };
class FakeUtterance {
  text: string;
  lang = "";
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}
const spoken = () => synth.speak.mock.calls.map(([utterance]) => (utterance as FakeUtterance).text);

const extracted = (overrides: Partial<MedicationRequest> = {}): MedicationExtraction => ({
  status: "success",
  request: { medication: "amoxicillin", strength: "500 mg", quantity: null, form: null, ...overrides },
});

function renderComparison(customer: MedicationExtraction, pharmacist: MedicationExtraction) {
  const view = render(
    <ComparisonView customer={customer} pharmacist={pharmacist} onReviewAgain={() => {}} />,
  );
  return (nextCustomer: MedicationExtraction, nextPharmacist: MedicationExtraction) =>
    view.rerender(
      <ComparisonView customer={nextCustomer} pharmacist={nextPharmacist} onReviewAgain={() => {}} />,
    );
}
const button = (name: string) => screen.getByRole("button", { name });

beforeEach(() => {
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("voice warning", () => {
  test("a new mismatch is spoken automatically", () => {
    renderComparison(extracted(), extracted({ strength: "50 mg" }));
    expect(spoken()).toEqual([STRENGTH_WARNING]);
  });

  test("6. Replay speaks the current warning again", () => {
    renderComparison(extracted(), extracted({ strength: "50 mg" }));
    fireEvent.click(button("Replay"));
    expect(spoken()).toEqual([STRENGTH_WARNING, STRENGTH_WARNING]);
  });

  test("7. Confirm stops active speech and does not speak again", () => {
    renderComparison(extracted(), extracted({ strength: "50 mg" }));
    synth.cancel.mockClear();

    fireEvent.click(button("Confirm"));

    expect(synth.cancel).toHaveBeenCalledOnce();
    expect(spoken()).toEqual([STRENGTH_WARNING]);
    expect(screen.getByText(/Mismatch confirmed/)).toBeTruthy();
  });

  test("8. starting a new recording stops active speech", () => {
    const rerender = renderComparison(extracted(), extracted({ strength: "50 mg" }));
    synth.cancel.mockClear();

    rerender({ status: "idle" }, extracted({ strength: "50 mg" }));

    expect(synth.cancel).toHaveBeenCalledOnce();
    expect(spoken()).toEqual([STRENGTH_WARNING]);
  });

  test("9. re-renders with the same mismatch do not repeat the warning", () => {
    const rerender = renderComparison(extracted(), extracted({ strength: "50 mg" }));
    // Equal but new objects, as each render of the app produces.
    rerender(extracted(), extracted({ strength: "50 mg" }));
    rerender(extracted(), extracted({ strength: "50 mg" }));
    expect(spoken()).toEqual([STRENGTH_WARNING]);
  });

  test("Review again does not speak the warning again", () => {
    renderComparison(extracted(), extracted({ strength: "50 mg" }));
    fireEvent.click(button("Confirm"));
    fireEvent.click(button("Review again"));
    expect(spoken()).toEqual([STRENGTH_WARNING]);
  });

  test("a new mismatch after a new recording is spoken", () => {
    const rerender = renderComparison(extracted(), extracted({ strength: "50 mg" }));
    rerender({ status: "idle" }, extracted({ strength: "50 mg" }));
    rerender(extracted({ medication: "amlodipine" }), extracted({ strength: "50 mg" }));
    expect(spoken()).toHaveLength(2);
    expect(spoken()[1]).toContain("differences in the medication and the strength");
  });

  test.each([
    ["match", extracted(), extracted()],
    ["incomplete", extracted(), extracted({ strength: null })],
    ["failed extraction", extracted(), { status: "error" } as const],
    ["waiting", extracted(), { status: "loading" } as const],
  ])("nothing is spoken for %s", (_name, customer, pharmacist) => {
    renderComparison(customer, pharmacist);
    expect(synth.speak).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Replay" })).toBeNull();
  });

  test("without speech support the mismatch still shows, without Replay", () => {
    vi.unstubAllGlobals();
    renderComparison(extracted(), extracted({ strength: "50 mg" }));
    expect(screen.getByText(/Possible mismatch/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Replay" })).toBeNull();
    expect(button("Confirm")).toBeTruthy();
  });
});
