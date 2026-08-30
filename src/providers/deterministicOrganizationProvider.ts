import type { OrganizationMode } from "../protocol/publicLocalProtocol.js";

export class DeterministicOrganizationProvider {
  organize(text: string, mode: OrganizationMode): string {
    if (text.length === 0 || text.length > 4096 || /[\u0000-\u001f\u007f]/.test(text)) {
      throw new Error("Invalid synthetic text");
    }
    const normalized = text.trim().replace(/\s+/g, " ");
    if (normalized.length === 0) throw new Error("Invalid synthetic text");
    if (mode === "verbatim") return normalized;
    const capitalized = normalized[0]?.toUpperCase() + normalized.slice(1);
    return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
  }
}
