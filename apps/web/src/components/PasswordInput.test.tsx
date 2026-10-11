import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PasswordInput } from "./PasswordInput";

describe("PasswordInput", () => {
  it("hides the password until asked, and reports typing", () => {
    const onChange = vi.fn();
    render(<PasswordInput label="Password" value="hunter2" onChange={onChange} />);

    const input = screen.getByDisplayValue("hunter2");
    expect(input).toHaveProperty("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveProperty("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeTruthy();

    fireEvent.change(input, { target: { value: "hunter3" } });
    expect(onChange).toHaveBeenCalledWith("hunter3");
  });
});
