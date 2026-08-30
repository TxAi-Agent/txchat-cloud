import { z } from "zod";

export const PUBLIC_LOCAL_CONTRACT = {
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
} as const;

export type OrganizationMode = "smart" | "verbatim";

const protocol = z.literal(PUBLIC_LOCAL_CONTRACT.protocolIdentifier);
const audioDescription = z
  .object({
    channels: z.literal(PUBLIC_LOCAL_CONTRACT.audio.channels),
    encoding: z.literal(PUBLIC_LOCAL_CONTRACT.audio.encoding),
    sampleRate: z.literal(PUBLIC_LOCAL_CONTRACT.audio.sampleRate),
  })
  .strict();
const organizationMode = z.enum(["smart", "verbatim"]);
const safeText = z
  .string()
  .min(1)
  .max(4096)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value));

const startControl = z
  .object({
    protocol,
    type: z.literal("start"),
    audio: audioDescription,
    organizationMode,
  })
  .strict();
const finishControl = z
  .object({ protocol, type: z.literal("finish") })
  .strict();
const cancelControl = z
  .object({ protocol, type: z.literal("cancel") })
  .strict();

export const clientControlSchema = z.discriminatedUnion("type", [
  startControl,
  finishControl,
  cancelControl,
]);

export type PublicLocalClientControl = z.infer<typeof clientControlSchema>;

const serverControlSchema = z.discriminatedUnion("type", [
  z.object({ protocol, type: z.literal("started") }).strict(),
  z.object({ protocol, type: z.literal("partial"), transcript: safeText }).strict(),
  z.object({ protocol, type: z.literal("organizing") }).strict(),
  z
    .object({
      protocol,
      type: z.literal("final"),
      transcript: safeText,
      organizedText: safeText,
    })
    .strict(),
  z
    .object({
      protocol,
      type: z.literal("failed"),
      code: z.enum(["invalid_audio", "invalid_message", "invalid_sequence", "limit_exceeded"]),
    })
    .strict(),
  z
    .object({
      protocol,
      type: z.literal("ended"),
      reason: z.enum(["cancelled", "completed", "failed"]),
    })
    .strict(),
]);

export type PublicLocalServerControl = z.infer<typeof serverControlSchema>;

export function decodeClientControl(value: unknown): PublicLocalClientControl {
  return clientControlSchema.parse(value);
}

export function encodeServerControl(value: unknown): string {
  return JSON.stringify(serverControlSchema.parse(value));
}
