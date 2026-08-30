import fastifyWebsocket from "@fastify/websocket";
import Fastify, { LogController, type FastifyInstance } from "fastify";

import type { EphemeralSessionStore } from "./auth/ephemeralSessionStore.js";
import { registerPublicLocalRoutes } from "./http/publicLocalRoutes.js";
import type { SafeEventLogger } from "./logging/safeEventLogger.js";
import { PUBLIC_LOCAL_CONTRACT } from "./protocol/publicLocalProtocol.js";
import type { DeterministicOrganizationProvider } from "./providers/deterministicOrganizationProvider.js";
import type { DeterministicRecognitionProvider } from "./providers/deterministicRecognitionProvider.js";
import { ActiveDictationRegistry } from "./realtime/publicLocalDictationSession.js";
import { registerPublicLocalDictationRoute } from "./websocket/publicLocalDictationRoute.js";

export interface BuildAppDependencies {
  readonly logger: SafeEventLogger;
  readonly organizationProvider: DeterministicOrganizationProvider;
  readonly recognitionProvider: DeterministicRecognitionProvider;
  readonly sessionStore: EphemeralSessionStore;
}

export function buildApp(dependencies: BuildAppDependencies): FastifyInstance {
  const app = Fastify({
    bodyLimit: 8192,
    logController: new LogController({ disableRequestLogging: true }),
    logger: false,
  });
  const activeDictations = new ActiveDictationRegistry();

  app.register(fastifyWebsocket, {
    errorHandler(_error, socket) {
      dependencies.logger.record("request.rejected", "internal_error");
      socket.terminate();
    },
    options: {
      maxPayload: PUBLIC_LOCAL_CONTRACT.audio.maximumFrameBytes,
      perMessageDeflate: false,
    },
  });

  app.register(async (routes) => {
    registerPublicLocalRoutes(routes, dependencies);
    registerPublicLocalDictationRoute(routes, {
      ...dependencies,
      activeDictations,
    });
  });

  app.setNotFoundHandler(async (_request, reply) => {
    dependencies.logger.record("request.rejected", "invalid_request");
    return reply.code(404).send({ error: "not_found" });
  });

  app.setErrorHandler(async (_error, _request, reply) => {
    dependencies.logger.record("request.rejected", "internal_error");
    return reply.code(500).send({ error: "internal_error" });
  });

  return app;
}
