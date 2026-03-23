/**
 * Smoke test for aws-s3-tools against a real S3 bucket.
 *
 * Prerequisites:
 * - AWS credentials configured
 * - Environment variables:
 *   - SMOKE_BUCKET or S3_BUCKET_NAME
 *   - AWS_REGION (optional, defaults to us-east-1)
 *
 * Usage:
 *   npx tsx smoke/smokeLib.ts
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

import { AwsS3Tools } from '../src/s3Tools/AwsS3Tools';

const bucket = process.env.SMOKE_BUCKET ?? process.env.S3_BUCKET_NAME;
if (!bucket) throw new Error('Set SMOKE_BUCKET or S3_BUCKET_NAME');

const tools = new AwsS3Tools({
  clientConfig: { region: process.env.AWS_REGION ?? 'us-east-1' },
  xray: 'off',
});

const testKey = `smoke-test-${String(Date.now())}.txt`;
const testBody = 'Hello from aws-s3-tools smoke test!';

console.log('\n=== Smoke Test: aws-s3-tools ===\n');

// 1. Put object via escape hatch
console.log('1. PutObject via escape hatch...');
await tools.client.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: testKey,
    Body: testBody,
    ContentType: 'text/plain',
  }),
);
console.log('   ✅ Uploaded:', testKey);

// 2. List objects
console.log('\n2. listAllObjects...');
const objects = await tools.listAllObjects({ bucket, prefix: 'smoke-test-' });
const found = objects.some((o) => o.Key === testKey);
console.log(
  `   ✅ Found ${String(objects.length)} object(s), test key present: ${String(found)}`,
);

// 3. Get presigned GET URL
console.log('\n3. getPresignedGetUrl...');
const url = await tools.getPresignedGetUrl({ bucket, key: testKey });
console.log(`   ✅ Presigned URL (first 80 chars): ${url.slice(0, 80)}...`);

// 4. Get presigned PUT URL
console.log('\n4. getPresignedPutUrl...');
const putUrl = await tools.getPresignedPutUrl({
  bucket,
  key: `${testKey}-put`,
  contentType: 'text/plain',
});
console.log(
  `   ✅ Presigned PUT URL (first 80 chars): ${putUrl.slice(0, 80)}...`,
);

// 5. Get object via escape hatch
console.log('\n5. GetObject via escape hatch...');
const getRes = await tools.client.send(
  new GetObjectCommand({ Bucket: bucket, Key: testKey }),
);
const body = await getRes.Body?.transformToString();
console.log(`   ✅ Retrieved: "${body ?? ''}"`);

// 6. Delete object via escape hatch (cleanup)
console.log('\n6. DeleteObject via escape hatch (cleanup)...');
await tools.client.send(
  new DeleteObjectCommand({ Bucket: bucket, Key: testKey }),
);
console.log('   ✅ Deleted:', testKey);

console.log('\n=== All smoke tests passed ===\n');
