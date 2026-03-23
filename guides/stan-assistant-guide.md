---
title: AI Assistant Guide
---

# aws-s3-tools — AI Assistant Guide

This guide explains the codebase structure and conventions to AI coding assistants working on this project.

## Architecture

Three-layer pattern (same as `aws-cognito-tools`):

```
src/
  s3Tools/              ← Layer 1: Runtime wrapper
    AwsS3Tools.ts         Core class (constructor + convenience methods)
    AwsS3Tools.test.ts    Unit tests (mocked SDK)
    awsError.ts           Error classification (isAwsErrorOfType factory)
    awsError.test.ts      Error tests

  s3Plugin/             ← Layer 2: get-dotenv plugin
    s3Plugin.ts           Plugin registration (definePlugin, ns: 's3')
    s3PluginConfig.ts     Zod schema + S3PluginConfig type
    s3PluginConfig.test.ts
    commands/
      types.ts              CLI + plugin API type aliases
      registerListCommand.ts
      registerPresignCommand.ts

  cli/
    aws-s3-tools/       ← Layer 3: Standalone CLI
      index.ts            Embeds get-dotenv host + s3Plugin

  index.ts              ← Public API surface
```

## Key conventions

1. **Composite methods only** — `AwsS3Tools` wraps multi-call operations. Single-call operations use `tools.client.send()`.

2. **Error classification** — `awsError.ts` uses an `isAwsErrorOfType` factory. Add new types with one line.

3. **Plugin options** — All CLI options use `createPluginDynamicOption` so `--help` shows composed defaults from config.

4. **Pagination** — `listAllObjects` paginates via continuation tokens with `maxKeys`/`maxPages` guardrails. `deleteAllUnderPrefix` uses fresh-list batching (re-list before each delete batch).

5. **Safety guards** — `deleteAllUnderPrefix` requires `force: true` and a non-empty `prefix` to prevent accidental bucket-wide deletes.

6. **Env var overrides** — `S3_LIST_OBJECTS_MAX_KEYS_PER_PAGE` and `S3_DELETE_OBJECTS_BATCH_SIZE` let operators tune pagination without code changes.

7. **Testing** — All SDK calls are mocked via `vi.fn()`. No AWS credentials needed for unit tests.

## Key files

| File | Purpose |
|------|---------|
| `src/s3Tools/AwsS3Tools.ts` | Core class: constructor, `getPresignedGetUrl`, `getPresignedPutUrl`, `listAllObjects`, `deleteAllUnderPrefix` |
| `src/s3Tools/awsError.ts` | `isAwsErrorOfType` factory for typed AWS error matching |
| `src/s3Plugin/s3Plugin.ts` | Plugin registration, ns: `'s3'`, mounts under `aws` |
| `src/s3Plugin/s3PluginConfig.ts` | Zod schema for plugin config (`bucket`) |
| `src/s3Plugin/commands/registerListCommand.ts` | `aws s3 list` implementation |
| `src/s3Plugin/commands/registerPresignCommand.ts` | `aws s3 presign` implementation |
| `src/cli/aws-s3-tools/index.ts` | Standalone CLI host |
| `src/index.ts` | Public API surface (all exports) |

## Testing approach

- Unit tests use `vi.mock` to replace `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
- Tests cover: constructor options, X-Ray mode, pagination guardrails, batch delete, presign generation.
- Run: `npm test`

## CLI usage

```bash
# List objects
aws-s3-tools --env dev aws s3 list --bucket my-bucket --prefix uploads/

# Pre-signed GET URL
aws-s3-tools --env dev aws s3 presign --bucket my-bucket --key path/to/file.txt

# Pre-signed PUT URL
aws-s3-tools --env dev aws s3 presign \
  --bucket my-bucket \
  --key uploads/upload.txt \
  --method put \
  --content-type text/plain \
  --expires-in 3600
```

## Quality gates

Every PR must pass: `build`, `lint`, `typecheck`, `test`, `knip` — zero errors, zero warnings.
