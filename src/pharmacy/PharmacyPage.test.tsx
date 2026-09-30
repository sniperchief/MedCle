import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ConfirmationFlow } from "../confirmation/confirmation-flow";
import { STORAGE_KEY, type PharmacyRequest } from "../requests/pharmacy-requests";
import { pharmacyRequests } from "../requests/usePharmacyRequests";
import { formatTime } from "./format";
import { PharmacyPage } from "./PharmacyPage";

const pharmacyRequest = (overrides: Partial<PharmacyRequest> = {}): PharmacyRequest => ({
  id: "amoxicillin-1",
  medication: "amoxicillin",
  strength: "500 mg",
  quantity: "10 tablets",
  form: null,
  status: "new",
  createdAt: "2026-09-30T10:42:00.000Z",
  confirmedAt: "2026-09-30T10:42:00.000Z",
  updatedAt: "2026-09-30T10:42:00.000Z",
  confirmedBy: "voice",
  confirmationReply: "Yes.",
  originalTranscript: "I need amoxicillin five hundred milligrams, ten tablets.",
  corrections: [],
  ...overrides,
});
const paracetamol = pharmacyRequest({
  id: "paracetamol-1",
  medication: "paracetamol",
  quantity: "20 tablets",
  confirmedAt: "2026-09-30T10:38:00.000Z",
  createdAt: "2026-09-30T10:38:00.000Z",
  originalTranscript: "Paracetamol 500 milligrams, twenty tablets please.",
});

const group = (name: RegExp) => screen.getByRole("region", { name });
const card = (name: RegExp) => screen.getByRole("button", { name });

beforeEach(() => {
  window.localStorage.clear();
  window.scrollTo = vi.fn();
});
afterEach(cleanup);

describe("pharmacy queue", () => {
  test("says so when there are no requests", () => {
    render(<PharmacyPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Pharmacy requests" })).toBeTruthy();
    expect(screen.getByText(/No new requests/)).toBeTruthy();
  });

  test("lists confirmed requests, newest first, with details and time", () => {
    pharmacyRequests.add(paracetamol);
    pharmacyRequests.add(pharmacyRequest());
    render(<PharmacyPage />);

    const cards = within(group(/New/)).getAllByRole("button");
    expect(cards.map((button) => button.querySelector(".request-card__medication")?.textContent)).toEqual([
      "amoxicillin",
      "paracetamol",
    ]);
    expect(cards[0]!.textContent).toContain("500 mg · 10 tablets");
    expect(cards[0]!.textContent).toContain("Confirmed by customer");
    expect(cards[0]!.querySelector("time")?.getAttribute("dateTime")).toBe("2026-09-30T10:42:00.000Z");
    expect(cards[0]!.textContent).toContain(formatTime("2026-09-30T10:42:00.000Z"));
  });

  test("a request confirmed by voice appears in the queue", async () => {
    render(<PharmacyPage />);
    let endSpeech = () => {};
    let answer: (reply: string) => void = () => {};
    const flow = new ConfirmationFlow(
      { medication: "amoxicillin", strength: "500 mg", quantity: "10 tablets", form: null },
      "I need amoxicillin five hundred milligrams, ten tablets.",
      {
        speak: (_text, onEnd) => ((endSpeech = onEnd), () => {}),
        listen: () => new Promise((resolve) => (answer = resolve)),
        extract: () => new Promise(() => {}),
        store: pharmacyRequests,
        now: () => new Date("2026-09-30T10:42:00.000Z"),
        newId: () => "voice-1",
      },
    );
    flow.attach();
    endSpeech();
    await act(async () => answer("Yes."));

    expect(card(/amoxicillin/)).toBeTruthy();
    expect(pharmacyRequests.list()).toHaveLength(1);
  });

  test("shows requests confirmed in another tab", () => {
    render(<PharmacyPage />);
    act(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([pharmacyRequest()]));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    });
    expect(card(/amoxicillin/)).toBeTruthy();
  });
});

describe("request detail", () => {
  test("shows the structured request next to the customer's own words", () => {
    pharmacyRequests.add(
      pharmacyRequest({ quantity: "20 tablets", corrections: ["No, I said 20 tablets."] }),
    );
    render(<PharmacyPage />);
    fireEvent.click(card(/amoxicillin/));

    const detail = screen.getByRole("region", { name: "amoxicillin" });
    expect(within(detail).getByText("Confirmed medication request")).toBeTruthy();
    const field = (label: string) =>
      within(detail).getByText(label, { selector: "dt" }).nextElementSibling?.textContent;
    expect(field("Medication")).toBe("amoxicillin");
    expect(field("Strength")).toBe("500 mg");
    expect(field("Quantity")).toBe("20 tablets");
    expect(field("Form")).toBe("Not specified");
    expect(within(detail).getByText("Confirmed by customer by voice: “Yes.”")).toBeTruthy();

    expect(within(detail).getByText("Original customer request")).toBeTruthy();
    expect(
      within(detail).getByText("“I need amoxicillin five hundred milligrams, ten tablets.”"),
    ).toBeTruthy();
    expect(within(detail).getByText("“No, I said 20 tablets.”")).toBeTruthy();
  });

  test("the pharmacist moves a request from New to Reviewing to Completed", () => {
    pharmacyRequests.add(pharmacyRequest());
    render(<PharmacyPage />);
    fireEvent.click(card(/amoxicillin/));

    const option = (name: string) => screen.getByRole("button", { name });
    expect(option("New").getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(option("Reviewing"));
    expect(option("Reviewing").getAttribute("aria-pressed")).toBe("true");
    expect(pharmacyRequests.list()[0]?.status).toBe("reviewing");

    fireEvent.click(option("Completed"));
    expect(pharmacyRequests.list()[0]?.status).toBe("completed");

    fireEvent.click(screen.getByRole("button", { name: "All requests" }));
    expect(within(group(/Completed/)).getByRole("button", { name: /amoxicillin/ })).toBeTruthy();
    expect(screen.getByText(/No new requests/)).toBeTruthy();
  });
});
