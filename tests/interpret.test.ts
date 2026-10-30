import { describe, it, expect } from "vitest";
import { interpretAnswer, extractFromBrief, guessSize } from "../src/lib/conversation/interpret";

describe("size", () => {
  it("handles 30 ml", () => {
    const r = interpretAnswer("size", "30 ml", { environment: [] });
    expect(r.value).toBe("2x1");
    expect(r.note).toMatch(/30 ml/);
  });
  it("handles inches and mm", () => {
    expect(guessSize("3 x 4")).toMatchObject({ w: 3, h: 4 });
    expect(guessSize("76 x 102 mm")).toMatchObject({ w: 3, h: 4 });
    expect(guessSize("8 oz candle")).toMatchObject({ w: 3, h: 2 });
  });
});

describe("brief extraction", () => {
  it("pulls a whole brief out of one sentence", () => {
    const n = extractFromBrief("hot sauce in 250ml glass bottles, kept in the fridge, need about 2,500 labels full colour");
    expect(n.category).toBe("food_beverage");
    expect(n.surface).toBe("glass");
    expect(n.environment).toContain("fridge");
    expect(n.quantity).toBe(2500);
    expect(n.look).toBe("full_colour");
    expect(n.widthIn).toBe(3);
  });
  it("understands quantity words", () => {
    expect(interpretAnswer("quantity", "80k", { environment: [] }).value).toBe("80000");
    expect(interpretAnswer("quantity", "eighty thousand please", { environment: [] }).clarify).toBeTruthy();
  });
  it("recognises a printer", () => {
    expect(interpretAnswer("application", "we have a zebra zd420", { environment: [] }).value).toBe("own_printer");
  });
});

describe("vague containers", () => {
  it("does not lock a size from a bare 'bottle' in the brief", () => {
    const n = extractFromBrief("beard oil in little glass dropper bottles");
    expect(n.widthIn).toBeUndefined();
  });
  it("dropper answer at the size step suggests a small label", () => {
    expect(interpretAnswer("size", "dropper bottle", { environment: [] }).value).toBe("2x1");
  });
});

describe("heat", () => {
  it("does not read 'hot sauce' as heat", () => {
    expect(extractFromBrief("hot sauce in glass bottles, kept in the fridge").environment).toEqual(["fridge"]);
  });
});
