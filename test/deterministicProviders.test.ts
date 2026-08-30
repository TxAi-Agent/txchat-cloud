import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { DeterministicOrganizationProvider } from "../src/providers/deterministicOrganizationProvider.js";
import {
  DETERMINISTIC_TRANSCRIPT,
  DeterministicRecognitionProvider,
} from "../src/providers/deterministicRecognitionProvider.js";

describe("deterministic public-local providers", () => {
  it("returns a fixed transcript for bounded even-length synthetic PCM", () => {
    const provider = new DeterministicRecognitionProvider();
    expect(provider.recognize(Buffer.alloc(320))).toBe(DETERMINISTIC_TRANSCRIPT);
    expect(provider.recognize(Buffer.alloc(6400))).toBe(DETERMINISTIC_TRANSCRIPT);
  });

  it.each([Buffer.alloc(0), Buffer.alloc(3), Buffer.alloc(9_600_002)])(
    "rejects invalid audio bounds",
    (audio) => {
      const provider = new DeterministicRecognitionProvider();
      expect(() => provider.recognize(audio)).toThrow("Invalid synthetic audio");
    },
  );

  it("produces deterministic verbatim and smart organization", () => {
    const provider = new DeterministicOrganizationProvider();
    expect(provider.organize("  synthetic   public text  ", "verbatim")).toBe(
      "synthetic public text",
    );
    expect(provider.organize("  synthetic   public text  ", "smart")).toBe(
      "Synthetic public text.",
    );
  });

  it("rejects empty text and control characters", () => {
    const provider = new DeterministicOrganizationProvider();
    expect(() => provider.organize("   ", "smart")).toThrow("Invalid synthetic text");
    expect(() => provider.organize("synthetic\u0000text", "verbatim")).toThrow(
      "Invalid synthetic text",
    );
  });

  it("does not import networking modules", () => {
    for (const path of [
      "../src/providers/deterministicRecognitionProvider.ts",
      "../src/providers/deterministicOrganizationProvider.ts",
    ]) {
      const source = readFileSync(new URL(path, import.meta.url), "utf8");
      expect(source).not.toMatch(/node:(?:http|https|net|tls|dgram)|from ["'](?:http|https|undici)["']/);
    }
  });
});
