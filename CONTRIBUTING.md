# Contributing

Contributions should keep this repository small, deterministic, and limited to local development. New behavior must be test-driven and must not require an external service, real identity, credential, deployment system, or persistent runtime data.

Before proposing a change, run:

```sh
pnpm typecheck
pnpm build
pnpm test
```

Do not include secrets, personal information, machine-specific paths, generated output, logs, service addresses, private network identities, signing material, or internal operational documentation in issues, commits, tests, or source files.
