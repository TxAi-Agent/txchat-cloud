import { describe, expect, it } from "vitest";

import { openInMemoryDatabase } from "../src/db/inMemoryDatabase.js";

describe("openInMemoryDatabase", () => {
  it("opens only an in-memory SQLite database", () => {
    const database = openInMemoryDatabase();
    try {
      expect(database.connection.name).toBe(":memory:");
      const databases = database.connection
        .prepare("PRAGMA database_list")
        .all() as Array<{ file: string; name: string }>;
      expect(databases).toEqual([{ file: "", name: "main", seq: 0 }]);
    } finally {
      database.close();
    }
  });

  it("defines only hashed session credential columns", () => {
    const database = openInMemoryDatabase();
    try {
      const tables = database.connection
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
        .all() as Array<{ name: string }>;
      expect(tables.map((row) => row.name)).toEqual(["public_local_sessions"]);

      const columns = database.connection
        .prepare("PRAGMA table_info(public_local_sessions)")
        .all() as Array<{ name: string }>;
      const credentialColumns = columns
        .map((row) => row.name)
        .filter((name) => name.includes("token"));
      expect(credentialColumns).toEqual(["access_token_hash", "refresh_token_hash"]);
    } finally {
      database.close();
    }
  });
});
