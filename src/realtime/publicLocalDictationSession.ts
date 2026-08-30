import type {
  OrganizationMode,
  PublicLocalClientControl,
  PublicLocalServerControl,
} from "../protocol/publicLocalProtocol.js";
import { PUBLIC_LOCAL_CONTRACT } from "../protocol/publicLocalProtocol.js";
import type { DeterministicOrganizationProvider } from "../providers/deterministicOrganizationProvider.js";
import type { DeterministicRecognitionProvider } from "../providers/deterministicRecognitionProvider.js";

type DictationEvent = "dictation.started" | "dictation.completed";

interface PublicLocalDictationSessionOptions {
  readonly sessionId: string;
  readonly registry: ActiveDictationRegistry;
  readonly recognitionProvider: DeterministicRecognitionProvider;
  readonly organizationProvider: DeterministicOrganizationProvider;
  readonly recordEvent?: (event: DictationEvent) => void;
}

const protocol = PUBLIC_LOCAL_CONTRACT.protocolIdentifier;
const MAXIMUM_AUDIO_BYTES =
  PUBLIC_LOCAL_CONTRACT.audio.sampleRate *
  PUBLIC_LOCAL_CONTRACT.audio.channels *
  2 *
  PUBLIC_LOCAL_CONTRACT.audio.maximumDurationSeconds;

export class ActiveDictationRegistry {
  readonly #active = new Set<string>();

  acquire(sessionId: string): boolean {
    if (this.#active.has(sessionId)) return false;
    this.#active.add(sessionId);
    return true;
  }

  release(sessionId: string): void {
    this.#active.delete(sessionId);
  }
}

export class PublicLocalDictationSession {
  readonly #sessionId: string;
  readonly #registry: ActiveDictationRegistry;
  readonly #recognitionProvider: DeterministicRecognitionProvider;
  readonly #organizationProvider: DeterministicOrganizationProvider;
  readonly #recordEvent: (event: DictationEvent) => void;
  readonly #audioChunks: Buffer[] = [];
  #audioBytes = 0;
  #organizationMode: OrganizationMode | undefined;
  #state: "idle" | "receiving" | "ended" = "idle";
  #acquired = false;

  constructor(options: PublicLocalDictationSessionOptions) {
    this.#sessionId = options.sessionId;
    this.#registry = options.registry;
    this.#recognitionProvider = options.recognitionProvider;
    this.#organizationProvider = options.organizationProvider;
    this.#recordEvent = options.recordEvent ?? (() => undefined);
  }

  handleControl(control: PublicLocalClientControl): PublicLocalServerControl[] {
    if (control.type === "start") {
      if (this.#state !== "idle" || !this.#registry.acquire(this.#sessionId)) {
        return this.#fail("invalid_sequence");
      }
      this.#acquired = true;
      this.#state = "receiving";
      this.#organizationMode = control.organizationMode;
      this.#recordEvent("dictation.started");
      return [{ protocol, type: "started" }];
    }

    if (control.type === "cancel") {
      if (this.#state !== "receiving") return this.#fail("invalid_sequence");
      this.#finish();
      return [{ protocol, type: "ended", reason: "cancelled" }];
    }

    if (this.#state !== "receiving") return this.#fail("invalid_sequence");
    if (this.#audioBytes === 0 || this.#organizationMode === undefined) {
      return this.#fail("invalid_audio");
    }

    try {
      const transcript = this.#recognitionProvider.recognize(Buffer.concat(this.#audioChunks));
      const organizedText = this.#organizationProvider.organize(
        transcript,
        this.#organizationMode,
      );
      this.#recordEvent("dictation.completed");
      this.#finish();
      return [
        { protocol, type: "organizing" },
        { protocol, type: "final", transcript, organizedText },
        { protocol, type: "ended", reason: "completed" },
      ];
    } catch {
      return this.#fail("invalid_audio");
    }
  }

  handleAudio(frame: Uint8Array): PublicLocalServerControl[] {
    if (this.#state !== "receiving") return this.#fail("invalid_sequence");
    if (
      frame.byteLength === 0 ||
      frame.byteLength % 2 !== 0 ||
      frame.byteLength > PUBLIC_LOCAL_CONTRACT.audio.maximumFrameBytes
    ) {
      return this.#fail("invalid_audio");
    }
    if (this.#audioBytes + frame.byteLength > MAXIMUM_AUDIO_BYTES) {
      return this.#fail("limit_exceeded");
    }
    this.#audioChunks.push(Buffer.from(frame));
    this.#audioBytes += frame.byteLength;
    return [];
  }

  close(): void {
    this.#finish();
  }

  #fail(
    code: "invalid_audio" | "invalid_sequence" | "limit_exceeded",
  ): PublicLocalServerControl[] {
    this.#finish();
    return [
      { protocol, type: "failed", code },
      { protocol, type: "ended", reason: "failed" },
    ];
  }

  #finish(): void {
    if (this.#acquired) this.#registry.release(this.#sessionId);
    this.#acquired = false;
    this.#state = "ended";
    this.#audioChunks.length = 0;
    this.#audioBytes = 0;
  }
}
