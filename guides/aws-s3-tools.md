---
title: AwsS3Tools
---

# AwsS3Tools (programmatic API)

`AwsS3Tools` is an X-Ray-enabled wrapper around the AWS S3 SDK v3 client. It provides composite convenience methods for operations that compose multiple SDK calls, while exposing the raw client for single-operation use.

## Constructor

```ts
import { AwsS3Tools } from '@karmaniverous/aws-s3-tools';

const tools = new AwsS3Tools({
  clientConfig: {
    region: 'us-east-1',
    logger: console,
  },
  xray: 'auto', // 'auto' | 'on' | 'off'
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `clientConfig` | `S3ClientConfig` | `{}` | AWS SDK v3 client config (region, credentials, logger, etc.) |
| `xray` | `'auto' \| 'on' \| 'off'` | `'auto'` | X-Ray capture mode. `auto` enables only when `AWS_XRAY_DAEMON_ADDRESS` is set. |

### Public properties

| Property | Type | Description |
|----------|------|-------------|
| `client` | `S3Client` | The effective SDK client (X-Ray-captured when enabled). |
| `clientConfig` | `S3ClientConfig` | The resolved config used to build the client. |
| `logger` | `Logger` | Validated logger instance. |
| `xray` | `XrayState` | Materialized X-Ray state (`{ mode, enabled, daemonAddress? }`). |

## Convenience methods

### `getPresignedGetUrl(options)`

Generate a pre-signed URL for downloading an object (HTTP GET).

```ts
const url = await tools.getPresignedGetUrl({
  bucket: 'my-bucket',
  key: 'path/to/file.txt',
  expiresIn: 3600, // optional, default: 900 (15 minutes)
});

console.log('Download URL:', url);
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `bucket` | `string` | required | S3 bucket name |
| `key` | `string` | required | S3 object key |
| `expiresIn` | `number` | `900` | URL expiry in seconds |

### `getPresignedPutUrl(options)`

Generate a pre-signed URL for uploading an object (HTTP PUT).

```ts
const url = await tools.getPresignedPutUrl({
  bucket: 'my-bucket',
  key: 'uploads/new-file.txt',
  expiresIn: 3600,       // optional
  contentType: 'text/plain', // optional
});

console.log('Upload URL:', url);
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `bucket` | `string` | required | S3 bucket name |
| `key` | `string` | required | S3 object key |
| `expiresIn` | `number` | `900` | URL expiry in seconds |
| `contentType` | `string` | — | Content-Type for the upload |

### `listAllObjects(options)`

Auto-paginated object listing with guardrails.

```ts
const objects = await tools.listAllObjects({
  bucket: 'my-bucket',
  prefix: 'uploads/',    // optional key prefix
  maxKeys: 1000,         // stop after 1000 objects
  maxPages: 10,          // stop after 10 pages
});

for (const obj of objects) {
  console.log(obj.Key, obj.Size, obj.LastModified);
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `bucket` | `string` | required | S3 bucket name |
| `prefix` | `string` | — | Key prefix filter |
| `maxKeys` | `number` | — | Maximum total objects to return |
| `maxPages` | `number` | — | Maximum pages to fetch (safety valve) |

### `deleteAllUnderPrefix(options)`

Delete all objects under a key prefix in batches. Requires `force: true` as a safety guard.

```ts
const deleted = await tools.deleteAllUnderPrefix({
  bucket: 'my-bucket',
  prefix: 'temp/',
  force: true, // required
});

console.log(`Deleted ${deleted} objects.`);
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `bucket` | `string` | required | S3 bucket name |
| `prefix` | `string` | required | Key prefix (must be non-empty) |
| `force` | `boolean` | `false` | Must be `true` to proceed |

## Escape hatch

For any S3 operation not wrapped by a convenience method, use `tools.client` directly:

```ts
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

// Upload an object
await tools.client.send(
  new PutObjectCommand({
    Bucket: 'my-bucket',
    Key: 'hello.txt',
    Body: 'Hello, world!',
    ContentType: 'text/plain',
  }),
);

// Download an object
const res = await tools.client.send(
  new GetObjectCommand({ Bucket: 'my-bucket', Key: 'hello.txt' }),
);
const body = await res.Body?.transformToString();
console.log(body);

// Delete an object
await tools.client.send(
  new DeleteObjectCommand({ Bucket: 'my-bucket', Key: 'hello.txt' }),
);

// Head (check existence / metadata)
const head = await tools.client.send(
  new HeadObjectCommand({ Bucket: 'my-bucket', Key: 'hello.txt' }),
);
console.log('ContentLength:', head.ContentLength);
```

The client is fully configured with your region, credentials, logger, and X-Ray capture — you get all of that for free.

## Non-Lambda usage

`AwsS3Tools` works anywhere Node.js runs:

```ts
// In a script
const tools = new AwsS3Tools({
  clientConfig: { region: 'us-east-1' },
  xray: 'off', // no X-Ray daemon outside Lambda
});

// In an Express server
app.get('/download/:key', async (req, res) => {
  const tools = new AwsS3Tools({ xray: 'off' });
  const url = await tools.getPresignedGetUrl({
    bucket: process.env.S3_BUCKET_NAME!,
    key: req.params.key,
  });
  res.redirect(url);
});
```
