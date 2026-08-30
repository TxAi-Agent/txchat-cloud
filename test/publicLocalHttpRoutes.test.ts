import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { EphemeralSessionStore } from "../src/auth/ephemeralSessionStore.js";
import { openInMemoryDatabase } from "../src/db/inMemoryDatabase.js";
import { createSafeEventLogger } from "../src/logging/safeEventLogger.js";
import { PUBLIC_LOCAL_CONTRACT } from "../src/protocol/publicLocalProtocol.js";
import { DeterministicOrganizationProvider } from "../src/providers/deterministicOrganizationProvider.js";
import { DeterministicRecognitionProvider } from "../src/providers/deterministicRecognitionProvider.js";

function makeHarness() {
  const database = openInMemoryDatabase();
  const logLines: string[] = [];
  const logger = createSafeEventLogger((line) => logLines.push(line));
  const sessionStore = new EphemeralSessionStore(database.connection, {
    recordEvent: (event) => logger.record(event),
  });
  const app = buildApp({
    logger,
    organizationProvider: new DeterministicOrganizationProvider(),
    recognitionProvider: new DeterministicRecognitionProvider(),
    sessionStore,
  });
  return { app, database, logLines };
}

async function createSession(app: ReturnType<typeof buildApp>) {
  const response = await app.inject({
    method: "POST",
    url: PUBLIC_LOCAL_CONTRACT.routes.session,
  });
  expect(response.statusCode).toBe(201);
  return response.json<{
    accessExpiresInSeconds: number;
    accessToken: string;
    refreshExpiresInSeconds: number;
    refreshToken: string;
    sessionId: string;
  }>();
}

describe("public-local HTTP routes", () => {
  it("bootstraps an ephemeral session with an exact response shape", async () => {
    const harness = makeHarness();
    try {
      const session = await createSession(harness.app);
      expect(Object.keys(session).sort()).toEqual([
        "accessExpiresInSeconds",
        "accessToken",
        "refreshExpiresInSeconds",
        "refreshToken",
        "sessionId",
      ]);
      expect(session.accessToken).toHaveLength(43);
      expect(session.refreshToken).toHaveLength(43);
      expect(JSON.stringify(harness.logLines)).not.toContain(session.accessToken);
      expect(JSON.stringify(harness.logLines)).not.toContain(session.refreshToken);
    } finally {
      await harness.app.close();
      harness.database.close();
    }
  });

  it("refreshes tokens, returns anonymous account state, and logs out", async () => {
    const harness = makeHarness();
    try {
      const first = await createSession(harness.app);
      const refreshResponse = await harness.app.inject({
        method: "POST",
        url: PUBLIC_LOCAL_CONTRACT.routes.refresh,
        payload: { refreshToken: first.refreshToken },
      });
      expect(refreshResponse.statusCode).toBe(200);
      const refreshed = refreshResponse.json<typeof first>();
      expect(refreshed.accessToken).not.toBe(first.accessToken);
      expect(refreshed.refreshToken).not.toBe(first.refreshToken);

      const oldAccount = await harness.app.inject({
        method: "GET",
        url: PUBLIC_LOCAL_CONTRACT.routes.account,
        headers: { authorization: `Bearer ${first.accessToken}` },
      });
      expect(oldAccount.statusCode).toBe(401);

      const account = await harness.app.inject({
        method: "GET",
        url: PUBLIC_LOCAL_CONTRACT.routes.account,
        headers: { authorization: `Bearer ${refreshed.accessToken}` },
      });
      expect(account.statusCode).toBe(200);
      expect(account.json()).toEqual({ authenticated: true });

      const logout = await harness.app.inject({
        method: "POST",
        url: PUBLIC_LOCAL_CONTRACT.routes.logout,
        headers: { authorization: `Bearer ${refreshed.accessToken}` },
      });
      expect(logout.statusCode).toBe(204);
      expect(logout.body).toBe("");

      const closedAccount = await harness.app.inject({
        method: "GET",
        url: PUBLIC_LOCAL_CONTRACT.routes.account,
        headers: { authorization: `Bearer ${refreshed.accessToken}` },
      });
      expect(closedAccount.statusCode).toBe(401);
      expect(JSON.stringify(harness.logLines)).not.toContain(first.refreshToken);
      expect(JSON.stringify(harness.logLines)).not.toContain(refreshed.accessToken);
    } finally {
      await harness.app.close();
      harness.database.close();
    }
  });

  it("rejects malformed bodies and missing or malformed bearer headers", async () => {
    const harness = makeHarness();
    try {
      const malformedBody = await harness.app.inject({
        method: "POST",
        url: PUBLIC_LOCAL_CONTRACT.routes.session,
        payload: { unexpected: true },
      });
      expect(malformedBody.statusCode).toBe(400);
      expect(malformedBody.json()).toEqual({ error: "invalid_request" });

      const missing = await harness.app.inject({
        method: "GET",
        url: PUBLIC_LOCAL_CONTRACT.routes.account,
      });
      expect(missing.statusCode).toBe(401);
      expect(missing.json()).toEqual({ error: "unauthorized" });

      const malformed = await harness.app.inject({
        method: "GET",
        url: PUBLIC_LOCAL_CONTRACT.routes.account,
        headers: { authorization: "Bearer malformed" },
      });
      expect(malformed.statusCode).toBe(401);
      expect(malformed.json()).toEqual({ error: "unauthorized" });
    } finally {
      await harness.app.close();
      harness.database.close();
    }
  });
});
