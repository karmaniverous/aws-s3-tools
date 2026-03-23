# Requirements

> Detailed requirements will be added as development progresses.

## Layer 1 — Runtime Wrapper

- Constructor mirrors `AwsCognitoTools` pattern: assertLogger → effectiveClientConfig → X-Ray capture → public readonly properties
- Escape hatch via `tools.client` for all single-operation SDK calls

## Layer 2 — get-dotenv Plugin

- Mount under `aws s3` namespace

## Layer 3 — Standalone CLI

- Entry point at `src/cli/aws-s3-tools/index.ts`
- Embeds get-dotenv host + s3Plugin
- `bin` entry in package.json points to `dist/cli/aws-s3-tools/index.js`
