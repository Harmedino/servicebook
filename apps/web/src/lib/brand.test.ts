import { describe, expect, it } from "vitest";
import { BRAND_PRESETS, brandSolid, brandStyle, inkOn } from "./brand";

describe("brand colours", () => {
  it("picks dark ink on light colours and white ink on dark ones", () => {
    expect(inkOn("#ffffff")).toBe("#0c1a14");
    expect(inkOn("#ffd84d")).toBe("#0c1a14");
    expect(inkOn("#000000")).toBe("#ffffff");
    expect(inkOn("#1f6f5c")).toBe("#ffffff");
  });

  it("offers presets that are all valid, dark colours", () => {
    for (const preset of BRAND_PRESETS) {
      expect(preset).toMatch(/^#[0-9a-f]{6}$/);
      expect(inkOn(preset)).toBe("#ffffff");
    }
  });

  it("sets the accent variables only when the business picked a colour", () => {
    expect(brandStyle(undefined)).toBeUndefined();
    expect(brandStyle("")).toBeUndefined();
    expect(brandStyle("#ffd84d")).toEqual({ "--accent": "#ffd84d", "--accent-ink": "#0c1a14" });
  });

  it("falls back to the default look without a colour", () => {
    expect(brandSolid("#1f6f5c")).toBe("bg-[var(--accent)] text-[var(--accent-ink)]");
    expect(brandSolid(undefined)).toBe("bg-ink text-white dark:bg-highlight dark:text-ink");
    expect(brandSolid(undefined, "bg-stone-900")).toBe("bg-stone-900");
  });
});
