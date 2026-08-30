import { describe, expect, it } from "vitest";

import { createSafeEventLogger } from "../src/logging/safeEventLogger.js";

describe("createSafeEventLogger", () => {
  it("emits only allowlisted event and error-code fields", () => {
    const output: string[] = [];
    const logger = createSafeEventLogger((line) => output.push(line));

    logger.record("server.ready");
    logger.record("request.rejected", "unauthorized");

    expect(output.map((line) => JSON.parse(line))).toEqual([
      { event: "server.ready" },
      { errorCode: "unauthorized", event: "request.rejected" },
    ]);
  });

  it("rejects arbitrary events, error codes, and metadata objects without echoing them", () => {
    const output: string[] = [];
    const logger = createSafeEventLogger((line) => output.push(line));
    const unsafeRecord = logger.record as unknown as (...values: unknown[]) => void;

    expect(() => unsafeRecord("synthetic.unapproved")).toThrow("Invalid safe event");
    expect(() => unsafeRecord("request.rejected", "synthetic-unapproved-code")).toThrow(
      "Invalid safe event",
    );
    expect(() => unsafeRecord("request.rejected", { details: "should-not-emit" })).toThrow(
      "Invalid safe event",
    );
    expect(JSON.stringify(output)).not.toContain("should-not-emit");
  });
});
