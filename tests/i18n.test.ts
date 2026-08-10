import { describe, expect, it, vi } from "vitest";
import { I18n } from "../src/i18n/I18n";
import { LANGUAGES, MESSAGES, MessageKey } from "../src/i18n/messages";

describe("message catalogues", () => {
  it("translates every key in every language", () => {
    const reference = Object.keys(MESSAGES.pl) as MessageKey[];
    for (const language of LANGUAGES) {
      const keys = Object.keys(MESSAGES[language]);
      expect(keys.sort()).toEqual([...reference].sort());
      for (const key of reference) {
        expect(MESSAGES[language][key], `${language}/${key}`).toBeTruthy();
      }
    }
  });

  it("keeps the same placeholders in each translation", () => {
    const placeholders = (text: string) => (text.match(/\{(\w+)\}/g) ?? []).sort();
    for (const key of Object.keys(MESSAGES.pl) as MessageKey[]) {
      expect(placeholders(MESSAGES.en[key]), key).toEqual(placeholders(MESSAGES.pl[key]));
    }
  });
});

describe("I18n", () => {
  it("translates in the selected language", () => {
    const i18n = new I18n("pl");
    expect(i18n.t("sidebar.moves")).toBe("Ruchy");
    i18n.setLanguage("en");
    expect(i18n.t("sidebar.moves")).toBe("Moves");
  });

  it("fills placeholders", () => {
    const i18n = new I18n("en");
    expect(i18n.t("variant.name", { id: 3 })).toBe("Variant 3");
    expect(i18n.t("hint.capture", { side: "White" })).toContain("White:");
  });

  it("leaves unknown placeholders untouched", () => {
    const i18n = new I18n("en");
    expect(i18n.t("variant.name", { wrong: 1 })).toBe("Variant {id}");
  });

  it("toggles between the two languages", () => {
    const i18n = new I18n("pl");
    i18n.toggle();
    expect(i18n.language).toBe("en");
    i18n.toggle();
    expect(i18n.language).toBe("pl");
  });

  it("notifies subscribers only on a real change", () => {
    const i18n = new I18n("pl");
    const listener = vi.fn();
    const unsubscribe = i18n.subscribe(listener);

    i18n.setLanguage("pl"); // no change
    expect(listener).not.toHaveBeenCalled();

    i18n.setLanguage("en");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    i18n.setLanguage("pl");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
