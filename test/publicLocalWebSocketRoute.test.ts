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

async function createAccessToken(app: ReturnType<typeof buildApp>): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: PUBLIC_LOCAL_CONTRACT.routes.session,
  });
  return response.json<{ accessToken: string }>().accessToken;
}

function receiveMessages(socket: Awaited<ReturnType<ReturnType<typeof buildApp>["injectWS"]>>, count: number) {
  return new Promise<unknown[]>((resolve, reject) => {
    const messages: unknown[] = [];
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for public-local message")), 2000);
    socket.on("message", (data) => {
      messages.push(JSON.parse(data.toString()));
      if (messages.length === count) {
        clearTimeout(timeout);
        resolve(messages);
      }
    });
  });
}

const startMessage = {
  protocol: "txchat.public-local.v1",
  type: "start",
  audio: { channels: 1, encoding: "pcm_s16le", sampleRate: 16000 },
  organizationMode: "smart",
};

describe("public-local WebSocket route", () => {
  it("completes a deterministic authenticated dictation", async () => {
    const harness = makeHarness();
    await harness.app.ready();
    const accessToken = await createAccessToken(harness.app);
    const socket = await harness.app.injectWS(PUBLIC_LOCAL_CONTRACT.routes.dictation, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    try {
      const started = receiveMessages(socket, 1);
      socket.send(JSON.stringify(startMessage));
      expect(await started).toEqual([{ protocol: "txchat.public-local.v1", type: "started" }]);

      socket.send(Buffer.alloc(320));
      const completed = receiveMessages(socket, 3);
      socket.send(JSON.stringify({ protocol: "txchat.public-local.v1", type: "finish" }));
      expect(await completed).toEqual([
        { protocol: "txchat.public-local.v1", type: "organizing" },
        {
          protocol: "txchat.public-local.v1",
          type: "final",
          transcript: "Synthetic public-local dictation completed.",
          organizedText: "Synthetic public-local dictation completed.",
        },
        { protocol: "txchat.public-local.v1", type: "ended", reason: "completed" },
      ]);
      expect(JSON.stringify(harness.logLines)).not.toContain(accessToken);
    } finally {
      socket.terminate();
      await harness.app.close();
      harness.database.close();
    }
  });

  it("rejects missing and malformed bearer tokens before upgrade", async () => {
    const harness = makeHarness();
    await harness.app.ready();
    try {
      await expect(
        harness.app.injectWS(PUBLIC_LOCAL_CONTRACT.routes.dictation),
      ).rejects.toThrow();
      await expect(
        harness.app.injectWS(PUBLIC_LOCAL_CONTRACT.routes.dictation, {
          headers: { authorization: "Bearer malformed" },
        }),
      ).rejects.toThrow();
    } finally {
      await harness.app.close();
      harness.database.close();
    }
  });

  it("allows only one active dictation for the same ephemeral session", async () => {
    const harness = makeHarness();
    await harness.app.ready();
    const accessToken = await createAccessToken(harness.app);
    const headers = { authorization: `Bearer ${accessToken}` };
    const first = await harness.app.injectWS(PUBLIC_LOCAL_CONTRACT.routes.dictation, { headers });
    const second = await harness.app.injectWS(PUBLIC_LOCAL_CONTRACT.routes.dictation, { headers });
    try {
      const firstStarted = receiveMessages(first, 1);
      first.send(JSON.stringify(startMessage));
      await firstStarted;

      const secondRejected = receiveMessages(second, 2);
      second.send(JSON.stringify(startMessage));
      expect(await secondRejected).toEqual([
        { protocol: "txchat.public-local.v1", type: "failed", code: "invalid_sequence" },
        { protocol: "txchat.public-local.v1", type: "ended", reason: "failed" },
      ]);
    } finally {
      first.terminate();
      second.terminate();
      await harness.app.close();
      harness.database.close();
    }
  });

  it("returns a fixed protocol error for invalid text controls", async () => {
    const harness = makeHarness();
    await harness.app.ready();
    const accessToken = await createAccessToken(harness.app);
    const socket = await harness.app.injectWS(PUBLIC_LOCAL_CONTRACT.routes.dictation, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    try {
      const rejected = receiveMessages(socket, 2);
      socket.send(JSON.stringify({ type: "synthetic-invalid-control" }));
      expect(await rejected).toEqual([
        { protocol: "txchat.public-local.v1", type: "failed", code: "invalid_message" },
        { protocol: "txchat.public-local.v1", type: "ended", reason: "failed" },
      ]);
    } finally {
      socket.terminate();
      await harness.app.close();
      harness.database.close();
    }
  });
});
