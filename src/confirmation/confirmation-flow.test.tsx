// Runs under Vitest because the flow imports app modules; it needs no DOM.
import { describe, expect, test, vi } from "vitest";
import type { MedicationRequest } from "../../shared/medication-request";
import { createPharmacyRequestStore } from "../requests/pharmacy-requests";
import {
  ConfirmationFlow,
  MAX_UNCLEAR_REPLIES,
  PROMPTS,
  type ConfirmationDeps,
} from "./confirmation-flow";

const TRANSCRIPT = "I need amoxicillin five hundred milligrams, ten tablets.";
const READBACK = "I heard: amoxicillin, 500 milligrams, 10 tablets. Is that correct?";
const NOW = new Date("2026-09-30T10:42:00.000Z");

const request = (overrides: Partial<MedicationRequest> = {}): MedicationRequest => ({
  medication: "amoxicillin",
  strength: "500 mg",
  quantity: "10 tablets",
  form: null,
  ...overrides,
});
const EMPTY: MedicationRequest = { medication: null, strength: null, quantity: null, form: null };

interface Pending<T> {
  resolve(value: T): void;
  reject(error: unknown): void;
  signal: AbortSignal;
}

/** Fake speech, listening and extraction that the test drives step by step. */
function setup(initial: MedicationRequest = request()) {
  const spoken: string[] = [];
  let endSpeech: (() => void) | null = null;
  const speechEnds: (() => void)[] = [];
  const listens: (Pending<string> & { onHeard(text: string): void })[] = [];
  const extractions: (Pending<MedicationRequest> & { transcript: string })[] = [];
  const store = createPharmacyRequestStore(null);
  let ids = 0;

  const deps: ConfirmationDeps = {
    speak(text, onEnd) {
      spoken.push(text);
      endSpeech = onEnd;
      speechEnds.push(onEnd);
      return () => {
        endSpeech = null;
      };
    },
    listen: (signal, onHeard) =>
      new Promise((resolve, reject) => listens.push({ resolve, reject, signal, onHeard })),
    extract: (transcript, signal) =>
      new Promise((resolve, reject) => extractions.push({ resolve, reject, signal, transcript })),
    store,
    now: () => NOW,
    newId: () => `request-${++ids}`,
  };
  const flow = new ConfirmationFlow(initial, TRANSCRIPT, deps);
  const detach = flow.attach();

  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
  const finishSpeaking = () => {
    const end = endSpeech;
    endSpeech = null;
    end?.();
  };
  return {
    flow,
    detach,
    store,
    spoken,
    speechEnds,
    listens,
    extractions,
    state: () => flow.getState(),
    finishSpeaking,
    /** MEDCLE finishes speaking, then the customer answers. */
    async answer(reply: string) {
      finishSpeaking();
      expect(flow.getState().phase).toBe("listening");
      listens.at(-1)!.resolve(reply);
      await settle();
    },
    async extracted(correction: Partial<MedicationRequest>) {
      extractions.at(-1)!.resolve({ ...EMPTY, ...correction });
      await settle();
    },
  };
}

describe("reading back and listening", () => {
  test("reads the request back, and listens only after it has finished speaking", () => {
    const { state, spoken, listens, finishSpeaking } = setup();
    expect(spoken).toEqual([READBACK]);
    expect(state().phase).toBe("speaking");
    expect(listens).toHaveLength(0);

    finishSpeaking();
    expect(state().phase).toBe("listening");
    expect(listens).toHaveLength(1);
  });

  test("shows what the customer is saying while they say it", () => {
    const { state, listens, finishSpeaking } = setup();
    finishSpeaking();
    listens[0]!.onHeard("Yes");
    expect(state().reply).toBe("Yes");
  });

  test("with no medication name, asks to say it again and neither listens nor confirms", () => {
    const { flow, state, spoken, listens, store, finishSpeaking } = setup(EMPTY);
    expect(state().phase).toBe("unheard");
    expect(spoken).toEqual(["I couldn't make out a medication name. Please say it again."]);
    finishSpeaking();
    flow.confirm();
    expect(listens).toHaveLength(0);
    expect(store.list()).toHaveLength(0);
  });

  test("an incomplete request is read back with only what was heard", () => {
    const { spoken } = setup(request({ strength: null, quantity: null }));
    expect(spoken).toEqual(["I heard: amoxicillin. Is that correct?"]);
  });
});

