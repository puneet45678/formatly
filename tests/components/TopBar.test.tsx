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
