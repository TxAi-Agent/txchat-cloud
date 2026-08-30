import { pathToFileURL } from "node:url";

import type { FastifyInstance } from "fastify";

import { buildApp } from "./app.js";
import { EphemeralSessionStore } from "./auth/ephemeralSessionStore.js";
import { loadLocalDevelopmentConfig } from "./config/localDevelopmentConfig.js";
import { openInMemoryDatabase } from "./db/inMemoryDatabase.js";
import { createSafeEventLogger } from "./logging/safeEventLogger.js";
import { DeterministicOrganizationProvider } from "./providers/deterministicOrganizationProvider.js";
import { DeterministicRecognitionProvider } from "./providers/deterministicRecognitionProvider.js";

interface ServerApp {
  listen(options: { host: "127.0.0.1"; port: number }): Promise<unknown>;
  close(): Promise<unknown>;
}

interface PublicLocalServerRuntime {
  readonly app: ServerApp;
  closeDatabase(): void;
}

interface StartPublicLocalServerOptions {
  readonly environment: NodeJS.ProcessEnv;
  readonly output: (value: string) => void;
  readonly createRuntime?: () => PublicLocalServerRuntime;
}

function createDefaultRuntime(): PublicLocalServerRuntime {
  const database = openInMemoryDatabase();
  const logger = createSafeEventLogger();
  const sessionStore = new EphemeralSessionStore(database.connection, {
    recordEvent: (event) => logger.record(event),
  });
  const app: FastifyInstance = buildApp({
    logger,
    organizationProvider: new DeterministicOrganizationProvider(),
    recognitionProvider: new DeterministicRecognitionProvider(),
    sessionStore,
  });
  return { app, closeDatabase: () => database.close() };
}

export async function startPublicLocalServer(
  options: StartPublicLocalServerOptions,
): Promise<() => Promise<void>> {
  const config = loadLocalDevelopmentConfig(options.environment);
  const runtime = (options.createRuntime ?? createDefaultRuntime)();
  let closed = false;

  try {
    await runtime.app.listen({ host: config.host, port: config.port });
  } catch (error) {
    try {
      await runtime.app.close();
    } finally {
      runtime.closeDatabase();
    }
    throw error;
  }
  options.output("PUBLIC_LOCAL_READY\n");

  return async () => {
    if (closed) return;
    closed = true;
    try {
      await runtime.app.close();
    } finally {
      runtime.closeDatabase();
    }
  };
}

async function runExecutable(): Promise<void> {
  try {
    const shutdown = await startPublicLocalServer({
      environment: process.env,
      output: (value) => process.stdout.write(value),
    });
    const handleSignal = () => {
      void shutdown().catch(() => {
        process.exitCode = 1;
      });
    };
    process.once("SIGINT", handleSignal);
    process.once("SIGTERM", handleSignal);
  } catch {
    process.stderr.write("PUBLIC_LOCAL_FAILED\n");
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runExecutable();
}
