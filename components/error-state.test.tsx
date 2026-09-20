import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ErrorState } from "@/components/error-state";

describe("ErrorState", () => {
  test("shows the message with an alert role", () => {
    render(<ErrorState message="No connection. Try again." />);
    expect(screen.getByRole("alert").textContent).toContain("No connection");
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("shows the hint and retry action", () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Failed." hint="Check connection." onRetry={onRetry} />);
    expect(screen.getByText("Check connection.")).toBeDefined();
    screen.getByRole("button", { name: "Try again" }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test("disables retry while retrying", () => {
    render(<ErrorState message="Failed." onRetry={() => {}} retrying />);
    const button = screen.getByRole("button", { name: "Retrying…" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});
