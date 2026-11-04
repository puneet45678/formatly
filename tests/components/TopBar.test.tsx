import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "@/components/TopBar";

describe("TopBar", () => {
  it("shows the product name", () => {
    render(<TopBar />);
    expect(screen.getByText("formatly")).toBeInTheDocument();
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