describe("voice confirmation", () => {
  test.each(["Yes", "Yeah.", "Yep", "That's correct.", "That's right", "Exactly."])(
    "“%s” confirms automatically",
    async (reply) => {
      const { state, store, spoken, answer } = setup();
      await answer(reply);
      expect(state().phase).toBe("confirmed");
      expect(store.list()).toHaveLength(1);
      expect(spoken.at(-1)).toBe(PROMPTS.confirmed);
    },
  );

  test("the confirmed request holds exactly what was read back, the transcript and the time", async () => {
    const { state, store, answer } = setup();
    await answer("Yes.");
    const expected = {
      id: "request-1",
      medication: "amoxicillin",
      strength: "500 mg",
      quantity: "10 tablets",
      form: null,
      status: "new",
      createdAt: NOW.toISOString(),
      confirmedAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      confirmedBy: "voice",
      confirmationReply: "Yes.",
      originalTranscript: TRANSCRIPT,
      corrections: [],
    };
    expect(store.list()).toEqual([expected]);
    expect(state().confirmed).toEqual(expected);
  });

  test("“No” is not a confirmation: MEDCLE asks what to change", async () => {
    const { state, store, spoken, answer } = setup();
    await answer("No.");
    expect(state().phase).toBe("speaking");
    expect(state().awaiting).toBe("correction");
    expect(spoken.at(-1)).toBe(PROMPTS.whatToChange);
    expect(store.list()).toHaveLength(0);
  });

  test("“No” then the change: updates only that field and asks again", async () => {
    const { state, store, spoken, extractions, answer, extracted } = setup();
    await answer("No.");
    await answer("20 tablets.");
    expect(extractions.at(-1)?.transcript).toBe("20 tablets.");
    await extracted({ quantity: "20 tablets" });

    expect(spoken.at(-1)).toBe("I heard: amoxicillin, 500 milligrams, 20 tablets. Is that correct?");
    expect(store.list()).toHaveLength(0);

    await answer("Yes");
    expect(store.list()[0]).toMatchObject({
      medication: "amoxicillin",
      strength: "500 mg",
      quantity: "20 tablets",
      corrections: ["20 tablets."],
    });
    expect(state().phase).toBe("confirmed");
  });

  test("“No, I said 20 tablets” re-extracts, reads back the update, and confirms only after a yes", async () => {
    const { state, store, spoken, extractions, answer, extracted } = setup();
    await answer("No, I said 20 tablets.");
    expect(state().phase).toBe("updating");
    expect(extractions.at(-1)?.transcript).toBe("No, I said 20 tablets.");

    await extracted({ quantity: "20 tablets", form: "tablet" });
    expect(state().request).toEqual(request({ quantity: "20 tablets", form: "tablet" }));
    expect(state().corrected).toEqual(["quantity", "form"]);
    expect(spoken.at(-1)).toBe("I heard: amoxicillin, 500 milligrams, 20 tablets. Is that correct?");
    expect(state().phase).toBe("speaking");
    expect(store.list()).toHaveLength(0);

    await answer("Yes.");
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0]).toMatchObject({
      quantity: "20 tablets",
      strength: "500 mg",
      originalTranscript: TRANSCRIPT,
      corrections: ["No, I said 20 tablets."],
    });
  });

  test.each(["I think so.", "Hmm.", "Probably.", "Maybe", "It's for my mother."])(
    "“%s” is ambiguous: MEDCLE asks again and does not confirm",
    async (reply) => {
      const { state, store, spoken, answer } = setup();
      await answer(reply);
      expect(spoken.at(-1)).toBe(PROMPTS.askAgain);
      expect(state().awaiting).toBe("confirmation");
      expect(store.list()).toHaveLength(0);

      await answer("Yes");
      expect(store.list()).toHaveLength(1);
    },
  );

  test("no answer: MEDCLE says it didn't catch the confirmation and listens again", async () => {
    const { state, store, spoken, listens, answer } = setup();
    await answer("");
    expect(spoken.at(-1)).toBe(PROMPTS.notCaught);
    expect(store.list()).toHaveLength(0);
    await answer("Yes");
    expect(listens).toHaveLength(2);
    expect(state().phase).toBe("confirmed");
  });

  test("after repeated unclear answers it stops asking; the buttons and replay still work", async () => {
    const { flow, state, store, spoken, answer } = setup();
    for (let i = 1; i < MAX_UNCLEAR_REPLIES; i++) await answer("");
    await answer("Hmm.");
    expect(state().phase).toBe("paused");
    expect(state().notice).toBeTruthy();

    flow.replay();
    expect(state().phase).toBe("speaking");
    expect(spoken.at(-1)).toBe(READBACK);

    flow.confirm();
    expect(state().phase).toBe("confirmed");
    expect(store.list()[0]?.confirmedBy).toBe("button");
  });

  test("a correction that states no details asks what to change", async () => {
    const { state, spoken, answer, extracted } = setup();
    await answer("No, the other one.");
    await extracted({});
    expect(spoken.at(-1)).toBe(PROMPTS.changeNotCaught);
    expect(state().awaiting).toBe("correction");
    expect(state().request).toEqual(request());
  });

  test("a failed correction pauses without changing the request", async () => {
    const { state, store, extractions, answer } = setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    await answer("No, 20 tablets.");
    extractions[0]!.reject(new Error("HTTP 502"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(state().phase).toBe("paused");
    expect(state().request).toEqual(request());
    expect(store.list()).toHaveLength(0);
    vi.restoreAllMocks();
  });

  test("a listening failure pauses with its message", async () => {
    const { state, listens, finishSpeaking } = setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    finishSpeaking();
    listens[0]!.reject(new Error("Microphone access was blocked."));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(state()).toMatchObject({ phase: "paused", notice: "Microphone access was blocked." });
    vi.restoreAllMocks();
  });

  test("Replay while listening stops listening, reads it back again, then listens", async () => {
    const { flow, spoken, listens, finishSpeaking, state } = setup();
    finishSpeaking();
    flow.replay();
    expect(listens[0]!.signal.aborted).toBe(true);
    expect(spoken).toEqual([READBACK, READBACK]);
    finishSpeaking();
    expect(state().phase).toBe("listening");
    expect(listens).toHaveLength(2);
  });
});

