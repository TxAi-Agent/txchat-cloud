# TxChat Cloud

TxChat Cloud is a minimal local development service for contributors working with the companion `TxAi-Agent/txchat-desktop` source repository.

This repository provides a loopback-only, synthetic implementation of the public-local development contract. It uses ephemeral in-memory sessions and deterministic mock recognition and organization. It does not connect to real model providers, account systems, messaging services, databases, or hosted infrastructure.

This is not a production service and is not a copy of TxChat's hosted environment. Production deployment, migration, operations, signing, release, and real-service configuration are intentionally outside this repository.

## Requirements

- Node.js 24
- pnpm 11.19.0 through Corepack

## Local development

Install dependencies:

```sh
corepack enable
pnpm install --frozen-lockfile
```

Set `TXCHAT_PUBLIC_LOCAL_PORT` to an unprivileged local port, then start the service:

```sh
pnpm dev
```

The service always binds to the IPv4 loopback interface. Host, base-URL, endpoint, account, provider, and credential overrides are rejected.

## Verification

```sh
pnpm typecheck
pnpm build
pnpm test
```

See `CONTRIBUTING.md`, `SECURITY.md`, and `THIRD_PARTY_NOTICES.md` before contributing or redistributing.
