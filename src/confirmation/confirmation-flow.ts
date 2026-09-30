import type { MedicationRequest } from "../../shared/medication-request";
import type { MedicationField } from "../comparison/compare-medication-requests";
import type { PharmacyRequest, PharmacyRequestStore } from "../requests/pharmacy-requests";
import { readbackText } from "../voice/warning-text";
import { applyCorrection } from "./apply-correction";
import { classifyReply } from "./confirmation-reply";

export type ConfirmationPhase =
  /** MEDCLE is speaking; it listens once it has finished. */
  | "speaking"
  /** Listening for the customer's answer. */
  | "listening"
  /** Extracting the details from the customer's correction. */
  | "updating"
  /** Voice confirmation stopped (e.g. no answer); the buttons still work. */
  | "paused"
  /** No medication name was heard: the customer needs to say it again. */
  | "unheard"
  /** The customer confirmed and the pharmacy request was created. */
  | "confirmed";

export interface ConfirmationState {
  phase: ConfirmationPhase;
  /** The request as MEDCLE last read it back: the only thing a "yes" confirms. */
  request: MedicationRequest;
  /** Fields the customer's corrections changed. */
  corrected: MedicationField[];
  /** What MEDCLE is saying, or last said. */
  prompt: string;
  /** Whether MEDCLE is waiting for a yes/no or for what to change. */
  awaiting: "confirmation" | "correction";
  /** What the customer is saying, or last said, in reply. */
  reply: string;
  /** Why voice confirmation paused. */
  notice: string | null;
  /** The pharmacy request, once confirmed. */
  confirmed: PharmacyRequest | null;
}

/** Everything the flow does outside itself, so tests can replace it. */
export interface ConfirmationDeps {
  /** Speaks `text`, calling `onEnd` when finished; returns a function that stops it. */
  speak(text: string, onEnd: () => void): () => void;
  /** Records one reply; resolves "" if nothing was said. */
  listen(signal: AbortSignal, onHeard: (text: string) => void): Promise<string>;
  extract(transcript: string, signal: AbortSignal): Promise<MedicationRequest>;
  store: Pick<PharmacyRequestStore, "add">;
  now(): Date;
  newId(): string;
}

export const PROMPTS = {
  askAgain: "I want to make sure I have it right. Is that correct?",
  notCaught: "I didn't catch your confirmation. Is the request correct?",
  whatToChange: "Okay. What would you like to change?",
  changeNotCaught: "I didn't catch the change. What would you like to change?",
  confirmed: "Thank you. Your request has been sent to the pharmacy.",
} as const;

/** Unclear or missing answers in a row before MEDCLE stops asking by voice. */
export const MAX_UNCLEAR_REPLIES = 3;

/**
 * One customer request's voice confirmation: MEDCLE reads the request back,
 * listens for the answer, and either confirms it, asks again, or applies the
 * customer's correction and reads the new request back.
 *
 * The pharmacy request is created only when the customer confirms the request
 * that was just read back, by voice or with confirm(), and only once. A new
 * recording makes a new flow; the old one is detached, so nothing it was
 * still doing (speaking, listening, extracting) can confirm anything.
 */
export class ConfirmationFlow {
  private state: ConfirmationState;
  private readonly transcript: string;
  private readonly deps: ConfirmationDeps;
  private readonly listeners = new Set<() => void>();
  private readonly corrections: string[] = [];
  private pendingCorrection = "";
  private unclearReplies = 0;
  private attached = false;
  /** Identifies the current phase's work; callbacks from older work are ignored. */
  private run = 0;
  private cancelRun: (() => void) | null = null;

  constructor(request: MedicationRequest, transcript: string, deps: ConfirmationDeps) {
    this.transcript = transcript;
    this.deps = deps;
    this.state = {
      phase: request.medication ? "speaking" : "unheard",
      request,
      corrected: [],
      prompt: readbackText(request),
      awaiting: "confirmation",
      reply: "",
      notice: null,
      confirmed: null,
    };
  }

  getState = (): ConfirmationState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Starts (or resumes) the conversation; the returned function stops it. */
  attach = (): (() => void) => {
    this.attached = true;
    this.startPhase();
    return () => {
      this.attached = false;
      this.cancelPhase();
    };
  };

  /** The Confirm button: confirms the request currently read back. */
  confirm = (): void => {
    const { phase, request } = this.state;
    const confirmable = phase === "speaking" || phase === "listening" || phase === "paused";
    if (confirmable && request.medication) this.finish("button", null);
  };

  /** Reads the current request back again and listens for the answer. */
  replay = (): void => {
    const { phase } = this.state;
    if (phase !== "speaking" && phase !== "listening" && phase !== "paused") return;
    this.unclearReplies = 0;
    this.go({
      phase: "speaking",
      prompt: readbackText(this.state.request),
      awaiting: "confirmation",
      reply: "",
      notice: null,
    });
  };

