import { describe, expect, it } from "vitest";

import { EphemeralSessionStore } from "../src/auth/ephemeralSessionStore.js";
import { openInMemoryDatabase } from "../src/db/inMemoryDatabase.js";

function makeHarness() {
  const database = openInMemoryDatabase();
  let currentTime = 1_000_000;
  let randomSeed = 0;
  const events: string[] = [];
  const store = new EphemeralSessionStore(database.connection, {
    accessExpiresInSeconds: 60,
    refreshExpiresInSeconds: 120,
    now: () => currentTime,
    randomBytes: (size) => Buffer.alloc(size, randomSeed++),
    recordEvent: (event) => events.push(event),
  });
  return {
    database,
    events,
    setTime(value: number) {
      currentTime = value;
    },
    store,
  };
}

describe("EphemeralSessionStore", () => {
  it("stores only token hashes and content-free events", () => {
    const harness = makeHarness();
    try {
      const session = harness.store.create();
      const row = harness.database.connection
        .prepare("SELECT * FROM public_local_sessions")
        .get() as Record<string, unknown>;

      expect(session.accessToken).toHaveLength(43);
      expect(session.refreshToken).toHaveLength(43);
      expect(row.access_token_hash).toBeInstanceOf(Buffer);
      expect(row.refresh_token_hash).toBeInstanceOf(Buffer);
      expect(JSON.stringify(row)).not.toContain(session.accessToken);
      expect(JSON.stringify(row)).not.toContain(session.refreshToken);
      expect(JSON.stringify(harness.events)).not.toContain(session.accessToken);
      expect(JSON.stringify(harness.events)).not.toContain(session.refreshToken);
      expect(harness.events).toEqual(["session.created"]);
    } finally {
      harness.database.close();
    }
  });

  it("authenticates a current access token without returning the token", () => {
    const harness = makeHarness();
    try {
      const session = harness.store.create();
      expect(harness.store.authenticateAccessToken(session.accessToken)).toEqual({
        sessionId: session.sessionId,
      });
    } finally {
      harness.database.close();
    }
  });

  it("rotates both tokens during refresh and invalidates the old values", () => {
    const harness = makeHarness();
    try {
      const first = harness.store.create();
      const refreshed = harness.store.refresh(first.refreshToken);

      expect(refreshed.sessionId).toBe(first.sessionId);
      expect(refreshed.accessToken).not.toBe(first.accessToken);
      expect(refreshed.refreshToken).not.toBe(first.refreshToken);
      expect(() => harness.store.authenticateAccessToken(first.accessToken)).toThrow(
        "Invalid or expired public-local session",
      );
      expect(() => harness.store.refresh(first.refreshToken)).toThrow(
        "Invalid or expired public-local session",
      );
      expect(harness.store.authenticateAccessToken(refreshed.accessToken)).toEqual({
        sessionId: first.sessionId,
      });
      expect(harness.events).toEqual(["session.created", "session.refreshed"]);
    } finally {
      harness.database.close();
    }
  });

  it("deletes both credential hashes during logout", () => {
    const harness = makeHarness();
    try {
      const session = harness.store.create();
      harness.store.logout(session.accessToken);

      expect(
        harness.database.connection
          .prepare("SELECT COUNT(*) AS count FROM public_local_sessions")
          .get(),
      ).toEqual({ count: 0 });
      expect(() => harness.store.authenticateAccessToken(session.accessToken)).toThrow(
        "Invalid or expired public-local session",
      );
      expect(() => harness.store.refresh(session.refreshToken)).toThrow(
        "Invalid or expired public-local session",
      );
      expect(harness.events).toEqual(["session.created", "session.closed"]);
    } finally {
      harness.database.close();
    }
  });

  it("rejects expired access and refresh tokens", () => {
    const harness = makeHarness();
    try {
      const session = harness.store.create();
      harness.setTime(1_121_000);
      expect(() => harness.store.authenticateAccessToken(session.accessToken)).toThrow(
        "Invalid or expired public-local session",
      );
      expect(() => harness.store.refresh(session.refreshToken)).toThrow(
        "Invalid or expired public-local session",
      );
    } finally {
      harness.database.close();
    }
  });

  it("uses the same redacted error for malformed tokens", () => {
    const harness = makeHarness();
    try {
      expect(() => harness.store.authenticateAccessToken("malformed")).toThrow(
        "Invalid or expired public-local session",
      );
      expect(() => harness.store.refresh("malformed")).toThrow(
        "Invalid or expired public-local session",
      );
      expect(() => harness.store.logout("malformed")).toThrow(
        "Invalid or expired public-local session",
      );
    } finally {
      harness.database.close();
    }
  });
});
