import { afterEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SiteFooter } from "./SiteFooter";
import { TopBar } from "./TopBar";

const LINKS = [
  { href: "#problem", label: "The problem" },
  { href: "#how-it-works", label: "How it works" },
];

afterEach(cleanup);

describe("top bar menu", () => {
  test("shows the section links, with a closed Menu button for small screens", () => {
    render(<TopBar links={LINKS} actions={<a href="/app">Launch MEDCLE</a>} />);
    expect(screen.getAllByRole("link", { name: "The problem" })).toHaveLength(1);
    const menuButton = screen.getByRole("button", { name: "Open menu" });
    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById("topbar-menu")).toBeNull();
  });

  test("the Menu button opens a dropdown with the links and actions", () => {
    render(<TopBar links={LINKS} actions={<a href="/app">Launch MEDCLE</a>} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    const menu = document.getElementById("topbar-menu")!;
    expect(menu).toBeTruthy();
    expect(menu.textContent).toContain("How it works");
    expect(menu.textContent).toContain("Launch MEDCLE");
    expect(screen.getByRole("button", { name: "Close menu" }).getAttribute("aria-expanded")).toBe(
      "true",
    );
  });

  test("choosing a link or pressing Escape closes the menu", () => {
    render(<TopBar links={LINKS} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(document.querySelector("#topbar-menu a")!);
    expect(document.getElementById("topbar-menu")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.getElementById("topbar-menu")).toBeNull();
  });

  test("without links there is no menu button", () => {
    render(<TopBar actions={<a href="/">About MEDCLE</a>} />);
    expect(screen.queryByRole("button", { name: "Open menu" })).toBeNull();
    expect(screen.getByRole("link", { name: "About MEDCLE" })).toBeTruthy();
  });
});

describe("site footer", () => {
  test("has the disclaimer, the section links and Launch", () => {
    render(<SiteFooter />);
    const footer = screen.getByRole("contentinfo");
    expect(footer.textContent).toContain("does not prescribe, diagnose or recommend medication");
    expect(screen.getByRole("link", { name: "How it works" }).getAttribute("href")).toBe(
      "/#how-it-works",
    );
    expect(screen.getByRole("link", { name: "Launch MEDCLE" }).getAttribute("href")).toBe("/app");
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} MEDCLE`);
  });
});
