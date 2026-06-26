import { describe, expect, it } from "vitest";
import {
  LANGS,
  TRANSLATIONS,
  resolveLang,
  t,
  type MessageKey,
} from "../src/i18n.js";

describe("resolveLang", () => {
  it("maps Spanish locales to 'es'", () => {
    expect(resolveLang("es")).toBe("es");
    expect(resolveLang("es-CO")).toBe("es");
    expect(resolveLang("ES-MX")).toBe("es");
  });

  it("defaults to 'en' for anything else or missing", () => {
    expect(resolveLang("en-US")).toBe("en");
    expect(resolveLang("fr")).toBe("en");
    expect(resolveLang(undefined)).toBe("en");
    expect(resolveLang(null)).toBe("en");
    expect(resolveLang("")).toBe("en");
  });
});

describe("t", () => {
  it("translates known keys per language", () => {
    expect(t("en", "clear")).toBe("Clear");
    expect(t("es", "clear")).toBe("Limpiar");
    expect(t("es", "length")).toBe("Longitud");
  });

  it("falls back to English then the key", () => {
    expect(t("en", "reset")).toBe("Reset");
    // @ts-expect-error testing unknown key fallback
    expect(t("es", "nope")).toBe("nope");
  });
});

describe("translation completeness", () => {
  it("every language defines every English key", () => {
    const keys = Object.keys(TRANSLATIONS.en) as MessageKey[];
    for (const lang of LANGS) {
      for (const key of keys) {
        expect(TRANSLATIONS[lang][key], `${lang}.${key}`).toBeTruthy();
      }
    }
  });
});
