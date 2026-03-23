# aws-s3-tools

X-Ray-enabled AWS S3 client wrapper and get-dotenv CLI plugin for the SMOZ ecosystem.

## Three-Layer Pattern

1. **Runtime wrapper** (`AwsS3Tools`) — X-Ray-instrumented S3Client for Lambda use
2. **get-dotenv plugin** (`s3Plugin`) — `aws s3` commands
3. **Standalone CLI** (`aws-s3-tools`) — embeds get-dotenv host + plugin

## Key Conventions

- Only composite methods (multi-SDK-call operations) get convenience wrappers
- All single-operation calls use `tools.client.send(new XCommand({...}))`
- Region inherited from parent `aws` plugin via `getAwsRegion(ctx)`

## Reference

- Pattern reference: `@karmaniverous/aws-cognito-tools`
