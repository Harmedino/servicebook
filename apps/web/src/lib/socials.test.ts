import { describe, expect, it } from "vitest";
import { CHANNELS, CHANNEL_BY_ID, activeChannels, whatsappNumberFor } from "./socials";

describe("social channels", () => {
  it("lists the channels in display order", () => {
    expect(CHANNELS.map((channel) => channel.id)).toEqual(["whatsapp", "instagram", "facebook", "tiktok", "x", "telegram", "snapchat"]);
    expect(CHANNEL_BY_ID.facebook.label).toBe("Messenger");
  });

  it("builds chat links, with the message only where the app accepts one", () => {
    expect(CHANNEL_BY_ID.whatsapp.url("12025550100", "Hi & thanks?")).toBe("https://wa.me/12025550100?text=Hi%20%26%20thanks%3F");
    expect(CHANNEL_BY_ID.telegram.url("theshop", "Hello")).toBe("https://t.me/theshop?text=Hello");
    expect(CHANNEL_BY_ID.instagram.url("theshop", "ignored")).toBe("https://ig.me/m/theshop");
    expect(CHANNEL_BY_ID.x.url("theshop", "ignored")).toBe("https://x.com/theshop");
    expect(CHANNELS.filter((channel) => channel.prefill).map((channel) => channel.id)).toEqual(["whatsapp", "telegram"]);
  });

  it("keeps only the channels the business filled in, in display order", () => {
    expect(activeChannels(undefined)).toEqual([]);
    const active = activeChannels({ telegram: "theshop", whatsapp: "12025550100", instagram: "" });
    expect(active.map((channel) => [channel.id, channel.handle])).toEqual([
      ["whatsapp", "12025550100"],
      ["telegram", "theshop"],
    ]);
  });

  it("turns a customer's number into wa.me digits", () => {
    expect(whatsappNumberFor("+1 (202) 555-0100")).toBe("12025550100");
    expect(whatsappNumberFor("0803 555 0100", "2348035550100")).toBe("2348035550100");
    expect(whatsappNumberFor("0803 555 0100", "12025550100")).toBe("08035550100");
  });
});
