import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { MedicationRequest } from "../../shared/medication-request";
import { PROMPTS, type ConfirmationDeps } from "../confirmation/confirmation-flow";
import { useConfirmationFlow } from "../confirmation/useConfirmationFlow";
import { createPharmacyRequestStore, type PharmacyRequestStore } from "../requests/pharmacy-requests";
import { ReadbackCard } from "./ReadbackCard";

const TRANSCRIPT = "I need amoxicillin five hundred milligrams, ten tablets.";
const READBACK = "I heard: amoxicillin, 500 milligrams, 10 tablets. Is that correct?";

const amoxicillin: MedicationRequest = {
  medication: "amoxicillin",
  strength: "500 mg",
  quantity: "10 tablets",
  form: null,
};
const EMPTY: MedicationRequest = { medication: null, strength: null, quantity: null, form: null };

// Fake voice: the test ends MEDCLE's speech and gives the customer's answers.
let spoken: string[];
let endSpeech: (() => void) | null;
let answerNext: ((reply: string) => void) | null;
let listenSignals: AbortSignal[];
let resolveExtraction: ((request: MedicationRequest) => void) | null;
let store: PharmacyRequestStore;
let deps: ConfirmationDeps;

beforeEach(() => {
  spoken = [];
  endSpeech = answerNext = resolveExtraction = null;
  listenSignals = [];
  store = createPharmacyRequestStore(null);
  deps = {
    speak(text, onEnd) {
      spoken.push(text);
      endSpeech = onEnd;
      return () => {
        endSpeech = null;
      };
    },
    listen: (signal) =>
      new Promise((resolve) => {
        listenSignals.push(signal);
        answerNext = resolve;
      }),
    extract: () => new Promise((resolve) => (resolveExtraction = resolve)),
    store,
    now: () => new Date("2026-09-30T10:42:00.000Z"),
    newId: () => "request-1",
  };
});
afterEach(cleanup);

function Harness({ request, onSayAgain }: { request: MedicationRequest | null; onSayAgain(): void }) {
  const confirmation = useConfirmationFlow(request, request ? TRANSCRIPT : "", deps);
  return confirmation ? (
    <ReadbackCard confirmation={confirmation} onSayAgain={onSayAgain} />
  ) : (
    <p>Recording…</p>
  );
}

function renderCard(request: MedicationRequest | null = amoxicillin) {
  const onSayAgain = vi.fn();
  const view = render(<Harness request={request} onSayAgain={onSayAgain} />);
  return { onSayAgain, rerender: (next: MedicationRequest | null) => view.rerender(<Harness request={next} onSayAgain={onSayAgain} />) };
}

const finishSpeaking = () => act(() => endSpeech?.());
async function answer(reply: string) {
  finishSpeaking();
  await act(async () => answerNext?.(reply));
}
const button = (name: string) => screen.queryByRole("button", { name });
const text = (content: string | RegExp) => screen.queryByText(content);

describe("voice-first readback", () => {
  test("reads the request back, then listens for the confirmation", () => {
    renderCard();
    expect(text(`“${READBACK}”`)).toBeTruthy();
    expect(spoken).toEqual([READBACK]);
    expect(text(/MEDCLE is speaking/)).toBeTruthy();
    expect(listenSignals).toHaveLength(0);

    finishSpeaking();
    expect(text(/Listening for your confirmation/)).toBeTruthy();
    expect(listenSignals).toHaveLength(1);
  });

  test("a spoken yes confirms without any click", async () => {
    renderCard();
    await answer("Yes.");

    expect(screen.getByRole("heading", { name: "Request confirmed" })).toBeTruthy();
    expect(text("Your medication request has been sent to the pharmacy.")).toBeTruthy();
    expect(text("amoxicillin")).toBeTruthy();
    expect(text("500 mg · 10 tablets")).toBeTruthy();
    expect(text("Awaiting pharmacist review")).toBeTruthy();
    expect(text(/approved|available|ready/i)).toBeNull();
    expect(store.list()).toHaveLength(1);
  });

  test("“Yes, that's right” still confirms by touch", () => {
    renderCard();
    fireEvent.click(button("Yes, that's right")!);
    expect(screen.getByRole("heading", { name: "Request confirmed" })).toBeTruthy();
    expect(store.list()[0]?.confirmedBy).toBe("button");
  });

  test("a correction updates the request, marks it, and asks again", async () => {
    renderCard();
    await answer("No, I said 20 tablets.");
    expect(text(/Updating the request/)).toBeTruthy();
    expect(button("Yes, that's right")).toBeNull();

    await act(async () => resolveExtraction?.({ ...EMPTY, quantity: "20 tablets" }));
    const updated = "I heard: amoxicillin, 500 milligrams, 20 tablets. Is that correct?";
    expect(text(`“${updated}”`)).toBeTruthy();
    expect(text("20 tablets")).toBeTruthy();
    expect(text(/Corrected/)).toBeTruthy();
    expect(text("“No, I said 20 tablets.”")).toBeTruthy();
    expect(store.list()).toHaveLength(0);

    await answer("Yes");
    expect(store.list()[0]?.quantity).toBe("20 tablets");
  });

  test("an ambiguous answer is asked again, not confirmed", async () => {
    renderCard();
    await answer("I think so.");
    expect(text(`“${PROMPTS.askAgain}”`)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Request confirmed" })).toBeNull();
    expect(store.list()).toHaveLength(0);
  });

  test("after repeated missed answers it pauses and offers to answer by voice again", async () => {
    renderCard();
    await answer("");
    await answer("");
    await answer("");
    expect(text(/I didn't catch your confirmation\. Answer by voice again/)).toBeTruthy();
    expect(button("Yes, that's right")).toBeTruthy();

    fireEvent.click(button("Answer by voice")!);
    expect(spoken.at(-1)).toBe(READBACK);
  });

  test("with no medication name heard, it asks again and offers no confirmation", () => {
    renderCard(EMPTY);
    expect(spoken).toEqual(["I couldn't make out a medication name. Please say it again."]);
    expect(button("Yes, that's right")).toBeNull();
    expect(button("Say it again")).toBeTruthy();
  });

  test("“Say it again” asks for a new recording", () => {
    const { onSayAgain } = renderCard();
    fireEvent.click(button("Say it again")!);
    expect(onSayAgain).toHaveBeenCalledOnce();
  });
});

describe("a new recording invalidates the confirmation", () => {
  test("recording again stops listening; a late yes confirms nothing", async () => {
    const { rerender } = renderCard();
    finishSpeaking();
    const lateAnswer = answerNext!;

    rerender(null); // The customer starts a new recording.
    expect(listenSignals[0]!.aborted).toBe(true);
    await act(async () => lateAnswer("Yes"));
    expect(store.list()).toHaveLength(0);
  });

  test("a new extraction starts unconfirmed, even after a confirmation", async () => {
    const { rerender } = renderCard();
    await answer("Yes");
    expect(store.list()).toHaveLength(1);

    rerender(null);
    rerender({ ...amoxicillin, quantity: "30 tablets" });
    expect(screen.queryByRole("heading", { name: "Request confirmed" })).toBeNull();
    expect(button("Yes, that's right")).toBeTruthy();
    expect(store.list()).toHaveLength(1);
  });
});
