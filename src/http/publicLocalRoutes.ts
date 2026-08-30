import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";

import type {
  AuthenticatedPublicLocalSession,
  EphemeralSessionStore,
} from "../auth/ephemeralSessionStore.js";
import type { SafeEventLogger } from "../logging/safeEventLogger.js";
import { PUBLIC_LOCAL_CONTRACT } from "../protocol/publicLocalProtocol.js";

interface PublicLocalHttpDependencies {
  readonly logger: SafeEventLogger;
  readonly sessionStore: EphemeralSessionStore;
}

const emptyBody = z.object({}).strict();
const refreshBody = z
  .object({ refreshToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
  .strict();

export function authenticateBearerHeader(
  authorization: unknown,
  sessionStore: EphemeralSessionStore,
): AuthenticatedPublicLocalSession {
  if (typeof authorization !== "string") throw new Error("Unauthorized");
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization);
  if (match?.[1] === undefined) throw new Error("Unauthorized");
  return sessionStore.authenticateAccessToken(match[1]);
}

function authenticateRequest(
  request: FastifyRequest,
  sessionStore: EphemeralSessionStore,
): AuthenticatedPublicLocalSession {
  return authenticateBearerHeader(request.headers.authorization, sessionStore);
}

function rejectInvalidRequest(logger: SafeEventLogger) {
  logger.record("request.rejected", "invalid_request");
  return { error: "invalid_request" } as const;
}

function rejectUnauthorized(logger: SafeEventLogger) {
  logger.record("request.rejected", "unauthorized");
  return { error: "unauthorized" } as const;
}

export function registerPublicLocalRoutes(
  app: FastifyInstance,
  dependencies: PublicLocalHttpDependencies,
): void {
  app.post(PUBLIC_LOCAL_CONTRACT.routes.session, async (request, reply) => {
    const parsed = emptyBody.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send(rejectInvalidRequest(dependencies.logger));
    return reply.code(201).send(dependencies.sessionStore.create());
  });

  app.post(PUBLIC_LOCAL_CONTRACT.routes.refresh, async (request, reply) => {
    const parsed = refreshBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(rejectInvalidRequest(dependencies.logger));
    try {
      return reply.code(200).send(dependencies.sessionStore.refresh(parsed.data.refreshToken));
    } catch {
      return reply.code(401).send(rejectUnauthorized(dependencies.logger));
    }
  });

  app.get(PUBLIC_LOCAL_CONTRACT.routes.account, async (request, reply) => {
    try {
      authenticateRequest(request, dependencies.sessionStore);
      return reply.code(200).send({ authenticated: true });
    } catch {
      return reply.code(401).send(rejectUnauthorized(dependencies.logger));
    }
  });

  app.post(PUBLIC_LOCAL_CONTRACT.routes.logout, async (request, reply) => {
    try {
      const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.authorization ?? "");
      if (match?.[1] === undefined) throw new Error("Unauthorized");
      dependencies.sessionStore.logout(match[1]);
      return reply.code(204).send();
    } catch {
      return reply.code(401).send(rejectUnauthorized(dependencies.logger));
    }
  });
}
