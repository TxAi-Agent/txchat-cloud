import {
  createHash,
  randomBytes as systemRandomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import type Database from "better-sqlite3";

export interface PublicLocalSession {
  readonly sessionId: string;
  readonly accessToken: string;
  readonly accessExpiresInSeconds: number;
  readonly refreshToken: string;
  readonly refreshExpiresInSeconds: number;
}

export interface AuthenticatedPublicLocalSession {
  readonly sessionId: string;
}

export type SessionEvent = "session.created" | "session.refreshed" | "session.closed";

interface SessionStoreOptions {
  readonly accessExpiresInSeconds?: number;
  readonly refreshExpiresInSeconds?: number;
  readonly now?: () => number;
  readonly randomBytes?: (size: number) => Buffer;
  readonly recordEvent?: (event: SessionEvent) => void;
}

interface SessionRow {
  readonly session_id: string;
  readonly access_token_hash: Buffer;
  readonly refresh_token_hash: Buffer;
  readonly access_expires_at: number;
  readonly refresh_expires_at: number;
}

const INVALID_SESSION_MESSAGE = "Invalid or expired public-local session";

function invalidSession(): never {
  throw new Error(INVALID_SESSION_MESSAGE);
}

function tokenHash(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

export class EphemeralSessionStore {
  readonly #connection: Database.Database;
  readonly #accessExpiresInSeconds: number;
  readonly #refreshExpiresInSeconds: number;
  readonly #now: () => number;
  readonly #randomBytes: (size: number) => Buffer;
  readonly #recordEvent: (event: SessionEvent) => void;

  constructor(connection: Database.Database, options: SessionStoreOptions = {}) {
    this.#connection = connection;
    this.#accessExpiresInSeconds = options.accessExpiresInSeconds ?? 900;
    this.#refreshExpiresInSeconds = options.refreshExpiresInSeconds ?? 3600;
    this.#now = options.now ?? Date.now;
    this.#randomBytes = options.randomBytes ?? systemRandomBytes;
    this.#recordEvent = options.recordEvent ?? (() => undefined);
  }

  create(): PublicLocalSession {
    const session = this.#newSession(randomUUID());
    this.#connection
      .prepare(`
        INSERT INTO public_local_sessions (
          session_id,
          access_token_hash,
          refresh_token_hash,
          access_expires_at,
          refresh_expires_at
        ) VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        session.publicSession.sessionId,
        session.accessHash,
        session.refreshHash,
        session.accessExpiresAt,
        session.refreshExpiresAt,
      );
    this.#recordEvent("session.created");
    return session.publicSession;
  }

  authenticateAccessToken(token: string): AuthenticatedPublicLocalSession {
    const row = this.#matchingRow("access", token);
    if (this.#now() >= row.access_expires_at) invalidSession();
    return { sessionId: row.session_id };
  }

  refresh(token: string): PublicLocalSession {
    const row = this.#matchingRow("refresh", token);
    if (this.#now() >= row.refresh_expires_at) invalidSession();
    const replacement = this.#newSession(row.session_id);
    const result = this.#connection
      .prepare(`
        UPDATE public_local_sessions
        SET access_token_hash = ?,
            refresh_token_hash = ?,
            access_expires_at = ?,
            refresh_expires_at = ?
        WHERE session_id = ?
      `)
      .run(
        replacement.accessHash,
        replacement.refreshHash,
        replacement.accessExpiresAt,
        replacement.refreshExpiresAt,
        row.session_id,
      );
    if (result.changes !== 1) invalidSession();
    this.#recordEvent("session.refreshed");
    return replacement.publicSession;
  }

  logout(token: string): void {
    const row = this.#matchingRow("access", token);
    if (this.#now() >= row.access_expires_at) invalidSession();
    const result = this.#connection
      .prepare("DELETE FROM public_local_sessions WHERE session_id = ?")
      .run(row.session_id);
    if (result.changes !== 1) invalidSession();
    this.#recordEvent("session.closed");
  }

  #newSession(sessionId: string) {
    const accessToken = this.#newToken();
    const refreshToken = this.#newToken();
    const now = this.#now();
    const accessExpiresAt = now + this.#accessExpiresInSeconds * 1000;
    const refreshExpiresAt = now + this.#refreshExpiresInSeconds * 1000;
    return {
      accessExpiresAt,
      accessHash: tokenHash(accessToken),
      publicSession: {
        sessionId,
        accessToken,
        accessExpiresInSeconds: this.#accessExpiresInSeconds,
        refreshToken,
        refreshExpiresInSeconds: this.#refreshExpiresInSeconds,
      } satisfies PublicLocalSession,
      refreshExpiresAt,
      refreshHash: tokenHash(refreshToken),
    };
  }

  #newToken(): string {
    const bytes = this.#randomBytes(32);
    if (bytes.length !== 32) throw new Error("Public-local random source failed");
    return bytes.toString("base64url");
  }

  #matchingRow(kind: "access" | "refresh", token: string): SessionRow {
    const candidate = tokenHash(token);
    const rows = this.#connection
      .prepare(`
        SELECT session_id,
               access_token_hash,
               refresh_token_hash,
               access_expires_at,
               refresh_expires_at
        FROM public_local_sessions
      `)
      .all() as SessionRow[];
    const field = kind === "access" ? "access_token_hash" : "refresh_token_hash";
    for (const row of rows) {
      const stored = Buffer.from(row[field]);
      if (stored.length === candidate.length && timingSafeEqual(stored, candidate)) {
        return row;
      }
    }
    return invalidSession();
  }
}
