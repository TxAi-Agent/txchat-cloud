import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  PUBLIC_LOCAL_CONTRACT,
  decodeClientControl,
  encodeServerControl,
} from "../src/protocol/publicLocalProtocol.js";

describe("public-local protocol", () => {
  it("uses only the approved public-local identity and routes", () => {
    expect(PUBLIC_LOCAL_CONTRACT).toEqual({
      protocolIdentifier: "txchat.public-local.v1",
      routes: {
        account: "/public-local/v1/account",
        dictation: "/public-local/v1/dictation",
        logout: "/public-local/v1/logout",
        refresh: "/public-local/v1/session/refresh",
        session: "/public-local/v1/session",
      },
      audio: {
        channels: 1,
        encoding: "pcm_s16le",
        maximumDurationSeconds: 300,
        maximumFrameBytes: 6400,
        sampleRate: 16000,
      },
    });
  });

  it("matches the committed public JSON schema contract metadata", () => {
    const schema = JSON.parse(
      readFileSync(
        new URL("../contracts/txchat-public-local-v1.schema.json", import.meta.url),
        "utf8",
      ),
    ) as { "x-txchat-contract": unknown };
    expect(schema["x-txchat-contract"]).toEqual(PUBLIC_LOCAL_CONTRACT);
  });

  it.each([
    {
      protocol: "txchat.public-local.v1",
      type: "start",
      audio: { channels: 1, encoding: "pcm_s16le", sampleRate: 16000 },
      organizationMode: "smart",
    },
    { protocol: "txchat.public-local.v1", type: "finish" },
    { protocol: "txchat.public-local.v1", type: "cancel" },
  ])("decodes strict client control $type", (message) => {
    expect(decodeClientControl(message)).toEqual(message);
  });

  it("rejects unknown fields, wrong audio, and wrong protocol", () => {
    expect(() =>
      decodeClientControl({
        protocol: "txchat.public-local.v1",
        type: "finish",
        unexpected: true,
      }),
    ).toThrow();
    expect(() =>
      decodeClientControl({
        protocol: "txchat.public-local.v1",
        type: "start",
        audio: { channels: 2, encoding: "pcm_s16le", sampleRate: 16000 },
        organizationMode: "smart",
      }),
    ).toThrow();
    expect(() =>
      decodeClientControl({ protocol: "synthetic.wrong.v9", type: "finish" }),
    ).toThrow();
  });

  it.each([
    { protocol: "txchat.public-local.v1", type: "started" },
    {
      protocol: "txchat.public-local.v1",
      type: "partial",
      transcript: "Synthetic partial text",
    },
    { protocol: "txchat.public-local.v1", type: "organizing" },
    {
      protocol: "txchat.public-local.v1",
      type: "final",
      transcript: "Synthetic transcript",
      organizedText: "Synthetic transcript.",
    },
    {
      protocol: "txchat.public-local.v1",
      type: "failed",
      code: "invalid_sequence",
    },
    {
      protocol: "txchat.public-local.v1",
      type: "ended",
      reason: "completed",
    },
  ])("encodes strict server control $type", (message) => {
    expect(JSON.parse(encodeServerControl(message))).toEqual(message);
  });

  it("rejects control characters and unknown server fields", () => {
    expect(() =>
      encodeServerControl({
        protocol: "txchat.public-local.v1",
        type: "partial",
        transcript: "Synthetic\u0000text",
      }),
    ).toThrow();
    expect(() =>
      encodeServerControl({
        protocol: "txchat.public-local.v1",
        type: "ended",
        reason: "completed",
        metadata: {},
      }),
    ).toThrow();
  });
});
