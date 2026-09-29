import { afterEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { App } from "./App";

const heading = (name: string) => screen.queryByRole("heading", { level: 2, name });
const button = (name: string) => screen.queryByRole("button", { name });

afterEach(cleanup);

describe("optional pharmacist read-back", () => {
  test("by default only the customer records; no comparison is shown", () => {
    render(<App />);
    expect(heading("Customer")).toBeTruthy();
    expect(heading("Pharmacist")).toBeNull();
    expect(heading("Request comparison")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Start Recording" })).toHaveLength(1);
    expect(button("Add pharmacist read-back")).toBeTruthy();
  });

  test("adding the read-back shows the pharmacist panel and the comparison", () => {
    render(<App />);
    fireEvent.click(button("Add pharmacist read-back")!);

    expect(heading("Pharmacist")).toBeTruthy();
    expect(heading("Request comparison")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Start Recording" })).toHaveLength(2);
    expect(button("Add pharmacist read-back")).toBeNull();
  });

  test("Hide removes the pharmacist panel and the comparison again", () => {
    render(<App />);
    fireEvent.click(button("Add pharmacist read-back")!);
    fireEvent.click(button("Hide")!);

    expect(heading("Pharmacist")).toBeNull();
    expect(heading("Request comparison")).toBeNull();
    expect(button("Add pharmacist read-back")).toBeTruthy();
  });

  test("the customer panel has no Hide button", () => {
    render(<App />);
    fireEvent.click(button("Add pharmacist read-back")!);
    expect(screen.getAllByRole("button", { name: "Hide" })).toHaveLength(1);
  });
});
