import { describe, expect, it } from "vitest";

import { loadLocalDevelopmentConfig } from "../src/config/localDevelopmentConfig.js";

describe("loadLocalDevelopmentConfig", () => {
  it("returns only the fixed loopback host and validated port", () => {
    const config = loadLocalDevelopmentConfig({
      PATH: "synthetic-tooling",
      TXCHAT_PUBLIC_LOCAL_PORT: "49152",
    });

    expect(config).toEqual({ host: "127.0.0.1", port: 49152 });
    expect(Object.keys(config).sort()).toEqual(["host", "port"]);
  });

  it.each([undefined, "", "1023", "65536", "12.5", "+2048", " 2048", "2e3", "not-a-port"])(
    "rejects invalid port value %s",
    (value) => {
      expect(() =>
        loadLocalDevelopmentConfig({ TXCHAT_PUBLIC_LOCAL_PORT: value }),
      ).toThrow("Invalid public-local configuration");
    },
  );

  it.each([
    "TXCHAT_PUBLIC_LOCAL_HOST",
    "TXCHAT_PUBLIC_LOCAL_BASE_URL",
    "TXCHAT_PUBLIC_LOCAL_ENDPOINT",
  ])("rejects nonempty network override %s", (name) => {
    expect(() =>
      loadLocalDevelopmentConfig({
        TXCHAT_PUBLIC_LOCAL_PORT: "49152",
        [name]: "synthetic-value",
      }),
    ).toThrow("Invalid public-local configuration");
  });

  it.each([
    "TXCHAT_PUBLIC_LOCAL_API_KEY",
    "TXCHAT_PUBLIC_LOCAL_CREDENTIAL",
    "TXCHAT_PUBLIC_LOCAL_PASSWORD",
    "TXCHAT_PUBLIC_LOCAL_SECRET",
    "TXCHAT_PUBLIC_LOCAL_TOKEN",
  ])("rejects credential-like environment name %s even when empty", (name) => {
    expect(() =>
      loadLocalDevelopmentConfig({
        TXCHAT_PUBLIC_LOCAL_PORT: "49152",
        [name]: "",
      }),
    ).toThrow("Invalid public-local configuration");
  });

  it("ignores unrelated system environment fields", () => {
    expect(
      loadLocalDevelopmentConfig({
        HOME: "synthetic-home",
        PATH: "synthetic-bin",
        TXCHAT_PUBLIC_LOCAL_PORT: "65535",
      }),
    ).toEqual({ host: "127.0.0.1", port: 65535 });
  });
});
