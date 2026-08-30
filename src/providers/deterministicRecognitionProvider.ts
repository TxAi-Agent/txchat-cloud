import { PUBLIC_LOCAL_CONTRACT } from "../protocol/publicLocalProtocol.js";

export const DETERMINISTIC_TRANSCRIPT = "Synthetic public-local dictation completed.";

const MAXIMUM_AUDIO_BYTES =
  PUBLIC_LOCAL_CONTRACT.audio.sampleRate *
  PUBLIC_LOCAL_CONTRACT.audio.channels *
  2 *
  PUBLIC_LOCAL_CONTRACT.audio.maximumDurationSeconds;

export class DeterministicRecognitionProvider {
  recognize(audio: Uint8Array): string {
    if (audio.byteLength === 0 || audio.byteLength % 2 !== 0 || audio.byteLength > MAXIMUM_AUDIO_BYTES) {
      throw new Error("Invalid synthetic audio");
    }
    return DETERMINISTIC_TRANSCRIPT;
  }
}