describe("creating the pharmacy request", () => {
  test("the Confirm button creates it without voice", () => {
    const { flow, store, state } = setup();
    flow.confirm();
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0]).toMatchObject({ confirmedBy: "button", confirmationReply: null });
    expect(state().phase).toBe("confirmed");
  });

  test("confirming twice creates it once", async () => {
    const { flow, store, answer } = setup();
    await answer("Yes");
    flow.confirm();
    flow.confirm();
    expect(store.list()).toHaveLength(1);
  });

  test("an unconfirmed request creates nothing", async () => {
    const { store, answer } = setup();
    await answer("No.");
    await answer("");
    expect(store.list()).toHaveLength(0);
  });

  test("the button can't confirm while a correction is being applied", async () => {
    const { flow, store, state, answer } = setup();
    await answer("No, 20 tablets.");
    flow.confirm();
    expect(state().phase).toBe("updating");
    expect(store.list()).toHaveLength(0);
  });

  test("a stale yes after the flow is replaced (a new recording) confirms nothing", async () => {
    const { detach, store, listens, finishSpeaking, state } = setup();
    finishSpeaking();
    detach();
    expect(listens[0]!.signal.aborted).toBe(true);
    listens[0]!.resolve("Yes");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.list()).toHaveLength(0);
    expect(state().phase).toBe("listening");
  });

  test("a stale correction result after the flow is replaced changes nothing", async () => {
    const { detach, store, extractions, answer, state } = setup();
    await answer("No, 20 tablets.");
    detach();
    extractions[0]!.resolve({ ...EMPTY, quantity: "20 tablets" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(state().request).toEqual(request());
    expect(store.list()).toHaveLength(0);
  });

  test("speech ending after detaching does not start listening", () => {
    const { detach, listens, speechEnds } = setup();
    detach();
    speechEnds[0]!(); // A browser may still report the end of the cancelled speech.
    expect(listens).toHaveLength(0);
  });
});
