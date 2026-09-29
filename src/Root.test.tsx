import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Root } from "./Root";

const landingHeading = () =>
  screen.queryByRole("heading", { level: 1, name: "Medication names aren't always easy to say." });
const appHeading = () => screen.queryByRole("heading", { level: 1, name: "Listen and read back." });

beforeEach(() => {
  window.scrollTo = vi.fn();
  window.history.replaceState(null, "", "/");
});
afterEach(cleanup);

describe("routes", () => {
  test("/ shows the landing page, without recording controls", () => {
    render(<Root />);
    expect(landingHeading()).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Start Recording" })).toBeNull();
    expect(document.title).toBe("MEDCLE · Clearer medication requests");
  });

  test("/app shows the counter tool", () => {
    window.history.replaceState(null, "", "/app");
    render(<Root />);
    expect(appHeading()).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Start Recording" })).toHaveLength(1);
    expect(document.title).toBe("Counter session · MEDCLE");
  });

  test("Launch MEDCLE opens /app, and Back returns to the landing page", () => {
    render(<Root />);
    const launch = screen.getAllByRole("link", { name: "Launch MEDCLE" });
    expect(launch.length).toBeGreaterThanOrEqual(2);
    expect(launch.every((link) => link.getAttribute("href") === "/app")).toBe(true);

    fireEvent.click(launch[0]!);
    expect(window.location.pathname).toBe("/app");
    expect(appHeading()).toBeTruthy();

    act(() => {
      window.history.back();
    });
    return vi.waitFor(() => expect(landingHeading()).toBeTruthy());
  });

  test("the logo in the app links back home", () => {
    window.history.replaceState(null, "", "/app");
    render(<Root />);
    fireEvent.click(screen.getByRole("link", { name: "MEDCLE home" }));
    expect(window.location.pathname).toBe("/");
    expect(landingHeading()).toBeTruthy();
  });
});