  private set(patch: Partial<ConfirmationState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  /** Moves to a new step of the conversation and starts its work. */
  private go(patch: Partial<ConfirmationState>): void {
    this.cancelPhase();
    this.set(patch);
    if (this.attached) this.startPhase();
  }

  private cancelPhase(): void {
    this.run++;
    this.cancelRun?.();
    this.cancelRun = null;
  }

  private startPhase(): void {
    this.cancelPhase();
    const run = this.run;
    const current = () => this.attached && this.run === run;
    const { phase, prompt } = this.state;

    if (phase === "speaking") {
      // Listen only after MEDCLE has finished speaking.
      this.cancelRun = this.deps.speak(prompt, () => {
        if (current()) this.go({ phase: "listening", reply: "" });
      });
    } else if (phase === "unheard" || phase === "confirmed") {
      this.cancelRun = this.deps.speak(prompt, () => {});
    } else if (phase === "listening") {
      const controller = new AbortController();
      this.cancelRun = () => controller.abort();
      this.deps
        .listen(controller.signal, (text) => {
          if (current()) this.set({ reply: text });
        })
        .then(
          (reply) => {
            if (current()) this.handleReply(reply.trim());
          },
          (error: unknown) => {
            if (!current()) return;
            console.error("[MEDCLE] Listening for the confirmation failed:", error);
            const message = error instanceof Error ? error.message : "";
            this.go({ phase: "paused", notice: message || "Couldn't listen for your answer." });
          },
        );
    } else if (phase === "updating") {
      const controller = new AbortController();
      this.cancelRun = () => controller.abort();
      this.deps.extract(this.pendingCorrection, controller.signal).then(
        (correction) => {
          if (current()) this.handleCorrection(correction);
        },
        (error: unknown) => {
          if (!current()) return;
          console.error("[MEDCLE] Extracting the correction failed:", error);
          this.go({
            phase: "paused",
            notice: "Couldn't process the change. The request below has not been changed.",
          });
        },
      );
    }
  }

  private handleReply(reply: string): void {
    this.set({ reply });
    const kind = classifyReply(reply);

    if (this.state.awaiting === "correction") {
      // Waiting for what to change: anything with details is the correction.
      if (kind === "empty") return this.askAgain(PROMPTS.changeNotCaught, "I didn't catch the change.");
      if (kind === "affirmative" || kind === "negative") {
        return this.askAgain(PROMPTS.whatToChange, "I didn't catch what to change.");
      }
      return this.update(reply);
    }

    switch (kind) {
      case "affirmative":
        return this.finish("voice", reply);
      case "negative":
        this.unclearReplies = 0;
        return this.go({ phase: "speaking", prompt: PROMPTS.whatToChange, awaiting: "correction" });
      case "correction":
        return this.update(reply);
      case "ambiguous":
        return this.askAgain(PROMPTS.askAgain, "I couldn't tell whether the request is correct.");
      case "empty":
        return this.askAgain(PROMPTS.notCaught, "I didn't catch your confirmation.");
    }
  }

  /** Asks again, or pauses voice confirmation after too many unclear answers. */
  private askAgain(prompt: string, notice: string): void {
    this.unclearReplies++;
    if (this.unclearReplies >= MAX_UNCLEAR_REPLIES) this.go({ phase: "paused", notice });
    else this.go({ phase: "speaking", prompt });
  }

  private update(correction: string): void {
    this.pendingCorrection = correction;
    this.go({ phase: "updating" });
  }

  private handleCorrection(correction: MedicationRequest): void {
    const result = applyCorrection(this.state.request, correction);
    if (!result) {
      this.state = { ...this.state, awaiting: "correction" };
      return this.askAgain(PROMPTS.changeNotCaught, "I didn't catch the change.");
    }
    this.corrections.push(this.pendingCorrection);
    this.unclearReplies = 0;
    const corrected = [...new Set([...this.state.corrected, ...result.changed])];
    // The corrected request must be read back and confirmed again.
    this.go({
      phase: "speaking",
      request: result.request,
      corrected,
      prompt: readbackText(result.request),
      awaiting: "confirmation",
    });
  }

  private finish(confirmedBy: PharmacyRequest["confirmedBy"], reply: string | null): void {
    if (this.state.confirmed) return;
    const now = this.deps.now().toISOString();
    const request: PharmacyRequest = {
      ...this.state.request,
      id: this.deps.newId(),
      status: "new",
      createdAt: now,
      confirmedAt: now,
      updatedAt: now,
      confirmedBy,
      confirmationReply: reply,
      originalTranscript: this.transcript,
      corrections: [...this.corrections],
    };
    this.deps.store.add(request);
    this.go({ phase: "confirmed", confirmed: request, prompt: PROMPTS.confirmed, notice: null });
  }
}
