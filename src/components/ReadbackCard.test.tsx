import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { MedicationRequest } from "../../shared/medication-request";
import { ReadbackCard } from "./ReadbackCard";

const READBACK = "I heard: amoxicillin, 500 milligrams. Is that correct?";

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

const request = (overrides: Partial<MedicationRequest> = {}): MedicationRequest => ({
  medication: "amoxicillin",
  strength: "500 mg",
  quantity: null,
  form: null,
  ...overrides,
});

function renderReadback(value: MedicationRequest = request()) {
  const onSayAgain = vi.fn();
  const view = render(<ReadbackCard request={value} onSayAgain={onSayAgain} />);
  return { onSayAgain, view };
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

describe("readback", () => {
  test("shows and speaks what MEDCLE heard, once", () => {
    const { view } = renderReadback();
    view.rerender(<ReadbackCard request={request()} onSayAgain={() => {}} />);
    expect(screen.getByText(`“${READBACK}”`)).toBeTruthy();
    expect(spoken()).toEqual([READBACK]);
  });

  test("“Yes, that's right” confirms and stops the speech", () => {
    renderReadback();
    synth.cancel.mockClear();
    fireEvent.click(button("Yes, that's right"));
    expect(screen.getByText(/Confirmed by the customer/)).toBeTruthy();
    expect(synth.cancel).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Yes, that's right" })).toBeNull();
  });

  test("“Say it again” asks for a new recording", () => {
    const { onSayAgain } = renderReadback();
    fireEvent.click(button("Say it again"));
    expect(onSayAgain).toHaveBeenCalledOnce();
  });

  test("Replay speaks the readback again", () => {
    renderReadback();
    fireEvent.click(button("Replay"));
    expect(spoken()).toEqual([READBACK, READBACK]);
  });

  test("with no medication name heard, it asks again and offers no confirmation", () => {
    renderReadback(request({ medication: null }));
    expect(spoken()).toEqual(["I couldn't make out a medication name. Please say it again."]);
    expect(screen.queryByRole("button", { name: "Yes, that's right" })).toBeNull();
    expect(button("Say it again")).toBeTruthy();
  });

  test("unmounting (a new recording) stops the speech", () => {
    const { view } = renderReadback();
    synth.cancel.mockClear();
    view.unmount();
    expect(synth.cancel).toHaveBeenCalledOnce();
  });
});
