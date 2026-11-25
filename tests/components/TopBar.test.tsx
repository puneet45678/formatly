import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "@/components/TopBar";
import { FORMATS } from "@/formats/registry";

describe("TopBar", () => {
  it("shows the product name", () => {
    render(<TopBar />);
    expect(screen.getByText("formatly")).toBeInTheDocument();
  });

  it("has a logo mark with braces, hidden from screen readers", () => {
    render(<TopBar />);
    const mark = screen.getByText("{ }");
    expect(mark).toHaveAttribute("aria-hidden", "true");
  });

  it("uses a round icon button with a name pill for Shortcuts", () => {
    render(<TopBar />);
    const button = screen.getByRole("button", { name: "Shortcuts" });
    expect(button.querySelector("svg")).not.toBeNull();
    const pill = button.querySelector("[data-pill]")!;
    expect(pill).toHaveTextContent("Shortcuts");
    expect(pill).toHaveAttribute("aria-hidden", "true");
  });

  it("has a typewriter tagline that screen readers hear as one sentence", () => {
    render(<TopBar />);
    const tagline = screen.getByTestId("tagline");
    expect(tagline).toHaveTextContent("format your");
    expect(tagline.querySelector('[aria-hidden="true"]')).not.toBeNull();
    const labels = FORMATS.map((f) => f.label);
    const sentence = `Formats ${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
    expect(screen.getByText(sentence)).toHaveClass("sr-only");
  });

  it("hides the tagline on narrow screens", () => {
    render(<TopBar />);
    expect(screen.getByTestId("tagline")).toHaveClass("hidden", "sm:flex");
  });

  it("opens the shortcuts with the ? key", () => {
    render(<TopBar />);
    fireEvent.keyDown(document.body, { key: "?" });
    expect(screen.getByText("Copy output")).toBeVisible();
  });

  it("does not hijack ? while typing", () => {
    render(
      <>
        <TopBar />
        <input aria-label="field" />
        <div contentEditable aria-label="editor" />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText("field"), { key: "?" });
    fireEvent.keyDown(screen.getByLabelText("editor"), { key: "?" });
    expect(screen.queryByText("Copy output")).not.toBeVisible();
  });

  it("lists the ? shortcut", async () => {
    render(<TopBar />);
    await userEvent.click(screen.getByRole("button", { name: "Shortcuts" }));
    expect(screen.getByText("Show keyboard shortcuts")).toBeVisible();
  });

  it("opens the shortcuts dialog", async () => {
    render(<TopBar />);
    expect(screen.queryByText("Copy output")).not.toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Shortcuts" }));
    expect(screen.getByText("Copy output")).toBeVisible();
    expect(screen.getByText(/Shift \+ C/)).toBeVisible();
  });

  it("explains how to leave the editor with the keyboard", async () => {
    render(<TopBar />);
    await userEvent.click(screen.getByRole("button", { name: "Shortcuts" }));
    expect(screen.getByText("Leave the editor")).toBeVisible();
    expect(screen.getByText("Esc, then Tab")).toBeVisible();
  });

  it("lists the format menu shortcut", async () => {
    render(<TopBar />);
    await userEvent.click(screen.getByRole("button", { name: "Shortcuts" }));
    expect(screen.getByText("Collapse or expand the format menu")).toBeVisible();
    expect(screen.getByText("⌘/Ctrl + \\")).toBeVisible();
  });

  it("is see-through so the background grid shows", () => {
    render(<TopBar />);
    const bar = screen.getByRole("banner");
    expect(bar.className).not.toMatch(/\bbg-/);
    expect(bar.className).not.toMatch(/backdrop-blur/);
  });

  it("closes the shortcuts dialog", async () => {
    render(<TopBar />);
    await userEvent.click(screen.getByRole("button", { name: "Shortcuts" }));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Copy output")).not.toBeVisible();
  });

  it("hides GitHub link when no URL is configured", () => {
    render(<TopBar />);
    expect(screen.queryByRole("link", { name: "GitHub" })).toBeNull();
  });
});
