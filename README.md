# AWS S3 Tools

X-Ray-enabled AWS S3 client wrapper and get-dotenv CLI plugin for listing objects, generating pre-signed URLs, and batch deleting under a prefix — with an escape hatch to the fully configured SDK client for any other S3 operation.

<!-- TYPEDOC_EXCLUDE -->

## Documentation

- Learn the programmatic API: [AwsS3Tools guide](guides/aws-s3-tools.md)
- Learn the CLI plugin: [s3Plugin guide](guides/s3-plugin.md)
- Browse the generated API reference: [TypeDoc site](https://docs.karmanivero.us/aws-s3-tools)

<!-- /TYPEDOC_EXCLUDE -->

## Install

```bash
npm i @karmaniverous/aws-s3-tools
```

This package is ESM-only (Node >= 22).

## Quick start (programmatic)

```ts
import { AwsS3Tools } from '@karmaniverous/aws-s3-tools';

const tools = new AwsS3Tools({
  clientConfig: { region: 'us-east-1', logger: console },
  xray: 'auto',
});

// List all objects under a prefix
const objects = await tools.listAllObjects({
  bucket: 'my-bucket',
  prefix: 'uploads/',
  maxKeys: 1000,
});

// Generate a pre-signed download URL
const url = await tools.getPresignedGetUrl({
  bucket: 'my-bucket',
  key: 'uploads/file.txt',
  expiresIn: 3600,
});

// Generate a pre-signed upload URL
const putUrl = await tools.getPresignedPutUrl({
  bucket: 'my-bucket',
  key: 'uploads/new-file.txt',
  contentType: 'text/plain',
});

// Escape hatch: use the fully configured SDK client directly
import { PutObjectCommand } from '@aws-sdk/client-s3';
await tools.client.send(
  new PutObjectCommand({
    Bucket: 'my-bucket',
    Key: 'hello.txt',
    Body: 'Hello, world!',
    ContentType: 'text/plain',
  }),
);
```

## Quick start (plugin)

Mount in your get-dotenv CLI:

```ts
import { createCli } from '@karmaniverous/get-dotenv/cli';
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins';
import { s3Plugin } from '@karmaniverous/aws-s3-tools';

await createCli({
  alias: 'smoz',
  compose: (program) =>
    program.use(awsPlugin().use(s3Plugin())),
})();
```

Then use the CLI:

```bash
# List objects in a bucket
smoz --env dev aws s3 list --bucket my-bucket --prefix uploads/

# Generate a pre-signed download URL
smoz --env dev aws s3 presign --bucket my-bucket --key path/to/file.txt
```

## Quick start (standalone CLI)

```bash
# List objects
aws-s3-tools --env dev aws s3 list --bucket my-bucket

# Pre-signed GET URL (download)
aws-s3-tools --env dev aws s3 presign --bucket my-bucket --key path/to/file.txt

# Pre-signed PUT URL (upload)
aws-s3-tools --env dev aws s3 presign \
  --bucket my-bucket \
  --key uploads/new-file.txt \
  --method put \
  --content-type text/plain \
  --expires-in 3600
```

Notes:

- `--env` is a root-level (get-dotenv) option and must appear before the command path.
- `--bucket` supports `$VAR` expansion evaluated at action time against `{ ...process.env, ...ctx.dotenv }`.

## AWS X-Ray capture (optional)

X-Ray support is guarded:

- Default behavior is `xray: 'auto'`: capture is enabled only when `AWS_XRAY_DAEMON_ADDRESS` is set.
- To enable capture, install the optional peer dependency: `aws-xray-sdk`
- In `auto` mode, if `AWS_XRAY_DAEMON_ADDRESS` is set but `aws-xray-sdk` is not installed, construction throws.

See [@karmaniverous/aws-xray-tools](https://github.com/karmaniverous/aws-xray-tools) for details.

---

See [CHANGELOG](./CHANGELOG.md) for release history.
