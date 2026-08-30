import Database from "better-sqlite3";

export interface InMemoryDatabase {
  readonly connection: Database.Database;
  close(): void;
}

export function openInMemoryDatabase(): InMemoryDatabase {
  const connection = new Database(":memory:");
  connection.pragma("foreign_keys = ON");
  connection.exec(`
    CREATE TABLE public_local_sessions (
      session_id TEXT PRIMARY KEY,
      access_token_hash BLOB NOT NULL CHECK(length(access_token_hash) = 32),
      refresh_token_hash BLOB NOT NULL CHECK(length(refresh_token_hash) = 32),
      access_expires_at INTEGER NOT NULL,
      refresh_expires_at INTEGER NOT NULL
    ) STRICT;
  `);

  return {
    connection,
    close() {
      if (connection.open) connection.close();
    },
  };
}
