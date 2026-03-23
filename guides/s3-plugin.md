---
title: s3Plugin
---

# s3Plugin

This guide explains the get-dotenv s3 plugin exported by this package:

- `s3Plugin()` → mounts under `aws` and provides:
  - `aws s3 list`
  - `aws s3 presign`

If you want the programmatic API instead, see the [AwsS3Tools guide](aws-s3-tools.md).

## Install and import

```bash
npm i @karmaniverous/aws-s3-tools
```

You can either:

- Use the shipped CLI (`aws-s3-tools`), or
- Embed `s3Plugin()` inside your own get-dotenv host.

## Using the shipped CLI

The shipped CLI is a get-dotenv CLI host composed with aws + s3:

```bash
aws-s3-tools --env dev aws s3 list --bucket my-bucket --prefix uploads/
aws-s3-tools --env dev aws s3 presign --bucket my-bucket --key path/to/file.txt
```

Notes:

- `--env` is a get-dotenv root option and must appear before `aws ...`.
- The `--bucket` option supports `$VAR` expansion evaluated at action time against `{ ...process.env, ...ctx.dotenv }`.

## Embedding the plugin in your own host

Mount the plugin under `aws`:

```ts
import { createCli } from '@karmaniverous/get-dotenv/cli';
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins';
import { s3Plugin } from '@karmaniverous/aws-s3-tools';

await createCli({
  alias: 'smoz',
  compose: (program) => program.use(awsPlugin().use(s3Plugin())),
})();
```

Region sourcing:

- The plugin reads the effective region from the `aws` plugin's published ctx state (`ctx.plugins.aws.region`) when available.
- Credentials are expected to come from the standard AWS SDK v3 provider chain.

## `aws s3 list`

List all objects in an S3 bucket or prefix.

### CLI options

| Option | Default | Description |
|--------|---------|-------------|
| `-b, --bucket <string>` | `$S3_BUCKET_NAME` | S3 bucket name (supports `$VAR` expansion) |
| `-p, --prefix <string>` | — | Key prefix filter (optional) |

### Example

```bash
# List all objects in a bucket
aws-s3-tools --env dev aws s3 list --bucket my-bucket

# List objects under a prefix
aws-s3-tools --env dev aws s3 list --bucket my-bucket --prefix uploads/
```

Output is formatted as an aligned table:

```
Key                      Size  LastModified
-----------------------  ----  -------------------------
uploads/file1.txt        1234  2024-01-15T10:30:00.000Z
uploads/file2.png        5678  2024-01-15T11:00:00.000Z

Total: 2 object(s).
```

## `aws s3 presign`

Generate a pre-signed S3 URL for GET or PUT operations.

### CLI options

| Option | Default | Description |
|--------|---------|-------------|
| `-b, --bucket <string>` | `$S3_BUCKET_NAME` | S3 bucket name (supports `$VAR` expansion) |
| `-k, --key <string>` | required | S3 object key |
| `-m, --method <string>` | `get` | HTTP method: `get` or `put` |
| `--expires-in <number>` | `900` | URL expiry in seconds |
| `-c, --content-type <string>` | — | Content-Type for PUT requests (optional) |

### Examples

```bash
# Pre-signed GET URL (download)
aws-s3-tools --env dev aws s3 presign --bucket my-bucket --key path/to/file.txt

# Pre-signed PUT URL (upload) with expiry
aws-s3-tools --env dev aws s3 presign \
  --bucket my-bucket \
  --key uploads/new-file.txt \
  --method put \
  --expires-in 3600 \
  --content-type text/plain
```

The signed URL is printed to stdout.

## Plugin configuration

Configure defaults in your get-dotenv config under `plugins['aws/s3']`:

```json
{
  "bucket": "$S3_BUCKET_NAME"
}
```

Full config schema (all optional):

| Key | Type | Description |
|-----|------|-------------|
| `bucket` | `string` | Default bucket name (supports `$VAR` expansion) |

CLI flags always override config values. Config values override defaults.
