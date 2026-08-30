import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { DeterministicOrganizationProvider } from "../src/providers/deterministicOrganizationProvider.js";
import { DeterministicRecognitionProvider } from "../src/providers/deterministicRecognitionProvider.js";
import {
  ActiveDictationRegistry,
  PublicLocalDictationSession,
} from "../src/realtime/publicLocalDictationSession.js";

const startSmart = {
  protocol: "txchat.public-local.v1" as const,
  type: "start" as const,
  audio: { channels: 1 as const, encoding: "pcm_s16le" as const, sampleRate: 16000 as const },
  organizationMode: "smart" as const,
};
const finish = { protocol: "txchat.public-local.v1" as const, type: "finish" as const };
const cancel = { protocol: "txchat.public-local.v1" as const, type: "cancel" as const };

function makeSession(sessionId = randomUUID(), registry = new ActiveDictationRegistry()) {
  const events: string[] = [];
  const session = new PublicLocalDictationSession({
    sessionId,
    registry,
    recognitionProvider: new DeterministicRecognitionProvider(),
    organizationProvider: new DeterministicOrganizationProvider(),
    recordEvent: (event) => events.push(event),
  });
  return { events, registry, session };
}

describe("PublicLocalDictationSession", () => {
  it("enforces start, binary audio, finish, organization, final, and ended order", () => {
    const harness = makeSession();
    expect(harness.session.handleControl(startSmart)).toEqual([
      { protocol: "txchat.public-local.v1", type: "started" },
    ]);
    expect(harness.session.handleAudio(Buffer.alloc(320))).toEqual([]);
    expect(harness.session.handleControl(finish)).toEqual([
      { protocol: "txchat.public-local.v1", type: "organizing" },
      {
        protocol: "txchat.public-local.v1",
        type: "final",
        transcript: "Synthetic public-local dictation completed.",
        organizedText: "Synthetic public-local dictation completed.",
      },
      { protocol: "txchat.public-local.v1", type: "ended", reason: "completed" },
    ]);
    expect(harness.events).toEqual(["dictation.started", "dictation.completed"]);
  });

  it("cancels an active dictation and releases the registry", () => {
    const registry = new ActiveDictationRegistry();
    const sessionId = randomUUID();
    const first = makeSession(sessionId, registry);
    const second = makeSession(sessionId, registry);

    expect(first.session.handleControl(startSmart)[0]).toMatchObject({ type: "started" });
    expect(second.session.handleControl(startSmart)).toEqual([
      { protocol: "txchat.public-local.v1", type: "failed", code: "invalid_sequence" },
      { protocol: "txchat.public-local.v1", type: "ended", reason: "failed" },
    ]);
    expect(first.session.handleControl(cancel)).toEqual([
      { protocol: "txchat.public-local.v1", type: "ended", reason: "cancelled" },
    ]);

    const third = makeSession(sessionId, registry);
    expect(third.session.handleControl(startSmart)[0]).toMatchObject({ type: "started" });
    third.session.close();
  });

  it("rejects invalid control ordering with a terminal public error", () => {
    const harness = makeSession();
    expect(harness.session.handleControl(finish)).toEqual([
      { protocol: "txchat.public-local.v1", type: "failed", code: "invalid_sequence" },
      { protocol: "txchat.public-local.v1", type: "ended", reason: "failed" },
    ]);
  });

  it.each([Buffer.alloc(0), Buffer.alloc(3), Buffer.alloc(6402)])(
    "rejects invalid audio frame bounds",
    (frame) => {
      const harness = makeSession();
      harness.session.handleControl(startSmart);
      expect(harness.session.handleAudio(frame)).toEqual([
        { protocol: "txchat.public-local.v1", type: "failed", code: "invalid_audio" },
        { protocol: "txchat.public-local.v1", type: "ended", reason: "failed" },
      ]);
    },
  );

  it("enforces the five-minute total audio limit", () => {
    const harness = makeSession();
    harness.session.handleControl(startSmart);
    for (let index = 0; index < 1500; index += 1) {
      expect(harness.session.handleAudio(Buffer.alloc(6400))).toEqual([]);
    }
    expect(harness.session.handleAudio(Buffer.alloc(2))).toEqual([
      { protocol: "txchat.public-local.v1", type: "failed", code: "limit_exceeded" },
      { protocol: "txchat.public-local.v1", type: "ended", reason: "failed" },
    ]);
  });

  it("requires nonempty audio before finish", () => {
    const harness = makeSession();
    harness.session.handleControl(startSmart);
    expect(harness.session.handleControl(finish)).toEqual([
      { protocol: "txchat.public-local.v1", type: "failed", code: "invalid_audio" },
      { protocol: "txchat.public-local.v1", type: "ended", reason: "failed" },
    ]);
  });
});
