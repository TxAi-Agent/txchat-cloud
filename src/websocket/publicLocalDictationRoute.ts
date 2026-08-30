import type { FastifyInstance, FastifyRequest } from "fastify";

import type { EphemeralSessionStore } from "../auth/ephemeralSessionStore.js";
import { authenticateBearerHeader } from "../http/publicLocalRoutes.js";
import type { SafeEventLogger } from "../logging/safeEventLogger.js";
import {
  decodeClientControl,
  encodeServerControl,
  PUBLIC_LOCAL_CONTRACT,
  type PublicLocalServerControl,
} from "../protocol/publicLocalProtocol.js";
import type { DeterministicOrganizationProvider } from "../providers/deterministicOrganizationProvider.js";
import type { DeterministicRecognitionProvider } from "../providers/deterministicRecognitionProvider.js";
import {
  ActiveDictationRegistry,
  PublicLocalDictationSession,
} from "../realtime/publicLocalDictationSession.js";

interface PublicLocalWebSocketDependencies {
  readonly activeDictations: ActiveDictationRegistry;
  readonly logger: SafeEventLogger;
  readonly organizationProvider: DeterministicOrganizationProvider;
  readonly recognitionProvider: DeterministicRecognitionProvider;
  readonly sessionStore: EphemeralSessionStore;
}

const protocol = PUBLIC_LOCAL_CONTRACT.protocolIdentifier;

function sendControls(
  socket: { send(value: string): void },
  controls: readonly PublicLocalServerControl[],
): void {
  for (const control of controls) socket.send(encodeServerControl(control));
}

export function registerPublicLocalDictationRoute(
  app: FastifyInstance,
  dependencies: PublicLocalWebSocketDependencies,
): void {
  const authenticatedSessions = new WeakMap<FastifyRequest, string>();

  app.get(
    PUBLIC_LOCAL_CONTRACT.routes.dictation,
    {
      websocket: true,
      preValidation: async (request, reply) => {
        try {
          const session = authenticateBearerHeader(
            request.headers.authorization,
            dependencies.sessionStore,
          );
          authenticatedSessions.set(request, session.sessionId);
        } catch {
          dependencies.logger.record("request.rejected", "unauthorized");
          return reply.code(401).send({ error: "unauthorized" });
        }
      },
    },
    (socket, request) => {
      const sessionId = authenticatedSessions.get(request);
      if (sessionId === undefined) {
        socket.terminate();
        return;
      }
      const session = new PublicLocalDictationSession({
        sessionId,
        registry: dependencies.activeDictations,
        recognitionProvider: dependencies.recognitionProvider,
        organizationProvider: dependencies.organizationProvider,
        recordEvent: (event) => dependencies.logger.record(event),
      });

      socket.on("message", (data, isBinary) => {
        try {
          const controls = isBinary
            ? session.handleAudio(Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer))
            : session.handleControl(decodeClientControl(JSON.parse(data.toString())));
          sendControls(socket, controls);
        } catch {
          dependencies.logger.record("request.rejected", "invalid_message");
          session.close();
          sendControls(socket, [
            { protocol, type: "failed", code: "invalid_message" },
            { protocol, type: "ended", reason: "failed" },
          ]);
        }
      });
      socket.on("close", () => session.close());
      socket.on("error", () => {
        session.close();
        dependencies.logger.record("request.rejected", "internal_error");
      });
    },
  );
}
