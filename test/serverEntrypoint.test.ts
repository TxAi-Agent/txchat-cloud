import { describe, expect, it } from "vitest";

import { startPublicLocalServer } from "../src/server.js";

describe("startPublicLocalServer", () => {
  it("listens only on the fixed loopback host and prints only the readiness marker", async () => {
    const listenCalls: unknown[] = [];
    const output: string[] = [];
    let appCloseCount = 0;
    let databaseCloseCount = 0;

    const shutdown = await startPublicLocalServer({
      environment: { TXCHAT_PUBLIC_LOCAL_PORT: "49152" },
      output: (value) => output.push(value),
      createRuntime: () => ({
        app: {
          async close() {
            appCloseCount += 1;
          },
          async listen(options) {
            listenCalls.push(options);
          },
        },
        closeDatabase() {
          databaseCloseCount += 1;
        },
      }),
    });

    expect(listenCalls).toEqual([{ host: "127.0.0.1", port: 49152 }]);
    expect(output).toEqual(["PUBLIC_LOCAL_READY\n"]);
    await shutdown();
    await shutdown();
    expect(appCloseCount).toBe(1);
    expect(databaseCloseCount).toBe(1);
  });
});
